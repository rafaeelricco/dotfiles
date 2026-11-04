# Before/after results

## Verdict: PARTIAL

The approved repository changes are implemented and structural/package checks passed. The final paired generations show more connected development in the introduction, technical explanation, and disagreement, but not uniform improvement. One final response retains an unfilled `[name]` placeholder, and materially consequential delivery clarification was not exercised. No generated response was manually repaired.

## Run details

- Repository baseline: `f317c99c0acca15dcb71d857e8500ae35b90572f`.
- Target: local sounds-natural changes in the working tree, without a new commit.
- Temporary snapshots and raw responses: `/private/tmp/sounds-natural-before-after-rf7bqm2m`.
- One baseline batch and three updated batches: initial implementation, correction round 1, correction round 2. Eight fresh contexts per batch; 32 raw responses preserved.
- Requested generation settings for every response: `gpt-6-luna`, reasoning effort `high`, `fork_turns=none`. Resolved backend model/effort were not exposed by the spawn response.
- Writing requests remained identical. Generators received their request, designated skill snapshot and referenced files, output-file instructions, and an interpreter hint where needed. They received neither expectations nor other responses.
- Each batch contains the first response generated for each case. No best-of sampling or manual rewriting was used. The final comparison uses the final runtime, including its remaining weak response.
- Default `python3` is Python 3.9; the old detector cannot import its union annotation there. Its unchanged suite passed with available Python 3.12. The first three baseline workers were dispatched before discovery of that incompatibility; later workers had a compatible-interpreter hint. This small harness difference is disclosed.
- Two correction rounds were used, then repairs stopped at the approved limit. The initial updated email and round-1 email both imported the recruiter-publication relationship from the catalogue. The final facts section adds source-assertion inventory and two-direction reconciliation; the final email avoids the attribution.
- The pre-existing untracked `skill/spec-builder/` was not changed by this work.

## Snapshot identity

