import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Order } from '@app/models/orders/order.model';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';

import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;

  let preOrdersServiceMock: jasmine.SpyObj<PreOrdersService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    preOrdersServiceMock =
      jasmine.createSpyObj<PreOrdersService>(
        'PreOrdersService',
        [
          'getPreOrders',
          'cancelPreOrderByReservationId',
          'unsubmitPreOrderByReservationId',
          'submitPreOrderByReservationId',
          'editPreOrderByReservationId',
        ],
      );

    routerMock = jasmine.createSpyObj<Router>(
      'Router',
      ['navigate'],
    );

    preOrdersServiceMock.getPreOrders.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        {
          provide: PreOrdersService,
          useValue: preOrdersServiceMock,
        },
        {
          provide: Router,
          useValue: routerMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closeCartEvent when closeCart is called', () => {
    spyOn(component.closeCartEvent, 'emit');

    component.closeCart();

    expect(
      component.closeCartEvent.emit,
    ).toHaveBeenCalled();
  });

  it('should return submitted orders with statuses 1 and 3', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 1,
      },
      {
        orderId: 'order-2',
        status: 2,
      },
      {
        orderId: 'order-3',
        status: 3,
      },
      {
        orderId: 'order-4',
        status: 0,
      },
    ] as Order[]);

    expect(
      component
        .submittedOrders()
        .map((order) => order.status),
    ).toEqual([1, 3]);
  });

  it('should return unsubmitted orders with status 0', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 0,
        orderItems: [{ quantity: 1 }],
      },
      {
        orderId: 'order-2',
        status: 1,
      },
      {
        orderId: 'order-3',
        status: 3,
      },
    ] as Order[]);

    expect(
      component
        .unsubmittedOrders()
        .map((order) => order.status),
    ).toEqual([0]);
  });

  it('hides drafts without dishes and shows the empty cart', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 0,
        reservationId: 'res-1',
        reservationAddress: 'Test address',
        reservationTime: '2026-09-07T12:15:00Z',
        orderItems: [],
      },
    ]);

    expect(component.unsubmittedOrders()).toEqual([]);
    expect(component.isEmpty()).toBeTrue();
  });

  it('is not empty when a draft has dishes', () => {
    component.orders.set([
      {
        orderId: 'order-1',
        status: 0,
        orderItems: [{ quantity: 1 }],
      },
    ] as Order[]);

    expect(component.isEmpty()).toBeFalse();
  });

  it('shows only the orders of the reservation the menu was opened for', () => {
    component.reservationFilter.set('res-1');
    component.orders.set([
      { orderId: 'a', status: 0, reservationId: 'res-1', orderItems: [{ quantity: 1 }] },
      { orderId: 'b', status: 0, reservationId: 'res-2', orderItems: [{ quantity: 1 }] },
      { orderId: 'c', status: 1, reservationId: 'res-2', orderItems: [{ quantity: 1 }] },
    ] as Order[]);

    expect(component.unsubmittedOrders().map((order) => order.orderId)).toEqual(['a']);
    expect(component.submittedOrders()).toEqual([]);
  });

  it('shows every order when no reservation is selected', () => {
    component.reservationFilter.set(null);
    component.orders.set([
      { orderId: 'a', status: 0, reservationId: 'res-1', orderItems: [{ quantity: 1 }] },
      { orderId: 'b', status: 0, reservationId: 'res-2', orderItems: [{ quantity: 1 }] },
    ] as Order[]);

    expect(component.unsubmittedOrders().length).toBe(2);
  });

  it('should navigate to reservations when goToReservations is called', () => {
    component.goToReservations();

    expect(routerMock.navigate).toHaveBeenCalledWith([
      '/reservations',
    ]);
  });
  it('hides the cart panel while the submit confirmation is shown', () => {
    component.submitOrderId.set('order-1');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.cart')).toBeNull();
    expect(root.querySelector('app-submit-order-modal')).not.toBeNull();
  });

  it('closes the cart together with the submit confirmation', () => {
    spyOn(component.closeCartEvent, 'emit');
    component.submitOrderId.set('order-1');

    component.closeSubmitModal();

    expect(component.submitOrderId()).toBeNull();
    expect(component.closeCartEvent.emit).toHaveBeenCalled();
  });
});
