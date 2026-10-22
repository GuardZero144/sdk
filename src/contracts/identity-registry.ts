import type { InvokeOptions, SorobanClient } from './client';
import { address, bytesN32, string, u64 } from './scval';

/** Wrapper for the `IdentityRegistry` contract (contracts/src/identity_registry.rs). */
export class IdentityRegistryContract {
  constructor(
    private readonly client: SorobanClient,
    readonly contractId: string,
  ) {}

  registerIdentity(owner: string, documentHash: Uint8Array | string, ipfsCid: string, opts: InvokeOptions): Promise<bigint> {
    return this.client.invoke(this.contractId, 'register_identity', [address(owner), bytesN32(documentHash), string(ipfsCid)], opts);
  }

  revokeIdentity(identityId: number | bigint, opts: InvokeOptions): Promise<void> {
    return this.client.invoke(this.contractId, 'revoke_identity', [u64(identityId)], opts);
  }

  getIdentity(identityId: number | bigint, source: string): Promise<Record<string, unknown>> {
    return this.client.read(this.contractId, 'get_identity', [u64(identityId)], source);
  }

  isVerified(identityId: number | bigint, source: string): Promise<boolean> {
    return this.client.read(this.contractId, 'is_verified', [u64(identityId)], source);
  }

  getVersion(source: string): Promise<number> {
    return this.client.read(this.contractId, 'get_version', [], source);
  }
}
