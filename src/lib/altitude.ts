import {
  Body,
  GeoMoon,
  HelioVector,
  KM_PER_AU,
  MakeTime,
  RotationAxis,
  type AxisInfo,
} from "astronomy-engine";
import { InvalidInputError, assertLatLon, type AltitudeSample, type Site } from "./types";

/**
 * Sun and Earth altitude seen from a site on the Moon.
 *
 * astronomy-engine's Observer only models observers on Earth, so it is not
 * used here. Instead: geometric (no light-time) Moon-centred vectors to the
 * Sun and Earth, minus the site position, rotated into the lunar body-fixed
 * frame (IAU rotation model). Matches notes/reference_altitudes.json
 * (SPICE, MOON_ME) to ~0.001 deg.
 */

export const MOON_RADIUS_KM = 1737.4;

type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

// Passive rotations (rotate the frame, not the vector).
function rotZ(a: number, [x, y, z]: Vec3): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * x + s * y, -s * x + c * y, z];
}

function rotX(a: number, [x, y, z]: Vec3): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, c * y + s * z, -s * y + c * z];
}

// J2000 equatorial (EQJ) -> body-fixed: Rz(W) * Rx(90 - dec) * Rz(90 + ra).
// astronomy-engine returns ra in sidereal hours, dec and spin in degrees.
function eqjToBodyFixed(v: Vec3, axis: AxisInfo): Vec3 {
  const raDeg = axis.ra * 15;
  return rotZ(axis.spin * DEG, rotX((90 - axis.dec) * DEG, rotZ((90 + raDeg) * DEG, v)));
}

function altitudeDeg(moonToBodyFixed: Vec3, siteUnit: Vec3): number {
  const d: Vec3 = [
    moonToBodyFixed[0] - MOON_RADIUS_KM * siteUnit[0],
    moonToBodyFixed[1] - MOON_RADIUS_KM * siteUnit[1],
    moonToBodyFixed[2] - MOON_RADIUS_KM * siteUnit[2],
  ];
  const dot = d[0] * siteUnit[0] + d[1] * siteUnit[1] + d[2] * siteUnit[2];
  return Math.asin(dot / Math.hypot(d[0], d[1], d[2])) / DEG;
}

export function altitudesAt(site: Pick<Site, "latDeg" | "lonDeg">, instant: Date): AltitudeSample {
  assertLatLon(site.latDeg, site.lonDeg);
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new InvalidInputError(`instant must be a valid Date, got ${String(instant)}`);
  }

  const t = MakeTime(instant);
  const axis = RotationAxis(Body.Moon, t);
  const sunFromMoon = HelioVector(Body.Moon, t); // Sun -> Moon, AU
  const moonFromEarth = GeoMoon(t); // Earth -> Moon, AU
  const moonToSun: Vec3 = [
    -sunFromMoon.x * KM_PER_AU,
    -sunFromMoon.y * KM_PER_AU,
    -sunFromMoon.z * KM_PER_AU,
  ];
  const moonToEarth: Vec3 = [
    -moonFromEarth.x * KM_PER_AU,
    -moonFromEarth.y * KM_PER_AU,
    -moonFromEarth.z * KM_PER_AU,
  ];

  const lat = site.latDeg * DEG;
  const lon = site.lonDeg * DEG;
  const siteUnit: Vec3 = [
    Math.cos(lat) * Math.cos(lon),
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
  ];

  return {
    utc: instant.toISOString(),
    sunAltDeg: altitudeDeg(eqjToBodyFixed(moonToSun, axis), siteUnit),
    earthAltDeg: altitudeDeg(eqjToBodyFixed(moonToEarth, axis), siteUnit),
  };
}
