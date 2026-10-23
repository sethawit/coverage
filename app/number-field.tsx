'use client';

import { useEffect, useRef, useState } from 'react';

type NumberFieldProps = {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  suffix?: string;
  id?: string;
};

const grouped = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

// Keeps the half-typed text locally so clearing the box doesn't snap back to the URL default mid-edit,
// and only adds thousands separators while the box is not being typed in.
export function NumberField({ value, min, max, onCommit, suffix, id }: NumberFieldProps) {
  const [text, setText] = useState(grouped.format(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(grouped.format(value));
  }, [value]);
  const digits = text.replace(/,/g, '');
  const n = Number(digits);
  const valid = /^\d+$/.test(digits) && n >= min && n <= max;
  return (
    <span className="number-field">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={text}
        aria-invalid={!valid}
        onFocus={() => {
          focused.current = true;
          setText(String(value));
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, '');
          setText(next);
          const m = Number(next);
          if (next !== '' && m >= min && m <= max) onCommit(m);
        }}
        onBlur={() => {
          focused.current = false;
          setText(grouped.format(value));
        }}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </span>
  );
}
