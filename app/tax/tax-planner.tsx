'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heartbeat,
  House,
  ListChecks,
  PiggyBank,
  Users,
  Wallet,
  type Icon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
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
  type TaxResult,
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

type Step = { id: string; title: string; icon: Icon; sections: readonly Section[] };

const STEPS: readonly Step[] = [
  { id: 'income', title: 'เงินได้', icon: Wallet, sections: [] },
  { id: 'family', title: 'ครอบครัว', icon: Users, sections: ['family'] },
  { id: 'insurance', title: 'ประกัน', icon: Heartbeat, sections: ['insurance'] },
  { id: 'funds', title: 'กองทุน', icon: PiggyBank, sections: ['retirement', 'invest'] },
  { id: 'other', title: 'บ้านและบริจาค', icon: House, sections: ['home', 'donation'] },
  { id: 'summary', title: 'สรุป', icon: ListChecks, sections: [] },
];

const stepTotal = (s: Step, result: TaxResult) =>
  DEDUCTIONS.filter((d) => s.sections.includes(d.section)).reduce((sum, d) => sum + (result.allowed[d.id] ?? 0), 0) +
  (s.id === 'family' ? PERSONAL_ALLOWANCE : 0);

// Most people only ever fill these; the rest fold away until they hold a value.
const COMMON = new Set(['spouse', 'child', 'parents', 'sso', 'life', 'health', 'pvd', 'rmf', 'esg', 'homeLoan', 'donate']);

