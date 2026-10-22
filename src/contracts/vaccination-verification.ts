import type { InvokeOptions, SorobanClient } from './client';
import { address, bytesN32, string, u32, u64 } from './scval';

/** Mirrors `VaccinationStatus` in contracts/src/vaccination_verification.rs. */
export type VaccinationStatus = 'Pending' | 'Valid' | 'Expired' | 'Revoked' | 'Invalid';

export interface SubmitCredentialParams {
  issuer: string;
  patientId: number | bigint;
  vaccineType: string;
  doseNumber: number;
  totalDoses: number;
  lotNumber: string;
  /** Unix timestamp (seconds). */
  administeredAt: number | bigint;
  /** Unix timestamp (seconds). */
  expiryDate: number | bigint;
  proofHash: Uint8Array | string;
  zkProof: Uint8Array | string;
}

/** Wrapper for the `VaccinationVerification` contract. */
export class VaccinationVerificationContract {
  constructor(
    private readonly client: SorobanClient,
    readonly contractId: string,
  ) {}

  /** Issues a credential. Must be signed by `params.issuer`. Returns the new credential id. */
  submitCredential(params: SubmitCredentialParams, opts: InvokeOptions): Promise<bigint> {
    return this.client.invoke(
      this.contractId,
      'submit_credential',
      [
        address(params.issuer),
        u64(params.patientId),
        string(params.vaccineType),
        u32(params.doseNumber),
        u32(params.totalDoses),
        string(params.lotNumber),
        u64(params.administeredAt),
        u64(params.expiryDate),
        bytesN32(params.proofHash),
        bytesN32(params.zkProof),
      ],
      opts,
    );
  }

  /** Marks a credential verified. Must be signed by an authorized `verifier`. */
  verifyCredential(credentialId: number | bigint, verifier: string, opts: InvokeOptions): Promise<boolean> {
    return this.client.invoke(this.contractId, 'verify_credential', [u64(credentialId), address(verifier)], opts);
  }

  revokeCredential(credentialId: number | bigint, issuer: string, reason: string, opts: InvokeOptions): Promise<void> {
    return this.client.invoke(this.contractId, 'revoke_credential', [u64(credentialId), address(issuer), string(reason)], opts);
  }

  async checkVaccinationStatus(credentialId: number | bigint, source: string): Promise<VaccinationStatus> {
    // Unit enum variants decode as a single-element array, e.g. ["Valid"].
    const raw = await this.client.read<unknown>(this.contractId, 'check_vaccination_status', [u64(credentialId)], source);
    return (Array.isArray(raw) ? raw[0] : raw) as VaccinationStatus;
  }

  isFullyVaccinated(patientId: number | bigint, source: string): Promise<boolean> {
    return this.client.read(this.contractId, 'is_fully_vaccinated', [u64(patientId)], source);
  }

  getCredential(credentialId: number | bigint, source: string): Promise<Record<string, unknown>> {
    return this.client.read(this.contractId, 'get_credential', [u64(credentialId)], source);
  }

  getCredentialByPatient(patientId: number | bigint, source: string): Promise<bigint> {
    return this.client.read(this.contractId, 'get_credential_by_patient', [u64(patientId)], source);
  }
}
