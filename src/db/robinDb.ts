/**
 * Base robin.db — table des vols avec certification Amadeus.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.ROBIN_DB_PATH || path.join(process.cwd(), 'data', 'robin.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS radar_flights (
        flight_key TEXT PRIMARY KEY,
        flight TEXT,
        dep TEXT,
        arr TEXT,
        scheduled_date TEXT,
        delay_minutes INTEGER,
        cancelled INTEGER DEFAULT 0,
        is_certified_amadeus INTEGER DEFAULT 0,
        amadeus_checked_at TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_radar_certified ON radar_flights(is_certified_amadeus);

      CREATE TABLE IF NOT EXISTS airports (
        iata_code TEXT PRIMARY KEY,
        name TEXT,
        city_code TEXT,
        city_name TEXT,
        country_code TEXT,
        latitude REAL,
        longitude REAL,
        timezone_offset TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wa_id TEXT,
        from_phone TEXT,
        message_id TEXT,
        message_type TEXT,
        body_text TEXT,
        raw_payload TEXT,
        direction TEXT DEFAULT 'in',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_whatsapp_from ON whatsapp_messages(from_phone);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_created ON whatsapp_messages(created_at);

      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        phone_number TEXT PRIMARY KEY,
        current_step TEXT NOT NULL DEFAULT 'AWAITING_CARD',
        flight_data TEXT,
        passenger_count INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        verdict_eligible INTEGER,
        verdict_reason TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_step ON whatsapp_sessions(current_step);
    `);
  }
  return db;
}

/** Clé unique vol (pour déduplication). */
export function flightKey(flight: string, dep: string, arr: string, scheduledDate: string): string {
  return [flight, dep, arr, scheduledDate].map((s) => (s || '').trim().toUpperCase()).join('|');
}

export function setCertified(key: string, certified: boolean): void {
  const conn = getDb();
  conn
    .prepare(
      `INSERT INTO radar_flights (flight_key, is_certified_amadeus, amadeus_checked_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(flight_key) DO UPDATE SET
         is_certified_amadeus = excluded.is_certified_amadeus,
         amadeus_checked_at = excluded.amadeus_checked_at,
         updated_at = datetime('now')`
    )
    .run(key, certified ? 1 : 0);
}

export function getCertifiedKeys(keys: string[]): Record<string, boolean> {
  if (keys.length === 0) return {};
  const conn = getDb();
  const placeholders = keys.map(() => '?').join(',');
  const rows = conn.prepare(`SELECT flight_key FROM radar_flights WHERE flight_key IN (${placeholders}) AND is_certified_amadeus = 1`).all(...keys) as { flight_key: string }[];
  const out: Record<string, boolean> = {};
  keys.forEach((k) => (out[k] = false));
  rows.forEach((r) => (out[r.flight_key] = true));
  return out;
}

/** Modèle aéroport (référence Amadeus). */
export interface AirportRow {
  iata_code: string;
  name: string | null;
  city_code: string | null;
  city_name: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone_offset: string | null;
  updated_at: string | null;
}

export function upsertAirport(row: Omit<AirportRow, 'updated_at'>): void {
  const conn = getDb();
  conn
    .prepare(
      `INSERT INTO airports (iata_code, name, city_code, city_name, country_code, latitude, longitude, timezone_offset, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(iata_code) DO UPDATE SET
         name = excluded.name,
         city_code = excluded.city_code,
         city_name = excluded.city_name,
         country_code = excluded.country_code,
         latitude = excluded.latitude,
         longitude = excluded.longitude,
         timezone_offset = excluded.timezone_offset,
         updated_at = datetime('now')`
    )
    .run(
      row.iata_code,
      row.name ?? null,
      row.city_code ?? null,
      row.city_name ?? null,
      row.country_code ?? null,
      row.latitude ?? null,
      row.longitude ?? null,
      row.timezone_offset ?? null
    );
}

export function getAirport(iataCode: string): AirportRow | null {
  const conn = getDb();
  const row = conn.prepare('SELECT * FROM airports WHERE iata_code = ?').get((iataCode || '').trim().toUpperCase()) as AirportRow | undefined;
  return row ?? null;
}

/** Log d’un message WhatsApp entrant (pour le Dashboard). */
export interface WhatsAppMessageRow {
  id: number;
  wa_id: string | null;
  from_phone: string | null;
  message_id: string | null;
  message_type: string | null;
  body_text: string | null;
  raw_payload: string | null;
  direction: string | null;
  created_at: string | null;
}

