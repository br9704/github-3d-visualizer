---
id: 809a0b14-2e5c-47a6-aaed-345aede44951
title: "Vault audit"
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

# Shard — vault-audit

**Rescan the repo, diff it against [[(Index) Complete File Inventory]], report the
difference.**

## 1. Hazard check

```bash
find /Users/brunojaamaa/Desktop/github-3d-visualizer -type f -flags +dataless | wc -l
```

Must be `0`. Reading a dataless file hangs **indefinitely**.

## 2. Rescan and diff

```bash
cd /Users/brunojaamaa/Desktop/github-3d-visualizer
find . -type f -not -path '*/node_modules/*' -not -path './.git/*' -not -path './dist/*' \
  -not -name '.DS_Store' -not -path './(Flint) Github 3d Visualizer/*' \
  | sed 's|^\./||' | sort > /tmp/now.txt
```

Diff against the inventory's path column. **Every folder on disk must appear as a row or be
named as excluded with a reason.**

## 3. Verify the vault itself

Assert programmatically:

- **0** broken wikilinks — every target resolves to a file in this vault
- **0** orphan notes
- all frontmatter parses as YAML, and **every `tags:` list item is quoted**
- `status:` ∈ `active | dormant | shipped | archived`
- `health:` in [[(Report) Project Summary]] ∈ `green | amber | red`
- every `id:` is a lowercase UUID, used once

The hub also ships `Shards/tools/lint-frontmatter.mjs` — run it with `--all`.

## 4. Re-check the public claim

This is the check this vault exists for.

```bash
gh repo view br9704/github-3d-visualizer --json homepageUrl,description
```

Then fetch `https://brunojaamaa.dev/projects/3d-github-visualizer` and compare its numbers
against `docs/perf.json`, `docs/firstpaint.json` and `PROJECT.json`.

⚠️ **Two specific claims are known accuracy risks in this project's history** and must be
checked every time:

1. **Any frames-per-second figure.** The project stopped quoting fps on purpose. If one has
   reappeared on the site, it is a defect.
2. **Any bundle total that implies total JS shrank.** It did not — it went **up**, 223.81 →
   225.01 kB gzip. Only the eager payload shrank.

Both still survive in the hub note at
`/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/Notes/Projects/(Note) 3D GitHub Visualizer.md`,
along with four more errors. When they are fixed, strike them from
[[(Report) Gaps & Questions]] rather than leaving permanent noise.

## 5. Re-check the guards

`npm run guards` is the repo's own honesty mechanism, **11** checks. A guard that has been
removed or weakened is a finding for [[(Report) Gaps & Questions]], not a neutral change.

## 6. Report

Write results into [[(Report) Build Log]] with a date, and log a `verify` op.
