'use client';

import { Check, Plus } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { baht, type Product } from '../src/domain/product.ts';
import { TAX_BRACKETS } from '../src/domain/returns.ts';
import {
  discover,
  GOALS,
  MAX_COMPARE,
  parseShopper,
  serializeShopper,
  SORTS,
  type Goal,
  type Shopper,
  type SortKey,
  type Summary,
} from '../src/web/discovery.ts';
import { breakevenLabel, formatBaht, formatPercent } from '../src/web/format.ts';
import { NumberField } from './number-field.tsx';
import { productHref } from './shopper-link.ts';

// The list always shows these four figures; a sort on anything else adds that figure so the order is explainable.
const EXTRA_METRIC: Partial<Record<SortKey, { label: string; value: (x: Summary) => string }>> = {
  afterTax: {
    label: 'รวมภาษีที่ได้คืน',
    value: (x) => (x.returns.afterTax.kind === 'eligible' ? formatPercent(x.returns.afterTax.irr) : 'ไม่เข้าเงื่อนไข'),
  },
  death: { label: 'ครอบครัวได้สูงสุดถ้าเสียชีวิต', value: (x) => formatBaht(x.peakDeath) },
};

const PAY_LIMITS = [null, 5, 7, 10] as const;
const HORIZONS = [null, 10, 12, 15] as const;

