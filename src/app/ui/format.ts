import type { Site } from "@/lib/types";

/** "Malapert_Massif (Artemis III candidate region centre)" -> "Malapert Massif". */
export function displayName(site: Pick<Site, "name">): string {
  return site.name.replace(/\s*\(.*\)\s*$/, "").replace(/_/g, " ");
}

export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function nightLength(hours: number): string {
  if (hours === 0) return "none";
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function utcDateTime(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
