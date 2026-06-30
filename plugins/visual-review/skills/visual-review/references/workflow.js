export const meta = {
  name: 'visual-review',
  description: 'Multi-lens parallel code review with adversarial refute-verify',
  phases: [
    { title: 'Find', detail: 'one finder per lens + file-tree, in parallel' },
    { title: 'Verify', detail: '3 skeptics per finding; survive iff majority fail to refute' },
  ],
}

// args = { diffPath, filesPath, contextPath, base, head, branch, repoRoot }
// NOTE: this script cannot touch the filesystem. Agents read the paths in args
// with their own tools; the script only orchestrates and shapes the result.

const CATEGORIES = ['correctness', 'security', 'performance', 'simplification', 'api-contract', 'tests']
const SEV = ['critical', 'high', 'medium', 'low']
const SECRET_PATTERNS = [
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, 'sk-•••'],
  [/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/g, 'gh-•••'],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, 'xox-•••'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA•••'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 'jwt-•••'],
  [/\b((?:api[_-]?key|token|secret|password|passwd|authorization)\s*[:=]\s*["']?)[^"',\s}]{8,}/gi, '$1•••'],
]

const redactSecrets = (value) =>
  typeof value === 'string'
    ? SECRET_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)
    : value

const redactValue = (value) => {
  if (Array.isArray(value)) return value.map(redactValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item)]))
  }
  return redactSecrets(value)
}

const LENSES = [
  {
    key: 'correctness',
    prompt: `You are the CORRECTNESS lens. Find real defects introduced by the diff: logic errors,
off-by-one, null/undefined dereferences, unhandled errors, race conditions, incorrect async/await,
wrong operators, broken control flow, type coercion bugs, and missed edge cases.`,
  },
  {
    key: 'security',
    prompt: `You are the SECURITY lens. Find injection (SQL/command/XSS), broken authn/authz, unsafe
deserialization, path traversal, SSRF, missing input validation/escaping, unsafe use of untrusted
input, and any secret or credential leaked into source.`,
  },
  {
    key: 'performance',
    prompt: `You are the PERFORMANCE lens. Find N+1 queries, work inside hot loops, needless
re-computation or re-renders, unbounded memory growth, blocking I/O on hot paths, and allocations
that should be hoisted or memoized. Only flag where impact is plausible, not theoretical.`,
  },
  {
    key: 'simplification',
    prompt: `You are the SIMPLIFICATION / REUSE lens. Find duplicated logic, dead code, needless
abstraction, and reinvented helpers. For every finding you MUST cite the existing symbol
(file:line) from the repo context brief that the new code duplicates or should reuse. If you cannot
cite a concrete existing symbol, do not raise the finding.`,
  },
  {
    key: 'api-contract',
    prompt: `You are the API-CONTRACT lens. Find breaking or risky changes to public signatures,
exported types, function arities, HTTP routes/params, response shapes, schemas, and migrations.
Mark whether each change is breaking, risky, or non-breaking in the failure_scenario.`,
  },
  {
    key: 'tests',
    prompt: `You are the TESTS lens. Find changed behavior that lacks coverage, weakened or deleted
assertions, and tests that no longer exercise the code they claim to. Anchor to the changed
behavior, and respect the repo's documented test conventions from the context brief.`,
  },
]

const FINDING = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string', enum: CATEGORIES },
    severity: { type: 'string', enum: SEV },
    summary: { type: 'string', description: 'One-line statement of the defect.' },
    failure_scenario: { type: 'string', description: 'Concrete inputs/state -> wrong output or crash.' },
    file: { type: 'string' },
    line: { type: 'integer' },
    hunk: {
      type: 'object',
      additionalProperties: false,
      properties: {
        before: { type: 'string', description: 'Offending lines BEFORE, from the real diff (empty for pure additions).' },
        after: { type: 'string', description: 'Offending lines AFTER, from the real diff (empty for pure deletions).' },
      },
      required: ['before', 'after'],
    },
    suggested_fix: { type: ['string', 'null'], description: 'Unified-diff fix, or null. Render-only, never applied.' },
    wireframe_html: { type: ['string', 'null'], description: 'Minimal grounded semantic-HTML wireframe for UI findings, else null.' },
  },
  required: ['category', 'severity', 'summary', 'failure_scenario', 'file', 'line', 'hunk', 'suggested_fix', 'wireframe_html'],
}

const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  properties: { findings: { type: 'array', items: FINDING } },
  required: ['findings'],
}

const VERDICT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    refuted: { type: 'boolean', description: 'true if the finding is wrong, not reachable, or contradicts a documented convention.' },
    reason: { type: 'string' },
  },
  required: ['refuted', 'reason'],
}

const TREE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          change: { type: 'string', enum: ['added', 'modified', 'removed', 'renamed'] },
        },
        required: ['path', 'change'],
      },
    },
  },
  required: ['files'],
}

