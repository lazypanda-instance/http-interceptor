import { Inject, Injectable, InjectionToken, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, fromEvent, Observable, throwError } from 'rxjs';
import { PasswordService } from './password.service';
import { catchError, filter, finalize, switchMap, take, tap, timeout } from 'rxjs/operators';

export const DEFAULT_TIMEOUT = new InjectionToken<number>('defaultTimeout');
export const apiWithoutHeader = [];

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  private passwordService: PasswordService;
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private onlineEvent: Observable<Event>;
  private offlineEvent: Observable<Event>;

  constructor(private injector: Injector,
              @Inject(DEFAULT_TIMEOUT) protected defaultTimeout: number) {
    this.onlineEvent = fromEvent(window, 'online');
    this.offlineEvent = fromEvent(window, 'offline');

    this.onlineEvent.subscribe(e => {
      console.log('Application is Online');
    });
    this.offlineEvent.subscribe(e => {
      console.log('Application is Offline');
    });
  }

  addToken(req: HttpRequest<any>): HttpRequest<any> {
    const accessToken = localStorage.getItem('hashToken');
    if (accessToken) {
      return req.clone({
        headers: req.headers.set('Authorization', `Bearer ${accessToken}`)
      });
    } else {
      return req;
    }
  }

  getNewToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const storedRefreshToken: string = localStorage.getItem('hashToken');
    const refreshTokenRequest = {
      hashToken: storedRefreshToken
    };

    return this.passwordService.generateRenewToken(refreshTokenRequest).pipe(
      switchMap((response: any) => {
        if (response) {
          localStorage.setItem('hashToken', response.hashToken);
          this.refreshTokenSubject.next(response.hashToken);
          return next.handle(this.addToken(req));
        }
      }),
      catchError ((error) => {
        return this.logoutUser(error);
      }),
      finalize(() => {
        this.refreshTokenInProgress = false;
      })
    );
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const timeoutValue = request.headers.get('timeout') || this.defaultTimeout;
    const timeoutValueNumeric = Number(timeoutValue);

    if (this.apiWithNoHeaders(request)) {
      return next.handle(request).pipe(
        timeout(timeoutValueNumeric),
        tap((event: HttpResponse<any>) => {
          return event;
        }),
        catchError((error: HttpErrorResponse) => {
          return this.networkErrorScenario(error, request, next);
        })
      );
    } else {
      return next.handle(this.addToken(request)).pipe(
        timeout(timeoutValueNumeric),
        tap((response: HttpResponse<any>) => {
          if (response.type !== 0) {
            const token = response.headers.get('Authorization');
            if (token) {
              localStorage.setItem('hashToken', token.split(' ')[1]);
            }
          }
          return response;
        }),
        catchError((error: HttpErrorResponse) => {
          return this.networkErrorScenario(error, request, next);
        })
      );
    }
  }

  private networkErrorScenario(error: HttpErrorResponse, request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (error instanceof HttpErrorResponse) {
      const errorCode = (error as HttpErrorResponse).status;
      switch (true) {
        case (errorCode === 400):
          return this.handle400Error(error);

        case (errorCode === 401):
          return this.handle401Error(request, next);

        case (errorCode >= 500 && errorCode < 600):
          return throwError(error);

        case (errorCode === 0):
          return throwError(error);

        default:
          return throwError(error);
      }
    } else {
      return throwError(error);
    }
  }

  handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.refreshTokenInProgress) {
      this.refreshTokenInProgress = true;
      this.refreshTokenSubject.next(null);

      return this.getNewToken(req, next);
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          return next.handle(this.addToken(req));
        })
      );
    }
  }

  handle400Error(error: HttpErrorResponse): Observable<HttpEvent<any>> {
    if (error && error.status === 400) {
      return throwError(error);
    }

    return throwError(error);
  }
  logoutUser(error: any): Observable<HttpEvent<any>> {
    return throwError(error);
  }

  apiWithNoHeaders(request: HttpRequest<object>): boolean {
    return apiWithoutHeader.includes(request.url);
  }
}
