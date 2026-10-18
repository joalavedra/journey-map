import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre builds its worker URL from a variable Vite can't follow; bundle it explicitly.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import clsx from "clsx";
import { useStore } from "./store.js";
import { filterPins } from "./guide.js";

// OpenFreeMap: free vector tiles, no key. Other styles: positron (quiet), bright.
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
maplibregl.setWorkerUrl(workerUrl);

export default function MapView({ mobile }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef(new Map());
  const [readyMap, setReadyMap] = useState(null); // the map instance whose style has loaded
  const { guide, city, cat, by, want, pinId, edit, select, setForm, savePin } = useStore();

  useEffect(() => {
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    if (!mobile) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Start with attribution folded into its (i) button on small screens.
    if (mobile)
      map.once("load", () =>
        ref.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show")
      );
    // isStyleLoaded() is also false while tiles stream in, so track the style ourselves.
    map.once("style.load", () => setReadyMap(map));
    mapRef.current = map;
    return () => {
      map.remove();
      markers.current.clear();
      prevCity.current = null;
    };
  }, [mobile]);

  // Tapping empty map: deselect, or drop a new pin in edit mode.
  useEffect(() => {
    const map = mapRef.current;
    const onClick = (e) => {
      if (e.originalEvent.target.closest(".pin-hit")) return;
      edit ? setForm({ lat: e.lngLat.lat, lng: e.lngLat.lng, city }) : select(null);
    };
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, [edit, city, mobile]);

  // Frame what's showing (or the region itself when empty); leave room for the mobile sheet's peek.
  // Jump on city change, glide on filter change.
  const c = guide.cities.find((x) => x.id === city);
  const prevCity = useRef(null);
  useEffect(() => {
    if (!c) return;
    const pts = filterPins(guide.pins, { city, cat, by, want });
    const b = new maplibregl.LngLatBounds();
    if (pts.length) pts.forEach((p) => b.extend([p.lng, p.lat]));
    else c.bounds.forEach(([lat, lng]) => b.extend([lng, lat]));
    if (!cat && !by) c.route?.forEach(([lat, lng]) => b.extend([lng, lat]));
    mapRef.current.fitBounds(b, {
      padding: { top: 70, left: 70, right: 70, bottom: mobile ? 240 : 70 },
      maxZoom: 15,
      animate: prevCity.current === city,
      duration: 300,
    });
    prevCity.current = city;
  }, [c?.id, cat, by, want, mobile]);

  // Trips can carry a route ([lat, lng] points); draw it under the pins.
  useEffect(() => {
    const map = mapRef.current;
    const data = {
      type: "FeatureCollection",
      features: c?.route
        ? [{ type: "Feature", geometry: { type: "LineString", coordinates: c.route.map(([lat, lng]) => [lng, lat]) } }]
        : [],
    };
    if (readyMap !== map) return;
    if (map.getSource("route")) map.getSource("route").setData(data);
    else {
      map.addSource("route", { type: "geojson", data });
      const layout = { "line-join": "round", "line-cap": "round" };
      map.addLayer({ id: "route-casing", type: "line", source: "route", layout, paint: { "line-color": "#fff", "line-width": 7, "line-opacity": 0.9 } });
      map.addLayer({ id: "route", type: "line", source: "route", layout, paint: { "line-color": "#1a1a1a", "line-width": 3.5, "line-opacity": 0.8 } });
    }
  }, [c?.id, readyMap]);

  useEffect(() => {
    const map = mapRef.current;
    const visible = filterPins(guide.pins, { city, cat, by, want });
    const emoji = Object.fromEntries(guide.cats.map((x) => [x.id, x.emoji]));
    for (const [id, m] of markers.current) {
      if (!visible.some((p) => p.id === id)) {
        m.remove();
        markers.current.delete(id);
      }
    }
    for (const p of visible) {
      let m = markers.current.get(p.id);
      if (!m) {
        // MapLibre owns the outer element's transform and classes; style the inner .pin.
        const el = document.createElement("button");
        el.type = "button";
        el.className = "pin-hit";
        el.append(document.createElement("span"));
        m = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        markers.current.set(p.id, m);
      }
      const el = m.getElement();
      el.firstChild.className = clsx("pin", p.id === pinId && "active", p.want && "want");
      el.firstChild.textContent = emoji[p.cat] || "📍";
      el.setAttribute("aria-label", p.name);
      el.title = p.name;
      el.style.zIndex = p.id === pinId ? 2 : "";
      el.onclick = () => select(p.id);
      m.setLngLat([p.lng, p.lat]).setDraggable(edit);
      m.off("dragend");
      m.on("dragend", () => {
        const { lat, lng } = m.getLngLat();
        savePin({ ...p, lat, lng });
      });
    }
  }, [guide, city, cat, by, want, pinId, edit, mobile]);

  // Bring the selected pin into view; on mobile keep it above the half-open sheet.
  useEffect(() => {
    const p = guide.pins.find((x) => x.id === pinId);
    if (!p) return;
    const map = mapRef.current;
    const h = map.getContainer().clientHeight;
    const pt = map.project([p.lng, p.lat]);
    const inView = pt.x > 60 && pt.y > 60 && pt.x < map.getContainer().clientWidth - 60 && pt.y < h - 60;
    if (mobile || !inView)
      map.easeTo({ center: [p.lng, p.lat], offset: [0, mobile ? -h * 0.22 : 0], duration: 300 });
  }, [pinId]);

  return <div ref={ref} className="map" />;
}
