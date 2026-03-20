import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku";

const SYSTEM_PROMPT = `You are KnowAI Assistant, an AI helper embedded in the KnowAI CRM & Project Management platform. You help employees with:

## Your Role
- Help users navigate the CRM application
- Explain their role responsibilities and job description
- Guide them on completing tasks, managing projects, and using features
- Answer questions about company processes and CRM functionality

## CRM Navigation Guide
- **/dashboard** - Personal dashboard with today's tasks, KPIs, upcoming work
- **/tasks** - Kanban board for task management (TODO → IN_PROGRESS → IN_REVIEW → COMPLETED)
- **/projects** - Project overview and management
- **/calendar** - Events and scheduling
- **/email** - Email client (Compose, Inbox, Sent, Drafts, Junk, Trash)
- **/team** - Team directory and org chart
- **/contacts** - CRM contacts (Clients, Partners, Vendors, Investors, Leads)
- **/clients** - Client management
- **/leads** - Sales pipeline (NEW → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST)
- **/invoice** - Invoice creation and management
- **/expenses** - Expense tracking and approval
- **/files** - File manager with folders
- **/documents** - Employee document upload and verification
- **/leaves** - Leave request and approval
- **/complaints** - File and track complaints
- **/analytics** - Business analytics and charts
- **/reports** - Generate reports with CSV export
- **/settings** - Profile and appearance settings
- **/careers** - Public job listings (no login needed)

## Task Workflow
1. Tasks are created and assigned by managers
2. Assignee moves task: TODO → IN_PROGRESS (starts work)
3. Assignee moves task: IN_PROGRESS → IN_REVIEW (submits for review)
4. Superior reviews and approves: IN_REVIEW → COMPLETED
5. All status changes notify the relevant superiors

## Role Hierarchy
- **ADMIN**: Full access to everything. Manages system settings, users, and all data.
- **PROJECT_MANAGER**: Manages projects, teams, invoices, credentials. Can assign tasks to TEAM_MANAGER, USER, DRIVER.
- **TEAM_MANAGER**: Leads a team. Manages clients, leads, team tasks. Can assign to USER, DRIVER.
- **HR**: Manages hiring, leaves, payroll, complaints, SOPs, documents, employee records.
- **USER**: Individual contributor. Works on assigned tasks, manages expenses, leaves, documents.
- **DRIVER**: Field staff. Views dashboard, payroll, leaves, complaints, email.

## Company: Know AI
Know AI is a creative-tech company based in India focused on content creation, brand collaborations, and digital products. The culture values innovation, collaboration, and work-life balance.

Be friendly, concise, and helpful. Use short paragraphs. If you don't know something specific about their data, suggest where they can find it in the CRM. Always encourage productivity.`;

// GET: List conversations or messages
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    const conversation = await prisma.chatBotConversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: {
        messages: {
          where: { role: { not: "system" } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!conversation) return jsonError("Conversation not found", 404);
    return jsonOk({ conversation });
  }

  // List recent conversations
  const conversations = await prisma.chatBotConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return jsonOk({ conversations });
});

