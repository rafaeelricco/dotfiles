"""The ui skill records a site's taste and prints it back as tokens."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skill/ui"
CAPTURE = ROOT / "tests/fixtures/ui_capture.json"
TASTE_V2 = ROOT / "tests/fixtures/taste_v2/sample"
SECTIONS = (
    "## When to use this skill", "## Install", "## Usage rules", "## Stop and ask", "## Colors", "## Typography",
    "## Layout", "## Elevation", "## Shape", "## Motion", "## Composition", "## Signature", "## Components",
    "## Kit fit", "## Provenance and caveats", "## Token reference",
)


def record(root, *args):
    return subprocess.run(
        ["node", str(SKILL / "scripts/record.mjs"), *args, "--root", root], capture_output=True, text=True
    )


def seed_legacy_pack(root, name):
    import json

    pack = Path(root) / name
    pack.mkdir(parents=True, exist_ok=True)
    manifest = pack / "taste.json"
    if not manifest.exists():
        manifest.write_text(
            json.dumps(
                {
                    "name": name,
                    "source": [],
                    "captured": "2026-11-10",
                    "use_when": [],
                    "fits": {},
                    "variants": {},
                    "signature": [],
                    "settled": {},
                }
            )
            + "\n",
            encoding="utf-8",
        )


def record_legacy(root, *args):
    if "--name" in args:
        seed_legacy_pack(root, args[args.index("--name") + 1])
    return record(root, *args)


def copy_v2_pack(root):
    destination = Path(root) / "sample"
    shutil.copytree(TASTE_V2, destination)
    return destination


class UiRecord(unittest.TestCase):
    def test_skill_routes_record_in_one_line_frontmatter(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        front = text.split("---")[1]
        self.assertRegex(front, r'\ndescription: "(?:[^"\\\n]|\\.)+"\n')
        self.assertRegex(front, r'\nargument-hint: "\[[^"\n]*\|record\]"\n')
        self.assertIn("| `record`", text)
        self.assertTrue((SKILL / "references/record.md").is_file())

    def test_tastes_never_ship(self):
        self.assertIn("skill/ui/tastes/", (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines())

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_record_writes_a_taste_from_a_capture(self):
        import json

        with tempfile.TemporaryDirectory() as root:
            raw = CAPTURE.read_bytes()
            self.assertEqual(record(root, "--from", str(CAPTURE), "--name", "sample").returncode, 0)
            manifest = Path(root) / "sample/taste.json"
            data = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(data["schemaVersion"], 2)
            self.assertIsInstance(data["tokens"]["colors"]["dark"], dict)
            self.assertIsNone(data["guidance"]["character"])
            self.assertIn("body", data["fonts"]["roles"])
            self.assertIn("heading", data["fonts"]["roles"])
            self.assertEqual(CAPTURE.read_bytes(), raw)
            evidence = data["evidence"]["tokens.colors.light"]["sources"][0]
            self.assertEqual((Path(root) / "sample" / evidence).read_bytes(), raw)
            text = (Path(root) / "sample/design-system.txt").read_text(encoding="utf-8")
            self.assertTrue(text.startswith("# sample design system\n"))
            self.assertIn("Not recorded", text)
            self.assertIn("## Evidence", text)
            manifest_before = manifest.read_bytes()
            self.assertEqual(record(root, "--from", str(CAPTURE), "--name", "sample").returncode, 2)
            self.assertEqual(record(root, "--from", str(CAPTURE), "--name", "sample", "--force").returncode, 0)
            self.assertEqual(manifest.read_bytes(), manifest_before)
            self.assertIn("sample", record(root, "list").stdout)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_record_lists_candidates(self):
        import json

        with tempfile.TemporaryDirectory() as root:
            run = record_legacy(root, "--from", str(CAPTURE), "--name", "sample")
            self.assertEqual(run.returncode, 0)
            self.assertIn("candidates to settle", run.stdout)
            self.assertIn("2 candidates to settle", run.stdout)
            manifest = Path(root) / "sample/taste.json"
            data = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(
                set(data), {"name", "source", "captured", "use_when", "fits", "variants", "signature", "settled"}
            )
            self.assertEqual(data["name"], "sample")
            self.assertEqual(data["captured"], "2026-11-10")
            text = (Path(root) / "sample/design-system.txt").read_text(encoding="utf-8")
            self.assertIn("### Animations", text)
            self.assertIn("### Scroll", text)
            self.assertNotIn("### Hover", text)
            # the agent's own work in taste.json outlives a second record, --force included
            manifest.write_text('{"name": "sample", "use_when": ["a dev tool"]}\n', encoding="utf-8")
            again = record(root, "--from", str(CAPTURE), "--name", "sample", "--force")
            self.assertEqual(again.returncode, 0)
            self.assertEqual(manifest.read_text(encoding="utf-8"), '{"name": "sample", "use_when": ["a dev tool"]}\n')
            self.assertIn("use: a dev tool", record(root, "list").stdout)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_v2_css_and_kit_use_only_taste_json_offline(self):
        with tempfile.TemporaryDirectory() as root:
            pack = copy_v2_pack(root)
            manifest = (pack / "taste.json").read_bytes()
            guide = pack / "design-system.txt"
            guide.write_text("edited guide with deliberately stale --p-bg: hotpink", encoding="utf-8")
            css_first = record(root, "css", "sample")
            kit_first = record(root, "kit", "sample")
            self.assertEqual(css_first.returncode, 0, css_first.stderr)
            self.assertEqual(kit_first.returncode, 0, kit_first.stderr)
            guide.unlink()
            css_second = record(root, "css", "sample")
            kit_second = record(root, "kit", "sample")
            self.assertEqual(css_second.returncode, 0, css_second.stderr)
            self.assertEqual(kit_second.returncode, 0, kit_second.stderr)
            self.assertEqual(css_first.stdout, css_second.stdout)
            self.assertEqual(kit_first.stdout, kit_second.stdout)
            self.assertNotIn("hotpink", css_first.stdout + kit_first.stdout)
            self.assertIn("#f8f7f4", css_first.stdout)
            self.assertEqual((pack / "taste.json").read_bytes(), manifest)
            self.assertFalse((pack / "fonts.json").exists())

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_v2_unknown_schema_version_never_falls_back_to_guide(self):
        import json

        with tempfile.TemporaryDirectory() as root:
            pack = copy_v2_pack(root)
            manifest = json.loads((pack / "taste.json").read_text(encoding="utf-8"))
            manifest["schemaVersion"] = 9
            (pack / "taste.json").write_text(json.dumps(manifest), encoding="utf-8")
            (pack / "design-system.txt").write_text("stale guide", encoding="utf-8")
            for command in ["css", "kit"]:
                result = record(root, command, "sample")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("unsupported schemaVersion", result.stderr)
                self.assertNotIn("stale guide", result.stdout)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_v2_guide_regenerates_from_manifest(self):
        with tempfile.TemporaryDirectory() as root:
            pack = copy_v2_pack(root)
            result = record(root, "guide", "sample")
            self.assertEqual(result.returncode, 0, result.stderr)
            text = (pack / "design-system.txt").read_text(encoding="utf-8")
            self.assertIn("# sample design system", text)
            self.assertIn("## Guidance", text)
            self.assertIn("## Evidence", text)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_record_refuses_the_house_name_and_keep_doc_without_a_site(self):
        with tempfile.TemporaryDirectory() as root:
            house = record(root, "--from", str(CAPTURE), "--name", "house")
            self.assertEqual(house.returncode, 2)
            self.assertIn("house", house.stderr)
            self.assertFalse((Path(root) / "house").exists())
            # --keep-doc captures a saved taste again from its URLs: it never works from a capture file
            self.assertEqual(record_legacy(root, "--from", str(CAPTURE), "--name", "sample").returncode, 0)
            kept = record_legacy(root, "--from", str(CAPTURE), "--name", "sample", "--keep-doc")
            self.assertEqual(kept.returncode, 2)
            self.assertIn("--keep-doc", kept.stderr)
            # a new site's URL with --keep-doc has no file to keep
            none = record(root, "https://example.test/", "--name", "fresh", "--keep-doc")
            self.assertEqual(none.returncode, 2)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_kit_appends_the_taste_motion_tokens(self):
        import json

        with tempfile.TemporaryDirectory() as root:
            record_legacy(root, "--from", str(CAPTURE), "--name", "sample")
            manifest = Path(root) / "sample/taste.json"
            motion = {
                "--m-in": "200ms",
                "--m-ease-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
                "--m-bad": "1s; x",
                "--p-bg": "red",
            }
            manifest.write_text(json.dumps({"name": "sample", "variants": {"motion": motion}}), encoding="utf-8")
            out = record(root, "kit", "sample").stdout
            self.assertIn("--m-in: 200ms;", out)
            self.assertIn("--m-ease-enter: cubic-bezier(0.23, 1, 0.32, 1);", out)
            self.assertNotIn("--m-bad", out)
            self.assertEqual(out.count("--p-bg:"), 1)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_kit_prints_the_taste_as_kit_tokens(self):
        with tempfile.TemporaryDirectory() as root:
            record_legacy(root, "--from", str(CAPTURE), "--name", "sample")
            out = record(root, "kit", "sample").stdout
            self.assertIn("fonts.googleapis.com/css2?family=Geist:wght@400;500", out)
            self.assertIn('--font-display: "Geist"', out)
            self.assertIn("--display-weight: 500;", out)
            self.assertIn("--p-bg: #ffffff;", out)
            self.assertIn("--p-action: #ff6363;", out)
            # white on #ff6363 reads 2.9:1; the block now prints the taste's own ink, which reads 4.5:1 or more
            self.assertNotIn("--p-action-ink: #ffffff;", out)
            self.assertRegex(out, r"--p-action-ink: #(?!ffffff)[0-9a-f]{6};")
            self.assertIn("--p-inv-bg: #0b0b0c;", out)
            self.assertIn("html[data-radius]", out)
            self.assertIn("--r-btn: 8px;", out)
            self.assertIn("--ground-bg: #f4f4f5 !important;", out)
            self.assertNotIn("Host Grotesk", out)
            self.assertEqual(record(root, "kit", "missing").returncode, 2)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_kit_keeps_the_taste_primary_sizes_and_h1_face(self):
        import json

        capture = json.loads(CAPTURE.read_text(encoding="utf-8"))
        capture["type"] = [
            {"role": "h1", "family": "EB Garamond", "size": 80, "line": 77, "weight": 500, "tracking": "-0.012em"},
            {"role": "h2", "family": "Geist", "size": 56, "line": 70, "weight": 500, "tracking": "-0.02em"},
            {"role": "body", "family": "Geist", "size": 20, "line": 28, "weight": 400, "tracking": "0"},
        ]
        key = {"h": 48, "radius": 8, "padX": 0, "bg": "#ffffff", "color": "#000000", "border": "1px #e2e3e9"}
        blue = {"h": 44, "radius": 12, "padX": 12, "bg": "#3c83f6", "color": "#ffffff", "border": "none"}
        capture["components"]["button"] = [key] * 5
        capture["components"]["primary"] = {**blue, "shadow": "#0c44a1 0px 0px 0px 0.5px"}
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / "capture.json"
            source.write_text(json.dumps(capture), encoding="utf-8")
            self.assertEqual(record_legacy(root, "--from", str(source), "--name", "serif").returncode, 0)
            text = (Path(root) / "serif/design-system.txt").read_text(encoding="utf-8")
            self.assertIn("Primary button: 12px radius at 44px high, fill `#3c83f6`, text `#ffffff`.", text)
            self.assertIn("| 44px | 12px | 12px | `#3c83f6` |", text)
            out = record(root, "kit", "serif").stdout
            self.assertIn("--p-action: #3c83f6;", out)
            self.assertIn('--font-display: "Geist"', out)
            self.assertIn(':root h1 { font-family: "EB Garamond", Georgia, serif; }', out)
            self.assertIn("family=EB+Garamond:wght@500", out)
            self.assertIn("--t-h2: 56px;", out)
            self.assertIn("--t-lead: 20px;", out)
            self.assertIn("--btn-h: 44px;", out)
            self.assertIn(".btn--primary { box-shadow: #0c44a1 0px 0px 0px 0.5px; }", out)
            self.assertIn("--r-btn: 12px;", out)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_kit_keeps_generic_families_out_of_google_fonts(self):
        import json

        capture = json.loads(CAPTURE.read_text(encoding="utf-8"))
        capture["type"] = [
            {"role": "h1", "family": "system-ui", "size": 64, "line": 70, "weight": 600, "tracking": "0"},
            {"role": "body", "family": "system-ui", "size": 16, "line": 24, "weight": 400, "tracking": "0"},
        ]
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / "capture.json"
            source.write_text(json.dumps(capture), encoding="utf-8")
            self.assertEqual(record_legacy(root, "--from", str(source), "--name", "sysui").returncode, 0)
            out = record(root, "kit", "sysui").stdout
            self.assertNotIn("System-ui", out)
            self.assertIn("family=JetBrains+Mono:wght@400;500&display=swap", out)
            self.assertIn("--font-text: system-ui, sans-serif;", out)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_kit_drops_a_face_that_would_close_its_style(self):
        import json

        capture = json.loads(CAPTURE.read_text(encoding="utf-8"))
        bad = "x</style><b id=pwn>"
        capture["type"] = [
            {"role": "h1", "family": bad, "size": 64, "line": 64, "weight": 500, "tracking": "0"},
            {"role": "body", "family": bad, "size": 17, "line": 24, "weight": 400, "tracking": "0"},
        ]
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / "capture.json"
            source.write_text(json.dumps(capture), encoding="utf-8")
            self.assertEqual(record_legacy(root, "--from", str(source), "--name", "evil").returncode, 0)
            self.assertNotIn("pwn", (Path(root) / "evil/design-system.txt").read_text(encoding="utf-8"))
            text = (Path(root) / "evil/design-system.txt").read_text(encoding="utf-8")
            (Path(root) / "evil/design-system.txt").write_text(
                text.replace("`inherited`", f"`{bad}`").replace("| 500 | 0 |", "| 500 | 0</style><b id=pwn> |")
                + "\nPrimary button shadow: `0 0 0 1px red; } </style><b id=pwn>`\n",
                encoding="utf-8",
            )
            out = record(root, "kit", "evil").stdout
            self.assertIn("<style>", out)
            self.assertNotIn("pwn", out)
            self.assertEqual(out.count("</style>"), 1)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_record_keeps_accented_and_next_font_names(self):
        import json

        capture = json.loads(CAPTURE.read_text(encoding="utf-8"))
        capture["type"] = [
            {"role": "h1", "family": "So\u0308hne", "size": 64, "line": 64, "weight": 500, "tracking": "0"},
            {"role": "body", "family": "__Inter_aaf875", "size": 17, "line": 24, "weight": 400, "tracking": "0"},
        ]
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / "capture.json"
            source.write_text(json.dumps(capture), encoding="utf-8")
            self.assertEqual(record_legacy(root, "--from", str(source), "--name", "names").returncode, 0)
            text = (Path(root) / "names/design-system.txt").read_text(encoding="utf-8")
            self.assertIn("`So\u0308hne`", text)
            self.assertIn("`__Inter_aaf875`", text)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_css_prints_light_and_dark_blocks(self):
        with tempfile.TemporaryDirectory() as root:
            record_legacy(root, "--from", str(CAPTURE), "--name", "sample")
            out = record(root, "css", "sample").stdout
            light, dark = out.split('.dark, [data-theme="dark"] {')
            self.assertIn(":root {", light)
            self.assertIn("--color-bg: #ffffff;", light)
            self.assertIn("--radius-md: 8px;", light)
            self.assertIn("--color-bg: #0b0b0c;", dark)
            self.assertNotIn("--radius-md", dark)
            self.assertEqual(record(root, "css", "missing").returncode, 2)

    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_v2_draft_preserves_measured_roles_and_surface_details(self):
        import json
        capture = json.loads(CAPTURE.read_text(encoding="utf-8"))
        capture["tokens"].append({"name": "--container", "light": "999px"})
        capture["type"] = [
            {"role": "h1", "family": "Georgia", "size": 80, "line": 84, "weight": 400, "tracking": "-0.02em"},
            {"role": "h2", "family": "Arial", "size": 40, "line": 44, "weight": 450, "tracking": "0"},
            {"role": "body", "family": "Arial", "size": 17, "line": 26, "weight": 400, "tracking": "0"},
        ]
        capture["components"]["card"] = [{"radius": 0, "bg": "transparent", "border": "1px solid #ccc", "shadow": "none"}]
        capture["components"]["primary"] = {"h": 44, "radius": 12, "bg": "#123456", "color": "#ffffff", "shadow": "0px 2px 4px #0003"}
        capture["fills"] = {"primary": {"css": "linear-gradient(90deg, #123456, #456789)"}}
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / "capture.json"
            source.write_text(json.dumps(capture), encoding="utf-8")
            result = record(root, "--from", str(source), "--name", "sample")
            self.assertEqual(result.returncode, 0, result.stderr)
            definition = json.loads((Path(root) / "sample/taste.json").read_text(encoding="utf-8"))
            self.assertEqual(definition["tokens"]["dimensions"]["--container"], "1200px")
            self.assertNotIn("--container", definition["tokens"]["colors"]["light"])
            self.assertEqual(definition["fonts"]["roles"]["h1"]["family"], "Georgia")
            self.assertEqual(definition["fonts"]["roles"]["heading"]["family"], "Arial")
            self.assertEqual(definition["tokens"]["typography"]["--h2-weight"], "450")
            self.assertEqual(definition["tokens"]["surfaces"]["panel"]["border-radius"], "0px")
            self.assertEqual(definition["tokens"]["surfaces"]["panel"]["box-shadow"], "none")
            self.assertIn("linear-gradient", definition["tokens"]["surfaces"]["primary"]["background"])
            self.assertEqual(definition["tokens"]["dimensions"]["--btn-h"], "44px")
