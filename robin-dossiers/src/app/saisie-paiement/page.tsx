"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { detectBankFromIban } from "@/lib/bankDetection";

type BeneficiaireType = "client" | "partenaire";
type ModePaiement = "RIB" | "WAVE" | "ORANGE_MONEY";

function formatIbanForDisplay(value: string): string {
  const clean = String(value || "").replace(/\s+/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

export default function SaisiePaiementPage() {
  const searchParams = useSearchParams();
  const [dossierId, setDossierId] = useState("");
  const [type, setType] = useState<BeneficiaireType>("client");
  const [nom, setNom] = useState("");
  const [mode, setMode] = useState<ModePaiement>("RIB");
  const [reference, setReference] = useState("");
  const [confirmReference, setConfirmReference] = useState("");
  const [bic, setBic] = useState("");
  const [banqueNom, setBanqueNom] = useState("");
  const [autoBankHint, setAutoBankHint] = useState<string | null>(null);
  const [detectedBankName, setDetectedBankName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [netAmount, setNetAmount] = useState<number | null>(null);
  const [isDossierLocked, setIsDossierLocked] = useState(false);
  const [dossierSource, setDossierSource] = useState<string | null>(null);

  const helper = useMemo(() => {
    if (mode === "RIB") return "IBAN / RIB complet";
    if (mode === "WAVE") return "Numéro Wave (ex: 22177xxxxxxx)";
    return "Numéro Orange Money";
  }, [mode]);

  useEffect(() => {
    const token = searchParams.get("token");
    const d = searchParams.get("dossier");
    const t = searchParams.get("type");
    if (token) {
      fetch(`/api/compta/resolve-token?token=${encodeURIComponent(token)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!json?.dossier_id) return;
          setDossierId(String(json.dossier_id));
          setIsDossierLocked(true);
          if (json.beneficiaire_type === "client" || json.beneficiaire_type === "partenaire") {
            setType(json.beneficiaire_type);
          }
        })
        .catch(() => {});
      return;
    }
    if (d) {
      setDossierId(d);
      setIsDossierLocked(true);
    } else {
      setIsDossierLocked(false);
    }
    if (t === "client" || t === "partenaire") setType(t);
  }, [searchParams]);

  useEffect(() => {
    const id = dossierId.trim();
    if (!id) {
      setNetAmount(null);
      return;
    }
    fetch("/api/compta")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.rows) ? json.rows : [];
        const row = rows.find((x: { dossier_id?: string; client_nom?: string; partenaire_nom?: string }) => x.dossier_id === id);
        if (!row) {
          setNetAmount(null);
          setDossierSource(null);
          return;
        }
        setDossierSource(String(row.source ?? ""));
        const amount = type === "partenaire"
          ? Number(row.partenaire_montant ?? 0)
          : Number(row.client_montant ?? 0);
        setNetAmount(Number.isFinite(amount) ? amount : null);
        if (type === "client" && !nom.trim() && row.client_nom) {
          setNom(String(row.client_nom));
        }
        if (type === "partenaire" && !nom.trim() && row.partenaire_nom && row.partenaire_nom !== "Aucun partenaire") {
          setNom(String(row.partenaire_nom));
        }
      })
      .catch(() => setNetAmount(null));
  }, [dossierId, type, nom]);

  const mobileAllowed = type === "partenaire" && dossierSource === "partenariat_agence";

  useEffect(() => {
    if (!mobileAllowed && mode !== "RIB") {
      setMode("RIB");
    }
  }, [mobileAllowed, mode]);

  useEffect(() => {
    if (mode !== "RIB") return;
    const d = detectBankFromIban(reference);
    if (d.autoDetected) {
      if (!banqueNom) setBanqueNom(d.bankName || "");
      if (!bic) setBic(d.bic || "");
      setAutoBankHint(`Banque détectée: ${d.bankName} (${d.bic})`);
      setDetectedBankName(d.bankName);
    } else {
      setAutoBankHint(null);
      setDetectedBankName(null);
    }
  }, [reference, mode, banqueNom, bic]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (reference.trim() !== confirmReference.trim()) {
        throw new Error("Les champs de confirmation ne correspondent pas.");
      }
      const res = await fetch("/api/compta/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossier_id: dossierId.trim(),
          beneficiaire_type: type,
          beneficiaire_nom: nom.trim(),
          mode_paiement: mode,
          reference_paiement: reference.trim(),
          bic_code: mode === "RIB" ? bic.trim() : null,
          banque_nom: mode === "RIB" ? banqueNom.trim() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur lors de la sauvegarde");
      setMessage("Informations enregistrées. Merci, votre paiement peut être traité.");
      setReference("");
      setConfirmReference("");
      setBic("");
      setBanqueNom("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#1f2937] p-5">
      <div className="max-w-xl mx-auto bg-white border border-[#e5e7eb] rounded-xl p-6">
        <h1 className="text-xl font-bold mb-2">Saisie des informations de paiement</h1>
        <p className="text-sm text-[#6b7280] mb-5">
          Renseignez vos coordonnées pour recevoir votre versement.
        </p>

        <div className="mb-5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 rounded-full bg-white border-2 border-emerald-400 shadow-sm flex items-center justify-center">
              <div className="absolute inset-1 rounded-full border border-emerald-200" />
              <div className="z-10 text-center">
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">Net</div>
                <div className="text-xl font-extrabold text-emerald-700 leading-none">
                  {netAmount != null ? `${Math.round(netAmount)}€` : "—"}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                {type === "partenaire" ? "Paiement partenaire" : "Paiement client"}
              </div>
              <div className="text-lg font-bold text-slate-800">
                Montant net à recevoir
              </div>
              <div className="text-sm text-slate-600">
                {netAmount != null ? `${netAmount.toLocaleString("fr-FR")} €` : "Montant indisponible"}
              </div>
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[11px] font-semibold">
                Vérifiez vos coordonnées avant validation
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Référence dossier</label>
            <input
              value={dossierId}
              onChange={(e) => setDossierId(e.target.value)}
              placeholder="RDA-2026-901"
              className={`w-full border rounded-md px-3 py-2 text-sm ${isDossierLocked ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed" : "border-[#d1d5db]"}`}
              required
              readOnly={isDossierLocked}
            />
            {isDossierLocked && (
              <p className="mt-1 text-xs text-slate-500">Référence verrouillée depuis votre lien sécurisé.</p>
            )}
          </div>

          <input type="hidden" value={type} readOnly />

          <div>
            <label className="block text-xs font-semibold mb-1">Nom complet</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom Prénom"
              className="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">Mode de paiement</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("RIB")}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${mode === "RIB" ? "border-emerald-500 bg-emerald-50" : "border-[#d1d5db] bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">🏦</span>
                  <span className="font-semibold">RIB / IBAN</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("WAVE")}
                disabled={!mobileAllowed}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mode === "WAVE" ? "border-emerald-500 bg-emerald-50" : "border-[#d1d5db] bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">W</span>
                  <span className="font-semibold">Wave</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("ORANGE_MONEY")}
                disabled={!mobileAllowed}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mode === "ORANGE_MONEY" ? "border-emerald-500 bg-emerald-50" : "border-[#d1d5db] bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700">OM</span>
                  <span className="font-semibold">Orange Money</span>
                </div>
              </button>
            </div>
            {!mobileAllowed && (
              <p className="mt-1 text-xs text-slate-500">
                Paiement mobile (Wave/Orange Money) disponible uniquement pour les partenaires agence.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">{helper}</label>
            <input
              value={reference}
              onChange={(e) => {
                const raw = e.target.value;
                setReference(mode === "RIB" ? formatIbanForDisplay(raw) : raw);
              }}
              placeholder={mode === "RIB" ? "FR76..." : "Numéro mobile money"}
              className={`w-full border border-[#d1d5db] rounded-md px-3 py-2 text-sm ${mode === "RIB" ? "font-mono tracking-wide" : ""}`}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Confirmer {mode === "RIB" ? "IBAN / RIB" : "numéro"}</label>
            <input
              value={confirmReference}
              onChange={(e) => {
                const raw = e.target.value;
                setConfirmReference(mode === "RIB" ? formatIbanForDisplay(raw) : raw);
              }}
              placeholder={mode === "RIB" ? "FR76..." : "Numéro mobile money"}
              className={`w-full border border-[#d1d5db] rounded-md px-3 py-2 text-sm ${mode === "RIB" ? "font-mono tracking-wide" : ""}`}
              required
            />
          </div>

          {mode === "RIB" && (
            <div>
              <label className="block text-xs font-semibold mb-1">BIC</label>
              <input
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="BNPAFRPP"
                className="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-sm uppercase"
                required
              />
            </div>
          )}

          {mode === "RIB" && (
            <div>
              <label className="block text-xs font-semibold mb-1">Banque</label>
              <input
                value={banqueNom}
                onChange={(e) => setBanqueNom(e.target.value)}
                placeholder="Nom de la banque"
                className="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-sm"
              />
              {autoBankHint && (
                <p className="mt-1 text-xs text-emerald-700">{autoBankHint}</p>
              )}
              {detectedBankName && (
                <div className="mt-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-semibold">
                  Banque détectée automatiquement: {detectedBankName}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-md text-white font-medium disabled:opacity-50"
            style={{ background: "#0f766e" }}
          >
            {saving ? "Enregistrement..." : "Enregistrer mes informations"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </main>
  );
}
