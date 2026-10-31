import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

import { MenuPageComponent } from './menu-page.component';

describe('MenuPageComponent', () => {
  let fixture: ComponentFixture<MenuPageComponent>;
  let httpMock: HttpTestingController;

  function render(queryParams: Record<string, string>): HTMLElement {
    TestBed.configureTestingModule({
      imports: [MenuPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MenuPageComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.match(() => true));

  it('shows the pre-order strip with the reservation under the header', () => {
    const host = render({
      preOrder: 'true',
      reservationId: 'res-1',
      reservationLabel: '48 Rustaveli Avenue, Table 1',
    });

    const notice = host.querySelector('.pre-order-notice');

    expect(notice?.textContent).toContain('You are making a pre-order for the reservation');
    expect(notice?.textContent).toContain('48 Rustaveli Avenue, Table 1');
    expect(host.querySelector('.menu-container')?.firstElementChild).toBe(notice);
  });

  it('shows no pre-order strip for a regular visit', () => {
    const host = render({});

    expect(host.querySelector('.pre-order-notice')).toBeNull();
  });

  it('selects the first tab by default', () => {
    const host = render({});

    const active = host.querySelectorAll('.category-buttons button.active');

    expect(active.length).toBe(1);
    expect(active[0].textContent?.trim()).toBe('Appetizers');
  });

  it('keeps the tab from the address', () => {
    const host = render({ category: 'Dessert' });

    expect(host.querySelector('.category-buttons button.active')?.textContent?.trim()).toBe('Desserts');
  });

  it('renders the three category tabs', () => {
    const host = render({});

    const tabs = Array.from(host.querySelectorAll('.category-buttons button')).map((button) =>
      button.textContent?.trim(),
    );

    expect(tabs).toEqual(['Appetizers', 'Main Courses', 'Desserts']);
  });
});
