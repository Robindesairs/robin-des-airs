"use client";

import { useEffect, useState } from "react";

type Dossier = {
  id: string;
  statut: string;
  priorite: string | null;
  date_creation: string | null;
  date_paiement: string | null;
  source: string | null;
  lrar_reception: string | null;
  agent: string | null;
  langue: string | null;
  nom_complet?: string | null;
  vol_principal?: string | null;
  dep?: string | null;
  arr?: string | null;
  palier?: number | null;
  net_client?: number | null;
  net_robin?: number | null;
  interets_jours?: number | null;
  forfait_40?: number | null;
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = s.slice(0, 10);
  return d ? new Date(d + "Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

export default function Home() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setDossiers(Array.isArray(json) ? json : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const total = dossiers.length;
  const broillard = dossiers.filter((d) => d.statut === "BROUILLON").length;
  const payes = dossiers.filter((d) => d.statut === "PAYE").length;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white p-5 font-[Segoe_UI,Arial,sans-serif]">
      <header className="flex flex-wrap items-center gap-4 mb-5">
        <div className="text-[#e74c3c] font-black text-2xl uppercase">
          Robin des Airs — Dashboard Dossiers
        </div>
        <div className="text-[#aaa] text-sm">
          Back-office indemnisation · API Supabase
        </div>
      </header>

      <div className="flex flex-wrap gap-4 items-center mb-5">
        <div className="bg-[#1a1a1a] px-6 py-4 rounded-lg border border-[#333] border-b-4 border-b-[#e74c3c] text-center min-w-[120px]">
          <div className="text-sm text-[#aaa] mb-1">Dossiers</div>
          <div className="text-2xl font-black text-[#e74c3c]">{total}</div>
        </div>
        <div className="bg-[#1a1a1a] px-6 py-4 rounded-lg border border-[#333] border-b-4 border-b-[#3498db] text-center min-w-[120px]">
          <div className="text-sm text-[#aaa] mb-1">Brouillons</div>
          <div className="text-2xl font-black text-[#3498db]">{broillard}</div>
        </div>
        <div className="bg-[#1a1a1a] px-6 py-4 rounded-lg border border-[#333] border-b-4 border-b-[#2ecc71] text-center min-w-[120px]">
          <div className="text-sm text-[#aaa] mb-1">Payés</div>
          <div className="text-2xl font-black text-[#2ecc71]">{payes}</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-[#1a1a1a] rounded-lg border border-[#333]">
        {loading && (
          <div className="text-center py-10 text-[#666] italic">
            Chargement des dossiers…
          </div>
        )}
        {error && (
          <div className="text-center py-10 text-[#e74c3c]">
            Erreur : {error}
          </div>
        )}
        {!loading && !error && (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">ID</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Nom</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Vol</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Dep → Arr</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Palier</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Net client</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Net Robin</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Statut</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Int. jours</th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">Forfait 40</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 px-2 text-center text-[#666]">Aucun dossier</td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr key={d.id} className="border-b border-[#222] hover:bg-[#252525]">
                    <td className="py-3 px-2 font-semibold">{d.id}</td>
                    <td className="py-3 px-2">{d.nom_complet ?? "—"}</td>
                    <td className="py-3 px-2">{d.vol_principal ?? "—"}</td>
                    <td className="py-3 px-2">{d.dep && d.arr ? `${d.dep} → ${d.arr}` : "—"}</td>
                    <td className="py-3 px-2">{d.palier != null ? d.palier : "—"}</td>
                    <td className="py-3 px-2 text-[#2ecc71]">{d.net_client != null ? `${d.net_client} €` : "—"}</td>
                    <td className="py-3 px-2">{d.net_robin != null ? `${d.net_robin} €` : "—"}</td>
                    <td className="py-3 px-2">
                      <span className="bg-[#2c3e50] text-[#3498db] px-2 py-0.5 rounded font-bold text-[10px]">{d.statut}</span>
                    </td>
                    <td className="py-3 px-2">{d.interets_jours != null ? d.interets_jours : "—"}</td>
                    <td className="py-3 px-2">{d.forfait_40 != null ? `${d.forfait_40} €` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
