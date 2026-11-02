import { PricePipe } from './price.pipe';

describe('PricePipe', () => {
  const pipe = new PricePipe();

  const cases: [number | null | undefined, string][] = [
    [17, '$17'],
    [0, '$0'],
    [18.99, '$18.99'],
    [22.5, '$22.50'],
    [1234.5, '$1,234.50'],
    [null, ''],
    [undefined, ''],
  ];

  cases.forEach(([input, expected]) => {
    it(`formats ${input} as "${expected}"`, () => {
      expect(pipe.transform(input)).toBe(expected);
    });
  });
});
