import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { mergeMap } from 'rxjs/operators';

@Injectable()
export class PasswordService {

  constructor(private http: HttpClient) { }

  public generateRenewToken(requestData: any): Observable<any> {
    return from(this.getAPIHeaders()).pipe(
      mergeMap(options => {
        return this.http.post<any>('URL to GENERATE_NEW_TOKEN', requestData, options);
      })
    );
  }

  public getClientSecret(): Observable<any> {
    return this.http.get<any>('endPoints.utility.GET_SECRETS_URL', {});
  }

  private async getAPIHeaders(): Promise<any> {
    const headersValue = await this.addRequestOptionsForClientSecrect();
    const options = {
      headers: headersValue
    };
    return options;
  }

  private addRequestOptionsForClientSecrect(): Promise<HttpHeaders> {

    return new Promise((resolve, reject) => {
      this.getClientSecret().subscribe(response => {
        const headers = new HttpHeaders({
          CLIENT_KEY: response.clientKey
        });
        resolve(headers);
      }, error => {
        reject(error);
      });
    });
  }
}
