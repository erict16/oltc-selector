export interface SkillVariant {
  id: string;
  src: string;
  out: string;
  files: string[];
}
export declare const VARIANTS: SkillVariant[];
export declare function buildEntries(
  v: SkillVariant,
): { name: string; data: Buffer }[];
export declare function buildZip(
  entries: { name: string; data: Buffer }[],
): Buffer;
