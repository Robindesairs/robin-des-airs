/**
 * Page de test API Robin — vérifier que l'API est vivante.
 * GET /api/whatsapp-status
 * Réponse : { status, agent, database }
 */

import { getDb } from '../src/db/robinDb';

export interface StatusResponse {
  status: string;
  agent: string;
  database: string;
}

function getDatabaseStatus(): 'connected' | 'disconnected' {
  try {
    getDb();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

/**
 * Handler GET : renvoie le statut de l'API (online, agent Robin, état de la base).
 */
export function handleWhatsAppStatus(): StatusResponse {
  return {
    status: 'online',
    agent: 'Robin',
    database: getDatabaseStatus(),
  };
}

/**
 * Pour usage HTTP (Fetch API) : accepte une Request et renvoie une Response.
 */
export async function whatsappStatusHandler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const body = handleWhatsAppStatus();
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Export par défaut pour Vercel / Netlify (handler Request → Response). */
export default whatsappStatusHandler;