| Version              | Snapshot directory | Runtime file                    | SHA-256                                                            |
| -------------------- | ------------------ | ------------------------------- | ------------------------------------------------------------------ |
| Before               | `before`           | `SKILL.md`                      | `3960769d080611315ebe1e2becd8ae62cdbd8d898cfd8881edd08ad21155d46c` |
| Before               | `before`           | `references/voice/chat.md`      | `be7cbdb6fa109af38c76970dbff2336f018dfc8477560b6d59291c987cbd5acd` |
| Before               | `before`           | `references/voice/profile.md`   | `53b0f30a72bbe6a85878ca1c95f9293ae088f4734b5e0d32560290e6df614aef` |
| Before               | `before`           | `references/voice/spoken.md`    | `533cb4ebcfc3bd50acb1cd32bc156eabefeaa199e02d2d03e6b7210668f177c9` |
| Before               | `before`           | `references/voice/written.md`   | `7f2747025cdd9be5e8bb8241c82b4f0752f5c5085cb8d9938c6b6f7d1bd68d35` |
| Before               | `before`           | `scripts/detect.py`             | `a296a08c17dd645008f6cf2a4bbfa40637255ab8f22d85ce82fcf328b7d3d9dd` |
| Before               | `before`           | `tests/test_detect.py`          | `776b6131c0a21f0d8b0cd7738fca815b1bc844356a462d12776f74d63dbe8648` |
| Initial update       | `after`            | `SKILL.md`                      | `8cbe8e5215dc89d9db35d7fe5e0e93d953ceac13b3b680a4c8b031000e717d82` |
| Initial update       | `after`            | `references/voice/catalogue.md` | `0b7c73e40502c5639aedfa2df48c1989bff22874b23a87d246966a3d94885ba9` |
| Initial update       | `after`            | `references/voice/chat.md`      | `be7cbdb6fa109af38c76970dbff2336f018dfc8477560b6d59291c987cbd5acd` |
| Initial update       | `after`            | `references/voice/profile.md`   | `0867f9eb47418f4f79dfa63ef2701c6fef7d17b78d42c1a346f36f66f530760e` |
| Initial update       | `after`            | `references/voice/spoken.md`    | `533cb4ebcfc3bd50acb1cd32bc156eabefeaa199e02d2d03e6b7210668f177c9` |
| Initial update       | `after`            | `references/voice/written.md`   | `7f2747025cdd9be5e8bb8241c82b4f0752f5c5085cb8d9938c6b6f7d1bd68d35` |
| Correction 1         | `after-final`      | `SKILL.md`                      | `b38ae01791386b57ee139012b88f37a0bfa95f1e2ea541bd3bd0d926974253d5` |
| Correction 1         | `after-final`      | `references/voice/catalogue.md` | `0b7c73e40502c5639aedfa2df48c1989bff22874b23a87d246966a3d94885ba9` |
| Correction 1         | `after-final`      | `references/voice/chat.md`      | `be7cbdb6fa109af38c76970dbff2336f018dfc8477560b6d59291c987cbd5acd` |
| Correction 1         | `after-final`      | `references/voice/profile.md`   | `0867f9eb47418f4f79dfa63ef2701c6fef7d17b78d42c1a346f36f66f530760e` |
| Correction 1         | `after-final`      | `references/voice/spoken.md`    | `533cb4ebcfc3bd50acb1cd32bc156eabefeaa199e02d2d03e6b7210668f177c9` |
| Correction 1         | `after-final`      | `references/voice/written.md`   | `7f2747025cdd9be5e8bb8241c82b4f0752f5c5085cb8d9938c6b6f7d1bd68d35` |
| Final / correction 2 | `after-fixed`      | `SKILL.md`                      | `1ba811fb02a1934c88e20e152b4daf0ed968cc58aeb619dd11d024102aab4a23` |
| Final / correction 2 | `after-fixed`      | `references/voice/catalogue.md` | `0b7c73e40502c5639aedfa2df48c1989bff22874b23a87d246966a3d94885ba9` |
| Final / correction 2 | `after-fixed`      | `references/voice/chat.md`      | `be7cbdb6fa109af38c76970dbff2336f018dfc8477560b6d59291c987cbd5acd` |
| Final / correction 2 | `after-fixed`      | `references/voice/profile.md`   | `b905efeecdf1bc7693429c6f49e6e1f144262385d6cd21de19136eb59b9fa544` |
| Final / correction 2 | `after-fixed`      | `references/voice/spoken.md`    | `533cb4ebcfc3bd50acb1cd32bc156eabefeaa199e02d2d03e6b7210668f177c9` |
| Final / correction 2 | `after-fixed`      | `references/voice/written.md`   | `7f2747025cdd9be5e8bb8241c82b4f0752f5c5085cb8d9938c6b6f7d1bd68d35` |

## Check results

| Phase       | Command                                                                                                                                                       | Exit | Result                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| before      | `python3 -m unittest discover -s skill/sounds-natural/tests`                                                                                                  | 1    | TypeError: unsupported operand type(s) for | : 'type' and 'NoneType'; Ran 1 test in 0.000s; FAILED (errors=1) |
| before      | `/Users/rafaelricco/.local/bin/python3.12 -m unittest discover -s skill/sounds-natural/tests`                                                                 | 0    | Ran 16 tests in 0.357s; OK                 |
| before      | `python3 -m unittest discover -s tests -p 'test_packaging.py'`                                                                                                | 0    | Ran 4 tests in 0.055s; OK (skipped=1)      |
| after       | `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural` | 0    | Skill is valid!                            |
| after       | `python3 -m unittest discover -s tests -p 'test_packaging.py'`                                                                                                | 0    | Ran 4 tests in 0.042s; OK (skipped=1)      |
| after       | `git diff --check`                                                                                                                                            | 0    | No findings.                               |
| after-final | `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural` | 0    | Skill is valid!                            |
| after-final | `python3 -m unittest discover -s tests -p 'test_packaging.py'`                                                                                                | 0    | Ran 4 tests in 0.046s; OK (skipped=1)      |
| after-final | `git diff --check`                                                                                                                                            | 0    | No findings.                               |
| after-fixed | `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural` | 0    | Skill is valid!                            |
| after-fixed | `python3 -m unittest discover -s tests -p 'test_packaging.py'`                                                                                                | 0    | Ran 4 tests in 0.047s; OK (skipped=1)      |
| after-fixed | `git diff --check`                                                                                                                                            | 0    | No findings.                               |