// POST: Send message and get AI response
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const { conversationId, message } = body || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return jsonError("Message is required", 400);
  }
  if (message.length > 4000) {
    return jsonError("Message too long (max 4000 chars)", 400);
  }

  const cleanMessage = message.trim();

  // Get or create conversation
  let convoId = conversationId;
  if (!convoId) {
    const convo = await prisma.chatBotConversation.create({
      data: {
        userId: user.id,
        title: cleanMessage.slice(0, 60) + (cleanMessage.length > 60 ? "..." : ""),
      },
    });
    convoId = convo.id;
  } else {
    // Verify ownership
    const existing = await prisma.chatBotConversation.findFirst({
      where: { id: convoId, userId: user.id },
    });
    if (!existing) return jsonError("Conversation not found", 404);
  }

  // Save user message
  await prisma.chatBotMessage.create({
    data: { conversationId: convoId, role: "user", content: cleanMessage },
  });

  // Build context: get last 20 messages for context
  const history = await prisma.chatBotMessage.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const userContext = `Current user: ${user.firstName || "Unknown"} ${user.lastName || ""} (${user.email || "N/A"}), Role: ${user.role || "GUY"}, Department: ${user.department || "N/A"}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + "\n\n" + userContext },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Call OpenRouter API
  let assistantReply = "I'm sorry, I couldn't process your request right now. Please try again.";

  if (OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://knowai.com",
          "X-Title": "KnowAI CRM Assistant",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        assistantReply = data.choices?.[0]?.message?.content || assistantReply;
      } else {
        console.error("OpenRouter error:", response.status, await response.text());
      }
    } catch (err) {
      console.error("OpenRouter fetch error:", err);
    }
  } else {
    // Fallback: basic responses without API key
    assistantReply = getOfflineResponse(cleanMessage, user.role, user.firstName || "there");
  }

  // Save assistant message
  await prisma.chatBotMessage.create({
    data: { conversationId: convoId, role: "assistant", content: assistantReply },
  });

  // Update conversation timestamp
  await prisma.chatBotConversation.update({
    where: { id: convoId },
    data: { updatedAt: new Date() },
  });

  return jsonOk({
    conversationId: convoId,
    reply: assistantReply,
  });
});

// DELETE: Delete a conversation
export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Conversation ID required", 400);

  const convo = await prisma.chatBotConversation.findFirst({
    where: { id, userId: user.id },
  });
  if (!convo) return jsonError("Conversation not found", 404);

  await prisma.chatBotConversation.delete({ where: { id } });
  return jsonOk({ success: true });
});

function getOfflineResponse(message: string, role: string, name: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello ${name}! I'm the KnowAI Assistant. How can I help you today? I can help with navigating the CRM, understanding your tasks, or explaining features.`;
  }
  if (lower.includes("task") && (lower.includes("create") || lower.includes("add") || lower.includes("new"))) {
    return `To create a new task:\n1. Go to **/tasks**\n2. Click the **"+ New Task"** button\n3. Fill in: title, description, project, assignee, priority, due date\n4. Click **Create**\n\nThe assignee will be notified automatically.`;
  }
  if (lower.includes("task") && (lower.includes("status") || lower.includes("move") || lower.includes("progress"))) {
    return `Task status flow:\n- **TODO** → Click "Start" to move to **IN PROGRESS**\n- **IN PROGRESS** → Click "Submit for Review" to move to **IN REVIEW**\n- **IN REVIEW** → A manager will approve and move to **COMPLETED**\n\nYou can change status from the Kanban board or the task detail view.`;
  }
  if (lower.includes("dashboard")) {
    return `Your **Dashboard** shows:\n- Personalized greeting and motivational quote\n- Today's tasks and upcoming deadlines\n- KPI performance metrics (completion rate, on-time delivery)\n- Overdue/backlog tasks that need attention\n- Recent notifications\n\nGo to **/dashboard** to see your personalized view.`;
  }
  if (lower.includes("role") || lower.includes("job") || lower.includes("responsibilit")) {
    const roleDesc: Record<string, string> = {
      ADMIN: "As an **Admin**, you have full system access. You manage users, system settings, integrations, and can oversee all projects, tasks, and data across the organization.",
      PROJECT_MANAGER: "As a **Project Manager**, you oversee projects end-to-end. You assign tasks, track progress, manage budgets, handle invoices, and coordinate with team managers.",
      TEAM_MANAGER: "As a **Team Manager**, you lead your team's daily work. You assign and review tasks, manage client relationships, track leads, and ensure your team meets deadlines.",
      HR: "As **HR**, you manage the people side of the organization. This includes hiring, leaves, payroll, complaints, employee documents, SOPs, and organizational compliance.",
      USER: "As a **Team Member**, you focus on executing assigned tasks, managing your expenses, requesting leaves, and uploading required documents. Stay on top of your task board!",
      DRIVER: "As a **Driver/Field Staff**, your dashboard shows your payroll, leaves, and any complaints. Check your dashboard daily for updates.",
    };
    return roleDesc[role] || "Your role gives you specific access to different parts of the CRM. Check the sidebar menu to see what's available to you.";
  }
  if (lower.includes("help") || lower.includes("what can you")) {
    return `I can help you with:\n- **Navigation**: "How do I create a task?", "Where are my invoices?"\n- **Role guidance**: "What are my responsibilities?"\n- **Features**: "How does the task workflow work?"\n- **CRM usage**: "How do I add a client?", "How to file a complaint?"\n\nJust ask me anything about the KnowAI CRM!`;
  }

  return `I'm here to help you navigate KnowAI CRM, ${name}! You can ask me about:\n- Creating and managing tasks\n- Understanding your role and responsibilities\n- Finding features in the CRM\n- Company processes and workflows\n\nTo set up AI-powered responses, ask your admin to configure the **OPENROUTER_API_KEY** in the environment variables.`;
}
