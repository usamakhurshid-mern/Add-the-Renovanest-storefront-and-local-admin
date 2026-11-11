import { moveItem } from "../data/store";

export function Text({ label, value, onChange, hint, type = "text" }) {
  return (
    <label className="afield">
      <span>{label}</span>
      <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Area({ label, value, onChange, hint, rows = 4 }) {
  return (
    <label className="afield">
      <span>{label}</span>
      <textarea rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Lines({ label, value, onChange, hint }) {
  return (
    <Area
      label={label}
      hint={hint}
      value={(value || []).join("\n")}
      onChange={(text) => onChange(text.split("\n"))}
    />
  );
}

export function Check({ label, checked, onChange }) {
  return (
    <label className="acheck">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Choice({ label, value, onChange, options }) {
  return (
    <label className="afield">
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorField({ label, value, onChange }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#000000";
  return (
    <label className="afield">
      <span>{label}</span>
      <span className="acolor">
        <input type="color" value={hex} onChange={(event) => onChange(event.target.value)} />
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

export function BlockList({ items, onChange, render, blank, addLabel }) {
  return (
    <div className="ablocks">
      {items.map((item, index) => (
        <div className="ablock" key={item.id || index}>
          <div className="ablock-bar">
            <button type="button" onClick={() => onChange(moveItem(items, index, -1))}>
              Up
            </button>
            <button type="button" onClick={() => onChange(moveItem(items, index, 1))}>
              Down
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
          {render(item, (partial) => {
            const next = items.slice();
            next[index] = { ...item, ...partial };
            onChange(next);
          })}
        </div>
      ))}
      <button type="button" className="btn btn-light" onClick={() => onChange([...items, blank()])}>
        {addLabel}
      </button>
    </div>
  );
}
