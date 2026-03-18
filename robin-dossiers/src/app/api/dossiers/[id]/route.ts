import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { calcFinancier } from "@/lib/calculs";

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
