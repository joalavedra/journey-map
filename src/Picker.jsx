import { Select } from "@base-ui/react/select";

// A base-ui Select styled to sit inline (city title, category field).
// Items with a `group` are shown under group headings, in order of first appearance.
function groups(items) {
  const map = new Map();
  for (const i of items) map.set(i.group, [...(map.get(i.group) || []), i]);
  return [...map];
}

const option = (i) => (
  <Select.Item key={i.value} value={i.value} className="option">
    <Select.ItemText>{i.label}</Select.ItemText>
    <Select.ItemIndicator className="check">✓</Select.ItemIndicator>
  </Select.Item>
);

export default function Picker({ value, onChange, items, className, label }) {
  return (
    <Select.Root
      value={value}
      onValueChange={onChange}
      items={Object.fromEntries(items.map((i) => [i.value, i.label]))}
    >
      <Select.Trigger className={className} aria-label={label}>
        <Select.Value />
        <Select.Icon className="chev">
          <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" fill="none" strokeWidth="1.3" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="positioner" sideOffset={6} alignItemWithTrigger={false}>
          <Select.Popup className="popover">
            <Select.List>
              {groups(items).map(([group, list]) =>
                group ? (
                  <Select.Group key={group} className="group">
                    <Select.GroupLabel className="group-label">{group}</Select.GroupLabel>
                    {list.map(option)}
                  </Select.Group>
                ) : (
                  list.map(option)
                )
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