Packaging ran four tests per phase: three passed, one native downloaded-artifact case skipped because its release-artifact environment was not supplied. Local packaging regressions passed; deployed/native artifact behavior was not exercised. The first Python 3.9 detector failure is confirmed on unchanged baseline code and retained below.

### before: `python3 -m unittest discover -s skill/sounds-natural/tests`

```text
E
======================================================================
ERROR: test_detect (unittest.loader._FailedTest)
----------------------------------------------------------------------
ImportError: Failed to import test module: test_detect
Traceback (most recent call last):
  File "/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/unittest/loader.py", line 436, in _find_test_path
    module = self._get_module_from_name(name)
  File "/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/unittest/loader.py", line 377, in _get_module_from_name
    __import__(name)
  File "/Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural/tests/test_detect.py", line 11, in <module>
    import detect  # noqa: E402
  File "/Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural/scripts/detect.py", line 66, in <module>
    def scan(text: str, *, allow_dashes: bool = False, max_words: int | None = None) -> list[tuple[int, int, str, str]]:
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'


----------------------------------------------------------------------
Ran 1 test in 0.000s

FAILED (errors=1)
```

### before: `/Users/rafaelricco/.local/bin/python3.12 -m unittest discover -s skill/sounds-natural/tests`

```text
................
----------------------------------------------------------------------
Ran 16 tests in 0.357s

OK
```

### before: `python3 -m unittest discover -s tests -p 'test_packaging.py'`

```text
.s..
----------------------------------------------------------------------
Ran 4 tests in 0.055s

OK (skipped=1)
```

### after: `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural`

```text
Skill is valid!
```

### after: `python3 -m unittest discover -s tests -p 'test_packaging.py'`

```text
.s..
----------------------------------------------------------------------
Ran 4 tests in 0.042s

OK (skipped=1)
```

### after: `git diff --check`

```text
(no output)
```

### after-final: `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural`

```text
Skill is valid!
```

### after-final: `python3 -m unittest discover -s tests -p 'test_packaging.py'`

```text
.s..
----------------------------------------------------------------------
Ran 4 tests in 0.046s

OK (skipped=1)
```

### after-final: `git diff --check`

```text
(no output)
```

### after-fixed: `python3 /Users/rafaelricco/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/rafaelricco/Projects/personal/dotfiles/skill/sounds-natural`

```text
Skill is valid!
```

### after-fixed: `python3 -m unittest discover -s tests -p 'test_packaging.py'`

```text
.s..
----------------------------------------------------------------------
Ran 4 tests in 0.047s

OK (skipped=1)
```

### after-fixed: `git diff --check`

```text
(no output)
```

## Final comparison

Before uses the preserved original skill; After uses the final updated skill. Responses below are unedited.

## Case: Introduction

### Request

```text
Write an English introduction in my voice for me to read aloud. Source: “I'm a senior software engineer focused on building AI products. Python and TypeScript are my main languages, and I've used Python since 2021. I started in design, so I think about the whole product, how the UX and UI solve the customer's problem, and the architecture and systems behind it.” Remove the information about using Python since 2021.
```

### Before

```text
I build AI products as a senior software engineer. My main languages are Python and TypeScript. I started in design, so I think about the whole product. That includes how the UX and UI solve the customer's problem, along with the architecture and systems behind it.
```

### After

```text
I'm a senior software engineer, and I'm focused on building AI products using Python and TypeScript as my main languages. One thing that's good to mention is that I started in design, so I naturally think about the whole product, how the UX and UI solve the customer's problem. And I also think about the architecture and systems behind it.
```

