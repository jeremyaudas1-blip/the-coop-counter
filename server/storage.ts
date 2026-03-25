import { type EggEntry, type InsertEggEntry, eggEntries } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getAllEntries(): Promise<EggEntry[]>;
  getEntriesByYear(year: number): Promise<EggEntry[]>;
  getEntryByDate(date: string): Promise<EggEntry | undefined>;
  createEntry(entry: InsertEggEntry): Promise<EggEntry>;
  updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined>;
  deleteEntry(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllEntries(): Promise<EggEntry[]> {
    return db.select().from(eggEntries).orderBy(desc(eggEntries.date)).all();
  }

  async getEntriesByYear(year: number): Promise<EggEntry[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return db
      .select()
      .from(eggEntries)
      .where(and(gte(eggEntries.date, startDate), lte(eggEntries.date, endDate)))
      .orderBy(desc(eggEntries.date))
      .all();
  }

  async getEntryByDate(date: string): Promise<EggEntry | undefined> {
    return db.select().from(eggEntries).where(eq(eggEntries.date, date)).get();
  }

  async createEntry(entry: InsertEggEntry): Promise<EggEntry> {
    return db.insert(eggEntries).values(entry).returning().get();
  }

  async updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined> {
    return db
      .update(eggEntries)
      .set(entry)
      .where(eq(eggEntries.id, id))
      .returning()
      .get();
  }

  async deleteEntry(id: number): Promise<void> {
    db.delete(eggEntries).where(eq(eggEntries.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
