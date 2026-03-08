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
