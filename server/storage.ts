import {
  type EggEntry, type InsertEggEntry, eggEntries,
  type Chicken, type InsertChicken, chickens,
  type Collector, type InsertCollector, collectors,
  type User, users,
  type Family, families,
  type FamilyMember, familyMembers,
  type FamilyInvite, familyInvites,
  settings,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// Database path — uses /app/data/ if the directory exists (Railway volume), otherwise local
import fs from "fs";
import path from "path";
const VOLUME_PATH = "/app/data";
const DB_PATH = fs.existsSync(VOLUME_PATH) ? path.join(VOLUME_PATH, "data.db") : "data.db";

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Auto-create tables
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

// Migrations for existing DBs
try { sqlite.exec(`ALTER TABLE egg_entries ADD COLUMN collector_ids TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE egg_entries ADD COLUMN egg_colors TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE egg_entries ADD COLUMN family_id INTEGER`); } catch {}
try { sqlite.exec(`ALTER TABLE chickens ADD COLUMN family_id INTEGER`); } catch {}
try { sqlite.exec(`ALTER TABLE collectors ADD COLUMN family_id INTEGER`); } catch {}

export const db = drizzle(sqlite);

export interface IStorage {
  // Auth
  createUser(name: string, email: string, passwordHash: string, marketingConsent: boolean): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  // Families
  createFamily(name: string, ownerId: number): Promise<Family>;
  getFamilyById(id: number): Promise<Family | undefined>;
  getUserFamilies(userId: number): Promise<{ family: Family; role: string }[]>;
  addFamilyMember(familyId: number, userId: number, role: string): Promise<FamilyMember>;
  getFamilyMembers(familyId: number): Promise<(FamilyMember & { userName?: string; userEmail?: string })[]>;
  // Invites
  createInvite(familyId: number, email: string, token: string): Promise<FamilyInvite>;
  getInviteByToken(token: string): Promise<FamilyInvite | undefined>;
  getPendingInvites(familyId: number): Promise<FamilyInvite[]>;
  getPendingInvitesForEmail(email: string): Promise<FamilyInvite[]>;
  acceptInvite(id: number): Promise<void>;
  // Egg entries (family-scoped)
  getEntriesByYear(familyId: number, year: number): Promise<EggEntry[]>;
  getEntryByDate(familyId: number, date: string): Promise<EggEntry | undefined>;
  createEntry(entry: InsertEggEntry): Promise<EggEntry>;
  updateEntry(id: number, entry: Partial<InsertEggEntry>): Promise<EggEntry | undefined>;
  deleteEntry(id: number): Promise<void>;
  // Chickens (family-scoped)
  getChickens(familyId: number): Promise<Chicken[]>;
  createChicken(chicken: InsertChicken): Promise<Chicken>;
  deleteChicken(id: number): Promise<void>;
  // Collectors (family-scoped)
  getCollectors(familyId: number): Promise<Collector[]>;
  createCollector(collector: InsertCollector): Promise<Collector>;
  deleteCollector(id: number): Promise<void>;
  // Settings (family-scoped via key prefix)
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ─── Auth ───
  async createUser(name: string, email: string, passwordHash: string, marketingConsent: boolean): Promise<User> {
    return db.insert(users).values({
      name, email, passwordHash, createdAt: new Date().toISOString(),
      marketingConsent: marketingConsent ? 1 : 0,
    }).returning().get();
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  }
  async getUserById(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  // ─── Families ───
  async createFamily(name: string, ownerId: number): Promise<Family> {
    return db.insert(families).values({ name, ownerId, createdAt: new Date().toISOString() }).returning().get();
  }
  async getFamilyById(id: number): Promise<Family | undefined> {
    return db.select().from(families).where(eq(families.id, id)).get();
  }
  async getUserFamilies(userId: number): Promise<{ family: Family; role: string }[]> {
    const memberships = db.select().from(familyMembers).where(eq(familyMembers.userId, userId)).all();
    const result: { family: Family; role: string }[] = [];
    for (const m of memberships) {
      const fam = db.select().from(families).where(eq(families.id, m.familyId)).get();
      if (fam) result.push({ family: fam, role: m.role });
    }
    return result;
  }
  async addFamilyMember(familyId: number, userId: number, role: string): Promise<FamilyMember> {
    return db.insert(familyMembers).values({ familyId, userId, role, joinedAt: new Date().toISOString() }).returning().get();
  }
  async getFamilyMembers(familyId: number): Promise<(FamilyMember & { userName?: string; userEmail?: string })[]> {
    const members = db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId)).all();
    return members.map(m => {
      const user = db.select().from(users).where(eq(users.id, m.userId)).get();
      return { ...m, userName: user?.name, userEmail: user?.email };
    });
  }

  // ─── Invites ───
  async createInvite(familyId: number, email: string, token: string): Promise<FamilyInvite> {
    return db.insert(familyInvites).values({ familyId, email: email.toLowerCase(), token, createdAt: new Date().toISOString() }).returning().get();
  }
  async getInviteByToken(token: string): Promise<FamilyInvite | undefined> {
    return db.select().from(familyInvites).where(eq(familyInvites.token, token)).get();
  }
  async getPendingInvites(familyId: number): Promise<FamilyInvite[]> {
    return db.select().from(familyInvites).where(and(eq(familyInvites.familyId, familyId), eq(familyInvites.accepted, 0))).all();
  }
  async getPendingInvitesForEmail(email: string): Promise<FamilyInvite[]> {
    return db.select().from(familyInvites).where(and(eq(familyInvites.email, email.toLowerCase()), eq(familyInvites.accepted, 0))).all();
  }
  async acceptInvite(id: number): Promise<void> {
    db.update(familyInvites).set({ accepted: 1 }).where(eq(familyInvites.id, id)).run();
  }

  // ─── Entries (family-scoped) ───
  async getEntriesByYear(familyId: number, year: number): Promise<EggEntry[]> {
    return db.select().from(eggEntries)
      .where(and(eq(eggEntries.familyId, familyId), gte(eggEntries.date, `${year}-01-01`), lte(eggEntries.date, `${year}-12-31`)))
      .orderBy(desc(eggEntries.date)).all();
  }
  async getEntryByDate(familyId: number, date: string): Promise<EggEntry | undefined> {
    return db.select().from(eggEntries).where(and(eq(eggEntries.familyId, familyId), eq(eggEntries.date, date))).get();
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

  // ─── Chickens (family-scoped) ───
  async getChickens(familyId: number): Promise<Chicken[]> {
    return db.select().from(chickens).where(eq(chickens.familyId, familyId)).all();
  }
  async createChicken(chicken: InsertChicken): Promise<Chicken> {
    return db.insert(chickens).values(chicken).returning().get();
  }
  async deleteChicken(id: number): Promise<void> {
    db.delete(chickens).where(eq(chickens.id, id)).run();
  }

  // ─── Collectors (family-scoped) ───
  async getCollectors(familyId: number): Promise<Collector[]> {
    return db.select().from(collectors).where(eq(collectors.familyId, familyId)).all();
  }
  async createCollector(collector: InsertCollector): Promise<Collector> {
    return db.insert(collectors).values(collector).returning().get();
  }
  async deleteCollector(id: number): Promise<void> {
    db.delete(collectors).where(eq(collectors.id, id)).run();
  }

  // ─── Settings ───
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
