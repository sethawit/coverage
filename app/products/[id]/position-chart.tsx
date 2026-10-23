import type { YearPosition } from '../../../src/domain/scenarios.ts';
import { formatBaht } from '../../../src/web/format.ts';

const W = 640;
const H = 260;
const PAD = { top: 16, right: 8, bottom: 28, left: 8 };

type Props = { positions: YearPosition[]; breakeven: number | null; stopYear: number };

export function PositionChart({ positions, breakeven, stopYear }: Props) {
  const max = Math.max(...positions.flatMap((p) => [p.premiumsPaid, p.moneyOut]));
  const slot = (W - PAD.left - PAD.right) / positions.length;
  const barW = slot * 0.36;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH * (1 - v / max);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="เบี้ยที่จ่ายสะสม เทียบกับเงินที่ได้ถ้าออกตอนสิ้นปี">
        {positions.map((p, i) => {
          const x = PAD.left + i * slot;
          const inLoss = breakeven === null || p.year < breakeven;
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
              <rect
                x={x + slot / 2 + 1}
                y={y(p.moneyOut)}
                width={barW}
                height={plotH - (y(p.moneyOut) - PAD.top)}
                className={inLoss ? 'bar-out loss' : 'bar-out'}
              >
                <title>ปีที่ {p.year} ได้คืน {formatBaht(p.moneyOut)}</title>
              </rect>
              <text x={x + slot / 2} y={H - 8} textAnchor="middle" className="axis">
                {p.year === breakeven ? `${p.year} ✓` : p.year}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span><i className="swatch paid" /> เบี้ยที่จ่ายสะสม</span>
        <span><i className="swatch out" /> ได้คืนถ้าออก (เงินคืนที่รับแล้ว + มูลค่าเวนคืน หรือเงินครบสัญญา)</span>
        <span><i className="swatch zone" /> ช่วงขาดทุน</span>
      </figcaption>
    </figure>
  );
}
