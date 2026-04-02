import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEggEntrySchema, insertChickenSchema, insertCollectorSchema, signupSchema, loginSchema, inviteSchema } from "@shared/schema";
import { authMiddleware, generateToken, type AuthRequest } from "./auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cookieParser from "cookie-parser";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(cookieParser());

  // ─── Auth Routes (public) ───

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" }); return; }

      const { name, email, password, familyName, marketingConsent } = parsed.data;
      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) { res.status(409).json({ message: "An account with this email already exists" }); return; }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser(name, email.toLowerCase(), passwordHash, marketingConsent || false);

      // Create family and add user as owner
      const family = await storage.createFamily(familyName, user.id);
      await storage.addFamilyMember(family.id, user.id, "owner");

      // Auto-accept any pending invites for this email
      const pendingInvites = await storage.getPendingInvitesForEmail(email);
      for (const invite of pendingInvites) {
        await storage.addFamilyMember(invite.familyId, user.id, "member");
        await storage.acceptInvite(invite.id);
      }

      const token = generateToken(user.id, family.id);
      res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax" });
      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email }, family: { id: family.id, name: family.name } });
    } catch (e: any) {
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

      const user = await storage.getUserByEmail(parsed.data.email.toLowerCase());
      if (!user) { res.status(401).json({ message: "Invalid email or password" }); return; }

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) { res.status(401).json({ message: "Invalid email or password" }); return; }

      // Get user's families
      const userFamilies = await storage.getUserFamilies(user.id);
      const primaryFamily = userFamilies[0];
      if (!primaryFamily) { res.status(500).json({ message: "No family found for user" }); return; }

      const token = generateToken(user.id, primaryFamily.family.id);
      res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax" });
      res.json({
        token, user: { id: user.id, name: user.name, email: user.email },
        family: { id: primaryFamily.family.id, name: primaryFamily.family.name },
        families: userFamilies.map(f => ({ id: f.family.id, name: f.family.name, role: f.role })),
      });
    } catch {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ ok: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.userId!);
      if (!user) { res.status(404).json({ message: "User not found" }); return; }
      const userFamilies = await storage.getUserFamilies(user.id);
      const currentFamily = await storage.getFamilyById(req.familyId!);
      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        family: currentFamily ? { id: currentFamily.id, name: currentFamily.name } : null,
        families: userFamilies.map(f => ({ id: f.family.id, name: f.family.name, role: f.role })),
      });
    } catch {
      res.status(500).json({ message: "Failed" });
    }
  });

  // Switch active family
  app.post("/api/auth/switch-family", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { familyId } = req.body;
      const userFamilies = await storage.getUserFamilies(req.userId!);
      const match = userFamilies.find(f => f.family.id === familyId);
      if (!match) { res.status(403).json({ message: "Not a member of that family" }); return; }
      const token = generateToken(req.userId!, familyId);
      res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "lax" });
      res.json({ token, family: { id: match.family.id, name: match.family.name } });
    } catch {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ─── Family Management (auth required) ───

  app.get("/api/family/members", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getFamilyMembers(req.familyId!);
      res.json(members);
    } catch {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.post("/api/family/invite", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = inviteSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ message: "Invalid email" }); return; }

      const token = crypto.randomBytes(20).toString("hex");
      const invite = await storage.createInvite(req.familyId!, parsed.data.email, token);

      // If the user already has an account, auto-add them
      const existingUser = await storage.getUserByEmail(parsed.data.email.toLowerCase());
      if (existingUser) {
        await storage.addFamilyMember(req.familyId!, existingUser.id, "member");
        await storage.acceptInvite(invite.id);
        res.json({ invite, autoAdded: true, message: `${existingUser.name} has been added to your family!` });
        return;
      }

      res.json({ invite, autoAdded: false, message: `Invite created for ${parsed.data.email}. They'll join when they sign up!` });
    } catch {
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.get("/api/family/invites", authMiddleware, async (req: AuthRequest, res) => {
    try {
      res.json(await storage.getPendingInvites(req.familyId!));
    } catch {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ─── Data Routes (all auth-required, family-scoped) ───

  app.get("/api/entries", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      res.json(await storage.getEntriesByYear(req.familyId!, year));
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/entries", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = insertEggEntrySchema.safeParse({ ...req.body, familyId: req.familyId });
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
      const existing = await storage.getEntryByDate(req.familyId!, parsed.data.date);
      if (existing) { const updated = await storage.updateEntry(existing.id, parsed.data); res.json(updated); return; }
      res.status(201).json(await storage.createEntry(parsed.data));
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/entries/:id", authMiddleware, async (req: AuthRequest, res) => {
    try { await storage.deleteEntry(parseInt(req.params.id)); res.status(204).send(); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/chickens", authMiddleware, async (req: AuthRequest, res) => {
    try { res.json(await storage.getChickens(req.familyId!)); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/chickens", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = insertChickenSchema.safeParse({ ...req.body, familyId: req.familyId });
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
      res.status(201).json(await storage.createChicken(parsed.data));
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/chickens/:id", authMiddleware, async (req: AuthRequest, res) => {
    try { await storage.deleteChicken(parseInt(req.params.id)); res.status(204).send(); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/collectors", authMiddleware, async (req: AuthRequest, res) => {
    try { res.json(await storage.getCollectors(req.familyId!)); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/collectors", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = insertCollectorSchema.safeParse({ ...req.body, familyId: req.familyId });
      if (!parsed.success) { res.status(400).json({ message: parsed.error.message }); return; }
      res.status(201).json(await storage.createCollector(parsed.data));
    } catch { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/collectors/:id", authMiddleware, async (req: AuthRequest, res) => {
    try { await storage.deleteCollector(parseInt(req.params.id)); res.status(204).send(); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/settings/location", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const saved = await storage.getSetting(`location_${req.familyId}`);
      if (!saved) { res.status(404).json(null); return; }
      res.json(JSON.parse(saved));
    } catch { res.status(500).json(null); }
  });

  app.post("/api/settings/location", authMiddleware, async (req: AuthRequest, res) => {
    try { await storage.setSetting(`location_${req.familyId}`, JSON.stringify(req.body)); res.json({ ok: true }); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  return httpServer;
}
