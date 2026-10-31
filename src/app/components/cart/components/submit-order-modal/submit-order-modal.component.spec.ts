import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitOrderModalComponent } from './submit-order-modal.component';

describe('SubmitOrderModalComponent', () => {
  let component: SubmitOrderModalComponent;
  let fixture: ComponentFixture<SubmitOrderModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitOrderModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitOrderModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the confirmation text from the design', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Pre-Order Submitted');
    expect(text).toContain('Your Pre-Order was sent successfully.');
    expect(text).toContain('Wait for the confirmation from the restaurant.');
  });

  it('emits viewReservations when the button is clicked', () => {
    spyOn(component.viewReservations, 'emit');

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.actions button',
    ) as HTMLButtonElement;
    button.click();

    expect(component.viewReservations.emit).toHaveBeenCalled();
  });

  it('emits closed when closeModal is called', () => {
    spyOn(component.closed, 'emit');

    component.closeModal();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
