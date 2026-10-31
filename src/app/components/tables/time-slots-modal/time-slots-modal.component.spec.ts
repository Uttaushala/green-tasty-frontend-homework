import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeSlotsModalComponent } from './time-slots-modal.component';
import { Table } from '@app/models/tables/table.model';

describe('TimeSlotsModalComponent', () => {
  let fixture: ComponentFixture<TimeSlotsModalComponent>;

  const table: Table = {
    id: 'table-1',
    tableNumber: 1,
    locationId: 'loc-1',
    capacity: 4,
    timeRanges: [
      { start: '2026-10-17T12:00:00Z', end: '2026-10-17T13:30:00Z' },
      { start: '2026-10-17T14:00:00Z', end: '2026-10-17T15:30:00Z' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSlotsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsModalComponent);
    fixture.componentRef.setInput('locationName', '48 Rustaveli Avenue');
    fixture.componentRef.setInput('table', table);
    fixture.componentRef.setInput('date', '2026-10-17');
    fixture.detectChanges();
  });

  it('tells how many slots are available for the table', () => {
    expect(fixture.nativeElement.textContent).toContain('2 slots');
  });

  it('renders one slot per time range', () => {
    expect(fixture.nativeElement.querySelectorAll('app-time-slot').length).toBe(2);
  });
});
