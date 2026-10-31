import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { WaiterDashboardComponent } from './waiter-dashboard.component';

describe('WaiterDashboardComponent', () => {
  let fixture: ComponentFixture<WaiterDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaiterDashboardComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WaiterDashboardComponent);
    fixture.detectChanges();
  });

  it('renders the page header', () => {
    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
  });
});
