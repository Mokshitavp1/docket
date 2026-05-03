import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../index';
import { logger } from '../index';
import { TaskPriority } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
}

interface ExtractedTask {
  title: string;
  description: string;
  assigneeName: string | null;
  assigneeId: string | null;
  deadline: string | null;
  priority: TaskPriority;
}

interface ExtractedMoM {
  title: string;
  summary: string;
  decisions: string[];
  nextSteps: string[];
  attendees: string[];
  agenda: string;
}

interface AIProcessingResult {
  tasks: ExtractedTask[];
  mom: ExtractedMoM;
}

// ─── Match extracted name to workspace member ─────────────────────────────────
const matchNameToMember = (
  name: string | null,
  members: WorkspaceMember[]
): string | null => {
  if (!name) return null;

  const normalizedName = name.toLowerCase().trim();

  // Exact match first
  const exactMatch = members.find(
    (m) => m.name.toLowerCase() === normalizedName
  );
  if (exactMatch) return exactMatch.id;

  // Partial match (first name or last name)
  const partialMatch = members.find((m) => {
    const parts = m.name.toLowerCase().split(' ');
    return parts.some((part) => part === normalizedName || normalizedName.includes(part));
  });

  return partialMatch?.id || null;
};

// ─── Parse priority from AI output ───────────────────────────────────────────
const parsePriority = (priority: string): TaskPriority => {
  const map: Record<string, TaskPriority> = {
    low: TaskPriority.LOW,
    medium: TaskPriority.MEDIUM,
    high: TaskPriority.HIGH,
    urgent: TaskPriority.URGENT,
  };
  return map[priority?.toLowerCase()] || TaskPriority.MEDIUM;
};

// ─── Parse deadline string to ISO date ───────────────────────────────────────
const parseDeadline = (deadlineStr: string | null): string | null => {
  if (!deadlineStr) return null;

  try {
    // Handle relative dates like "Friday", "next Monday", "end of week"
    const now = new Date();
    const lower = deadlineStr.toLowerCase().trim();

    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    // Check for day names
    for (const [day, dayNum] of Object.entries(dayMap)) {
      if (lower.includes(day)) {
        const currentDay = now.getDay();
        let daysUntil = dayNum - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const deadline = new Date(now);
        deadline.setDate(now.getDate() + daysUntil);
        deadline.setHours(17, 0, 0, 0); // 5 PM
        return deadline.toISOString();
      }
    }

    // Handle "end of week"
    if (lower.includes('end of week') || lower.includes('eow')) {
      const friday = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
      friday.setDate(now.getDate() + daysUntilFriday);
      friday.setHours(17, 0, 0, 0);
      return friday.toISOString();
    }

    // Handle "end of month" or "eom"
    if (lower.includes('end of month') || lower.includes('eom')) {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(17, 0, 0, 0);
      return endOfMonth.toISOString();
    }

    // Handle "tomorrow"
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      return tomorrow.toISOString();
    }

    // Handle "next week"
    if (lower.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      nextWeek.setHours(17, 0, 0, 0);
      return nextWeek.toISOString();
    }

    // Handle "in X days/weeks"
    const inDaysMatch = lower.match(/in (\d+) days?/);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const future = new Date(now);
      future.setDate(now.getDate() + days);
      future.setHours(17, 0, 0, 0);
      return future.toISOString();
    }

    const inWeeksMatch = lower.match(/in (\d+) weeks?/);
    if (inWeeksMatch) {
      const weeks = parseInt(inWeeksMatch[1]);
      const future = new Date(now);
      future.setDate(now.getDate() + weeks * 7);
      future.setHours(17, 0, 0, 0);
      return future.toISOString();
    }

    // Try direct date parse
    const parsed = new Date(deadlineStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return null;
  } catch {
    return null;
  }
};

