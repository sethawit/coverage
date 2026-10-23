import { z } from 'zod';

export const BahtSchema = z.number().brand<'Baht'>();
export type Baht = z.infer<typeof BahtSchema>;
export const baht = (n: number): Baht => BahtSchema.parse(n);

export const PerThousandSchema = z.number().nonnegative().brand<'PerThousand'>();
export type PerThousand = z.infer<typeof PerThousandSchema>;

export const GenderSchema = z.enum(['M', 'F']);
export type Gender = z.infer<typeof GenderSchema>;

const IsoDate = z.iso.date();

export const ExtendedTermSchema = z.object({
  years: z.int().nonnegative(),
  days: z.int().nonnegative(),
  maturityAmount: PerThousandSchema,
});

export const IllustrationRowSchema = z.object({
  year: z.int().positive(),
  deathBenefit: PerThousandSchema,
  guaranteedCashBack: PerThousandSchema,
  illustratedDividend: PerThousandSchema,
  /** null when the public document does not print surrender values. */
  cashValue: PerThousandSchema.nullable(),
  paidUpSumAssured: PerThousandSchema.optional(),
  extendedTerm: ExtendedTermSchema.optional(),
});
export type IllustrationRow = z.infer<typeof IllustrationRowSchema>;

export const IllustrationSchema = z
  .object({
    age: z.int().min(0).max(120),
    gender: GenderSchema,
    basis: z.enum(['contractTable', 'brochureSample']),
    /** Set when the source states one rate for every age in the range and both genders. */
    sameForAges: z.object({ min: z.int().min(0), max: z.int().max(120) }).optional(),
    annualPremium: PerThousandSchema,
    maturityBenefit: PerThousandSchema,
    rows: z.array(IllustrationRowSchema),
  })
  .refine((ill) => ill.rows.every((row, i) => row.year === i + 1), {
    message: 'policy years must be contiguous from 1',
    path: ['rows'],
  })
  .refine((ill) => !ill.sameForAges || (ill.sameForAges.min <= ill.age && ill.age <= ill.sameForAges.max), {
    message: 'age must fall inside sameForAges',
    path: ['sameForAges'],
  });
export type Illustration = z.infer<typeof IllustrationSchema>;

export const ProductStatusSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('draft') }),
  z.object({ kind: z.literal('verified'), verifiedOn: IsoDate, verifiedBy: z.string().min(1) }),
  z.object({ kind: z.literal('discontinued'), on: IsoDate }),
]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const ProductSchema = z
  .object({
    id: z.string().min(1),
    insurerId: z.string().min(1),
    nameTh: z.string().min(1),
    kind: z.enum(['endowment', 'wholeLife', 'term']),
    paymentYears: z.int().positive(),
    coverageYears: z.int().positive(),
    source: z.object({
      url: z.url(),
      documentTitle: z.string().min(1),
      retrievedOn: IsoDate,
    }),
    status: ProductStatusSchema,
    illustrations: z.tuple([IllustrationSchema], IllustrationSchema),
  })
  .superRefine((p, ctx) => {
    if (p.paymentYears > p.coverageYears) {
      ctx.addIssue({
        code: 'custom',
        message: 'paymentYears must not exceed coverageYears',
        path: ['paymentYears'],
      });
    }
    const seen = new Set<string>();
    p.illustrations.forEach((ill, i) => {
      if (ill.rows.length !== p.coverageYears) {
        ctx.addIssue({
          code: 'custom',
          message: `expected ${p.coverageYears} rows, got ${ill.rows.length}`,
          path: ['illustrations', i, 'rows'],
        });
      }
      // A flat-rate table covers an age range, so it may sit beside the worked example for one age inside it.
      const key = ill.sameForAges ? `${ill.sameForAges.min}-${ill.sameForAges.max}` : `${ill.age}${ill.gender}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate illustration for ${key}`,
          path: ['illustrations', i],
        });
      }
      seen.add(key);
    });
  });
export type Product = z.infer<typeof ProductSchema>;
