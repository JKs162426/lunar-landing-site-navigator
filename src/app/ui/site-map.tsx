import { SITES } from "@/lib/sites";
import { displayName } from "./format";

// Polar view of the south pole: distance from centre = degrees from the pole,
// angle = longitude (0° up, 90°E to the right, as in USGS south polar maps).
const SIZE = 260;
const C = SIZE / 2;
const MAX_COLAT = 8; // show down to -82°
const R = C - 24;

// Hand-placed labels so the close Malapert/Haworth pair does not overlap.
const LABEL: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  shackleton_rim: { dx: 8, dy: 3, anchor: "start" },
  malapert_candidate: { dx: 8, dy: 3, anchor: "start" },
  haworth_candidate: { dx: -8, dy: 3, anchor: "end" },
  peak_near_cabeus_b_candidate: { dx: 0, dy: 16, anchor: "middle" },
};

function project(latDeg: number, lonDeg: number) {
  const r = ((90 + latDeg) / MAX_COLAT) * R;
  const a = (lonDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

const small = { fill: "var(--muted)", fontSize: 8, fontFamily: "var(--font-mono)" } as const;

export function SiteMap({ selectedIds }: { selectedIds: readonly string[] }) {
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-65"
        role="img"
        aria-label="Map of the lunar south pole with the candidate sites"
      >
        {[2, 4, 6, 8].map((colat) => (
          <circle
            key={colat}
            cx={C}
            cy={C}
            r={(colat / MAX_COLAT) * R}
            fill="none"
            stroke="var(--line)"
            strokeDasharray={colat === MAX_COLAT ? undefined : "2 3"}
          />
        ))}
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--line)" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--line)" />

        <text {...small} x={C} y={C - R - 6} textAnchor="middle">
          0°
        </text>
        <text {...small} x={C + R + 4} y={C + 3}>
          90°E
        </text>
        <text {...small} x={C - R - 4} y={C + 3} textAnchor="end">
          90°W
        </text>
        {[4, 8].map((colat) => (
          <text key={colat} {...small} x={C + 3} y={C + (colat / MAX_COLAT) * R - 3}>
            −{90 - colat}°
          </text>
        ))}

        {SITES.map((s) => {
          const { x, y } = project(s.latDeg, s.lonDeg);
          const on = selectedIds.includes(s.id);
          const label = LABEL[s.id] ?? { dx: 8, dy: 3, anchor: "start" };
          return (
            <g key={s.id}>
              <circle
                cx={x}
                cy={y}
                r={on ? 4.5 : 3.5}
                fill={on ? "var(--regolith)" : "var(--space)"}
                stroke={on ? "var(--regolith)" : "var(--muted)"}
              />
              <text
                x={x + label.dx}
                y={y + label.dy}
                textAnchor={label.anchor}
                fill={on ? "var(--regolith)" : "var(--muted)"}
                fontSize="10"
                fontFamily="var(--font-sans)"
              >
                {displayName(s)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">
        South pole down to −82° latitude. Filled dots are the sites being compared.
      </figcaption>
    </figure>
  );
}
