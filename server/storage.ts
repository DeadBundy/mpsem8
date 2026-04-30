import { 
  type TherapySession, 
  type InsertTherapySession,
  type Message,
  type InsertMessage,
  type EmotionRecord,
  type InsertEmotionRecord,
  type User,
  type InsertUser,
  type JournalEntry,
  type InsertJournalEntry,
  type CopingStrategy,
  type InsertCopingStrategy,
  type UserPreferences,
  type InsertUserPreferences,
  users,
  therapySessions,
  messages,
  emotionRecords,
  journalEntries,
  copingStrategies,
  userPreferences
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // Session methods
  createSession(userId?: string, title?: string): Promise<TherapySession>;
  getSession(id: string): Promise<TherapySession | undefined>;
  endSession(id: string, duration: number): Promise<TherapySession | undefined>;
  getAllSessions(userId?: string): Promise<TherapySession[]>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getSessionMessages(sessionId: string): Promise<Message[]>;
  
  // Emotion methods
  createEmotionRecord(record: InsertEmotionRecord): Promise<EmotionRecord>;
  getSessionEmotions(sessionId: string): Promise<EmotionRecord[]>;
  getAllEmotionRecords(userId?: string): Promise<EmotionRecord[]>;
  
  // Journal methods
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getUserJournalEntries(userId: string): Promise<JournalEntry[]>;
  updateJournalEntry(id: string, updates: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  deleteJournalEntry(id: string): Promise<boolean>;
  
  // Coping strategies
  createCopingStrategy(strategy: InsertCopingStrategy): Promise<CopingStrategy>;
  getUserCopingStrategies(userId: string): Promise<CopingStrategy[]>;
  getPublicCopingStrategies(): Promise<CopingStrategy[]>;
  
  // User preferences
  createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: string, updates: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;
}

// In-memory storage for testing without database setup
class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private sessions: TherapySession[] = [];
  private messages: Message[] = [];
  private emotions: EmotionRecord[] = [];
  private journalEntries: JournalEntry[] = [];
  private copingStrategies: CopingStrategy[] = [];
  private userPreferences: UserPreferences[] = [];
  
  private userCounter = 0;
  private sessionCounter = 0;
  private messageCounter = 0;
  private emotionCounter = 0;
  private journalCounter = 0;
  private copingCounter = 0;
  private prefsCounter = 0;

  // User methods
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: `user_${++this.userCounter}`,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName || null,
      createdAt: new Date(),
      lastLoginAt: null,
      isActive: true,
    };
    this.users.push(newUser);
    return newUser;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  // Session methods
  async createSession(userId?: string, title?: string): Promise<TherapySession> {
    const session: TherapySession = {
      id: `session_${++this.sessionCounter}`,
      userId: userId || null,
      startedAt: new Date(),
      endedAt: null,
      duration: null,
      title: title || null,
    };
    this.sessions.push(session);
    return session;
  }

  async getSession(id: string): Promise<TherapySession | undefined> {
    return this.sessions.find(s => s.id === id);
  }

  async endSession(id: string, duration: number): Promise<TherapySession | undefined> {
    const session = this.sessions.find(s => s.id === id);
    if (session) {
      session.endedAt = new Date();
      session.duration = duration;
    }
    return session;
  }

  async getAllSessions(userId?: string): Promise<TherapySession[]> {
    if (userId) {
      return this.sessions.filter(s => s.userId === userId);
    }
    return [...this.sessions];
  }

  // Message methods
  async createMessage(message: InsertMessage): Promise<Message> {
    const msg: Message = {
      id: `msg_${++this.messageCounter}`,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      emotion: message.emotion || null,
      emotionConfidence: message.emotionConfidence || null,
      timestamp: new Date(),
    };
    this.messages.push(msg);
    return msg;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return this.messages.filter(m => m.sessionId === sessionId);
  }

  // Emotion methods
  async createEmotionRecord(record: InsertEmotionRecord): Promise<EmotionRecord> {
    const emotion: EmotionRecord = {
      id: `emotion_${++this.emotionCounter}`,
      sessionId: record.sessionId,
      emotion: record.emotion,
      confidence: record.confidence,
      timestamp: new Date(),
    };
    this.emotions.push(emotion);
    return emotion;
  }

  async getSessionEmotions(sessionId: string): Promise<EmotionRecord[]> {
    return this.emotions.filter(e => e.sessionId === sessionId);
  }

  async getAllEmotionRecords(userId?: string): Promise<EmotionRecord[]> {
    if (userId) {
      const userSessions = this.sessions.filter(s => s.userId === userId).map(s => s.id);
      return this.emotions.filter(e => userSessions.includes(e.sessionId));
    }
    return [...this.emotions];
  }

  // Journal methods
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const journalEntry: JournalEntry = {
      id: `journal_${++this.journalCounter}`,
      userId: entry.userId,
      title: entry.title,
      content: entry.content,
      mood: entry.mood || null,
      tags: entry.tags || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.journalEntries.push(journalEntry);
    return journalEntry;
  }

  async getUserJournalEntries(userId: string): Promise<JournalEntry[]> {
    return this.journalEntries.filter(j => j.userId === userId);
  }

  async updateJournalEntry(id: string, updates: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.find(j => j.id === id);
    if (entry) {
      Object.assign(entry, updates, { updatedAt: new Date() });
    }
    return entry;
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    const index = this.journalEntries.findIndex(j => j.id === id);
    if (index !== -1) {
      this.journalEntries.splice(index, 1);
      return true;
    }
    return false;
  }

  // Coping strategies
  async createCopingStrategy(strategy: InsertCopingStrategy): Promise<CopingStrategy> {
    const copingStrategy: CopingStrategy = {
      id: `coping_${++this.copingCounter}`,
      userId: strategy.userId || null,
      title: strategy.title,
      description: strategy.description,
      category: strategy.category,
      isPublic: strategy.isPublic || false,
      createdAt: new Date(),
    };
    this.copingStrategies.push(copingStrategy);
    return copingStrategy;
  }

  async getUserCopingStrategies(userId: string): Promise<CopingStrategy[]> {
    return this.copingStrategies.filter(c => c.userId === userId);
  }

  async getPublicCopingStrategies(): Promise<CopingStrategy[]> {
    return this.copingStrategies.filter(c => c.isPublic);
  }

  // User preferences
  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const userPrefs: UserPreferences = {
      id: `prefs_${++this.prefsCounter}`,
      userId: prefs.userId,
      theme: prefs.theme || "light",
      language: prefs.language || "en",
      notificationsEnabled: prefs.notificationsEnabled ?? true,
      privacyLevel: prefs.privacyLevel || "private",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userPreferences.push(userPrefs);
    return userPrefs;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    return this.userPreferences.find(p => p.userId === userId);
  }

  async updateUserPreferences(userId: string, updates: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const prefs = this.userPreferences.find(p => p.userId === userId);
    if (prefs) {
      Object.assign(prefs, updates, { updatedAt: new Date() });
    }
    return prefs;
  }
}

