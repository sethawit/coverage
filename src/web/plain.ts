import type { QuotedTable } from '../domain/quote.ts';
import type { Breakeven } from '../domain/scenarios.ts';
import { formatBaht } from './format.ts';

export type PlainPoint = { title: string; text: string };

const percent = (rate: number) => `${(rate * 100).toFixed(2)}%`;

/** The policy told as what a buyer pays and gets back, with no insurance vocabulary. */
export function plainStory(table: QuotedTable, breakeven: Breakeven, guaranteedIrr: number | null): PlainPoint[] {
  const paid = table.annualPremium * table.paymentYears;
  const cashBacks = table.rows.filter((r) => r.guaranteedCashBack > 0);
  const cashBackTotal = cashBacks.reduce((sum, r) => sum + r.guaranteedCashBack, 0);
  const back = cashBackTotal + table.maturityBenefit;
  const gain = back - paid;
  const deaths = table.rows.map((r) => r.deathBenefit);
  const [minDeath, maxDeath] = [Math.min(...deaths), Math.max(...deaths)];

  const points: PlainPoint[] = [
    {
      title: 'คุณจ่าย',
      text: `ปีละ ${formatBaht(table.annualPremium)} ติดกัน ${table.paymentYears} ปี รวม ${formatBaht(paid)}`,
    },
    {
      title: 'คุณได้คืน',
      text:
        (cashBacks.length > 0
          ? `ระหว่างทางได้เงินคืน ${cashBacks.length} ครั้ง รวม ${formatBaht(cashBackTotal)} แล้ว`
          : 'ระหว่างทางไม่ได้เงินคืน ') +
        `ครบ ${table.coverageYears} ปีได้ก้อนสุดท้าย ${formatBaht(table.maturityBenefit)} รวมทั้งหมด ${formatBaht(back)}`,
    },
    {
      title: 'ถ้าถือจนครบ',
      text:
        gain >= 0
          ? `ได้มากกว่าที่จ่าย ${formatBaht(gain)}` +
            (guaranteedIrr === null
              ? ''
              : ` เท่ากับเอาเงินไปฝากที่ให้ดอกเบี้ยทบต้นปีละ ${percent(guaranteedIrr)} ตลอด ${table.coverageYears} ปี`)
          : `ได้คืนน้อยกว่าที่จ่าย ${formatBaht(-gain)} แบบนี้เน้นความคุ้มครองชีวิต ไม่ได้เน้นเก็บเงิน`,
    },
    {
      title: 'ถ้าเสียชีวิตก่อนครบสัญญา',
      text:
        minDeath === maxDeath
          ? `ครอบครัวได้ ${formatBaht(minDeath)} แล้วสัญญาจบ`
          : `ครอบครัวได้ ${formatBaht(minDeath)} ถึง ${formatBaht(maxDeath)} แล้วแต่ว่าเสียชีวิตปีไหน แล้วสัญญาจบ`,
    },
    { title: 'ถ้าเลิกกลางทาง', text: quitText(breakeven, table.coverageYears) },
  ];
  if (table.coverageYears >= 10) {
    points.push({
      title: 'ภาษี',
      text: 'เบี้ยที่จ่ายนำไปลดหย่อนภาษีได้ รวมทุกกรมธรรม์ไม่เกินปีละ 100,000 บาท แต่ถ้าเลิกก่อนครบสัญญาอาจต้องคืนภาษีที่ลดไป',
    });
  }
  return points;
}

function quitText(b: Breakeven, coverageYears: number): string {
  switch (b.kind) {
    case 'never':
      return 'เลิกปีไหนก็ได้คืนน้อยกว่าที่จ่ายไป';
    case 'year':
      return b.year === coverageYears
        ? `ต้องถือจนครบ ${coverageYears} ปีเท่านั้นถึงจะไม่ขาดทุน เลิกก่อนหน้านั้นได้คืนน้อยกว่าที่จ่าย`
        : `ต้องถืออย่างน้อย ${b.year} ปีถึงจะได้คืนไม่น้อยกว่าที่จ่าย เลิกก่อนหน้านั้นได้คืนน้อยกว่าที่จ่าย`;
    case 'unknown':
      return 'บริษัทไม่บอกในหน้าเว็บว่าเลิกกลางทางได้คืนเท่าไร ให้คิดไว้ก่อนว่าได้คืนน้อยกว่าที่จ่าย และขอตัวเลขจากตัวแทนก่อนซื้อ';
  }
}

/** Words an agent or brochure will use, each said in plain Thai. */
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: 'ทุนประกัน', meaning: 'ตัวเลขตั้งต้นที่บริษัทใช้คิดทุกอย่าง ทั้งเบี้ย เงินคืน และเงินที่ครอบครัวได้ ยิ่งทุนสูง เบี้ยยิ่งแพง' },
  { term: 'เบี้ยประกัน', meaning: 'เงินที่คุณจ่ายให้บริษัททุกปี' },
  { term: 'เงินคืนระหว่างสัญญา', meaning: 'เงินที่บริษัทจ่ายคืนให้คุณระหว่างทาง ก่อนครบสัญญา' },
  { term: 'เงินครบกำหนดสัญญา', meaning: 'เงินก้อนสุดท้ายที่ได้เมื่อถือจนครบปีที่ตกลงไว้' },
  { term: 'เวนคืนกรมธรรม์', meaning: 'ยกเลิกประกันกลางทางแล้วรับเงินก้อนคืน มักได้น้อยกว่าที่จ่ายไป โดยเฉพาะช่วงปีแรก ๆ' },
  { term: 'มูลค่าเวนคืน', meaning: 'จำนวนเงินที่จะได้ถ้ายกเลิกในปีนั้น' },
  { term: 'ใช้เงินสำเร็จ', meaning: 'หยุดจ่ายเบี้ย แต่ยังคุ้มครองต่อจนครบสัญญา โดยทุนประกันลดลง' },
  { term: 'ขยายระยะเวลา', meaning: 'หยุดจ่ายเบี้ย ยังคุ้มครองเต็มทุนเท่าเดิม แต่คุ้มครองได้สั้นลง' },
  { term: 'เงินปันผล', meaning: 'เงินพิเศษที่บริษัทอาจจ่ายถ้าบริษัททำกำไรได้ดี ไม่รับประกัน อาจไม่ได้เลย' },
  { term: 'ผลตอบแทน (IRR)', meaning: 'กำไรที่ได้ คิดออกมาเป็นดอกเบี้ยต่อปี เพื่อเทียบกับการฝากเงินหรือแบบอื่นได้' },
];
