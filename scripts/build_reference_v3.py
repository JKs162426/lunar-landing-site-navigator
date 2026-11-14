"""Validation-only: SPICE reference table v2 (MOON_ME frame, sphere 1737.4 km, LT correction not applied to site vector)."""
import json, math, hashlib, datetime
import spiceypy as sp

NOTES = "/mnt/user-data/uploads/Documents/proyectos/lunar-landing-site-navigator/notes"
KERNELS = ["naif0012.tls", "pck00011.tpc", "de440.bsp", "moon_pa_de440_200625.bpc", "moon_de440_250416.tf"]
for k in KERNELS:
    sp.furnsh(f"{NOTES}/{k}")

SITES = [
    {"id": "shackleton_rim", "name": "Shackleton", "lat_deg": -89.90, "lon_deg": 0.00,
     "coordinate_source": "USGS Gazetteer of Planetary Nomenclature, Feature ID 5450 (control network 3), https://planetarynames.wr.usgs.gov/Feature/5450",
     "coordinate_precision_deg": 0.01, "status": "provisional",
     "alternates": ["control network 1: (-89.67, +129.78)", "control network 2: (-89.63, +132.32)"],
     "note": "DECIDED: control network 3 (-89.90, 0.00). Networks 1 and 2 differ by ~130 deg in longitude but both sit within ~10 km of the pole; network 3 is the only one at lon 0 and matches the gazetteer centre used for Shackleton elsewhere."},
    {"id": "malapert_candidate", "name": "Malapert_Massif (Artemis III candidate region centre)", "lat_deg": -85.987, "lon_deg": -0.237,
     "coordinate_source": "USGS data release, Artemis III candidate Malapert_Massif, 1 km grid, DOI 10.5066/P1MEQ6UK; centre = mean of cell centres, LPS -> lat/lon on sphere 1737.4 km",
     "coordinate_precision_deg": 0.03, "status": "provisional",
     "alternates": ["Gazetteer Mons Malapert (ID 16338): (-85.98, -1.67)"],
     "note": "Region spans lon -5.43 to +4.13, lat -86.32 to -85.63."},
    {"id": "peak_near_cabeus_b_candidate", "name": "Peak_Near_Cabeus_B (Artemis III candidate region centre)", "lat_deg": -83.651, "lon_deg": -68.726,
     "coordinate_source": "USGS data release, Artemis III candidate Peak_Near_Cabeus_B, 1 km grid, DOI 10.5066/P1MEQ6UK; centre = mean of cell centres, LPS -> lat/lon",
     "coordinate_precision_deg": 0.03, "status": "provisional",
     "alternates": ["Gazetteer Mons Cabeus (ID 16396): (-83.67, -36.16) - different feature, ~110 km away"],
     "note": "Region spans lon -72.48 to -64.74, lat -83.83 to -83.45."},
    {"id": "haworth_candidate", "name": "Haworth (Artemis III candidate region centre)", "lat_deg": -86.766, "lon_deg": -22.620,
     "coordinate_source": "USGS data release, Artemis III candidate Haworth, 1 km grid, DOI 10.5066/P1MEQ6UK; centre = mean of cell centres, LPS -> lat/lon",
     "coordinate_precision_deg": 0.03, "status": "provisional",
     "alternates": ["Wikipedia crater Haworth: (-86.9, -4.0), not gazetteer-verified", "tour site: (-87.45, +354.83 E = -5.17), not official"],
     "note": "Candidate region does not contain the crater centre per Wikipedia; decide region vs crater. Region spans lon -34.81 to -12.15, lat -86.95 to -86.46."},
]
FRAME = "MOON_ME"
a = sp.bodvrd("MOON", "RADII", 3)[1][0]

def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

def alt(vec, up):
    return math.degrees(math.asin(max(-1.0, min(1.0, sp.vdot(sp.vhat(vec), up)))))

start = sp.str2et("2026-11-14T00:00:00")
rows = []
for s in SITES:
    up = sp.vhat(sp.latrec(a, math.radians(s["lon_deg"]), math.radians(s["lat_deg"])))
    pt = sp.latrec(a, math.radians(s["lon_deg"]), math.radians(s["lat_deg"]))
    for h in range(0, 48, 6):
        et = start + h * 3600
        t = sp.pxform("J2000", FRAME, et)
        sun = sp.mxv(t, sp.spkpos("SUN", et, "J2000", "NONE", "MOON")[0])
        earth = sp.mxv(t, sp.spkpos("EARTH", et, "J2000", "NONE", "MOON")[0])
        rows.append({"site_id": s["id"], "utc": sp.et2utc(et, "ISOC", 0),
                     "sun_alt_deg": round(alt(sun - pt, up), 6),
                     "earth_alt_deg": round(alt(earth - pt, up), 6)})

out = {
    "metadata": {
        "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "frame": FRAME,
        "shape_model": "sphere, radius 1737.4 km (pck00011.tpc RADII; ellipsoid normal == sphere normal, measured diff 0.000000 deg)",
        "longitude_convention": "IAU planetographic, +East, -180..180 (matches USGS gazetteer)",
        "light_correction": "none applied to site-to-Sun/Earth vectors (spkpos NONE); see notes",
        "spiceypy_toolkit": sp.tkvrsn("TOOLKIT"),
        "kernels": {k: {"sha256": sha256(f"{NOTES}/{k}")} for k in KERNELS},
        "tolerance_reference_vs_reference_deg": 0.005,
        "tolerance_app_vs_reference_deg": 0.005,
        "tolerance_basis": "Measured: same-config SPICE vs SPICE (DeepSeek code vs validation) = 0.00037 deg at (-85,0); PA vs ME frame = 0.014 deg (not used, we use ME). Both tolerances = ~10x the worst same-config difference. App tolerance is set equal to reference tolerance because the app uses the same sphere and frame; revisit if the app uses a different model.",
        "decisions": [
            "Frame: MOON_ME (IAU selenographic convention).",
            "Shape: sphere 1737.4 km (pck00011.tpc gives equal radii).",
            "Shackleton: gazetteer control network 3.",
            "Sites: Artemis III candidate-region centres (USGS DOI 10.5066/P1MEQ6UK) for Malapert, Peak_Near_Cabeus_B and Haworth; gazetteer features kept as alternates.",
            "Tolerances: 0.005 deg for both comparisons (decided by us, not confirmed by NASA)."
        ],
        "open_items": [
            "Haworth crater centre not verified in USGS gazetteer (only Wikipedia and an unofficial tour site).",
            "Mission confirmation of tolerance and frame not received from NASA."
        ],
        "tolerance_status": "DECIDED by project; not NASA-confirmed",
        "generator_script": "build_reference_v2.py (scratchpad, not in repo yet)",
    },
    "sites": SITES,
    "rows": rows,
}
with open(f"{NOTES}/reference_altitudes.json", "w") as fh:
    json.dump(out, fh, indent=2)
print("rows", len(rows), "sites", len(SITES))
sp.kclear()
