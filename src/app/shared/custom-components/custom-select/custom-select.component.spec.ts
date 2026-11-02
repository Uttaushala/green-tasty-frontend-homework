import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomSelectComponent } from './custom-select.component';

describe('CustomSelectComponent', () => {
  let component: CustomSelectComponent;
  let fixture: ComponentFixture<CustomSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSelectComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function openWith(options: unknown[]): HTMLElement {
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    (host.querySelector('.custom-select') as HTMLElement).click();
    fixture.detectChanges();
    return host;
  }

  it('renders every option label in the list', () => {
    const host = openWith(['All Locations', '48 Rustaveli Avenue']);

    const labels = [...host.querySelectorAll('li')].map((li) => li.textContent?.trim());
    expect(labels).toEqual(['All Locations', '48 Rustaveli Avenue']);
  });

  it('skips options without a label instead of breaking the list (null address from the API)', () => {
    const host = openWith(['All Locations', null, '', { value: '', text: '' }, '9 Abashidze Street']);

    const labels = [...host.querySelectorAll('li')].map((li) => li.textContent?.trim());
    expect(labels).toEqual(['All Locations', '9 Abashidze Street']);
  });

  it('emits the value of the chosen option', () => {
    const host = openWith(['All Locations', '48 Rustaveli Avenue']);
    const emitted = jasmine.createSpy('optionSelected');
    component.optionSelected.subscribe(emitted);

    (host.querySelectorAll('li')[1] as HTMLElement).click();

    expect(emitted).toHaveBeenCalledWith('48 Rustaveli Avenue');
  });
});
