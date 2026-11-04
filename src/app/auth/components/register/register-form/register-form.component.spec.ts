import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegisterFormComponent } from './register-form.component';
import { AuthenticationService } from '@app/auth/services/authentication.service';

describe('RegisterFormComponent', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let component: RegisterFormComponent;
  let auth: jasmine.SpyObj<AuthenticationService>;

  const valid = {
    firstName: 'Jonson',
    lastName: 'Doe',
    email: 'jonson@doe.com',
    password: 'jfgd6zfx!L',
    confirmPassword: 'jfgd6zfx!L',
  };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['register']);
    await TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthenticationService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps Create an Account disabled while a field is empty', () => {
    component.form.patchValue({ ...valid, lastName: '' });
    expect(component.canSubmit()).toBeFalse();
  });

  it('enables Create an Account once every field has a value', () => {
    component.form.patchValue(valid);
    expect(component.canSubmit()).toBeTrue();
  });

  it('rates a password with all character groups as Strong', () => {
    component.form.patchValue({ password: 'jfgd6zfx!L' });
    expect(component.isStrong()).toBeTrue();
  });

  it('rates a letters-only password as Weak', () => {
    component.form.patchValue({ password: 'abcdefghi' });
    expect(component.isStrong()).toBeFalse();
  });

  it('shows a field error only after the field was left', () => {
    const email = component.form.controls.email;
    email.setValue('jondoe@com');
    email.markAsDirty();
    expect(component.showError(email)).toBeFalse();
    email.markAsTouched();
    expect(component.showError(email)).toBeTrue();
  });

  it('emits registered when the API accepts the sign-up', async () => {
    auth.register.and.resolveTo({ success: true });
    const emitted = jasmine.createSpy('registered');
    component.registered.subscribe(emitted);
    component.form.patchValue(valid);

    await component.onSubmit();

    expect(auth.register).toHaveBeenCalledWith('Jonson', 'Doe', 'jonson@doe.com', 'jfgd6zfx!L', 'jfgd6zfx!L');
    expect(emitted).toHaveBeenCalled();
  });

  it('shows the API error and does not emit when the sign-up fails', async () => {
    auth.register.and.resolveTo({ success: false, message: 'User already exists.' });
    const emitted = jasmine.createSpy('registered');
    component.registered.subscribe(emitted);
    component.form.patchValue(valid);

    await component.onSubmit();

    expect(component.serverError()).toBe('User already exists.');
    expect(emitted).not.toHaveBeenCalled();
  });
});
