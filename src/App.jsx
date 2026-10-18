import { Component, lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { Toaster, toast } from "sonner";
import { lastVisit, pinFromLink, useStore } from "./store.js";
import { newSince } from "./guide.js";
import Panel from "./Panel.jsx";
import Search from "./Search.jsx";
import PinForm from "./PinForm.jsx";
import PersonForm from "./Person.jsx";

// MapLibre is ~300 KB gzipped; load it in its own chunk so the panel paints first.
const MapView = lazy(() => import("./MapView.jsx"));

// No WebGL2 or a failed chunk load shouldn't take the list down with the map.
class MapBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="map map-error">The map can't load in this browser — the list still works.</div>
    ) : (
      this.props.children
    );
  }
}

const mq = matchMedia("(max-width: 767px)");
const useMobile = () =>
  useSyncExternalStore((cb) => (mq.addEventListener("change", cb), () => mq.removeEventListener("change", cb)), () => mq.matches);

const SNAPS = ["172px", 0.55, 1];

// Mobile: the panel lives in a sheet that's always open over the map.
function Sheet() {
  const pinId = useStore((s) => s.pinId);
  const [snap, setSnap] = useState(SNAPS[0]);
  useEffect(() => {
    if (pinId) setSnap((s) => (s === SNAPS[0] ? SNAPS[1] : s));
  }, [pinId]);
  return (
    <Drawer.Root
      open
      onOpenChange={() => {}}
      modal={false}
      disablePointerDismissal
      snapPoints={SNAPS}
      snapPoint={snap}
      onSnapPointChange={(s) => setSnap(s ?? SNAPS[0])}
    >
      <Drawer.Portal>
        <Drawer.Viewport className="sheet-viewport">
          <Drawer.Popup className="sheet" style={{ "--top-margin": "12px" }}>
            <div className="sheet-handle" aria-hidden />
            <Drawer.Title className="sr-only">Places</Drawer.Title>
            <Drawer.Content className="sheet-scroll">
              <Panel />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default function App() {
  const mobile = useMobile();
  const setSearchOpen = useStore((s) => s.setSearchOpen);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!useStore.getState().searchOpen);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Edit mode: paste a Google Maps link anywhere (outside a text field) to pin it.
  useEffect(() => {
    if (!useStore.getState().edit) return;
    const onPaste = async (e) => {
      if (e.target.closest?.("input, textarea")) return;
      const text = e.clipboardData.getData("text");
      if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(text))
        return toast("Short share links can't be read — open it in the browser and copy the full URL");
      if (!(await pinFromLink(text)) && /google\.[a-z.]+\/maps/.test(text)) toast("Couldn't find a place in that link");
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    const fresh = newSince(useStore.getState().guide.pins, lastVisit);
    if (fresh.length)
      toast(`${fresh.length} new ${fresh.length === 1 ? "spot" : "spots"} since you were last here`, {
        action: { label: "Show", onClick: () => useStore.getState().select(fresh.at(-1).id) },
      });
  }, []);

  return (
    <div className="app">
      <MapBoundary>
        <Suspense fallback={<div className="map" />}>
          <MapView mobile={mobile} />
        </Suspense>
      </MapBoundary>
      {mobile ? (
        <Sheet />
      ) : (
        <aside className="side">
          <Panel />
        </aside>
      )}
      <Search />
      <PinForm />
      <PersonForm />
      <Toaster position={mobile ? "top-center" : "bottom-right"} toastOptions={{ className: "toast" }} />
    </div>
  );
}
