"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ClientTypeaheadOption = {
  id: string;
  companyName: string;
  email: string;
  name?: string;
  active?: boolean;
};

const DEBOUNCE_MS = 250;

export function ClientTypeahead({
  id,
  label = "Cliente",
  value,
  onChange,
  allowAll = true,
  allLabel = "Todos los clientes",
  placeholder = "Escribe las primeras letras",
  initialSelected,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (clientId: string, client?: ClientTypeaheadOption | null) => void;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  initialSelected?: ClientTypeaheadOption | null;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState(initialSelected?.companyName ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ClientTypeaheadOption[]>(initialSelected ? [initialSelected] : []);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<ClientTypeaheadOption | null>(initialSelected ?? null);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!value) {
      setSelected(null);
      if (!open) setQuery("");
      return;
    }
    if (selected?.id === value) return;
    const match = options.find((item) => item.id === value) ?? (initialSelected?.id === value ? initialSelected : null);
    if (match) {
      setSelected(match);
      setQuery(match.companyName);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/clientes?id=${encodeURIComponent(value)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { client?: ClientTypeaheadOption } | null) => {
        if (cancelled || !payload?.client) return;
        setSelected(payload.client);
        setQuery(payload.client.companyName);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Hydrate when a deep link provides clientId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      setOptions(selected ? [selected] : []);
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/clientes?q=${encodeURIComponent(q)}`)
        .then(async (response) => {
          if (!response.ok) return { clients: [] as ClientTypeaheadOption[] };
          return (await response.json()) as { clients: ClientTypeaheadOption[] };
        })
        .then((payload) => {
          setOptions(payload.clients ?? []);
          setHighlight(0);
        })
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [open, query, selected]);

  const showAllRow = allowAll && query.trim().length === 0;

  const visible = useMemo(() => options, [options]);

  function pick(client: ClientTypeaheadOption | null) {
    setSelected(client);
    setQuery(client?.companyName ?? "");
    setOpen(false);
    onChange(client?.id ?? "", client);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = visible[highlight];
      if (item) pick(item);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Field label={label} htmlFor={inputId}>
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (selected) {
              setSelected(null);
              onChange("");
            }
          }}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onKeyDown}
        />
        {value && allowAll ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-navy"
            aria-label="Quitar cliente"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pick(null)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-navy/10 bg-white py-1 shadow-lg"
          >
            {showAllRow ? (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-lima/15"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(null)}
                >
                  {allLabel}
                </button>
              </li>
            ) : null}
            {loading ? <li className="px-3 py-2 text-sm text-muted-foreground">Buscando…</li> : null}
            {!loading && query.trim() && visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Ningún cliente coincide.</li>
            ) : null}
            {visible.map((client, index) => (
              <li key={client.id} role="option" aria-selected={highlight === index}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-lima/15",
                    highlight === index && "bg-lima/15",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(client)}
                >
                  <span className="block font-medium text-navy">{client.companyName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {client.email}
                    {client.active === false ? " · inactivo" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
