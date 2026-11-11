"""Taste packs: captured material lives in skill/ui/tastes/<name>/, the method and the core in skill/taste."""
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASTE = ROOT / "skill/taste"
MOMENTS = TASTE / "assets/moments"
NINE_SCENES = {
    "descend-through-weather", "dot-becomes-the-full-stop", "fly-into-the-shape", "letter-bar-floods-the-ground",
    "letter-physics", "parts-lock-into-the-whole", "powers-of-ten-pullback", "product-assembles-into-its-action",
    "shaped-window-over-fixed-world",
}
needs_node = unittest.skipUnless(shutil.which("node"), "node is not installed")


def node(script, *args, cwd=None, tastes):
    """Run a script of skill/taste/scripts; TASTE_SKILL_TASTES is always set, so the real packs are never read."""
    env = {**os.environ, "TASTE_SKILL_TASTES": str(tastes)}
    env.pop("TASTE_SKILL_RECENT", None)
    return subprocess.run(
        ["node", str(TASTE / "scripts" / script), *args], capture_output=True, text=True, cwd=cwd, env=env, timeout=120
    )


def make_pack(tmp, name, **manifest):
    """<tmp>/tastes/<name>/taste.json with the given keys over the empty manifest; returns the pack folder."""
    pack = Path(tmp) / "tastes" / name
    pack.mkdir(parents=True, exist_ok=True)
    light = {
        "--p-bg": "#ffffff", "--p-ink": "#111111", "--p-surface": "#f4f4f4", "--p-muted": "#555555",
        "--p-accent": "#2457c5", "--p-accent-ink": "#ffffff", "--p-action": "#2457c5", "--p-action-ink": "#ffffff",
        "--p-inv-bg": "#111111", "--p-inv-surface": "#1d1d1d", "--p-inv-ink": "#ffffff",
        "--p-inv-muted": "#cfcfcf", "--p-inv-accent": "#7da0ff", "--p-inv-accent-ink": "#111111",
        "--p-inv-action": "#7da0ff", "--p-inv-action-ink": "#111111",
    }
    typography = {"--t-h1": "48px", "--t-h2": "32px", "--t-body": "16px"}
    dimensions = {"--container": "1200px", "--nav": "72px"}
    data = {
        "schemaVersion": 2,
        "name": name,
        "source": ["https://example.test/"],
        "use_when": [],
        "fits": {},
        "variants": {},
        "signature": [],
        "settled": {},
        "tokens": {"colors": {"light": light, "dark": None}, "typography": typography,
                   "surfaces": {}, "dimensions": dimensions},
        "fonts": {"roles": {role: {"family": "system-ui", "sources": [], "fallbacks": ["sans-serif"]}
                             for role in ("body", "heading")}},
        "guidance": {"character": "Clear and measured.", "usage": ["Use direct language."],
                     "composition": ["Keep the hierarchy compact."], "adaptations": ["Use accessible contrast."]},
        "evidence": {},
        "heroes": ["centred"],
        "layout": {"nav": ["nav-mega"], "footer": ["footer-columns"], "close": ["close-type"],
                   "buttons": ["solid"], "mark": ["wordmark"], "bands": [], "rhythm": "screens",
                   "headingAlign": "left"},
        "motion": {"moments": 0, "entrance": "still", "scene": "none", "effect": "none",
                   "reveal": "none", "fragmentPlayback": "static"},
    }
    data.update(manifest)
    data["layout"] = {**data["layout"], **manifest.get("layout", {})}
    signature = data.get("signature", [])
    motion = {**data["motion"], **manifest.get("motion", {})}
    if "motion" not in manifest:
        motion["moments"] = sum(item.startswith("moments/") for item in signature)
        if any(item.startswith("scenes/") for item in signature):
            motion["scene"] = "auto"
        if any(item.startswith("effects/") for item in signature):
            motion["effect"] = "auto"
    data["motion"] = motion
    data["contractEvidence"] = {
        f"{family}.{field}": {"sources": ["shots/ref.png"], "reason": "recorded in the reference capture"}
        for family in ("layout", "motion")
        for field in data.get(family, {})
    }
    evidence = {"sources": ["https://example.test/reference.png"], "reason": "recorded in the reference capture"}
    data["evidence"]["layout"] = evidence
    data["evidence"]["motion"] = evidence
    for key, value in light.items():
        data["evidence"][f"tokens.colors.light.{key}"] = evidence
    for key, value in typography.items():
        data["evidence"][f"tokens.typography.{key}"] = evidence
    for key, value in dimensions.items():
        data["evidence"][f"tokens.dimensions.{key}"] = evidence
    for family in ("layout", "motion"):
        for field in data.get(family, {}):
            data["evidence"][f"{family}.{field}"] = evidence
    data["evidence"]["fonts.roles.body"] = evidence
    data["evidence"]["fonts.roles.heading"] = evidence
    data["evidence"]["guidance.character"] = evidence
    data["evidence"]["guidance.usage"] = evidence
    data["evidence"]["guidance.composition"] = evidence
    data["evidence"]["guidance.adaptations"] = evidence
    (pack / "taste.json").write_text(json.dumps(data), encoding="utf-8")
    return pack


