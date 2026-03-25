import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const eggEntries = sqliteTable("egg_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  count: integer("count").notNull(),
  note: text("note"),
});

export const insertEggEntrySchema = createInsertSchema(eggEntries).omit({
  id: true,
}).extend({
  count: z.number().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type InsertEggEntry = z.infer<typeof insertEggEntrySchema>;
export type EggEntry = typeof eggEntries.$inferSelect;
