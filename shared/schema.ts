import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const eggEntries = sqliteTable("egg_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  count: integer("count").notNull(),
  note: text("note"),
});

export const chickens = sqliteTable("chickens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const insertEggEntrySchema = createInsertSchema(eggEntries).omit({
  id: true,
}).extend({
  count: z.number().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const insertChickenSchema = createInsertSchema(chickens).omit({
  id: true,
}).extend({
  name: z.string().min(1).max(50),
});

export type InsertEggEntry = z.infer<typeof insertEggEntrySchema>;
export type EggEntry = typeof eggEntries.$inferSelect;
export type InsertChicken = z.infer<typeof insertChickenSchema>;
export type Chicken = typeof chickens.$inferSelect;
