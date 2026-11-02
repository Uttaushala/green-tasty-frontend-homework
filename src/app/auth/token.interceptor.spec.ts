import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '../services/toast/toast.service';
import { AuthenticationService } from './services/authentication.service';
import { SKIP_ERROR_TOAST } from './skip-error-toast.context';
import { tokenInterceptor } from './token.interceptor';

const URL = 'https://test.api/reservations';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastService: jasmine.SpyObj<ToastService>;
  let authService: jasmine.SpyObj<AuthenticationService>;

  beforeEach(() => {
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    authService = jasmine.createSpyObj<AuthenticationService>('AuthenticationService', [
      'getTokens',
      'signOut',
    ]);
    authService.getTokens.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastService },
        { provide: AuthenticationService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the server message in a toast for a 400 response', () => {
    http.post(URL, {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne(URL)
      .flush({ message: 'Overlaps' }, { status: 400, statusText: 'Bad Request' });

    expect(toastService.error).toHaveBeenCalledWith('Overlaps', 'Error');
  });

  it('does not show a toast but still rethrows when SKIP_ERROR_TOAST is set', () => {
    let receivedStatus: number | undefined;
    http
      .post(URL, {}, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
      .subscribe({ error: (error) => (receivedStatus = error.status) });

    httpMock
      .expectOne(URL)
      .flush({ message: 'Overlaps' }, { status: 400, statusText: 'Bad Request' });

    expect(toastService.error).not.toHaveBeenCalled();
    expect(receivedStatus).toBe(400);
  });

  describe('guest endpoints', () => {
    const OWNER_SESSIONS_URL = 'https://test.api/guest/groups/grp-1/sessions';

    beforeEach(() => {
      const authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
      authService.getTokens.and.returnValue({ idToken: 'owner-token' } as ReturnType<AuthenticationService['getTokens']>);
    });

    it('does not attach the owner token to guest-session endpoints', () => {
      http.get('https://test.api/guest/sessions/gs-1').subscribe();

      const req = httpMock.expectOne('https://test.api/guest/sessions/gs-1');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });

    it('attaches the owner token to the owner group-sessions endpoints', () => {
      http.get(OWNER_SESSIONS_URL).subscribe();
      http.delete(`${OWNER_SESSIONS_URL}/gs-2`).subscribe();

      const getReq = httpMock.expectOne({ method: 'GET', url: OWNER_SESSIONS_URL });
      const deleteReq = httpMock.expectOne({ method: 'DELETE', url: `${OWNER_SESSIONS_URL}/gs-2` });
      expect(getReq.request.headers.get('Authorization')).toBe('Bearer owner-token');
      expect(deleteReq.request.headers.get('Authorization')).toBe('Bearer owner-token');
      getReq.flush({});
      deleteReq.flush({});
    });

    it('does not show a toast for a silent guest-endpoint request', () => {
      http
        .get('https://test.api/guest/groups/grp-1/status', { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
        .subscribe({ error: () => undefined });

      httpMock.expectOne('https://test.api/guest/groups/grp-1/status').flush({}, { status: 500, statusText: 'Error' });

      expect(toastService.error).not.toHaveBeenCalled();
    });
  });

  it('signs out and asks to log in again when a request with a token fails with status 0', () => {
    authService.getTokens.and.returnValue({ idToken: 'stale', accessToken: 'stale' } as never);

    http.get(URL).subscribe({ error: () => undefined });

    httpMock.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });

    expect(authService.signOut).toHaveBeenCalled();
    expect(toastService.error).toHaveBeenCalledWith(
      'Your session has expired. Please log in again.',
      'Unauthorized'
    );
  });

  it('does not sign out when an anonymous request fails with status 0', () => {
    http.get(URL).subscribe({ error: () => undefined });

    httpMock.expectOne(URL).error(new ProgressEvent('error'), { status: 0 });

    expect(authService.signOut).not.toHaveBeenCalled();
  });
});
