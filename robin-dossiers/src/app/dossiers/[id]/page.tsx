"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DossierDetail = {
  id: string;
  statut: string;
  priorite: string | null;
  date_creation: string | null;
  date_paiement: string | null;
  source: string | null;
  lrar_reception: string | null;
  agent: string | null;
  langue: string | null;
  passagers: Array<Record<string, unknown>>;
  vols: Array<Record<string, unknown>>;
  calculs: Record<string, unknown> | null;
  evenements: Array<Record<string, unknown>>;
};

const STATUTS = [
  "BROUILLON", "ELIGIBLE", "NON_ELIGIBLE", "MANDAT_SIGNE",
  "LRAR_ENVOYEE", "RELANCE_1", "RELANCE_2", "MEDIATEUR",
  "CONTENTIEUX", "PAYE", "REFUSE_DEFINITIF", "ABANDON", "PRESCRIT",
];

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = String(s).slice(0, 10);
  return d ? new Date(d + "Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

function formatDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default function FicheDossier({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<DossierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutSelect, setStatutSelect] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/dossiers/${encodeURIComponent(id)}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Dossier non trouvé");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setData(json);
        setStatutSelect(json.statut ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || statutSelect === data?.statut) return;
    setSaving(true);
    fetch(`/api/dossiers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: statutSelect, auteur: "agent" }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erreur mise à jour");
        if (data) setData({ ...data, statut: statutSelect });
      })
      .catch(() => setError("Erreur lors de la mise à jour"))
      .finally(() => setSaving(false));
  };

  if (loading || !id) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] text-white p-5 font-[Segoe_UI,Arial,sans-serif]">
        <div className="text-center py-20 text-[#666]">Chargement…</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] text-white p-5 font-[Segoe_UI,Arial,sans-serif]">
        <Link href="/" className="text-[#3498db] hover:underline mb-4 inline-block">← Retour à la liste</Link>
        <div className="text-[#e74c3c] py-4">{error ?? "Dossier introuvable"}</div>
      </main>
    );
  }

  const calc = data.calculs as Record<string, unknown> | null;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white p-5 font-[Segoe_UI,Arial,sans-serif]">
      <header className="flex flex-wrap items-center gap-4 mb-6">
        <Link href="/" className="text-[#3498db] hover:underline">← Liste</Link>
        <h1 className="text-xl font-bold text-[#e74c3c]">Dossier {data.id}</h1>
        <span className="bg-[#2c3e50] text-[#3498db] px-2 py-1 rounded text-sm font-bold">{data.statut}</span>
      </header>

      {/* Bloc Dossier */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 mb-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Dossier</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-[#888]">Priorité</span><span>{data.priorite ?? "—"}</span>
          <span className="text-[#888]">Date création</span><span>{formatDate(data.date_creation)}</span>
          <span className="text-[#888]">Date paiement</span><span>{formatDate(data.date_paiement)}</span>
          <span className="text-[#888]">Source</span><span>{data.source ?? "—"}</span>
          <span className="text-[#888]">LRAR réception</span><span>{formatDate(data.lrar_reception)}</span>
          <span className="text-[#888]">Agent</span><span>{data.agent ?? "—"}</span>
          <span className="text-[#888]">Langue</span><span>{data.langue ?? "—"}</span>
        </div>
      </section>

      {/* Passagers */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 mb-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Passagers</h2>
        {data.passagers.length === 0 ? (
          <p className="text-[#666] text-sm">Aucun passager</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.passagers.map((p: Record<string, unknown>, i: number) => (
              <li key={i}>
                {String(p.prenom ?? "")} {String(p.nom ?? "")}
                {p.est_bebe ? " (bébé)" : ""}
                {p.email ? ` · ${p.email}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vols */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 mb-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Vols</h2>
        {data.vols.length === 0 ? (
          <p className="text-[#666] text-sm">Aucun vol</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.vols.map((v: Record<string, unknown>, i: number) => (
              <li key={i}>
                {String(v.numero_vol ?? "—")} · {String(v.dep ?? "—")} → {String(v.arr ?? "—")} · {formatDate(v.date_vol as string)} · PNR {String(v.pnr ?? "—")}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Calculs */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 mb-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Calculs</h2>
        {!calc ? (
          <p className="text-[#666] text-sm">Aucun calcul</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[#888]">Palier</span><span>{String(calc.palier ?? "—")}</span>
            <span className="text-[#888]">Nb passagers indemnisés</span><span>{String(calc.nb_passagers_indemnises ?? "—")}</span>
            <span className="text-[#888]">Net client</span><span className="text-[#2ecc71]">{calc.net_client != null ? `${calc.net_client} €` : "—"}</span>
            <span className="text-[#888]">Commission Robin</span><span>{calc.commission_robin != null ? `${calc.commission_robin} €` : "—"}</span>
            <span className="text-[#888]">Total réclamé</span><span>{calc.total_reclame != null ? `${calc.total_reclame} €` : "—"}</span>
            <span className="text-[#888]">Intérêts cumulés</span><span>{calc.interets_cumules != null ? `${calc.interets_cumules} €` : "—"}</span>
            <span className="text-[#888]">Frais recouvrement</span><span>{calc.frais_recouvrement != null ? `${calc.frais_recouvrement} €` : "—"}</span>
          </div>
        )}
      </section>

      {/* Historique */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4 mb-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Historique</h2>
        {data.evenements.length === 0 ? (
          <p className="text-[#666] text-sm">Aucun événement</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.evenements.map((ev: Record<string, unknown>, i: number) => (
              <li key={i} className="border-l-2 border-[#333] pl-2">
                <span className="text-[#888]">{formatDateTime(ev.date as string)}</span> · {String(ev.action ?? "")} · {String(ev.auteur ?? "")}
                {ev.commentaire ? ` — ${ev.commentaire}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mettre à jour statut */}
      <section className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
        <h2 className="text-sm font-bold text-[#888] uppercase mb-3">Mettre à jour</h2>
        <form onSubmit={handleUpdateStatut} className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[#888]">Statut</label>
          <select
            value={statutSelect}
            onChange={(e) => setStatutSelect(e.target.value)}
            className="bg-[#222] border border-[#333] text-white px-3 py-2 rounded text-sm"
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving || statutSelect === data.statut}
            className="bg-[#3498db] text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>
    </main>
  );
}