### Assessment

A anterior dividiu a apresentação em quatro frases. A final usa três e incorpora o encadeamento “One thing that's good to mention … so I naturally … And I also”. As duas removem 2021. A final preserva explicitamente que Python e TypeScript são as linguagens principais, nuance omitida nas duas primeiras tentativas atualizadas. Melhora de cadência observada neste exemplo, sem prova de melhora universal.

## Case: New facts

### Request

```text
Write an English introduction in my voice for me to read aloud. Source facts: I'm a software engineer, I started in QA, and I now build internal tools using Go.
```

### Before

```text
I’m a software engineer. I started out in QA, and now I build internal tools with Go.
```

### After

```text
Hey, I'm [name]. I'm a software engineer, and now I build internal tools using Go. One thing that's good to mention is that I started in QA.
```

### Assessment

QA, ferramentas internas e Go foram preservados, sem importar design, IA, Python, TypeScript ou duração. Porém a final copiou o placeholder “[name]” do catálogo, embora a fonte não tenha fornecido nome. A saída ficou incompleta para uso direto. É uma limitação remanescente, não corrigida editorialmente.

## Case: Technical explanation

### Request

```text
Escreve na minha voz uma explicação para eu ler em voz alta. Fatos: o agente de voz ouvia a própria resposta e a aplicação ficava inutilizável. Unifiquei a captura de áudio e o cancelamento de ruído em um contexto de áudio no front-end. Mudei a identificação de fala para um serviço de terceiro no back-end. A conversa ficou mais natural.
```

### Before

```text
O problema era que o agente de voz ouvia a própria resposta, e a aplicação ficava inutilizável.
Unifiquei a captura de áudio e o cancelamento de ruído em um contexto de áudio no front-end.
Também mudei a identificação da fala para um serviço de terceiro no back-end.
Depois disso, a conversa ficou mais natural.
```

### After

```text
Eu tive um problema com o agente de voz: ele ouvia a própria resposta, e isso deixava a aplicação inutilizável. Então, unifiquei a captura de áudio e o cancelamento de ruído em um contexto de áudio no front-end. Também mudei a identificação de fala para um serviço de terceiro no back-end. E isso fez com que a conversa ficasse mais natural.
```

### Assessment

A final mantém problema, impacto, contexto de áudio no front-end, identificação de fala no back-end e resultado. Usa “Então” e “E isso fez com que” para conectar o desenvolvimento. Diferentemente da primeira tentativa, não acrescenta que as etapas antes ficavam separadas no front-end.

## Case: Delivery update

### Request

```text
Escreve uma resposta minha no chat para “Consegue entregar hoje?”. Fatos: não consigo entregar hoje; boa parte da página funciona; faltam revisão e finalização; a parte funcional pode ser apresentada. Não há previsão confirmada.
```

### Before

```text
Hoje não consigo entregar. Boa parte da página já funciona e posso apresentar essa parte, mas ainda faltam a revisão e a finalização. Ainda não tenho uma previsão confirmada.
```

### After

```text
Não vou conseguir entregar hoje. Boa parte da página já está funcional, mas ainda faltam a revisão e a finalização. A parte funcional já pode ser apresentada, mas ainda não tenho uma previsão confirmada.
```

### Assessment

As duas indicam impossibilidade de entregar hoje, parte funcional apresentável, revisão/finalização pendentes e ausência de previsão. Nenhuma inventa prazo. A mudança de voz é pequena.

## Case: Disagreement

### Request

```text
Escreve uma resposta minha para um colega que propôs reescrever parte do sistema. Fatos: a solução atual resolve o problema; ainda não há benchmark mostrando benefício funcional; cada mudança pode introduzir bugs. Estou aberto a reconsiderar com evidência concreta.
```

### Before

```text
Eu não reescreveria agora. A solução atual já resolve o problema, e ainda não temos benchmark mostrando benefício funcional. Cada mudança pode trazer bugs. Se tivermos evidência concreta de ganho, estou aberto a reconsiderar. O que acha?
```

