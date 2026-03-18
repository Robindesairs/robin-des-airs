"use client";

import { useEffect, useState, useCallback } from "react";
import { STATUT_LABELS, STATUT_ORDER, STATUTS_CLOTURE } from "@/lib/statuts";

const PAYS_OPTIONS = ["", "Sénégal", "Mali", "Côte d'Ivoire", "Guinée", "Cameroun", "RDC", "Bénin", "Togo", "Ghana", "Nigeria", "Autre"];

const LANGUE_LABELS: Record<string, string> = {
  fr: "Français", wo: "Wolof", bm: "Bambara", ln: "Lingala", ff: "Pulaar", snk: "Soninké", dioula: "Dioula", sw: "Swahili", tw: "Twi", yo: "Yoruba", en: "English",
};

type DossierRow = {
  id: string;
  statut: string;
  priorite: string | null;
  date_creation: string | null;
  date_paiement: string | null;
  source: string | null;
  lrar_reception: string | null;
  langue?: string | null;
  pays?: string | null;
  nom_complet?: string | null;
  vol_principal?: string | null;
  dep?: string | null;
  arr?: string | null;
  palier?: number | null;
  nb_passagers_indemnises?: number | null;
  net_client?: number | null;
  net_robin?: number | null;
  interets_jours?: number | null;
  forfait_40?: number | null;
};

