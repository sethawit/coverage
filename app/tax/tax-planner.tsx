'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { baht, type Product } from '../../src/domain/product.ts';
import { TAX_BRACKETS } from '../../src/domain/returns.ts';
import { LIFE_PREMIUM_CAP, PERSONAL_ALLOWANCE, planTax, taxSaved, type TaxInput } from '../../src/domain/tax.ts';
import { discover, parseShopper, serializeShopper } from '../../src/web/discovery.ts';
import { formatBaht, formatPercent, genderLabel } from '../../src/web/format.ts';
import { int } from '../../src/web/profile-params.ts';
import { NumberField } from '../number-field.tsx';
import { productHref } from '../shopper-link.ts';

const MAX_MONEY = 100_000_000;

export function TaxPlanner({ products, insurers }: { products: Product[]; insurers: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  const input: TaxInput = {
    income: int(params.get('inc'), 0, MAX_MONEY) ?? 600_000,
    otherAllowances: int(params.get('oth'), 0, MAX_MONEY) ?? 0,
    premiumsAlready: int(params.get('have'), 0, MAX_MONEY) ?? 0,
  };
  const plan = planTax(input);
  const buy = int(params.get('buy'), 0, MAX_MONEY) ?? plan.room;
  const saved = taxSaved(input, buy);
  const set = (key: string, n: number) => {
    params.set(key, String(n));
    router.replace(`${pathname}?${params}`, { scroll: false });
  };

  const shopper = {
    ...parseShopper(params),
    budget: baht(Math.max(buy, 1_000)),
    bracket: TAX_BRACKETS.find((b) => b === plan.topRate) ?? 0,
    sort: 'afterTax' as const,
  };
  const eligible = discover(products, shopper).filter((x) => x.product.coverageYears >= 10);

  return (
    <div className="explorer">
      <section className="panel">
        <h2>รายได้และลดหย่อนของคุณ</h2>
        <div className="fields">
          <label>
            รายได้ทั้งปี (เงินเดือน + โบนัส)
            <NumberField value={input.income} min={0} max={MAX_MONEY} onCommit={(n) => set('inc', n)} />
          </label>
          <label>
            ลดหย่อนอื่นที่ใช้อยู่แล้ว
            <span className="hint">เช่น ประกันสังคม กองทุนสำรองเลี้ยงชีพ ลูก พ่อแม่</span>
            <NumberField value={input.otherAllowances} min={0} max={MAX_MONEY} onCommit={(n) => set('oth', n)} />
          </label>
          <label>
            เบี้ยประกันชีวิตและสุขภาพที่จ่ายอยู่แล้วต่อปี
            <NumberField value={input.premiumsAlready} min={0} max={MAX_MONEY} onCommit={(n) => set('have', n)} />
          </label>
        </div>
      </section>

      <section className="panel plain">
        <h2>ภาษีของคุณตอนนี้</h2>
        <dl>
          <div>
            <dt>เงินที่ต้องเอามาคิดภาษี</dt>
            <dd>
              {formatBaht(plan.netIncome)}
              <span className="muted small">
                {' '}
                (รายได้ หักค่าใช้จ่าย {formatBaht(plan.expenseDeduction)} หักลดหย่อนส่วนตัว{' '}
                {formatBaht(PERSONAL_ALLOWANCE)} และลดหย่อนที่กรอกไว้)
              </span>
            </dd>
          </div>
          <div>
            <dt>ภาษีที่ต้องจ่ายต่อปี</dt>
            <dd>
              {formatBaht(plan.tax)} · ขั้นภาษีสูงสุดของคุณ {Math.round(plan.topRate * 100)}%
            </dd>
          </div>
          <div>
            <dt>สิทธิ์ลดหย่อนประกันชีวิตที่ยังเหลือ</dt>
            <dd>
              {plan.room > 0
                ? `ซื้อเพิ่มได้อีกปีละ ${formatBaht(plan.room)} (เต็มสิทธิ์ ${formatBaht(LIFE_PREMIUM_CAP)})`
                : `ใช้สิทธิ์เต็ม ${formatBaht(LIFE_PREMIUM_CAP)} แล้ว ซื้อเพิ่มไม่ช่วยลดภาษี`}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel plain">
        <h2>ถ้าซื้อประกันชีวิตเพิ่ม</h2>
        <label>
          เบี้ยที่อยากจ่ายเพิ่มต่อปี
          <NumberField value={buy} min={0} max={MAX_MONEY} onCommit={(n) => set('buy', n)} />
        </label>
        <p className="big">ภาษีลดลงปีละ {formatBaht(saved)}</p>
        <p className="muted">
          {plan.tax === 0
            ? 'ตอนนี้คุณยังไม่ต้องเสียภาษี ซื้อประกันจึงไม่ได้ภาษีคืน'
            : buy > 0
              ? `เท่ากับรัฐช่วยจ่าย ${((saved / buy) * 100).toFixed(1)}% ของเบี้ยที่จ่ายเพิ่ม${
                  buy > plan.room ? ` ส่วนที่เกิน ${formatBaht(plan.room)} ไม่ได้ลดภาษี` : ''
                }`
              : ''}
        </p>
        <dl>
          <div>
            <dt>เงื่อนไขที่ต้องเช็กก่อนซื้อ</dt>
            <dd>
              <ul className="conditions">
                <li>สัญญาต้องยาวตั้งแต่ 10 ปีขึ้นไป และซื้อกับบริษัทประกันในไทย</li>
                <li>ถ้ามีเงินคืนระหว่างสัญญา เงินคืนต้องไม่เกิน 20% ของเบี้ย ถามบริษัทว่าแบบนี้ลดหย่อนได้เต็มไหม</li>
                <li>แจ้งบริษัทประกันว่าจะใช้สิทธิ์ลดหย่อน บริษัทจะส่งข้อมูลให้กรมสรรพากรเอง</li>
                <li>เบี้ยประกันสุขภาพของตัวเอง (ไม่เกิน 25,000 บาท) นับรวมในเพดาน 100,000 บาทเดียวกัน</li>
                <li>ถ้าเลิกก่อนครบสัญญา อาจต้องคืนภาษีที่ลดไป</li>
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h2>แบบที่ลดหย่อนได้ ที่เบี้ยประมาณปีละ {formatBaht(shopper.budget)}</h2>
        <p className="muted small">
          คิดราคาสำหรับ{genderLabel[shopper.gender]} อายุ {shopper.age} ปี เรียงจากดอกเบี้ยเทียบเท่า (รวมภาษีที่ได้คืน)
          มากไปน้อย ภาษีที่ลดได้คิดจากรายได้ปีนี้ ถ้ารายได้เปลี่ยน ตัวเลขก็เปลี่ยน
        </p>
        <ul className="product-list">
          {eligible.map((x) => {
            const perYear = taxSaved(input, x.annualPremium);
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
                {x.quoteKind === 'sample' && <span className="badge">ราคาจากตัวอย่างของบริษัท อายุหรือเพศต่างจากคุณ</span>}
              </li>
            );
          })}
        </ul>
        <p className="small">
          <Link href={`/?${serializeShopper({ ...shopper, goal: 'tax' })}`}>ดูทุกแบบในหน้าค้นหา</Link>
        </p>
      </section>
    </div>
  );
}