### After

```text
Bom, acho que a primeira coisa é entender se a gente realmente precisa reescrever essa parte do sistema. Do jeito que tá hoje, ela já resolve o problema. Ainda não temos um benchmark que mostre que essa reescrita traria algum benefício funcional. Se aparecer uma evidência concreta, a gente pode reconsiderar, mas cada mudança pode introduzir algum bug.
```

### Assessment

A anterior abre pela decisão (“Eu não reescreveria agora”). A final começa examinando a necessidade, explica a solução atual, a falta de benchmark, a abertura à evidência e o risco. A progressão acompanha mais de perto o exemplo elicitado, com os fatos preservados.

## Case: Recruiter email

### Request

```text
Escreve um e-mail meu para um recrutador. Fatos: li a vaga, achei compatível com meu perfil e quero saber a faixa salarial e se é remoto ou presencial antes de marcar uma conversa. Não vou anexar currículo neste e-mail.
```

### Before

```text
Oi!

Li a vaga e achei que ela combina com meu perfil. Você poderia me informar a faixa salarial e se o trabalho é remoto ou presencial? Gostaria de saber isso antes de marcarmos uma conversa.

Obrigado!
```

### After

```text
Oi!

Eu li a vaga e, pra mim, parece compatível com o meu perfil. Só fiquei com algumas dúvidas sobre a faixa salarial e se a vaga é remota ou presencial. Você poderia me passar essas informações antes de a gente marcar uma conversa?
```

### Assessment

Ambas perguntam salário e formato antes de marcar conversa e não afirmam anexo. A final usa a progressão “pra mim … Só fiquei com algumas dúvidas … antes de a gente marcar”. As tentativas atualizadas anteriores atribuíram indevidamente a publicação da vaga ao recrutador; a final diz apenas “Eu li a vaga”. A voz é uma avaliação qualitativa; a versão anterior também era adequada.

## Case: Ambiguous delivery

### Request

```text
Me ajuda a me apresentar: sou engenheiro de software e trabalho com produtos de IA.
```

### Before

```text
Oi, sou engenheiro de software e trabalho com produtos de IA.
```

### After

```text
Oi, sou engenheiro de software e trabalho com produtos de IA.
```

### Assessment

As duas produzem uma apresentação curta sem perguntar o destino. O texto serve a múltiplos usos; este caso não exercita de forma decisiva a condição de ambiguidade que mudaria materialmente a resposta. A regra de esclarecimento continua sem comprovação comportamental neste conjunto.

## Case: Caller constraints

### Request

```text
Produce an English LinkedIn About draft in my voice, at most 500 characters. Use only these facts: software engineer, design background, building AI products with Python and TypeScript. Return only the draft.
```

### Before

```text
I'm a software engineer with a background in design. I build AI products with Python and TypeScript.
```

### After

```text
I'm a software engineer with a background in design. I'm building AI products with Python and TypeScript.
```

### Assessment

As duas retornam somente um About em inglês com os quatro fatos fornecidos e abaixo de 500 caracteres. A versão final é praticamente igual à anterior. Não há evidência de melhora neste caso; há preservação da restrição do chamador.

Character counts excluding final newlines: before 100, after 105.

## Appendix: Initial updated outputs

Retained in full so failed attempts and variation remain visible. Requests are identical to the corresponding cases above.

### Introduction

```text
Hey, I'm a senior software engineer focused on building AI products with Python and TypeScript. I started in design, so I naturally think about the whole product: how the UX and UI solve the customer's problem, and also the architecture and systems behind it.
```

### New facts

```text
Hey, I'm a software engineer. I actually started in QA, and these days I build internal tools using Go.
```

### Technical explanation

```text
Eu tive um problema com o agente de voz: ele acabava ouvindo a própria resposta, e isso deixava a aplicação inutilizável. A captura de áudio e o cancelamento de ruído ficavam separados no front-end, então eu unifiquei os dois em um contexto de áudio. Também mudei a identificação de fala para um serviço de terceiro no back-end. Com isso, a conversa ficou mais natural.
```

