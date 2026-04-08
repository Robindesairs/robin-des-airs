import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentToken } from "@/lib/paymentLinkToken";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const checked = verifyPaymentToken(token);
  if (!checked.valid || !checked.payload) {
    return NextResponse.json({ error: checked.error || "Token invalide" }, { status: 400 });
  }
  return NextResponse.json({
    dossier_id: checked.payload.dossierId,
    beneficiaire_type: checked.payload.beneficiaireType,
    exp: checked.payload.exp,
  });
}

