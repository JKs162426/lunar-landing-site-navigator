"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AltitudeSample, VisibilityWindow } from "@/lib/types";
import { utcDate, utcDateTime } from "./format";

type Props = {
  samples: readonly AltitudeSample[];
  sunWindows: readonly VisibilityWindow[];
  earthWindows: readonly VisibilityWindow[];
  minSunAltDeg: number;
  minEarthAltDeg: number;
  yDomain: [number, number];
  label: string;
};

/** Renders data from compareSites; no calculation happens here. */
export function AltitudeChart({
  samples,
  sunWindows,
  earthWindows,
  minSunAltDeg,
  minEarthAltDeg,
  yDomain,
  label,
}: Props) {
  const data = samples.map((s) => ({
    t: Date.parse(s.utc),
    sun: s.sunAltDeg,
    earth: s.earthAltDeg,
  }));
  const band = (w: VisibilityWindow) => [Date.parse(w.startUtc), Date.parse(w.endUtc)] as const;

  return (
    <div role="img" aria-label={label}>
      <LineChart
        responsive
        data={data}
        style={{ width: "100%", height: 220 }}
        margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
      >
        <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
        {sunWindows.map((w) => {
          const [x1, x2] = band(w);
          return (
            <ReferenceArea
              key={`s${x1}`}
              x1={x1}
              x2={x2}
              y1={yDomain[1] - (yDomain[1] - yDomain[0]) * 0.06}
              y2={yDomain[1]}
              fill="var(--sun)"
              fillOpacity={0.5}
              stroke="none"
              ifOverflow="hidden"
            />
          );
        })}
        {earthWindows.map((w) => {
          const [x1, x2] = band(w);
          return (
            <ReferenceArea
              key={`e${x1}`}
              x1={x1}
              x2={x2}
              y1={yDomain[0]}
              y2={yDomain[0] + (yDomain[1] - yDomain[0]) * 0.06}
              fill="var(--earth)"
              fillOpacity={0.5}
              stroke="none"
              ifOverflow="hidden"
            />
          );
        })}
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(ms: number) => utcDate(ms).slice(5)}
          stroke="var(--muted)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          minTickGap={40}
        />
        <YAxis
          domain={yDomain}
          stroke="var(--muted)"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickFormatter={(v: number) => `${v}°`}
          ticks={Array.from(
            { length: (yDomain[1] - yDomain[0]) / 5 + 1 },
            (_, i) => yDomain[0] + i * 5,
          )}
          allowDataOverflow
        />
        <ReferenceLine
          y={minSunAltDeg}
          stroke="var(--sun)"
          strokeDasharray="4 4"
          strokeOpacity={0.7}
        />
        {minEarthAltDeg !== minSunAltDeg && (
          <ReferenceLine
            y={minEarthAltDeg}
            stroke="var(--earth)"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
        )}
        <Tooltip
          labelFormatter={(ms) => utcDateTime(Number(ms))}
          formatter={(v, name) => [`${Number(v).toFixed(2)}°`, name === "sun" ? "Sun" : "Earth"]}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted)" }}
        />
        <Line
          type="monotone"
          dataKey="sun"
          stroke="var(--sun)"
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="earth"
          stroke="var(--earth)"
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
