import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEggEntrySchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get all entries (optionally filtered by year)
  app.get("/api/entries", async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      if (year) {
        const entries = await storage.getEntriesByYear(year);
        res.json(entries);
      } else {
        const entries = await storage.getAllEntries();
        res.json(entries);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Create a new entry
  app.post("/api/entries", async (req, res) => {
    try {
      const parsed = insertEggEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: parsed.error.message });
        return;
      }

      // Check if entry already exists for this date
      const existing = await storage.getEntryByDate(parsed.data.date);
      if (existing) {
        // Update existing entry
        const updated = await storage.updateEntry(existing.id, parsed.data);
        res.json(updated);
        return;
      }

      const entry = await storage.createEntry(parsed.data);
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  // Update an entry
  app.patch("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateEntry(id, req.body);
      if (!updated) {
        res.status(404).json({ message: "Entry not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  // Delete an entry
  app.delete("/api/entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEntry(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  return httpServer;
}
