import { NextRequest, NextResponse } from "next/server";
import { createPaymentToken } from "@/lib/paymentLinkToken";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dossierId = String(body.dossier_id ?? "").trim();
    const type = String(body.beneficiaire_type ?? "").trim() as "client" | "partenaire";
    if (!dossierId || (type !== "client" && type !== "partenaire")) {
      return NextResponse.json({ error: "dossier_id ou beneficiaire_type invalide" }, { status: 400 });
    }

    const token = createPaymentToken(dossierId, type);
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${origin.replace(/\/$/, "")}/saisie-paiement?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ link, token, expires_in_hours: 168 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Body JSON invalide" }, { status: 400 });
  }
}

