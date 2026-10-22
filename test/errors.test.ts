import { describe, expect, it } from 'vitest';
import { ContractError, ContractErrorCode } from '../src';
import { scval } from '../src';

describe('ContractError.fromMessage', () => {
  it('maps Soroban contract error codes to names', () => {
    const err = ContractError.fromMessage('HostError: Error(Contract, #19)');
    expect(err.code).toBe(ContractErrorCode.CredentialRevoked);
    expect(err.message).toMatch(/^CredentialRevoked: /);
  });

  it('leaves non-contract errors without a code', () => {
    expect(ContractError.fromMessage('network down').code).toBeUndefined();
  });
});

describe('scval.bytesN32', () => {
  it('accepts 64-char hex', () => {
    expect(() => scval.bytesN32('ab'.repeat(32))).not.toThrow();
  });

  it('rejects the wrong length', () => {
    expect(() => scval.bytesN32('abcd')).toThrow(/Expected 32 bytes/);
  });
});
