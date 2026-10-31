import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { ReportingDashboardComponent } from './reporting-dashboard.component';

describe('ReportingDashboardComponent', () => {
  let fixture: ComponentFixture<ReportingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingDashboardComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingDashboardComponent);
    fixture.detectChanges();
  });

  it('renders the page header', () => {
    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
  });
});
