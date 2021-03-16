import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DEFAULT_TIMEOUT, HttpInterceptorService } from './service/http-interceptor.service';
import { PasswordService } from './service/password.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [
    PasswordService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorService,
      multi: true
    },
    { provide: DEFAULT_TIMEOUT, useValue: 60000 }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
