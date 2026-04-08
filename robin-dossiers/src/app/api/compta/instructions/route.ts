import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isValidBic, isValidIban, isValidMobileMoneyNumber, normalizeBic, normalizeIban } from "@/lib/paymentValidation";
import { detectBankFromIban } from "@/lib/bankDetection";

type BeneficiaireType = "client" | "partenaire";
type ModePaiement = "RIB" | "WAVE" | "ORANGE_MONEY";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dossierId = String(body.dossier_id ?? "").trim();
    const type = String(body.beneficiaire_type ?? "").trim() as BeneficiaireType;
    const mode = String(body.mode_paiement ?? "").trim().toUpperCase() as ModePaiement;
    const reference = String(body.reference_paiement ?? "").trim();
    const bicInput = String(body.bic_code ?? "").trim();
    const banqueNomInput = String(body.banque_nom ?? "").trim();
    const nom = String(body.beneficiaire_nom ?? "").trim();

    if (!dossierId || (type !== "client" && type !== "partenaire")) {
      return NextResponse.json({ error: "dossier_id ou beneficiaire_type invalide" }, { status: 400 });
    }
    if (!["RIB", "WAVE", "ORANGE_MONEY"].includes(mode)) {
      return NextResponse.json({ error: "mode_paiement invalide (RIB, WAVE, ORANGE_MONEY)" }, { status: 400 });
    }
    if (!reference) {
      return NextResponse.json({ error: "Coordonnées de paiement obligatoires" }, { status: 400 });
    }
    let bankName: string | null = null;
    let autoDetected = false;
    let bicFinal: string | null = null;
    if (mode === "RIB") {
      if (!isValidIban(reference)) {
        return NextResponse.json({ error: "IBAN invalide (checksum incorrect)" }, { status: 400 });
      }
      const detected = detectBankFromIban(reference);
      bankName = banqueNomInput || detected.bankName || null;
      autoDetected = detected.autoDetected && !!detected.bankName;
      const bicToUse = bicInput || detected.bic || "";
      if (!bicToUse || !isValidBic(bicToUse)) {
        return NextResponse.json({ error: "BIC invalide" }, { status: 400 });
      }
      bicFinal = normalizeBic(bicToUse);
    } else if (!isValidMobileMoneyNumber(reference)) {
      return NextResponse.json({ error: "Numéro mobile money invalide" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: dossierData, error: dossierErr } = await supabase
      .from("dossiers")
      .select("source")
      .eq("id", dossierId)
      .single();
    if (dossierErr) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    const isAgencePartner = type === "partenaire" && dossierData?.source === "partenariat_agence";
    const isMobileMode = mode === "WAVE" || mode === "ORANGE_MONEY";
    if (isMobileMode && !isAgencePartner) {
      return NextResponse.json(
        { error: "Paiement mobile autorisé uniquement pour un partenaire agence" },
        { status: 400 }
      );
    }

    const existing = await supabase
      .from("compta_versements")
      .select("montant, statut")
      .eq("dossier_id", dossierId)
      .eq("beneficiaire_type", type)
      .single();

    const payload = {
      dossier_id: dossierId,
      beneficiaire_type: type,
      beneficiaire_nom: nom || null,
      montant: Number(existing.data?.montant ?? body.montant ?? 0),
      statut: existing.data?.statut ?? "A_PAYER",
      mode_paiement: mode,
      reference_paiement: mode === "RIB" ? normalizeIban(reference) : reference.replace(/\s+/g, ""),
      bic_code: mode === "RIB" ? bicFinal : null,
      banque_nom: mode === "RIB" ? bankName : null,
      banque_detectee_auto: mode === "RIB" ? autoDetected : false,
      commentaire: "Coordonnées saisies par bénéficiaire",
    };

    const { data, error } = await supabase
      .from("compta_versements")
      .upsert(payload, { onConflict: "dossier_id,beneficiaire_type" })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Body JSON invalide" },
      { status: 400 }
    );
  }
}