export function Discovery({ products, insurers }: { products: Product[]; insurers: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const shopper = parseShopper(new URLSearchParams(useSearchParams().toString()));
  const update = (patch: Partial<Shopper>) =>
    router.replace(`${pathname}?${serializeShopper({ ...shopper, ...patch })}`, { scroll: false });
  const results = discover(products, shopper);
  const extra = EXTRA_METRIC[shopper.sort];
  const toggleCompare = (id: string) =>
    update({
      compare: shopper.compare.includes(id)
        ? shopper.compare.filter((c) => c !== id)
        : [...shopper.compare, id].slice(0, MAX_COMPARE),
    });

  return (
    <div className="discovery">
      <section className="panel filters">
        <h2>บอกเราเกี่ยวกับคุณ</h2>
        <Chips
          label="เป้าหมาย"
          options={[null, ...(Object.keys(GOALS) as Goal[])]}
          value={shopper.goal}
          text={(g) => (g === null ? 'ยังไม่แน่ใจ' : GOALS[g].label)}
          onPick={(goal) => update({ goal, sort: goal === null ? 'irr' : GOALS[goal].sort })}
        />
        <div className="fields">
          <label>
            อายุ
            <NumberField value={shopper.age} min={0} max={99} onCommit={(age) => update({ age })} />
          </label>
          <label>
            เพศ
            <select value={shopper.gender} onChange={(e) => update({ gender: e.target.value === 'F' ? 'F' : 'M' })}>
              <option value="M">ชาย</option>
              <option value="F">หญิง</option>
            </select>
          </label>
          <label>
            งบเบี้ยต่อปี (บาท)
            <NumberField
              value={shopper.budget}
              min={1_000}
              max={10_000_000}
              onCommit={(n) => update({ budget: baht(n) })}
            />
          </label>
          <label>
            คุณเสียภาษีขั้นไหน
            <select
              value={Math.round(shopper.bracket * 100)}
              onChange={(e) =>
                update({ bracket: TAX_BRACKETS.find((b) => Math.round(b * 100) === Number(e.target.value)) ?? 0 })
              }
            >
              {TAX_BRACKETS.map((b) => (
                <option key={b} value={Math.round(b * 100)}>
                  {Math.round(b * 100)}%
                </option>
              ))}
            </select>
          </label>
        </div>
        <Chips
          label="จ่ายเบี้ยได้นานสุด"
          options={PAY_LIMITS}
          value={shopper.maxPayYears}
          text={(n) => (n === null ? 'ไม่จำกัด' : `${n} ปี`)}
          onPick={(maxPayYears) => update({ maxPayYears })}
        />
        <Chips
          label="ต้องได้เงินก้อนสุดท้ายภายใน"
          options={HORIZONS}
          value={shopper.horizon}
          text={(n) => (n === null ? 'ไม่จำกัด' : `${n} ปี`)}
          onPick={(horizon) => update({ horizon })}
        />
      </section>

      <section className="results">
        <div className="results-head">
          <h2>{results.length} แบบที่ตรงเงื่อนไข</h2>
          <label className="inline">
            เรียงตาม
            <select value={shopper.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORTS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small results-note">
          ทุกแบบคิดที่เบี้ย {formatBaht(shopper.budget)} ต่อปีเท่ากัน ลำดับเป็นไปตามตัวเลขที่คุณเลือกเรียงเท่านั้น
          ไม่ใช่คำแนะนำว่าแบบไหนเหมาะกับคุณ
        </p>
        {results.length === 0 && (
          <div className="empty">
            <p>ไม่มีแบบที่ตรงทุกเงื่อนไข</p>
            <p className="muted">ลองเปลี่ยนระยะเวลาจ่ายเบี้ย หรือระยะเวลาที่ต้องได้เงินคืน ให้กว้างขึ้น</p>
          </div>
        )}
        <ul className="product-list">
          {results.map((x) => {
            const picked = shopper.compare.includes(x.product.id);
            return (
              <li key={x.product.id} className={picked ? 'product-card picked' : 'product-card'}>
                <div className="card-top">
                  <div className="card-head">
                    <span className="insurer">{insurers[x.product.insurerId] ?? x.product.insurerId}</span>
                    <Link className="product-name" href={productHref(x, shopper)}>
                      {x.product.nameTh}
                    </Link>
                    <span className="muted small">
                      จ่าย {x.product.paymentYears} ปี ได้คืนครบใน {x.product.coverageYears} ปี · ทุนประกัน{' '}
                      {formatBaht(x.sumAssured)}
                    </span>
                  </div>
                  <div className="card-rate">
                    <span className="rate-value">{formatPercent(x.returns.guaranteed)}</span>
                    <span className="rate-label">เท่ากับฝากได้ดอกเบี้ย (แน่นอน)</span>
                  </div>
                </div>
                <p className="card-line">
                  จ่ายปีละ {formatBaht(x.annualPremium)} รวม {formatBaht(x.totalPremiums)} ได้คืนแน่นอนรวม{' '}
                  {formatBaht(x.guaranteedTotal)}{' '}
                  {x.guaranteedTotal >= x.totalPremiums ? (
                    <span className="gain">มากกว่าที่จ่าย {formatBaht(x.guaranteedTotal - x.totalPremiums)}</span>
                  ) : (
                    <span className="loss">น้อยกว่าที่จ่าย {formatBaht(x.totalPremiums - x.guaranteedTotal)}</span>
                  )}
                </p>
                <dl className="metrics">
                  <div>
                    <dt>จ่ายรวม</dt>
                    <dd>{formatBaht(x.totalPremiums)}</dd>
                  </div>
                  <div>
                    <dt>ได้คืนรวมแน่นอน</dt>
                    <dd>{formatBaht(x.guaranteedTotal)}</dd>
                  </div>
                  <div>
                    <dt>เลิกได้โดยไม่ขาดทุน</dt>
                    <dd>{breakevenLabel(x.breakeven, x.product.coverageYears)}</dd>
                  </div>
                  {extra && (
                    <div>
                      <dt>{extra.label}</dt>
                      <dd>{extra.value(x)}</dd>
                    </div>
                  )}
                </dl>
                <div className="card-foot">
                  <div className="badges">
                    {x.quoteKind === 'sample' && (
                      <span className="badge">ตัวเลขจากตัวอย่างของบริษัท ซึ่งอายุหรือเพศต่างจากคุณ ของจริงอาจต่างไป</span>
                    )}
                    {x.breakeven.kind === 'unknown' && (
                      <span className="badge">บริษัทไม่บอกว่าเลิกกลางทางได้คืนเท่าไร</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={picked ? 'compare-toggle on' : 'compare-toggle'}
                    aria-pressed={picked}
                    disabled={!picked && shopper.compare.length >= MAX_COMPARE}
                    onClick={() => toggleCompare(x.product.id)}
                  >
                    {picked ? <Check size={16} weight="bold" aria-hidden /> : <Plus size={16} aria-hidden />}
                    {picked ? 'เลือกแล้ว' : 'เปรียบเทียบ'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {shopper.compare.length > 0 && (
        <div className="compare-bar">
          <span>
            เลือกแล้ว {shopper.compare.length}/{MAX_COMPARE}
          </span>
          <button className="link-button" onClick={() => update({ compare: [] })}>
            ล้าง
          </button>
          {shopper.compare.length >= 2 ? (
            <Link className="button" href={`/compare?${serializeShopper(shopper)}`}>
              เปรียบเทียบ
            </Link>
          ) : (
            <span className="muted small">เลือกอีกอย่างน้อย 1 แบบ</span>
          )}
        </div>
      )}
    </div>
  );
}

type ChipsProps<T> = {
  label: string;
  options: readonly T[];
  value: T;
  text: (option: T) => string;
  onPick: (option: T) => void;
};

function Chips<T>({ label, options, value, text, onPick }: ChipsProps<T>) {
  return (
    <fieldset className="chips">
      <legend>{label}</legend>
      {options.map((o) => (
        <button key={String(o)} type="button" aria-pressed={o === value} onClick={() => onPick(o)}>
          {text(o)}
        </button>
      ))}
    </fieldset>
  );
}
