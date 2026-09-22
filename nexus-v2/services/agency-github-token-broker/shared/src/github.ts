function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function pemToDer(privateKeyPem: string): { der: Uint8Array; isPkcs1: boolean } {
  // Vault stores often hold PEMs with literal "\n" sequences, surrounding
  // quotes, or other transport junk; keep only the base64 alphabet.
  const normalized = privateKeyPem.replace(/\\n/g, "\n");
  const isPkcs1 = normalized.includes("BEGIN RSA PRIVATE KEY");
  const base64 = normalized
    .replace(/-----[^-]*-----/g, " ")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("invalid_github_app_private_key_encoding");
  }
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    der[i] = binary.charCodeAt(i);
  }
  return { der, isPkcs1 };
}

function wrapPkcs1AsPkcs8(pkcs1Der: Uint8Array): Uint8Array {
  // WebCrypto only imports PKCS#8. GitHub App keys can be PKCS#1
  // ("BEGIN RSA PRIVATE KEY"); wrap the DER in a PKCS#8 PrivateKeyInfo:
  // SEQUENCE { INTEGER 0, SEQUENCE { OID rsaEncryption, NULL }, OCTET STRING der }.
  if (pkcs1Der.length > 0xffff) {
    throw new Error("invalid_github_app_private_key");
  }
  const contentLength = 3 + 15 + 4 + pkcs1Der.length;
  const out = new Uint8Array(4 + contentLength);
  out.set(
    [
      0x30, 0x82, (contentLength >> 8) & 0xff, contentLength & 0xff,
      0x02, 0x01, 0x00,
      0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
      0x01, 0x05, 0x00,
      0x04, 0x82, (pkcs1Der.length >> 8) & 0xff, pkcs1Der.length & 0xff
    ],
    0
  );
  out.set(pkcs1Der, 26);
  return out;
}

export async function createGitHubAppJwt(
  appId: string,
  privateKeyPem: string,
  nowSeconds: number
): Promise<string> {
  if (!/^\d+$/.test(appId)) {
    throw new Error("invalid_github_app_id");
  }

  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({
    iat: nowSeconds - 60,
    exp: nowSeconds + 540,
    iss: appId
  });
  const signingInput = `${header}.${payload}`;
  const { der, isPkcs1 } = pemToDer(privateKeyPem);
  const pkcs8 = isPkcs1 ? wrapPkcs1AsPkcs8(der) : der;
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8.buffer as ArrayBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch {
    throw new Error("invalid_github_app_private_key");
  }
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${Buffer.from(signature).toString("base64url")}`;
}