export function insertWhatsAppMessage(row: {
  wa_id?: string | null;
  from_phone?: string | null;
  message_id?: string | null;
  message_type?: string | null;
  body_text?: string | null;
  raw_payload?: string | null;
  direction?: string;
}): void {
  const conn = getDb();
  conn
    .prepare(
      `INSERT INTO whatsapp_messages (wa_id, from_phone, message_id, message_type, body_text, raw_payload, direction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.wa_id ?? null,
      row.from_phone ?? null,
      row.message_id ?? null,
      row.message_type ?? null,
      row.body_text ?? null,
      row.raw_payload ?? null,
      row.direction ?? 'in'
    );
}

/** Étapes du tunnel conversationnel Robin (éligibilité) + Étape 1 collecte mandat. */
export type TunnelStep =
  | 'AWAITING_CARD'
  | 'CONFIRM_FLIGHT'
  | 'CHECK_CONNECTION'
  | 'ASK_PASSENGERS'
  | 'CONFIRM_DATE'
  | 'VERDICT'
  // Étape 1 — Conversation WhatsApp (cheminement mandat)
  | 'PASSENGER_FIRST'
  | 'PASSENGER_LAST'
  | 'PASSENGER_ANOTHER'
  | 'PASSENGERS_CONFIRM'
  | 'CONFIRM_PHONE'
  | 'ASK_CONTACT_PHONE'
  | 'TRAJET_FLIGHT'
  | 'TRAJET_DATE'
  | 'TRAJET_CONNECTION'
  | 'TRAJET_CONFIRM'
  | 'ASK_PNR'
  | 'CONFIRM_PNR'
  | 'ASK_AIRLINE'
  | 'ASK_ADDRESS'
  | 'STEP1_DONE';

export interface WhatsAppSessionRow {
  phone_number: string;
  current_step: string;
  flight_data: string | null;
  passenger_count: number;
  is_completed: number;
  verdict_eligible: number | null;
  verdict_reason: string | null;
  updated_at: string | null;
}

export interface FlightData {
  flightNumber?: string;
  date?: string;
  passengerName?: string;
  hasConnection?: boolean;
  dep?: string;
  arr?: string;
}

/** Données collectées pour Étape 1 (mandat) — stockées dans flight_data en mode collecte. */
export interface Step1FormData {
  passengers?: { firstName: string; lastName: string }[];
  passengerIndex?: number;
  contactPhone?: string;
  flights?: { flightNumber: string; date: string }[];
  segmentIndex?: number;
  pnr?: string;
  airline?: string;
  address?: string;
}

export function getSession(phoneNumber: string): WhatsAppSessionRow | null {
  const conn = getDb();
  const row = conn
    .prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?')
    .get(normalizePhoneForDb(phoneNumber)) as WhatsAppSessionRow | undefined;
  return row ?? null;
}

export function upsertSession(row: {
  phone_number: string;
  current_step?: TunnelStep;
  flight_data?: FlightData | null;
  passenger_count?: number;
  is_completed?: boolean;
  verdict_eligible?: boolean | null;
  verdict_reason?: string | null;
}): void {
  const conn = getDb();
  const phone = normalizePhoneForDb(row.phone_number);
  const existing = getSession(phone);
  const step = row.current_step ?? existing?.current_step ?? 'AWAITING_CARD';
  const flightDataStr =
    row.flight_data !== undefined
      ? row.flight_data === null
        ? null
        : JSON.stringify(row.flight_data)
      : existing?.flight_data ?? null;
  const passengerCount = row.passenger_count ?? existing?.passenger_count ?? 0;
  const isCompleted = row.is_completed ?? existing?.is_completed ?? 0;
  const verdictEligible = row.verdict_eligible !== undefined ? (row.verdict_eligible ? 1 : 0) : existing?.verdict_eligible ?? null;
  const verdictReason = row.verdict_reason ?? existing?.verdict_reason ?? null;

  conn
    .prepare(
      `INSERT INTO whatsapp_sessions (phone_number, current_step, flight_data, passenger_count, is_completed, verdict_eligible, verdict_reason, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(phone_number) DO UPDATE SET
         current_step = excluded.current_step,
         flight_data = excluded.flight_data,
         passenger_count = excluded.passenger_count,
         is_completed = excluded.is_completed,
         verdict_eligible = excluded.verdict_eligible,
         verdict_reason = excluded.verdict_reason,
         updated_at = datetime('now')`
    )
    .run(phone, step, flightDataStr, passengerCount, isCompleted ? 1 : 0, verdictEligible, verdictReason);
}

export function updateSessionStep(phoneNumber: string, step: TunnelStep, flightData?: FlightData | null, passengerCount?: number): void {
  const phone = normalizePhoneForDb(phoneNumber);
  const existing = getSession(phone);
  const fd = flightData !== undefined ? flightData : (existing?.flight_data ? (JSON.parse(existing.flight_data) as FlightData) : null);
  const pc = passengerCount ?? existing?.passenger_count ?? 0;
  upsertSession({
    phone_number: phone,
    current_step: step,
    flight_data: fd,
    passenger_count: pc,
  });
}

function normalizePhoneForDb(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return '33' + digits.slice(1);
  if (digits.length <= 9 && !digits.startsWith('33')) return '33' + digits;
  return digits;
}