export function TaxPlanner({ products, insurers }: { products: Product[]; insurers: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  const top = useRef<HTMLDivElement>(null);
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
  const index = Math.max(
    0,
    STEPS.findIndex((s) => s.id === params.get('step')),
  );
  const step = STEPS[index] ?? STEPS[0]!;
  // On narrow screens the stepper scrolls sideways; keep the current step in view.
  useEffect(() => {
    top.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [index]);

  const set = (k: string, n: number) => {
    if (n === 0) params.delete(k);
    else params.set(k, String(n));
    router.replace(`${pathname}?${params}`, { scroll: false });
  };
  const go = (i: number) => {
    const next = STEPS[i];
    if (!next) return;
    if (i === 0) params.delete('step');
    else params.set('step', next.id);
    router.push(`${pathname}?${params}`, { scroll: false });
    top.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="wizard" ref={top}>
      <ol className="stepper" aria-label="ขั้นตอน">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const total = stepTotal(s, result);
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-current={i === index ? 'step' : undefined}
                className={i < index ? 'done' : undefined}
                onClick={() => go(i)}
              >
                <span className="step-icon">{i < index ? <Check size={16} weight="bold" /> : <Icon size={16} />}</span>
                <span className="step-text">
                  <span className="step-title">{s.title}</span>
                  {s.sections.length > 0 && total > 0 && <span className="step-meta">{formatBaht(total)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="wizard-body">
        <div className="wizard-main">
          <p className="step-count">
            ขั้นที่ {index + 1} จาก {STEPS.length}
          </p>
          {step.id === 'income' && <IncomeStep input={input} monthly={monthly} result={result} set={set} />}
          {step.sections.map((section) => (
            <SectionStep key={section} section={section} input={input} result={result} set={set} />
          ))}
          {step.id === 'summary' && <SummaryStep input={input} result={result} products={products} insurers={insurers} params={params} go={go} />}

          <div className="step-nav">
            {index > 0 ? (
              <button type="button" className="button ghost" onClick={() => go(index - 1)}>
                <ArrowLeft size={18} aria-hidden /> ย้อนกลับ
              </button>
            ) : (
              <span />
            )}
            {index < STEPS.length - 1 && (
              <button type="button" className="button" onClick={() => go(index + 1)}>
                {index === STEPS.length - 2 ? 'ดูสรุป' : `ถัดไป: ${STEPS[index + 1]?.title}`}
                <ArrowRight size={18} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <aside className="tax-summary" aria-live="polite">
          <p className="eyebrow">ผลตอนนี้</p>
          <BalanceLine balance={result.balance} />
          <dl className="summary-list">
            <div>
              <dt>ภาษีทั้งปี</dt>
              <dd>{formatBaht(result.tax)}</dd>
            </div>
            <div>
              <dt>ถูกหักไว้แล้ว</dt>
              <dd>{formatBaht(result.withheld)}</dd>
            </div>
            <div>
              <dt>ลดหย่อนรวม</dt>
              <dd>{formatBaht(result.totalAllowances)}</dd>
            </div>
            <div>
              <dt>ขั้นภาษีสูงสุด</dt>
              <dd>{Math.round(result.topRate * 100)}%</dd>
            </div>
          </dl>
          <p className="muted small">ตัวเลขเปลี่ยนทันทีที่คุณกรอก</p>
        </aside>
      </div>

      <div className="tax-bar">
        <span className="muted small">ภาษี {formatBaht(result.tax)}</span>
        <BalanceLine balance={result.balance} compact />
      </div>
    </div>
  );
}

type Setter = (k: string, n: number) => void;

function IncomeStep({ input, monthly, result, set }: { input: TaxInput; monthly: number; result: TaxResult; set: Setter }) {
  return (
    <section className="step-panel">
      <h2>เงินได้และภาษีที่ถูกหักไว้</h2>
      <p className="muted">ดูตัวเลขได้จากสลิปเงินเดือนหรือใบ 50 ทวิ ที่บริษัทออกให้ต้นปี</p>
      <div className="form-grid">
        <Field label="เงินเดือนต่อเดือน">
          <NumberField value={monthly} min={0} max={MAX_MONEY} suffix="บาท" onCommit={(n) => set('sal', n)} />
        </Field>
        <Field label="โบนัสทั้งปี">
          <NumberField value={input.bonus} min={0} max={MAX_MONEY} suffix="บาท" onCommit={(n) => set('bonus', n)} />
        </Field>
        <Field label="ค่าจ้าง ค่านายหน้า ฟรีแลนซ์ทั้งปี" hint="เงินได้ 40(2)">
          <NumberField value={input.otherWages} min={0} max={MAX_MONEY} suffix="บาท" onCommit={(n) => set('other', n)} />
        </Field>
        <Field label="ภาษีหัก ณ ที่จ่ายทั้งปี" hint="ดูจากใบ 50 ทวิ">
          <NumberField value={input.withheld} min={0} max={MAX_MONEY} suffix="บาท" onCommit={(n) => set('wht', n)} />
        </Field>
      </div>
      <dl className="ledger">
        <div>
          <dt>เงินได้ทั้งปี</dt>
          <dd>{formatBaht(result.assessable)}</dd>
        </div>
        <div>
          <dt>หักค่าใช้จ่ายอัตโนมัติ 50% ไม่เกิน 100,000 บาท</dt>
          <dd>{formatBaht(result.expense)}</dd>
        </div>
      </dl>
    </section>
  );
}

function SectionStep({ section, input, result, set }: { section: Section; input: TaxInput; result: TaxResult; set: Setter }) {
  const items = DEDUCTIONS.filter((d) => d.section === section);
  const shown = items.filter((d) => COMMON.has(d.id) || (input.amounts[d.id] ?? 0) > 0);
  const folded = items.filter((d) => !shown.includes(d));
  const row = (d: Deduction) => (
    <DeductionRow
      key={d.id}
      deduction={d}
      value={input.amounts[d.id] ?? 0}
      used={result.allowed[d.id] ?? 0}
      room={d.plannable ? headroom(input, d.id) : null}
      onCommit={(n) => set(key(d.id), n)}
    />
  );
  return (
    <section className="step-panel">
      <h2>{SECTIONS[section].title}</h2>
      {SECTIONS[section].note && <p className="muted">{SECTIONS[section].note}</p>}
      <ul className="deductions">
        {section === 'family' && (
          <li className="deduction fixed">
            <div className="deduction-head">
              <span className="deduction-label">ลดหย่อนส่วนตัว</span>
              <span className="deduction-used">{formatBaht(PERSONAL_ALLOWANCE)}</span>
            </div>
            <span className="muted small">ได้ทุกคน ไม่ต้องกรอก</span>
          </li>
        )}
        {shown.map(row)}
      </ul>
      {folded.length > 0 && (
        <details className="more">
          <summary>รายการอื่นที่ใช้น้อยกว่า ({folded.length})</summary>
          <ul className="deductions">{folded.map(row)}</ul>
        </details>
      )}
    </section>
  );
}

type SummaryProps = {
  input: TaxInput;
  result: TaxResult;
  products: Product[];
  insurers: Record<string, string>;
  params: URLSearchParams;
  go: (i: number) => void;
};

function SummaryStep({ input, result, products, insurers, params, go }: SummaryProps) {
  const lifeRoom = headroom(input, 'life').more;
  const shopper = {
    ...parseShopper(params),
    budget: baht(Math.max(lifeRoom, 1_000)),
    bracket: TAX_BRACKETS.find((b) => b === result.topRate) ?? 0,
    sort: 'afterTax' as const,
  };
  const eligible = lifeRoom > 0 ? discover(products, shopper).filter((x) => x.product.coverageYears >= 10) : [];
  const wins = DEDUCTIONS.filter((d) => d.plannable)
    .map((d) => ({ d, room: headroom(input, d.id) }))
    .filter(({ room }) => room.more > 0 && room.taxSaved > 0);

  return (
    <>
      <section className="step-panel">
        <h2>สรุปภาษีของคุณ</h2>
        <BalanceLine balance={result.balance} />
        <dl className="ledger">
          <div>
            <dt>เงินได้ทั้งปี</dt>
            <dd>{formatBaht(result.assessable)}</dd>
          </div>
          <div>
            <dt>หักค่าใช้จ่าย</dt>
            <dd>- {formatBaht(result.expense)}</dd>
          </div>
          {STEPS.filter((s) => s.sections.length > 0).map((s) => (
            <div key={s.id}>
              <dt>
                ลดหย่อน{s.title}{' '}
                <button type="button" className="link-button small" onClick={() => go(STEPS.indexOf(s))}>
                  แก้ไข
                </button>
              </dt>
              <dd>- {formatBaht(stepTotal(s, result))}</dd>
            </div>
          ))}
          <div className="total">
            <dt>เงินได้สุทธิ (เอามาคิดภาษี)</dt>
            <dd>{formatBaht(result.netIncome)}</dd>
          </div>
          <div>
            <dt>ภาษีทั้งปี (ขั้นสูงสุด {Math.round(result.topRate * 100)}%)</dt>
            <dd>{formatBaht(result.tax)}</dd>
          </div>
          <div>
            <dt>ถูกหัก ณ ที่จ่ายไว้แล้ว</dt>
            <dd>- {formatBaht(result.withheld)}</dd>
          </div>
        </dl>
      </section>

      {wins.length > 0 && (
        <section className="step-panel">
          <h2>ยังลดภาษีได้อีก</h2>
          <p className="muted">สิทธิ์ที่ยังใช้ไม่เต็ม ถ้าใส่เพิ่มจนเต็มเพดาน ภาษีจะลดลงเท่านี้</p>
          <ul className="wins">
            {wins.map(({ d, room }) => (
              <li key={d.id}>
                <span>{d.label}</span>
                <span className="muted small">ใส่เพิ่มได้อีก {formatBaht(room.more)}</span>
                <span className="gain">ภาษีลด {formatBaht(room.taxSaved)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="step-panel">
        <h2>ประกันชีวิตที่ใช้สิทธิ์ลดหย่อนที่เหลือได้</h2>
        {lifeRoom === 0 ? (
          <p className="muted">สิทธิ์ประกันชีวิตและสุขภาพ 100,000 บาทใช้เต็มแล้ว ซื้อเพิ่มไม่ช่วยลดภาษี</p>
        ) : (
          <>
            <p className="muted">
              สิทธิ์ยังเหลือปีละ {formatBaht(lifeRoom)} คิดราคาสำหรับ{genderLabel[shopper.gender]} อายุ {shopper.age} ปี
              เรียงจากดอกเบี้ยเทียบเท่า (รวมภาษีที่ได้คืน) มากไปน้อย ไม่ใช่คำแนะนำว่าแบบไหนเหมาะกับคุณ
            </p>
            <ul className="product-list">
              {eligible.map((x) => {
                const perYear = taxSavedBy(input, 'life', x.annualPremium);
                return (
                  <li key={x.product.id} className="product-card">
                    <div className="card-head">
                      <span className="insurer">{insurers[x.product.insurerId] ?? x.product.insurerId}</span>
                      <Link className="product-name" href={productHref(x, shopper)}>
                        {x.product.nameTh}
                      </Link>
                    </div>
                    <p className="card-line">
                      จ่ายปีละ {formatBaht(x.annualPremium)} {x.product.paymentYears} ปี ได้คืนแน่นอนรวม{' '}
                      {formatBaht(x.guaranteedTotal)} ใน {x.product.coverageYears} ปี
                    </p>
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
                        <dd>{formatPercent(x.returns.afterTax.kind === 'eligible' ? x.returns.afterTax.irr : null)}</dd>
                      </div>
                    </dl>
                    {x.quoteKind === 'sample' && (
                      <span className="badge">ราคาจากตัวอย่างของบริษัท อายุหรือเพศต่างจากคุณ</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p>
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
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function BalanceLine({ balance, compact = false }: { balance: number; compact?: boolean }) {
  const label = balance > 0 ? 'ได้คืน' : balance < 0 ? 'ต้องจ่ายเพิ่ม' : 'ไม่ต้องจ่ายเพิ่ม';
  const tone = balance < 0 ? 'loss' : 'gain';
  if (compact)
    return (
      <p className={`balance-compact ${tone}`}>
        {label}
        {balance !== 0 && ` ${formatBaht(Math.abs(balance))}`}
      </p>
    );
  return (
    <div className={`balance ${tone}`}>
      <span className="balance-label">{label}</span>
      {balance !== 0 && <span className="balance-value">{formatBaht(Math.abs(balance))}</span>}
    </div>
  );
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
      <label className="deduction-head">
        <span className="deduction-label">{d.label}</span>
        <NumberField value={value} min={0} max={max} suffix={people ? 'คน' : 'บาท'} onCommit={onCommit} />
      </label>
      <div className="deduction-foot">
        <span className="muted small">
          สูงสุด {d.capText}
          {d.hint && ` · ${d.hint}`}
        </span>
        {used > 0 && <span className="deduction-used">หักได้ {formatBaht(used)}</span>}
      </div>
      {cut && <span className="loss small">ส่วนที่เกิน {formatBaht(value - used)} ไม่ได้ลดภาษี</span>}
      {room && room.more > 0 && room.taxSaved > 0 && (
        <span className="gain small">
          ใส่เพิ่มได้อีก {formatBaht(room.more)} ภาษีลดอีก {formatBaht(room.taxSaved)}
        </span>
      )}
    </li>
  );
}
