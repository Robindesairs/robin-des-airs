"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Versement = {
  statut?: string;
  montant?: number;
  date_paiement?: string | null;
  date_reception_virement?: string | null;
  mode_paiement?: string | null;
  reference_paiement?: string | null;
  bic_code?: string | null;
  banque_nom?: string | null;
  banque_detectee_auto?: boolean | null;
};

type ComptaRow = {
  dossier_id: string;
  statut_dossier: string;
  source: string | null;
  date_creation: string | null;
  client_nom: string;
  client_montant: number;
  partenaire_nom: string;
  partenaire_montant: number;
  versement_client: Versement | null;
  versement_partenaire: Versement | null;
};

function fmtEuro(v: number): string {
  return `${Number(v || 0).toLocaleString("fr-FR")} €`;
}

function statusClass(statut: string | undefined): string {
  if (statut === "PAYE") return "bg-emerald-100 text-emerald-800";
  if (statut === "A_PAYER") return "bg-amber-100 text-amber-800";
  if (statut === "PLANIFIE") return "bg-blue-100 text-blue-800";
  if (statut === "ANNULE") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

export default function ComptaPage() {
  const [rows, setRows] = useState<ComptaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/compta")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur de chargement compta");
        return r.json();
      })
      .then((json) => setRows(Array.isArray(json.rows) ? json.rows : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const txt = [
        r.dossier_id,
        r.client_nom,
        r.partenaire_nom,
        r.source ?? "",
        r.statut_dossier,
      ]
        .join(" ")
        .toLowerCase();
      return txt.includes(q);
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const dueClient = r.client_montant > 0 && r.versement_client?.statut !== "PAYE";
        const duePartner = r.partenaire_montant > 0 && r.versement_partenaire?.statut !== "PAYE";
        if (dueClient) acc.client += r.client_montant;
        if (duePartner) acc.partenaire += r.partenaire_montant;
        return acc;
      },
      { client: 0, partenaire: 0 }
    );
  }, [filtered]);

  const markPaid = async (
    row: ComptaRow,
    type: "client" | "partenaire"
  ) => {
    const key = `${row.dossier_id}:${type}`;
    setSavingKey(key);
    const montant = type === "client" ? row.client_montant : row.partenaire_montant;
    const current = type === "client" ? row.versement_client : row.versement_partenaire;
    const beneficiaireNom = type === "client" ? row.client_nom : row.partenaire_nom;
    if (!current?.mode_paiement || !current?.reference_paiement) {
      setError(`Coordonnées manquantes pour ${type} (${row.dossier_id})`);
      setSavingKey(null);
      return;
    }
    try {
      const res = await fetch("/api/compta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossier_id: row.dossier_id,
          beneficiaire_type: type,
          beneficiaire_nom: beneficiaireNom,
          montant,
          statut: "PAYE",
          mode_paiement: current.mode_paiement,
          reference_paiement: current.reference_paiement,
          date_paiement: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur enregistrement paiement");
      }
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur enregistrement paiement");
    } finally {
      setSavingKey(null);
    }
  };

  const markReceived = async (row: ComptaRow, type: "client" | "partenaire") => {
    const key = `${row.dossier_id}:${type}:received`;
    setSavingKey(key);
    const current = type === "client" ? row.versement_client : row.versement_partenaire;
    try {
      const res = await fetch("/api/compta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossier_id: row.dossier_id,
          beneficiaire_type: type,
          beneficiaire_nom: type === "client" ? row.client_nom : row.partenaire_nom,
          montant: type === "client" ? row.client_montant : row.partenaire_montant,
          statut: current?.statut ?? "A_PAYER",
          mode_paiement: current?.mode_paiement ?? null,
          reference_paiement: current?.reference_paiement ?? null,
          date_paiement: current?.date_paiement ?? null,
          date_reception_virement: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour réception");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingKey(null);
    }
  };

  const requestCorrection = async (row: ComptaRow, type: "client" | "partenaire") => {
    const key = `${row.dossier_id}:${type}:correction`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/compta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossier_id: row.dossier_id,
          beneficiaire_type: type,
          beneficiaire_nom: type === "client" ? row.client_nom : row.partenaire_nom,
          montant: type === "client" ? row.client_montant : row.partenaire_montant,
          statut: "A_PAYER",
          mode_paiement: null,
          reference_paiement: null,
          bic_code: null,
          commentaire: "Coordonnées à corriger par le bénéficiaire",
        }),
      });
      if (!res.ok) throw new Error("Erreur demande de correction");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingKey(null);
    }
  };

  const sendPaymentLink = async (row: ComptaRow, type: "client" | "partenaire", channel: "whatsapp" | "email") => {
    try {
      const res = await fetch("/api/compta/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossier_id: row.dossier_id, beneficiaire_type: type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.link) throw new Error(json.error || "Impossible de générer le lien");

      const beneficiaryName = type === "client" ? row.client_nom : row.partenaire_nom;
      const text = `Bonjour ${beneficiaryName}, merci de renseigner vos coordonnées de paiement ici: ${json.link}`;
      if (channel === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      } else {
        const subject = `Saisie de vos coordonnées de paiement - ${row.dossier_id}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_blank");
      }
      setShareMessage(`Lien ${type} généré et prêt à être envoyé.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur génération du lien");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--crm-bg2)", color: "var(--crm-text)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
      <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-3" style={{ background: "var(--crm-navy)" }}>
        <div>
          <div className="text-white text-xl font-bold tracking-tight">ROBIN <span style={{ color: "var(--crm-gold)" }}>des Airs</span></div>
          <div className="text-white/60 text-xs mt-0.5">Comptabilité — ventilation clients et partenaires</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-md text-white font-medium text-sm border border-white/30">Dossiers</Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">A payer clients</div>
            <div className="text-2xl font-bold" style={{ color: "var(--crm-green)" }}>{fmtEuro(totals.client)}</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">A payer partenaires</div>
            <div className="text-2xl font-bold" style={{ color: "var(--crm-navy)" }}>{fmtEuro(totals.partenaire)}</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">Total à payer</div>
            <div className="text-2xl font-bold">{fmtEuro(totals.client + totals.partenaire)}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="🔍 Dossier, client, partenaire, source…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] bg-white outline-none focus:border-[var(--crm-green)]"
          />
        </div>
        {shareMessage && <div className="mb-3 text-xs text-emerald-700">{shareMessage}</div>}

        <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[1420px]">
              <thead>
                <tr>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Dossier</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Client</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">A verser client</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Coord. client</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Statut client</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Partenaire</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Commission partenaire</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Coord. partenaire</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Statut partenaire</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Date reçu virement</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="py-10 text-center text-[var(--crm-text2)]">Chargement…</td></tr>
                ) : error ? (
                  <tr><td colSpan={11} className="py-10 text-center text-[var(--crm-red)]">Erreur : {error}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="py-10 text-center text-[var(--crm-text2)]">Aucune ligne comptable</td></tr>
                ) : (
                  filtered.map((r) => {
                    const keyClient = `${r.dossier_id}:client`;
                    const keyPartner = `${r.dossier_id}:partenaire`;
                    const clientPaid = r.versement_client?.statut === "PAYE";
                    const partnerPaid = r.versement_partenaire?.statut === "PAYE";
                    return (
                      <tr key={r.dossier_id} className="border-b border-[var(--crm-border)]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--crm-navy)]">{r.dossier_id}</div>
                          <div className="text-[11px] text-[var(--crm-text3)]">{r.statut_dossier} · {r.source ?? "—"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`/dossiers/${encodeURIComponent(r.dossier_id)}`}
                            className="text-[var(--crm-navy)] font-semibold underline"
                          >
                            {r.client_nom}
                          </a>
                        </td>
                        <td className="py-3 px-4 font-bold" style={{ color: "var(--crm-green)" }}>{fmtEuro(r.client_montant)}</td>
                        <td className="py-3 px-4 text-[11px]">
                          {r.versement_client?.mode_paiement && r.versement_client?.reference_paiement
                            ? `${r.versement_client.mode_paiement} · ${r.versement_client.reference_paiement}${r.versement_client.bic_code ? ` · BIC ${r.versement_client.bic_code}` : ""}${r.versement_client.banque_nom ? ` · ${r.versement_client.banque_nom}${r.versement_client.banque_detectee_auto ? " (auto)" : ""}` : ""}`
                            : (
                              <a className="text-blue-600 underline" href={`/saisie-paiement?dossier=${encodeURIComponent(r.dossier_id)}&type=client`} target="_blank" rel="noreferrer">
                                Saisie client
                              </a>
                            )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusClass(r.versement_client?.statut ?? "A_PAYER")}`}>
                            {r.versement_client?.statut ?? "A_PAYER"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{r.partenaire_nom}</td>
                        <td className="py-3 px-4 font-bold">{fmtEuro(r.partenaire_montant)}</td>
                        <td className="py-3 px-4 text-[11px]">
                          {r.partenaire_montant <= 0
                            ? "N/A"
                            : r.versement_partenaire?.mode_paiement && r.versement_partenaire?.reference_paiement
                              ? `${r.versement_partenaire.mode_paiement} · ${r.versement_partenaire.reference_paiement}${r.versement_partenaire.bic_code ? ` · BIC ${r.versement_partenaire.bic_code}` : ""}${r.versement_partenaire.banque_nom ? ` · ${r.versement_partenaire.banque_nom}${r.versement_partenaire.banque_detectee_auto ? " (auto)" : ""}` : ""}`
                              : (
                                <a className="text-blue-600 underline" href={`/saisie-paiement?dossier=${encodeURIComponent(r.dossier_id)}&type=partenaire`} target="_blank" rel="noreferrer">
                                  Saisie partenaire
                                </a>
                              )}
                        </td>
                        <td className="py-3 px-4">
                          {r.partenaire_montant > 0 ? (
                            <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusClass(r.versement_partenaire?.statut ?? "A_PAYER")}`}>
                              {r.versement_partenaire?.statut ?? "A_PAYER"}
                            </span>
                          ) : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {r.versement_client?.date_reception_virement
                            ?? r.versement_partenaire?.date_reception_virement
                            ?? "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              disabled={clientPaid || r.client_montant <= 0 || savingKey === keyClient || !r.versement_client?.mode_paiement || !r.versement_client?.reference_paiement}
                              onClick={() => markPaid(r, "client")}
                              className="px-3 py-1.5 text-xs rounded-md text-white disabled:opacity-50"
                              style={{ background: "var(--crm-green)" }}
                            >
                              {savingKey === keyClient ? "..." : "Payer client"}
                            </button>
                            <button
                              type="button"
                              disabled={partnerPaid || r.partenaire_montant <= 0 || savingKey === keyPartner || !r.versement_partenaire?.mode_paiement || !r.versement_partenaire?.reference_paiement}
                              onClick={() => markPaid(r, "partenaire")}
                              className="px-3 py-1.5 text-xs rounded-md text-white disabled:opacity-50"
                              style={{ background: "var(--crm-navy)" }}
                            >
                              {savingKey === keyPartner ? "..." : "Payer partenaire"}
                            </button>
                            <button
                              type="button"
                              disabled={savingKey === `${r.dossier_id}:client:received` || (!r.versement_client?.date_paiement && !r.versement_partenaire?.date_paiement)}
                              onClick={() => markReceived(r, "client")}
                              className="px-3 py-1.5 text-xs rounded-md text-white disabled:opacity-50"
                              style={{ background: "#6b7280" }}
                            >
                              Reçu virement
                            </button>
                            <button
                              type="button"
                              onClick={() => sendPaymentLink(r, "client", "whatsapp")}
                              className="px-3 py-1.5 text-xs rounded-md text-white"
                              style={{ background: "#16a34a" }}
                            >
                              Lien client
                            </button>
                            <button
                              type="button"
                              onClick={() => sendPaymentLink(r, "partenaire", "whatsapp")}
                              disabled={r.partenaire_montant <= 0}
                              className="px-3 py-1.5 text-xs rounded-md text-white disabled:opacity-50"
                              style={{ background: "#15803d" }}
                            >
                              Lien partenaire
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
