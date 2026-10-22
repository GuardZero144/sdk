import { AuthApi } from './auth';
import { CredentialsApi } from './credentials';
import { DataSharingApi } from './data-sharing';
import { HealthAuthoritiesApi } from './health-authorities';
import { HttpClient, type HttpClientOptions } from './http';
import { IdentitiesApi } from './identities';
import { VerificationsApi } from './verifications';

/** Typed client for the ValidFi NestJS backend. */
export class ValidFiApi {
  readonly http: HttpClient;
  readonly auth: AuthApi;
  readonly identities: IdentitiesApi;
  readonly verifications: VerificationsApi;
  readonly dataSharing: DataSharingApi;
  readonly healthAuthorities: HealthAuthoritiesApi;
  readonly credentials: CredentialsApi;

  constructor(options: HttpClientOptions) {
    this.http = new HttpClient(options);
    this.auth = new AuthApi(this.http);
    this.identities = new IdentitiesApi(this.http);
    this.verifications = new VerificationsApi(this.http);
    this.dataSharing = new DataSharingApi(this.http);
    this.healthAuthorities = new HealthAuthoritiesApi(this.http);
    this.credentials = new CredentialsApi(this.http);
  }
}

export { HttpClient } from './http';
export type { HttpClientOptions, Query } from './http';
export * from './types';
