import { google } from 'googleapis';
import { logger } from '../index';
import { prisma } from '../index';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/callback';

// ─── Create OAuth2 client ─────────────────────────────────────────────────────
export const createOAuthClient = () => {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
};

// ─── Generate Google OAuth URL ────────────────────────────────────────────────
export const getGoogleAuthUrl = (userId: string): string => {
  const oauth2Client = createOAuthClient();

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId,
    prompt: 'consent',
  });
};

// ─── Exchange auth code for tokens ───────────────────────────────────────────
export const exchangeCodeForTokens = async (
  code: string,
  userId: string
): Promise<void> => {
  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarToken: JSON.stringify(tokens),
      },
    });

    logger.info(`Google Calendar connected for user: ${userId}`);
  } catch (error) {
    logger.error('Failed to exchange Google OAuth code:', error);
    throw new Error('Failed to connect Google Calendar. Please try again.');
  }
};

// ─── Get authenticated calendar client ───────────────────────────────────────
const getCalendarClient = async (tokenString: string) => {
  const oauth2Client = createOAuthClient();
  const tokens = JSON.parse(tokenString);
  oauth2Client.setCredentials(tokens);

  // Auto-refresh token if needed
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      const merged = { ...tokens, ...newTokens };
      // In a real app, update the user's token in DB here
      logger.info('Google token refreshed');
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

// ─── Add task deadline to Google Calendar ────────────────────────────────────
export const addTaskToCalendar = async (
  tokenString: string,
  taskTitle: string,
  taskDescription: string,
  deadline: Date
): Promise<string | null> => {
  try {
    const calendar = await getCalendarClient(tokenString);

    const startTime = new Date(deadline);
    startTime.setHours(9, 0, 0, 0); // Start at 9 AM

    const endTime = new Date(deadline);
    endTime.setHours(10, 0, 0, 0); // 1 hour block

    const event = {
      summary: `📋 Task Due: ${taskTitle}`,
      description: `${taskDescription}\n\nThis task was assigned via MeetingBrain.`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },  // 1 day before
          { method: 'popup', minutes: 60 },         // 1 hour before
        ],
      },
      colorId: '11', // Tomato red for tasks
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    const eventId = response.data.id || null;
    logger.info(`Calendar event created: ${eventId}`);
    return eventId;
  } catch (error) {
    logger.error('Failed to add task to calendar:', error);
    return null; // Non-fatal
  }
};

// ─── Update calendar event ────────────────────────────────────────────────────
export const updateCalendarEvent = async (
  tokenString: string,
  eventId: string,
  taskTitle: string,
  taskDescription: string,
  deadline: Date
): Promise<void> => {
  try {
    const calendar = await getCalendarClient(tokenString);

    const startTime = new Date(deadline);
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date(deadline);
    endTime.setHours(10, 0, 0, 0);

    await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: `📋 Task Due: ${taskTitle}`,
        description: taskDescription,
        start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      },
    });

    logger.info(`Calendar event updated: ${eventId}`);
  } catch (error) {
    logger.error('Failed to update calendar event:', error);
  }
};

// ─── Delete calendar event ────────────────────────────────────────────────────
export const deleteCalendarEvent = async (
  tokenString: string,
  eventId: string
): Promise<void> => {
  try {
    const calendar = await getCalendarClient(tokenString);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
    logger.info(`Calendar event deleted: ${eventId}`);
  } catch (error) {
    logger.error('Failed to delete calendar event:', error);
  }
};

// ─── Add MoM meeting to calendar ─────────────────────────────────────────────
export const addMeetingToCalendar = async (
  tokenString: string,
  meetingTitle: string,
  meetingDescription: string,
  startTime: Date,
  endTime: Date,
  attendeeEmails: string[]
): Promise<string | null> => {
  try {
    const calendar = await getCalendarClient(tokenString);

    const event = {
      summary: `🧠 ${meetingTitle}`,
      description: meetingDescription,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: attendeeEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    return response.data.id || null;
  } catch (error) {
    logger.error('Failed to add meeting to calendar:', error);
    return null;
  }
};

// ─── List upcoming calendar events ───────────────────────────────────────────
export const getUpcomingEvents = async (
  tokenString: string,
  maxResults: number = 10
): Promise<any[]> => {
  try {
    const calendar = await getCalendarClient(tokenString);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    logger.error('Failed to fetch calendar events:', error);
    return [];
  }
};

// ─── Revoke Google Calendar access ───────────────────────────────────────────
export const revokeCalendarAccess = async (userId: string): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarToken: true },
    });

    if (user?.googleCalendarToken) {
      const oauth2Client = createOAuthClient();
      const tokens = JSON.parse(user.googleCalendarToken);
      oauth2Client.setCredentials(tokens);

      if (tokens.access_token) {
        await oauth2Client.revokeToken(tokens.access_token);
      }

      await prisma.user.update({
        where: { id: userId },
        data: { googleCalendarToken: null },
      });

      logger.info(`Google Calendar access revoked for user: ${userId}`);
    }
  } catch (error) {
    logger.error('Failed to revoke calendar access:', error);
    throw new Error('Failed to disconnect Google Calendar.');
  }
};