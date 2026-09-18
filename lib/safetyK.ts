/**
 * Safety factor k is a form value, not a mode lock.
 * Presets, select, and switching to typed Imax must not disable it.
 * If MVA + rated kV are still filled, changing k stays on the capacity path
 * so the next run actually uses the new factor.
 */
export function safetyKKeepsCapacity(args: {
  currentMode: "current" | "capacity";
  transformerMva: number;
  windingRatedKv: number;
}): "current" | "capacity" {
  if (args.transformerMva > 0 && args.windingRatedKv > 0) return "capacity";
  return args.currentMode;
}
