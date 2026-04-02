import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
  marketingConsent: integer("marketing_consent").default(0), // 0 or 1
});

// ─── Families ───
export const families = sqliteTable("families", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. "The Audas Coop"
  ownerId: integer("owner_id").notNull(), // user who created it
  createdAt: text("created_at").notNull(),
});

// ─── Family Members (join table) ───
export const familyMembers = sqliteTable("family_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"), // "owner" or "member"
  joinedAt: text("joined_at").notNull(),
});

// ─── Family Invites ───
export const familyInvites = sqliteTable("family_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull(),
  createdAt: text("created_at").notNull(),
  accepted: integer("accepted").default(0), // 0 or 1
});

// ─── Egg Entries (scoped to family) ───
export const eggEntries = sqliteTable("egg_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id"),
  date: text("date").notNull(),
  count: integer("count").notNull(),
  note: text("note"),
  collectorIds: text("collector_ids"),
  eggColors: text("egg_colors"),
});

// ─── Chickens (scoped to family) ───
export const chickens = sqliteTable("chickens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id"),
  name: text("name").notNull(),
});

// ─── Collectors (scoped to family) ───
export const collectors = sqliteTable("collectors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  familyId: integer("family_id"),
  name: text("name").notNull(),
});

// ─── Settings (scoped to family) ───
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ─── Zod Schemas ───
export const insertEggEntrySchema = createInsertSchema(eggEntries).omit({ id: true }).extend({
  count: z.number().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  collectorIds: z.string().optional().nullable(),
  eggColors: z.string().optional().nullable(),
  familyId: z.number().optional().nullable(),
});

export const insertChickenSchema = createInsertSchema(chickens).omit({ id: true }).extend({
  name: z.string().min(1).max(50),
  familyId: z.number().optional().nullable(),
});

export const insertCollectorSchema = createInsertSchema(collectors).omit({ id: true }).extend({
  name: z.string().min(1).max(50),
  familyId: z.number().optional().nullable(),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  familyName: z.string().min(1).max(100),
  marketingConsent: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const inviteSchema = z.object({
  email: z.string().email(),
});

// ─── Types ───
export type InsertEggEntry = z.infer<typeof insertEggEntrySchema>;
export type EggEntry = typeof eggEntries.$inferSelect;
export type InsertChicken = z.infer<typeof insertChickenSchema>;
export type Chicken = typeof chickens.$inferSelect;
export type InsertCollector = z.infer<typeof insertCollectorSchema>;
export type Collector = typeof collectors.$inferSelect;
export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type FamilyInvite = typeof familyInvites.$inferSelect;
