---
name: "Github 3d Visualizer"
---

# Github 3d Visualizer

A **codebase reference** — a pointer to a codebase that lives outside this Flint. The actual filesystem path is recorded per-machine in `.flint/references.json` (gitignored).

- Resolve to absolute path: `flint resolve codebase Github 3d Visualizer`
  - Git repositories include a live `Worktrees:` block from `git worktree list`.
- Fulfill (first time on a new machine): `flint fulfill codebase Github 3d Visualizer <path>`
- Manage git worktrees: `flint worktree list Github 3d Visualizer`, `flint worktree add Github 3d Visualizer <suffix>`, `flint worktree remove Github 3d Visualizer <branch|suffix>`
- Worktree branches use `<machine-name>-wt-<suffix>`, checked out at the sibling folder `<repo>-wt-<suffix>`; configure the prefix with `flint config machine-name <name>`.
