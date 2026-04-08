import crypto from "crypto";

export type PaymentLinkPayload = {
  dossierId: string;
  beneficiaireType: "client" | "partenaire";
  exp: number;
};

function getSecret(): string {
  return process.env.PAYMENT_LINK_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createPaymentToken(dossierId: string, beneficiaireType: "client" | "partenaire", ttlSeconds = 7 * 24 * 3600): string {
  const payload: PaymentLinkPayload = {
    dossierId,
    beneficiaireType,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyPaymentToken(token: string): { valid: boolean; payload?: PaymentLinkPayload; error?: string } {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return { valid: false, error: "Token invalide" };
  const expected = sign(encoded);
  if (expected !== signature) return { valid: false, error: "Signature invalide" };
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as PaymentLinkPayload;
    if (!payload?.dossierId || !payload?.beneficiaireType || !payload?.exp) {
      return { valid: false, error: "Payload invalide" };
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expiré" };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Token illisible" };
  }
}

