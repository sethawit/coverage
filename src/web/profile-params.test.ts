import { describe, expect, it } from 'vitest';
import { parseViewState, serializeViewState } from './profile-params.ts';

const defaults = { age: 35, gender: 'M' as const, sumAssured: 100_000, paymentYears: 5 };

describe('view state in the URL', () => {
  it('falls back to the brochure example when the URL is empty', () => {
    expect(parseViewState(new URLSearchParams(), defaults)).toEqual({
      age: 35,
      gender: 'M',
      sumAssured: 100_000,
      bracket: 0,
      stopYear: 5,
    });
  });

  it('round-trips a full profile', () => {
    const state = parseViewState(new URLSearchParams('age=28&sex=F&sa=500000&tax=20&stop=2'), defaults);
    expect(state).toEqual({ age: 28, gender: 'F', sumAssured: 500_000, bracket: 0.2, stopYear: 2 });
    expect(parseViewState(new URLSearchParams(serializeViewState(state)), defaults)).toEqual(state);
  });

  it('ignores junk and out-of-range values instead of trusting them', () => {
    const state = parseViewState(
      new URLSearchParams('age=-3&sex=X&sa=12.5&tax=17&stop=9'),
      defaults,
    );
    expect(state).toEqual({ age: 35, gender: 'M', sumAssured: 100_000, bracket: 0, stopYear: 5 });
  });
});
