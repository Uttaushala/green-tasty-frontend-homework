import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DishCardComponent } from './dish-card.component';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { DishState } from '@app/models/enums/dish-state.model';

describe('DishCardComponent', () => {
  let component: DishCardComponent;
  let fixture: ComponentFixture<DishCardComponent>;

  const dish: DishListResponse = {
    id: 'dish-1',
    name: 'Khachapuri',
    imageUrl: 'assets/img/dish.png',
    price: 15,
    state: DishState.Available,
    weight: '350 g',
    dishType: 'MainCourse',
    description: 'Georgian cheese bread',
    calories: '500',
    proteins: '20',
    carbohydrates: '45',
    fats: '25',
    vitamins: 'A, B',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DishCardComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('dish', dish);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the full view on card click even in pre-order mode', () => {
    fixture.componentRef.setInput('preOrderEnabled', true);
    fixture.detectChanges();
    spyOn(component.dishClicked, 'emit');

    component.onCardClicked();

    expect(component.dishClicked.emit).toHaveBeenCalled();
  });

  it('pre-order button does not open the full view', () => {
    spyOn(component.dishClicked, 'emit');
    spyOn(component.preOrderClicked, 'emit');
    const event = new Event('click');

    component.onPreOrderClicked(event);

    expect(component.preOrderClicked.emit).toHaveBeenCalled();
    expect(component.dishClicked.emit).not.toHaveBeenCalled();
  });

  it('shows the Sold Out badge for an unavailable dish', () => {
    fixture.componentRef.setInput('dish', { ...dish, state: DishState.OutOfStock });
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.status-badge');

    expect(badge?.textContent?.trim()).toBe('Sold Out');
  });

  ['Out of stock', 'On stop', 'OutOfStock', 'out-of-stock'].forEach((state) => {
    it(`treats the API state "${state}" as Sold Out`, () => {
      fixture.componentRef.setInput('dish', { ...dish, state });
      fixture.detectChanges();

      expect(component.isUnavailable()).toBeTrue();
    });
  });

  it('keeps an Available dish orderable', () => {
    expect(component.isUnavailable()).toBeFalse();
  });

  it('does not open the full view for an unavailable dish', () => {
    fixture.componentRef.setInput('dish', { ...dish, state: DishState.OnStop });
    fixture.detectChanges();
    spyOn(component.dishClicked, 'emit');

    component.onCardClicked();

    expect(component.dishClicked.emit).not.toHaveBeenCalled();
  });
});
