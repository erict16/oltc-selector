"use client";

import { MenuSelect } from "@/components/selector/MenuSelect";

type Opt = { value: string; label: string };

const controlClass = "row-control";

/**
 * The insulation-row menus. The list opens above the control when there is
 * no room under it (MenuSelect).
 */
export function UpSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Opt[];
}) {
  return (
    <MenuSelect
      aria-label={label}
      className={controlClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value || "__empty"} value={o.value}>
          {o.label}
        </option>
      ))}
    </MenuSelect>
  );
}
