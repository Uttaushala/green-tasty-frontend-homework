import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

import { DishModalComponent } from './dish-modal.component';

describe('DishModalComponent', () => {
  let component: DishModalComponent;
  let fixture: ComponentFixture<DishModalComponent>;

  const dish: DishListResponse = {
    id: 'dish-1',
    name: 'Fresh Strawberry Mint Salad',
    imageUrl: 'assets/img/dish.png',
    price: 15,
    state: 'Available',
    weight: '430g',
    dishType: 'Appetizer',
    description: 'Strawberries, spinach, mint leaves',
    calories: '~503',
    proteins: '18-20g',
    carbohydrates: '30-35g',
    fats: '33-35',
    vitamins: 'Vit C, Vit A',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DishModalComponent);
    component = fixture.componentInstance;
    component.dish = dish;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the dish name and the price without trailing zeros', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.dish-name')?.textContent).toContain('Fresh Strawberry Mint Salad');
    expect(host.querySelector('.price-value')?.textContent?.trim()).toBe('$15');
  });

  it('has no Pre-order button outside pre-order mode', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).not.toContain('Pre-order');
  });

  it('emits preOrder from the Pre-order button in pre-order mode', () => {
    component.preOrderEnabled = true;
    fixture.detectChanges();
    spyOn(component.preOrder, 'emit');

    const button = (fixture.nativeElement as HTMLElement).querySelector('.button--primary') as HTMLButtonElement;
    button.click();

    expect(component.preOrder.emit).toHaveBeenCalled();
  });

  it('emits closed from the close button', () => {
    spyOn(component.closed, 'emit');

    ((fixture.nativeElement as HTMLElement).querySelector('.close-button') as HTMLButtonElement).click();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
