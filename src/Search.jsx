import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { pinFromLink, useStore } from "./store.js";
import { parseGoogleMaps, people, uniqueId } from "./guide.js";
import { lucky } from "./Panel.jsx";
import { Avatar } from "./Person.jsx";

// Edit mode only: look places up on OpenStreetMap to pin them or add a new city/region.
function usePlaces(query, enabled) {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    if (!enabled || query.trim().length < 3) return setPlaces([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
        { signal: ctrl.signal }
      )
        .then((r) => (r.ok ? r.json() : []))
        .then(setPlaces)
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, enabled]);
  return places;
}

// Plain substring match: cmdk's fuzzy default lets "anna" match "Nomad Coffee Lab".
const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const filter = (value, search, keywords = []) =>
  fold([value, ...keywords].join(" ")).includes(fold(search)) ? 1 : 0;

export default function Search() {
  const { guide, city, edit, searchOpen, setSearchOpen, setCity, setBy, select, setForm, addCity } =
    useStore();
  const [query, setQuery] = useState("");
  const places = usePlaces(query, edit && searchOpen);
  const gmaps = edit && parseGoogleMaps(query);
  const cats = Object.fromEntries(guide.cats.map((x) => [x.id, x]));
  const cityName = Object.fromEntries(guide.cities.map((x) => [x.id, x.name]));

  const run = (fn) => () => {
    fn();
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <Command.Dialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      label="Search"
      filter={filter}
      className="cmdk"
      overlayClassName="cmdk-overlay"
      contentClassName="cmdk-content"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder={edit ? "Search, or paste a Google Maps link…" : "Search spots, people, cities…"}
      />
      <Command.List>
        <Command.Empty>No matches.</Command.Empty>
        {gmaps && (
          <Command.Group heading="Google Maps" forceMount>
            <Command.Item value="google-maps-link" forceMount onSelect={run(() => pinFromLink(query))}>
              <span aria-hidden>📍</span>
              <span className="grow">Pin “{gmaps.name || "this place"}”</span>
              <span className="hint">from Google Maps</span>
            </Command.Item>
          </Command.Group>
        )}
        <Command.Group heading="Spots">
          {guide.pins.map((p) => (
            <Command.Item
              key={p.id}
              value={`${p.id} ${p.name}`}
              keywords={[p.note || "", p.by || "", cats[p.cat]?.label || "", cityName[p.city]]}
              onSelect={run(() => select(p.id))}
            >
              <span aria-hidden>{cats[p.cat]?.emoji}</span>
              <span className="grow">{p.name}</span>
              <span className="hint">
                {p.by ? `via ${p.by} · ` : ""}
                {cityName[p.city]}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Recommended by">
          {people(guide.pins).map(([name, n]) => (
            <Command.Item key={name} value={`person ${name}`} onSelect={run(() => setBy(name))}>
              <Avatar name={name} size={20} />
              <span className="grow">{name}</span>
              <span className="hint">{n} {n === 1 ? "spot" : "spots"}</span>
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Cities & regions">
          {guide.cities.map((c) => (
            <Command.Item key={c.id} value={`city ${c.name}`} onSelect={run(() => setCity(c.id))}>
              <span aria-hidden>🗺️</span>
              <span className="grow">{c.name}</span>
              {c.id === city && <span className="hint">current</span>}
            </Command.Item>
          ))}
          <Command.Item value="lucky random feeling" onSelect={run(lucky)}>
            <span aria-hidden>🎲</span>
            <span className="grow">i'm feeling lucky</span>
          </Command.Item>
        </Command.Group>
        {places.length > 0 && (
          <Command.Group heading="Add from OpenStreetMap" forceMount>
            {places.flatMap((pl) => {
              const name = pl.name || pl.display_name.split(",")[0];
              const [s, n, w, e] = pl.boundingbox.map(Number);
              return [
                <Command.Item
                  key={`pin-${pl.place_id}`}
                  value={`osm-pin-${pl.place_id}`}
                  forceMount
                  onSelect={run(() =>
                    setForm({ name, lat: Number(pl.lat), lng: Number(pl.lon), city })
                  )}
                >
                  <span aria-hidden>📍</span>
                  <span className="grow">Pin “{name}”</span>
                  <span className="hint">{pl.display_name.split(",").slice(1, 3).join(",")}</span>
                </Command.Item>,
                <Command.Item
                  key={`city-${pl.place_id}`}
                  value={`osm-city-${pl.place_id}`}
                  forceMount
                  onSelect={run(() =>
                    addCity({
                      id: uniqueId(name, new Set(guide.cities.map((c) => c.id))),
                      name,
                      note: "",
                      bounds: [[s, w], [n, e]],
                    })
                  )}
                >
                  <span aria-hidden>➕</span>
                  <span className="grow">New city/region “{name}”</span>
                </Command.Item>,
              ];
            })}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
