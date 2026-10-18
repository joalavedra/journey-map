import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { useStore } from "./store.js";
import { people, safeUrl, uniqueId } from "./guide.js";
import Picker from "./Picker.jsx";

function Fields({ form }) {
  const { guide, savePin, deletePin, setForm } = useStore();
  const [cat, setCat] = useState(form.cat || guide.cats[0]?.id);
  const isNew = !form.id;

  function onSubmit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const name = f.name.trim();
    if (!name) return;
    const url = f.url.trim();
    if (url && !safeUrl(url)) return toast("Links need to start with https://");
    const pin = {
      id: form.id || uniqueId(name, new Set(guide.pins.map((p) => p.id))),
      city: form.city,
      cat,
      name,
      note: f.note.trim() || undefined,
      lat: +form.lat.toFixed(5),
      lng: +form.lng.toFixed(5),
      url: url || undefined,
      maps: form.maps,
      photo: form.photo,
      by: f.by.trim() || undefined,
      added: form.added || new Date().toISOString().slice(0, 10),
    };
    savePin(pin);
    toast(isNew ? `Pinned ${name}` : `Saved ${name}`);
  }

  function onDelete() {
    deletePin(form.id);
    toast(`Deleted ${form.name}`, {
      action: { label: "Undo", onClick: () => useStore.getState().savePin(form) },
    });
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <Dialog.Title className="form-title">{isNew ? "New spot" : "Edit spot"}</Dialog.Title>
      <label>
        <span>Name</span>
        <input name="name" defaultValue={form.name} required autoFocus={isNew} autoComplete="off" />
      </label>
      <label>
        <span>Category</span>
        <Picker
          className="field-select"
          label="Category"
          value={cat}
          onChange={setCat}
          items={guide.cats.map((c) => ({ value: c.id, label: `${c.emoji} ${c.label}` }))}
        />
      </label>
      <label>
        <span>Why I like it</span>
        <textarea name="note" rows={3} defaultValue={form.note} />
      </label>
      <label>
        <span>Recommended by</span>
        <input name="by" list="people" defaultValue={form.by} autoComplete="off" placeholder="who told you about it?" />
        <datalist id="people">
          {people(guide.pins).map(([n]) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <label>
        <span>Link</span>
        <input name="url" type="url" defaultValue={form.url} placeholder="https://" inputMode="url" />
      </label>
      <div className="actions">
        {!isNew && (
          <button type="button" className="btn danger" onClick={onDelete}>
            delete
          </button>
        )}
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setForm(null)}>
          cancel
        </button>
        <button type="submit" className="btn primary">
          save
        </button>
      </div>
    </form>
  );
}

export default function PinForm() {
  const { form, setForm } = useStore();
  const last = useRef(form);
  if (form) last.current = form; // keep content visible during the exit transition
  const shown = form || last.current;
  return (
    <Dialog.Root open={!!form} onOpenChange={(open) => !open && setForm(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="backdrop" />
        <Dialog.Popup className="dialog">{shown && <Fields key={shown.id || `${shown.lat},${shown.lng}`} form={shown} />}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
