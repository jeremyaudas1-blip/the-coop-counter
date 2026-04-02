import {
  type EggEntry, type InsertEggEntry,
  type Chicken, type InsertChicken,
  type Collector, type InsertCollector,
  type User, type Family, type FamilyMember, type FamilyInvite,
} from "@shared/schema";

// ─── Database setup: Postgres if DATABASE_URL exists, otherwise SQLite ───

let db: any;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // PostgreSQL via pg
  isPostgres = true;
  const pg = require("pg");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  // Auto-create tables
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      marketing_consent INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS families (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_members (
      id SERIAL PRIMARY KEY,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_invites (
      id SERIAL PRIMARY KEY,
      family_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS egg_entries (
      id SERIAL PRIMARY KEY,
      family_id INTEGER,
      date TEXT NOT NULL,
      count INTEGER NOT NULL,
      note TEXT,
      collector_ids TEXT,
      egg_colors TEXT
    );
    CREATE TABLE IF NOT EXISTS chickens (
      id SERIAL PRIMARY KEY,
      family_id INTEGER,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collectors (
      id SERIAL PRIMARY KEY,
      family_id INTEGER,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `).catch((e: any) => console.error("DB init error:", e.message));

  db = pool;
  console.log("Using PostgreSQL database");
} else {
  // SQLite fallback for local dev
  const Database = require("better-sqlite3");
  const fs = require("fs");
  const path = require("path");
  // Use Railway volume if available, otherwise local
  const volMount = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  let dbPath = "data.db";
  if (volMount && fs.existsSync(volMount)) {
    dbPath = path.join(volMount, "data.db");
    console.log(`Database: using Railway volume at ${dbPath}`);
  } else if (fs.existsSync("/app/data")) {
    dbPath = "/app/data/data.db";
    console.log(`Database: using /app/data volume at ${dbPath}`);
  } else {
    console.log("Database: using local data.db");
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      marketing_consent INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS family_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS egg_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER,
      date TEXT NOT NULL,
      count INTEGER NOT NULL,
      note TEXT,
      collector_ids TEXT,
      egg_colors TEXT
    );
    CREATE TABLE IF NOT EXISTS chickens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db = sqlite;
  console.log("Using SQLite database");
}

// ─── Universal query helpers ───

async function query(sql: string, params: any[] = []): Promise<any[]> {
  if (isPostgres) {
    // Postgres uses $1, $2 params — convert ? placeholders
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    const result = await db.query(pgSql, params);
    return result.rows;
  } else {
    return db.prepare(sql).all(...params);
  }
}

async function queryOne(sql: string, params: any[] = []): Promise<any | undefined> {
  if (isPostgres) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    const result = await db.query(pgSql, params);
    return result.rows[0];
  } else {
    return db.prepare(sql).get(...params);
  }
}

async function run(sql: string, params: any[] = []): Promise<void> {
  if (isPostgres) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    await db.query(pgSql, params);
  } else {
    db.prepare(sql).run(...params);
  }
}

async function insert(sql: string, params: any[] = []): Promise<any> {
  if (isPostgres) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`) + " RETURNING *";
    const result = await db.query(pgSql, params);
    return result.rows[0];
  } else {
    const info = db.prepare(sql).run(...params);
    // Return the inserted row by ID
    const table = sql.match(/INSERT INTO (\w+)/i)?.[1];
    if (table) return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    return { id: info.lastInsertRowid };
  }
}

async function update(sql: string, params: any[] = []): Promise<any> {
  if (isPostgres) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`) + " RETURNING *";
    const result = await db.query(pgSql, params);
    return result.rows[0];
  } else {
    db.prepare(sql).run(...params);
    // Extract table and id from the WHERE clause
    const table = sql.match(/UPDATE (\w+)/i)?.[1];
    const id = params[params.length - 1]; // Assume last param is the WHERE id
    if (table) return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    return undefined;
  }
}

// ─── Storage implementation ───

export interface IStorage {
  createUser(name: string, email: string, passwordHash: string, marketingConsent: boolean): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserName(id: number, name: string): Promise<void>;
  createFamily(name: string, ownerId: number): Promise<Family>;
  getFamilyById(id: number): Promise<Family | undefined>;
  updateFamilyName(id: number, name: string): Promise<void>;
  getUserFamilies(userId: number): Promise<{ family: Family; role: string }[]>;
  addFamilyMember(familyId: number, userId: number, role: string): Promise<FamilyMember>;
  getFamilyMembers(familyId: number): Promise<(FamilyMember & { userName?: string; userEmail?: string })[]>;
  createInvite(familyId: number, email: string, token: string): Promise<FamilyInvite>;
  getInviteByToken(token: string): Promise<FamilyInvite | undefined>;
  getPendingInvites(familyId: number): Promise<FamilyInvite[]>;
  getPendingInvitesForEmail(email: string): Promise<FamilyInvite[]>;
  acceptInvite(id: number): Promise<void>;
  getEntriesByYear(familyId: number, year: number): Promise<EggEntry[]>;
  getEntryByDate(familyId: number, date: string): Promise<EggEntry | undefined>;
  createEntry(entry: InsertEggEntry): Promise<EggEntry>;
  updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined>;
  deleteEntry(id: number): Promise<void>;
  getChickens(familyId: number): Promise<Chicken[]>;
  createChicken(chicken: InsertChicken): Promise<Chicken>;
  deleteChicken(id: number): Promise<void>;
  getCollectors(familyId: number): Promise<Collector[]>;
  createCollector(collector: InsertCollector): Promise<Collector>;
  deleteCollector(id: number): Promise<void>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(name: string, email: string, passwordHash: string, marketingConsent: boolean): Promise<User> {
    return insert("INSERT INTO users (name, email, password_hash, created_at, marketing_consent) VALUES (?, ?, ?, ?, ?)",
      [name, email.toLowerCase(), passwordHash, new Date().toISOString(), marketingConsent ? 1 : 0]);
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return queryOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  }
  async getUserById(id: number): Promise<User | undefined> {
    return queryOne("SELECT * FROM users WHERE id = ?", [id]);
  }
  async updateUserName(id: number, name: string): Promise<void> {
    await run("UPDATE users SET name = ? WHERE id = ?", [name, id]);
  }
  async createFamily(name: string, ownerId: number): Promise<Family> {
    return insert("INSERT INTO families (name, owner_id, created_at) VALUES (?, ?, ?)",
      [name, ownerId, new Date().toISOString()]);
  }
  async getFamilyById(id: number): Promise<Family | undefined> {
    return queryOne("SELECT * FROM families WHERE id = ?", [id]);
  }
  async updateFamilyName(id: number, name: string): Promise<void> {
    await run("UPDATE families SET name = ? WHERE id = ?", [name, id]);
  }
  async getUserFamilies(userId: number): Promise<{ family: Family; role: string }[]> {
    const memberships = await query("SELECT * FROM family_members WHERE user_id = ?", [userId]);
    const results: { family: Family; role: string }[] = [];
    for (const m of memberships) {
      const fam = await queryOne("SELECT * FROM families WHERE id = ?", [m.family_id]);
      if (fam) results.push({ family: fam, role: m.role });
    }
    return results;
  }
  async addFamilyMember(familyId: number, userId: number, role: string): Promise<FamilyMember> {
    return insert("INSERT INTO family_members (family_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)",
      [familyId, userId, role, new Date().toISOString()]);
  }
  async getFamilyMembers(familyId: number): Promise<(FamilyMember & { userName?: string; userEmail?: string })[]> {
    const members = await query("SELECT fm.*, u.name as user_name, u.email as user_email FROM family_members fm LEFT JOIN users u ON fm.user_id = u.id WHERE fm.family_id = ?", [familyId]);
    return members.map((m: any) => ({ ...m, userName: m.user_name, userEmail: m.user_email }));
  }
  async createInvite(familyId: number, email: string, token: string): Promise<FamilyInvite> {
    return insert("INSERT INTO family_invites (family_id, email, token, created_at) VALUES (?, ?, ?, ?)",
      [familyId, email.toLowerCase(), token, new Date().toISOString()]);
  }
  async getInviteByToken(token: string): Promise<FamilyInvite | undefined> {
    return queryOne("SELECT * FROM family_invites WHERE token = ?", [token]);
  }
  async getPendingInvites(familyId: number): Promise<FamilyInvite[]> {
    return query("SELECT * FROM family_invites WHERE family_id = ? AND accepted = 0", [familyId]);
  }
  async getPendingInvitesForEmail(email: string): Promise<FamilyInvite[]> {
    return query("SELECT * FROM family_invites WHERE email = ? AND accepted = 0", [email.toLowerCase()]);
  }
  async acceptInvite(id: number): Promise<void> {
    await run("UPDATE family_invites SET accepted = 1 WHERE id = ?", [id]);
  }
  async getEntriesByYear(familyId: number, year: number): Promise<EggEntry[]> {
    return query("SELECT * FROM egg_entries WHERE family_id = ? AND date >= ? AND date <= ? ORDER BY date DESC",
      [familyId, `${year}-01-01`, `${year}-12-31`]);
  }
  async getEntryByDate(familyId: number, date: string): Promise<EggEntry | undefined> {
    return queryOne("SELECT * FROM egg_entries WHERE family_id = ? AND date = ?", [familyId, date]);
  }
  async createEntry(entry: InsertEggEntry): Promise<EggEntry> {
    return insert("INSERT INTO egg_entries (family_id, date, count, note, collector_ids, egg_colors) VALUES (?, ?, ?, ?, ?, ?)",
      [entry.familyId, entry.date, entry.count, entry.note || null, entry.collectorIds || null, entry.eggColors || null]);
  }
  async updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (entry.count !== undefined) { fields.push("count = ?"); vals.push(entry.count); }
    if (entry.date !== undefined) { fields.push("date = ?"); vals.push(entry.date); }
    if (entry.collectorIds !== undefined) { fields.push("collector_ids = ?"); vals.push(entry.collectorIds); }
    if (entry.eggColors !== undefined) { fields.push("egg_colors = ?"); vals.push(entry.eggColors); }
    if (entry.note !== undefined) { fields.push("note = ?"); vals.push(entry.note); }
    if (fields.length === 0) return queryOne("SELECT * FROM egg_entries WHERE id = ?", [id]);
    vals.push(id);
    return update(`UPDATE egg_entries SET ${fields.join(", ")} WHERE id = ?`, vals);
  }
  async deleteEntry(id: number): Promise<void> {
    await run("DELETE FROM egg_entries WHERE id = ?", [id]);
  }
  async getChickens(familyId: number): Promise<Chicken[]> {
    return query("SELECT * FROM chickens WHERE family_id = ?", [familyId]);
  }
  async createChicken(chicken: InsertChicken): Promise<Chicken> {
    return insert("INSERT INTO chickens (family_id, name) VALUES (?, ?)", [chicken.familyId, chicken.name]);
  }
  async deleteChicken(id: number): Promise<void> {
    await run("DELETE FROM chickens WHERE id = ?", [id]);
  }
  async getCollectors(familyId: number): Promise<Collector[]> {
    return query("SELECT * FROM collectors WHERE family_id = ?", [familyId]);
  }
  async createCollector(collector: InsertCollector): Promise<Collector> {
    return insert("INSERT INTO collectors (family_id, name) VALUES (?, ?)", [collector.familyId, collector.name]);
  }
  async deleteCollector(id: number): Promise<void> {
    await run("DELETE FROM collectors WHERE id = ?", [id]);
  }
  async getSetting(key: string): Promise<string | undefined> {
    const row = await queryOne("SELECT * FROM settings WHERE key = ?", [key]);
    return row?.value;
  }
  async setSetting(key: string, value: string): Promise<void> {
    await run("DELETE FROM settings WHERE key = ?", [key]);
    await insert("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
  }
}

export const storage = new DatabaseStorage();
