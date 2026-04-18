/** AES-GCM encrypt/decrypt for pending trainee passwords (Edge only; secret from env). */
const ALGO = "AES-GCM" as const;

async function keyFromSecret(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: ALGO }, false, ["encrypt", "decrypt"]);
}

export async function encryptPendingTraineePassword(plaintext: string, secret: string): Promise<string> {
  const key = await keyFromSecret(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), iv.length);
  let bin = "";
  combined.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function decryptPendingTraineePassword(ciphertextB64: string, secret: string): Promise<string> {
  const key = await keyFromSecret(secret);
  const bin = atob(ciphertextB64);
  const combined = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) combined[i] = bin.charCodeAt(i);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
  return new TextDecoder().decode(pt);
}
