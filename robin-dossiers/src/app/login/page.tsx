"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next");
    if (!raw || !raw.startsWith("/")) return "/";
    return raw;
  }, [searchParams]);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (signInError) throw signInError;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Impossible de lancer la connexion Google.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Robin des Airs</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connexion espace dossiers</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connectez-vous avec Google pour acceder a votre espace client.
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Connexion..." : "Continuer avec Google"}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-6 text-xs text-slate-500">
          Si besoin, activez le provider Google dans Supabase Auth.
        </p>
      </div>
    </main>
  );
}
