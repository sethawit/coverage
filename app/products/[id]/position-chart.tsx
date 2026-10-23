'use client';

import type { Breakeven, YearPosition } from '../../../src/domain/scenarios.ts';
import { formatBaht } from '../../../src/web/format.ts';
import { useWidth } from '../../use-width.ts';

const PAD = { top: 16, right: 8, bottom: 28, left: 8 };

type Props = { positions: YearPosition[]; breakeven: Breakeven; stopYear: number };

export function PositionChart({ positions, breakeven, stopYear }: Props) {
  const [ref, W] = useWidth<HTMLElement>(640);
  const H = W < 560 ? 200 : 260;
  const max = Math.max(...positions.flatMap((p) => [p.premiumsPaid, p.moneyOut ?? 0]));
  const breakevenYear = breakeven.kind === 'year' ? breakeven.year : null;
  const slot = (W - PAD.left - PAD.right) / positions.length;
  const barW = slot * 0.36;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH * (1 - v / max);

  return (
    <figure className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="เบี้ยที่จ่ายสะสม เทียบกับเงินที่ได้ถ้าออกตอนสิ้นปี">
        {positions.map((p, i) => {
          const x = PAD.left + i * slot;
          const inLoss =
            breakeven.kind === 'never' || (breakeven.kind === 'year' && p.year < breakeven.year);
          return (
            <g key={p.year}>
              {inLoss && <rect x={x} y={PAD.top} width={slot} height={plotH} className="loss-zone" />}
              {p.year === stopYear && (
                <rect x={x} y={PAD.top} width={slot} height={plotH} className="stop-marker" />
              )}
              <rect
                x={x + slot / 2 - barW - 1}
                y={y(p.premiumsPaid)}
                width={barW}
                height={plotH - (y(p.premiumsPaid) - PAD.top)}
                className="bar-paid"
              >
                <title>ปีที่ {p.year} จ่ายแล้ว {formatBaht(p.premiumsPaid)}</title>
              </rect>
              {p.moneyOut === null ? (
                <text x={x + slot / 2 + 1 + barW / 2} y={PAD.top + plotH - 4} textAnchor="middle" className="axis">
                  ?<title>ปีที่ {p.year} บริษัทไม่บอกว่าเลิกปีนี้ได้คืนเท่าไร</title>
                </text>
              ) : (
                <rect
                  x={x + slot / 2 + 1}
                  y={y(p.moneyOut)}
                  width={barW}
                  height={plotH - (y(p.moneyOut) - PAD.top)}
                  className={inLoss ? 'bar-out loss' : 'bar-out'}
                >
                  <title>ปีที่ {p.year} ได้คืน {formatBaht(p.moneyOut)}</title>
                </rect>
              )}
              {(slot >= 28 || p.year === breakevenYear || (p.year % 2 === 1 && (breakevenYear === null || Math.abs(p.year - breakevenYear) > 1))) && (
                <text x={x + slot / 2} y={H - 8} textAnchor="middle" className="axis">
                  {p.year === breakevenYear ? `${p.year} ✓` : p.year}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span><i className="swatch paid" /> เบี้ยที่จ่ายสะสม</span>
        <span><i className="swatch out" /> ได้คืนรวมถ้าเลิกปีนั้น</span>
        <span><i className="swatch zone" /> ช่วงที่เลิกแล้วขาดทุน</span>
        {positions.some((p) => p.moneyOut === null) && <span>? บริษัทไม่บอกว่าเลิกปีนั้นได้คืนเท่าไร</span>}
      </figcaption>
    </figure>
  );
}
