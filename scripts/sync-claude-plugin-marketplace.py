#!/usr/bin/env python3
"""Generate a Claude Code plugin marketplace from .claude/skills."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SKILLS_DIR = ROOT / ".claude" / "skills"
MARKETPLACE_DIR = ROOT / ".claude-plugin"
MARKETPLACE_FILE = MARKETPLACE_DIR / "marketplace.json"
PLUGINS_DIR = ROOT / "plugins"

MARKETPLACE_NAME = "r1cco-skills"
OWNER_NAME = "Rafael Ricco"
REPOSITORY = "https://github.com/r1cco/dotfiles"


def unquote(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def extract_frontmatter(skill_md: Path) -> dict[str, str]:
    content = skill_md.read_text()
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        raise ValueError(f"{skill_md} does not start with YAML frontmatter")

    frontmatter = match.group(1).splitlines()
    fields: dict[str, str] = {}
    index = 0

    while index < len(frontmatter):
        line = frontmatter[index]
        field_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if not field_match:
            index += 1
            continue

        key, value = field_match.groups()
        if value in {">", ">-", ">|", "|", "|-"}:
            index += 1
            parts: list[str] = []
            while index < len(frontmatter):
                continuation = frontmatter[index]
                if re.match(r"^[A-Za-z0-9_-]+:\s*", continuation):
                    break
                if continuation.startswith((" ", "\t")):
                    stripped = continuation.strip()
                    if stripped:
                        parts.append(stripped)
                index += 1
            fields[key] = " ".join(parts).strip()
            continue

        fields[key] = unquote(value)
        index += 1

    if not fields.get("name"):
        raise ValueError(f"{skill_md} is missing frontmatter name")
    if not fields.get("description"):
        raise ValueError(f"{skill_md} is missing frontmatter description")

    return fields


def display_name(skill_name: str) -> str:
    acronyms = {
        "api": "API",
        "codex": "Codex",
        "doc": "Doc",
        "docs": "Docs",
        "e2e": "E2E",
        "gh": "GitHub",
        "pr": "PR",
        "ui": "UI",
        "ux": "UX",
        "yml": "YML",
    }
    words = [acronyms.get(part, part.capitalize()) for part in skill_name.split("-")]
    return " ".join(words)


def plugin_manifest(skill_name: str, description: str) -> dict[str, object]:
    return {
        "name": skill_name,
        "displayName": f"{display_name(skill_name)} Skill",
        "description": description,
        "author": {"name": OWNER_NAME},
        "repository": REPOSITORY,
    }


def marketplace_entry(skill_name: str, description: str) -> dict[str, object]:
    return {
        "name": skill_name,
        "source": f"./plugins/{skill_name}",
        "description": description,
        "author": {"name": OWNER_NAME},
        "repository": REPOSITORY,
        "category": "skills",
        "tags": ["skill"],
    }


def write_json(path: Path, data: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    skill_dirs = sorted(
        path
        for path in SOURCE_SKILLS_DIR.iterdir()
        if path.is_dir() and (path / "SKILL.md").exists()
    )

    if not skill_dirs:
        raise SystemExit(f"No skills found in {SOURCE_SKILLS_DIR}")

    if PLUGINS_DIR.exists():
        shutil.rmtree(PLUGINS_DIR)
    PLUGINS_DIR.mkdir(parents=True)

    marketplace_plugins: list[dict[str, object]] = []

    for source_skill_dir in skill_dirs:
        frontmatter = extract_frontmatter(source_skill_dir / "SKILL.md")
        skill_name = frontmatter["name"]
        description = frontmatter["description"]

        if skill_name != source_skill_dir.name:
            raise ValueError(
                f"Skill folder {source_skill_dir.name} does not match name {skill_name}"
            )

        plugin_dir = PLUGINS_DIR / skill_name
        plugin_skill_dir = plugin_dir / "skills" / skill_name

        shutil.copytree(source_skill_dir, plugin_skill_dir, symlinks=False)
        write_json(
            plugin_dir / ".claude-plugin" / "plugin.json",
            plugin_manifest(skill_name, description),
        )
        marketplace_plugins.append(marketplace_entry(skill_name, description))

    write_json(
        MARKETPLACE_FILE,
        {
            "name": MARKETPLACE_NAME,
            "owner": {"name": OWNER_NAME},
            "description": "Rafael Ricco's Claude Code skills packaged for individual installation.",
            "plugins": marketplace_plugins,
        },
    )

    print(f"Generated {len(marketplace_plugins)} Claude Code skill plugins.")


if __name__ == "__main__":
    main()
