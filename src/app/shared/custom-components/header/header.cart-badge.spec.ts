import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { HeaderComponent } from './header.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { NotificationsService } from '@app/services/notifications/notifications.service';
import { UserModel } from '@app/auth/models/user.model';
import { Roles } from '@app/shared/constants/roles';

describe('HeaderComponent cart badge and menu highlight', () => {
  const baseUrl = 'https://test.api';
  let httpMock: HttpTestingController;

  function createHeader() {
    const customer = { firstName: 'Ann', lastName: 'Lee', email: 'a@b.c', role: Roles.CUSTOMER } as UserModel;
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: baseUrl },
        {
          provide: AuthenticationService,
          useValue: { user$: of(customer), isAuthorised$: of(true), signOut: () => undefined },
        },
        { provide: NotificationsService, useValue: { loadNotifications: () => of([]) } },
        provideRouter([{ path: 'menu', children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the number of dishes from not submitted pre-orders only', () => {
    const fixture = createHeader();
    const request = httpMock.expectOne((req) => req.url.endsWith('/orders'));
    request.flush([
      { orderId: '1', status: 0, orderItems: [{ quantity: 2 }, { quantity: 1 }] },
      { orderId: '2', status: 1, orderItems: [{ quantity: 5 }] },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.cartCount()).toBe(3);
    expect(fixture.nativeElement.querySelector('.cart-badge')?.textContent.trim()).toBe('3');
  });

  it('counts only the reservation from the URL when the page was opened for one', async () => {
    const fixture = createHeader();
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    await TestBed.inject(Router).navigateByUrl('/menu?reservationId=res-1');

    const request = httpMock.expectOne((req) => req.url.endsWith('/orders'));
    request.flush([
      { orderId: '1', reservationId: 'res-1', status: 0, orderItems: [{ quantity: 2 }, { quantity: 2 }] },
      { orderId: '2', reservationId: 'res-2', status: 0, orderItems: [{ quantity: 2 }] },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.cartCount()).toBe(4);
  });

  it('hides the badge when the cart is empty', () => {
    const fixture = createHeader();
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-badge')).toBeNull();
  });

  it('hides the cart icon outside the menu while the cart is empty (Figma reservations header)', () => {
    const fixture = createHeader();
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Open cart"]')).toBeNull();
  });

  it('shows the cart icon on the menu even with an empty cart', async () => {
    const fixture = createHeader();
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    await TestBed.inject(Router).navigateByUrl('/menu');
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Open cart"]')).not.toBeNull();
  });

  it('keeps "Main page" highlighted on the menu', async () => {
    const fixture = createHeader();
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    await TestBed.inject(Router).navigateByUrl('/menu');
    httpMock.expectOne((req) => req.url.endsWith('/orders')).flush([]);
    fixture.detectChanges();

    const mainLink = [...fixture.nativeElement.querySelectorAll('a.nav-link')].find(
      (link: HTMLElement) => link.textContent?.trim() === 'Main page',
    ) as HTMLElement;
    expect(mainLink.classList).toContain('active');
  });
});
