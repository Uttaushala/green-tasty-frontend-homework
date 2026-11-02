import { ChangeDetectionStrategy, Component, HostListener, output } from '@angular/core';
import { RegisterFormComponent } from '../register-form/register-form.component';

@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [RegisterFormComponent],
  templateUrl: './register-modal.component.html',
  // Same window as the sign-in modal.
  styleUrl: '../../login/login-modal/login-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterModalComponent {
  readonly closed = output<void>();
  readonly registered = output<void>();

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close();
  }
}
