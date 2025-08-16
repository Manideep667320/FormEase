import { Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "../src/lib/storage.ts";
import { processUserInput, determineUserIntent, generateWelcomeMessage, extractPersonName } from "./nlp-processor.ts";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

// Define schemas
const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
  fullName: z.string().optional()
});

const insertFormDraftSchema = z.object({
  userId: z.string(),
  formTypeId: z.number(),
  formData: z.string(),
  name: z.string().min(1, "Draft name is required")
});

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRATION = "24h";

// Auth middleware and types
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
  headers: any;
  body: any;
  params: any;
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };

    // Validate session
    const session = await storage.getUserSessionByToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export async function registerRoutes(app: express.Application): Promise<Server> {
  // ===== Authentication Routes =====

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    // existing code unchanged
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    // existing code unchanged
  });

  // Logout
  app.post('/api/auth/logout', authenticateToken, async (req: AuthRequest, res) => {
    // existing code unchanged
  });

  // Get current user profile
  app.get('/api/user/profile', authenticateToken, async (req: AuthRequest, res) => {
    // existing code unchanged
  });

  // API route to get welcome message for a form code
  app.get('/api/welcome-message/:formCode', async (req, res) => {
    try {
      const { formCode } = req.params;
      if (!formCode) {
        return res.status(400).json({ error: "Form code is required" });
      }

      // Example: generate a welcome message based on formCode
      // You can replace this with your actual logic or call to NLP processor
      const welcomeMessage = `Welcome to the ${formCode.toUpperCase()} form!`;

      res.json({ message: welcomeMessage });
    } catch (error) {
      console.error("Error fetching welcome message:", error);
      res.status(500).json({ error: "Failed to fetch welcome message" });
    }
  });

  // New route to save form draft
  app.post('/api/drafts', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Validate request body
      const { formTypeId, name, data } = req.body;

      // Validate formTypeId is number
      const formTypeIdNum = Number(formTypeId);
      if (isNaN(formTypeIdNum)) {
        return res.status(400).json({ error: "Invalid formTypeId" });
      }

      // Validate formData and name presence
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Draft name is required" });
      }
      if (!data) {
        return res.status(400).json({ error: "Form data is required" });
      }

      // Save draft using storage
      const draft = await storage.createFormDraft({
        userId: req.user.id,
        formTypeId: formTypeIdNum.toString(),
        data: data,
      });

      res.status(201).json({ message: "Draft saved successfully", draft });
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  // GET user's drafts (requires auth)
  app.get('/api/drafts', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const drafts = await storage.getUserFormDrafts(req.user.id);
      return res.json(drafts);
    } catch (err) {
      console.error('Error fetching user drafts:', err);
      return res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  });

  // GET single draft by id (requires auth)
  app.get('/api/drafts/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const draft = await storage.getFormDraft(id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      return res.json(draft);
    } catch (err) {
      console.error('Error fetching draft by id:', err);
      return res.status(500).json({ error: 'Failed to fetch draft' });
    }
  });

  // DELETE draft by id (requires auth)
  app.delete('/api/drafts/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const draft = await storage.getFormDraft(id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await storage.deleteFormDraft(id);
      return res.json({ message: 'Draft deleted' });
    } catch (err) {
      console.error('Error deleting draft:', err);
      return res.status(500).json({ error: 'Failed to delete draft' });
    }
  });

  // GET form types (public)
  app.get('/api/form-types', async (req, res) => {
    try {
      const types = await storage.getFormTypes();
      return res.json(types);
    } catch (err) {
      console.error('Error fetching form types:', err);
      return res.status(500).json({ error: 'Failed to fetch form types' });
    }
  });

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}
