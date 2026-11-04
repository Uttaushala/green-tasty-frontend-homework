import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { Order, WaiterPreOrderState } from '@app/models/orders/order.model';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { WaiterPreOrderPageComponent } from './waiter-pre-order-page.component';

const caesar = {
  id: 'dish1',
  name: 'Caesar Salad',
  price: 180,
  imageUrl: 'caesar.jpg',
  state: 'Available',
  weight: '250 g',
  dishType: 'MainCourse',
  description: '',
  calories: '',
  proteins: '',
  carbohydrates: '',
  fats: '',
  vitamins: '',
};
const tomYum = { ...caesar, id: 'dish2', name: 'Tom Yum' };

const NAV_STATE: WaiterPreOrderState = {
  reservationId: 'res-1',
  createdByName: 'Jasmine Smith',
  createdByRole: 'Customer',
  tableName: '4',
  locationAddress: 'Rustaveli Avenue 48',
  startTime: '2026-11-04T10:45:00Z',
  endTime: '2026-11-04T12:15:00Z',
  guestCount: 2,
};

describe('WaiterPreOrderPageComponent', () => {
  let fixture: ComponentFixture<WaiterPreOrderPageComponent>;
  let preOrdersService: jasmine.SpyObj<PreOrdersService>;
  let toastService: jasmine.SpyObj<ToastService>;

  function create(order: Order) {
    preOrdersService = jasmine.createSpyObj<PreOrdersService>('PreOrdersService', [
      'getByReservationId',
      'confirmDishInOrder',
      'rejectDishInOrder',
    ]);
    preOrdersService.getByReservationId.and.returnValue(of(order));
    toastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [WaiterPreOrderPageComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: PreOrdersService, useValue: preOrdersService },
        { provide: ToastService, useValue: toastService },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    fixture = TestBed.createComponent(WaiterPreOrderPageComponent);
    const component = fixture.componentInstance;
    sessionStorage.setItem('waiterPreOrderData', JSON.stringify(NAV_STATE));
    fixture.detectChanges();
    return { fixture, component };
  }

  afterEach(() => sessionStorage.removeItem('waiterPreOrderData'));

  it('loads the pre-order and shows the per-dish review state from the server', async () => {
    const order: Order = {
      orderId: 'order-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 4, 2026, 10:45 AM',
      reservationId: 'res-1',
      status: 3,
      orderItems: [{ dish: caesar, quantity: 1, state: 0 }],
    };
    const { component } = create(order);
    await fixture.whenStable();

    expect(component.orderItems.length).toBe(1);
    expect(component.viewMode()).toBeFalse();
  });

  it('confirming the only dish locks the page into view mode and notifies the waiter', async () => {
    const order: Order = {
      orderId: 'order-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 4, 2026, 10:45 AM',
      reservationId: 'res-1',
      status: 3,
      orderItems: [{ dish: caesar, quantity: 1, state: 0 }],
    };
    const { component } = create(order);
    await fixture.whenStable();
    preOrdersService.confirmDishInOrder.and.returnValue(of({}));

    component.confirmDish('dish1');

    expect(preOrdersService.confirmDishInOrder).toHaveBeenCalledWith('res-1', 'dish1');
    expect(component.orderItems[0].state).toBe(1);
    expect(component.viewMode()).toBeTrue();
    expect(toastService.success).toHaveBeenCalled();
  });

  it('does not lock the page while some dishes are still pending', async () => {
    const order: Order = {
      orderId: 'order-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 4, 2026, 10:45 AM',
      reservationId: 'res-1',
      status: 3,
      orderItems: [
        { dish: caesar, quantity: 1, state: 0 },
        { dish: tomYum, quantity: 1, state: 0 },
      ],
    };
    const { component } = create(order);
    await fixture.whenStable();
    preOrdersService.confirmDishInOrder.and.returnValue(of({}));

    component.confirmDish('dish1');

    expect(component.viewMode()).toBeFalse();
  });

  it('a failed confirm shows an error toast and leaves the dish editable', async () => {
    const order: Order = {
      orderId: 'order-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 4, 2026, 10:45 AM',
      reservationId: 'res-1',
      status: 3,
      orderItems: [{ dish: caesar, quantity: 1, state: 0 }],
    };
    const { component } = create(order);
    await fixture.whenStable();
    preOrdersService.rejectDishInOrder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component.rejectDish('dish1');

    expect(toastService.error).toHaveBeenCalled();
    expect(component.orderItems[0].state).toBe(0);
    expect(component.mutatingDishId()).toBeNull();
  });

  it('opens already-reviewed pre-orders directly in view mode', async () => {
    const order: Order = {
      orderId: 'order-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 4, 2026, 10:45 AM',
      reservationId: 'res-1',
      status: 1,
      orderItems: [{ dish: caesar, quantity: 1, state: 1 }],
    };
    const { component } = create(order);
    await fixture.whenStable();

    expect(component.viewMode()).toBeTrue();

    component.confirmDish('dish1');

    expect(preOrdersService.confirmDishInOrder).not.toHaveBeenCalled();
  });
});
