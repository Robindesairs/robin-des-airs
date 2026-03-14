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
};

type ApiResponse = {
  dossiers: Dossier[];
  total: number;
  limit: number;
  offset: number;
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = s.slice(0, 10);
  return d ? new Date(d + "Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const dossiers = data?.dossiers ?? [];
  const total = data?.total ?? 0;
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
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  ID
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Statut
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Priorité
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Date création
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Date paiement
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Source
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  LRAR réception
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Agent
                </th>
                <th className="bg-[#222] text-[#888] uppercase py-3 px-2 text-left border-b border-[#333]">
                  Langue
                </th>
              </tr>
            </thead>
            <tbody>
              {dossiers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-2 text-center text-[#666]">
                    Aucun dossier
                  </td>
                </tr>
              ) : (
                dossiers.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[#222] hover:bg-[#252525]"
                  >
                    <td className="py-3 px-2 font-semibold">{d.id}</td>
                    <td className="py-3 px-2">
                      <span className="bg-[#2c3e50] text-[#3498db] px-2 py-0.5 rounded font-bold text-[10px]">
                        {d.statut}
                      </span>
                    </td>
                    <td className="py-3 px-2">{d.priorite ?? "—"}</td>
                    <td className="py-3 px-2">{formatDate(d.date_creation)}</td>
                    <td className="py-3 px-2">{formatDate(d.date_paiement)}</td>
                    <td className="py-3 px-2">{d.source ?? "—"}</td>
                    <td className="py-3 px-2">{formatDate(d.lrar_reception)}</td>
                    <td className="py-3 px-2">{d.agent ?? "—"}</td>
                    <td className="py-3 px-2">{d.langue ?? "—"}</td>
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
