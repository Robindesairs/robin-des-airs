import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { calcFinancier, genererIdDossier } from "@/lib/calculs";
import { DEMO_DOSSIERS } from "@/lib/demoData";

/**
 * GET /api/dossiers — Liste type vue_dossiers (nom_complet, vol_principal, dep→arr, palier, net_client, net_robin, statut, interets_jours, forfait_40)
 * Query: ?statut= | ?palier= | ?q= (recherche nom_complet, vol_principal, pnr)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const statut = searchParams.get("statut") ?? undefined;
    const palier = searchParams.get("palier");
    const q = searchParams.get("q") ?? undefined;

    let query = supabase
      .from("dossiers")
      .select("*")
      .order("date_creation", { ascending: false });

    if (statut) query = query.eq("statut", statut);

    const { data: dossiers, error: errD } = await query;
    if (errD) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json(DEMO_DOSSIERS);
      }
      return NextResponse.json(
        { error: errD.message, code: errD.code },
        { status: 500 }
      );
    }
    if (!dossiers?.length) return NextResponse.json([]);

    const ids = dossiers.map((d) => d.id);

    const [passagersRes, volsRes, calculsRes] = await Promise.all([
      supabase.from("passagers").select("dossier_id, rang, prenom, nom, indicatif, telephone, email").in("dossier_id", ids),
      supabase.from("vols").select("dossier_id, ordre, compagnie, numero_vol, date_vol, dep, arr, pnr, incident").in("dossier_id", ids),
      supabase.from("calculs").select("dossier_id, palier, nb_passagers_indemnises, net_client, commission_robin, total_reclame, interets_cumules, frais_recouvrement").in("dossier_id", ids),
    ]);

    const paxByDossier = (passagersRes.data ?? []).reduce(
      (acc, p) => {
        if (!acc[p.dossier_id]) acc[p.dossier_id] = [];
        acc[p.dossier_id].push(p);
        return acc;
      },
      {} as Record<string, { dossier_id: string; rang: number; prenom: string | null; nom: string | null; indicatif: string | null; telephone: string | null; email: string | null }[]>
    );
    const volsByDossier = (volsRes.data ?? []).reduce(
      (acc, v) => {
        if (!acc[v.dossier_id]) acc[v.dossier_id] = [];
        acc[v.dossier_id].push(v);
        return acc;
      },
      {} as Record<string, { dossier_id: string; ordre: number; compagnie: string | null; numero_vol: string | null; date_vol: string | null; dep: string | null; arr: string | null; pnr: string | null; incident: string | null }[]>
    );
    const calcByDossier = (calculsRes.data ?? []).reduce(
      (acc, c) => {
        acc[c.dossier_id] = c;
        return acc;
      },
      {} as Record<string, { palier: number | null; nb_passagers_indemnises: number | null; net_client: number | null; commission_robin: number | null; total_reclame: number | null; interets_cumules: number | null; frais_recouvrement: number | null }>
    );

    const list: Record<string, unknown>[] = [];

    for (const d of dossiers) {
      const paxList = (paxByDossier[d.id] ?? []).filter((p) => p.rang === 1);
      const volList = (volsByDossier[d.id] ?? []).filter((v) => v.ordre === 1);
      const p1 = paxList[0];
      const v1 = volList[0];
      const c = calcByDossier[d.id];

      const nom_complet = p1 ? [p1.prenom, p1.nom].filter(Boolean).join(" ") : null;
      const telephone = p1 && (p1.indicatif || p1.telephone) ? `${p1.indicatif ?? ""} ${p1.telephone ?? ""}`.trim() : null;
      const vol_principal = v1?.numero_vol ?? null;
      const dep = v1?.dep ?? null;
      const arr = v1?.arr ?? null;
      const palierVal = c?.palier ?? null;

      if (palier && Number(palier) !== palierVal) continue;

      const lrar = d.lrar_reception ? String(d.lrar_reception).slice(0, 10) : null;
      let interets_jours: number | null = null;
      let forfait_40: number | null = null;
      if (lrar && c) {
        const j16 = new Date(lrar);
        j16.setDate(j16.getDate() + 16);
        const now = new Date();
        if (now >= j16) {
          const jours = Math.floor((now.getTime() - j16.getTime()) / (1000 * 86400));
          const base = (c.palier ?? 0) * (c.nb_passagers_indemnises ?? 0);
          interets_jours = Math.round((base * 0.0665 / 365) * jours * 100) / 100;
          forfait_40 = 40;
        } else {
          forfait_40 = 0;
        }
      }

      if (q) {
        const qq = q.toLowerCase();
        const match =
          (nom_complet?.toLowerCase().includes(qq)) ||
          (vol_principal?.toLowerCase().includes(qq)) ||
          (v1?.pnr?.toLowerCase().includes(qq));
        if (!match) continue;
      }

      list.push({
        id: d.id,
        statut: d.statut,
        priorite: d.priorite,
        date_creation: d.date_creation,
        date_paiement: d.date_paiement,
        source: d.source,
        lrar_reception: d.lrar_reception,
        agent: d.agent,
        langue: (d as { langue?: string; langue_client?: string }).langue ?? (d as { langue_client?: string }).langue_client ?? null,
        pays: (d as { pays?: string | null }).pays ?? null,
        nom_complet,
        telephone,
        email: p1?.email ?? null,
        compagnie: v1?.compagnie ?? null,
        vol_principal,
        date_vol: v1?.date_vol ?? null,
        dep,
        arr,
        pnr: v1?.pnr ?? null,
        incident: v1?.incident ?? null,
        palier: palierVal,
        nb_passagers_indemnises: c?.nb_passagers_indemnises ?? null,
        net_client: c?.net_client ?? null,
        net_robin: c?.commission_robin ?? null,
        total_reclame: c?.total_reclame ?? null,
        interets_cumules: c?.interets_cumules ?? null,
        frais_recouvrement: c?.frais_recouvrement ?? null,
        interets_jours,
        forfait_40,
      });
    }

    return NextResponse.json(list);
  } catch (e) {
    // Fallback dev: permet de travailler en local si Supabase est indisponible.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(DEMO_DOSSIERS);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dossiers — Création complète (dossier + passagers + vols + calculs + premier événement)
 * Body: { priorite?, source?, langue?, pays?, agent?, palier?, passagers[], vols[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const { count } = await supabase
      .from("dossiers")
      .select("*", { count: "exact", head: true });
    const id = genererIdDossier(count ?? 0);

    const { error: errDossier } = await supabase.from("dossiers").insert({
      id,
      statut: "ELIGIBLE",
      priorite: body.priorite ?? "STANDARD",
      source: body.source ?? "autre",
      langue: body.langue ?? "fr",
      pays: body.pays ?? null,
      agent: body.agent ?? null,
    });
    if (errDossier)
      return NextResponse.json(
        { error: errDossier.message },
        { status: 500 }
      );

    const passagers = Array.isArray(body.passagers) ? body.passagers : [];
    if (passagers.length > 0) {
      const rows = passagers.map(
        (p: Record<string, unknown>, i: number) => ({
          dossier_id: id,
          rang: i + 1,
          prenom: p.prenom ?? null,
          nom: p.nom ?? null,
          email: p.email ?? null,
          indicatif: p.indicatif ?? "+33",
          telephone: p.telephone ?? null,
          type_piece: p.type_piece ?? null,
          numero_piece: p.numero_piece ?? null,
          iban: p.iban ?? null,
          est_bebe: Boolean(p.est_bebe),
          mandat_signe: Boolean(p.mandat_signe),
          url_mandat: p.url_mandat ?? null,
          date_signature: p.date_signature ?? null,
        })
      );
      const { error: errPax } = await supabase.from("passagers").insert(rows);
      if (errPax)
        return NextResponse.json({ error: errPax.message }, { status: 500 });
    }

    const vols = Array.isArray(body.vols) ? body.vols : [];
    if (vols.length > 0) {
      const rows = vols.map(
        (v: Record<string, unknown>, i: number) => ({
          dossier_id: id,
          ordre: i + 1,
          compagnie: v.compagnie ?? v.compagnie_operante ?? null,
          code_iata: v.code_iata ?? null,
          numero_vol: v.numero_vol ?? null,
          date_vol: v.date_vol ?? null,
          dep: v.dep ?? v.aeroport_depart ?? null,
          arr: v.arr ?? v.aeroport_arrivee ?? null,
          pnr: v.pnr ?? null,
          incident: v.incident ?? null,
          retard_minutes: v.retard_minutes ?? null,
          determinant_ce261: i === vols.length - 1,
        })
      );
      const { error: errVols } = await supabase.from("vols").insert(rows);
      if (errVols)
        return NextResponse.json({ error: errVols.message }, { status: 500 });
    }

    const nbIndemnises = passagers.filter((p: { est_bebe?: boolean }) => !p.est_bebe).length;
    const palier = Number(body.palier) || 600;
    const f = calcFinancier(palier, Math.max(1, nbIndemnises));

    const { error: errCalc } = await supabase.from("calculs").insert({
      dossier_id: id,
      palier,
      nb_passagers_indemnises: Math.max(1, nbIndemnises),
      indemnite_brute: f.brut,
      commission_robin: f.commission,
      net_client: f.netClient,
      interets_cumules: 0,
      frais_recouvrement: 40,
      total_reclame: f.totalReclame,
    });
    if (errCalc)
      return NextResponse.json({ error: errCalc.message }, { status: 500 });

    await supabase.from("evenements").insert({
      dossier_id: id,
      action: "Dossier créé",
      auteur: body.agent ?? "système",
      commentaire: `Source: ${body.source ?? "autre"}`,
    });

    return NextResponse.json(
      { id, message: "Dossier créé avec succès" },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Body JSON invalide" },
      { status: 400 }
    );
  }
}
