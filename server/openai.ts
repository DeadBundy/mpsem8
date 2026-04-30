import OpenAI from "openai";

const isGroqConfigured = Boolean(process.env.GROQ_API_KEY);
const provider = isGroqConfigured ? "Groq" : "OpenAI-compatible";
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "mock-key";
const baseURL = isGroqConfigured
  ? "https://api.groq.com/openai/v1"
  : process.env.OPENAI_BASE_URL;
const model = process.env.AI_MODEL || (isGroqConfigured ? "llama-3.3-70b-versatile" : "gpt-5");

const aiClient = new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {}),
});

const safetyKeywords = [
  "suicide",
  "kill myself",
  "end my life",
  "want to die",
  "better off dead",
  "hurt myself",
  "self harm",
  "cutting",
  "overdose",
  "no reason to live",
  "can't go on",
  "unbearable",
  "hopeless",
  "worthless",
];

function getSafetyMessage(language: "en" | "hi" | "mr"): string {
  const messages: Record<"en" | "hi" | "mr", string> = {
    en: "I’m really sorry you’re feeling this way. Your safety matters, and it could help to reach out to someone you trust or a helpline right now. If you can, please contact local support or a trusted person and tell them how you’re feeling.",
    hi: "मुझे बहुत दुख है कि आप ऐसा महसूस कर रहे हैं। आपकी सुरक्षा सबसे ज़रूरी है, और अभी किसी भरोसेमंद व्यक्ति या हेल्पलाइन से बात करना मददगार हो सकता है। अगर आप कर सकें, तो कृपया किसी से अपनी बात साझा करें और मदद लें।",
    mr: "मला खरंच वाईट वाटतंय की तुम्ही असं अनुभव करत आहात. तुमची सुरक्षितता महत्वाची आहे, आणि सध्या कुठल्याही विश्वासू व्यक्तीशी किंवा हेल्पलाइनशी बोलल्याने मदत होऊ शकते. शक्य असल्यास, कृपया कोणाशी तरी हे वाटून घ्या आणि मदत घ्या.",
  };
  return messages[language];
}

function getEmotionStrategy(emotion: TextEmotionLabel | string): string {
  const map: Record<string, string> = {
    sad: "Validate the feeling and offer comfort with gentle support.",
    anxious: "Provide grounding reassurance and help slow things down.",
    angry: "Stay calm, de-escalate, and help the user feel heard without judgment.",
    neutral: "Offer open-ended support and invite the user to share more.",
    happy: "Acknowledge the positive moment and gently explore what is working well.",
    positive: "Acknowledge the positive moment and gently explore what is working well.",
    disgusted: "Acknowledge discomfort carefully and help the user explain what feels off.",
    surprised: "Help the user make sense of what feels unexpected without overreacting.",
  };
  return map[emotion] || "Offer gentle, supportive responses.";
}

type IntentLabel = "greeting" | "venting" | "advice_seeking" | "crisis" | "casual";
type TextEmotionLabel = "sad" | "anxious" | "angry" | "neutral" | "happy" | "disgusted" | "surprised" | "positive";

type TextEmotionResult = {
  emotion: TextEmotionLabel;
  confidence: number;
};

type FusionResult = {
  emotion: TextEmotionLabel;
  confidence: number;
  source: "text" | "face" | "fused";
};

type MemoryEntry = {
  sessionId: string;
  text: string;
  embedding: number[];
  createdAt: number;
};

type KnowledgeCard = {
  id: string;
  title: string;
  tags: Array<IntentLabel | TextEmotionLabel | "general">;
  content: string;
};

const sessionVectors = new Map<string, MemoryEntry[]>();

const knowledgeBase: KnowledgeCard[] = [
  {
    id: "coping-breathing",
    title: "Simple breathing anchor",
    tags: ["sad", "anxious", "advice_seeking", "general"],
    content: "Try gently breathing in for four counts, holding for four, then breathing out for six. Let your body soften with each exhale.",
  },
  {
    id: "grounding-5-4-3",
    title: "5-4-3 grounding exercise",
    tags: ["anxious", "neutral", "venting", "general"],
    content: "Name 5 things you can see, 4 things you can touch, and 3 things you can hear. This can bring you back into the present moment.",
  },
  {
    id: "cbt-thought-record",
    title: "CBT thought record",
    tags: ["angry", "venting", "advice_seeking", "general"],
    content: "When a strong feeling arrives, notice the thought behind it, check if it is helpful, and consider a kinder, more balanced alternative.",
  },
  {
    id: "self-compassion",
    title: "Self-compassion reminder",
    tags: ["sad", "angry", "neutral", "general"],
    content: "It is okay to feel overwhelmed. Remind yourself that you are doing what you can, and that hard moments do not define your worth.",
  },
  {
    id: "progress-check-in",
    title: "Small progress check-in",
    tags: ["positive", "casual", "general"],
    content: "Notice one small thing that felt a little easier today, even if it was only a moment of rest or a gentle choice.",
  },
];

