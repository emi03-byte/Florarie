import { useEffect, useId, useRef, useState } from 'react';
import type { SalesSort } from '../lib/salesSort';
import { POPULAR_WINDOW_DAYS } from '../lib/salesSort';

const OPTIONS: Array<{ id: SalesSort; label: string }> = [
  { id: 'name', label: 'Nume (A–Z)' },
  { id: 'price-asc', label: 'Cele mai ieftine' },
  { id: 'price-desc', label: 'Cele mai scumpe' },
  {
    id: 'popular',
    label: `Cele mai vândute (${POPULAR_WINDOW_DAYS} zile)`,
  },
];

type Props = {
  value: SalesSort;
  onChange: (value: SalesSort) => void;
};

export function SalesSortSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const selected = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el || !(event.target instanceof Node) || el.contains(event.target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="sales-sort-dropdown" ref={rootRef}>
      <button
        type="button"
        id="sales-sort"
        className={open ? 'sales-sort-select is-open' : 'sales-sort-select'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sales-sort-select-value">{selected.label}</span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="sales-sort-menu"
          role="listbox"
          aria-label="Sortare produse"
        >
          {OPTIONS.map((opt) => {
            const active = opt.id === value;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={
                    active ? 'sales-sort-option is-active' : 'sales-sort-option'
                  }
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
