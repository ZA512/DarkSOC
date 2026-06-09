import type { SaveGameEnvelope, SavePayloadV1 } from './saveTypes';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const SAVE_CHECKSUM_PEPPER = 'dark-soc-local-save-v1';

function toBase64(value: string): string {
  const bytes = textEncoder.encode(value);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return textDecoder.decode(bytes);
}

function getCryptoApi(): Crypto {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.subtle === 'undefined') {
    throw new Error('Web Crypto API unavailable');
  }

  return globalThis.crypto;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function encodePayload(payload: SavePayloadV1): string {
  return toBase64(JSON.stringify(payload));
}

export function decodePayload(payload: string): SavePayloadV1 {
  return JSON.parse(fromBase64(payload)) as SavePayloadV1;
}

export async function computeChecksum(
  envelopeWithoutChecksum: Omit<SaveGameEnvelope, 'checksum'>,
): Promise<string> {
  const input = [
    envelopeWithoutChecksum.payload,
    envelopeWithoutChecksum.saveVersion,
    envelopeWithoutChecksum.gameVersion,
    SAVE_CHECKSUM_PEPPER,
  ].join('|');
  const hashBuffer = await getCryptoApi().subtle.digest('SHA-256', textEncoder.encode(input));

  return `sha256:${toHex(hashBuffer)}`;
}

export async function verifyChecksum(envelope: SaveGameEnvelope): Promise<boolean> {
  const { checksum, ...envelopeWithoutChecksum } = envelope;

  return checksum === (await computeChecksum(envelopeWithoutChecksum));
}