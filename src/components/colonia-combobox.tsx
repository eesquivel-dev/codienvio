"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const norm = (s: string) =>
  s.toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type Props = {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

/** Single searchable control for colonia: type to filter, click/Enter to pick. Free text allowed. */
export function ColoniaCombobox({ id, value, options, onChange, placeholder = "Escribe o elige la colonia", disabled, ariaLabel }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Auto-select when the C.P. has exactly one colonia.
  useEffect(() => {
    if (options.length === 1 && value !== options[0]) onChange(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q ? options.filter((o) => norm(o).includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  const showList = open && options.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={options.length > 0 ? "pr-9" : undefined}
        onFocus={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!options.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && showList && filtered[active]) {
            e.preventDefault();
            pick(filtered[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {options.length > 0 ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Ver colonias"
          className="absolute right-2 top-2 text-muted-foreground"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">Sin coincidencias — se usará el texto escrito</li>
          ) : (
            filtered.map((name, i) => (
              <li
                key={name}
                role="option"
                aria-selected={name === value}
                className={`cursor-pointer px-3 py-2 ${i === active ? "bg-[#C4E000]/30 text-[#0B1B4B]" : ""} ${name === value ? "font-semibold text-[#0B1B4B]" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(name);
                }}
              >
                {name}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
