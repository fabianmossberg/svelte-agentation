# Compat fixtures

These files prove our markdown output is **byte-for-byte identical** to the
pinned upstream's at all four detail levels (compact / standard / detailed /
forensic). This is the compatibility contract from `CLAUDE.md` non-negotiable #1,
made executable.

## Files

| Path | What |
|---|---|
| `annotations.json` | The committed `Annotation[]` inputs: an empty array, a minimal annotation, a maximal set exercising every field the generator reads (selectedText under/over the 30-char compact cutoff, boundingBox, nearbyText with/without selectedText to hit the suppression rule, cssClasses, computedStyles, accessibility, nearbyElements, fullPath, isMultiSelect, and the React-only sourceFile/reactComponents), a `drag-multiselect` case (drag-rectangle group + area selection), and a `cmdshift-multiselect` case (a cmd+shift+click annotation carrying `elementBoundingBoxes` — a field the generator never reads, proving it serializes identically regardless). |
| `output/<case>.<level>.md` | Generated markdown — one file per case × detail level. Each carries a header comment and the never-hand-edit rule. |

## Never hand-edit these (CONTRIBUTING.md)

`output/*.md` is **generated** from the pinned upstream source by script. If
`tests/compat.test.ts` fails against one of these files, the bug is a
`type:compat` divergence in our port (`src/lib/utils/generate-output.ts`) — fix
the port, **never** the fixture.

## Regenerating

Only after a deliberate upstream bump (see `UPSTREAM.md`):

```sh
pnpm fixtures:generate
```

The generator (`scripts/generate-fixtures.ts`) runs upstream's own
`generate-output.ts` via `tsx` against the baseline in `upstream/`, in Node
(no `window`), so generation is deterministic — running it twice produces zero
git diff.
