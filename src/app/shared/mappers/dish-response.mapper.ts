import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

/** The dishes API serialises fats as `Fats` (capital F); everything else is camelCase. */
export type RawDishResponse = DishListResponse & { Fats?: string };

export function normalizeDish(raw: RawDishResponse): DishListResponse {
  const { Fats, ...dish } = raw;
  return { ...dish, fats: dish.fats ?? Fats ?? '' };
}

export function normalizeDishes(raw: RawDishResponse[]): DishListResponse[] {
  return raw.map(normalizeDish);
}

/** Appends a unit only when the API value does not carry one already ("540 kcal" vs "540"). */
export function withUnit(value: string | null | undefined, unit: string): string {
  const text = (value ?? '').trim();
  if (!text) {
    return '';
  }
  return /[a-z]/i.test(text) ? text : `${text} ${unit}`;
}