type DossierDetail = DossierRow & {
  passagers: Array<Record<string, unknown>>;
  vols: Array<Record<string, unknown>>;
  calculs: Record<string, unknown> | null;
  evenements: Array<Record<string, unknown>>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d: string, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = String(s).slice(0, 10);
  return d ? new Date(d + "Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

function calcMoratoire(lrar: string | null | undefined): { actif: boolean; j16: string; jours: number; total: number } | null {
  if (!lrar) return null;
  const j16 = addDays(String(lrar).slice(0, 10), 16);
  const now = today();
  if (now < j16) return { actif: false, j16, jours: 0, total: 40 };
  const jours = diffDays(j16, now);
  return { actif: true, j16, jours, total: 40 };
}

export default function CRMPage() {
  const [list, setList] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPalier, setFilterPalier] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DossierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("t-info");
  const [newOpen, setNewOpen] = useState(false);
  const [evTxt, setEvTxt] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur chargement");
        return r.json();
      })
      .then((json) => setList(Array.isArray(json) ? json : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = list.filter((d) => {
    const q = search.toLowerCase();
    const txt = [d.nom_complet, d.vol_principal, d.dep, d.arr].filter(Boolean).join(" ").toLowerCase();
    const matchQ = !q || txt.includes(q);
    const matchSt = !filterStatut || d.statut === filterStatut;
    const matchPal = !filterPalier || String(d.palier) === filterPalier;
    return matchQ && matchSt && matchPal;
  });

  const enCours = list.filter((d) => !STATUTS_CLOTURE.includes(d.statut)).length;
  const payes = list.filter((d) => d.statut === "PAYE");
  const caClient = payes.reduce((s, d) => s + (d.net_client ?? 0), 0);
  const caRobin = payes.reduce((s, d) => s + (d.net_robin ?? 0), 0);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailData(null);
    setActiveTab("t-info");
    setDetailLoading(true);
    fetch(`/api/dossiers/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Dossier introuvable");
        return r.json();
      })
      .then(setDetailData)
      .catch(() => setDetailData(null))
      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailData(null);
    setEvTxt("");
  };

  const updateDossier = (id: string, body: Record<string, unknown>) => {
    setSaving(true);
    fetch(`/api/dossiers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erreur");
        if (detailData && detailData.id === id) {
          setDetailData({ ...detailData, ...body });
        }
        fetchList();
      })
      .finally(() => setSaving(false));
  };

  const addEvent = (id: string) => {
    if (!evTxt.trim()) return;
    setSaving(true);
    fetch(`/api/dossiers/${encodeURIComponent(id)}/evenement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: evTxt.trim(), auteur: "agent" }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erreur");
        if (detailId === id) {
          fetch(`/api/dossiers/${encodeURIComponent(id)}`).then((res) => res.json()).then(setDetailData);
        }
        setEvTxt("");
        fetchList();
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--crm-bg2)", color: "var(--crm-text)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
      {/* TOPBAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-3" style={{ background: "var(--crm-navy)" }}>
        <div>
          <div className="text-white text-xl font-bold tracking-tight">ROBIN <span style={{ color: "var(--crm-gold)" }}>des Airs</span></div>
          <div className="text-white/60 text-xs mt-0.5">Gestion des dossiers d&apos;indemnisation</div>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="px-4 py-2 rounded-md text-white font-medium text-sm border border-[var(--crm-green)]"
          style={{ background: "var(--crm-green)" }}
        >
          + Nouveau dossier
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        {/* MÉTRIQUES */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">Total dossiers</div>
            <div className="text-2xl font-bold">{list.length}</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">En cours</div>
            <div className="text-2xl font-bold" style={{ color: "#BA7517" }}>{enCours}</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">Payés</div>
            <div className="text-2xl font-bold" style={{ color: "var(--crm-green)" }}>{payes.length}</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">Reversé clients</div>
            <div className="text-2xl font-bold" style={{ color: "var(--crm-green)" }}>{caClient.toLocaleString("fr-FR")} €</div>
          </div>
          <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--crm-text2)] mb-1">CA Robin des Airs</div>
            <div className="text-2xl font-bold" style={{ color: "var(--crm-navy)" }}>{caRobin.toLocaleString("fr-FR")} €</div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <input
            type="text"
            placeholder="🔍 Passager, vol, PNR…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] bg-white outline-none focus:border-[var(--crm-green)]"
          />
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] bg-white outline-none focus:border-[var(--crm-green)]"
          >
            <option value="">Tous les statuts</option>
            {STATUT_ORDER.filter((k) => STATUT_LABELS[k]).map((k) => (
              <option key={k} value={k}>{STATUT_LABELS[k]}</option>
            ))}
          </select>
          <select
            value={filterPalier}
            onChange={(e) => setFilterPalier(e.target.value)}
            className="text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] bg-white outline-none focus:border-[var(--crm-green)]"
          >
            <option value="">Tous les paliers</option>
            <option value="600">600 €</option>
            <option value="400">400 €</option>
            <option value="250">250 €</option>
          </select>
        </div>

        {/* TABLEAU */}
        <div className="bg-white border border-[var(--crm-border)] rounded-[var(--crm-radius)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[960px]">
              <thead>
                <tr>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Dossier</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Passager(s)</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Langue / Pays</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Vol</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Palier</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Net client</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Net Robin</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Indemnité moratoire</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Statut</th>
                  <th className="bg-[var(--crm-bg2)] py-3 px-4 text-left font-semibold text-[var(--crm-text2)] text-[11px] uppercase tracking-wider border-b border-[var(--crm-border)]">Priorité</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-10 text-center text-[var(--crm-text2)]">Chargement…</td></tr>
                ) : error ? (
                  <tr><td colSpan={10} className="py-10 text-center text-[var(--crm-red)]">Erreur : {error}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-[var(--crm-text2)]">Aucun dossier trouvé</td></tr>
                ) : (
                  filtered.map((d) => {
                    const m = calcMoratoire(d.lrar_reception ?? undefined);
                    let morCell = <span className="text-[var(--crm-text3)] text-xs">—</span>;
                    if (m) {
                      if (!m.actif) morCell = <span className="moratoire-soon">J+16 le {m.j16}</span>;
                      else morCell = <span className="moratoire-pill">{m.jours}j · {m.total} €</span>;
                    }
                    const badgeClass = (STATUT_LABELS[d.statut] ? `badge-s-${d.statut}` : "") || "bg-gray-100 text-gray-700";
                    return (
                      <tr
                        key={d.id}
                        onClick={() => openDetail(d.id)}
                        className="border-b border-[var(--crm-border)] cursor-pointer hover:bg-[#F0FAF6] transition-colors"
                      >
                        <td className="py-3 px-4"><div className="font-semibold text-[var(--crm-navy)] text-xs">{d.id}</div><div className="text-[11px] text-[var(--crm-text3)] mt-0.5">{formatDate(d.date_creation)}</div></td>
                        <td className="py-3 px-4">{d.nom_complet ?? "—"}{d.nb_passagers_indemnises && d.nb_passagers_indemnises > 1 ? ` ×${d.nb_passagers_indemnises}` : ""}</td>
                        <td className="py-3 px-4 text-[11px]">{[d.pays ?? null, d.langue ? (LANGUE_LABELS[d.langue] ?? d.langue) : null].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="py-3 px-4">{d.vol_principal ?? "—"}<div className="text-[11px] text-[var(--crm-text3)] mt-0.5">{d.dep && d.arr ? `${d.dep} → ${d.arr}` : ""}</div></td>
                        <td className="py-3 px-4 font-bold" style={{ color: d.palier === 600 ? "var(--crm-green)" : d.palier === 400 ? "#1D4ED8" : "#5F5E5A" }}>{d.palier != null ? `${d.palier} €` : "—"}</td>
                        <td className="py-3 px-4"><span className="font-bold" style={{ color: "var(--crm-green)" }}>{d.net_client != null ? `${d.net_client.toLocaleString("fr-FR")} €` : "—"}</span></td>
                        <td className="py-3 px-4 font-bold" style={{ color: "var(--crm-navy)" }}>{d.net_robin != null ? `${d.net_robin.toLocaleString("fr-FR")} €` : "—"}</td>
                        <td className="py-3 px-4">{morCell}</td>
                        <td className="py-3 px-4"><span className={`badge text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{STATUT_LABELS[d.statut] ?? d.statut}</span>{d.statut === "PAYE" && d.date_paiement && <div className="text-[10px] text-[var(--crm-text3)] mt-1">{d.date_paiement}</div>}</td>
                        <td className={`py-3 px-4 prio-${d.priorite ?? "STANDARD"}`}>{d.priorite ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DÉTAIL */}
      {detailId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div className="bg-white rounded-[var(--crm-radius)] border border-[var(--crm-border)] w-full max-w-[620px] max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 z-10 bg-white flex justify-between items-center py-4 px-5 border-b border-[var(--crm-border)]">
              <h2 className="text-base font-bold text-[var(--crm-navy)]">
                {detailLoading ? "Chargement…" : detailData ? `${detailData.id} — ${detailData.nom_complet ?? "Dossier"}` : "Dossier"}
              </h2>
              <button type="button" onClick={closeDetail} className="py-2 px-3 text-sm font-medium border border-[var(--crm-border)] rounded-md hover:bg-[var(--crm-bg3)]">✕ Fermer</button>
            </div>
            <div className="p-5">
              {detailLoading && <div className="py-8 text-center text-[var(--crm-text2)]">Chargement…</div>}
              {!detailLoading && detailData && (
                <>
                  <div className="flex gap-0 border-b border-[var(--crm-border)] mb-4">
                    {["t-info", "t-calc", "t-hist", "t-upd"].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`py-2.5 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab ? "text-[var(--crm-green)] border-[var(--crm-green)] font-semibold" : "text-[var(--crm-text2)] border-transparent hover:text-[var(--crm-navy)]"}`}
                      >
                        {tab === "t-info" && "Dossier"}
                        {tab === "t-calc" && "Calculs"}
                        {tab === "t-hist" && "Historique"}
                        {tab === "t-upd" && "Mettre à jour"}
                      </button>
                    ))}
                  </div>

                  {activeTab === "t-info" && (
                    <div className="space-y-4">
                      <div className="text-[11px] font-bold text-[var(--crm-text2)] uppercase tracking-wider border-b border-[var(--crm-border)] pb-2 mb-2">Passager principal</div>
                      <div className="flex justify-between py-2 border-b border-[var(--crm-border)] text-sm"><span className="text-[var(--crm-text2)]">Nom complet</span><span className="font-semibold">{detailData.nom_complet ?? "—"}</span></div>
                      <div className="flex justify-between py-2 border-b border-[var(--crm-border)] text-sm"><span className="text-[var(--crm-text2)]">Langue</span><span className="font-semibold">{LANGUE_LABELS[(detailData as DossierRow).langue ?? ""] ?? (detailData as DossierRow).langue ?? "—"}</span></div>
                      <div className="flex justify-between py-2 border-b border-[var(--crm-border)] text-sm"><span className="text-[var(--crm-text2)]">Pays</span><span className="font-semibold">{(detailData as DossierRow).pays ?? "—"}</span></div>
                      <div className="flex justify-between py-2 border-b border-[var(--crm-border)] text-sm"><span className="text-[var(--crm-text2)]">Source</span><span className="font-semibold">{detailData.source ?? "—"}</span></div>
                      <div className="text-[11px] font-bold text-[var(--crm-text2)] uppercase tracking-wider border-b border-[var(--crm-border)] pb-2 mt-4 mb-2">Vols ({detailData.vols?.length ?? 0})</div>
                      {(detailData.vols ?? []).map((v: Record<string, unknown>, i: number) => (
                        <div key={i} className="border border-[var(--crm-border)] rounded-md p-3 mb-2 bg-[var(--crm-bg2)]">
                          <div className="text-[11px] font-bold text-[var(--crm-text2)] mb-2">VOL {i + 1}</div>
                          <div className="flex justify-between text-sm py-1"><span className="text-[var(--crm-text2)]">Vol</span><span className="font-semibold">{String(v.numero_vol ?? "—")}</span></div>
                          <div className="flex justify-between text-sm py-1"><span className="text-[var(--crm-text2)]">Trajet</span><span className="font-semibold">{String(v.dep ?? "—")} → {String(v.arr ?? "—")}</span></div>
                          <div className="flex justify-between text-sm py-1 border-none"><span className="text-[var(--crm-text2)]">PNR</span><span className="font-mono font-semibold">{String(v.pnr ?? "—")}</span></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "t-calc" && detailData.calculs && (
                    <div className="bg-[var(--crm-bg2)] border border-[var(--crm-border)] rounded-md p-4">
                      <div className="flex justify-between text-sm text-[var(--crm-text2)] mb-1">Palier CE 261</div>
                      <div className="flex justify-between text-sm font-semibold mb-2">{detailData.calculs.palier != null ? `${detailData.calculs.palier} €` : "—"}</div>
                      <div className="border-t border-[var(--crm-border)] my-2" />
                      <div className="flex justify-between text-sm"><span className="text-[var(--crm-text2)]">Net client total</span><span className="font-bold" style={{ color: "var(--crm-green)" }}>{detailData.calculs.net_client != null ? `${detailData.calculs.net_client} €` : "—"}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-[var(--crm-text2)]">Net Robin des Airs</span><span className="font-bold text-[var(--crm-navy)]">{detailData.calculs.commission_robin != null ? `${detailData.calculs.commission_robin} €` : "—"}</span></div>
                      {detailData.lrar_reception && (
                        <div className="mt-4 p-4 rounded-md border border-amber-300 bg-amber-50">
                          <div className="text-xs font-bold text-amber-800 mb-2">Indemnité moratoire</div>
                          <p className="text-xs text-amber-800">LRAR reçue le {formatDate(String(detailData.lrar_reception))}. Forfait 40 € (art. L.441-10).</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "t-hist" && (
                    <div>
                      {(detailData.evenements ?? []).map((ev: Record<string, unknown>, i: number) => (
                        <div key={i} className="flex gap-3 mb-3">
                          <div className="w-2 h-2 rounded-full bg-[var(--crm-green)] mt-1.5 shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{String(ev.action ?? "")}</div>
                            <div className="text-[11px] text-[var(--crm-text3)] mt-0.5">{ev.commentaire ? `${ev.commentaire} · ` : ""}{ev.date ? new Date(String(ev.date)).toLocaleString("fr-FR") : ""}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-4">
                        <input
                          type="text"
                          value={evTxt}
                          onChange={(e) => setEvTxt(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addEvent(detailId)}
                          placeholder="Ajouter un événement…"
                          className="flex-1 text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]"
                        />
                        <button type="button" onClick={() => addEvent(detailId)} disabled={saving || !evTxt.trim()} className="px-4 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50" style={{ background: "var(--crm-green)" }}>Ajouter</button>
                      </div>
                    </div>
                  )}

                  {activeTab === "t-upd" && (
                    <DetailUpdateForm key={detailData.id} dossier={detailData} onSave={(body) => updateDossier(detailId, body)} saving={saving} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU */}
      {newOpen && (
        <NewDossierModal
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            fetchList();
          }}
        />
      )}
    </div>
  );
}

const LANGUE_OPTIONS = ["fr", "wo", "bm", "ln", "ff", "snk", "en"];

function DetailUpdateForm({ dossier, onSave, saving }: { dossier: DossierDetail; onSave: (body: Record<string, unknown>) => void; saving: boolean }) {
  const [statut, setStatut] = useState(dossier.statut);
  const [priorite, setPriorite] = useState(dossier.priorite ?? "STANDARD");
  const [langue, setLangue] = useState((dossier as DossierRow).langue ?? "fr");
  const [pays, setPays] = useState((dossier as DossierRow).pays ?? "");
  const [lrar, setLrar] = useState(String(dossier.lrar_reception ?? "").slice(0, 10));
  const [datePaiement, setDatePaiement] = useState(String(dossier.date_paiement ?? "").slice(0, 10));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Statut</label>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]">
          {STATUT_ORDER.filter((k) => STATUT_LABELS[k]).map((k) => (
            <option key={k} value={k}>{STATUT_LABELS[k]}</option>
          ))}
        </select>
      </div>
      {statut === "PAYE" && (
        <div>
          <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Date de paiement</label>
          <input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Date réception LRAR</label>
        <input type="date" value={lrar} onChange={(e) => setLrar(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Langue</label>
        <select value={langue} onChange={(e) => setLangue(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]">
          {LANGUE_OPTIONS.map((l) => (
            <option key={l} value={l}>{LANGUE_LABELS[l] ?? l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Pays</label>
        <select value={pays} onChange={(e) => setPays(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]">
          {PAYS_OPTIONS.map((p) => (
            <option key={p || "_"} value={p}>{p || "—"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Priorité</label>
        <select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]">
          {["BASSE", "STANDARD", "HAUTE", "URGENTE"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => onSave({ statut, priorite, langue: langue || null, pays: pays || null, lrar_reception: lrar || null, date_paiement: statut === "PAYE" ? datePaiement || null : null })} disabled={saving} className="px-4 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50" style={{ background: "var(--crm-green)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function NewDossierModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("+33");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [adultes, setAdultes] = useState(1);
  const [bebes, setBebes] = useState(0);
  const [source, setSource] = useState("autre");
  const [priorite, setPriorite] = useState("STANDARD");
  const [langue, setLangue] = useState("fr");
  const [pays, setPays] = useState("");
  const [palier, setPalier] = useState(600);
  const [vols, setVols] = useState([{ compagnie: "", numero_vol: "", date_vol: "", dep: "", arr: "", pnr: "", incident: "RETARD" }]);
  const [saving, setSaving] = useState(false);

  const addVol = () => setVols((v) => [...v, { compagnie: "", numero_vol: "", date_vol: "", dep: "", arr: "", pnr: "", incident: "RETARD" }]);
  const removeVol = (i: number) => setVols((v) => v.filter((_, j) => j !== i));
  const setVol = (i: number, key: string, val: string) => setVols((v) => v.map((x, j) => (j === i ? { ...x, [key]: val } : x)));

  const brut = palier * adultes;
  const comm = Math.round(brut * 0.25 * 100) / 100;
  const net = brut - comm;

  const handleSubmit = () => {
    if (!prenom.trim() || !nom.trim()) {
      alert("Prénom et nom obligatoires");
      return;
    }
    const passagers: Array<Record<string, unknown>> = [{ prenom: prenom.trim(), nom: nom.trim(), email: email || null, indicatif, telephone: tel || null, est_bebe: false }];
    for (let i = 0; i < bebes; i++) passagers.push({ prenom: "Bébé", nom: "", email: null, indicatif: "+33", telephone: null, est_bebe: true });
    const volRows = vols.map((v) => ({
      compagnie: v.compagnie || null,
      numero_vol: v.numero_vol || null,
      date_vol: v.date_vol || null,
      dep: v.dep?.toUpperCase() || null,
      arr: v.arr?.toUpperCase() || null,
      pnr: v.pnr?.toUpperCase() || null,
      incident: v.incident || "RETARD",
    }));
    setSaving(true);
    fetch("/api/dossiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorite, source, langue, pays: pays || null, palier, passagers, vols: volRows }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Erreur"); });
        onCreated();
      })
      .catch((e) => alert(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[var(--crm-radius)] border border-[var(--crm-border)] w-full max-w-[620px] max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-white flex justify-between items-center py-4 px-5 border-b border-[var(--crm-border)]">
          <h2 className="text-base font-bold text-[var(--crm-navy)]">Nouveau dossier</h2>
          <button type="button" onClick={onClose} className="py-2 px-3 text-sm border border-[var(--crm-border)] rounded-md hover:bg-[var(--crm-bg3)]">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-[11px] font-bold text-[var(--crm-text2)] uppercase tracking-wider border-b border-[var(--crm-border)] pb-2">Passager principal</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Prénom</label><input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Aminata" className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" /></div>
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Nom</label><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DIALLO" className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Téléphone</label><div className="grid grid-cols-[110px_1fr] gap-2"><select value={indicatif} onChange={(e) => setIndicatif(e.target.value)} className="text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]"><option value="+33">🇫🇷 +33</option><option value="+221">🇸🇳 +221</option><option value="+225">🇨🇮 +225</option><option value="+212">🇲🇦 +212</option></select><input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="6 12 34 56 78" className="text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" /></div></div>
          <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)] outline-none focus:border-[var(--crm-green)]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Adultes (indemnisés)</label><input type="number" min={1} max={9} value={adultes} onChange={(e) => setAdultes(Number(e.target.value))} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]" /></div>
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Bébés &lt; 2 ans</label><input type="number" min={0} max={9} value={bebes} onChange={(e) => setBebes(Number(e.target.value))} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Source</label><select value={source} onChange={(e) => setSource(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]"><option value="autre">Autre</option><option value="tiktok_ad">TikTok Ads</option><option value="fb_reels">Facebook / Reels</option><option value="organic_site">Site organique</option><option value="referral">Parrainage</option><option value="whatsapp">WhatsApp</option></select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Langue</label><select value={langue} onChange={(e) => setLangue(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]">{LANGUE_OPTIONS.map((l) => <option key={l} value={l}>{LANGUE_LABELS[l] ?? l}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Pays</label><select value={pays} onChange={(e) => setPays(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]">{PAYS_OPTIONS.map((p) => <option key={p || "_"} value={p}>{p || "—"}</option>)}</select></div>
          </div>
          <div className="text-[11px] font-bold text-[var(--crm-text2)] uppercase tracking-wider border-b border-[var(--crm-border)] pb-2">Vols</div>
          {vols.map((v, i) => (
            <div key={i} className="border border-[var(--crm-border)] rounded-md p-3 bg-[var(--crm-bg2)] relative">
              <div className="text-[11px] font-bold text-[var(--crm-navy)] mb-2">{i === 0 ? "Vol principal" : `Vol ${i + 1} — Correspondance`}</div>
              {vols.length > 1 && <button type="button" onClick={() => removeVol(i)} className="absolute top-2 right-2 text-[var(--crm-red)] text-lg leading-none px-1 rounded hover:bg-red-50">✕</button>}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><label className="block text-[10px] text-[var(--crm-text2)]">Compagnie</label><input value={v.compagnie} onChange={(e) => setVol(i, "compagnie", e.target.value)} placeholder="Air France" className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)]" /></div>
                <div><label className="block text-[10px] text-[var(--crm-text2)]">N° vol</label><input value={v.numero_vol} onChange={(e) => setVol(i, "numero_vol", e.target.value)} placeholder="AF 719" className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)]" /></div>
                <div><label className="block text-[10px] text-[var(--crm-text2)]">Date</label><input type="date" value={v.date_vol} onChange={(e) => setVol(i, "date_vol", e.target.value)} className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)]" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-[10px] text-[var(--crm-text2)]">Départ (IATA)</label><input value={v.dep} onChange={(e) => setVol(i, "dep", e.target.value.toUpperCase())} maxLength={3} placeholder="CDG" className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)] uppercase" /></div>
                <div><label className="block text-[10px] text-[var(--crm-text2)]">Arrivée (IATA)</label><input value={v.arr} onChange={(e) => setVol(i, "arr", e.target.value.toUpperCase())} maxLength={3} placeholder="DSS" className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)] uppercase" /></div>
                <div><label className="block text-[10px] text-[var(--crm-text2)]">PNR</label><input value={v.pnr} onChange={(e) => setVol(i, "pnr", e.target.value.toUpperCase())} maxLength={6} placeholder="AB4XYZ" className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)] uppercase" /></div>
              </div>
              <div className="mt-2"><label className="block text-[10px] text-[var(--crm-text2)]">Incident</label><select value={v.incident} onChange={(e) => setVol(i, "incident", e.target.value)} className="w-full text-sm py-1.5 px-2 rounded border border-[var(--crm-border)]"><option value="RETARD">Retard ≥ 3h</option><option value="ANNULATION">Annulation</option><option value="CORRESPONDANCE_MANQUEE">Correspondance manquée</option><option value="REFUS_EMBARQUEMENT">Refus embarquement</option></select></div>
            </div>
          ))}
          <button type="button" onClick={addVol} className="w-full py-2 text-sm border border-[var(--crm-border)] rounded-md hover:bg-[var(--crm-bg3)]">+ Ajouter un vol (correspondance)</button>
          <div className="text-[11px] font-bold text-[var(--crm-text2)] uppercase tracking-wider border-b border-[var(--crm-border)] pb-2">Indemnité</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Palier CE 261</label><select value={palier} onChange={(e) => setPalier(Number(e.target.value))} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]"><option value={600}>600 € — vol &gt; 3 500 km</option><option value={400}>400 € — 1 500 à 3 500 km</option><option value={250}>250 € — ≤ 1 500 km</option></select></div>
            <div><label className="block text-xs font-semibold text-[var(--crm-text2)] mb-1">Priorité</label><select value={priorite} onChange={(e) => setPriorite(e.target.value)} className="w-full text-sm py-2 px-3 rounded-md border border-[var(--crm-border)]"><option value="STANDARD">Standard</option><option value="HAUTE">Haute</option><option value="BASSE">Basse</option><option value="URGENTE">Urgente</option></select></div>
          </div>
          <div className="bg-[var(--crm-bg2)] border border-[var(--crm-border)] rounded-md p-4">
            <div className="flex justify-between text-sm text-[var(--crm-text2)] mb-1"><span>Palier × {adultes} adulte(s)</span><span className="font-semibold text-[var(--crm-text)]">{palier} × {adultes} = {brut.toLocaleString("fr-FR")} €</span></div>
            <div className="border-t border-[var(--crm-border)] my-2" />
            <div className="flex justify-between text-sm"><span className="text-[var(--crm-text2)]">Commission Robin (25%)</span><span className="font-semibold text-[var(--crm-red)]">− {comm.toLocaleString("fr-FR")} €</span></div>
            <div className="border-t border-[var(--crm-border)] my-2" />
            <div className="flex justify-between text-base font-bold"><span>Net client total</span><span style={{ color: "var(--crm-green)" }}>{net.toLocaleString("fr-FR")} €</span></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white flex justify-end gap-2 py-4 px-5 border-t border-[var(--crm-border)]">
          <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-sm font-medium border border-[var(--crm-border)] hover:bg-[var(--crm-bg3)]">Annuler</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="py-2 px-4 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--crm-green)" }}>Créer le dossier →</button>
        </div>
      </div>
    </div>
  );
}