def add_moment(pack, mid="pack-moment"):
    """A valid pack moment: a built-in moment's folder copied under a new id."""
    dest = pack / "assets/moments" / mid
    shutil.copytree(MOMENTS / "word-highlight", dest)
    meta = dest / "meta.json"
    meta.write_text(meta.read_text(encoding="utf-8").replace('"id": "word-highlight"', f'"id": "{mid}"'), encoding="utf-8")
    demo = dest / "demo.html"
    demo.write_text(
        demo.read_text(encoding="utf-8").replace('data-moment="word-highlight"', f'data-moment="{mid}"'), encoding="utf-8"
    )
    return dest


def clone_item(src, dest, old, new, names):
    """A built-in item's folder copied to dest, with `old` replaced by `new` in the named files."""
    shutil.copytree(src, dest)
    for name in names:
        f = dest / name
        f.write_text(f.read_text(encoding="utf-8").replace(old, new), encoding="utf-8")
    return dest


def add_scene(pack, sid="pack-scene"):
    """A valid pack scene: letter-physics copied under a new id (meta.json, scene.js, scene.css, demo.html)."""
    return clone_item(TASTE / "assets/scenes/letter-physics", pack / "assets/scenes" / sid, "letter-physics", sid,
                      ["meta.json", "scene.js", "scene.css", "demo.html"])


def add_effect(pack, eid="pack-fx"):
    """A valid pack effect: grain-gradient copied under a new id (meta.json and effect.js declare it)."""
    return clone_item(TASTE / "assets/effects/grain-gradient", pack / "assets/effects" / eid, "grain-gradient", eid,
                      ["meta.json", "effect.js"])


def add_ui(pack, uid="chat"):
    item = pack / "assets/ui" / uid
    item.mkdir(parents=True, exist_ok=True)
    (item / "meta.json").write_text(json.dumps({"id": uid}), encoding="utf-8")
    (item / "fragment.html").write_text('<div class="chat-fragment">Chat</div>\n', encoding="utf-8")
    return item