let hfIntentPipeline: any;
let hfEmotionPipeline: any;
let hfSafetyPipeline: any;

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, idx) => sum + value * (b[idx] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await aiClient.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding as number[];
  } catch (error) {
    console.warn("Embedding fallback: using token-level embedding approximation", error);
    return text.split(" ").map((word) => word.length / 10).slice(0, 512);
  }
}

async function storeSessionEmbedding(sessionId: string, text: string, embedding: number[]) {
  const entries = sessionVectors.get(sessionId) || [];
  entries.push({ sessionId, text, embedding, createdAt: Date.now() });
  sessionVectors.set(sessionId, entries.slice(-100));
}

async function retrieveMemory(sessionId: string, text: string, topK = 3): Promise<string[]> {
  const entries = sessionVectors.get(sessionId) || [];
  if (entries.length === 0) return [];

  const queryEmbedding = await createEmbedding(text);
  const ranked = entries
    .map((entry) => ({ entry, score: cosineSimilarity(entry.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((item) => item.score > 0.65)
    .map((item) => item.entry.text);

  return ranked;
}

async function retrieveKnowledge(emotion: TextEmotionLabel, intent: IntentLabel, topK = 3): Promise<string[]> {
  const matches = knowledgeBase
    .map((card) => ({ card, score: Number(card.tags.includes(emotion)) + Number(card.tags.includes(intent)) + Number(card.tags.includes("general")) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((result) => `${result.card.title}: ${result.card.content}`);

  if (matches.length > 0) return matches;
  return knowledgeBase.slice(0, topK).map((card) => `${card.title}: ${card.content}`);
}

async function ensureHFPipelines() {
  if (hfIntentPipeline && hfEmotionPipeline && hfSafetyPipeline) return;

  try {
    const transformers = await import("@xenova/transformers");
    hfIntentPipeline ??= await transformers.pipeline("zero-shot-classification", "facebook/bart-large-mnli");
    hfEmotionPipeline ??= await transformers.pipeline("text-classification", "j-hartmann/emotion-english-distilroberta-base");
    hfSafetyPipeline ??= await transformers.pipeline("text-classification", "unitary/toxic-bert");
  } catch (error) {
    console.warn("HuggingFace transformers unavailable, using lightweight fallbacks.", error);
  }
}

function normalizeMixedLanguage(text: string, language: "en" | "hi" | "mr"): string {
  if (language !== "hi") return text;

  return text
    .replace(/\b(kya|k[eé]a)\b/gi, "क्या")
    .replace(/\b(nahi|nahin|na)\b/gi, "नहीं")
    .replace(/\b(acha|achha|accha)\b/gi, "अच्छा")
    .replace(/\b(mera|mere|meri)\b/gi, "मेरा")
    .replace(/\b(hai|haiy|he)\b/gi, "है")
    .replace(/\b(hu|hoon|hun)\b/gi, "हूँ")
    .replace(/\b(kar|karo|kart?e?)\b/gi, "कर")
    .replace(/\b(dost)\b/gi, "दोस्त")
    .replace(/\b(phir|fir)\b/gi, "फिर")
    .replace(/\b(bata|batana)\b/gi, "बताना")
    .replace(/\b(aisa|aesa)\b/gi, "ऐसा")
    .replace(/\b(kyun|kyu)\b/gi, "क्यों")
    .replace(/\b(kab|kabhi)\b/gi, "कब");
}

function detectInputLanguage(text: string): "en" | "hi" | "mr" {
  if (/[ऀ-ॿ]/.test(text)) {
    const marathiHints = /\b(आहे|माझं|म्हणजे|तुम्हाला|आपण|बरं|होतो)\b/i;
    return marathiHints.test(text) ? "mr" : "hi";
  }
  return "en";
}

function heuristicIntent(text: string): IntentLabel {
  const normalized = text.trim().toLowerCase();
  if (/^(hi|hello|hey|good morning|good evening|good afternoon|namaste|hey there)\b/.test(normalized)) return "greeting";
  if (/\b(help|advice|suggest|should i|what should i|can i do|tips|coping|strategy|how do i)\b/.test(normalized)) return "advice_seeking";
  if (/\b(suicide|kill myself|end my life|want to die|hopeless|cant go on|hurt myself)\b/.test(normalized)) return "crisis";
  if (/\b(not much|just|cool|ok|okay|fine|lol|haha|yeah|nah|just chilling|casual)\b/.test(normalized)) return "casual";
  return "venting";
}

async function classifyIntent(text: string): Promise<IntentLabel> {
  await ensureHFPipelines();

  if (hfIntentPipeline) {
    try {
      const labels = ["greeting", "venting", "advice_seeking", "crisis", "casual"];
      const result = await hfIntentPipeline(text, labels);
      if (result && Array.isArray(result.labels) && result.labels.length > 0) {
        return result.labels[0] as IntentLabel;
      }
      if (Array.isArray(result) && result.length > 0) {
        const sorted = result.sort((a: any, b: any) => b.score - a.score);
        return sorted[0].label as IntentLabel;
      }
    } catch (error) {
      console.warn("Intent pipeline failed, falling back to heuristics.", error);
    }
  }

  return heuristicIntent(text);
}

function heuristicTextEmotion(text: string): TextEmotionResult {
  const normalized = text.trim().toLowerCase();
  if (/(sad|depressed|low|down|broken|unhappy|hopeless)/i.test(normalized)) return { emotion: "sad", confidence: 0.88 };
  if (/(anxious|worried|nervous|panic|scared|fearful|tense)/i.test(normalized)) return { emotion: "anxious", confidence: 0.9 };
  if (/(angry|mad|frustrated|upset|irritated|annoyed)/i.test(normalized)) return { emotion: "angry", confidence: 0.9 };
  if (/(happy|good|great|fine|okay|well|positive|hopeful)/i.test(normalized)) return { emotion: "happy", confidence: 0.8 };
  if (/(disgusted|gross|repulsed|sick)/i.test(normalized)) return { emotion: "disgusted", confidence: 0.8 };
  if (/(surprised|shocked|unexpected)/i.test(normalized)) return { emotion: "surprised", confidence: 0.8 };
  return { emotion: "neutral", confidence: 0.5 };
}

async function detectTextEmotion(text: string): Promise<TextEmotionResult> {
  await ensureHFPipelines();

  if (hfEmotionPipeline) {
    try {
      const result = await hfEmotionPipeline(text);
      if (Array.isArray(result) && result.length > 0) {
        const best = result.reduce((prev: any, current: any) => (current.score > prev.score ? current : prev));
        return {
          emotion: (best.label.toLowerCase().replace("joy", "happy") || "neutral") as TextEmotionLabel,
          confidence: best.score,
        };
      }
    } catch (error) {
      console.warn("Emotion pipeline failed, falling back to heuristics.", error);
    }
  }

  return heuristicTextEmotion(text);
}

async function detectToxicity(text: string): Promise<number> {
  await ensureHFPipelines();
  if (hfSafetyPipeline) {
    try {
      const result = await hfSafetyPipeline(text);
      if (Array.isArray(result) && result.length > 0) {
        const toxic = result.find((item: any) => /tox|toxic/i.test(item.label));
        return toxic ? toxic.score : 0;
      }
    } catch (error) {
      console.warn("Safety pipeline failed, using keyword fallback.", error);
    }
  }
  return 0;
}

function combineEmotions(
  faceEmotion: string | undefined,
  faceConfidence: number | undefined,
  textResult: TextEmotionResult,
): FusionResult {
  if (faceEmotion && textResult.emotion === faceEmotion) {
    return { emotion: textResult.emotion, confidence: Math.min(1, textResult.confidence + (faceConfidence ?? 0.1)), source: "fused" };
  }

  if (textResult.confidence >= 0.7) {
    return { emotion: textResult.emotion, confidence: textResult.confidence, source: "text" };
  }

  if (faceEmotion && faceConfidence !== undefined) {
    return { emotion: faceEmotion as TextEmotionLabel, confidence: faceConfidence, source: "face" };
  }

  return { emotion: textResult.emotion, confidence: textResult.confidence, source: "text" };
}

async function safetyCheck(text: string, language: "en" | "hi" | "mr"): Promise<{ isCrisis: boolean; message: string }> {
  const crisisKeywords = containsSafetyKeywords(text);
  const toxicityScore = await detectToxicity(text);
  const isCrisis = crisisKeywords || toxicityScore >= 0.7;
  return {
    isCrisis,
    message: isCrisis ? getSafetyMessage(language) : "",
  };
}

function containsSafetyKeywords(text: string): boolean {
  const normalized = text.toLowerCase();
  return safetyKeywords.some((keyword) => normalized.includes(keyword));
}

function buildConversationMemory(history: TherapyContext["conversationHistory"]): string {
  const recent = history.slice(-5);
  if (recent.length === 0) return "No previous messages.";
  return recent
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");
}

export interface TherapyContext {
  sessionId?: string;
  emotion?: string;
  emotionConfidence?: string;
  language?: "en" | "hi" | "mr";
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function generateTherapyResponse(
  sessionId: string,
  userMessage: string,
  context: TherapyContext
): Promise<string> {
  const language = context.language || "en";
  const detectedLanguage = detectInputLanguage(userMessage);
  const normalizedMessage = normalizeMixedLanguage(userMessage, language);

  const intent = await classifyIntent(normalizedMessage);
  const textEmotion = await detectTextEmotion(normalizedMessage);
  const faceConfidence = context.emotionConfidence ? parseFloat(context.emotionConfidence) : undefined;
  const fusedEmotion = combineEmotions(context.emotion, faceConfidence, textEmotion);

  const safety = await safetyCheck(normalizedMessage, language);
  if (safety.isCrisis) {
    return safety.message;
  }

  const conversationMemory = buildConversationMemory(context.conversationHistory.slice(-5));
  const retrievedMemory = await retrieveMemory(sessionId, normalizedMessage);
  const retrievedKnowledge = await retrieveKnowledge(fusedEmotion.emotion, intent);

  const prompt = buildSystemPrompt(
    intent,
    fusedEmotion,
    language,
    detectedLanguage,
    conversationMemory,
    retrievedMemory,
    retrievedKnowledge,
  );

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
    ...buildStyleExamples(),
    ...context.conversationHistory.slice(-5).map((msg) => ({
      role: msg.role,
      content: msg.content,
    } as OpenAI.Chat.ChatCompletionMessageParam)),
    { role: "user", content: normalizedMessage },
  ];

  try {
    const response = await aiClient.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const assistantText = response.choices[0].message.content || "I'm here to listen. Please continue.";
    await storeSessionEmbedding(sessionId, normalizedMessage, await createEmbedding(normalizedMessage));

    return cleanTherapyResponse(assistantText, normalizedMessage, context);
  } catch (error) {
    console.error(`${provider} chat API error:`, error);
    return cleanTherapyResponse(generateMockTherapyResponse(normalizedMessage, context), normalizedMessage, context);
  }
}

function buildStyleExamples(): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    {
      role: "user",
      content: "hi",
    },
    {
      role: "assistant",
      content: "Hi, I'm here with you. We can start wherever feels easiest. What's been on your mind today?",
    },
    {
      role: "user",
      content: "im happy im good",
    },
    {
      role: "assistant",
      content: "I'm glad to hear that. What's been helping you feel good today?",
    },
    {
      role: "user",
      content: "im stressed and i cant focus",
    },
    {
      role: "assistant",
      content: "That sounds draining. Let's slow it down and take one piece at a time. What's making it hardest to focus right now?",
    },
    {
      role: "user",
      content: "im eating man",
    },
    {
      role: "assistant",
      content: "Got it. No pressure to say anything deep right away. How's your day been going so far?",
    },
  ];
}

function inferSelfReportedEmotion(userMessage: string): string | undefined {
  const normalized = userMessage.trim().toLowerCase();

  if (/(i am|i'm|im|feeling|feel)\s+(really\s+|very\s+|so\s+)?(happy|good|okay|ok|fine|better|hopeful|calm|great)/i.test(normalized)) {
    return "positive";
  }

  if (/(i am|i'm|im|feeling|feel)\s+(really\s+|very\s+|so\s+)?(sad|anxious|worried|stressed|overwhelmed|angry|upset|hurt|drained|low)/i.test(normalized)) {
    return "distressed";
  }

  return undefined;
}

function inferResponseStyle(
  userMessage: string,
  selfReportedEmotion?: string,
): "greeting" | "positive" | "distress" | "crisis" | "exploratory" {
  const normalized = userMessage.trim().toLowerCase();
  const isGreeting = /^(hi|hello|hey|hii+|heyy+|good morning|good afternoon|good evening|what|yo)$/i.test(normalized);
  const hasCrisisSignals = /suicide|kill myself|end my life|want to die|better off dead|self harm|hurt myself|cutting|overdose|can't go on|unbearable|no reason to live/i.test(normalized);
  const hasDistressSignals = /sad|anxious|worried|stressed|overwhelmed|angry|upset|hurt|drained|low|confused|lost|frustrated/i.test(normalized);

  if (hasCrisisSignals) return "crisis";
  if (isGreeting) return "greeting";
  if (selfReportedEmotion === "positive") return "positive";
  if (selfReportedEmotion === "distressed" || hasDistressSignals) return "distress";
  return "exploratory";
}

function generateMockTherapyResponse(userMessage: string, context: TherapyContext): string {
  const localizedFallbacks = {
    en: "I'm here with you. Tell me a little more about what feels most important right now.",
    hi: "मैं आपके साथ हूँ। इस समय जो बात सबसे अधिक महत्वपूर्ण लग रही है, उसके बारे में थोड़ा और बताइए।",
    mr: "मी तुमच्यासोबत आहे. आत्ता तुम्हाला सर्वात महत्त्वाची वाटणारी गोष्ट थोडी अधिक सांगाल का?",
  } as const;

  const normalizedMessage = userMessage.trim().toLowerCase();
  const hasNegativeEmotions = /sad|angry|frustrated|anxious|scared|worried|hurt|confused|lost|stressed|overwhelmed|drained/i.test(userMessage);
  const hasFeelingsOfHope = /better|happy|excited|grateful|hopeful|positive|good|well|okay|fine/i.test(userMessage);
  const isGreeting = /^(hi|hello|hey|hii+|heyy+|good morning|good afternoon|good evening)$/i.test(normalizedMessage);
  const isVeryShort = normalizedMessage.split(/\s+/).filter(Boolean).length <= 3;
  const responseStyle = inferResponseStyle(userMessage, inferSelfReportedEmotion(userMessage));
  
  const mockResponses = {
    greeting: [
      "Hi, I'm here with you. We can start wherever feels easiest.",
      "Hello. Take your time. What would feel helpful to talk about today?",
      "Hey, it's good to have you here. What's been on your mind lately?",
    ],
    crisis: [
      "I'm really glad you said that. If you might act on these thoughts or feel unsafe, please call 112 right now or reach out to Tele-MANAS at 14416. If you're able, tell me whether you're safe at this moment.",
      "Thank you for telling me this. Your safety matters most right now. Please contact 112 or Tele-MANAS at 14416 if there's any immediate risk, and let me know if someone trusted is with you.",
    ],
    sad: [
      "It sounds like something feels heavy right now. I'm here with you, and we can take this one step at a time. Do you want to tell me what's been weighing on you?",
      "It seems like you're carrying a lot. We don't have to fix it all at once. What part of this feels hardest today?",
      "I'm really glad you said that out loud. When you're ready, tell me a little more about what's been hurting.",
    ],
    angry: [
      "It makes sense that you're feeling frustrated. Let's slow it down together. What happened that brought this up for you?",
      "There's a lot of intensity in that, and I'm glad you're sharing it instead of holding it alone. What feels most upsetting about the situation?",
      "Your anger sounds important here. Beneath it, is there hurt, disappointment, or something else asking for attention?",
    ],
    anxious: [
      "It sounds like your mind may be carrying a lot right now. Let's stay with one piece of it together. What's the main worry that's showing up?",
      "When things feel overwhelming, it can help to put words to the strongest part first. What feels most pressing in this moment?",
      "I'm here with you. We can take this slowly. What has been making things feel especially stressful lately?",
    ],
    hopeful: [
      "I'm glad to hear that. What's been helping you feel a bit better?",
      "That sounds good to hear. What do you think has been contributing to that?",
      "I'm glad there's something steady in this for you. What has been going well lately?",
    ],
    neutral: [
      "I'm here and listening. What feels most important for me to understand right now?",
      "Thanks for starting there. Tell me a little more about what's been happening for you.",
      "We can begin wherever feels easiest. What's been on your mind lately?",
    ],
  };

  let responses: string[] = [];

  if (responseStyle === "crisis") {
    responses = mockResponses.crisis;
  } else if (responseStyle === "greeting" || isVeryShort) {
    responses = mockResponses.greeting;
  } else if (hasNegativeEmotions) {
    if (normalizedMessage.includes('sad') || normalizedMessage.includes('depressed')) {
      responses = mockResponses.sad;
    } else if (normalizedMessage.includes('angry') || normalizedMessage.includes('frustrated') || normalizedMessage.includes('mad')) {
      responses = mockResponses.angry;
    } else if (normalizedMessage.includes('anxious') || normalizedMessage.includes('worried') || normalizedMessage.includes('stressed') || normalizedMessage.includes('overwhelmed')) {
      responses = mockResponses.anxious;
    } else {
      responses = mockResponses.neutral;
    }
  } else if (hasFeelingsOfHope) {
    responses = mockResponses.hopeful;
  } else {
    responses = mockResponses.neutral;
  }

  const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

  const confidenceNum = context.emotionConfidence ? parseFloat(context.emotionConfidence) : undefined;
  const selfReportedEmotion = inferSelfReportedEmotion(userMessage);
  const shouldLightlyReferenceEmotion = false;

  if (shouldLightlyReferenceEmotion) {
    return `As you share this, you seem a bit ${context.emotion}. ${selectedResponse}`;
  }

  return context.language && context.language !== "en"
    ? localizedFallbacks[context.language]
    : selectedResponse;
}

function cleanTherapyResponse(
  response: string,
  userMessage: string,
  context: TherapyContext,
): string {
  let cleaned = response.trim();

  cleaned = cleaned.replace(/^As you share this, you seem a bit [^.]+\.\s*/i, "");
  cleaned = cleaned.replace(/^That's an important point\.\s*/i, "");
  cleaned = cleaned.replace(/^I notice you(?:'re| are) feeling [^.]+\.\s*/i, "");

  const selfReportedEmotion = inferSelfReportedEmotion(userMessage);
  if (selfReportedEmotion) {
    cleaned = cleaned.replace(/\bbut you seem\b/gi, "and you sound");
  }

  if (cleaned.length === 0) {
    return "I'm here with you. Tell me a little more about what's going on.";
  }

  return cleaned;
}

function buildSystemPrompt(
  intent: IntentLabel,
  fusedEmotion: FusionResult,
  language: "en" | "hi" | "mr" = "en",
  detectedLanguage: "en" | "hi" | "mr",
  conversationMemory: string,
  retrievedMemory: string[],
  retrievedKnowledge: string[],
): string {
  let basePrompt = `You are a calm, empathetic mental health assistant. Your role is to:

1. Listen actively and validate the user's feelings
2. Respond like a thoughtful therapist, not like a generic chatbot
3. Ask focused, gentle questions that help the user reflect
4. Offer practical coping ideas only when they fit naturally
5. Maintain a calm, warm, non-judgmental, encouraging tone
6. NEVER diagnose mental health conditions or replace professional therapy
7. Encourage seeking professional help for serious concerns

Guidelines:
- Keep responses concise and focused (2-4 sentences typically)
- Make your response feel natural and relational, especially for short messages like "hi"
- Do not overreact to very short inputs or assume deep meaning where there may be none
- Use empathetic language that shows understanding
- Avoid clinical jargon - be conversational and approachable
- Validate emotions before offering suggestions
- Prefer one thoughtful follow-up question over multiple questions
- Do not mention emotion detection unless it genuinely helps the conversation
- Treat sensed emotions as a soft clue, not a fact
- Rely primarily on the user's words, and only secondarily on sensed emotion
- If the user clearly tells you how they feel, trust their words over the camera/emotion signal
- Never contradict the user's own description of their emotional state
- Sound like one steady therapist across the conversation, not a rotating set of canned responses`;

  basePrompt += `\n\nUser intent: ${intent.replace(/_/g, " ")}. Use this to shape tone and focus.`;
  basePrompt += `\nFinal emotion: ${fusedEmotion.emotion} (${Math.round(fusedEmotion.confidence * 100)}% confidence).`;
  basePrompt += `\nDetected input language: ${detectedLanguage}. Respond in the selected UI language: ${language}.`;
  basePrompt += `\nEmotion strategy: ${getEmotionStrategy(fusedEmotion.emotion)}`;

  basePrompt += `\n\nShort-term memory:\n${conversationMemory}`;

  if (retrievedMemory.length > 0) {
    basePrompt += `\n\nRelevant past context:\n${retrievedMemory.join("\n")}`;
  }

  if (retrievedKnowledge.length > 0) {
    basePrompt += `\n\nRelevant knowledge and coping tips:\n${retrievedKnowledge.join("\n")}`;
  }

  basePrompt += `\n\nSafety guidance: If the user expresses self-harm or crisis, respond with a supportive and safety-focused message and suggest help without sounding clinical.`;

  basePrompt += `\n\nResponse style rules:
- For greetings or vague openers, respond warmly and briefly, then invite the user to begin.
- For advice-seeking messages, offer practical coping options without overwhelming the user.
- For distress, first validate, then gently narrow the focus to one part of the problem.
- For crisis or possible self-harm language, prioritize safety, encourage immediate real-world help, and ask whether the user is safe right now.
- Avoid awkward phrases like "that's an important point" unless they truly fit.
- Never use stock phrases like "As you share this, you seem..." or "That's an important point."
- Avoid sounding overly formal, robotic, or repetitive.
- Usually ask only one question.
- Keep most replies under 90 words.`;

  const languageInstruction: Record<"en" | "hi" | "mr", string> = {
    en: "Respond strictly in English only. Do not use Hindi or Marathi words unless the user explicitly asks for them.",
    hi: "Respond strictly in natural Hindi only, written in Devanagari script. Do not mix English, Hinglish, Marathi, or transliterated Hindi in the reply.",
    mr: "Respond strictly in natural Marathi only, written in Devanagari script. Do not mix English, Hindi, or transliterated Marathi in the reply.",
  };

  const languageName: Record<"en" | "hi" | "mr", string> = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
  };

  basePrompt += `\n- ${languageInstruction[language]}`;
  basePrompt += `\n- Keep the entire reply in the selected language from the first word to the last word.`;
  basePrompt += `\n- If a phrase would normally be said in English, translate it naturally instead of borrowing it.`;
  basePrompt += `\n- You MUST respond ONLY in ${languageName[language]}.`;
  basePrompt += `\n- Do NOT use English unless language is English.`;
  basePrompt += `\n- Do NOT mix languages.`;
  basePrompt += `\n- If the input language differs from the UI language, still answer in the selected UI language clearly and naturally.`;

  return basePrompt;
}

export interface SessionSummary {
  overview: string;
  keyInsights: string[];
  emotionalJourney: string;
  recommendations: string[];
}

export async function generateSessionSummary(
  messages: Array<{ role: string; content: string }>,
  emotions: Array<{ emotion: string; timestamp: Date }>
): Promise<SessionSummary> {
  const emotionSummary = emotions.map(e => e.emotion).join(', ');
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const prompt = `Analyze this therapy session and provide a structured summary:

Emotions detected: ${emotionSummary}

Conversation:
${conversationText}

Please provide:
1. A brief overview (2-3 sentences) of what was discussed
2. 3-5 key insights or themes that emerged
3. A description of the emotional journey during the session
4. 2-3 personalized recommendations for continued growth

Format your response as JSON with these keys: overview, keyInsights (array), emotionalJourney, recommendations (array)`;

  try {
    const response = await aiClient.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a compassionate therapist creating helpful session summaries. Be warm, insightful, and supportive.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content) as SessionSummary;
  } catch (error) {
    console.error(`Error generating session summary with ${provider}:`, error);
    return {
      overview: "This session focused on emotional expression and self-reflection.",
      keyInsights: ["The user engaged openly with their feelings", "Progress was made in self-understanding"],
      emotionalJourney: "The session showed varied emotional states reflecting authentic engagement.",
      recommendations: ["Continue practicing self-awareness", "Consider journaling between sessions"],
    };
  }
}
