#!/usr/bin/env python3
"""
Backfill <!-- zh --> Chinese content sections for ai-timeline entries.

Rules:
- If entry has body_zh frontmatter but no <!-- zh --> section → append zh section using body_zh
- If entry has no body_zh and no <!-- zh --> → append zh section with [EN] prefixed English body
- Deduplicate frontmatter keys (keep first occurrence)
- --dry-run mode: report only, don't modify files
"""

import argparse
import os
import re
import sys
from pathlib import Path
from collections import OrderedDict

TIMELINE_DIR = Path.home() / "clawd/projects/rexliu-website/src/content/ai-timeline"


def parse_frontmatter(content: str):
    """Parse frontmatter and body from markdown content.
    Returns (frontmatter_str, body_str, frontmatter_dict, has_duplicate_keys)
    """
    if not content.startswith("---"):
        return None, content, {}, False

    # Find the closing ---
    second_fence = content.index("---", 3)
    fm_str = content[3:second_fence].strip()
    body = content[second_fence + 3:].strip()

    # Parse frontmatter lines into ordered dict, detecting duplicates
    fm_dict = OrderedDict()
    has_dupes = False
    for line in fm_str.split("\n"):
        line = line.strip()
        if not line:
            continue
        # Match key: value (handle keys with underscores)
        m = re.match(r'^(\w[\w_]*):\s*(.*)', line)
        if m:
            key = m.group(1)
            val = m.group(2)
            if key in fm_dict:
                has_dupes = True
                # Keep first occurrence
            else:
                fm_dict[key] = val

    return fm_str, body, fm_dict, has_dupes


def rebuild_frontmatter(fm_dict: OrderedDict) -> str:
    """Rebuild frontmatter string from dict."""
    lines = []
    for key, val in fm_dict.items():
        lines.append(f"{key}: {val}")
    return "\n".join(lines)


def extract_body_zh_value(fm_dict: OrderedDict) -> str | None:
    """Extract body_zh value from frontmatter, handling quoted strings."""
    val = fm_dict.get("body_zh")
    if val is None:
        return None
    # Strip surrounding quotes
    val = val.strip()
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1]
    # Unescape
    val = val.replace('\\"', '"').replace("\\'", "'")
    return val if val else None


def process_file(filepath: Path, dry_run: bool = False) -> dict:
    """Process a single timeline entry file.
    Returns stats dict: {action: 'skipped'|'added_from_body_zh'|'added_en_placeholder'|'deduped', ...}
    """
    content = filepath.read_text(encoding="utf-8")
    result = {"file": filepath.name, "action": "skipped", "deduped": False}

    # Check if already has <!-- zh -->
    has_zh_section = "<!-- zh -->" in content

    # Parse frontmatter
    fm_str, body, fm_dict, has_dupes = parse_frontmatter(content)

    if fm_str is None:
        return result

    needs_write = False
    new_content = content

    # Step 1: Deduplicate frontmatter if needed
    if has_dupes:
        result["deduped"] = True
        new_fm = rebuild_frontmatter(fm_dict)
        new_content = f"---\n{new_fm}\n---\n{body}"
        if body:
            new_content = f"---\n{new_fm}\n---\n\n{body}"
        needs_write = True
        # Re-parse body from new content
        _, body, _, _ = parse_frontmatter(new_content)

    # Step 2: Add <!-- zh --> section if missing
    if not has_zh_section:
        body_zh = extract_body_zh_value(fm_dict)

        if body_zh:
            # Use body_zh from frontmatter
            zh_section = f"\n\n<!-- zh -->\n\n{body_zh}"
            result["action"] = "added_from_body_zh"
        else:
            # Extract English body (everything after frontmatter, before any <!-- tags)
            en_body = body.strip()
            if en_body:
                zh_section = f"\n\n<!-- zh -->\n\n[EN] {en_body}"
                result["action"] = "added_en_placeholder"
            else:
                # No body at all
                return result

        new_content = new_content.rstrip() + zh_section + "\n"
        needs_write = True

    if needs_write and not dry_run:
        filepath.write_text(new_content, encoding="utf-8")

    if not needs_write:
        result["action"] = "skipped"

    return result


def main():
    parser = argparse.ArgumentParser(description="Backfill zh content for ai-timeline entries")
    parser.add_argument("--dry-run", action="store_true", help="Report only, don't modify files")
    parser.add_argument("--dir", type=str, default=str(TIMELINE_DIR), help="Timeline directory")
    args = parser.parse_args()

    timeline_dir = Path(args.dir)
    if not timeline_dir.exists():
        print(f"Error: Directory {timeline_dir} does not exist")
        sys.exit(1)

    md_files = sorted(timeline_dir.glob("*.md"))
    print(f"Scanning {len(md_files)} files in {timeline_dir}")
    if args.dry_run:
        print("=== DRY RUN MODE ===\n")

    stats = {"added_from_body_zh": 0, "added_en_placeholder": 0, "skipped": 0, "deduped": 0, "errors": 0}
    
    for f in md_files:
        try:
            result = process_file(f, dry_run=args.dry_run)
            action = result["action"]
            stats[action] = stats.get(action, 0) + 1
            if result["deduped"]:
                stats["deduped"] += 1

            if action != "skipped" or result["deduped"]:
                prefix = "[DRY] " if args.dry_run else ""
                parts = [f"{prefix}{result['file']}: {action}"]
                if result["deduped"]:
                    parts.append("(deduped frontmatter)")
                print(" ".join(parts))
        except Exception as e:
            stats["errors"] += 1
            print(f"ERROR {f.name}: {e}")

    print(f"\n{'=== DRY RUN ' if args.dry_run else '=== '}SUMMARY ===")
    print(f"  Added from body_zh: {stats['added_from_body_zh']}")
    print(f"  Added EN placeholder: {stats['added_en_placeholder']}")
    print(f"  Skipped (already had zh): {stats['skipped']}")
    print(f"  Deduped frontmatter: {stats['deduped']}")
    print(f"  Errors: {stats['errors']}")
    print(f"  Total files: {len(md_files)}")


if __name__ == "__main__":
    main()
