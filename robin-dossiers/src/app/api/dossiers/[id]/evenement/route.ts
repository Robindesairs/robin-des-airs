import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/dossiers/[id]/evenement — Ajouter un événement au dossier
 * Body: { action (requis), auteur?, commentaire? }
 */
export async function POST(
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
    const action = body.action;

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "action requise" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("evenements").insert({
      dossier_id: id,
      action,
      auteur: body.auteur ?? "agent",
      commentaire: body.commentaire ?? null,
    });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { message: "Événement ajouté" },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Body JSON invalide" },
      { status: 400 }
    );
  }
}
