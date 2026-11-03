import { DishSort } from '@app/models/enums/dish-sort.model';
import { DishState } from '@app/models/enums/dish-state.model';
import { DishType } from '@app/models/enums/dish-type.model';

export const DishTypeLabels: Record<DishType, string> = {
  [DishType.Appetizer]: 'Appetizers',
  [DishType.MainCourse]: 'Main Courses',
  [DishType.Dessert]: 'Desserts',
};

export const DishSortingLabels: Record<DishSort, string> = {
  [DishSort.PriceDescending]: 'Price: High to Low',
  [DishSort.PriceAscending]: 'Price: Low to High',
  [DishSort.PopularityDescending]: 'Popular First',
  [DishSort.PopularityAscending]: 'Least Popular First',
};

export const DishStateLabels: Record<DishState, string> = {
  [DishState.OnStop]: 'On Stop',
  [DishState.Available]: 'Available',
  [DishState.OutOfStock]: 'Out Of Stock',
};
