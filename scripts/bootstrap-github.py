#!/usr/bin/env python3
"""Idempotently create labels, milestones, and issues from .github/ISSUE_SEED/.

Usage:
    python3 scripts/bootstrap-github.py [--dry-run]

- Labels and milestones are upserted (safe to re-run).
- Issues are created once per seed slug; created numbers are recorded in
  .github/.issue-map.json (commit that file after running).
- Second pass: seeds with `depends_on` get a "Blocked by" section appended
  to the issue body with real #N references.

Requires: gh (authenticated), git remote `origin` pointing at the repo.
"""

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

# GitHub secondary rate limits throttle rapid content creation.
CREATE_DELAY_SECONDS = 1.5

ROOT = Path(__file__).resolve().parent.parent
SEED_DIR = ROOT / ".github" / "ISSUE_SEED"
MAP_FILE = ROOT / ".github" / ".issue-map.json"

LABELS = [
    ("phase:0", "1d76db", "PLAN.md Phase 0 — Scaffold"),
    ("phase:1", "1d76db", "PLAN.md Phase 1 — Portable core"),
    ("phase:2", "1d76db", "PLAN.md Phase 2 — Toolbar MVP"),
    ("phase:3", "1d76db", "PLAN.md Phase 3 — Advanced annotations"),
    ("phase:4", "1d76db", "PLAN.md Phase 4 — Server sync + MCP"),
    ("phase:5", "1d76db", "PLAN.md Phase 5 — Parity audit + release"),
    ("phase:6", "0e5a8a", "PLAN.md Phase 6 — Design mode"),
    ("phase:7", "0e5a8a", "PLAN.md Phase 7 — Component detection"),
    ("type:infra", "c2e0c6", "Tooling, CI, repo plumbing"),
    ("type:port", "5319e7", "Verbatim/adapted port of an upstream file"),
    ("type:feature", "a2eeef", "Svelte rewrite of upstream behavior"),
    ("type:test", "bfd4f2", "Test-only work incl. compat fixtures"),
    ("type:compat", "b60205", "Output/schema/protocol deviates from upstream"),
    ("type:docs", "0075ca", "Documentation"),
    ("type:research", "d4c5f9", "Spike; written conclusion is the deliverable"),
    ("agent:ok", "0e8a16", "Safe for an agent to execute end-to-end"),
    ("agent:needs-human", "d93f0b", "Requires human action (outreach, publish)"),
    ("status:blocked", "fbca04", "Blocked outside the dependency graph"),
]

MILESTONES = [
    "Phase 0 — Scaffold",
    "Phase 1 — Portable core",
    "Phase 2 — Toolbar MVP",
    "Phase 3 — Advanced annotations",
    "Phase 4 — Server sync + MCP",
    "Phase 5 — Parity audit + release",
    "Phase 6 — Design mode",
    "Phase 7 — Component detection",
]

BLOCKED_BY_HEADER = "## Blocked by"


def run(cmd: list[str], dry: bool = False, capture: bool = True) -> str:
    if dry:
        print("DRY:", " ".join(cmd))
        return ""
    res = subprocess.run(cmd, capture_output=capture, text=True)
    if res.returncode != 0:
        sys.exit(f"command failed: {' '.join(cmd)}\n{res.stderr}")
    return (res.stdout or "").strip()


def parse_seed(path: Path) -> dict:
    text = path.read_text()
    m = re.match(r"\A---\n(.*?)\n---\n(.*)\Z", text, re.DOTALL)
    if not m:
        sys.exit(f"{path.name}: missing frontmatter")
    meta: dict = {"slug": path.stem, "body": m.group(2).strip()}
    for line in m.group(1).splitlines():
        if not line.strip():
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if key in ("labels", "depends_on"):
            meta[key] = [v.strip() for v in value.split(",") if v.strip()]
        else:
            meta[key] = value
    for required in ("title", "labels", "milestone"):
        if not meta.get(required):
            sys.exit(f"{path.name}: missing `{required}` in frontmatter")
    if meta["milestone"] not in MILESTONES:
        sys.exit(f"{path.name}: unknown milestone {meta['milestone']!r}")
    known = {name for name, _, _ in LABELS}
    for label in meta["labels"]:
        if label not in known:
            sys.exit(f"{path.name}: unknown label {label!r}")
    return meta


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    dry = args.dry_run

    repo = run(["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"])
    print(f"repo: {repo}")

    seeds = [parse_seed(p) for p in sorted(SEED_DIR.glob("*.md")) if p.name != "README.md"]
    slugs = {s["slug"] for s in seeds}
    for seed in seeds:
        for dep in seed.get("depends_on", []):
            if dep not in slugs:
                sys.exit(f"{seed['slug']}: depends_on unknown slug {dep!r}")
    print(f"seeds: {len(seeds)}")

    print("— labels")
    for name, color, desc in LABELS:
        run(["gh", "label", "create", name, "--color", color,
             "--description", desc, "--force", "--repo", repo], dry)

    print("— milestones")
    existing = json.loads(run(["gh", "api", f"repos/{repo}/milestones?state=all&per_page=100"]) or "[]")
    have = {m["title"] for m in existing}
    for title in MILESTONES:
        if title not in have:
            run(["gh", "api", f"repos/{repo}/milestones", "-f", f"title={title}"], dry)

    issue_map: dict = json.loads(MAP_FILE.read_text()) if MAP_FILE.exists() else {}

    print("— issues (pass 1: create)")
    for seed in seeds:
        if seed["slug"] in issue_map:
            continue
        cmd = ["gh", "issue", "create", "--repo", repo,
               "--title", seed["title"], "--body", seed["body"],
               "--milestone", seed["milestone"]]
        for label in seed["labels"]:
            cmd += ["--label", label]
        url = run(cmd, dry)
        if not dry:
            number = int(url.rstrip("/").rsplit("/", 1)[-1])
            issue_map[seed["slug"]] = {"number": number, "title": seed["title"]}
            MAP_FILE.write_text(json.dumps(issue_map, indent=2) + "\n")
            print(f"  #{number}  {seed['slug']}")
            time.sleep(CREATE_DELAY_SECONDS)

    print("— issues (pass 2: dependencies)")
    for seed in seeds:
        deps = seed.get("depends_on", [])
        if not deps or seed["slug"] not in issue_map:
            continue
        lines = [f"- #{issue_map[d]['number']} {issue_map[d]['title']}"
                 for d in deps if d in issue_map]
        if not lines:
            continue
        body = seed["body"] + f"\n\n{BLOCKED_BY_HEADER}\n\n" + "\n".join(lines) + "\n"
        run(["gh", "issue", "edit", str(issue_map[seed["slug"]]["number"]),
             "--repo", repo, "--body", body], dry)
        if not dry:
            time.sleep(CREATE_DELAY_SECONDS)

    print("done. Commit .github/.issue-map.json if it changed.")


if __name__ == "__main__":
    main()
