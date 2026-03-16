import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// ── Carl Jung / MBTI Question Bank (20 questions, 5 per axis) ────────────

const QUESTIONS = [
  // E/I — Extraversion vs Introversion (questions 0-4)
  {
    id: 1,
    axis: "EI",
    text: "When working on a project, do you prefer to:",
    optionA: "Discuss ideas with the team in a brainstorming session",
    optionB: "Think through solutions independently before sharing",
  },
  {
    id: 2,
    axis: "EI",
    text: "At a company event, you are most likely to:",
    optionA: "Move around the room and meet as many people as possible",
    optionB: "Have a meaningful conversation with one or two colleagues",
  },
  {
    id: 3,
    axis: "EI",
    text: "After a long week of meetings, you recharge by:",
    optionA: "Going out with friends or coworkers for dinner",
    optionB: "Spending a quiet evening alone or with close ones",
  },
  {
    id: 4,
    axis: "EI",
    text: "When facing a challenging task, your first instinct is to:",
    optionA: "Talk it through with a colleague to get different perspectives",
    optionB: "Research and analyze it on your own first",
  },
  {
    id: 5,
    axis: "EI",
    text: "In team settings, you tend to:",
    optionA: "Speak up quickly and share ideas as they come",
    optionB: "Listen carefully and contribute after reflecting",
  },

  // S/N — Sensing vs iNtuition (questions 5-9)
  {
    id: 6,
    axis: "SN",
    text: "When reviewing a project plan, you focus more on:",
    optionA: "The specific tasks, timelines, and concrete deliverables",
    optionB: "The overall vision, strategy, and future possibilities",
  },
  {
    id: 7,
    axis: "SN",
    text: "When learning a new tool or process, you prefer:",
    optionA: "Step-by-step instructions with practical examples",
    optionB: "Understanding the concept first, then figuring out the details",
  },
  {
    id: 8,
    axis: "SN",
    text: "When solving a problem, you trust:",
    optionA: "Proven methods and past experience",
    optionB: "New approaches and creative experimentation",
  },
  {
    id: 9,
    axis: "SN",
    text: "In a strategy meeting, you are drawn to discussions about:",
    optionA: "Current metrics, real data, and what is working now",
    optionB: "Future trends, market shifts, and untapped opportunities",
  },
  {
    id: 10,
    axis: "SN",
    text: "When describing your work to others, you tend to:",
    optionA: "Focus on specific accomplishments and measurable results",
    optionB: "Paint the big picture and explain the impact of your vision",
  },

  // T/F — Thinking vs Feeling (questions 10-14)
  {
    id: 11,
    axis: "TF",
    text: "When making a difficult decision at work, you rely more on:",
    optionA: "Data, logical analysis, and objective criteria",
    optionB: "Gut feeling, team morale, and how people will be affected",
  },
  {
    id: 12,
    axis: "TF",
    text: "When giving feedback to a colleague, you prioritize:",
    optionA: "Being direct and honest, even if it is uncomfortable",
    optionB: "Being tactful and considering their emotional response",
  },
  {
    id: 13,
    axis: "TF",
    text: "During a disagreement in a meeting, you are more likely to:",
    optionA: "Focus on facts and argue your point logically",
    optionB: "Seek common ground and try to preserve team harmony",
  },
  {
    id: 14,
    axis: "TF",
    text: "When evaluating a team member's performance, you weight:",
    optionA: "Objective metrics: KPIs, deadlines met, output quality",
    optionB: "Collaboration, team spirit, and personal growth trajectory",
  },
  {
    id: 15,
    axis: "TF",
    text: "If a project is falling behind schedule, your first thought is:",
    optionA: "Identify the bottlenecks and reallocate resources efficiently",
    optionB: "Check in with the team to understand challenges and morale",
  },

  // J/P — Judging vs Perceiving (questions 15-19)
  {
    id: 16,
    axis: "JP",
    text: "Your workspace and task list tend to be:",
    optionA: "Well-organized with clear priorities and deadlines",
    optionB: "Flexible and adaptable, reorganized as priorities shift",
  },
  {
    id: 17,
    axis: "JP",
    text: "When a deadline is approaching, you usually:",
    optionA: "Have most of the work done well in advance",
    optionB: "Do your best work under the pressure of the final stretch",
  },
  {
    id: 18,
    axis: "JP",
    text: "When planning a sprint or project phase, you prefer:",
    optionA: "A detailed plan with milestones and checkpoints",
    optionB: "A flexible framework that allows for creative pivots",
  },
  {
    id: 19,
    axis: "JP",
    text: "If an unexpected opportunity arises mid-project, you:",
    optionA: "Stick to the original plan to ensure delivery",
    optionB: "Explore it, as it might lead to a better outcome",
  },
  {
    id: 20,
    axis: "JP",
    text: "Your ideal manager gives you:",
    optionA: "Clear expectations, structured processes, and regular check-ins",
    optionB: "Freedom to explore, minimal oversight, and trust in your process",
  },
];

