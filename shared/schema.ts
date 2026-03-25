import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const eggEntries = sqliteTable("egg_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  count: integer("count").notNull(),
  note: text("note"),
  collectorIds: text("collector_ids"), // JSON array of collector IDs e.g. "[1,3]"
});

export const chickens = sqliteTable("chickens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const collectors = sqliteTable("collectors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertEggEntrySchema = createInsertSchema(eggEntries).omit({
  id: true,
}).extend({
  count: z.number().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  collectorIds: z.string().optional().nullable(),
});

export const insertChickenSchema = createInsertSchema(chickens).omit({
  id: true,
}).extend({
  name: z.string().min(1).max(50),
});

export const insertCollectorSchema = createInsertSchema(collectors).omit({
  id: true,
}).extend({
  name: z.string().min(1).max(50),
});

export type InsertEggEntry = z.infer<typeof insertEggEntrySchema>;
export type EggEntry = typeof eggEntries.$inferSelect;
export type InsertChicken = z.infer<typeof insertChickenSchema>;
export type Chicken = typeof chickens.$inferSelect;
export type InsertCollector = z.infer<typeof insertCollectorSchema>;
export type Collector = typeof collectors.$inferSelect;
