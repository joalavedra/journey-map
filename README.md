# Journey — a map of places I love

A curated, city-by-city map of my favourite spots and who recommended them.
Visitors browse; I edit.

- Pick a city or region, filter by category, tap a pin. Every view is a shareable URL
  (`?city=barcelona&cat=coffee&pin=bar-canete`, `?by=Anna`).
- ⌘K searches spots, people and cities. "i'm feeling lucky" picks one at random.
- Returning visitors get a "N new spots since you were last here" toast.
- Mobile: the map is full screen with a draggable bottom sheet (peek / half / full).

## Editing

The published guide is [`src/guide.json`](src/guide.json). To change it:

1. Open the app with `?edit` (locally or on the live site — it only touches your browser).
2. Tap the map to drop a pin, or ⌘K a place name to pin it from OpenStreetMap or add it
   as a new city/region. Drag pins to move them; edit/delete from the spot's detail.
   Or paste a full Google Maps place link anywhere on the page (or into ⌘K) to pin it.
3. Tap a recommender, then **edit profile** to add their link, photo and a one-liner.
   Instagram, X and GitHub links fill in the photo automatically (via unavatar.io).
4. **copy json** / **download**, replace `src/guide.json`, commit, push.

The draft lives in `localStorage` until you **reset** it.

## Dev

```
npm install
npm run dev     # http://localhost:5173
npm test        # filter / URL / helper tests
npm run build   # static site in dist/, relative paths so it works under any subpath
```

Stack: React + Vite, MapLibre with [OpenFreeMap](https://openfreemap.org) tiles (free, no key), and libraries from
[Emil Kowalski's picks](https://github.com/emilkowalski/skills): base-ui (select, dialog,
drawer), cmdk, Sonner, zustand, clsx.
