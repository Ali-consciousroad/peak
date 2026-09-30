import { NextResponse } from 'next/server';
import { readFile } from "node:fs/promises";
import path from "node:path";

// FAQ responses organized by categories
const faqResponses = {
  // User roles and onboarding
  "role": {
    keywords: ["role", "client", "freelance", "freelancer", "what am i", "user type"],
    response: "There are 3 user roles:\n• **Client**: Create missions and send offers to builders\n• **Builder**: Receive offers, deliver work, and get paid\n• **Admin**: Manage the platform and verify content\n\nYour role is set during signup and can be changed in your profile."
  },
  
  // Profile setup
  "profile": {
    keywords: ["profile", "setup", "complete profile", "profile setup", "account setup"],
    response: "To complete your profile:\n1. Go to **My Profile** in the dropdown menu\n2. Fill in your personal information\n3. Add your skills and experience\n4. Upload a portfolio if you're a builder\n5. Save your changes\n\nThis helps other users understand your expertise!"
  },
  
  // Missions
  "mission": {
    keywords: ["mission", "create mission", "how to create", "post mission", "new mission"],
    response: "To create a mission:\n1. Click **Missions** in the navbar\n2. Click **Create New Mission** button\n3. Fill in the details:\n   • Title and description\n   • Required skills\n   • Budget and timeline\n   • Contact information\n4. Submit for admin verification\n\nMissions need admin approval before going live."
  },
  
  // Applications
  "apply": {
    keywords: ["apply", "application", "how to apply", "proposal", "submit application", "offer", "offers"],
    response: "Builders do not apply to open missions. The client sends an offer:\n1. Client posts a mission and waits for admin verification\n2. Client browses builders and sends an offer from the builder profile\n3. The builder reviews it on **Offers**\n4. The builder accepts or rejects\n\nA contract is created when the builder accepts."
  },
  
  // Payments
  "payment": {
    keywords: ["payment", "money", "fee", "cost", "price", "budget", "how much"],
    response: "Payment information:\n• **Platform fee**: 5% of transaction value\n• **Payment methods**: Credit cards, bank transfers\n• **Escrow system**: Funds held until project completion\n• **Milestone payments**: Available for large projects\n• **Dispute resolution**: Admin mediation available"
  },
  
  // Contracts
  "contract": {
    keywords: ["contract", "agreement", "legal", "terms", "sign contract"],
    response: "Contracts are created automatically when:\n1. A client sends an offer to a builder\n2. The builder accepts the offer on **Offers**\n3. Contract includes:\n   • Project scope and deliverables\n   • Timeline and milestones\n   • Payment terms and amounts\n   • Dispute resolution process"
  },
  
  // Messaging
  "message": {
    keywords: ["message", "chat", "contact", "talk", "communicate", "conversation"],
    response: "You can message other users:\n• **From mission pages**: Click 'Message Client' button\n• **From your messages**: Go to Messages in the dropdown\n• **Direct messaging**: Start conversations with any user\n• **Real-time chat**: Instant messaging with read receipts"
  },
  
  // Verification
  "verify": {
    keywords: ["verify", "verification", "approved", "pending", "admin approval"],
    response: "Content verification process:\n• **Missions**: Reviewed by admins before going live\n• **User profiles**: Basic verification for security\n• **Portfolios**: Optional verification for quality\n• **Skills**: Self-reported, can be verified by admins\n\nVerification helps maintain platform quality."
  },
  
  // General help
  "help": {
    keywords: ["help", "support", "assistance", "problem", "issue", "trouble"],
    response: "Need help? Here are your options:\n• **FAQ**: I can answer common questions\n• **Documentation**: Check the help section\n• **Contact support**: Message an admin user\n• **Community**: Ask other users in the forum\n\nWhat specific issue are you having?"
  },
  
  // Platform features
  "features": {
    keywords: ["feature", "what can i do", "capabilities", "tools", "functions"],
    response: "Platform features:\n• **Missions**: Clients create projects and send offers\n• **Portfolios**: Showcase your work\n• **Skills**: Display your expertise\n• **Messaging**: Chat with other users\n• **Contracts**: Manage project agreements\n• **Search**: Find users and your missions\n• **Notifications**: Stay updated on activity"
  }
};

// Default response for unrecognized questions
const defaultResponse = "I'm here to help! You can ask me about:\n• User roles and profiles\n• Creating missions and sending offers\n• Payments and contracts\n• Messaging and communication\n• Platform features and verification\n\nTry asking something specific like 'How do I create a mission?' or 'What are the payment methods?'";

const systemPrompt =
  "You are a helpful assistant for a freelance marketplace. Keep responses short, actionable, and aligned with the platform features (missions, applications, contracts, payments, messaging, verification). If unsure, ask one clarifying question.";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

const knowledgePath = path.join(process.cwd(), "docs", "chatbot-knowledge.md");
const docsPath = path.join(process.cwd(), "docs", "README.md");
const maxDocsChars = 6000;
let cachedDocsContext: string | null = null;

const getDocsContext = async () => {
  if (cachedDocsContext) {
    return cachedDocsContext;
  }

  try {
    const raw = await readFile(knowledgePath, "utf8");
    const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, maxDocsChars);
    cachedDocsContext = trimmed
      ? `Project documentation (truncated): ${trimmed}`
      : null;
  } catch (error) {
    try {
      const raw = await readFile(docsPath, "utf8");
      const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, maxDocsChars);
      cachedDocsContext = trimmed
        ? `Project documentation (truncated): ${trimmed}`
        : null;
    } catch (fallbackError) {
      cachedDocsContext = null;
    }
  }

  return cachedDocsContext;
};

const getLlmResponse = async (message: string) => {
  const mode = (process.env.CHATBOT_MODE || "rules").toLowerCase();
  const baseUrl = process.env.CHATBOT_OPENAI_BASE_URL;
  const model = process.env.CHATBOT_OPENAI_MODEL;
  const apiKey = process.env.CHATBOT_OPENAI_API_KEY;

  if (mode === "rules") {
    return null;
  }

  if (!baseUrl || !model) {
    return null;
  }

  const docsContext = await getDocsContext();
  const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...(docsContext ? [{ role: "system", content: docsContext }] : []),
          { role: "user", content: message },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "Chatbot LLM HTTP error:",
        response.status,
        detail.slice(0, 500),
      );
      if (mode === "llm") {
        throw new Error(`LLM request failed: ${response.status}`);
      }
      return null;
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (error) {
    console.error("Chatbot LLM error (is Ollama running on CHATBOT_OPENAI_BASE_URL?):", error);
    if (mode === "llm") {
      throw error;
    }
    return null;
  }
};

export async function POST(request: Request) {
  try {
    // Help widget: no sign-in required (FAQ + LLM use only the message body).

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const llmResponse = await getLlmResponse(message);
    if (llmResponse) {
      return NextResponse.json({
        response: llmResponse,
        category: "llm",
        timestamp: new Date().toISOString(),
      });
    }

    // Convert message to lowercase for matching
    const lowerMessage = message.toLowerCase();

    // Find the best matching FAQ category
    let bestMatch = null;
    let highestScore = 0;

    for (const [category, faq] of Object.entries(faqResponses)) {
      for (const keyword of faq.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          const score = keyword.length; // Longer keywords get higher scores
          if (score > highestScore) {
            highestScore = score;
            bestMatch = category;
          }
        }
      }
    }

    // Return the appropriate response
    const response = bestMatch
      ? faqResponses[bestMatch as keyof typeof faqResponses].response
      : defaultResponse;

    return NextResponse.json({
      response,
      category: bestMatch || "general",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
