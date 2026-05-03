import nodemailer from 'nodemailer';
import { logger } from '../index';

// ─── Create transporter ───────────────────────────────────────────────────────
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    logger.warn('SMTP credentials not configured. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

// ─── Base email template ──────────────────────────────────────────────────────
const baseTemplate = (content: string, title: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; color: #1e293b; }
    .body h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #0f172a; }
    .body p { font-size: 15px; line-height: 1.7; margin: 0 0 16px; color: #475569; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .card .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-bottom: 4px; }
    .card .value { font-size: 15px; color: #1e293b; font-weight: 500; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-urgent { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #ea580c; }
    .badge-medium { background: #fef9c3; color: #ca8a04; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .btn { display: inline-block; padding: 12px 28px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; margin-top: 8px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 13px; color: #94a3b8; margin: 0; }
    .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🧠 MeetingBrain</h1>
      <p>Your AI-powered meeting assistant</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>You're receiving this because you're a member of a MeetingBrain workspace.</p>
      <p style="margin-top:6px;">© ${new Date().getFullYear()} MeetingBrain. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Send email helper ────────────────────────────────────────────────────────
const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn(`Email not sent to ${to} — SMTP not configured`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"MeetingBrain" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    // Non-fatal — don't throw
  }
};

// ─── Task assignment email ────────────────────────────────────────────────────
export const sendTaskAssignmentEmail = async (
  email: string,
  name: string,
  taskTitle: string,
  taskDescription: string,
  deadline: Date | null,
  meetingTitle: string
): Promise<void> => {
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No deadline set';

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const content = `
    <h2>You've been assigned a new task</h2>
    <p>Hi ${name},</p>
    <p>A new task has been assigned to you following a meeting. Here are the details:</p>

    <div class="card">
      <div class="label">Task</div>
      <div class="value" style="font-size:17px; font-weight:600; margin-bottom:16px;">${taskTitle}</div>
      <div class="divider"></div>
      <div class="label">Description</div>
      <div class="value" style="font-weight:400;">${taskDescription}</div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div class="label">From Meeting</div>
          <div class="value">${meetingTitle}</div>
        </div>
        <div>
          <div class="label">Deadline</div>
          <div class="value" style="color: ${deadline && new Date(deadline) < new Date() ? '#dc2626' : '#1e293b'};">
            📅 ${deadlineStr}
          </div>
        </div>
      </div>
    </div>

    <p>Log in to MeetingBrain to view your full task list and update the status as you progress.</p>
    <a href="${appUrl}/tasks" class="btn">View My Tasks →</a>
  `;

  await sendEmail(
    email,
    `📋 New Task Assigned: ${taskTitle}`,
    baseTemplate(content, 'Task Assignment')
  );
};

// ─── Task reminder email ──────────────────────────────────────────────────────
export const sendTaskReminderEmail = async (
  email: string,
  name: string,
  taskTitle: string,
  deadline: Date,
  hoursUntilDeadline: number
): Promise<void> => {
  const isOverdue = hoursUntilDeadline < 0;
  const urgencyText = isOverdue
    ? '⚠️ OVERDUE'
    : hoursUntilDeadline <= 2
    ? '🔴 Due very soon'
    : hoursUntilDeadline <= 24
    ? '🟠 Due today'
    : '🟡 Due tomorrow';

  const deadlineStr = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const content = `
    <h2>Task Reminder ${urgencyText}</h2>
    <p>Hi ${name},</p>
    <p>This is a reminder about a task that ${isOverdue ? 'is overdue' : 'is due soon'}.</p>

    <div class="card">
      <div class="label">Task</div>
      <div class="value" style="font-size:17px; font-weight:600;">${taskTitle}</div>
      <div class="divider"></div>
      <div class="label">Deadline</div>
      <div class="value" style="color:${isOverdue ? '#dc2626' : '#ea580c'}; font-weight:600;">
        📅 ${deadlineStr}
      </div>
      ${
        !isOverdue
          ? `<div style="margin-top:8px; font-size:13px; color:#94a3b8;">
              ${
                hoursUntilDeadline < 1
                  ? `Less than 1 hour remaining`
                  : hoursUntilDeadline < 24
                  ? `${Math.round(hoursUntilDeadline)} hours remaining`
                  : `About ${Math.round(hoursUntilDeadline / 24)} day(s) remaining`
              }
            </div>`
          : ''
      }
    </div>

    <p>Please log in and update the task status or reach out to your team lead if you need an extension.</p>
    <a href="${appUrl}/tasks" class="btn">Go to My Tasks →</a>
  `;

  const subjectLine = isOverdue
    ? `⚠️ OVERDUE: ${taskTitle}`
    : hoursUntilDeadline <= 24
    ? `🔴 Due Today: ${taskTitle}`
    : `🟡 Reminder: ${taskTitle}`;

  await sendEmail(email, subjectLine, baseTemplate(content, 'Task Reminder'));
};

// ─── Workspace invite email ───────────────────────────────────────────────────
export const sendWorkspaceInviteEmail = async (
  email: string,
  name: string,
  workspaceName: string,
  inviterName: string
): Promise<void> => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const content = `
    <h2>You've been invited to a workspace</h2>
    <p>Hi ${name},</p>
    <p><strong>${inviterName}</strong> has added you to the <strong>"${workspaceName}"</strong> workspace on MeetingBrain.</p>

    <div class="card">
      <div class="label">Workspace</div>
      <div class="value" style="font-size:18px; font-weight:600;">${workspaceName}</div>
      <div style="margin-top:8px; font-size:14px; color:#64748b;">Invited by ${inviterName}</div>
    </div>

    <p>You can now participate in meetings, view your assigned tasks, and collaborate with your team.</p>
    <a href="${appUrl}/workspaces" class="btn">View Workspace →</a>
  `;

  await sendEmail(
    email,
    `🎉 You've been added to "${workspaceName}" on MeetingBrain`,
    baseTemplate(content, 'Workspace Invitation')
  );
};

// ─── Meeting summary email (MoM) ─────────────────────────────────────────────
export const sendMeetingSummaryEmail = async (
  email: string,
  name: string,
  meetingTitle: string,
  summary: string,
  decisions: string[],
  taskCount: number,
  meetingId: string
): Promise<void> => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const decisionsHtml = decisions.length
    ? `<ul style="margin:8px 0; padding-left:20px; color:#475569;">
        ${decisions.map((d) => `<li style="margin-bottom:6px;">${d}</li>`).join('')}
       </ul>`
    : '<p style="color:#94a3b8; font-style:italic;">No decisions recorded.</p>';

  const content = `
    <h2>Meeting Summary Available</h2>
    <p>Hi ${name},</p>
    <p>The Minutes of Meeting for <strong>"${meetingTitle}"</strong> are now available.</p>

    <div class="card">
      <div class="label">Summary</div>
      <div class="value" style="font-weight:400; line-height:1.7;">${summary}</div>
    </div>

    <div class="card">
      <div class="label">Key Decisions</div>
      ${decisionsHtml}
    </div>

    ${
      taskCount > 0
        ? `<div class="card">
            <div class="label">Tasks Generated</div>
            <div class="value">${taskCount} task${taskCount !== 1 ? 's' : ''} were assigned from this meeting.</div>
          </div>`
        : ''
    }

    <a href="${appUrl}/meetings/${meetingId}" class="btn">View Full Minutes →</a>
  `;

  await sendEmail(
    email,
    `📝 Meeting Summary: ${meetingTitle}`,
    baseTemplate(content, 'Meeting Summary')
  );
};