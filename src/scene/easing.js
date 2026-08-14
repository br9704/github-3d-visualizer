/**
 * Easing — ease-out and linear only.
 *
 * The design system forbids bounce and spring, and MOTION.md is explicit that
 * entrance spheres overshoot "by nothing". The previous implementation used
 * easeOutBack, which overshoots by ~10% and reads as a pop.
 *
 * Nothing here exceeds 600ms in use; the 3D scene's continuous drift is
 * ambient rather than transitional and is not governed by these curves.
 */

/** Standard ease-out. The default for anything entering. */
export function easeOutCubic(t) {
  const c = clamp01(t)
  return 1 - Math.pow(1 - c, 3)
}

/** Softer ease-out, for camera moves — a linear camera reads as robotic. */
export function easeOutQuad(t) {
  const c = clamp01(t)
  return 1 - (1 - c) * (1 - c)
}

/** Used for cross-fades, which the spec pins to linear. */
export function linear(t) {
  return clamp01(t)
}

export function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Frame-rate independent approach toward a target. */
export function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt)
}
