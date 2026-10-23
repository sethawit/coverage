'use client';

import { useEffect, useState } from 'react';

type NumberFieldProps = { value: number; min: number; max: number; onCommit: (n: number) => void };

// Keeps the half-typed text locally so clearing the box doesn't snap back to the URL default mid-edit.
export function NumberField({ value, min, max, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const n = Number(text);
  const valid = /^\d+$/.test(text) && n >= min && n <= max;
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      aria-invalid={!valid}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d]/g, '');
        setText(next);
        const m = Number(next);
        if (next !== '' && m >= min && m <= max) onCommit(m);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
