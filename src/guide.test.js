import { test } from "node:test";
import assert from "node:assert/strict";
import * as g from "./guide.js";

const guide = {
  cities: [{ id: "bcn" }, { id: "lis" }],
  cats: [{ id: "coffee" }, { id: "eat" }],
  pins: [
    { id: "a", city: "bcn", cat: "coffee", by: "Anna", added: "2026-10-01" },
    { id: "b", city: "bcn", cat: "eat", by: "Anna", added: "2026-10-10" },
    { id: "c", city: "bcn", cat: "eat", added: "2026-09-01" },
    { id: "d", city: "lis", cat: "eat", by: "Pau", added: "2026-10-12" },
  ],
};

test("filters by city, category and recommender", () => {
  const ids = (o) => g.filterPins(guide.pins, o).map((p) => p.id);
  assert.deepEqual(ids({ city: "bcn" }), ["a", "b", "c"]);
  assert.deepEqual(ids({ city: "bcn", cat: "eat" }), ["b", "c"]);
  assert.deepEqual(ids({ city: "bcn", cat: "eat", by: "Anna" }), ["b"]);
  assert.deepEqual(g.countByCat(guide.pins, "bcn"), { coffee: 1, eat: 2 });
  assert.deepEqual(g.people(guide.pins), [["Anna", 2], ["Pau", 1]]);
});

test("want-to-go pins hide unless asked for", () => {
  const pins = [...guide.pins, { id: "w", city: "bcn", cat: "eat", want: true }];
  assert.deepEqual(g.filterPins(pins, { city: "bcn", cat: "eat" }).map((p) => p.id), ["b", "c"]);
  assert.deepEqual(g.filterPins(pins, { city: "bcn", cat: "eat", want: true }).map((p) => p.id), ["b", "c", "w"]);
  assert.deepEqual(g.countByCat(pins, "bcn", true), { coffee: 1, eat: 3 });
  // a shared link to a want-to-go pin opens with the list showing
  assert.equal(g.readParams("?pin=w", { ...guide, pins }).want, true);
});

test("city picker sorts A–Z with Elsewhere last", () => {
  const items = g.pickerItems([
    { id: "e", name: "Elsewhere in Spain", country: "Spain" },
    { id: "m", name: "Madrid", country: "Spain" },
    { id: "b", name: "Barcelona", country: "Catalonia" },
    { id: "a", name: "Abrera", country: "Catalonia" },
  ]);
  assert.deepEqual(items.map((i) => i.value), ["a", "b", "m", "e"]);
});

test("new since last visit", () => {
  assert.deepEqual(g.newSince(guide.pins, null), []);
  assert.deepEqual(g.newSince(guide.pins, "2026-10-05").map((p) => p.id), ["b", "d"]);
});

test("url params round-trip and survive stale links", () => {
  const s = { city: "bcn", cat: "eat", by: "Anna", want: false, pinId: "b", edit: true };
  assert.deepEqual(g.readParams(g.toParams(s), guide), s);
  assert.equal(g.toParams({ edit: true }), "?edit");
  // a pin link opens its own city even if city param says otherwise
  assert.equal(g.readParams("?city=lis&pin=a", guide).city, "bcn");
  // unknown ids fall back to the first city / no filter
  assert.deepEqual(g.readParams("?city=nope&cat=nope&pin=nope", guide), {
    city: "bcn", cat: null, by: null, want: false, pinId: null, edit: false,
  });
});

test("only http(s) links and unique slugs", () => {
  assert.equal(g.safeUrl("javascript:alert(1)"), null);
  assert.equal(g.safeUrl("nope"), null);
  assert.equal(g.safeUrl("https://x.com/a"), "https://x.com/a");
  assert.equal(g.uniqueId("Bar Cañete", new Set(["bar-canete"])), "bar-canete-2");
});

test("parses Google Maps place links", () => {
  const soon =
    "https://www.google.com/maps/place/Soon+and+Soon+Souvenir+Shop/@37.7937704,-122.416702,15z/data=!4m10!1m2!2m1!1scoffee+chinatown!3m6!1s0x8085814914bdf9a1:0xb1ea41cdeb8a0dee!8m2!3d37.79377!4d-122.4064942!15sChBjb2ZmZWUgY2hpbmF0b3du?entry=ttu";
  assert.deepEqual(g.parseGoogleMaps(soon), {
    name: "Soon and Soon Souvenir Shop",
    lat: 37.79377,
    lng: -122.4064942,
    maps: "https://maps.google.com/?cid=12820131641939332590",
  });
  // viewport-only link falls back to @lat,lng
  assert.equal(g.parseGoogleMaps("https://www.google.com/maps/@41.38,2.17,15z").lat, 41.38);
  assert.equal(g.parseGoogleMaps("https://www.google.es/maps?q=41.1,2.2").lng, 2.2);
  assert.equal(g.parseGoogleMaps("https://maps.app.goo.gl/abc"), null);
  assert.equal(g.parseGoogleMaps("https://evil.com/maps/place/x/@1.0,2.0"), null);
  assert.equal(g.parseGoogleMaps("not a url"), null);
});

test("finds the city containing a point", () => {
  const cities = [{ id: "sf", bounds: [[37.7, -122.52], [37.83, -122.35]] }];
  assert.equal(g.cityAt(37.79, -122.4, cities)?.id, "sf");
  assert.equal(g.cityAt(41.38, 2.17, cities), undefined);
});

test("recommender avatars and link labels", () => {
  assert.equal(g.avatarFor({ url: "https://www.instagram.com/anna.eats/" }), "https://unavatar.io/instagram/anna.eats");
  assert.equal(g.avatarFor({ url: "https://x.com/pau" }), "https://unavatar.io/x/pau");
  assert.equal(g.avatarFor({ avatar: "https://a.com/me.jpg", url: "https://x.com/pau" }), "https://a.com/me.jpg");
  assert.equal(g.avatarFor({ url: "https://linkedin.com/in/pau" }), null);
  assert.equal(g.avatarFor({ avatar: "javascript:alert(1)" }), null);
  assert.equal(g.avatarFor(undefined), null);
  assert.equal(g.linkLabel("https://www.instagram.com/anna.eats/"), "@anna.eats");
  assert.equal(g.linkLabel("https://anna.blog/about"), "anna.blog");
});

test("published guide is consistent", async () => {
  const { readFileSync } = await import("node:fs");
  const data = JSON.parse(readFileSync(new URL("./guide.json", import.meta.url)));
  const cities = new Set(data.cities.map((c) => c.id));
  const cats = new Set(data.cats.map((c) => c.id));
  const ids = new Set();
  for (const p of data.pins) {
    assert.ok(cities.has(p.city), `${p.id}: unknown city ${p.city}`);
    assert.ok(cats.has(p.cat), `${p.id}: unknown category ${p.cat}`);
    assert.ok(!ids.has(p.id), `duplicate pin id ${p.id}`);
    assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lng), `${p.id}: bad coordinates`);
    ids.add(p.id);
  }
  assert.equal(cities.size, data.cities.length, "duplicate city id");
});