const GROUNDING = `GROUNDING RULES (non-negotiable):
- Build hunk/file/line ONLY from lines that actually appear in the diff. Never invent code.
- If the diff does not contain a fact, leave it out. A confidently wrong finding is worse than a
  missed one, because the reviewer trusts the dashboard and skips the line you got wrong.
- Redact any credential-looking literal (keys, tokens, .env values) as sk-••• before returning it.
- Judge against the repo's OWN conventions in the context brief, not generic ideals. Never flag an
  intentional, documented convention as a defect.
- For a finding about rendered UI/layout/interaction, set wireframe_html to a minimal semantic-HTML
  sketch of the affected surface using the real component and label names from the diff; otherwise null.
- Set suggested_fix to a small unified diff when the fix is concrete and safe; otherwise null.`

const ctx = `INPUTS (read these with your tools):
- Diff (the only source of truth for code): ${args.diffPath}
- Changed-files list (name-status): ${args.filesPath}
- Repo context brief (conventions, reusable utilities, rules): ${args.contextPath}
- Repo root (read files here for surrounding context only): ${args.repoRoot}
Comparing ${args.base}...${args.head} on branch ${args.branch}.`

// ---- Find phase -------------------------------------------------------------
phase('Find')

const treePromise = agent(
  `Determine the changed-file tree for this review. The unified diff at ${args.diffPath} is the
AUTHORITATIVE source of which files changed and how — derive each file's change from its
diff --git / "new file" / "deleted file" / "rename from|to" headers
(added | modified | removed | renamed; use the new path for renames). The list at ${args.filesPath}
may be 'git --name-status' (status letters) OR bare paths ('--name-only', used in PR mode) — use it
only to corroborate, never as the sole basis for the change flag. Return one entry per changed file.`,
  { label: 'file-tree', phase: 'Find', effort: 'xhigh', schema: TREE },
)

const findersPromise = parallel(
  LENSES.map((L) => () =>
    agent(`${L.prompt}\n\n${GROUNDING}\n\n${ctx}\n\nReturn every finding you can justify from the diff.`, {
      label: `find:${L.key}`,
      phase: 'Find',
      effort: 'xhigh',
      schema: FINDINGS,
    }),
  ),
)

const [tree, finderResults] = await Promise.all([treePromise, findersPromise])
const raw = finderResults.filter(Boolean).flatMap((r) => r.findings || [])
log(`Found ${raw.length} candidate findings across ${LENSES.length} lenses.`)

// ---- Dedup (plain code; needs the full set) ---------------------------------
// Sort by severity first so that when a key DOES collide the most severe survives.
// Key includes a short summary fingerprint so two genuinely distinct defects on the
// same line/category are not collapsed into one.
const seen = new Set()
const candidates = []
const sortedRaw = [...raw].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity))
for (const f of sortedRaw) {
  const fp = (f.summary || '').trim().toLowerCase().slice(0, 40)
  const key = `${f.file}:${f.line}:${f.category}:${fp}`
  if (!seen.has(key)) {
    seen.add(key)
    candidates.push(f)
  }
}
log(`${candidates.length} unique candidates after dedup. Verifying with 3 skeptics each.`)

// ---- Verify phase: 3 skeptics per finding, survive iff >=2 fail to refute ---
phase('Verify')

const verified = await parallel(
  candidates.map((f) => () =>
    parallel(
      [1, 2, 3].map((i) => () =>
        agent(
          `Try to REFUTE this code-review finding. You are an adversarial skeptic: default to
refuted=true unless the diff clearly proves the finding real and reachable. A finding that
contradicts a documented convention in the context brief is refuted.\n\nFinding:\n${JSON.stringify(f)}\n\n${ctx}`,
          { label: `verify:${f.file}#${i}`, phase: 'Verify', effort: 'xhigh', schema: VERDICT },
        ),
      ),
    ).then((votes) => {
      // Majority of the verifiers that ACTUALLY returned — so an agent that errors
      // or times out abstains rather than silently killing a real finding. With all
      // three present this is the intended >=2-of-3; if only one survives, its vote decides.
      const cast = votes.filter(Boolean)
      const notRefuted = cast.filter((v) => !v.refuted).length
      const survived = cast.length > 0 && notRefuted > cast.length / 2
      return survived ? { ...f, verdict: 'CONFIRMED' } : null
    }),
  ),
)

// ---- Shape the result -------------------------------------------------------
const confirmedFindings = verified
  .filter(Boolean)
  .sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity))

const summary = SEV.reduce((o, s) => {
  o[s] = confirmedFindings.filter((f) => f.severity === s).length
  return o
}, {})

const findings = confirmedFindings.map(redactValue)
const verdict = summary.critical || summary.high ? 'needs-attention' : 'pass'
const fileTree = (tree && tree.files) || []

log(`Verified survivors: ${findings.length} (${summary.critical} critical, ${summary.high} high).`)

return { verdict, summary, fileTree, findings }