// ─── Main AI processing function ──────────────────────────────────────────────
export const processTranscript = async (
  transcript: string,
  meetingTitle: string,
  workspaceMembers: WorkspaceMember[],
  meetingId: string
): Promise<AIProcessingResult> => {
  logger.info(`Processing transcript for meeting: ${meetingId}`);

  const membersList = workspaceMembers
    .map((m) => `- ${m.name} (${m.email})`)
    .join('\n');

  const prompt = `You are an expert meeting assistant. Analyze the following meeting transcript and extract structured information.

Meeting Title: ${meetingTitle}
Meeting Date: ${new Date().toISOString().split('T')[0]}

Workspace Members (these are the only people who can be assigned tasks):
${membersList}

Transcript:
"""
${transcript}
"""

Your task is to extract:
1. All action items and tasks mentioned (explicit and implicit)
2. Who is responsible for each task (must be from the members list above)
3. Deadlines mentioned for each task
4. A complete Minutes of Meeting

Respond ONLY with a valid JSON object in this exact format:
{
  "tasks": [
    {
      "title": "Short, clear task title (max 100 chars)",
      "description": "Detailed description of what needs to be done, including context from the meeting",
      "assigneeName": "Full name as mentioned in transcript, or null if unassigned",
      "deadline": "Deadline as mentioned (e.g., 'Friday', 'next Monday', 'end of week', or null)",
      "priority": "low|medium|high|urgent"
    }
  ],
  "mom": {
    "title": "Minutes of Meeting: ${meetingTitle}",
    "summary": "2-3 paragraph comprehensive summary of the entire meeting",
    "decisions": ["List of key decisions made during the meeting"],
    "nextSteps": ["List of next steps agreed upon"],
    "attendees": ["Names of people who spoke or were mentioned"],
    "agenda": "Main topics discussed in the meeting"
  }
}

Rules:
- Extract ALL tasks, even implicit ones ("we need to...", "someone should...", "let's make sure...")
- For priority: urgent = must be done today/tomorrow, high = this week, medium = this month, low = no urgency
- Be specific and detailed in task descriptions — include context so the assignee understands exactly what to do
- If a deadline is mentioned, capture it exactly as said
- Decisions should be concrete outcomes agreed upon
- Do NOT include any text outside the JSON object`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI');
    }

    // Parse JSON response
    let parsed: {
      tasks: Array<{
        title: string;
        description: string;
        assigneeName: string | null;
        deadline: string | null;
        priority: string;
      }>;
      mom: ExtractedMoM;
    };

    try {
      // Strip any potential markdown code fences
      const cleanJson = content.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      logger.error('Failed to parse AI response as JSON', { response: content.text });
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // Match assignee names to actual user IDs
    const tasks: ExtractedTask[] = parsed.tasks.map((task) => ({
      title: task.title,
      description: task.description,
      assigneeName: task.assigneeName,
      assigneeId: matchNameToMember(task.assigneeName, workspaceMembers),
      deadline: parseDeadline(task.deadline),
      priority: parsePriority(task.priority),
    }));

    // Save tasks to database
    const userId = workspaceMembers[0]?.id; // Fallback creator

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { hostId: true },
    });

    const createdById = meeting?.hostId || userId;

    if (createdById) {
      // Save all tasks
      await prisma.task.createMany({
        data: tasks.map((task) => ({
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          deadline: task.deadline ? new Date(task.deadline) : null,
          priority: task.priority,
          meetingId,
          createdById,
        })),
      });

      // Save Minutes of Meeting
      await prisma.minutesOfMeeting.create({
        data: {
          title: parsed.mom.title,
          date: new Date(),
          summary: parsed.mom.summary,
          decisions: parsed.mom.decisions,
          nextSteps: parsed.mom.nextSteps,
          attendees: parsed.mom.attendees,
          agenda: parsed.mom.agenda,
          rawContent: transcript,
          meetingId,
        },
      });
    }

    logger.info(`AI processing complete: ${tasks.length} tasks extracted for meeting ${meetingId}`);

    return {
      tasks,
      mom: parsed.mom,
    };
  } catch (error) {
    logger.error('AI processing error:', error);
    throw error;
  }
};

// ─── Generate MoM from confirmed tasks ───────────────────────────────────────
export const regenerateMoM = async (
  meetingId: string,
  transcript: string,
  meetingTitle: string
): Promise<void> => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate a professional Minutes of Meeting document for the following meeting.

Meeting Title: ${meetingTitle}
Date: ${new Date().toLocaleDateString()}

Transcript:
"""
${transcript}
"""

Return ONLY a JSON object:
{
  "summary": "Comprehensive 2-3 paragraph summary",
  "decisions": ["key decision 1", "key decision 2"],
  "nextSteps": ["next step 1", "next step 2"],
  "attendees": ["name1", "name2"],
  "agenda": "Topics covered"
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return;

    const cleanJson = content.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    await prisma.minutesOfMeeting.upsert({
      where: { meetingId },
      update: {
        summary: parsed.summary,
        decisions: parsed.decisions,
        nextSteps: parsed.nextSteps,
        attendees: parsed.attendees,
        agenda: parsed.agenda,
      },
      create: {
        title: `Minutes of Meeting: ${meetingTitle}`,
        date: new Date(),
        summary: parsed.summary,
        decisions: parsed.decisions,
        nextSteps: parsed.nextSteps,
        attendees: parsed.attendees,
        agenda: parsed.agenda,
        rawContent: transcript,
        meetingId,
      },
    });
  } catch (error) {
    logger.error('Failed to regenerate MoM:', error);
  }
};