// ── Personality Type Descriptions ────────────────────────────────────────

const TYPE_DESCRIPTIONS: Record<string, { title: string; description: string; strengths: string[]; growthAreas: string[] }> = {
  INTJ: {
    title: "The Architect",
    description: "Strategic, independent thinkers who see the big picture and drive toward long-term goals. In the workplace, INTJs excel at systems design, strategic planning, and turning complex problems into elegant solutions.",
    strengths: ["Strategic planning", "Systems thinking", "Independent problem-solving", "Long-term vision", "High standards"],
    growthAreas: ["Patience with less efficient processes", "Collaborative communication", "Emotional attunement with teammates"],
  },
  INTP: {
    title: "The Logician",
    description: "Analytical and inventive, INTPs are driven by an insatiable curiosity to understand how things work. They bring innovative solutions and enjoy tackling complex technical challenges.",
    strengths: ["Analytical thinking", "Innovation", "Complex problem-solving", "Objectivity", "Adaptability"],
    growthAreas: ["Follow-through on details", "Meeting deadlines", "Expressing ideas concisely"],
  },
  ENTJ: {
    title: "The Commander",
    description: "Natural-born leaders who are decisive, ambitious, and energized by turning ideas into action. ENTJs thrive in executive roles and enjoy organizing teams toward a shared mission.",
    strengths: ["Leadership", "Strategic execution", "Decisiveness", "Confidence", "Efficiency"],
    growthAreas: ["Listening to dissent", "Patience with slower processes", "Emotional sensitivity"],
  },
  ENTP: {
    title: "The Debater",
    description: "Quick-witted and curious, ENTPs love challenging the status quo and finding creative solutions. They energize teams with their enthusiasm and ability to see multiple angles.",
    strengths: ["Creative problem-solving", "Adaptability", "Quick thinking", "Persuasion", "Brainstorming"],
    growthAreas: ["Follow-through", "Routine tasks", "Sensitivity to others' feelings"],
  },
  INFJ: {
    title: "The Advocate",
    description: "Insightful and principled, INFJs are driven by a deep sense of purpose. They excel at understanding people, mediating conflicts, and building meaningful workplace relationships.",
    strengths: ["Empathy", "Vision", "Written communication", "Conflict resolution", "Mentoring"],
    growthAreas: ["Setting boundaries", "Handling criticism", "Delegating tasks"],
  },
  INFP: {
    title: "The Mediator",
    description: "Creative and compassionate, INFPs bring authenticity and heart to everything they do. They excel in roles requiring empathy, creativity, and a strong moral compass.",
    strengths: ["Creativity", "Empathy", "Writing", "Adaptability", "Authenticity"],
    growthAreas: ["Assertiveness", "Handling conflict directly", "Staying focused on priorities"],
  },
  ENFJ: {
    title: "The Protagonist",
    description: "Charismatic and inspiring, ENFJs are natural mentors who bring out the best in others. They thrive in leadership roles focused on team development and culture building.",
    strengths: ["Team leadership", "Communication", "Mentoring", "Diplomacy", "Motivation"],
    growthAreas: ["Saying no", "Self-care", "Accepting imperfection"],
  },
  ENFP: {
    title: "The Campaigner",
    description: "Enthusiastic and creative, ENFPs bring energy and innovation to teams. They are excellent at generating ideas, building relationships, and inspiring others with their vision.",
    strengths: ["Creativity", "Enthusiasm", "Networking", "Adaptability", "Inspiring others"],
    growthAreas: ["Focus and follow-through", "Detail management", "Routine tasks"],
  },
  ISTJ: {
    title: "The Inspector",
    description: "Reliable, thorough, and methodical, ISTJs are the backbone of any organization. They ensure processes run smoothly, deadlines are met, and quality standards are upheld.",
    strengths: ["Reliability", "Organization", "Attention to detail", "Accountability", "Process management"],
    growthAreas: ["Flexibility with change", "Open-mindedness to new approaches", "Expressing feelings"],
  },
  ISFJ: {
    title: "The Protector",
    description: "Warm, dedicated, and detail-oriented, ISFJs create a supportive and stable work environment. They excel at administrative excellence and remembering important details about colleagues.",
    strengths: ["Supportiveness", "Reliability", "Attention to detail", "Loyalty", "Practical help"],
    growthAreas: ["Asserting own needs", "Adapting to change", "Delegating work"],
  },
  ESTJ: {
    title: "The Executive",
    description: "Organized, decisive, and results-oriented, ESTJs are natural administrators who bring order and efficiency. They set clear expectations and hold themselves and others accountable.",
    strengths: ["Organization", "Decisiveness", "Accountability", "Efficiency", "Clear communication"],
    growthAreas: ["Flexibility", "Emotional awareness", "Patience with ambiguity"],
  },
  ESFJ: {
    title: "The Consul",
    description: "Warm, sociable, and cooperative, ESFJs are the glue that holds teams together. They create harmony, ensure everyone feels included, and manage logistics with ease.",
    strengths: ["Team harmony", "Cooperation", "Event planning", "Practical support", "Communication"],
    growthAreas: ["Handling criticism", "Making tough decisions", "Embracing change"],
  },
  ISTP: {
    title: "The Virtuoso",
    description: "Practical, observant, and hands-on, ISTPs are natural troubleshooters. They excel at analyzing systems, fixing problems, and working independently on technical challenges.",
    strengths: ["Technical skills", "Troubleshooting", "Independence", "Calm under pressure", "Efficiency"],
    growthAreas: ["Long-term planning", "Emotional expression", "Team collaboration"],
  },
  ISFP: {
    title: "The Adventurer",
    description: "Creative, flexible, and attuned to aesthetics, ISFPs bring a unique perspective to their work. They thrive in environments that value individuality and creative expression.",
    strengths: ["Creativity", "Flexibility", "Aesthetic sense", "Empathy", "Hands-on skills"],
    growthAreas: ["Long-term planning", "Assertiveness", "Handling structure"],
  },
  ESTP: {
    title: "The Entrepreneur",
    description: "Bold, energetic, and perceptive, ESTPs thrive in fast-paced environments. They are excellent at reading situations, negotiating deals, and solving problems in real time.",
    strengths: ["Negotiation", "Quick decision-making", "Adaptability", "Networking", "Crisis management"],
    growthAreas: ["Long-term planning", "Patience", "Following through on details"],
  },
  ESFP: {
    title: "The Entertainer",
    description: "Spontaneous, energetic, and people-oriented, ESFPs bring joy and energy to the workplace. They excel at presentations, client-facing roles, and team morale boosting.",
    strengths: ["Presentation skills", "Team morale", "Adaptability", "Networking", "Positive energy"],
    growthAreas: ["Focus on long-term goals", "Detail management", "Working independently"],
  },
};

