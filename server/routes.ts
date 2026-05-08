import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTherapyResponse, generateSessionSummary, type TherapyContext } from "./openai";
import { isElevenLabsConfigured, synthesizeSpeech } from "./elevenlabs";
import { 
  detectRisk, 
  generateAnalyticsData, 
  generateSessionSummary as generateAISummary,
  type AnalyticsData 
} from "./analytics";
import { generateMoodReportPDF } from "./pdf-generator";
import { insertMessageSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
type SessionOwnershipResult =
  | { session: Awaited<ReturnType<typeof storage.getSession>> extends infer T ? Exclude<T, undefined> : never }
  | { error: string; status: number };

export function registerRoutes(app: Express): Server {
  // Passport configuration
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const ensureSessionOwner = async (sessionId: string, userId: string): Promise<SessionOwnershipResult> => {
    const session = await storage.getSession(sessionId);
    if (!session) {
      return { error: "Session not found", status: 404 as const };
    }
    if (session.userId !== userId) {
      return { error: "Unauthorized", status: 403 as const };
    }
    return { session };
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, fullName } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        fullName,
      });
      
      // Create default preferences
      await storage.createUserPreferences({ userId: user.id });
      
      // Generate JWT
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      
      res.json({ user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ error: info.message });
      }
      
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Generate JWT
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      
      res.json({ user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName }, token });
    })(req, res, next);
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById((req as any).user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        fullName: user.fullName,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  app.post("/api/sessions/start", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { title } = req.body;
      const session = await storage.createSession(userId, title);
      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });
  // Journal routes
  app.get("/api/journal", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const entries = await storage.getUserJournalEntries(userId);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get journal entries" });
    }
  });

  app.post("/api/journal", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { title, content, mood, tags } = req.body;
      
      const entry = await storage.createJournalEntry({
        userId,
        title,
        content,
        mood,
        tags: JSON.stringify(tags || []),
      });
      
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to create journal entry" });
    }
  });

  app.put("/api/journal/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, mood, tags } = req.body;
      
      const entry = await storage.updateJournalEntry(id, {
        title,
        content,
        mood,
        tags: JSON.stringify(tags || []),
      });
      
      if (!entry) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to update journal entry" });
    }
  });

  app.delete("/api/journal/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteJournalEntry(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Journal entry not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete journal entry" });
    }
  });

  // Coping strategies routes
  app.get("/api/coping-strategies", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const strategies = await storage.getUserCopingStrategies(userId);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to get coping strategies" });
    }
  });

  app.get("/api/coping-strategies/public", async (req, res) => {
    try {
      const strategies = await storage.getPublicCopingStrategies();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to get public coping strategies" });
    }
  });

  app.post("/api/coping-strategies", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { title, description, category, isPublic } = req.body;
      
      const strategy = await storage.createCopingStrategy({
        userId,
        title,
        description,
        category,
        isPublic,
      });
      
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create coping strategy" });
    }
  });

  // User preferences routes
  app.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user preferences" });
    }
  });

  app.put("/api/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;
      
      const preferences = await storage.updateUserPreferences(userId, updates);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });
  app.post("/api/sessions/end", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const duration = Math.max(0, Math.floor((Date.now() - sessionResult.session.startedAt.getTime()) / 1000));
      console.log(`Ending session ${sessionId} with duration ${duration}s`);
      const updatedSession = await storage.endSession(sessionId, duration);
      
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ error: "Failed to end session" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId, content, emotion, emotionConfidence, language } = req.body;
      
      // Validate required fields
      if (!sessionId || !content) {
        return res.status(400).json({ error: "Missing required fields: sessionId and content" });
      }
      
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const userMessage = await storage.createMessage({
        sessionId,
        role: "user",
        content,
        emotion: emotion || null,
        emotionConfidence: emotionConfidence || null,
      });

      const conversationHistory = await storage.getSessionMessages(sessionId);
      const preferences = await storage.getUserPreferences(userId);
      const context: TherapyContext = {
        emotion: emotion || undefined,
        emotionConfidence: emotionConfidence || undefined,
        language: (language as "en" | "hi" | "mr" | undefined) || (preferences?.language as "en" | "hi" | "mr" | undefined) || "en",
        conversationHistory: conversationHistory
          .filter(msg => msg.id !== userMessage.id)
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
          .slice(-10),
      };

      const therapyResponse = await generateTherapyResponse(sessionId, content, context);

      const assistantMessage = await storage.createMessage({
        sessionId,
        role: "assistant",
        content: therapyResponse,
        emotion: null,
        emotionConfidence: null,
      });

      res.json({ 
        response: therapyResponse,
        messageId: assistantMessage.id,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Streaming endpoint for real-time chat responses (ChatGPT-like)
  app.post("/api/messages/stream", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId, content, emotion, emotionConfidence, language } = req.body;
      
      // Validate required fields
      if (!sessionId || !content) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write('data: {"type":"error","error":"Missing required fields: sessionId and content"}\n\n');
        res.end();
        return;
      }
      
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ type: "error", error: sessionResult.error })}\n\n`);
        res.end();
        return;
      }

      const userMessage = await storage.createMessage({
        sessionId,
        role: "user",
        content,
        emotion: emotion || null,
        emotionConfidence: emotionConfidence || null,
      });

      const conversationHistory = await storage.getSessionMessages(sessionId);
      const preferences = await storage.getUserPreferences(userId);
      const context: TherapyContext = {
        emotion: emotion || undefined,
        emotionConfidence: emotionConfidence || undefined,
        language: (language as "en" | "hi" | "mr" | undefined) || (preferences?.language as "en" | "hi" | "mr" | undefined) || "en",
        conversationHistory: conversationHistory
          .filter(msg => msg.id !== userMessage.id)
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
          .slice(-10),
      };

      // Set up SSE response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send a stream data event (for browser compatibility)
      res.write('data: {"type":"start"}\n\n');

      try {
        const therapyResponse = await generateTherapyResponse(sessionId, content, context);
        
        // Split response into chunks and stream them
        const chunkSize = 10;
        for (let i = 0; i < therapyResponse.length; i += chunkSize) {
          const chunk = therapyResponse.slice(i, i + chunkSize);
          const data = JSON.stringify({ type: 'chunk', content: chunk });
          res.write(`data: ${data}\n\n`);
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Save the complete message
        const assistantMessage = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: therapyResponse,
          emotion: null,
          emotionConfidence: null,
        });

        // Send completion event
        const completeData = JSON.stringify({ 
          type: 'complete', 
          messageId: assistantMessage.id,
          content: therapyResponse 
        });
        res.write(`data: ${completeData}\n\n`);
      } catch (error) {
        console.error("Error generating therapy response:", error);
        const errorData = JSON.stringify({ 
          type: 'error', 
          error: 'Failed to generate response' 
        });
        res.write(`data: ${errorData}\n\n`);
      }

      res.end();
    } catch (error) {
      console.error("Error setting up message stream:", error);
      res.status(500).json({ error: "Failed to stream message" });
    }
  });

  app.post("/api/voice/synthesize", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      if (!isElevenLabsConfigured()) {
        return res.status(503).json({ error: "ElevenLabs is not configured" });
      }

      const audioBuffer = await synthesizeSpeech(text);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error synthesizing ElevenLabs speech:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  app.post("/api/emotions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId, emotion, confidence } = req.body;
      
      if (!sessionId || !emotion || confidence === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const record = await storage.createEmotionRecord({
        sessionId,
        emotion,
        confidence: confidence.toString(),
      });

      res.json({ success: true, record });
    } catch (error) {
      console.error("Error recording emotion:", error);
      res.status(500).json({ error: "Failed to record emotion" });
    }
  });

  app.get("/api/sessions/:sessionId/emotions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const emotions = await storage.getSessionEmotions(sessionId);
      res.json({ emotions });
    } catch (error) {
      console.error("Error fetching emotions:", error);
      res.status(500).json({ error: "Failed to fetch emotions" });
    }
  });

  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const sessions = await storage.getAllSessions(userId);
      res.json({ sessions });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:sessionId", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const messages = await storage.getSessionMessages(sessionId);
      const emotions = await storage.getSessionEmotions(sessionId);

      res.json({ session: sessionResult.session, messages, emotions });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.get("/api/emotions/all", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const emotions = await storage.getAllEmotionRecords(userId);
      res.json({ emotions });
    } catch (error) {
      console.error("Error fetching all emotions:", error);
      res.status(500).json({ error: "Failed to fetch emotions" });
    }
  });

  app.get("/api/sessions/:sessionId/summary", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const messages = await storage.getSessionMessages(sessionId);
      const emotions = await storage.getSessionEmotions(sessionId);

      if (messages.length < 2) {
        return res.status(400).json({ error: "Session has insufficient data for summary" });
      }

      const summary = await generateSessionSummary(
        messages.map(m => ({ role: m.role, content: m.content })),
        emotions.map(e => ({ emotion: e.emotion, timestamp: e.timestamp }))
      );

      res.json({ summary });
    } catch (error) {
      console.error("Error generating session summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // NEW ENDPOINTS FOR ANALYTICS & AI

  // Risk Detection Endpoint
  app.post("/api/check-risk", requireAuth, async (req: any, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const riskAnalysis = detectRisk(text);
      res.json(riskAnalysis);
    } catch (error) {
      console.error("Error analyzing risk:", error);
      res.status(500).json({ error: "Failed to analyze risk" });
    }
  });

  // Analytics Endpoint
  app.get("/api/analytics/:sessionId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const messages = await storage.getSessionMessages(sessionId);
      const emotions = await storage.getSessionEmotions(sessionId);

      if (messages.length === 0 && emotions.length === 0) {
        return res.status(400).json({ error: "No data in session" });
      }

      const analyticsData = generateAnalyticsData(emotions, messages);
      res.json(analyticsData);
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  // PDF Report Endpoint
  app.get("/api/report/pdf/:sessionId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const messages = await storage.getSessionMessages(sessionId);
      const emotions = await storage.getSessionEmotions(sessionId);

      if (messages.length === 0 && emotions.length === 0) {
        return res.status(400).json({ error: "No data in session" });
      }

      const analyticsData = generateAnalyticsData(emotions, messages);
      const pdfBuffer = generateMoodReportPDF(analyticsData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="mood-report-${sessionId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Enhanced Session Summary (AI-powered)
  app.get("/api/session-summary/:sessionId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      const sessionResult = await ensureSessionOwner(sessionId, userId);
      if ("error" in sessionResult) {
        return res.status(sessionResult.status).json({ error: sessionResult.error });
      }

      const messages = await storage.getSessionMessages(sessionId);
      const emotions = await storage.getSessionEmotions(sessionId);

      if (messages.length === 0) {
        return res.status(400).json({ error: "No messages in session" });
      }

      const summary = generateAISummary(messages, emotions);
      res.json({ summary });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
