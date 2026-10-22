import type { HttpClient } from './http';
import type { CreateShareRequest, Entity, UpdateShareRequest } from './types';

export class DataSharingApi {
  constructor(private readonly http: HttpClient) {}

  create(request: CreateShareRequest): Promise<Entity> {
    return this.http.post('data-sharing', request);
  }

  list(): Promise<Entity[]> {
    return this.http.get('data-sharing');
  }

  get(id: string): Promise<Entity> {
    return this.http.get(`data-sharing/${encodeURIComponent(id)}`);
  }

  update(id: string, request: UpdateShareRequest): Promise<Entity> {
    return this.http.patch(`data-sharing/${encodeURIComponent(id)}`, request);
  }

  revoke(id: string): Promise<Entity> {
    return this.http.patch(`data-sharing/${encodeURIComponent(id)}/revoke`);
  }

  isActive(id: string): Promise<unknown> {
    return this.http.get(`data-sharing/${encodeURIComponent(id)}/active`);
  }

  extend(id: string, body: Record<string, unknown>): Promise<Entity> {
    return this.http.patch(`data-sharing/${encodeURIComponent(id)}/extend`, body);
  }

  byOwner(ownerAddress: string): Promise<Entity[]> {
    return this.http.get(`data-sharing/owner/${encodeURIComponent(ownerAddress)}`);
  }

  byRecipient(recipientAddress: string): Promise<Entity[]> {
    return this.http.get(`data-sharing/recipient/${encodeURIComponent(recipientAddress)}`);
  }
}
