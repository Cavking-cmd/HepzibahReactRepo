import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Small grey text under the label. */
  hint?: string;
}

interface SearchSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  /** Options always shown after the searchable list, e.g. "Personal Use". */
  pinnedOptions?: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Text shown for a value that is not in the options (e.g. an older unlinked name). */
  fallbackLabel?: string;
  /** Optional action at the bottom, e.g. "Add a new pastor". */
  action?: { label: string; onClick: (search: string) => void };
}

/**
 * A searchable dropdown that works with a keyboard, a mouse and a touch screen.
 * Kept inline (no portal) so it behaves inside dialogs.
 */
export function SearchSelect({
  id,
  value,
  onChange,
  options,
  pinnedOptions = [],
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  invalid,
  disabled,
  loading,
  fallbackLabel,
  action,
}: SearchSelectProps) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const all = useMemo(() => [...options, ...pinnedOptions], [options, pinnedOptions]);
  const selected = all.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ");
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
    return [...list, ...pinnedOptions];
  }, [options, pinnedOptions, query]);

  useEffect(() => {
    if (!open) return;
    setHighlight(Math.max(0, filtered.findIndex((o) => o.value === value)));
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onDown(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
    // Only when opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const pinnedStart = filtered.length - pinnedOptions.length;
  const label = selected?.label ?? (value && fallbackLabel ? fallbackLabel : "");

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          invalid && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        <span className={cn("truncate", !label && "text-muted-foreground")}>
          {loading ? "Loading…" : label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-controls={listId}
              aria-autocomplete="list"
            />
          </div>

          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === pinnedOptions.length && (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
            )}
            {filtered.map((option, index) => (
              <li key={option.value} role="presentation">
                {index === pinnedStart && pinnedStart > 0 && <div className="my-1 border-t border-border" />}
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                    index === highlight && "bg-accent text-accent-foreground",
                  )}
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {action && (
            <button
              type="button"
              onClick={() => {
                const search = query;
                setOpen(false);
                setQuery("");
                action.onClick(search);
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
