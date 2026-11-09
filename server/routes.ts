import './env.ts';
import type { Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "../src/lib/storage.ts";
import { neonStorage } from "./neon-storage.ts";
import { objectStorage } from "./object-storage.ts";
import { gnaniService, GNANI_SUPPORTED_LANGUAGES } from "./gnani-service.ts";
import { processUserInput, determineUserIntent, generateWelcomeMessage, extractPersonName } from "./nlp-processor.ts";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Dynamically select storage provider: Neon Database if configured, otherwise Firebase
const getStorage = () => {
  const cfg = neonStorage.getConfig();
  return cfg.isConfigured ? neonStorage : storage;
};

// Define schemas
const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email format"),
  fullName: z.string().optional()
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
}

const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // 1. Try verifying as custom JWT signed with our backend JWT_SECRET
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
      req.user = decoded;
      return next();
    } catch (_) {
      // 2. If not custom JWT, check if it's a Firebase ID token (which is also a JWT)
      const decoded: any = jwt.decode(token);
      if (decoded && (decoded.user_id || decoded.sub || decoded.uid)) {
        req.user = {
          id: decoded.user_id || decoded.sub || decoded.uid,
          username: decoded.email || decoded.name || decoded.user_id || decoded.sub || decoded.uid
        };
        return next();
      }

      // 3. Fallback: if token is a direct user ID string (e.g. from Firebase user.uid)
      if (typeof token === 'string' && token.length > 5) {
        req.user = {
          id: token,
          username: token
        };
        return next();
      }

      return res.status(403).json({ error: "Invalid token" });
    }
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export async function registerRoutes(app: express.Application): Promise<Server> {
  // ===== Authentication Routes =====

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
      });

      const { username, email, password, fullName } = registerSchema.parse(req.body);

      // Check existing username/email
      const existingUsername = await getStorage().getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      const existingEmail = await getStorage().getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await getStorage().createUser({
        username,
        email,
        password: hashedPassword,
        fullName
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      // Create user session
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      await getStorage().createUserSession({
        userId: user.id,
        token,
        expiresAt
      });

      // Update last login time
      await getStorage().updateUser(user.id, { lastLogin: now });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid user data', details: error.errors });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
      }
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });

      const { username, password } = loginSchema.parse(req.body);

      const user = await getStorage().getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password || "");
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await getStorage().createUserSession({
        userId: user.id,
        token,
        expiresAt
      });

      await getStorage().updateUser(user.id, { lastLogin: now });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid login data', details: error.errors });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
      }
    }
  });

  // Logout
  app.post('/api/auth/logout', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        await getStorage().deleteUserSession(token);
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  // Get current user profile
  app.get('/api/user/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await getStorage().getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // ===== Database Status (Neon PostgreSQL vs Firebase) =====
  app.get('/api/database/status', async (_req, res) => {
    const neonConfig = neonStorage.getConfig();
    res.json({
      activeProvider: neonConfig.isConfigured ? "Neon Database (Serverless Postgres)" : "Firebase Firestore",
      neon: neonConfig
    });
  });

  // ===== Object Storage Routes (formease-storage) =====

  // Upload file to formease-storage bucket
  app.post('/api/storage/upload', async (req, res) => {
    try {
      const { filename, content, contentType } = req.body;
      if (!filename || !content) {
        return res.status(400).json({ error: "Filename and file content (base64) are required" });
      }

      const result = await objectStorage.upload(filename, content, contentType || "application/octet-stream");
      res.status(201).json({
        message: `File stored in bucket '${result.bucket}'`,
        file: result
      });
    } catch (error: any) {
      console.error("Storage upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload file to storage" });
    }
  });

  // Download / retrieve file from formease-storage bucket
  app.get('/api/storage/files/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const fileData = objectStorage.getFile(key);
      if (!fileData) {
        return res.status(404).json({ error: "File not found in storage bucket" });
      }

      res.setHeader('Content-Type', fileData.contentType);
      res.setHeader('Content-Length', fileData.buffer.length);
      res.send(fileData.buffer);
    } catch (error: any) {
      console.error("Storage get file error:", error);
      res.status(500).json({ error: "Failed to retrieve file" });
    }
  });

  // List files in formease-storage bucket
  app.get('/api/storage/files', async (_req, res) => {
    try {
      const files = objectStorage.listFiles();
      res.json({
        bucket: process.env.OBJECT_STORAGE_BUCKET || "formease-storage",
        files
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to list storage files" });
    }
  });

  // Object storage status
  app.get('/api/storage/status', async (_req, res) => {
    res.json(objectStorage.getStatus());
  });

  // ===== Gnani Speech API Routes (TTS & STT - 5000 Credits) =====

  // Gnani Text-to-Speech
  app.post('/api/gnani/tts', async (req, res) => {
    try {
      const { text, voice, language, speed } = req.body;
      const result = await gnaniService.textToSpeech({ text, voice, language, speed });
      res.json(result);
    } catch (error: any) {
      console.error("Gnani TTS route error:", error);
      res.status(500).json({
        success: false,
        fallbackToBrowser: true,
        message: error.message || "TTS service error"
      });
    }
  });

  // Gnani Speech-to-Text
  app.post('/api/gnani/stt', async (req, res) => {
    try {
      const { audio, language } = req.body;
      const result = await gnaniService.speechToText(audio, language);
      res.json(result);
    } catch (error: any) {
      console.error("Gnani STT route error:", error);
      res.status(500).json({
        success: false,
        fallbackToBrowser: true,
        message: error.message || "STT service error"
      });
    }
  });

  // Gnani Credit status (5000 initial balance)
  app.get('/api/gnani/credits', async (_req, res) => {
    res.json(gnaniService.getCreditStatus());
  });

  // Gnani Supported Languages
  app.get('/api/gnani/languages', async (_req, res) => {
    res.json(GNANI_SUPPORTED_LANGUAGES);
  });

  // ===== NLP & Voice Routes =====

  // API route to get welcome message for a form code
  app.get('/api/welcome-message/:formCode', async (req, res) => {
    try {
      const { formCode } = req.params;
      const lang = (req.query.lang as string) || 'en-IN';
      if (!formCode) {
        return res.status(400).json({ error: "Form code is required" });
      }

      const message = await generateWelcomeMessage(formCode, lang);
      res.json({ message });
    } catch (error) {
      console.error("Error generating welcome message:", error);
      res.status(500).json({ error: "Failed to generate welcome message" });
    }
  });

  // API route to extract person name
  app.post('/api/extract-name', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ extractedName: null, originalText: text || '', success: false, error: 'Text is required' });
      }

      const extractedName = extractPersonName(text);
      res.json({
        extractedName,
        originalText: text,
        success: !!extractedName
      });
    } catch (error) {
      console.error('Error extracting name:', error);
      res.status(500).json({ extractedName: null, originalText: req.body?.text || '', success: false, error: 'Failed to extract name' });
    }
  });

  // API route to process voice input
  app.post('/api/process-voice', async (req, res) => {
    try {
      const { text, formCode, formSections, context } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: "Text is required" });
      }

      const result = await processUserInput(
        text,
        formCode || 'default',
        formSections || [],
        context || {}
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error processing voice input:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to process voice input",
        error: { code: "PROCESSING_ERROR", message: error.message }
      });
    }
  });

  // API route to determine user intent
  app.post('/api/user-intent', async (req, res) => {
    try {
      const { text, formSections, context } = req.body;
      if (!text) {
        return res.status(400).json({ intent: "unknown" });
      }

      const intent = await determineUserIntent(
        text,
        formSections || [],
        context || {}
      );
      res.json(intent);
    } catch (error: any) {
      console.error("Error determining user intent:", error);
      res.status(500).json({ intent: "unknown" });
    }
  });

  // ===== Draft Routes =====

  // Save form draft
  app.post('/api/drafts', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { formTypeId, name, data, id, draftId } = req.body;

      if (!formTypeId) {
        return res.status(400).json({ error: "Form type is required" });
      }
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Draft name is required" });
      }
      if (!data) {
        return res.status(400).json({ error: "Form data is required" });
      }

      const targetId = id || draftId;

      // Save draft using storage (Neon or Firebase)
      const draft = await getStorage().createFormDraft({
        ...(targetId ? { id: targetId } : {}),
        userId: req.user.id,
        formTypeId: String(formTypeId),
        name: name.trim(),
        data: data,
      } as any);

      res.status(201).json({ message: "Draft saved successfully", draft });
    } catch (error: any) {
      console.error("Error saving draft:", error);
      res.status(500).json({ error: error?.message || "Failed to save draft" });
    }
  });

  // Update existing form draft
  app.put('/api/drafts/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      const { formTypeId, name, data } = req.body;

      const draft = await getStorage().createFormDraft({
        id,
        userId: req.user.id,
        formTypeId: String(formTypeId || 'passport'),
        name: (name || 'Draft').trim(),
        data: data || {},
      } as any);

      res.json({ message: "Draft updated successfully", draft });
    } catch (error: any) {
      console.error("Error updating draft:", error);
      res.status(500).json({ error: error?.message || "Failed to update draft" });
    }
  });

  // GET user's drafts (requires auth)
  app.get('/api/drafts', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const drafts = await getStorage().getUserFormDrafts(req.user.id);
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
      const draft = await getStorage().getFormDraft(id);
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
      const draft = await getStorage().getFormDraft(id);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
      if (draft.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
      await getStorage().deleteFormDraft(id);
      return res.json({ message: 'Draft deleted' });
    } catch (err) {
      console.error('Error deleting draft:', err);
      return res.status(500).json({ error: 'Failed to delete draft' });
    }
  });

  // GET form types (public)
  app.get('/api/form-types', async (_req, res) => {
    try {
      const types = await getStorage().getFormTypes();
      if (!types || types.length === 0) {
        return res.json([
          { id: 1, code: 'passport', name: 'Passport Application' },
          { id: 2, code: 'aadhaar', name: 'Aadhaar Card' },
          { id: 3, code: 'voterid', name: 'Voter ID' },
        ]);
      }
      return res.json(types);
    } catch (err) {
      console.error('Error fetching form types:', err);
      return res.json([
        { id: 1, code: 'passport', name: 'Passport Application' },
        { id: 2, code: 'aadhaar', name: 'Aadhaar Card' },
        { id: 3, code: 'voterid', name: 'Voter ID' },
      ]);
    }
  });

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}
