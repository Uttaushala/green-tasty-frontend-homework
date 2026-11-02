import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LoginFormComponent } from './login-form.component';
import { AuthenticationService } from '@app/auth/services/authentication.service';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;
  let auth: jasmine.SpyObj<AuthenticationService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', ['signIn'], { user$: of(null) });
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [provideRouter([]), { provide: AuthenticationService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fill(email: string, password: string): void {
    component.loginForm.setValue({ email, password });
    fixture.detectChanges();
  }

  it('shows the Figma error and renames the link after a wrong password', async () => {
    auth.signIn.and.resolveTo({ success: false, message: 'Incorrect email or password.' });
    fill('user@domain.com', 'Password1');

    await component.onSubmit();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Incorrect email or password. Try again or create an account.');
    expect(host.querySelector('.forgot-link')?.textContent?.trim()).toBe('Forgot your password?');
  });

  it('keeps Sign In disabled after a failed attempt until the credentials change', async () => {
    auth.signIn.and.resolveTo({ success: false, message: 'Incorrect email or password.' });
    fill('user@domain.com', 'Password1');
    await component.onSubmit();
    fixture.detectChanges();
    expect(component.unsuccessfulLogin()).toBeTrue();

    fill('user@domain.com', 'Password2');

    expect(component.unsuccessfulLogin()).toBeFalse();
  });

  it('shows the locked banner and keeps it while typing', async () => {
    auth.signIn.and.resolveTo({ success: false, message: 'Your account is temporarily locked. Please try again later.' });
    fill('user@domain.com', 'Password1');
    await component.onSubmit();
    fixture.detectChanges();

    fill('user@domain.com', 'Password2');

    expect(component.isAccountLocked()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.banner-error')?.textContent).toContain(
      'multiple failed login attempts',
    );
  });

  it('shows the eye toggle only once a password is typed', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.eye-btn')).toBeNull();

    const input = host.querySelector('input[formcontrolname="password"]') as HTMLInputElement;
    input.value = 'secret';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.querySelector('.eye-btn')).not.toBeNull();
  });
});
