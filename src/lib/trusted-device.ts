export const TRUSTED_DEVICE_COOKIE  = "lexia_trusted_device";
export const TRUSTED_DEVICE_MAX_AGE = 30 * 24 * 60 * 60; // 30 días en segundos

function getSecretBytes(): ArrayBuffer {
  const secret = process.env.TRUSTED_DEVICE_SECRET;
  if (!secret) throw new Error("TRUSTED_DEVICE_SECRET no está configurado");
  const encoded = new TextEncoder().encode(secret);
  return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
}

async function computeHmac(userId: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getSecretBytes(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payloadEncoded = new TextEncoder().encode(`${userId}.${expiresAt}`);
  const payload = payloadEncoded.buffer.slice(payloadEncoded.byteOffset, payloadEncoded.byteOffset + payloadEncoded.byteLength) as ArrayBuffer;
  const sig = await crypto.subtle.sign("HMAC", key, payload);
  // URL-safe base64: sin +, /, ni = para evitar problemas de encoding en cookies
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Genera el token que se almacena en la cookie. */
export async function createTrustedDeviceToken(userId: string): Promise<string> {
  const expiresAt = Date.now() + TRUSTED_DEVICE_MAX_AGE * 1000;
  const sig = await computeHmac(userId, expiresAt);
  return `${userId}.${expiresAt}.${sig}`;
}

/**
 * Verifica el token de la cookie.
 * Devuelve true solo si la firma es válida, no ha expirado
 * y pertenece al userId de la sesión actual.
 */
export async function verifyTrustedDeviceToken(
  token: string,
  userId: string,
): Promise<boolean> {
  try {
    // Formato: <uuid>.<timestamp>.<base64sig>
    // UUID y timestamp no contienen puntos; base64 tampoco.
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [tokenUserId, expStr, sig] = parts;
    const expiresAt = parseInt(expStr, 10);

    if (tokenUserId !== userId) return false;
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSig = await computeHmac(userId, expiresAt);
    return sig === expectedSig;
  } catch {
    return false;
  }
}