// ── GET: Return personality test status + result ─────────────────────────

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (user.personalityTestTaken && user.personalityType) {
      const typeInfo = TYPE_DESCRIPTIONS[user.personalityType] || {
        title: user.personalityType,
        description: "Personality type details not available.",
        strengths: [],
        growthAreas: [],
      };

      return jsonOk({
        taken: true,
        personalityType: user.personalityType,
        testDate: user.personalityTestDate,
        testData: user.personalityTestData,
        typeInfo,
        questions: QUESTIONS,
      });
    }

    return jsonOk({
      taken: false,
      questions: QUESTIONS,
    });
  } catch (err: unknown) {
    console.error("Personality test GET error:", err);
    return jsonError("Failed to fetch personality test data", 500);
  }
}

// ── POST: Accept answers, calculate MBTI type, store in DB ───────────────

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { answers } = body;

    // Validate: 20 answers, each "A" or "B"
    if (!answers || !Array.isArray(answers) || answers.length !== 20) {
      return jsonError("Exactly 20 answers are required", 400);
    }

    for (let i = 0; i < answers.length; i++) {
      if (answers[i] !== "A" && answers[i] !== "B") {
        return jsonError(`Answer ${i + 1} must be "A" or "B"`, 400);
      }
    }

    // Score each axis: A = first letter, B = second letter
    // EI: A=E, B=I | SN: A=S, B=N | TF: A=T, B=F | JP: A=J, B=P
    const axisMap: Record<string, { first: string; second: string }> = {
      EI: { first: "E", second: "I" },
      SN: { first: "S", second: "N" },
      TF: { first: "T", second: "F" },
      JP: { first: "J", second: "P" },
    };

    const scores: Record<string, { A: number; B: number }> = {
      EI: { A: 0, B: 0 },
      SN: { A: 0, B: 0 },
      TF: { A: 0, B: 0 },
      JP: { A: 0, B: 0 },
    };

    for (let i = 0; i < 20; i++) {
      const q = QUESTIONS[i];
      const answer = answers[i] as "A" | "B";
      scores[q.axis][answer]++;
    }

    // Determine the 4-letter type
    let personalityType = "";
    const axisResults: Record<string, { winner: string; scoreA: number; scoreB: number }> = {};

    for (const axis of ["EI", "SN", "TF", "JP"]) {
      const { first, second } = axisMap[axis];
      const winner = scores[axis].A >= scores[axis].B ? first : second;
      personalityType += winner;
      axisResults[axis] = {
        winner,
        scoreA: scores[axis].A,
        scoreB: scores[axis].B,
      };
    }

    const typeInfo = TYPE_DESCRIPTIONS[personalityType] || {
      title: personalityType,
      description: "Personality type details not available.",
      strengths: [],
      growthAreas: [],
    };

    // Store in DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        personalityType,
        personalityTestTaken: true,
        personalityTestDate: new Date(),
        personalityTestData: {
          answers,
          scores: axisResults,
          calculatedAt: new Date().toISOString(),
        },
      },
    });

    return jsonOk({
      personalityType,
      typeInfo,
      scores: axisResults,
    });
  } catch (err: unknown) {
    console.error("Personality test POST error:", err);
    return jsonError("Failed to process personality test", 500);
  }
}
