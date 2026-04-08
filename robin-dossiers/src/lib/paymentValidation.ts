export function normalizeIban(value: string): string {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

export function normalizeBic(value: string): string {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

export function isValidBic(bicRaw: string): boolean {
  const bic = normalizeBic(bicRaw);
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}

export function isValidIban(ibanRaw: string): boolean {
  const iban = normalizeIban(ibanRaw);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (/[A-Z]/.test(ch)) numeric += String(ch.charCodeAt(0) - 55);
    else numeric += ch;
  }
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function isValidMobileMoneyNumber(value: string): boolean {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
