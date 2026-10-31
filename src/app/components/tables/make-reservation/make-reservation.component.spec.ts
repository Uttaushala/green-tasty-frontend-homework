import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakeReservationComponent } from './make-reservation.component';
import { Table } from '@app/models/tables/table.model';
import { TimeRange } from '@app/models/tables/time-range.model';

describe('MakeReservationComponent', () => {
  let fixture: ComponentFixture<MakeReservationComponent>;
  let component: MakeReservationComponent;

  const timeRange: TimeRange = { start: '2026-10-17T12:00:00Z', end: '2026-10-17T13:30:00Z' };
  const table: Table = {
    id: 'table-1',
    tableNumber: 3,
    locationId: 'loc-1',
    capacity: 4,
    timeRanges: [timeRange],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakeReservationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MakeReservationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('locationName', '48 Rustaveli Avenue');
    fixture.componentRef.setInput('table', table);
    fixture.componentRef.setInput('selectedTimeRange', timeRange);
    fixture.detectChanges();
  });

  it('emits the selected table, time range and guests', () => {
    const emitted: { tableId: string; timeRange: TimeRange; guests: number }[] = [];
    component.makeReservation.subscribe((value) => emitted.push(value));
    component.onGuestsChange(3);

    component.onMakeReservation();

    expect(emitted).toEqual([{ tableId: 'table-1', timeRange, guests: 3 }]);
  });

  it('ignores an empty guests value', () => {
    component.onGuestsChange(2);
    component.onGuestsChange(undefined);

    expect(component.guests).toBe(2);
  });

  it('emits closeModal on close', () => {
    let closed = 0;
    component.closeModal.subscribe(() => closed++);

    component.onClose();

    expect(closed).toBe(1);
  });
});
