const bahtFormat = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

export const formatBaht = (n: number) => `${bahtFormat.format(Math.round(n))} บาท`;

export const formatPercent = (rate: number | null) =>
  rate === null ? 'คำนวณไม่ได้' : `${(rate * 100).toFixed(2)}% ต่อปี`;

export const genderLabel = { M: 'ชาย', F: 'หญิง' } as const;
