/**
 * Cloudflare Workers-compatible RSA entitlement signing and verification.
 * Uses WebCrypto only; no Node.js crypto, filesystem, or external dependencies.
 *
 * The serialized claims are JSON.stringify(claims), matching server.js exactly.
 * Import the private key from a Worker secret; never bundle it in source.
 */
const ALGORITHM = Object.freeze({
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
});

function decodePem(pem, label) {
  if (typeof pem !== "string" || !pem.trim()) {
    throw new TypeError("A PEM key is required.");
  }
  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;
  const normalized = pem.trim();
  if (!normalized.startsWith(begin) || !normalized.endsWith(end)) {
    throw new TypeError(`Expected a ${label} PEM key.`);
  }
  const encoded = normalized
    .slice(begin.length, normalized.length - end.length)
    .replace(/\s+/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new TypeError("PEM key contains invalid base64.");
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function encodeBase64(bytes) {
  let binary = "";
  // Chunk to avoid argument/string limits for larger buffers.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function serializeClaims(claims) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new TypeError("Entitlement claims must be an object.");
  }
  return new TextEncoder().encode(JSON.stringify(claims));
}

export async function signEntitlement(claims, privateKeyPem) {
  const payload = serializeClaims(claims);
  const keyData = decodePem(privateKeyPem, "PRIVATE KEY");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    ALGORITHM,
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    key,
    payload
  );
  return {
    claims,
    signature: encodeBase64(new Uint8Array(signature)),
    algorithm: "RSASSA-PKCS1-v1_5-SHA256",
  };
}

export async function verifyEntitlement(claims, signature, publicKeyPem) {
  if (typeof signature !== "string" || !signature.trim()) return false;
  const payload = serializeClaims(claims);
  const keyData = decodePem(publicKeyPem, "PUBLIC KEY");
  const key = await crypto.subtle.importKey(
    "spki",
    keyData,
    ALGORITHM,
    false,
    ["verify"]
  );
  let signatureBytes;
  try {
    const binary = atob(signature);
    signatureBytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  } catch {
    return false;
  }
  return crypto.subtle.verify(
    ALGORITHM,
    key,
    signatureBytes,
    payload
  );
}