### Delivery update

```text
Não, eu não vou conseguir entregar hoje. Boa parte da página já está funcional, mas ainda falta revisar e finalizar algumas partes. A parte funcional já dá pra apresentar. Ainda não tenho uma previsão confirmada.
```

### Disagreement

```text
Bom, acho que a primeira coisa é entender se a gente realmente precisa reescrever essa parte do sistema. Do jeito que está hoje, ela já resolve o problema que temos. Ainda não temos um benchmark que mostre um benefício funcional com essa mudança. Se tiver alguma evidência concreta, estou aberto a reconsiderar e a gente pode avaliar isso melhor. Só acho importante levar em conta que cada alteração pode introduzir bugs.
```

### Recruiter email

```text
Oi, tudo bem?

Li a vaga que você publicou e, para mim, parece um excelente fit com o meu perfil. Só fiquei com algumas dúvidas sobre a faixa salarial e se a vaga é remota ou presencial. Você poderia me passar essas informações antes de a gente marcar uma conversa sobre a vaga?

Obrigado!
```

### Ambiguous delivery

```text
Oi, eu sou engenheiro de software e trabalho com produtos de IA.
```

### Caller constraints

```text
I’m a software engineer with a background in design. I’m building AI products with Python and TypeScript, bringing both design and engineering into the work.
```

## Appendix: Correction-round-1 outputs

Retained in full so failed attempts and variation remain visible. Requests are identical to the corresponding cases above.

### Introduction

```text
I'm a senior software engineer, and I'm focused on building AI products using Python and TypeScript. I started in design, so I naturally think about the whole product, how the UX and UI solve the customer's problem, and the architecture and systems behind it.
```

### New facts

```text
Hey, I'm a software engineer. I started in QA, and now I build internal tools using Go.
```

### Technical explanation

```text
Eu tive um problema com o agente de voz: ele ouvia a própria resposta, e a aplicação ficava inutilizável. Então, unifiquei a captura de áudio e o cancelamento de ruído em um contexto de áudio no front-end. Também mudei a identificação de fala para um serviço de terceiro no back-end. Com isso, a conversa ficou mais natural.
```

### Delivery update

```text
Não, não consigo entregar hoje. Boa parte da página já está funcional, mas ainda faltam a revisão e a finalização. A parte que já está funcionando pode ser apresentada. Ainda não tenho uma previsão confirmada.
```

### Disagreement

```text
Bom, acho que a primeira coisa é entender se a gente realmente precisa reescrever essa parte do sistema. Do jeito que está hoje, ela já resolve o problema que temos. Se você tiver um benchmark ou alguma evidência concreta de que a reescrita traria um benefício funcional, estou aberto a reconsiderar. Mas, sem isso, acho que não vale fazer a mudança só por fazer, ainda mais porque cada alteração pode introduzir bugs.
```

### Recruiter email

```text
Olá!

Eu li a vaga que você postou e, para mim, parece compatível com o meu perfil. Só fiquei com algumas dúvidas em relação à faixa salarial e se a vaga é remota ou presencial. Você poderia me passar essas informações antes de a gente marcar uma conversa?

Abraço,
```

### Ambiguous delivery

```text
Oi, eu sou engenheiro de software e trabalho com produtos de IA.
```

### Caller constraints

```text
I’m a software engineer with a design background, building AI products with Python and TypeScript.
```

## Remaining limits

- Final New facts output contains an unfilled `[name]` placeholder, despite no name supplied. It is retained exactly as generated.
- The conditional clarification branch, current-sample precedence, and substantial grammar/restart repair were not directly exercised by the eight frozen prompts.
- LinkedIn validation exercised text, facts and a character cap, not a live publishing workflow.
- Requested model/effort are controlled in spawn arguments, but their resolved backend values were not exposed.
- Style judgments are qualitative, based on one final paired run per case. The user should judge the read-aloud cadence from the actual outputs.
- Native release-artifact verification was skipped by its existing environment gate.

