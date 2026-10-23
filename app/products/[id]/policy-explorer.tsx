'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { baht, type Product } from '../../../src/domain/product.ts';
import { quote } from '../../../src/domain/quote.ts';
import { returns, TAX_BRACKETS } from '../../../src/domain/returns.ts';
import { breakevenYear, scenarios, yearlyPositions } from '../../../src/domain/scenarios.ts';
import {
  formatBaht,
  formatPercent,
  genderLabel,
} from '../../../src/web/format.ts';
import { parseViewState, serializeViewState, type ViewState } from '../../../src/web/profile-params.ts';
import { NumberField } from '../../number-field.tsx';
import { PositionChart } from './position-chart.tsx';

export function PolicyExplorer({ product }: { product: Product }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sample = product.illustrations[0];
  const state = parseViewState(new URLSearchParams(searchParams.toString()), {
    age: sample.age,
    gender: sample.gender,
    sumAssured: 100_000,
    paymentYears: product.paymentYears,
  });
  const [showTable, setShowTable] = useState(false);

  const update = (patch: Partial<ViewState>) =>
    router.replace(`${pathname}?${serializeViewState({ ...state, ...patch })}`, { scroll: false });

  const q = quote(product, state);
  const { table } = q;
  const s = scenarios(table, state.stopYear);
  const breakeven = breakevenYear(table);
  const r = returns(table, state.bracket);

  return (
    <div className="explorer">
      <section className="panel profile">
        <h2>ข้อมูลของคุณ</h2>
        <div className="fields">
          <label>
            อายุ
            <NumberField value={state.age} min={0} max={99} onCommit={(age) => update({ age })} />
          </label>
          <label>
            เพศ
            <select
              value={state.gender}
              onChange={(e) => update({ gender: e.target.value === 'F' ? 'F' : 'M' })}
            >
              <option value="M">ชาย</option>
              <option value="F">หญิง</option>
            </select>
          </label>
          <label>
            ทุนประกัน (บาท)
            <NumberField
              value={state.sumAssured}
              min={1_000}
              max={100_000_000}
              onCommit={(sa) => update({ sumAssured: baht(sa) })}
            />
          </label>
        </div>
        <p className="premium">
          เบี้ยประกัน <strong>{formatBaht(table.annualPremium)}</strong> ต่อปี × {table.paymentYears} ปี
          = {formatBaht(table.annualPremium * table.paymentYears)}
        </p>
        {q.kind === 'sample' && (
          <p className="notice">
            ตัวเลขนี้มาจากตัวอย่างในเอกสารของบริษัท ({genderLabel[q.sampleGender]} อายุ {q.sampleAge} ปี)
            ปรับตามทุนประกันของคุณเท่านั้น อายุหรือเพศของคุณต่างจากตัวอย่าง ตัวเลขจริงของคุณจะต่างออกไป
            ขอตารางผลประโยชน์ของคุณจากบริษัทหรือตัวแทนเพื่อยืนยัน
          </p>
        )}
        {q.kind === 'exact' && (
          <p className="muted small">
            ตรงกับตารางของบริษัทสำหรับอายุและเพศของคุณ ปรับตามทุนประกันแบบสัดส่วน อาจคลาดเคลื่อนเล็กน้อยจากการปัดเศษ
          </p>
        )}
      </section>

      <section className="panel">
        <h2>ถ้าหยุดจ่ายเบี้ยหลังปีที่ {state.stopYear}</h2>
        <input
          className="slider"
          type="range"
          min={1}
          max={product.paymentYears}
          value={state.stopYear}
          onChange={(e) => update({ stopYear: Number(e.target.value) })}
          aria-label="ปีที่หยุดจ่ายเบี้ย"
        />
        <div className="slider-scale">
          {Array.from({ length: product.paymentYears }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <p className="muted small">
          จ่ายไปแล้ว {formatBaht(s.surrender.totalPremiumsPaid)} คุณเลือกได้ 1 ใน 3 ทางด้านล่าง
        </p>

        <div className="cards">
          <article className="card">
            <h3>เวนคืน รับเงินสดทันที</h3>
            <p className="big">{formatBaht(s.surrender.cash)}</p>
            <p className={s.surrender.net < 0 ? 'loss' : 'gain'}>
              {s.surrender.net < 0 ? 'ขาดทุน' : 'กำไร'} {formatBaht(Math.abs(s.surrender.net))}
            </p>
            <p className="muted small">รวมเงินคืนรายปีที่ได้รับไปแล้ว เทียบกับเบี้ยที่จ่าย ความคุ้มครองสิ้นสุด</p>
          </article>
          <article className="card">
            <h3>ใช้เงินสำเร็จ</h3>
            {s.paidUp.kind === 'available' ? (
              <>
                <p className="big">{formatBaht(s.paidUp.sumAssured)}</p>
                <p className="muted small">ทุนประกันใหม่ที่ลดลง คุ้มครองต่อจนครบสัญญาโดยไม่ต้องจ่ายเบี้ยอีก</p>
              </>
            ) : (
              <Unavailable what="ทุนประกันที่ลดลง" />
            )}
          </article>
          <article className="card">
            <h3>ขยายระยะเวลา</h3>
            {s.extendedTerm.kind === 'available' ? (
              <>
                <p className="big">
                  {s.extendedTerm.years} ปี {s.extendedTerm.days} วัน
                </p>
                <p className="muted small">
                  คุ้มครองเต็มทุนต่อโดยไม่จ่ายเบี้ย
                  {s.extendedTerm.maturityAmount > 0 &&
                    ` และรับ ${formatBaht(s.extendedTerm.maturityAmount)} เมื่อครบสัญญา`}
                </p>
              </>
            ) : (
              <Unavailable what="ระยะเวลาคุ้มครองที่ขยายได้" />
            )}
          </article>
          <article className="card">
            <h3>ถ้าเสียชีวิตในปีที่ {state.stopYear}</h3>
            <p className="big">{formatBaht(s.death.payout)}</p>
            <p className="muted small">กรณียังจ่ายเบี้ยครบถึงปีนั้น หลังหยุดจ่าย ความคุ้มครองขึ้นกับทางที่เลือกด้านบน</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>เงินที่จ่าย เทียบกับเงินที่ได้ถ้าออกตอนสิ้นปี</h2>
        <p className="muted small">
          {breakeven === null
            ? 'แบบนี้ไม่คืนทุนตามตัวเลขที่รับประกัน'
            : breakeven === table.coverageYears
              ? `คืนทุนเมื่อครบสัญญาปีที่ ${breakeven} เท่านั้น ออกก่อนหน้านั้นขาดทุน`
              : `คืนทุนตั้งแต่ปีที่ ${breakeven} ออกก่อนหน้านั้นขาดทุน`}
        </p>
        <PositionChart positions={yearlyPositions(table)} breakeven={breakeven} stopYear={state.stopYear} />
      </section>

      <section className="panel">
        <h2>ผลตอบแทนถ้าถือจนครบสัญญา</h2>
        <dl className="returns">
          <div>
            <dt>รับประกัน</dt>
            <dd className="big">{formatPercent(r.guaranteed)}</dd>
          </div>
          <div>
            <dt>รวมเงินปันผลตามตัวอย่าง (ไม่รับประกัน)</dt>
            <dd className="dashed">{formatPercent(r.withDividends)}</dd>
          </div>
          <div>
            <dt>
              รวมภาษีที่ประหยัดได้ ฐานภาษีของคุณ{' '}
              <select
                value={Math.round(state.bracket * 100)}
                onChange={(e) =>
                  update({
                    bracket: TAX_BRACKETS.find((b) => Math.round(b * 100) === Number(e.target.value)) ?? 0,
                  })
                }
              >
                {TAX_BRACKETS.map((b) => (
                  <option key={b} value={Math.round(b * 100)}>
                    {Math.round(b * 100)}%
                  </option>
                ))}
              </select>
            </dt>
            <dd>
              {r.afterTax.kind === 'eligible'
                ? formatPercent(r.afterTax.irr)
                : 'ไม่เข้าเงื่อนไขลดหย่อนภาษี (คุ้มครองน้อยกว่า 10 ปี)'}
            </dd>
          </div>
        </dl>
        <p className="muted small">
          ลดหย่อนภาษีเบี้ยประกันชีวิตได้สูงสุด 100,000 บาทต่อปี รวมทุกกรมธรรม์ ถ้าเวนคืนก่อนครบสัญญาอาจต้องคืนภาษีที่ลดหย่อนไป
        </p>
      </section>

      <section className="panel">
        <button className="link-button" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'ซ่อนตารางรายปี' : 'ดูตารางรายปีทั้งหมด'}
        </button>
        {showTable && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ปี</th>
                  <th>เบี้ย</th>
                  <th>เงินคืน</th>
                  <th>มูลค่าเวนคืน</th>
                  <th>คุ้มครองชีวิต</th>
                  <th>ปันผล (ไม่รับประกัน)</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{row.year <= table.paymentYears ? formatBaht(table.annualPremium) : '-'}</td>
                    <td>{formatBaht(row.guaranteedCashBack)}</td>
                    <td>{formatBaht(row.cashValue)}</td>
                    <td>{formatBaht(row.deathBenefit)}</td>
                    <td>{formatBaht(row.illustratedDividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">ครบสัญญารับ {formatBaht(table.maturityBenefit)}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="muted small">
      เอกสารสาธารณะของแบบนี้ไม่ระบุ{what} ดูได้ในตารางแนบท้ายกรมธรรม์ หรือสอบถามบริษัทประกัน
    </p>
  );
}
