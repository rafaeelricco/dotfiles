#!/usr/bin/env python3
"""Install this repo's CLAUDE.md into ~/.claude/CLAUDE.md with a backup."""

from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen


RAW_CLAUDE_MD_URL = (
    "https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/.claude/CLAUDE.md"
)
DEFAULT_DEST = Path.home() / ".claude" / "CLAUDE.md"


def timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def read_content(source_file: Path | None, url: str) -> str:
    if source_file is not None:
        return source_file.read_text()

    script_path = Path(__file__)
    if script_path.name != "<stdin>":
        local_source = script_path.resolve().parents[1] / ".claude" / "CLAUDE.md"
        if local_source.exists():
            return local_source.read_text()

    with urlopen(url) as response:
        return response.read().decode("utf-8")


def backup_existing(dest: Path) -> Path:
    backup = dest.with_name(f"CLAUDE.md.backup-{timestamp()}")
    if dest.exists():
        shutil.copy2(dest, backup, follow_symlinks=True)
        dest.unlink()
        return backup

    dest.rename(backup)
    return backup


def install(content: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists() or dest.is_symlink():
        try:
            current = dest.read_text()
        except OSError:
            current = ""

        if current == content:
            print(f"{dest} already up to date")
            return

        backup = backup_existing(dest)
        print(f"Backed up existing CLAUDE.md to {backup}")

    dest.write_text(content)
    print(f"Installed CLAUDE.md to {dest}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install Rafael Ricco's CLAUDE.md into Claude Code's global instructions."
    )
    parser.add_argument(
        "--source-file",
        type=Path,
        help="Read CLAUDE.md content from this local file instead of the default source.",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=DEFAULT_DEST,
        help=f"Destination file. Defaults to {DEFAULT_DEST}.",
    )
    parser.add_argument(
        "--url",
        default=RAW_CLAUDE_MD_URL,
        help="Raw GitHub URL used when no local source file is available.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    content = read_content(args.source_file, args.url)
    install(content, args.dest)


if __name__ == "__main__":
    main()
