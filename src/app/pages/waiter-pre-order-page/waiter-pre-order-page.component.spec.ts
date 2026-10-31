import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { WaiterPreOrderPageComponent } from './waiter-pre-order-page.component';

describe('WaiterPreOrderPageComponent', () => {
  let fixture: ComponentFixture<WaiterPreOrderPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaiterPreOrderPageComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WaiterPreOrderPageComponent);
    fixture.detectChanges();
  });

  it('creates the page', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
