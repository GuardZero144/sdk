# @guardzero/sdk

TypeScript SDK for [ValidFi](https://github.com/GuardZero144/ValidFi), GuardZero's privacy-preserving health credential platform on Stellar Soroban.

It has two layers:

- **`ValidFiApi`**: a typed client for the ValidFi NestJS backend (auth, identities, verifications, data sharing, health authorities, credentials).
- **Contract clients**: wrappers around the ValidFi Soroban contracts, built on `@stellar/stellar-sdk`, for reading state and submitting signed transactions.

> **Status:** early scaffold (v0.1.0). The API surface mirrors the ValidFi `main` branch and will change as the backend and contracts settle.

## Install

```bash
npm install @guardzero/sdk
```

Not yet published to npm. Until then, install from GitHub:

```bash
npm install github:GuardZero144/sdk
```

## Usage

### Backend API

```ts
import { ValidFiApi } from '@guardzero/sdk';

const api = new ValidFiApi({ baseUrl: 'http://localhost:3001/api/v1' });

// Sign a message with the user's Stellar wallet, then exchange it for a JWT.
await api.auth.login({ walletAddress, signature, message });

const identity = await api.identities.create({ walletAddress, documentHash, ipfsCid });
const verification = await api.verifications.create({
  identityId: identity.id,
  walletAddress,
  proofHash,
  verificationCommitment,
});
```

The JWT from `login` is stored on the client and sent on every later request. Non-2xx responses throw `ApiError` with `status` and the server `message`.

### Soroban contracts

```ts
import { SorobanClient, TESTNET, VaccinationVerificationContract } from '@guardzero/sdk';
import { signTransaction } from '@stellar/freighter-api';

const soroban = new SorobanClient(TESTNET);
const vaccination = new VaccinationVerificationContract(soroban, VACCINATION_CONTRACT_ID);

// Reads are simulated: no signature or fee needed.
const status = await vaccination.checkVaccinationStatus(1n, walletAddress); // 'Valid' | 'Revoked' | ...

// Writes are simulated, signed by your wallet, submitted, and awaited.
const credentialId = await vaccination.submitCredential(
  { issuer, patientId: 42n, vaccineType: 'MMR', doseNumber: 1, totalDoses: 2, lotNumber: 'L-001',
    administeredAt: 1735689600n, expiryDate: 1893456000n, proofHash, zkProof },
  {
    source: issuer,
    signer: async (xdr, networkPassphrase) =>
      (await signTransaction(xdr, { networkPassphrase })).signedTxXdr,
  },
);
```

Contract failures throw `ContractError`. When Soroban reports `Error(Contract, #N)`, `error.code` holds the matching `ContractErrorCode` (for example `CredentialRevoked`).

For a contract or method without a wrapper yet, call `SorobanClient` directly:

```ts
import { scval } from '@guardzero/sdk';

await soroban.read(contractId, 'is_verification_valid', [scval.u64(7)], walletAddress);
```

## Coverage

| Area | Wrapped |
| --- | --- |
| REST: `auth`, `identities`, `verifications`, `data-sharing`, `health-authorities`, `credentials` | ✅ |
| REST: `access-control`, `permissions`, `audit`, `analytics`, `backup`, `indexer`, `credential-export`, `credential-versioning`, `credential-sharing-history` | ⏳ |
| Contract: `IdentityRegistry`, `VaccinationVerification` | ✅ (core methods) |
| Contract: `Verification`, `AccessControl`, `DataSharing`, `Auditing` | ⏳ use `SorobanClient` directly |
| ZK proof generation (Circom / SnarkJS) | ⏳ |

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Request and response types live in `src/api/types.ts` and mirror `backend/src/**/dto` in ValidFi. Contract error codes in `src/errors.ts` mirror `contracts/src/errors.rs`. When either changes upstream, update these files.

## Related

- [ValidFi](https://github.com/GuardZero144/ValidFi): contracts, backend, frontend and ZK circuits
- [docs](https://github.com/GuardZero144/docs): developer documentation
