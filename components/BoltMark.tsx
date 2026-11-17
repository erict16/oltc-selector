import { useId } from "react";

/** The app's mark: a yellow lightning bolt, the same on every system
 *  (2026-11-17 Eric: drawn for the app, close to Apple's look; the ⚡ emoji
 *  showed Microsoft's bolt on Windows). Same shape as app/icon.svg. */
export function BoltMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-f`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#FFE55C" />
          <stop offset="0.55" stopColor="#FFCA1F" />
          <stop offset="1" stopColor="#FFAA00" />
        </linearGradient>
      </defs>
      <path
        d="M12.6 2.2h9.1l-4.3 10.4h7.9L11.2 30.2l3.4-12.6H6.9z"
        fill={`url(#${id}-f)`}
        stroke="#F09A00"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
