export const MORPH_MS = 360;

export type MorphPhase = "open" | "closed" | "toChip" | "toBubble";

export function morphIntent(
  phase: MorphPhase,
  action: "close" | "open",
): "startClose" | "startOpen" | "reverse" | "ignore" {
  if (action === "close") {
    if (phase === "open") return "startClose";
    if (phase === "toBubble") return "reverse";
    return "ignore";
  }
  if (phase === "closed") return "startOpen";
  if (phase === "toChip") return "reverse";
  return "ignore";
}

export type Box = { left: number; top: number; width: number; height: number };

export function rectFlip(from: Box, to: Box) {
  return {
    dx: to.left - from.left,
    dy: to.top - from.top,
    sx: to.width / from.width,
    sy: to.height / from.height,
  };
}

export function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export type Flip = { dx: number; dy: number; sx: number; sy: number };

export function morphAt(k: number, g: Flip) {
  const sxi = 1 + k * (g.sx - 1);
  const syi = 1 + k * (g.sy - 1);
  return {
    sxi,
    syi,
    invX: 1 / sxi,
    invY: 1 / syi,
    tx: k * g.dx,
    ty: k * g.dy,
    radius: 16 + k * (20 / syi - 16),
    xOpacity: 1 - Math.min(1, k / 0.25),
  };
}

export function applyMorph(
  bubble: HTMLElement,
  inner: HTMLElement | null,
  xBtn: HTMLElement | null,
  k: number,
  g: Flip,
) {
  const m = morphAt(k, g);
  bubble.style.transformOrigin = "top left";
  bubble.style.transform = `translate(${m.tx}px, ${m.ty}px) scale(${m.sxi}, ${m.syi})`;
  bubble.style.borderRadius = `${m.radius}px`;
  if (inner) {
    inner.style.transformOrigin = "top left";
    inner.style.transform = `scale(${m.invX}, ${m.invY})`;
  }
  if (xBtn) xBtn.style.opacity = String(m.xOpacity);
}
