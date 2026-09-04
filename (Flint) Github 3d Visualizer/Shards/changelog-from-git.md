---
id: a5ce340c-365b-4ea5-8eb2-13afc3edf0b7
title: "Changelog from git"
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

# Shard — changelog-from-git

**Rebuild [[(Note) Git History]] from the repository log.**

## Read-only git only

`log` · `show` · `status` · `branch` · `diff`. **Never** commit, push, stash, checkout,
clean, reset, or `gh repo` anything.

⚠️ **`main` here is the production branch.** A push releases to Vercel. That makes any write
operation in this repo higher-consequence than in a normal one.

## Steps

```bash
cd /Users/brunojaamaa/Desktop/github-3d-visualizer
git branch -a
git status --short
git log -30 --pretty='%h|%ad|%s' --date=short
git log --oneline | wc -l
git log origin/main..HEAD --oneline | wc -l
git log --format='%an' | sort | uniq -c | sort -rn     # authorship split
```

That last command is the one that matters here: **48 of 72 commits are attributed to
`OpenClaw Bot` and `Claude Code`**, and rewriting that is the single remaining owner-gated
item (S11). Re-run it and report the current split rather than copying the old number.

## Also read `CHANGELOG.md`

Unlike the other two projects in this cluster, this repo keeps a real `CHANGELOG.md` (**149**
lines). Reconcile it against `git log` — a release recorded in one and not the other is a
finding.

## Then

Bump `updated:` on [[(Note) Git History]] and [[(Report) Project Summary]]
(`last_commit:`), and log a `note-update` op.
