import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { SelectOption } from '@app/models/shared/select-option.model';

function getLabel(option: string | SelectOption): string {
  return typeof option === 'string' ? option : (option.text || option.value || '');
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  templateUrl: './custom-select.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './custom-select.component.scss',
})
export class CustomSelectComponent {
  readonly iconPath = input('');
  readonly showIcon = input(true);
  readonly placeholder = input('');
  readonly error = input('');
  readonly trailingIconPath = input('');

  // Options without a label (e.g. a location saved with no address) are skipped: they would render
  // as blank rows and a null value used to break the whole list.
  readonly options =
    input<readonly (string | SelectOption)[], readonly (string | SelectOption | null | undefined)[]>([], {
      transform: (options) =>
        (options ?? []).filter((option): option is string | SelectOption => !!option && !!getLabel(option)),
    });

  readonly selectedOption =
    model<string | SelectOption | undefined>(undefined);

  readonly optionSelected = output<string>();

  readonly dropdownOpen = signal(false);

  readonly displayText = computed(() => {
    const selected = this.selectedOption();

    return selected
      ? this.getOptionText(selected)
      : this.placeholder() || 'Select an option';
  });

  selectOption(option: string | SelectOption): void {
    this.selectedOption.set(option);
    this.dropdownOpen.set(false);
    this.optionSelected.emit(this.getOptionValue(option));
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  getOptionText(option: string | SelectOption): string {
    return getLabel(option);
  }

  getOptionValue(option: string | SelectOption): string {
    return typeof option === 'string'
      ? option
      : option.value;
  }

  isOptionSelected(option: string | SelectOption): boolean {
    const selected = this.selectedOption();

    return (
      selected !== undefined &&
      this.getOptionValue(option) === this.getOptionValue(selected)
    );
  }
}
