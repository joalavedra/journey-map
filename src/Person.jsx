import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { useStore } from "./store.js";
import { avatarFor, safeUrl } from "./guide.js";

export function Avatar({ name, size = 20 }) {
  const person = useStore((s) => s.guide.people?.[name]);
  const src = avatarFor(person);
  const [failed, setFailed] = useState(null);
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (src && failed !== src)
    return <img className="avatar" src={src} alt="" style={style} onError={() => setFailed(src)} />;
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="avatar" style={{ ...style, "--hue": hue }} aria-hidden>
      {initials}
    </span>
  );
}

function Fields({ name }) {
  const { guide, savePerson, setPerson } = useStore();
  const person = guide.people?.[name] || {};

  function onSubmit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const url = f.url.trim();
    const avatar = f.avatar.trim();
    if ((url && !safeUrl(url)) || (avatar && !safeUrl(avatar)))
      return toast("Links need to start with https://");
    savePerson(name, { url: url || undefined, avatar: avatar || undefined, bio: f.bio.trim() || undefined });
    toast(`Saved ${name}'s profile`);
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="person-head">
        <Avatar name={name} size={44} />
        <Dialog.Title className="form-title">{name}</Dialog.Title>
      </div>
      <label>
        <span>Profile link</span>
        <input name="url" type="url" inputMode="url" defaultValue={person.url} placeholder="https://instagram.com/…" />
      </label>
      <label>
        <span>Photo (optional — Instagram, X and GitHub links fill this in)</span>
        <input name="avatar" type="url" inputMode="url" defaultValue={person.avatar} placeholder="https://" />
      </label>
      <label>
        <span>One line about them</span>
        <input name="bio" defaultValue={person.bio} placeholder="e.g. knows every bakery in Gràcia" autoComplete="off" />
      </label>
      <div className="actions">
        <span className="grow" />
        <button type="button" className="btn" onClick={() => setPerson(null)}>
          cancel
        </button>
        <button type="submit" className="btn primary">
          save
        </button>
      </div>
    </form>
  );
}

export default function PersonForm() {
  const { person, setPerson } = useStore();
  const last = useRef(person);
  if (person) last.current = person; // keep content visible during the exit transition
  const shown = person || last.current;
  return (
    <Dialog.Root open={!!person} onOpenChange={(open) => !open && setPerson(null)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="backdrop" />
        <Dialog.Popup className="dialog">{shown && <Fields key={shown} name={shown} />}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
