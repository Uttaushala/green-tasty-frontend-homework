import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { PlaceOrderWaiterComponent } from './place-order-waiter.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { ToastService } from '@app/services/toast/toast.service';
import { CreateOrderRequest } from '@app/models/cart/create-order-request.model';

describe('PlaceOrderWaiterComponent', () => {
  let fixture: ComponentFixture<PlaceOrderWaiterComponent>;
  let component: PlaceOrderWaiterComponent;
  let toast: jasmine.SpyObj<ToastService>;

  async function setup(user: { firstName: string; lastName: string } | null): Promise<void> {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [PlaceOrderWaiterComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        {
          provide: AuthenticationService,
          useValue: {
            getUser: () => user,
            getUserNameById$: () => of('Alex Guest'),
          },
        },
        { provide: ToastService, useValue: toast },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  }

  it('shows the waiter and the customer names', async () => {
    await setup({ firstName: 'Jane', lastName: 'Smith' });
    fixture = TestBed.createComponent(PlaceOrderWaiterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('customerId', 'customer-1');
    fixture.detectChanges();

    expect(component.waiterName).toBe('Jane Smith');
    expect(component.customerName).toBe('Alex Guest');
  });

  it('does not place an empty order and tells the waiter why', async () => {
    await setup({ firstName: 'Jane', lastName: 'Smith' });
    fixture = TestBed.createComponent(PlaceOrderWaiterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const placed: CreateOrderRequest[] = [];
    component.placeOrder.subscribe((order) => placed.push(order));

    component.onCreateOrder();

    expect(placed).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith(
      'You must select at least one dish to place an order.',
      'Order Error',
    );
  });

  it('refuses to open without a logged in user', async () => {
    await setup(null);

    expect(() => TestBed.createComponent(PlaceOrderWaiterComponent)).toThrowError(
      'User is not authenticated',
    );
    expect(toast.error).toHaveBeenCalled();
  });
});