## Independent review

A fresh read-only verifier checked the final runtime, snapshot hashes, source preservation, legacy samples, deleted files, and all response sets. It independently reran the validator, packaging suite and whitespace check. Its conclusion agrees with PARTIAL: the implementation matches the requested rules; the final New facts response retains an unsupported name placeholder; consequential ambiguity and several unchanged contracts remain unexercised. It found no concrete source-fact leak in the other seven final responses.

## PR #79 review regression: redacted slots

### Scope and evidence

The historical before/after run above is preserved unchanged. This follow-up addresses Cursor comment `4469315962` on PR #79, based on parent revision `47fd95b9326d22e8fcad9549e96b9ccf40407d6e`. The runtime now treats example redactions as optional fields whose values come from the current source; requested templates may keep them. The catalogue points to that single rule.

Baseline reproduction was a recorded-generation replay, not fresh baseline inference. A failing assertion in a detached worktree rejected the preserved New facts response for its unsupported `[name]`; all six recorded final runtime hashes matched that HEAD. The worktree was removed.

After the correction, all eight existing cases and two added boundary cases ran once each in ten fresh agent contexts (`fork_turns=none`), using the same snapshot. Each generator received only its exact request, the runtime snapshot and output-file instructions, not expectations, review text or other responses. Model and effort inherited the parent settings; the spawn response did not expose their resolved values. This follow-up is not a controlled model-matched comparison with the earlier run. No generated output was manually repaired, retried or selected from multiple candidates.

Local evidence directory: `/private/tmp/pr79-placeholder-eval-20261104`; baseline replay script/log: `/private/tmp/placeholder-proof-47fd95b.py` and `/private/tmp/placeholder-proof-47fd95b.log`. The portable evidence is the frozen requests in `voice.md`, runtime hashes and unedited outputs below.

### Runtime identity

| Runtime file                    | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `SKILL.md`                      | `0e131105b372e557771c2c7bbc21128e1f927be6105821d6e24a139d4c82a6bb` |
| `references/voice/catalogue.md` | `b8f0fe34a478e0ef15d2eda7cc16b8f4246cbfc83443e1ca7811ba5943333532` |
| `references/voice/chat.md`      | `be7cbdb6fa109af38c76970dbff2336f018dfc8477560b6d59291c987cbd5acd` |
| `references/voice/profile.md`   | `b905efeecdf1bc7693429c6f49e6e1f144262385d6cd21de19136eb59b9fa544` |
| `references/voice/spoken.md`    | `533cb4ebcfc3bd50acb1cd32bc156eabefeaa199e02d2d03e6b7210668f177c9` |
| `references/voice/written.md`   | `7f2747025cdd9be5e8bb8241c82b4f0752f5c5085cb8d9938c6b6f7d1bd68d35` |

### Checks

- The baseline replay exited 1 with `AssertionError: Finished source-only spoken introduction must have no unsupported placeholders; observed ['[name]']`. This confirms the historical generated-output failure at the matching runtime snapshot.

- `python3 /private/tmp/pr79-placeholder-eval-20261104/check_responses.py` passed. It checked snapshot identity, absence of placeholder slots in nine finished drafts, retention of all three requested template slots, supplied-name preservation, the no-name source facts and the caller character limit. These are narrow assertions, not an all-case semantic-fidelity verdict.

