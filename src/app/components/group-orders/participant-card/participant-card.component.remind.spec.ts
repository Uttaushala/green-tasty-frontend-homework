// Кнопка «Remind» на картці гостя.
import { TestBed } from '@angular/core/testing';
import { Participant } from '@app/models/group-orders/participant.model';
import { ParticipantCardComponent } from './participant-card.component';

const OLENA: Participant = { id: 'olena', type: 'Guest', name: 'Olena', isSubmitted: false, total: 0, items: [] };

function render(inputs: { canRemind?: boolean; reminding?: boolean } = {}) {
  const fixture = TestBed.createComponent(ParticipantCardComponent);
  fixture.componentRef.setInput('participant', OLENA);
  fixture.componentRef.setInput('canRemind', inputs.canRemind ?? false);
  fixture.componentRef.setInput('reminding', inputs.reminding ?? false);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const button = element.querySelector<HTMLButtonElement>('button.remind');
  return { fixture, button };
}

describe('Картка учасника · Remind', () => {
  it('кнопки немає, поки canRemind = false', () => {
    expect(render().button).toBeNull();
  });

  it('кнопка «Remind» є, коли canRemind = true', () => {
    expect(render({ canRemind: true }).button?.textContent?.trim()).toBe('Remind');
  });

  it('клік віддає учасника через remindClick', () => {
    const { fixture, button } = render({ canRemind: true });
    const emitted: Participant[] = [];
    fixture.componentInstance.remindClick.subscribe((person) => emitted.push(person));

    button?.click();

    expect(emitted).toEqual([OLENA]);
  });

  it('під час відправки кнопка неактивна і підписана «Sending…»', () => {
    const { button } = render({ canRemind: true, reminding: true });

    expect(button?.disabled).toBeTrue();
    expect(button?.textContent?.trim()).toBe('Sending…');
  });
});
