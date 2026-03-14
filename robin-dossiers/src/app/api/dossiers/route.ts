import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/dossiers — Liste des dossiers (pagination, filtre statut)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const offset = Number(searchParams.get("offset")) || 0;
    const statut = searchParams.get("statut") ?? undefined;

    let query = supabase
      .from("dossiers")
      .select("*", { count: "exact" })
      .order("date_creation", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statut) {
      query = query.eq("statut", statut);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      dossiers: data,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dossiers — Créer un dossier (id optionnel, généré si absent)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const id =
      body.id ??
      `RDA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-4)}`;

    const row = {
      id,
      statut: body.statut ?? "BROUILLON",
      priorite: body.priorite ?? "STANDARD",
      date_creation: body.date_creation ?? new Date().toISOString().slice(0, 10),
      date_paiement: body.date_paiement ?? null,
      source: body.source ?? null,
      lrar_reception: body.lrar_reception ?? null,
      agent: body.agent ?? null,
      langue: body.langue ?? "fr",
    };

    const { data, error } = await supabase.from("dossiers").insert(row).select().single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Body JSON invalide" },
      { status: 400 }
    );
  }
}
