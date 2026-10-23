'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { baht, type Product } from '../../src/domain/product.ts';
import { TAX_BRACKETS } from '../../src/domain/returns.ts';
import {
  computeTax,
  DEDUCTIONS,
  headroom,
  PERSONAL_ALLOWANCE,
  SECTIONS,
  taxSavedBy,
  type Deduction,
  type Section,
  type TaxInput,
} from '../../src/domain/tax.ts';
import { discover, parseShopper, serializeShopper } from '../../src/web/discovery.ts';
import { formatBaht, formatPercent, genderLabel } from '../../src/web/format.ts';
import { int } from '../../src/web/profile-params.ts';
import { NumberField } from '../number-field.tsx';
import { productHref } from '../shopper-link.ts';

const MAX_MONEY = 100_000_000;
const MAX_PEOPLE = 20;
// Deduction amounts live under a prefix so they never collide with the shopper's own URL keys.
const key = (id: string) => `d_${id}`;

export function TaxPlanner({ products, insurers }: { products: Product[]; insurers: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  const money = (k: string, fallback = 0) => int(params.get(k), 0, MAX_MONEY) ?? fallback;
  const monthly = money('sal', 50_000);
  const input: TaxInput = {
    salary: monthly * 12,
    bonus: money('bonus'),
    otherWages: money('other'),
    withheld: money('wht'),
    amounts: Object.fromEntries(DEDUCTIONS.map((d) => [d.id, money(key(d.id))])),
  };
  const result = computeTax(input);
  const set = (k: string, n: number) => {
    if (n === 0) params.delete(k);
    else params.set(k, String(n));
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const lifeRoom = headroom(input, 'life').more;
  const shopper = {
    ...parseShopper(params),
    budget: baht(Math.max(lifeRoom, 1_000)),
    bracket: TAX_BRACKETS.find((b) => b === result.topRate) ?? 0,
    sort: 'afterTax' as const,
  };
  const eligible = lifeRoom > 0 ? discover(products, shopper).filter((x) => x.product.coverageYears >= 10) : [];

  return (
    <div className="explorer">
      <section className="panel">
        <h2>เงินได้และภาษีที่ถูกหักไว้</h2>
        <div className="fields">
          <label>
            เงินเดือนต่อเดือน
            <NumberField value={monthly} min={0} max={MAX_MONEY} onCommit={(n) => set('sal', n)} />
          </label>
          <label>
            โบนัสทั้งปี
            <NumberField value={input.bonus} min={0} max={MAX_MONEY} onCommit={(n) => set('bonus', n)} />
          </label>
          <label>
            ค่าจ้าง ค่านายหน้า ฟรีแลนซ์ทั้งปี
            <span className="hint">เงินได้ 40(2)</span>
            <NumberField value={input.otherWages} min={0} max={MAX_MONEY} onCommit={(n) => set('other', n)} />
          </label>
          <label>
            ภาษีหัก ณ ที่จ่ายทั้งปี
            <span className="hint">ดูจากใบ 50 ทวิ</span>
            <NumberField value={input.withheld} min={0} max={MAX_MONEY} onCommit={(n) => set('wht', n)} />
          </label>
        </div>
        <p className="premium muted">
          เงินได้ทั้งปี {formatBaht(result.assessable)} · หักค่าใช้จ่ายอัตโนมัติ 50% ไม่เกิน 100,000 ={' '}
          {formatBaht(result.expense)}
        </p>
      </section>

      {(Object.keys(SECTIONS) as Section[]).map((section) => (
        <section key={section} className="panel">
          <h2>{SECTIONS[section].title}</h2>
          {SECTIONS[section].note && <p className="muted small">{SECTIONS[section].note}</p>}
          <ul className="deductions">
            {section === 'family' && (
              <li className="deduction">
                <span className="deduction-label">ลดหย่อนส่วนตัว</span>
                <span className="deduction-used">{formatBaht(PERSONAL_ALLOWANCE)}</span>
                <span className="muted small">ได้ทุกคน ไม่ต้องกรอก</span>
              </li>
            )}
            {DEDUCTIONS.filter((d) => d.section === section).map((d) => (
              <DeductionRow
                key={d.id}
                deduction={d}
                value={input.amounts[d.id] ?? 0}
                used={result.allowed[d.id] ?? 0}
                room={d.plannable ? headroom(input, d.id) : null}
                onCommit={(n) => set(key(d.id), n)}
              />
            ))}
          </ul>
        </section>
      ))}

      <section className="panel plain">
        <h2>สรุปภาษีของคุณ</h2>
        <dl>
          <div>
            <dt>เงินได้สุทธิ (เอามาคิดภาษี)</dt>
            <dd>
              {formatBaht(result.netIncome)}
              <span className="muted small">
                {' '}
                = เงินได้ {formatBaht(result.assessable)} หักค่าใช้จ่าย {formatBaht(result.expense)} หักลดหย่อนรวม{' '}
                {formatBaht(result.totalAllowances)}
              </span>
            </dd>
          </div>
          <div>
            <dt>ภาษีทั้งปี</dt>
            <dd>
              {formatBaht(result.tax)} · ขั้นภาษีสูงสุดของคุณ {Math.round(result.topRate * 100)}%
            </dd>
          </div>
          <div>
            <dt>ถูกหัก ณ ที่จ่ายไว้แล้ว</dt>
            <dd>{formatBaht(result.withheld)}</dd>
          </div>
        </dl>
        <BalanceLine balance={result.balance} />
      </section>

      <section className="panel">
        <h2>ประกันชีวิตที่ใช้สิทธิ์ลดหย่อนที่เหลือได้</h2>
        {lifeRoom === 0 ? (
          <p className="muted">สิทธิ์ประกันชีวิตและสุขภาพ 100,000 บาทใช้เต็มแล้ว ซื้อเพิ่มไม่ช่วยลดภาษี</p>
        ) : (
          <>
            <p className="muted small">
              สิทธิ์ยังเหลือปีละ {formatBaht(lifeRoom)} คิดราคาสำหรับ{genderLabel[shopper.gender]} อายุ {shopper.age} ปี
              เรียงจากดอกเบี้ยเทียบเท่า (รวมภาษีที่ได้คืน) มากไปน้อย
            </p>
            <ul className="product-list">
              {eligible.map((x) => {
                const perYear = taxSavedBy(input, 'life', x.annualPremium);
                return (
                  <li key={x.product.id} className="product-card result">
                    <span className="muted small">{insurers[x.product.insurerId] ?? x.product.insurerId}</span>
                    <Link className="product-name" href={productHref(x, shopper)}>
                      {x.product.nameTh}
                    </Link>
                    <span>
                      จ่ายปีละ {formatBaht(x.annualPremium)} {x.product.paymentYears} ปี ได้คืนแน่นอนรวม{' '}
                      {formatBaht(x.guaranteedTotal)} ใน {x.product.coverageYears} ปี
                    </span>
                    <dl className="metrics">
                      <div>
                        <dt>ภาษีลดลงต่อปี</dt>
                        <dd>{formatBaht(perYear)}</dd>
                      </div>
                      <div>
                        <dt>ภาษีลดลงรวม {x.product.paymentYears} ปี</dt>
                        <dd>{formatBaht(perYear * x.product.paymentYears)}</dd>
                      </div>
                      <div>
                        <dt>เท่ากับฝากได้ดอกเบี้ยปีละ (รวมภาษี)</dt>
                        <dd>
                          {formatPercent(x.returns.afterTax.kind === 'eligible' ? x.returns.afterTax.irr : null)}
                        </dd>
                      </div>
                    </dl>
                    {x.quoteKind === 'sample' && (
                      <span className="badge">ราคาจากตัวอย่างของบริษัท อายุหรือเพศต่างจากคุณ</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="small">
              <Link href={`/?${serializeShopper({ ...shopper, goal: 'tax' })}`}>ดูทุกแบบในหน้าค้นหา</Link>
            </p>
          </>
        )}
        <ul className="conditions muted small">
          <li>สัญญาต้องยาวตั้งแต่ 10 ปีขึ้นไป และซื้อกับบริษัทประกันในไทย</li>
          <li>ถ้ามีเงินคืนระหว่างสัญญา เงินคืนต้องไม่เกิน 20% ของเบี้ย</li>
          <li>แจ้งบริษัทประกันว่าจะใช้สิทธิ์ลดหย่อน บริษัทจะส่งข้อมูลให้กรมสรรพากรเอง</li>
        </ul>
      </section>

      <div className="compare-bar tax-bar" aria-live="polite">
        <span>
          ภาษี {formatBaht(result.tax)} · หักไว้ {formatBaht(result.withheld)}
        </span>
        <BalanceLine balance={result.balance} compact />
      </div>
    </div>
  );
}

function BalanceLine({ balance, compact = false }: { balance: number; compact?: boolean }) {
  const text =
    balance > 0 ? `ได้คืน ${formatBaht(balance)}` : balance < 0 ? `ต้องจ่ายเพิ่ม ${formatBaht(-balance)}` : 'ไม่ต้องจ่ายเพิ่ม';
  return <p className={`${compact ? '' : 'big '}${balance < 0 ? 'loss' : 'gain'}`}>{text}</p>;
}

type RowProps = {
  deduction: Deduction;
  value: number;
  used: number;
  room: { more: number; taxSaved: number } | null;
  onCommit: (n: number) => void;
};

function DeductionRow({ deduction: d, value, used, room, onCommit }: RowProps) {
  const people = d.unit === 'people';
  const max = people ? (d.maxPeople ?? MAX_PEOPLE) : MAX_MONEY;
  const cut = !people && used < value;
  return (
    <li className="deduction">
      <label className="deduction-label">
        <span>
          {d.label}
          {people && ' (จำนวนคน)'}
        </span>
        <NumberField value={value} min={0} max={max} onCommit={onCommit} />
      </label>
      <span className="deduction-used">{used > 0 ? `หักได้ ${formatBaht(used)}` : ''}</span>
      <span className="muted small">
        สูงสุด {d.capText}
        {d.hint && ` · ${d.hint}`}
      </span>
      {cut && <span className="loss small">ส่วนที่เกิน {formatBaht(value - used)} ไม่ได้ลดภาษี</span>}
      {room && room.more > 0 && room.taxSaved > 0 && (
        <span className="gain small">
          ใส่เพิ่มได้อีก {formatBaht(room.more)} ภาษีลดอีก {formatBaht(room.taxSaved)}
        </span>
      )}
    </li>
  );
}
