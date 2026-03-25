import {
  type EggEntry, type InsertEggEntry, eggEntries,
  type Chicken, type InsertChicken, chickens,
  type Collector, type InsertCollector, collectors,
  settings,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Auto-create tables on startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS egg_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    count INTEGER NOT NULL,
    note TEXT,
    collector_ids TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_egg_entries_date ON egg_entries(date);
  CREATE TABLE IF NOT EXISTS chickens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS collectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migrate: add collector_ids column if it doesn't exist on older DBs
try {
  sqlite.exec(`ALTER TABLE egg_entries ADD COLUMN collector_ids TEXT`);
} catch { /* column already exists */ }

export const db = drizzle(sqlite);

export interface IStorage {
  getAllEntries(): Promise<EggEntry[]>;
  getEntriesByYear(year: number): Promise<EggEntry[]>;
  getEntryByDate(date: string): Promise<EggEntry | undefined>;
  createEntry(entry: InsertEggEntry): Promise<EggEntry>;
  updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined>;
  deleteEntry(id: number): Promise<void>;
  getAllChickens(): Promise<Chicken[]>;
  createChicken(chicken: InsertChicken): Promise<Chicken>;
  deleteChicken(id: number): Promise<void>;
  getAllCollectors(): Promise<Collector[]>;
  createCollector(collector: InsertCollector): Promise<Collector>;
  deleteCollector(id: number): Promise<void>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllEntries(): Promise<EggEntry[]> {
    return db.select().from(eggEntries).orderBy(desc(eggEntries.date)).all();
  }

  async getEntriesByYear(year: number): Promise<EggEntry[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return db.select().from(eggEntries)
      .where(and(gte(eggEntries.date, startDate), lte(eggEntries.date, endDate)))
      .orderBy(desc(eggEntries.date)).all();
  }

  async getEntryByDate(date: string): Promise<EggEntry | undefined> {
    return db.select().from(eggEntries).where(eq(eggEntries.date, date)).get();
  }

  async createEntry(entry: InsertEggEntry): Promise<EggEntry> {
    return db.insert(eggEntries).values(entry).returning().get();
  }

  async updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined> {
    return db.update(eggEntries).set(entry).where(eq(eggEntries.id, id)).returning().get();
  }

  async deleteEntry(id: number): Promise<void> {
    db.delete(eggEntries).where(eq(eggEntries.id, id)).run();
  }

  async getAllChickens(): Promise<Chicken[]> {
    return db.select().from(chickens).all();
  }

  async createChicken(chicken: InsertChicken): Promise<Chicken> {
    return db.insert(chickens).values(chicken).returning().get();
  }

  async deleteChicken(id: number): Promise<void> {
    db.delete(chickens).where(eq(chickens.id, id)).run();
  }

  async getAllCollectors(): Promise<Collector[]> {
    return db.select().from(collectors).all();
  }

  async createCollector(collector: InsertCollector): Promise<Collector> {
    return db.insert(collectors).values(collector).returning().get();
  }

  async deleteCollector(id: number): Promise<void> {
    db.delete(collectors).where(eq(collectors.id, id)).run();
  }

  async getSetting(key: string): Promise<string | undefined> {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    db.delete(settings).where(eq(settings.key, key)).run();
    db.insert(settings).values({ key, value }).run();
  }
}

export const storage = new DatabaseStorage();
