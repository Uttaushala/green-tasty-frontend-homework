import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthenticationService } from '@app/auth/services/authentication.service';
import { FormValidatorsService } from '@app/auth/services/form-validators-service.service';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';

const NAME_PATTERN = /^[A-Za-z'-]+$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** "Create an Account" form from the Figma sign-up flow. */
@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, CustomButtonComponent],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
  readonly registered = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthenticationService);
  private readonly validators = inject(FormValidatorsService);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly isLoading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
      lastName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
      email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: (group) => this.validators.passwordMatchValidator(group) }
  );

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly passwordStrength = computed(() =>
    this.validators.evaluatePasswordStrength(this.value().password ?? '')
  );
  readonly hasPassword = computed(() => !!this.value().password);
  readonly hasConfirmPassword = computed(() => !!this.value().confirmPassword);
  readonly lengthValid = computed(() => this.passwordStrength().valid.lengthValid);
  readonly charactersValid = computed(() => {
    const valid = this.passwordStrength().valid;
    return valid.hasUppercase && valid.hasLowercase && valid.hasNumber && valid.hasSpecialCharacter;
  });
  readonly isStrong = computed(() => this.lengthValid() && this.charactersValid());

  // Design: a field turns red once the user leaves it, not while typing.
  showError(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }

  // Design: the button is active as soon as every field has a value; errors keep it disabled.
  canSubmit(): boolean {
    const value = this.form.getRawValue();
    const allFilled = [value.firstName, value.lastName, value.email, value.password, value.confirmPassword].every(
      (field) => !!field
    );
    return allFilled && !this.hasVisibleErrors();
  }

  private hasVisibleErrors(): boolean {
    return Object.values(this.form.controls).some((control) => this.showError(control));
  }

  togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  async onSubmit(): Promise<void> {
    this.serverError.set(null);
    if (this.form.invalid || !this.isStrong()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    try {
      const { firstName, lastName, email, password, confirmPassword } = this.form.getRawValue();
      const result = await this.auth.register(firstName, lastName, email, password, confirmPassword);
      if (result.success) {
        this.registered.emit();
      } else {
        this.serverError.set(result.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
