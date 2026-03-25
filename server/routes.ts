import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEggEntrySchema, insertChickenSchema, insertCollectorSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── Egg Entries ───

  app.get("/api/entries", async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const entries = year ? await storage.getEntriesByYear(year) : await storage.getAllEntries();
      res.json(entries);
    } catch { res.status(500).json({ message: "Failed to fetch entries" }); }
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const parsed = insertEggEntrySchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }

      const existing = await storage.getEntryByDate(parsed.data.date);
      if (existing) {
        const updated = await storage.updateEntry(existing.id, parsed.data);
        res.json(updated);
        return;
      }
      const entry = await storage.createEntry(parsed.data);
      res.status(201).json(entry);
    } catch { res.status(500).json({ message: "Failed to create entry" }); }
  });

  app.patch("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateEntry(id, req.body);
      if (!updated) { res.status(404).json({ message: "Entry not found" }); return; }
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update entry" }); }
  });

  app.delete("/api/entries/:id", async (req, res) => {
    try {
      await storage.deleteEntry(parseInt(req.params.id));
      res.status(204).send();
    } catch { res.status(500).json({ message: "Failed to delete entry" }); }
  });

  // ─── Chickens ───

  app.get("/api/chickens", async (_req, res) => {
    try { res.json(await storage.getAllChickens()); }
    catch { res.status(500).json({ message: "Failed to fetch chickens" }); }
  });

  app.post("/api/chickens", async (req, res) => {
    try {
      const parsed = insertChickenSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
      res.status(201).json(await storage.createChicken(parsed.data));
    } catch { res.status(500).json({ message: "Failed to add chicken" }); }
  });

  app.delete("/api/chickens/:id", async (req, res) => {
    try { await storage.deleteChicken(parseInt(req.params.id)); res.status(204).send(); }
    catch { res.status(500).json({ message: "Failed to remove chicken" }); }
  });

  // ─── Collectors ───

  app.get("/api/collectors", async (_req, res) => {
    try { res.json(await storage.getAllCollectors()); }
    catch { res.status(500).json({ message: "Failed to fetch collectors" }); }
  });

  app.post("/api/collectors", async (req, res) => {
    try {
      const parsed = insertCollectorSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
      res.status(201).json(await storage.createCollector(parsed.data));
    } catch { res.status(500).json({ message: "Failed to add collector" }); }
  });

  app.delete("/api/collectors/:id", async (req, res) => {
    try { await storage.deleteCollector(parseInt(req.params.id)); res.status(204).send(); }
    catch { res.status(500).json({ message: "Failed to remove collector" }); }
  });

  // ─── Settings ───

  app.get("/api/settings/location", async (_req, res) => {
    try {
      const saved = await storage.getSetting("location");
      if (!saved) { res.status(404).json(null); return; }
      res.json(JSON.parse(saved));
    } catch { res.status(500).json(null); }
  });

  app.post("/api/settings/location", async (req, res) => {
    try { await storage.setSetting("location", JSON.stringify(req.body)); res.json({ ok: true }); }
    catch { res.status(500).json({ message: "Failed to save" }); }
  });

  return httpServer;
}