- `quick_validate.py skill/sounds-natural` passed.

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p 'test_packaging.py'` passed: three tests passed and one native-artifact case skipped because `DOTFILES_TEST_RELEASE_DIR` was not supplied.

- `git diff --check` passed.

### Unedited follow-up outputs

#### Introduction

```text
Hey, I'm a senior software engineer focused on building AI products, and my main languages are Python and TypeScript. One thing that's good to mention is that I started in design, so I naturally think about the whole product, how the UX and UI solve the customer's problem. And I also think about the architecture and the systems behind it.
```

Requested removal of 2021 is respected; the supplied role, main languages, design background, product perspective and architecture remain. No redacted slots appear.

#### New facts

```text
Hey, I'm a software engineer, and I'm currently building internal tools using Go. One thing that's good to mention is that I started in QA.
```

The three supplied facts remain, with no imported name, duration, design background, Python, TypeScript or AI-product claim. No unfilled slot appears.

#### Technical explanation

```text
Eu tive um problema com um agente de voz que ficava ouvindo a própria resposta, e isso tornava a aplicação inutilizável. Daí eu peguei a captura de áudio e o cancelamento de ruído no front-end e unifiquei tudo em um contexto de áudio, que passou a fazer as duas coisas. E movi também a identificação de fala para um serviço de terceiro no back-end, para identificar se a pessoa estava falando ou não. E isso fez com que a conversa ficasse muito mais natural.
```

PARTIAL: the response preserves the main source facts but imports catalogue wording: “para identificar se a pessoa estava falando ou não” and the stronger result “muito mais natural”. The latter exceeds the source’s “mais natural”. This remains a source-fidelity limitation; the raw output is retained.

#### Delivery update

```text
Não vou conseguir entregar hoje. Boa parte da página já está funcional, mas algumas partes ainda precisam ser revisadas e finalizadas. A gente pode apresentar o que já está funcionando, mas ainda não tenho uma previsão confirmada para a entrega.
```

No delivery today, working portion, remaining review/finalization, presentation option and lack of ETA remain; no deadline is invented.

#### Disagreement

```text
Bom, a primeira coisa é entender se a gente realmente precisa reescrever essa parte do sistema. Do jeito que tá hoje já resolve o problema que a gente tem, e ainda não tem um benchmark mostrando que essa mudança traria um benefício funcional.

Mas se tu trouxer um benchmark ou alguma evidência concreta desse benefício, a gente pode reconsiderar e colocar isso pra frente. A minha posição é que a gente precisa de um argumento sólido pra fazer essa mudança, dado que cada alteração pode introduzir algum novo bug.
```

Current solution, missing benchmark, risk of bugs and openness to concrete evidence remain.

#### Recruiter email

```text
Oi, tudo bem?

Eu li a vaga e achei um bom fit com o meu perfil. Só fiquei com algumas dúvidas em relação à faixa salarial e se a vaga é remota ou presencial. Você poderia me passar essas informações antes de a gente marcar uma conversa?

Obrigado!
```

Salary and remote/on-site questions precede scheduling; no attachment or recruiter-publication claim is introduced.

#### Ambiguous delivery

```text
Oi, eu sou engenheiro de software e trabalho com produtos de IA.
```

A short general introduction is returned. This still does not decisively exercise materially consequential delivery ambiguity.

#### Caller constraints

```text
I'm a software engineer with a background in design. I've been building AI products using Python and TypeScript.
```

Returns only an English draft, preserves supplied facts and stays within the 500-character limit (112 characters excluding the final newline).

#### Supplied name

```text
Hey, I'm Alex. I'm a software engineer, and I now build internal tools using Go. One thing that's good to mention is that I started in QA.
```

Alex is used rather than omitted or replaced by a slot. Role, QA background and internal tools using Go remain; no time claim appears.

#### Requested template

```text
Hey, I'm [name]. I'm a [role], and I mainly work with [main programming language].
```

Keeps exactly the requested editable name, role and main-language slots; no catalogue biography is imported.

### Follow-up verdict

The placeholder correction passes the observed no-name, supplied-name and requested-template cases, and no unsupported slots appear in the other finished drafts. A fresh independent verifier checked all snapshot hashes and raw responses and agreed with that narrow finding.

Broader verdict remains PARTIAL. The technical explanation still transfers a qualifier and explanatory wording from its example. Meaningful delivery ambiguity, current-sample precedence, substantial grammar repair, calibration, and native release behavior remain unexercised. One generation per case cannot establish general reliability or stylistic improvement. The historical failure and the new fidelity limitation remain visible rather than being rewritten into passing evidence.
