# Journey — a journal map

A single-file web app for turning a walk through a city into a keepsake. Pick a
city, drop numbered spots on the map, give each one a title, a photo, and a note,
and export the whole route as a postcard.

- **One static HTML file**, no build step — open `index.html` in a browser.
- Leaflet + CARTO light tiles; Newsreader + Inter, with a Caveat handwritten hand
  for captions and the city wordmark.
- ⌘K command palette searches cities, your spots, and live landmarks (Nominatim).
- Walking route between spots via FOSSGIS OSRM (foot), with a straight-line
  fallback.
- Drag spots on the map or reorder them in the sidebar; long-press a marker to
  delete it.
- **Save image** composes a framed postcard — a random border template (airmail,
  ivory, harbor, kraft, sage), a postage stamp + postmark, the route drawn with a
  subtle per-leg color shift, photo thumbnails sized to each image, and a
  handwritten `Title. Comment` caption per spot.

State lives in `localStorage`. Nominatim and OSRM are public, rate-limited
services — fine for personal use.

To export cleanly (so the browser doesn't block the map tiles from the canvas),
serve the folder rather than opening the file directly:

```
python3 -m http.server
# then open http://localhost:8000
```
