import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, EMPTY, finalize, of, throwError, Observable } from 'rxjs';

import { AuthenticationService } from '@app/auth/services/authentication.service';
import { UserModel } from '@app/auth/models/user.model';
import { UsersService } from '@app/services/users/users.service';
import { ToastService } from '@app/services/toast/toast.service';

type ProfileControlName = 'firstName' | 'lastName';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_SIDE = 4096;

@Component({
  selector: 'app-general-user-info',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: 'general-user-info.component.html',
  styleUrl: 'general-user-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralInformationComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<UserModel | null>(null);
  readonly profileImage = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly isReadingPhoto = signal(false);

  private photoChanged = false;
  private imageRevision = 0;
  private userRevision = 0;
  private activeReader: FileReader | null = null;
  private activeImage: HTMLImageElement | null = null;
  private lastSavedNames: { firstName: string; lastName: string } | null = null;

  readonly userForm = this.formBuilder.nonNullable.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z'-]+$/),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z'-]+$/),
      ],
    ],
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.imageRevision++;
      this.stopReadingPhoto();
    });

    this.authenticationService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        const userChanged = this.user()?.id !== user?.id;
        this.user.set(user);

        if (userChanged) {
          this.userRevision++;
          this.imageRevision++;
          this.stopReadingPhoto();
          this.photoChanged = false;
          this.lastSavedNames = null;
          this.profileImage.set(null);
        }

        if (!user) {
          this.userForm.reset();
          return;
        }

        this.userForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
        });

        if (userChanged) {
          this.loadUserProfileImage(user.id);
        }
      });
  }

  isInvalid(controlName: ProfileControlName): boolean {
    const control = this.userForm.controls[controlName];
    return control.invalid && control.touched;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || !this.user()) {
      return;
    }

    const validationError = this.validatePhotoFile(file);
    if (validationError) {
      this.showError(validationError);
      return;
    }

    const revision = ++this.imageRevision;
    this.stopReadingPhoto();

    const reader = new FileReader();
    this.activeReader = reader;
    this.isReadingPhoto.set(true);

    reader.onload = () => {
      if (this.activeReader !== reader || revision !== this.imageRevision) {
        return;
      }

      this.activeReader = null;

      if (typeof reader.result !== 'string') {
        this.isReadingPhoto.set(false);
        this.handlePhotoReadError();
        return;
      }

      this.checkPhotoDimensions(reader.result, revision);
    };

    reader.onerror = () => {
      if (this.activeReader !== reader || revision !== this.imageRevision) {
        return;
      }

      this.activeReader = null;
      this.isReadingPhoto.set(false);
      this.handlePhotoReadError();
    };

    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (this.isSaving() || this.isReadingPhoto()) {
      return;
    }

    const user = this.user();
    if (!user) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName } = this.userForm.getRawValue();
    const imageToUpload = this.photoChanged ? this.profileImage() : null;
    const imageRevision = this.imageRevision;
    const userRevision = this.userRevision;
    let uploadingPhoto = false;

    // Only send what changed: the names that are already saved are not sent again on a photo retry.
    const savedNames = this.lastSavedNames ?? { firstName: user.firstName, lastName: user.lastName };
    const namesChanged = firstName !== savedNames.firstName || lastName !== savedNames.lastName;

    if (!namesChanged && !imageToUpload) {
      return;
    }

    this.isSaving.set(true);

    const nameSave$: Observable<unknown> = namesChanged
      ? this.authenticationService.editProfile(firstName, lastName)
      : of(true);

    nameSave$
      .pipe(
        concatMap((response) => {
          if (userRevision !== this.userRevision) {
            return EMPTY;
          }

          if (!response) {
            return throwError(() => new Error('Failed to update profile'));
          }

          if (namesChanged) {
            this.lastSavedNames = { firstName, lastName };
          }

          if (!imageToUpload) {
            return of(null);
          }

          uploadingPhoto = true;
          return this.authenticationService.uploadMyProfileImage(imageToUpload);
        }),
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (userRevision !== this.userRevision) {
            return;
          }

          if (imageToUpload && imageRevision === this.imageRevision) {
            this.photoChanged = false;
          }

          this.showSuccess();
        },
        error: (error: unknown) => {
          if (userRevision !== this.userRevision) {
            return;
          }

          if (uploadingPhoto) {
            console.error('Failed to upload profile image', error);
            this.showError(
              namesChanged
                ? 'Your name changes were saved, but the photo upload failed. Click Save Changes to retry the photo.'
                : 'Failed to upload profile image',
            );
          } else {
            this.showError();
          }
        },
      });
  }

  private loadUserProfileImage(userId: string): void {
    const revision = this.imageRevision;

    this.usersService.getUserProfileImage(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (revision !== this.imageRevision || this.photoChanged) {
            return;
          }

          this.profileImage.set(response.presignedUrl);
        },
        error: (error: unknown) => {
          if (revision !== this.imageRevision || this.photoChanged) {
            return;
          }

          console.error('Failed to load profile image', error);
          this.profileImage.set(null);
        },
      });
  }

  private validatePhotoFile(file: File): string | null {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return 'Please select a JPEG, PNG, or WebP image';
    }

    if (file.size === 0) {
      return 'Please select a non-empty image file';
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return 'Image must be 5 MB or smaller';
    }

    return null;
  }

  /** Decodes the picked photo and accepts it only when it is a real image within the size limits. */
  private checkPhotoDimensions(dataUrl: string, revision: number): void {
    const image = new Image();
    this.activeImage = image;

    image.onload = () => {
      if (this.activeImage !== image || revision !== this.imageRevision) {
        return;
      }

      this.activeImage = null;
      this.isReadingPhoto.set(false);

      if (image.naturalWidth > MAX_PHOTO_SIDE || image.naturalHeight > MAX_PHOTO_SIDE) {
        this.showError(`Image dimensions must not exceed ${MAX_PHOTO_SIDE} × ${MAX_PHOTO_SIDE} pixels`);
        return;
      }

      this.photoChanged = true;
      this.profileImage.set(dataUrl);
    };

    image.onerror = () => {
      if (this.activeImage !== image || revision !== this.imageRevision) {
        return;
      }

      this.activeImage = null;
      this.isReadingPhoto.set(false);
      this.showError('Please select a valid image file');
    };

    image.src = dataUrl;
  }

  private stopReadingPhoto(): void {
    const reader = this.activeReader;
    this.activeReader = null;
    this.activeImage = null;
    this.isReadingPhoto.set(false);

    if (reader?.readyState === FileReader.LOADING) {
      reader.abort();
    }
  }

  private handlePhotoReadError(): void {
    this.showError('Failed to read profile image');

    const user = this.user();
    if (user && !this.photoChanged && !this.profileImage()) {
      this.loadUserProfileImage(user.id);
    }
  }

  private showSuccess(): void {
    this.toastService.success('Profile updated successfully', 'Success');
  }

  private showError(message = 'Failed to update profile'): void {
    this.toastService.error(message, 'Error');
  }
}
