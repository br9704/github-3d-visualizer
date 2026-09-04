---
id: 090090fb-34d3-460d-b85d-72d3394576f8
title: "Codebase map refresh"
type: note
project: "3D GitHub Visualizer"
tags:
  - "#note"
  - "#shard"
  - "#ld/living"
  - "#cluster/personal"
status: active
created: "2026-08-17"
updated: "2026-08-19"
---

# Shard — codebase-map-refresh

**Rebuild [[(Note) Source Map]] and [[(Note) Scripts and Harnesses]] from the repo as it
stands.**

## Steps

1. **Safety first.**
   ```bash
   find /Users/brunojaamaa/Desktop/github-3d-visualizer -type f -flags +dataless | wc -l
   ```
   Must be `0`. As of 2026-08-17 it is.

2. **Recount.**
   ```bash
   cd /Users/brunojaamaa/Desktop/github-3d-visualizer
   find . -not -path '*/node_modules/*' -not -path './.git/*' -not -path './dist/*' \
     \( -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.css' \) \
     -exec wc -l {} \; | sort -rn
   ```

3. **Re-read `package.json`.** ⚠️ Confirm the stack rather than assuming it. Three.js, React,
   Vite and Vitest versions all matter here — `vitest` is **pinned to the Vite 5 line** so
   `npm ci` resolves, and bumping it without checking the Vite major breaks CI.

4. **Re-grep the debt.** `grep -rn "TODO\|FIXME\|HACK\|XXX" --include='*.js' --include='*.jsx' src/ api/ scripts/`
   Baseline is **0**.

5. **Check the guard count.** [[(Note) Scripts and Harnesses]] says **11**. Read
   `scripts/guards.mjs` rather than trusting the note — guards are the honesty mechanism and
   a removed one is news.

6. **Update the notes**, editing facts rather than rewriting. Bump `updated:`.

7. **Regenerate [[(Index) Complete File Inventory]]** with the same walk that built it and
   diff against the previous version.

8. **Log it** via `Shards/tools/obsidianlog.mjs` at the hub, op `note-update`.

## Rules

**Read-only in the repo.** ⚠️ **Never open `.env*`.** This project holds a real secret,
`GITHUB_TOKEN`. Record the **name** only.
