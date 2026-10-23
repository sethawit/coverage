'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { baht, type Product } from '../../../src/domain/product.ts';
import { quote } from '../../../src/domain/quote.ts';
import { returns, TAX_BRACKETS } from '../../../src/domain/returns.ts';
import { breakeven as findBreakeven, scenarios, yearlyPositions } from '../../../src/domain/scenarios.ts';
import { formatBaht, formatPercent, genderLabel, UNPUBLISHED } from '../../../src/web/format.ts';
import { GLOSSARY, plainStory } from '../../../src/web/plain.ts';
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
  const breakeven = findBreakeven(table);
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
            <span className="hint">ตัวเลขตั้งต้นที่ใช้คิดทุกอย่าง ยิ่งสูงเบี้ยยิ่งแพง</span>
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

      <section className="panel plain">
        <h2>สรุปแบบเข้าใจง่าย</h2>
        <dl>
          {plainStory(table, breakeven, r.guaranteed).map((p) => (
            <div key={p.title}>
              <dt>{p.title}</dt>
              <dd>{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel">
        <h2>ถ้าจ่ายไป {state.stopYear} ปีแล้วไม่อยากจ่ายต่อ</h2>
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
          จ่ายไปแล้ว {formatBaht(s.surrender.totalPremiumsPaid)} เลื่อนแถบด้านบนเพื่อเปลี่ยนปี ทางเลือกที่มีคือ
        </p>

        <div className="cards">
          <article className="card">
            <h3>เลิกเลย รับเงินก้อนคืน</h3>
            <p className="term">ศัพท์บริษัท: เวนคืนกรมธรรม์</p>
            {s.surrender.kind === 'available' ? (
              <>
                <p className="big">{formatBaht(s.surrender.cash)}</p>
                <p className={s.surrender.net < 0 ? 'loss' : 'gain'}>
                  {s.surrender.net < 0 ? 'ขาดทุน' : 'กำไร'} {formatBaht(Math.abs(s.surrender.net))}
                </p>
                <p className="muted small">นับรวมเงินคืนที่ได้ระหว่างทางแล้ว เทียบกับเบี้ยที่จ่ายไป หลังเลิก ไม่คุ้มครองชีวิตอีก</p>
              </>
            ) : (
              <Unavailable what="เงินที่ได้ถ้าเลิก" />
            )}
          </article>
          <article className="card">
            <h3>หยุดจ่าย แต่ยังคุ้มครองต่อด้วยทุนที่ลดลง</h3>
            <p className="term">ศัพท์บริษัท: ใช้เงินสำเร็จ</p>
            {s.paidUp.kind === 'available' ? (
              <>
                <p className="big">{formatBaht(s.paidUp.sumAssured)}</p>
                <p className="muted small">ทุนใหม่หลังลด คุ้มครองต่อจนครบสัญญาโดยไม่ต้องจ่ายอีก</p>
              </>
            ) : (
              <Unavailable what="ทุนที่เหลือถ้าหยุดจ่าย" />
            )}
          </article>
          <article className="card">
            <h3>หยุดจ่าย คุ้มครองเต็มทุนแต่สั้นลง</h3>
            <p className="term">ศัพท์บริษัท: ขยายระยะเวลา</p>
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
              <Unavailable what="ระยะเวลาที่ยังคุ้มครองได้" />
            )}
          </article>
          <article className="card">
            <h3>ถ้าเสียชีวิตในปีที่ {state.stopYear}</h3>
            <p className="term">ครอบครัวได้</p>
            <p className="big">{formatBaht(s.death.payout)}</p>
            <p className="muted small">กรณียังจ่ายเบี้ยอยู่ ถ้าหยุดจ่ายแล้ว เงินส่วนนี้ขึ้นกับทางที่เลือก</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2>ถ้าเลิกแต่ละปี ได้คืนเท่าไรเทียบกับที่จ่ายไป</h2>
        <p className="muted small">
          {breakeven.kind === 'never'
            ? 'เลิกปีไหนก็ได้คืนน้อยกว่าที่จ่าย'
            : breakeven.kind === 'unknown'
              ? `บริษัทไม่บอกในหน้าเว็บว่าเลิกแต่ละปีได้คืนเท่าไร จึงไม่รู้ว่าเลิกก่อนครบสัญญาแล้วขาดทุนเท่าไร${
                  breakeven.byYear === null ? '' : ` ได้คืนครบที่จ่ายอย่างช้าปีที่ ${breakeven.byYear}`
                } ขอตัวเลขนี้จากตัวแทนก่อนซื้อ`
              : breakeven.year === table.coverageYears
                ? `ได้คืนครบที่จ่ายเมื่อถือจนครบ ${breakeven.year} ปีเท่านั้น เลิกก่อนหน้านั้นขาดทุน`
                : `ได้คืนครบที่จ่ายตั้งแต่ปีที่ ${breakeven.year} เลิกก่อนหน้านั้นขาดทุน`}
        </p>
        <PositionChart positions={yearlyPositions(table)} breakeven={breakeven} stopYear={state.stopYear} />
      </section>

      <section className="panel">
        <h2>ถ้าถือจนครบ คิดเป็นดอกเบี้ยปีละเท่าไร</h2>
        <p className="muted small">เทียบกับเอาเงินก้อนเดียวกันไปฝากที่ให้ดอกเบี้ยทบต้น ใช้เทียบกับเงินฝากหรือแบบอื่นได้</p>
        <dl className="returns">
          <div>
            <dt>ที่บริษัทรับประกันว่าได้แน่</dt>
            <dd className="big">{formatPercent(r.guaranteed)}</dd>
          </div>
          <div>
            <dt>ถ้าได้เงินปันผลตามตัวอย่าง (ไม่รับประกัน อาจไม่ได้)</dt>
            <dd className="dashed">{formatPercent(r.withDividends)}</dd>
          </div>
          <div>
            <dt>
              รวมภาษีที่ได้คืน ถ้าคุณเสียภาษีขั้น{' '}
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
                : 'ลดหย่อนภาษีไม่ได้ (สัญญาสั้นกว่า 10 ปี)'}
            </dd>
          </div>
        </dl>
        <p className="muted small">
          เบี้ยประกันชีวิตลดหย่อนภาษีได้ รวมทุกกรมธรรม์ไม่เกินปีละ 100,000 บาท ถ้าเลิกก่อนครบสัญญาอาจต้องคืนภาษีที่ลดไป
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
                  <th>ได้คืนปีนั้น</th>
                  <th>ได้ถ้าเลิกปีนั้น</th>
                  <th>ครอบครัวได้ถ้าเสียชีวิต</th>
                  <th>ปันผล (ไม่รับประกัน)</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{row.year <= table.paymentYears ? formatBaht(table.annualPremium) : '-'}</td>
                    <td>{formatBaht(row.guaranteedCashBack)}</td>
                    <td>{row.cashValue === null ? '-' : formatBaht(row.cashValue)}</td>
                    <td>{formatBaht(row.deathBenefit)}</td>
                    <td>{formatBaht(row.illustratedDividend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small">
              ครบสัญญารับ {formatBaht(table.maturityBenefit)}
              {table.rows.some((r) => r.cashValue === null) && ` · "-" คือ${UNPUBLISHED}`}
            </p>
          </div>
        )}
      </section>

      <details className="panel glossary">
        <summary>ศัพท์ประกันที่ตัวแทนมักใช้ แปลเป็นภาษาง่าย ๆ</summary>
        <dl>
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>{g.term}</dt>
              <dd>{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="muted small">
      หน้าเว็บของบริษัทไม่บอก{what} ขอตัวเลขจากตัวแทน หรือดูตารางท้ายกรมธรรม์
    </p>
  );
}
