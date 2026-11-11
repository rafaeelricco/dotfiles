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
    data = {"name": name, "source": ["https://example.test/"], "use_when": [], "fits": {}, "variants": {},
            "signature": [], "settled": {}}
    data.update(manifest)
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
        self.assertEqual(deal["taste"], "sample")
        mine = [m for m in deal["moments"] if m["id"] == "pack-moment"]
        self.assertEqual(len(mine), 1)
        self.assertEqual(Path(mine[0]["dir"]).resolve(), (pack / "assets/moments/pack-moment").resolve())
        self.assertTrue(mine[0]["dir"].endswith("assets/moments/pack-moment"))
        self.assertIn("tastes/sample/assets/moments/pack-moment/demo.html", stdout)
        lines = [line.strip() for line in stdout.splitlines()]
        taste_lines = [line for line in lines if line.startswith("taste ")]
        self.assertTrue(any("sample" in line and "record.mjs kit sample" in line for line in taste_lines), stdout)
        self.assertFalse([line for line in lines if line.startswith("palette ")])

    @needs_node
    def test_kit_copy_copies_core_and_dealt_only(self):
        add_moment(make_pack(self.tmp, "sample", signature=["moments/pack-moment"]))
        site, _, deal = self.plan("sample")
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        assets = site / "assets"
        self.assertTrue((assets / "system.css").is_file())
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
    def test_signature_spans_the_families(self):
        signature = ["moments/pack-moment", "scenes/pack-scene", "effects/pack-fx", "ui/chat"]
        pack = make_pack(self.tmp, "sample", signature=signature)
        add_moment(pack)
        add_scene(pack)
        add_effect(pack)
        site, _, deal = self.plan("sample")
        self.assertEqual(deal["scene"]["id"], "pack-scene")
        self.assertEqual(deal["effect"]["id"], "pack-fx")
        self.assertIn("pack-moment", [m["id"] for m in deal["moments"]])
        self.assertEqual({(s["family"], s["id"]) for s in deal["signature"]}, {tuple(s.split("/")) for s in signature})
        out = self.run_node("kit-copy.mjs", "--to", "assets", cwd=site)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertTrue((site / "assets/ui/chat/fragment.html").is_file())
        self.assertTrue((site / "assets/scenes/pack-scene/scene.js").is_file())
        self.assertTrue((site / "assets/effects/pack-fx/effect.js").is_file())

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
        make_pack(self.tmp, "x", signature=list(signature))
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
        return f"<!doctype html><html><head>{head}</head><body>{body}</body></html>"

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

    def test_house_pack_passes(self):
        make_pack(self.tmp, "house")
        out, last = self.check("house")
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertEqual(last, "PACK: PASS")


if __name__ == "__main__":
    unittest.main()
