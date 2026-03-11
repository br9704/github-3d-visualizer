# TASK: Verify & Fix This Project

You are auditing the 3D GitHub Visualizer for production readiness.

## Steps
1. Read MASTER_PLAN.md and CLAUDE.md to understand the spec
2. Read all source files in src/ and understand the codebase
3. Run `npm install` then `npm run build` — fix any errors
4. Check every feature works against the spec
5. Verify white/grey design system (#ffffff, #e5e7eb, #6b7280, #374151, #1a1a1a) — no blue/purple anywhere
6. Check all imports resolve, no dead code, no console.log spam
7. Verify responsive breakpoints (480/768/1024/1920)
8. Check JSDoc comments on all exported functions
9. Fix anything broken — commit each fix separately with clear messages
10. Run `npm run build` again to confirm clean build

## Output
Write VERIFICATION_REPORT.md with all findings + fixes applied.

When completely finished, run:
```
openclaw system event --text "Done: 3D Visualizer verified and fixed" --mode now
```
