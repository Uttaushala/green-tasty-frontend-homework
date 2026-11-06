import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { dedupeDishesByName, normalizeDish, RawDishResponse, withUnit } from './dish-response.mapper';

const baseDish: DishListResponse = {
  id: 'd1',
  name: 'Spring Salad',
  imageUrl: '',
  price: 17,
  state: 'Available',
  weight: '430 g',
  dishType: 'Appetizer',
  description: '',
  calories: '400 kcal',
  proteins: '12 g',
  carbohydrates: '42 g',
  fats: '',
  vitamins: 'A, C',
};

describe('normalizeDish', () => {
  it('takes fats from the capitalised Fats field the API sends', () => {
    const raw = { ...baseDish, Fats: '28 g' } as Partial<RawDishResponse>;
    delete raw.fats;
    expect(normalizeDish(raw as RawDishResponse).fats).toBe('28 g');
  });

  it('keeps fats when the API already sends it in camelCase', () => {
    expect(normalizeDish({ ...baseDish, fats: '9 g' }).fats).toBe('9 g');
  });

  it('does not leak the Fats key into the model', () => {
    const raw = { ...baseDish, Fats: '28 g' } as RawDishResponse;
    expect('Fats' in normalizeDish(raw)).toBeFalse();
  });
});

describe('dedupeDishesByName', () => {
  it('keeps only the first copy of a dish that exists once per location', () => {
    const copies = [
      { ...baseDish, id: 'loc1-spring' },
      { ...baseDish, id: 'loc2-spring' },
      { ...baseDish, id: 'loc1-tart', name: 'Citrus Blackberry Tart' },
    ];
    expect(dedupeDishesByName(copies).map((dish) => dish.id)).toEqual(['loc1-spring', 'loc1-tart']);
  });

  it('treats names that differ only in case or spacing as the same dish', () => {
    const copies = [baseDish, { ...baseDish, id: 'd2', name: ' spring salad ' }];
    expect(dedupeDishesByName(copies).length).toBe(1);
  });

  it('returns an empty list for no dishes', () => {
    expect(dedupeDishesByName([])).toEqual([]);
  });
});

describe('withUnit', () => {
  const cases: [string | null | undefined, string, string][] = [
    ['540', 'kcal', '540 kcal'],
    ['540 kcal', 'kcal', '540 kcal'],
    ['18-20g', 'g', '18-20g'],
    ['', 'g', ''],
    [null, 'g', ''],
    [undefined, 'kcal', ''],
  ];

  cases.forEach(([value, unit, expected]) => {
    it(`turns "${value}" + ${unit} into "${expected}"`, () => {
      expect(withUnit(value, unit)).toBe(expected);
    });
  });
});
