import clsx from "clsx";
import { toast } from "sonner";
import { useStore } from "./store.js";
import { countByCat, filterPins, linkLabel, mapsUrl, people, pickerItems, safeUrl } from "./guide.js";
import { Avatar } from "./Person.jsx";
import Picker from "./Picker.jsx";

export function lucky() {
  const { guide, city, cat, by, want, pinId, select } = useStore.getState();
  const pool = filterPins(guide.pins, { city, cat, by, want }).filter((p) => p.id !== pinId);
  if (pool.length) select(pool[Math.floor(Math.random() * pool.length)].id);
}

async function share(pin) {
  const url = location.href;
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches)
      return await navigator.share({ title: pin?.name, url });
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (e) {
    if (e.name !== "AbortError") toast("Couldn't copy the link");
  }
}

function Via({ name }) {
  const setBy = useStore((s) => s.setBy);
  return (
    <button className="via" onClick={() => setBy(name)} aria-label={`More from ${name}`}>
      <Avatar name={name} size={18} />
      {name}
    </button>
  );
}

// Who recommended it: avatar, name, one-liner and their link.
function Profile({ name, children }) {
  const { guide, setBy, edit, setPerson } = useStore();
  const p = guide.people?.[name] || {};
  const link = safeUrl(p.url);
  return (
    <div className="profile">
      <Avatar name={name} size={40} />
      <div className="profile-body">
        <div className="profile-kicker">{children}</div>
        <button className="profile-name" onClick={() => setBy(name)}>
          {name}
        </button>
        {p.bio && <div className="profile-bio">{p.bio}</div>}
      </div>
      <div className="profile-links">
        {link && (
          <a href={link} target="_blank" rel="noreferrer">
            {linkLabel(link)} ↗
          </a>
        )}
        {edit && <button onClick={() => setPerson(name)}>edit profile</button>}
      </div>
    </div>
  );
}

function Detail({ pin, cat }) {
  const { select, edit, setForm } = useStore();
  const site = safeUrl(pin.url);
  return (
    <article className="detail">
      <button className="back" onClick={() => select(null)}>
        ← back to the list
      </button>
      {pin.photo && <img className="detail-photo" src={pin.photo} alt="" loading="lazy" decoding="async" />}
      <div className="detail-cat">
        {cat?.emoji} {cat?.label}
      </div>
      <h2 className="detail-name">{pin.name}</h2>
      {pin.note && <p className="detail-note">{pin.note}</p>}
      {pin.approx && <p className="detail-approx">Pin is approximate — directions go to the exact place.</p>}
      {pin.by && <Profile name={pin.by}>recommended by</Profile>}
      <div className="actions">
        <a className="btn" href={mapsUrl(pin)} target="_blank" rel="noreferrer">
          directions ↗
        </a>
        {site && (
          <a className="btn" href={site} target="_blank" rel="noreferrer">
            website ↗
          </a>
        )}
        <button className="btn" onClick={() => share(pin)}>
          share
        </button>
        {edit && (
          <button className="btn" onClick={() => setForm(pin)}>
            edit
          </button>
        )}
      </div>
    </article>
  );
}

export default function Panel() {
  const { guide, city, cat, by, want, pinId, edit, setCity, setCat, setBy, setWant, select, setSearchOpen } =
    useStore();
  const c = guide.cities.find((x) => x.id === city);
  const counts = countByCat(guide.pins, city, want);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const wantCount = guide.pins.filter((p) => p.city === city && p.want).length;
  const list = filterPins(guide.pins, { city, cat, by, want });
  const pin = guide.pins.find((p) => p.id === pinId);
  const cats = Object.fromEntries(guide.cats.map((x) => [x.id, x]));
  const friends = people(guide.pins.filter((p) => p.city === city)).length;

  return (
    <div className="panel">
      <header className="panel-head">
        <div className="eyebrow">{guide.author}'s best of</div>
        <div className="title-row">
          <Picker
            className="city"
            label="City or region"
            value={city}
            onChange={setCity}
            items={pickerItems(guide.cities)}
          />
          <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <kbd>⌘K</kbd>
          </button>
        </div>
        <p className="lede">
          {c?.note && <>{c.note} </>}
          <span className="meta">
            {total} {total === 1 ? "spot" : "spots"}
            {friends > 0 && ` · tips from ${friends} ${friends === 1 ? "friend" : "friends"}`}
          </span>
        </p>
      </header>

      <nav className="menu" aria-label="Categories">
        <button className={clsx("cat", !cat && "on")} aria-pressed={!cat} onClick={() => setCat(null)}>
          <span className="num">00</span>
          <span className="cat-label">all</span>
          <span className="count">{total}</span>
        </button>
        {guide.cats
          .filter((x) => counts[x.id])
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((x, i) => (
            <button
              key={x.id}
              className={clsx("cat", cat === x.id && "on")}
              aria-pressed={cat === x.id}
              onClick={() => setCat(cat === x.id ? null : x.id)}
            >
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <span className="cat-label">
                {x.label} <span aria-hidden>{x.emoji}</span>
              </span>
              <span className="count">{counts[x.id]}</span>
            </button>
          ))}
        {wantCount > 0 && (
          <button className={clsx("cat want-toggle", want && "on")} aria-pressed={want} onClick={() => setWant(!want)}>
            <span className="num">{want ? "✓" : "+"}</span>
            <span className="cat-label">want to go</span>
            <span className="count">{wantCount}</span>
          </button>
        )}
        <button className="cat lucky" onClick={lucky}>
          <span className="num">→</span>
          <span className="cat-label">i'm feeling lucky</span>
        </button>
      </nav>

      {by && (
        <div className="filter-chip">
          <Profile name={by}>showing tips from</Profile>
          <button className="clear" onClick={() => setBy(null)} aria-label={`Clear ${by} filter`}>
            ✕
          </button>
        </div>
      )}

      {pin ? (
        <Detail key={pin.id} pin={pin} cat={cats[pin.cat]} />
      ) : (
        <ul className="spots" key={`${city}-${cat}-${by}`}>
          {list.map((p, i) => (
            <li key={p.id} style={{ "--i": Math.min(i, 8) }}>
              <button className="spot" onClick={() => select(p.id)}>
                <span className="spot-emoji" aria-hidden>
                  {cats[p.cat]?.emoji}
                </span>
                <span className="spot-body">
                  <span className="spot-name">{p.name}</span>
                  {p.note && <span className="spot-note">{p.note}</span>}
                </span>
              </button>
              {p.by && <Via name={p.by} />}
            </li>
          ))}
          {list.length === 0 && (
            <li className="empty">
              {wantCount > 0 && !want ? (
                <button className="btn" onClick={() => setWant(true)}>
                  haven't been yet — show {wantCount} on my want-to-go list
                </button>
              ) : edit ? (
                "tap the map to drop your first pin here."
              ) : (
                "nothing here yet."
              )}
            </li>
          )}
        </ul>
      )}

      {edit && <EditBar />}
    </div>
  );
}

function EditBar() {
  const { guide, resetDraft } = useStore();
  const json = JSON.stringify(guide, null, 2) + "\n";
  return (
    <div className="editbar">
      <span>editing a local draft · tap the map to add a pin</span>
      <div className="actions">
        <button
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json);
              toast("Copied guide.json", { description: "Paste it into src/guide.json and push." });
            } catch {
              toast("Couldn't copy — use download instead");
            }
          }}
        >
          copy json
        </button>
        <button
          className="btn"
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
            a.download = "guide.json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          download
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm("Discard the draft and go back to the published guide?")) resetDraft();
          }}
        >
          reset
        </button>
      </div>
    </div>
  );
}