class Sandbox(unittest.TestCase):
    def setUp(self):
        holder = tempfile.TemporaryDirectory()
        self.addCleanup(holder.cleanup)
        self.tmp = Path(holder.name)
        self.tastes = self.tmp / "tastes"
        self.tastes.mkdir()

    def run_node(self, script, *args, cwd=None):
        return node(script, *args, cwd=cwd, tastes=self.tastes)

    def pick_ids(self, seed, *extra, count=3):
        out = self.run_node("moments.mjs", "pick", "--page", "software", "--json", "--seed", str(seed),
                            "--count", str(count), *extra)
        self.assertEqual(out.returncode, 0, out.stderr)
        return [p["id"] for p in json.loads(out.stdout)["picks"]]

    def plan(self, name):
        """The plan of a software page in a fresh site folder; returns (site folder, stdout, deal.json)."""
        site = self.tmp / "site"
        site.mkdir(exist_ok=True)
        hist = site / ".taste-skill/history.json"
        out = self.run_node("start.mjs", "plan", "--page", "software", "--taste", name, "--history", str(hist), cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        deal = json.loads((site / ".taste-skill/deal.json").read_text(encoding="utf-8"))
        return site, out.stdout, deal


class Packs(Sandbox):
    def test_tastes_are_not_tracked(self):
        if not shutil.which("git"):
            self.skipTest("git is not installed")
        probe = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--is-inside-work-tree"], capture_output=True, text=True)
        if probe.returncode != 0:
            self.skipTest("not a git repository")
        out = subprocess.run(["git", "-C", str(ROOT), "ls-files", "skill/ui/tastes"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(out.stdout.strip(), "")

    @needs_node
    def test_dealer_reads_a_pack(self):
        add_moment(make_pack(self.tmp, "sample"))
        with_taste = [i for s in range(30) for i in self.pick_ids(s, "--taste", "sample")]
        self.assertIn("pack-moment", with_taste)
        without = [i for s in range(30) for i in self.pick_ids(s)]
        self.assertNotIn("pack-moment", without)

    @needs_node
    def test_fits_narrows_the_built_ins(self):
        add_moment(make_pack(self.tmp, "sample", fits={"moments": ["word-rotate"]}))
        for s in range(20):
            for i in self.pick_ids(s, "--taste", "sample"):
                self.assertIn(i, ("word-rotate", "pack-moment"), f"seed {s}")

    @needs_node
    def test_signature_moment_is_always_dealt(self):
        add_moment(make_pack(self.tmp, "sample", signature=["moments/pack-moment"]))
        for s in range(20):
            self.assertIn("pack-moment", self.pick_ids(s, "--taste", "sample"), f"seed {s}")

    @needs_node
    def test_plan_writes_the_deal(self):
        pack = make_pack(self.tmp, "sample", signature=["moments/pack-moment"])
        add_moment(pack)
        site, stdout, deal = self.plan("sample")
        self.assertEqual(deal["planVersion"], 2)
        self.assertEqual(deal["mode"], "reference")
        self.assertEqual(deal["taste"], "sample")
        mine = [m for m in deal["moments"] if m["id"] == "pack-moment"]
        self.assertEqual(len(mine), 1)
        self.assertEqual(Path(mine[0]["dir"]).resolve(), (pack / "assets/moments/pack-moment").resolve())
        self.assertTrue(mine[0]["dir"].replace("\\", "/").endswith("assets/moments/pack-moment"))
        self.assertIn("tastes/sample/assets/moments/pack-moment/demo.html", stdout)
        lines = [line.strip() for line in stdout.splitlines()]
        taste_lines = [line for line in lines if line.startswith("taste ")]
        self.assertTrue(any("sample" in line and "record.mjs kit sample" in line for line in taste_lines), stdout)
        self.assertFalse([line for line in lines if line.startswith("palette ")])
        self.assertFalse((site / ".taste-skill/history.json").exists())
        self.assertFalse((site / ".taste-skill/layout-history.json").exists())

    @needs_node
    def test_reference_plan_is_independent_of_existing_histories(self):
        pack = make_pack(self.tmp, "sample")
        site = self.tmp / "site"
        site.mkdir()
        history = site / ".taste-skill/history.json"
        history.parent.mkdir(parents=True)
        original = {"palettes": ["old"], "types": ["old"], "entrances": ["old"], "heroes": ["old"]}
        history.write_text(json.dumps(original), encoding="utf-8")
        out = self.run_node("start.mjs", "plan", "--page", "software", "--taste", "sample", "--history", str(history), cwd=site)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        deal = json.loads((site / ".taste-skill/deal.json").read_text(encoding="utf-8"))
        self.assertEqual(history.read_text(encoding="utf-8"), json.dumps(original))
        self.assertEqual(deal["hero"], "centred")
        self.assertEqual(deal["layout"]["nav"], "nav-mega")

    @needs_node
    def test_legacy_reference_plan_preserves_pack_and_legacy_deal(self):
        pack = make_pack(self.tmp, "sample")
        definition_file = pack / "taste.json"
        definition = json.loads(definition_file.read_text(encoding="utf-8"))
        del definition["schemaVersion"]
        original = json.dumps(definition)
        definition_file.write_text(original, encoding="utf-8")
        site = self.tmp / "legacy-site"
        site.mkdir()
        out = self.run_node("start.mjs", "plan", "--page", "software", "--taste", "sample", cwd=site)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(definition_file.read_text(encoding="utf-8"), original)
        deal = json.loads((site / ".taste-skill/deal.json").read_text(encoding="utf-8"))
        self.assertNotIn("planVersion", deal)
        self.assertEqual(deal["taste"], "sample")

    @needs_node
    def test_reference_plan_refuses_symlinked_deal_without_overwriting_target(self):
        make_pack(self.tmp, "sample")
        outside = self.tmp / "outside"
        outside.mkdir()
        canary = outside / "canary.json"
        canary.write_text("CANARY", encoding="utf-8")
        site = self.tmp / "symlink-site"
        state = site / ".taste-skill"
        state.mkdir(parents=True)
        try:
            os.symlink(canary, state / "deal.json")
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"symlinks unavailable: {error}")
        out = self.run_node("start.mjs", "plan", "--page", "software", "--taste", "sample", cwd=site)
        self.assertNotEqual(out.returncode, 0, out.stdout)
        self.assertIn("symlink or junction", out.stderr)
        self.assertEqual(canary.read_text(encoding="utf-8"), "CANARY")
        self.assertFalse((state / "build.json").exists())
        self.assertFalse((state / "history.json").exists())

    @needs_node
    def test_kit_copy_copies_core_and_dealt_only(self):
        add_moment(make_pack(self.tmp, "sample", signature=["moments/pack-moment"]))
        site, _, deal = self.plan("sample")
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        assets = site / "assets"
        self.assertTrue((assets / "system.css").is_file())
        # layout.js always imports ui.js; closeImports keeps the runtime dependency even though core.json does not
        # copy it redundantly as an always-file.
        self.assertTrue((assets / "ui/ui.js").is_file())
        # The starter and start.mjs output name these paths directly, so their runtime files stay in the core.
        self.assertTrue((assets / "ui/cards.css").is_file())
        self.assertTrue((assets / "backgrounds/backgrounds.css").is_file())
        self.assertTrue((assets / "backgrounds/backgrounds.js").is_file())
        self.assertTrue((assets / "moments/pack-moment/moment.js").is_file())
        dealt = {m["id"] for m in deal["moments"]}
        built_in = sorted(d.name for d in MOMENTS.iterdir() if d.is_dir() and (d / "meta.json").is_file())
        undealt = [i for i in built_in if i not in dealt]
        self.assertTrue(undealt)
        for i in undealt:
            self.assertFalse((assets / "moments" / i).exists(), i)
        self.assertEqual([p for p in assets.rglob("demo.html")], [])

    @needs_node
    def test_kit_copy_follows_imports(self):
        pack = make_pack(self.tmp, "sample")
        scene = pack / "assets/scenes/pack-scene"
        scene.mkdir(parents=True)
        (scene / "meta.json").write_text(json.dumps({"id": "pack-scene"}), encoding="utf-8")
        (scene / "scene.js").write_text('import "../shared-bit/bit.js";\n', encoding="utf-8")
        bit = pack / "assets/scenes/shared-bit"
        bit.mkdir()
        (bit / "bit.js").write_text("export const bit = 1;\n", encoding="utf-8")
        site = self.tmp / "site"
        (site / ".taste-skill").mkdir(parents=True)
        deal = {"taste": "sample", "moments": [], "scene": {"id": "pack-scene", "dir": str(scene)}, "effect": None}
        (site / ".taste-skill/deal.json").write_text(json.dumps(deal), encoding="utf-8")
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((site / "assets/scenes/pack-scene/scene.js").is_file())
        self.assertTrue((site / "assets/scenes/shared-bit/bit.js").is_file())

    @needs_node
    def test_kit_copy_follows_url_references(self):
        pack = make_pack(self.tmp, "sample")
        scene = add_scene(pack)
        with open(scene / "scene.js", "a", encoding="utf-8") as f:
            f.write('\nconst extra = new URL("../shared-bit/extra.css", import.meta.url);\n')
        shared = pack / "assets/scenes/shared-bit"
        shared.mkdir()
        (shared / "extra.css").write_text(".extra { color: red; }\n", encoding="utf-8")
        site = self.tmp / "site"
        (site / ".taste-skill").mkdir(parents=True)
        deal = {"taste": "sample", "moments": [], "scene": {"id": "pack-scene", "dir": str(scene)}, "effect": None}
        (site / ".taste-skill/deal.json").write_text(json.dumps(deal), encoding="utf-8")
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((site / "assets/scenes/pack-scene/scene.js").is_file())
        self.assertTrue((site / "assets/scenes/shared-bit/extra.css").is_file())

    @needs_node
    def test_kit_copy_refuses_to_write_through_a_symlink(self):
        outside = self.tmp / "outside"
        outside.mkdir()
        canary = outside / "canary.txt"
        canary.write_text("CANARY", encoding="utf-8")
        cases = [("system.css", "assets/system.css", canary, False), ("assets", "assets", outside, True),
                 ("motion", "assets/motion", outside, True)]
        for name, link, target, is_dir in cases:
            with self.subTest(link=link):
                site = self.tmp / f"site-{name}"
                (site / ".taste-skill").mkdir(parents=True)
                deal = {"taste": None, "moments": [], "scene": None, "effect": None}
                (site / ".taste-skill/deal.json").write_text(json.dumps(deal), encoding="utf-8")
                (site / link).parent.mkdir(parents=True, exist_ok=True)
                try:
                    os.symlink(target, site / link, target_is_directory=is_dir)
                except (OSError, NotImplementedError) as e:
                    self.skipTest(f"symlinks unavailable: {e}")
                out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
                self.assertEqual(out.returncode, 2, out.stdout)
                self.assertIn("is a symlink", out.stderr)
                self.assertEqual(canary.read_text(encoding="utf-8"), "CANARY")
                self.assertEqual(sorted(p.name for p in outside.iterdir()), ["canary.txt"])

    @needs_node
    def test_kit_copy_refuses_a_symlinked_ancestor_of_external_destination(self):
        outside = self.tmp / "outside"
        target = outside / "assets"
        target.mkdir(parents=True)
        canary = target / "system.css"
        canary.write_text("CANARY", encoding="utf-8")
        redirect = self.tmp / "redirect"
        try:
            os.symlink(outside, redirect, target_is_directory=True)
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"symlinks unavailable: {error}")

        site = self.tmp / "site"
        (site / ".taste-skill").mkdir(parents=True)
        (site / ".taste-skill/deal.json").write_text(
            json.dumps({"taste": None, "moments": [], "scene": None, "effect": None}), encoding="utf-8"
        )
        out = self.run_node("kit-copy.mjs", "--to", str(redirect / "assets"), cwd=site)
        self.assertEqual(out.returncode, 2, out.stdout + out.stderr)
        self.assertIn("is a symlink", out.stderr)
        self.assertEqual(canary.read_text(encoding="utf-8"), "CANARY")

    @needs_node
    def test_kit_copy_allows_a_legitimate_external_destination(self):
        destination = self.tmp / "external-assets"
        site = self.tmp / "site"
        (site / ".taste-skill").mkdir(parents=True)
        (site / ".taste-skill/deal.json").write_text(
            json.dumps({"taste": None, "moments": [], "scene": None, "effect": None}), encoding="utf-8"
        )
        out = self.run_node("kit-copy.mjs", "--to", str(destination), cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((destination / "system.css").is_file())

    @needs_node
    def test_kit_copy_refuses_a_part_outside_the_kit(self):
        bad = [({"moments": [{"id": "../../.."}]}, []), ({"signature": [{"family": "..", "id": ".."}]}, []),
               ({"signature": [{"family": "ui", "id": "C:/x"}]}, []), ({}, ["--add", "ui/..\\..\\.."])]
        for i, (extra, add) in enumerate(bad):
            with self.subTest(deal=extra, add=add):
                outer = self.tmp / f"outer-{i}"
                site = outer / "site"
                (site / ".taste-skill").mkdir(parents=True)
                deal = {"taste": None, "moments": [], "scene": None, "effect": None, **extra}
                (site / ".taste-skill/deal.json").write_text(json.dumps(deal), encoding="utf-8")
                out = self.run_node("kit-copy.mjs", "--to", "assets", *add, cwd=site)
                self.assertEqual(out.returncode, 2, out.stdout)
                self.assertEqual(sorted(p.name for p in outer.iterdir()), ["site"])
                self.assertFalse((site / "assets").exists())

    @needs_node
    def test_signature_spans_the_families(self):
        signature = ["moments/pack-moment", "effects/pack-fx", "ui/chat"]
        pack = make_pack(self.tmp, "sample", signature=signature)
        add_moment(pack)
        add_effect(pack)
        add_ui(pack)
        site, stdout, deal = self.plan("sample")
        # a signature effect is the page's one effect: no big scene is dealt beside it (MO-16, MO-23)
        self.assertIsNone(deal["scene"])
        self.assertIn("effect       pack-fx", stdout)
        self.assertEqual(deal["effect"]["id"], "pack-fx")
        self.assertIn("pack-moment", [m["id"] for m in deal["moments"]])
        self.assertEqual({(s["family"], s["id"]) for s in deal["signature"]}, {tuple(s.split("/")) for s in signature})
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((site / "assets/ui/chat/fragment.html").is_file())
        self.assertTrue((site / "assets/effects/pack-fx/effect.js").is_file())

    @needs_node
    def test_signature_scene_is_the_scene(self):
        pack = make_pack(self.tmp, "sample", signature=["scenes/pack-scene"])
        add_scene(pack)
        site, _, deal = self.plan("sample")
        self.assertEqual(deal["scene"]["id"], "pack-scene")
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((site / "assets/scenes/pack-scene/scene.js").is_file())

    @needs_node
    def test_heroes_narrow_the_hero_deal(self):
        make_pack(self.tmp, "sample", heroes=["centred"])
        for _ in range(3):
            _, stdout, deal = self.plan("sample")
            self.assertEqual(deal["hero"], "centred", stdout)

    @needs_node
    def test_heroes_with_no_compatible_choice_fail_before_writing(self):
        make_pack(self.tmp, "sample", heroes=["place"])
        site = self.tmp / "site"
        site.mkdir()
        history = site / ".taste-skill/history.json"
        out = self.run_node("start.mjs", "plan", "--page", "software", "--taste", "sample",
                            "--history", str(history), cwd=site)
        self.assertNotEqual(out.returncode, 0, out.stdout)
        self.assertIn("no compatible hero", out.stderr)
        self.assertFalse(history.exists())
        self.assertFalse((site / ".taste-skill/deal.json").exists())
        self.assertFalse((site / ".taste-skill/build.json").exists())

    @needs_node
    def test_house_is_not_a_taste(self):
        make_pack(self.tmp, "house")
        out = self.run_node("moments.mjs", "pick", "--page", "software", "--taste", "house", "--json")
        self.assertNotEqual(out.returncode, 0, out.stdout)
        self.assertIn("house", out.stderr)

    @needs_node
    def test_own_effect_is_dealt(self):
        add_effect(make_pack(self.tmp, "sample", signature=["effects/pack-fx"]))
        out = self.run_node("effects.mjs", "pick", "--page", "software", "--palette", "light", "--slots", "hero",
                            "--taste", "sample", "--json")
        self.assertEqual(out.returncode, 0, out.stderr)
        picks = json.loads(out.stdout)["picks"]
        self.assertIn("pack-fx", [p["id"] if isinstance(p, dict) else p for p in picks])

    @needs_node
    def test_photo_pick_skips_frames_not_on_disk(self):
        # runs against an empty tastes dir: the library frames are not on disk, so no record may be dealt without them
        out = self.run_node("photos.mjs", "pick", "--trade", "cafe", "--json", "--seed", "s1")
        self.assertEqual(out.returncode, 0, out.stderr)
        records = {p["id"]: p for p in json.loads((TASTE / "library/photos.json").read_text(encoding="utf-8"))["photos"]}
        roots = [TASTE / "assets/photos/img", self.tastes / "house/assets/photos/img"]
        for dealt in json.loads(out.stdout)["photos"]:
            record = records.get(dealt.get("id"))
            for f in (record or {}).get("files") or []:
                name = f["file"].removeprefix("img/")
                self.assertTrue(any((r / name).is_file() for r in roots), f"{dealt['id']}: {name} is not on disk")

    def test_built_in_scenes_are_the_nine(self):
        scenes = TASTE / "assets/scenes"
        folders = {d.name for d in scenes.iterdir() if d.is_dir() and not d.name.startswith("_")}
        self.assertEqual(folders, NINE_SCENES)
        self.assertFalse((TASTE / "assets/objects").exists())


HEAD = '<meta name="taste" content="x">\n<style>:root{--p-action: #3c83f6;}</style>'


@needs_node
class TasteUse(Sandbox):
    def use(self, html, kit=HEAD, signature=("moments/pack-moment",)):
        pack = make_pack(self.tmp, "x", signature=list(signature))
        # This class exercises existing versionless build compatibility.
        (pack / "taste.json").write_text(json.dumps({"name": "x", "signature": list(signature)}), encoding="utf-8")
        script = (
            'const { tasteUse } = await import(process.env.USE_MJS);'
            "console.log(JSON.stringify(tasteUse(JSON.parse(process.env.USE_INPUT))));"
        )
        env = {**os.environ, "TASTE_SKILL_TASTES": str(self.tastes), "USE_MJS": (TASTE / "scripts/taste-use.mjs").as_uri(),
               "USE_INPUT": json.dumps({"html": html, "deal": {"taste": "x"}, "kit": kit})}
        out = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, env=env, timeout=120)
        self.assertEqual(out.returncode, 0, out.stderr)
        found = json.loads(out.stdout)
        for f in found:
            self.assertTrue(f["hard"])
        return found

    @staticmethod
    def page(head=HEAD, body='<section data-moment="pack-moment"></section>'):
        attrs = (
            'data-rhythm="screens" data-heading-align="left" data-reveal="none" '
            'data-fragment-playback="static" data-moment-count="1"'
        )
        return f"<!doctype html><html {attrs}><head>{head}</head><body>{body}</body></html>"

    def test_page_without_the_meta_fails(self):
        found = self.use(self.page(head='<style>:root{--p-action: #3c83f6;}</style>'))
        self.assertIn("taste-missing", [f["check"] for f in found])

    def test_changed_token_fails(self):
        found = self.use(self.page(head='<meta name="taste" content="x">\n<style>:root{--p-action: #ff0000;}</style>'))
        self.assertIn("taste-head", [f["check"] for f in found])

    def test_missing_signature_mount_fails(self):
        found = self.use(self.page(body="<section></section>"))
        self.assertIn("taste-signature", [f["check"] for f in found])

    def test_later_override_of_a_head_token_fails(self):
        override = HEAD + "\n<style>:root{--p-action: #ff0000}</style>"
        found = self.use(self.page(head=override))
        self.assertIn("taste-head", [f["check"] for f in found])

    def test_signature_mount_in_a_template_fails(self):
        found = self.use(self.page(body='<template><section data-moment="pack-moment"></section></template>'))
        self.assertIn("taste-signature", [f["check"] for f in found])

    def test_head_block_that_failed_to_print_fails(self):
        found = self.use(self.page(), kit="")
        self.assertIn("taste-head", [f["check"] for f in found])

    def test_empty_html_is_not_checked(self):
        self.assertEqual(self.use(""), [])

    def test_page_carrying_the_taste_passes(self):
        self.assertEqual(self.use(self.page()), [])


@needs_node
class PackCheck(Sandbox):
    def check(self, name="sample"):
        out = self.run_node("pack.mjs", "check", name)
        last = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else ""
        return out, last

    @staticmethod
    def candidates(pack):
        (pack / "capture").mkdir(exist_ok=True)
        (pack / "capture/candidates.json").write_text(json.dumps([{"id": "c1", "kind": "loop"}]), encoding="utf-8")

    def test_unsettled_candidate_fails(self):
        self.candidates(make_pack(self.tmp, "sample"))
        out, last = self.check()
        self.assertEqual(out.returncode, 1, out.stdout + out.stderr)
        self.assertIn("pack-unsettled", out.stdout)
        self.assertRegex(last, r"^PACK: FAIL \d+$")

    def test_settled_pack_passes(self):
        pack = make_pack(self.tmp, "sample", settled={"c1": "skip: cookie banner"})
        self.candidates(pack)
        out, last = self.check()
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(last, "PACK: PASS")

    def test_own_item_naming_the_source_host_fails(self):
        pack = make_pack(self.tmp, "sample", settled={"c1": "own:moments/pack-moment"})
        self.candidates(pack)
        moment = add_moment(pack)
        (moment / "spec.md").write_text("# pack-moment\n\nTrigger: scroll.\n", encoding="utf-8")
        with open(moment / "moment.js", "a", encoding="utf-8") as f:
            f.write('\nconst remote = "https://example.test/x.js";\n')
        out, _ = self.check()
        self.assertIn("pack-hotlink", out.stdout)

    def test_own_effect_passes(self):
        pack = make_pack(self.tmp, "sample", use_when=["a calm software page"], settled={"c1": "own:effects/pack-fx"})
        self.candidates(pack)
        effect = add_effect(pack)
        (effect / "spec.md").write_text("# pack-fx\n\nTrigger: load.\n", encoding="utf-8")
        out, last = self.check()
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(last, "PACK: PASS")

    def test_signature_with_two_scenes_fails(self):
        pack = make_pack(self.tmp, "sample", signature=["scenes/pack-scene", "scenes/pack-scene-two"])
        add_scene(pack)
        add_scene(pack, "pack-scene-two")
        out, last = self.check()
        self.assertEqual(out.returncode, 1, out.stdout + out.stderr)
        lines = [line for line in out.stdout.splitlines() if "pack-manifest" in line and "signature" in line]
        self.assertTrue(lines, out.stdout)
        self.assertRegex(last, r"^PACK: FAIL \d+$")

    def test_signature_with_a_scene_and_an_effect_fails(self):
        pack = make_pack(self.tmp, "sample", signature=["scenes/pack-scene", "effects/pack-fx"])
        add_scene(pack)
        add_effect(pack)
        out, last = self.check()
        self.assertEqual(out.returncode, 1, out.stdout + out.stderr)
        lines = [line for line in out.stdout.splitlines() if "pack-manifest" in line and "a scene and an effect" in line]
        self.assertTrue(lines, out.stdout)
        self.assertRegex(last, r"^PACK: FAIL \d+$")

    def test_heroes_naming_a_kit_hero_pass(self):
        pack = make_pack(self.tmp, "sample", heroes=["centred"], settled={"c1": "skip: cookie banner"})
        self.candidates(pack)
        out, last = self.check()
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(last, "PACK: PASS")

    def test_unknown_hero_fails(self):
        pack = make_pack(self.tmp, "sample", heroes=["nope"], settled={"c1": "skip: cookie banner"})
        self.candidates(pack)
        out, last = self.check()
        self.assertEqual(out.returncode, 1, out.stdout + out.stderr)
        lines = [line for line in out.stdout.splitlines() if "pack-manifest" in line and "heroes" in line]
        self.assertTrue(lines, out.stdout)
        self.assertRegex(last, r"^PACK: FAIL \d+$")

    def test_house_pack_passes(self):
        make_pack(self.tmp, "house")
        out, last = self.check("house")
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(last, "PACK: PASS")


if __name__ == "__main__":
    unittest.main()
