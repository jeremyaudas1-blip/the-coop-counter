import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "coop-counter-secret-change-in-production";

export interface AuthRequest extends Request {
  userId?: number;
  familyId?: number;
}

export function generateToken(userId: number, familyId: number): string {
  return jwt.sign({ userId, familyId }, JWT_SECRET, { expiresIn: "30d" });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Check Authorization header first, then cookie
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; familyId: number };
    req.userId = decoded.userId;
    req.familyId = decoded.familyId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Optional auth — doesn't block, just sets userId/familyId if token is valid
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; familyId: number };
      req.userId = decoded.userId;
      req.familyId = decoded.familyId;
    } catch {}
  }
  next();
}
