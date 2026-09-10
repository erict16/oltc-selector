import { parseTypeString } from "./orderReplay";

/**
 * Country coefficients for admin list × market.
 * Source: QS/a. Base Price List 2025.xlsx · Coefficient, plus 2026-09
 * Vietnam rule (OLTC 1.1 / OCTC 2.8). First number of A/B pairs.
 * Empty cells are missing — do not invent 1.
 */
export const MARKET_IDS = [
  "list",
  "vietnam",
  "australia",
  "indonesia",
  "malaysia",
  "taiwan",
] as const;

export type MarketId = (typeof MARKET_IDS)[number];

export const MARKET_LABEL_KEY: Record<MarketId, string> = {
  list: "priceList",
  vietnam: "priceMarketVn",
  australia: "priceMarketAu",
  indonesia: "priceMarketId",
  malaysia: "priceMarketMy",
  taiwan: "priceMarketTw",
};

type FamilyCol =
  | "cv"
  | "cm"
  | "cmd"
  | "cv2"
  | "cm2"
  | "shzv"
  | "cz"
  | "wsl"
  | "wg"
  | "hwv";

const COL: Record<FamilyCol, Partial<Record<Exclude<MarketId, "list">, number>>> =
  {
    cv: { vietnam: 1.1, indonesia: 1.1, malaysia: 1.1, taiwan: 1.3 },
    cm: { vietnam: 1.1, indonesia: 1.1, malaysia: 1.1, taiwan: 1.3 },
    cmd: { vietnam: 1.1, indonesia: 1.1, malaysia: 1.1, taiwan: 1.3 },
    cv2: { vietnam: 1.1, australia: 1.3, indonesia: 1.0, malaysia: 1.1, taiwan: 1.3 },
    cm2: { vietnam: 1.1, australia: 1.3, indonesia: 1.0, malaysia: 1.1, taiwan: 1.3 },
    shzv: { vietnam: 1.1, australia: 1.3, indonesia: 1.0, malaysia: 1.1, taiwan: 1.3 },
    cz: { vietnam: 1.1, indonesia: 1.05, malaysia: 1.1, taiwan: 1.3 },
    wsl: { vietnam: 2.8, indonesia: 1.15, malaysia: 1.1, taiwan: 1.3 },
    wg: { vietnam: 2.8, indonesia: 1.2, malaysia: 1.1, taiwan: 1.3 },
    hwv: { vietnam: 1.1, australia: 1.3, indonesia: 1.1, malaysia: 1.1, taiwan: 1.3 },
  };

export function familyColumn(family: string): FamilyCol | null {
  const f = family.toUpperCase();
  if (f === "CV2") return "cv2";
  if (f === "CVT") return "cz";
  if (f === "CM2") return "cm2";
  if (f === "CMD") return "cmd";
  if (f.startsWith("CM")) return "cm";
  if (f.startsWith("SHZV")) return "shzv";
  if (f === "CZ") return "cz";
  if (f === "HWV" || f === "HWDK") return "hwv";
  if (f === "WSL" || f === "WDL") return "wsl";
  if (f === "WG" || f === "WSG") return "wg";
  if (f === "SV" || f.startsWith("CV")) return "cv";
  return null;
}

export type CoeffHit =
  | { found: true; coeff: number; sellRmb: number }
  | { found: false; reason: "unparsed" | "no-family" | "no-coeff" };

export function priceWithCoeff(
  listRmb: number,
  model: string,
  market: MarketId,
): CoeffHit {
  if (!(listRmb > 0)) return { found: false, reason: "no-coeff" };
  if (market === "list") {
    return { found: true, coeff: 1, sellRmb: Math.round(listRmb) };
  }
  const parts = parseTypeString(model);
  if (!parts) return { found: false, reason: "unparsed" };
  const col = familyColumn(parts.family);
  if (!col) return { found: false, reason: "no-family" };
  const coeff = COL[col][market];
  if (coeff == null || !(coeff > 0)) return { found: false, reason: "no-coeff" };
  return {
    found: true,
    coeff,
    sellRmb: Math.round(listRmb * coeff),
  };
}
