import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeSlotComponent } from './time-slot.component';

describe('TimeSlotComponent', () => {
  let fixture: ComponentFixture<TimeSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeSlotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotComponent);
    fixture.componentRef.setInput('timeRange', {
      start: '2026-10-17T12:00:00Z',
      end: '2026-10-17T13:30:00Z',
    });
  });

  it('shows the custom label instead of the computed time range', () => {
    fixture.componentRef.setInput('label', '12:00 - 13:30');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('12:00 - 13:30');
  });

  it('shows the date only when showDate is on', () => {
    fixture.componentRef.setInput('label', 'Slot');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('2026');

    fixture.componentRef.setInput('showDate', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2026');
  });
});
