import type { Breakeven } from '../domain/scenarios.ts';

const bahtFormat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

export const formatBaht = (n: number) => `${bahtFormat.format(Math.round(n))} บาท`;

export const formatPercent = (rate: number | null) =>
  rate === null ? 'คำนวณไม่ได้' : `${(rate * 100).toFixed(2)}% ต่อปี`;

export const genderLabel = { M: 'ชาย', F: 'หญิง' } as const;

export const UNPUBLISHED = 'ไม่เปิดเผยในเอกสารสาธารณะ ขอจากบริษัท';

/** When leaving stops losing money, as a short phrase for lists and tables. */
export function breakevenLabel(b: Breakeven, coverageYears: number): string {
  switch (b.kind) {
    case 'never':
      return 'ไม่คืนทุน';
    case 'year':
      return b.year === coverageYears ? `เมื่อครบสัญญาปีที่ ${b.year}` : `ตั้งแต่ปีที่ ${b.year}`;
    case 'unknown':
      return b.byYear === null ? 'ไม่ทราบ' : `อย่างช้าปีที่ ${b.byYear}`;
  }
}
