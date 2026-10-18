import { create } from "zustand";
import { toast } from "sonner";
import published from "./guide.json";
import { cityAt, parseGoogleMaps, readParams, toParams, uniqueId } from "./guide.js";

const DRAFT_KEY = "journey-map-draft-v2";
const VISIT_KEY = "journey-map-last-visit";

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Could not save draft", e);
  }
}

const edit = new URLSearchParams(location.search).has("edit");
// Visitors always see the published JSON; only edit mode reads the local draft.
const guide = (edit && load(DRAFT_KEY)) || published;

export const lastVisit = load(VISIT_KEY);
store(VISIT_KEY, new Date().toISOString().slice(0, 10));

export const useStore = create((set, get) => ({
  guide,
  ...readParams(location.search, guide),
  form: null, // { lat, lng, ...pin } while adding/editing a pin
  person: null, // recommender name while editing their profile
  searchOpen: false,

  setCity: (city) => set({ city, cat: null, by: null, pinId: null }),
  setCat: (cat) => set({ cat, pinId: null }),
  setBy: (by) => set({ by, pinId: null }),
  setWant: (want) => set({ want, pinId: null }),
  select: (pinId) => {
    const pin = get().guide.pins.find((p) => p.id === pinId);
    set(pin ? { pinId, city: pin.city, ...(pin.want && { want: true }) } : { pinId: null });
  },
  setForm: (form) => set({ form }),
  setPerson: (person) => set({ person }),
  savePerson: (name, profile) =>
    set(({ guide }) => ({ guide: { ...guide, people: { ...guide.people, [name]: profile } }, person: null })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  savePin: (pin) =>
    set(({ guide }) => ({
      guide: {
        ...guide,
        pins: guide.pins.some((p) => p.id === pin.id)
          ? guide.pins.map((p) => (p.id === pin.id ? pin : p))
          : [...guide.pins, pin],
      },
      form: null,
      pinId: pin.id,
    })),
  deletePin: (id) =>
    set(({ guide, pinId }) => ({
      guide: { ...guide, pins: guide.pins.filter((p) => p.id !== id) },
      pinId: pinId === id ? null : pinId,
      form: null,
    })),
  addCity: (city) =>
    set(({ guide }) => ({
      guide: { ...guide, cities: [...guide.cities, city] },
      city: city.id,
      cat: null,
      by: null,
      pinId: null,
    })),
  resetDraft: () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    set({ guide: published, ...readParams("?edit", published) });
  },
}));

// Edit mode: turn a pasted Google Maps link into a pre-filled pin form. If it's outside
// every city, look the city up on OpenStreetMap and create it first.
export async function pinFromLink(text) {
  const place = parseGoogleMaps(text);
  if (!place) return false;
  const { guide, addCity, setForm } = useStore.getState();
  let city = cityAt(place.lat, place.lng, guide.cities);
  if (!city) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${place.lat}&lon=${place.lng}`
      );
      const hit = await r.json();
      const name = hit.address?.city || hit.address?.town || hit.name;
      const [s, n, w, e] = hit.boundingbox.map(Number);
      city = { id: uniqueId(name, new Set(guide.cities.map((c) => c.id))), name, note: "", bounds: [[s, w], [n, e]] };
      addCity(city);
      toast(`Added ${name}`);
    } catch {
      toast("Couldn't work out which city that's in — add the city via ⌘K first");
      return true;
    }
  }
  setForm({ ...place, city: city.id });
  return true;
}

// Keep the URL shareable and the draft saved.
useStore.subscribe((s, prev) => {
  if (s.edit && s.guide !== prev.guide) store(DRAFT_KEY, s.guide);
  const qs = toParams(s);
  if (qs !== location.search) history.replaceState(null, "", qs || location.pathname);
});
