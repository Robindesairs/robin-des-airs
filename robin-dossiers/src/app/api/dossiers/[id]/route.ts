import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { calcFinancier } from "@/lib/calculs";
import { DEMO_DOSSIERS } from "@/lib/demoData";

function getDemoDetail(id: string) {
  const d = DEMO_DOSSIERS.find((x) => x.id === id);
  if (!d) return null;
  return {
    id: d.id,
    statut: d.statut,
    priorite: d.priorite,
    date_creation: d.date_creation,
    date_paiement: d.date_paiement,
    source: d.source,
    lrar_reception: d.lrar_reception,
    agent: d.agent,
    langue: d.langue,
    pays: d.pays,
    nom_complet: d.nom_complet,
    vol_principal: d.vol_principal,
    dep: d.dep,
    arr: d.arr,
    palier: d.palier,
    nb_passagers_indemnises: d.nb_passagers_indemnises,
    net_client: d.net_client,
    net_robin: d.net_robin,
    passagers: [
      {
        rang: 1,
        prenom: d.nom_complet.split(" ")[0] ?? "",
        nom: d.nom_complet.split(" ").slice(1).join(" ") ?? "",
        email: d.email,
      },
    ],
    vols: [
      {
        ordre: 1,
        compagnie: d.compagnie,
        numero_vol: d.vol_principal,
        date_vol: d.date_vol,
        dep: d.dep,
        arr: d.arr,
        pnr: d.pnr,
        incident: d.incident,
      },
    ],
    calculs: {
      palier: d.palier,
      nb_passagers_indemnises: d.nb_passagers_indemnises,
      net_client: d.net_client,
      commission_robin: d.net_robin,
      total_reclame: d.total_reclame,
      interets_cumules: d.interets_cumules,
      frais_recouvrement: d.frais_recouvrement,
    },
    evenements: [
      {
        date: `${d.date_creation}T10:00:00Z`,
        action: "Dossier créé",
        auteur: "système",
        commentaire: `Source: ${d.source}`,
      },
      {
        date: `${d.date_creation}T12:00:00Z`,
        action: "Informations dossier validées",
        auteur: "agent_demo",
        commentaire: "Mode démo local",
      },
    ],
    envois: [],
    reponses: [],
  };
}

/**
 * GET /api/dossiers/[id] — Détail complet (dossier + passagers + vols + calculs + evenements + envois + reponses)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const [
      dossierRes,
      passagersRes,
      volsRes,
      calculsRes,
      evenementsRes,
    ] = await Promise.all([
      supabase.from("dossiers").select("*").eq("id", id).single(),
      supabase.from("passagers").select("*").eq("dossier_id", id).order("rang"),
      supabase.from("vols").select("*").eq("dossier_id", id).order("ordre"),
      supabase.from("calculs").select("*").eq("dossier_id", id).single(),
      supabase
        .from("evenements")
        .select("*")
        .eq("dossier_id", id)
        .order("date", { ascending: false }),
    ]);

    if (dossierRes.error) {
      if (process.env.NODE_ENV !== "production") {
        const demo = getDemoDetail(id);
        if (demo) return NextResponse.json(demo);
      }
      if (dossierRes.error.code === "PGRST116")
        return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
      return NextResponse.json(
        { error: dossierRes.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...dossierRes.data,
      passagers: passagersRes.data ?? [],
      vols: volsRes.data ?? [],
      calculs: calculsRes.data ?? null,
      evenements: evenementsRes.data ?? [],
      envois: [],
      reponses: [],
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      const demo = getDemoDetail(id);
      if (demo) return NextResponse.json(demo);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dossiers/[id] — Mise à jour (statut, priorite, lrar_reception, date_paiement, agent, langue, motif_non_eligibilite)
 * Si palier ou nb_passagers_indemnises fournis, recalcule les calculs. Si statut change, ajoute un événement.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const body = await request.json();

    const allowed = [
      "statut",
      "priorite",
      "lrar_reception",
      "date_paiement",
      "agent",
      "langue",
      "pays",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("dossiers")
        .update(updates)
        .eq("id", id);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (
      body.palier !== undefined ||
      body.nb_passagers_indemnises !== undefined
    ) {
      const { data: calcData } = await supabase
        .from("calculs")
        .select("*")
        .eq("dossier_id", id)
        .single();

      if (calcData) {
        const palier = Number(body.palier) ?? calcData.palier ?? 600;
        const nb =
          Number(body.nb_passagers_indemnises) ??
          calcData.nb_passagers_indemnises ??
          1;
        const f = calcFinancier(palier, nb);
        await supabase
          .from("calculs")
          .update({
            palier,
            nb_passagers_indemnises: nb,
            indemnite_brute: f.brut,
            commission_robin: f.commission,
            net_client: f.netClient,
            total_reclame: f.totalReclame,
          })
          .eq("dossier_id", id);
      }
    }

    if (body.statut) {
      await supabase.from("evenements").insert({
        dossier_id: id,
        action: `Statut mis à jour → ${body.statut}`,
        auteur: body.auteur ?? "agent",
        commentaire: body.commentaire ?? null,
      });
    }

    return NextResponse.json({ message: "Dossier mis à jour" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Body JSON invalide" },
      { status: 400 }
    );
  }
}