export class DatabaseStorage implements IStorage {
  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async createSession(userId?: string, title?: string): Promise<TherapySession> {
    const [session] = await db
      .insert(therapySessions)
      .values({ userId: userId || null, title: title || null })
      .returning();
    return session;
  }

  async getSession(id: string): Promise<TherapySession | undefined> {
    const [session] = await db.select().from(therapySessions).where(eq(therapySessions.id, id));
    return session || undefined;
  }

  async endSession(id: string, duration: number): Promise<TherapySession | undefined> {
    const [session] = await db
      .update(therapySessions)
      .set({ endedAt: new Date(), duration })
      .where(eq(therapySessions.id, id))
      .returning();
    return session || undefined;
  }

  async getAllSessions(userId?: string): Promise<TherapySession[]> {
    const base = db.select().from(therapySessions);
    const rows = userId
      ? await base.where(eq(therapySessions.userId, userId)).orderBy(desc(therapySessions.startedAt))
      : await base.orderBy(desc(therapySessions.startedAt));
    return rows;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.timestamp);
  }

  async createEmotionRecord(insertRecord: InsertEmotionRecord): Promise<EmotionRecord> {
    const [record] = await db.insert(emotionRecords).values(insertRecord).returning();
    return record;
  }

  async getSessionEmotions(sessionId: string): Promise<EmotionRecord[]> {
    return await db
      .select()
      .from(emotionRecords)
      .where(eq(emotionRecords.sessionId, sessionId))
      .orderBy(emotionRecords.timestamp);
  }

  async getAllEmotionRecords(userId?: string): Promise<EmotionRecord[]> {
    if (!userId) {
      return await db.select().from(emotionRecords).orderBy(desc(emotionRecords.timestamp));
    }

    return await db
      .select({
        id: emotionRecords.id,
        sessionId: emotionRecords.sessionId,
        emotion: emotionRecords.emotion,
        confidence: emotionRecords.confidence,
        timestamp: emotionRecords.timestamp,
      })
      .from(emotionRecords)
      .innerJoin(therapySessions, eq(emotionRecords.sessionId, therapySessions.id))
      .where(eq(therapySessions.userId, userId))
      .orderBy(desc(emotionRecords.timestamp));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [journalEntry] = await db.insert(journalEntries).values(entry).returning();
    return journalEntry;
  }

  async getUserJournalEntries(userId: string): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.updatedAt));
  }

  async updateJournalEntry(id: string, updates: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [entry] = await db
      .update(journalEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(journalEntries.id, id))
      .returning();
    return entry || undefined;
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    const deleted = await db.delete(journalEntries).where(eq(journalEntries.id, id)).returning();
    return deleted.length > 0;
  }

  async createCopingStrategy(strategy: InsertCopingStrategy): Promise<CopingStrategy> {
    const [copingStrategy] = await db.insert(copingStrategies).values(strategy).returning();
    return copingStrategy;
  }

  async getUserCopingStrategies(userId: string): Promise<CopingStrategy[]> {
    return await db
      .select()
      .from(copingStrategies)
      .where(eq(copingStrategies.userId, userId))
      .orderBy(desc(copingStrategies.createdAt));
  }

  async getPublicCopingStrategies(): Promise<CopingStrategy[]> {
    return await db
      .select()
      .from(copingStrategies)
      .where(eq(copingStrategies.isPublic, true))
      .orderBy(desc(copingStrategies.createdAt));
  }

  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [createdPrefs] = await db.insert(userPreferences).values(prefs).returning();
    return createdPrefs;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }

  async updateUserPreferences(userId: string, updates: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .update(userPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return prefs || undefined;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new InMemoryStorage();
