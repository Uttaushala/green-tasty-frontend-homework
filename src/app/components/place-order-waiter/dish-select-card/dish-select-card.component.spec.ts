import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishSelectCardComponent } from './dish-select-card.component';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

describe('DishSelectCardComponent', () => {
  let fixture: ComponentFixture<DishSelectCardComponent>;

  const dish: DishListResponse = {
    id: 'dish-1',
    name: 'Spring Salad',
    imageUrl: 'spring.png',
    price: 19,
    state: 'Available',
    weight: '280 g',
    dishType: 'Appetizers',
    description: 'Fresh greens',
    calories: '300',
    proteins: '10',
    carbohydrates: '20',
    fats: '5',
    vitamins: 'C',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishSelectCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DishSelectCardComponent);
    fixture.componentRef.setInput('dish', dish);
    fixture.detectChanges();
  });

  it('shows the dish name', () => {
    expect(fixture.nativeElement.textContent).toContain('Spring Salad');
  });
});
