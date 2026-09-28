import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import type { Context } from "./session-contract";
import { performance } from "node:perf_hooks";
import { observe, type SecurityObserver } from "./security-observer";

export type CredentialBinding = { environment: string; context: Context; sessionKey: string; credentialVersion: number; transactionBinding?: string };
export type Credentials = { accessToken: string; refreshToken: string };
export type CredentialEnvelope = { keyId: string; wrappedKey: string; nonce: string; ciphertext: string; tag: string };
export interface KeyWrapper {
  readonly keyId: string;
  wrap(key: Buffer, aad: Buffer): Promise<Buffer>;
  unwrap(keyId: string, ciphertext: Buffer, aad: Buffer): Promise<Buffer>;
}
export class CloudKmsKeyWrapper implements KeyWrapper {
  constructor(readonly keyId: string, private readonly timeoutMs: number,
    private readonly client: Pick<KeyManagementServiceClient, "encrypt" | "decrypt"> = new KeyManagementServiceClient(),
    private readonly observer?: SecurityObserver) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) throw new Error("Invalid KMS timeout");
  }
  private async bounded(operation: "wrap" | "unwrap", work: () => Promise<Buffer>) {
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined, finished = false, success = false;
    try {
      const result = await Promise.race([
        work().then(value => { if (finished) value.fill(0); return value; }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error()), this.timeoutMs); }),
      ]);
      if (performance.now() - started >= this.timeoutMs) { result.fill(0); throw new Error(); }
      success = true;
      return result;
    } catch { throw new Error("Credential encryption unavailable"); }
    finally {
      finished = true; clearTimeout(timer);
      observe(this.observer, { boundary: "kms", operation, outcome: success ? "success" : "unavailable", latencyMs: Math.max(0, performance.now() - started) });
    }
  }
  async wrap(key: Buffer, aad: Buffer) {
    return this.bounded("wrap", async () => {
      const [result] = await this.client.encrypt({ name: this.keyId, plaintext: key, additionalAuthenticatedData: aad }, { timeout: this.timeoutMs, retry: null });
      if (!result.ciphertext || result.name !== this.keyId) throw new Error();
      return Buffer.from(result.ciphertext as Uint8Array);
    });
  }
  async unwrap(keyId: string, ciphertext: Buffer, aad: Buffer) {
    // Rotation is an operator action; accept only the explicitly configured version.
    if (keyId !== this.keyId) throw new Error("Credential encryption unavailable");
    const name = keyId.replace(/\/cryptoKeyVersions\/[^/]+$/, "");
    return this.bounded("unwrap", async () => {
      const [result] = await this.client.decrypt({ name, ciphertext, additionalAuthenticatedData: aad }, { timeout: this.timeoutMs, retry: null });
      if (!result.plaintext) throw new Error();
      const key = Buffer.from(result.plaintext as Uint8Array);
      if (key.length !== 32) { key.fill(0); throw new Error(); }
      return key;
    });
  }
}
const associatedData = (b: CredentialBinding) => Buffer.from(JSON.stringify(["schoolerp-bff-v1", b.environment, b.context, b.sessionKey, b.credentialVersion, ...(b.transactionBinding ? ["membership-selection", b.transactionBinding] : [])]));
async function sealPayload(wrapper: KeyWrapper, binding: CredentialBinding, value: unknown): Promise<CredentialEnvelope> {
  const key = randomBytes(32), nonce = randomBytes(12), aad = associatedData(binding);
  const plaintext = Buffer.from(JSON.stringify(value));
  try {
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { keyId: wrapper.keyId, wrappedKey: (await wrapper.wrap(key, aad)).toString("base64"), nonce: nonce.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
  } catch { throw new Error("Credential encryption unavailable"); }
  finally { key.fill(0); plaintext.fill(0); }
}
async function openPayload(wrapper: KeyWrapper, binding: CredentialBinding, envelope: CredentialEnvelope): Promise<unknown> {
  let key: Buffer | undefined, plaintext: Buffer | undefined;
  try {
    const aad = associatedData(binding);
    if (Buffer.from(envelope.nonce, "base64").length !== 12 || Buffer.from(envelope.tag, "base64").length !== 16) throw new Error();
    key = await wrapper.unwrap(envelope.keyId, Buffer.from(envelope.wrappedKey, "base64"), aad);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.nonce, "base64"));
    decipher.setAAD(aad); decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
    const value = JSON.parse(plaintext.toString("utf8"));
    return value;
  } catch { throw new Error("Credential encryption unavailable"); }
  finally { key?.fill(0); plaintext?.fill(0); }
}

export function sealCredentials(wrapper: KeyWrapper, binding: CredentialBinding, credentials: Credentials) {
  return sealPayload(wrapper, binding, { accessToken: credentials.accessToken, refreshToken: credentials.refreshToken });
}
export async function openCredentials(wrapper: KeyWrapper, binding: CredentialBinding, envelope: CredentialEnvelope): Promise<Credentials> {
  const value = await openPayload(wrapper, binding, envelope) as Credentials | null;
  if (!value || typeof value.accessToken !== "string" || !value.accessToken || typeof value.refreshToken !== "string" || !value.refreshToken) throw new Error("Credential encryption unavailable");
  return { accessToken: value.accessToken, refreshToken: value.refreshToken };
}
export function sealSelectionCredential(wrapper: KeyWrapper, binding: CredentialBinding, selectionToken: string) {
  if (!binding.transactionBinding || binding.context !== "TENANT" || typeof selectionToken !== "string" || !selectionToken.trim() || selectionToken.length > 200) throw new Error("Credential encryption unavailable");
  return sealPayload(wrapper, binding, { selectionToken });
}
export async function openSelectionCredential(wrapper: KeyWrapper, binding: CredentialBinding, envelope: CredentialEnvelope) {
  if (!binding.transactionBinding || binding.context !== "TENANT") throw new Error("Credential encryption unavailable");
  const value = await openPayload(wrapper, binding, envelope) as { selectionToken?: unknown } | null;
  if (!value || Object.keys(value).length !== 1 || typeof value.selectionToken !== "string" || !value.selectionToken.trim() || value.selectionToken.length > 200) throw new Error("Credential encryption unavailable");
  return value.selectionToken;
}
