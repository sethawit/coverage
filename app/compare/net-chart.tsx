import type { Summary } from '../../src/web/discovery.ts';
import { formatBaht } from '../../src/web/format.ts';

const W = 640;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };
const compact = new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 });

/** One line per product: money out minus premiums paid, by the policy year you leave at. */
export function NetChart({ series }: { series: Summary[] }) {
  const lines = series.map((x) => ({
    id: x.product.id,
    name: x.product.nameTh,
    points: x.positions.flatMap((p) =>
      p.moneyOut === null ? [] : [{ year: p.year, net: p.moneyOut - p.premiumsPaid }],
    ),
  }));
  const years = Math.max(...series.map((x) => x.positions.length));
  const nets = lines.flatMap((l) => l.points.map((p) => p.net));
  const lo = Math.min(0, ...nets);
  const hi = Math.max(0, ...nets);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (year: number) => PAD.left + ((year - 1) / Math.max(years - 1, 1)) * plotW;
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo || 1)) * plotH;
  const ticks = [lo, lo / 2, 0, hi / 2, hi].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="กำไรหรือขาดทุนถ้าออกตอนสิ้นแต่ละปี">
        <rect x={PAD.left} y={y(0)} width={plotW} height={y(lo) - y(0)} className="loss-zone" />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? 'zero-line' : 'grid-line'} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="axis">
              {compact.format(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: years }, (_, i) => (
          <text key={i} x={x(i + 1)} y={H - 8} textAnchor="middle" className="axis">
            {i + 1}
          </text>
        ))}
        {lines.map((l, i) => (
          <g key={l.id} className={`series s${i + 1}`}>
            {runs(l.points).map((run) => (
              <polyline key={run[0]?.year} points={run.map((p) => `${x(p.year)},${y(p.net)}`).join(' ')} />
            ))}
            {l.points.map((p) => (
              <circle key={p.year} cx={x(p.year)} cy={y(p.net)} r={4}>
                <title>
                  {l.name} ออกหลังปีที่ {p.year}: {p.net < 0 ? 'ขาดทุน' : 'กำไร'} {formatBaht(Math.abs(p.net))}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="legend">
        {lines.map((l, i) => (
          <span key={l.id}>
            <i className={`swatch s${i + 1}`} /> {l.name}
          </span>
        ))}
        <span>
          <i className="swatch zone" /> ช่วงขาดทุน
        </span>
        <span>แกนนอนคือปีที่ออก แตะจุดเพื่อดูตัวเลข ปีที่ไม่มีจุดคือบริษัทไม่เปิดเผยมูลค่าเวนคืน</span>
      </figcaption>
    </figure>
  );
}

/** Splits points into runs of consecutive years, so a year with no published value leaves a gap in the line. */
function runs<P extends { year: number }>(points: P[]): P[][] {
  const out: P[][] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last.at(-1)!.year === p.year - 1) last.push(p);
    else out.push([p]);
  }
  return out;
}
