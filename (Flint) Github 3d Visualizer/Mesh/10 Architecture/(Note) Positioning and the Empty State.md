---
id: f82b6ed8-bca9-4454-a421-788c83574d25
title: "Positioning and the Empty State"
type: note
project: "3D GitHub Visualizer"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#stack/threejs"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/src/utils/positioning.js"
created: "2026-08-17"
updated: "2026-08-19"
---

# Positioning and the Empty State

Two problems that look cosmetic and are not.

## Positioning: power-law data breaks linear mapping

**Stars and forks are power-law distributed.** One repository with 60,000 stars and ninety
under fifty is the *normal* shape of a profile, not an edge case.

A linear min-max map collapses almost every node onto the same coordinate. The universe
renders as **one overlapping mass with a couple of outliers stranded far away** — which
looks like a rendering bug and is actually a statistics bug.

**The fix is rank mapping**, which is distribution-free:

| Axis | Encodes | Mapped by |
|---|---|---|
| X | repository age | rank |
| Y | stars | rank |
| Z | forks | rank |

Then a **deterministic relaxation pass** separates anything still closer than the sum of its
radii. Deterministic matters: the same profile must produce the same universe, or the
scene-graph interchange format cannot round-trip.

Radius scales with the **square root** of star count. ⚠️ The hub note says
**logarithmically**. It is √, in `src/utils/positioning.js` (**184** lines) and asserted by
`tests/positioning.test.mjs` (**10** tests: axis spread on power-law data, separation,
determinism).

## The empty state is the product

**A visitor who never types a username is the majority case**, and this app used to show
them a blank white page.

On cold load, **before any network request**, a seeded procedural generator streams **88**
uncoloured placeholder spheres into a drifting galaxy. `src/scene/ambientGalaxy.js`.

| Property | Why |
|---|---|
| **Seeded** | deterministic, so the hero recording and the screenshots reproduce |
| **No network call** | it **can never rate-limit**, and it works offline |
| **Uncoloured** | ⚠️ language colour carries meaning here. **Decoration must not borrow it** |
| Dims to **25%** on first keystroke | it gets out of the way before it dissolves |

That last row is the sharpest constraint in the project. The obvious move — make the ambient
galaxy colourful and attractive — would have made the real data unreadable, because a reader
could no longer tell whether a colour meant a language or meant nothing.

## The bug the colour map hid

`"C++".toLowerCase()` is `c++`. The colour map's key is `cpp`. So **C++ and C# repositories
fell through to the grey "Other" bucket** — and nobody noticed for months, because

> a grey sphere among grey spheres reads as data, not as a bug.

Found by the first test run. `tests/scene.test.mjs` (**22** tests) now covers language
colours and codes, easing, the seeded galaxy and liveness.

⚠️ **Three aliases are still inert.** `F#`, `Objective-C` and `Shell` map to keys with **no
colour defined**, so they render grey despite appearing in the alias table. This is a live
defect, disclosed in the README, and it is the same class as the C++ bug.
