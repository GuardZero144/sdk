import { Address, nativeToScVal, type xdr } from '@stellar/stellar-sdk';

// Small helpers so contract wrappers read like the Rust signatures they mirror.

export const address = (value: string): xdr.ScVal => new Address(value).toScVal();
export const u32 = (value: number): xdr.ScVal => nativeToScVal(value, { type: 'u32' });
export const u64 = (value: number | bigint): xdr.ScVal => nativeToScVal(BigInt(value), { type: 'u64' });
export const string = (value: string): xdr.ScVal => nativeToScVal(value, { type: 'string' });

/** Encodes a 32-byte value given as a Uint8Array or a 64-character hex string. */
export const bytesN32 = (value: Uint8Array | string): xdr.ScVal => {
  const bytes = typeof value === 'string' ? hexToBytes(value) : value;
  if (bytes.length !== 32) throw new Error(`Expected 32 bytes, got ${bytes.length}`);
  return nativeToScVal(bytes, { type: 'bytes' });
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
