// Pure helpers over the guide data. No DOM, no React — tested by guide.test.js.

export function pinsIn(pins, city) {
  return pins.filter((p) => p.city === city);
}

// Want-to-go pins only show when asked for.
export function filterPins(pins, { city, cat, by, want }) {
  return pinsIn(pins, city).filter(
    (p) => (!cat || p.cat === cat) && (!by || p.by === by) && (want || !p.want)
  );
}

export function countByCat(pins, city, want) {
  const counts = {};
  for (const p of filterPins(pins, { city, want })) counts[p.cat] = (counts[p.cat] || 0) + 1;
  return counts;
}

// City picker: groups A–Z, places A–Z inside, catch-all "Elsewhere…" regions last.
export function pickerItems(cities) {
  const key = (c) => (c.name.startsWith("Elsewhere") ? "\uffff" : "") + c.name;
  return [...cities]
    .sort((a, b) => (a.country || "").localeCompare(b.country || "") || key(a).localeCompare(key(b)))
    .map((c) => ({ value: c.id, label: c.name, group: c.country }));
}

// Recommenders with how many pins each, most first.
export function people(pins) {
  const counts = {};
  for (const p of pins) if (p.by) counts[p.by] = (counts[p.by] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Pins added after the visitor's previous visit. First visit counts as nothing new.
export function newSince(pins, lastVisit) {
  if (!lastVisit) return [];
  return pins.filter((p) => p.added && p.added > lastVisit);
}

// URL <-> view state. Unknown ids fall back so a stale shared link still opens.
export function readParams(search, guide) {
  const q = new URLSearchParams(search);
  const pin = guide.pins.find((p) => p.id === q.get("pin"));
  const city =
    pin?.city ||
    (guide.cities.some((c) => c.id === q.get("city")) ? q.get("city") : guide.cities[0]?.id);
  const cat = guide.cats.some((c) => c.id === q.get("cat")) ? q.get("cat") : null;
  const by = q.get("by") || null;
  // Opening a want-to-go pin's link shows the want-to-go list too.
  const want = q.has("want") || !!pin?.want;
  return { city, cat, by, want, pinId: pin?.id || null, edit: q.has("edit") };
}

export function toParams({ city, cat, by, want, pinId, edit }) {
  const q = new URLSearchParams();
  if (city) q.set("city", city);
  if (cat) q.set("cat", cat);
  if (by) q.set("by", by);
  if (pinId) q.set("pin", pinId);
  const s = [q.toString(), want && "want", edit && "edit"].filter(Boolean).join("&");
  return "?" + s;
}

// Only http(s) links get rendered as hrefs.
export function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

// The saved Google place if we have one; else coordinates, since a name search
// can land on a namesake across town.
export function mapsUrl(p) {
  return safeUrl(p.maps) || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

export function slug(s) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pin"
  );
}

export function uniqueId(name, taken) {
  const base = slug(name);
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

// First city/region whose bounds contain the point.
export function cityAt(lat, lng, cities) {
  return cities.find(({ bounds: [[s, w], [n, e]] }) => lat >= s && lat <= n && lng >= w && lng <= e);
}

// Full Google Maps place URLs → { name, lat, lng, maps }. Short maps.app.goo.gl links
// can't be expanded from the browser (no CORS), so they return null.
export function parseGoogleMaps(text) {
  let u;
  try {
    u = new URL(text.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) || !u.pathname.startsWith("/maps")) return null;
  const s = decodeURIComponent(u.href);
  // !3d/!4d is the place itself; @lat,lng is only where the viewport was.
  const at =
    s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
    (u.searchParams.get("q") || "").match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/) ||
    s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!at) return null;
  const rawName = u.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const name = rawName ? decodeURIComponent(rawName.replace(/\+/g, " ")) : "";
  const cid = s.match(/!1s0x[0-9a-f]+:(0x[0-9a-f]+)/i)?.[1];
  return {
    name: /^-?\d+\.\d+,/.test(name) ? "" : name,
    lat: +at[1],
    lng: +at[2],
    maps: cid ? `https://maps.google.com/?cid=${BigInt(cid)}` : undefined,
  };
}

// A recommender's photo: explicit avatar, else derived from a social profile link.
export function avatarFor(person) {
  if (!person) return null;
  const own = safeUrl(person.avatar);
  if (own) return own;
  const url = safeUrl(person.url);
  if (!url) return null;
  const { hostname, pathname } = new URL(url);
  const handle = pathname.split("/").filter(Boolean)[0];
  const site = { "x.com": "x", "twitter.com": "x", "instagram.com": "instagram", "github.com": "github" }[
    hostname.replace(/^www\./, "")
  ];
  return site && handle ? `https://unavatar.io/${site}/${handle}` : null;
}

// "@handle" for social links, bare hostname otherwise.
export function linkLabel(url) {
  const u = safeUrl(url);
  if (!u) return null;
  const { hostname, pathname } = new URL(u);
  const handle = pathname.split("/").filter(Boolean)[0];
  return /(x|twitter|instagram|github|tiktok)\.com$/.test(hostname) && handle
    ? "@" + handle.replace(/^@/, "")
    : hostname.replace(/^www\./, "");
}
