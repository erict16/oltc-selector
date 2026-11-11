"use client";

type Opt = { value: string; label: string };

const controlClass = "row-control";

/**
 * The insulation-row menus. A native <select> since 2026-11-07: the custom
 * up-opening list did not take arrow keys, stayed open on Tab and hid the
 * value from screen readers. Browsers keep native menus on screen.
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
    <select
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
    </select>
  );
}
