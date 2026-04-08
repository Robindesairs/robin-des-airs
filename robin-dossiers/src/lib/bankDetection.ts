import { normalizeIban } from "./paymentValidation";

type BankRef = { bankName: string; bic: string };

const FR_BANK_BY_CODE: Record<string, BankRef> = {
  "30004": { bankName: "BNP Paribas", bic: "BNPAFRPP" },
  "30003": { bankName: "Société Générale", bic: "SOGEFRPP" },
  "20041": { bankName: "La Banque Postale", bic: "PSSTFRPPPAR" },
  "10278": { bankName: "Crédit Mutuel", bic: "CMCIFR2A" },
  "10207": { bankName: "Banque Populaire", bic: "CCBPFRPPXXX" },
  "30066": { bankName: "HSBC France", bic: "CCFRFRPP" },
  "14707": { bankName: "BRED Banque Populaire", bic: "BREDFRPPXXX" },
};

const LT_BANK_BY_CODE: Record<string, BankRef> = {
  // Revolut Bank UAB (IBAN LT + bank code 32500)
  "32500": { bankName: "Revolut Bank UAB", bic: "REVOLT21" },
};

const BE_BANK_BY_CODE: Record<string, BankRef> = {
  // Wise Europe SA (IBAN BE + bank code 967)
  "967": { bankName: "Wise Europe SA", bic: "TRWIBEB1XXX" },
};

export function detectBankFromIban(ibanRaw: string): {
  bankName: string | null;
  bic: string | null;
  autoDetected: boolean;
} {
  const iban = normalizeIban(ibanRaw);
  if (iban.length < 8) {
    return { bankName: null, bic: null, autoDetected: false };
  }

  const country = iban.slice(0, 2);
  let ref: BankRef | undefined;

  if (country === "FR" && iban.length >= 14) {
    const bankCode = iban.slice(4, 9);
    ref = FR_BANK_BY_CODE[bankCode];
  } else if (country === "LT" && iban.length >= 9) {
    const bankCode = iban.slice(4, 9);
    ref = LT_BANK_BY_CODE[bankCode];
  } else if (country === "BE" && iban.length >= 7) {
    const bankCode = iban.slice(4, 7);
    ref = BE_BANK_BY_CODE[bankCode];
  }

  if (!ref) return { bankName: null, bic: null, autoDetected: false };

  return {
    bankName: ref.bankName,
    bic: ref.bic,
    autoDetected: true,
  };
}
