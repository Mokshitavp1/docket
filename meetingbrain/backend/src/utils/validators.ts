import { body, param, query, ValidationChain } from 'express-validator';

// ─── Auth validators ──────────────────────────────────────────────────────────
export const registerValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters.')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters.'),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];

export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
];

export const changePasswordValidator: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required.'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required.')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number.')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password.');
      }
      return true;
    }),
];

// ─── Workspace validators ─────────────────────────────────────────────────────
export const createWorkspaceValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Workspace name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Workspace name must be between 2 and 100 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters.'),
];

export const updateWorkspaceValidator: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Workspace name must be between 2 and 100 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters.'),
];

export const inviteMemberValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER.'),
];

export const updateMemberRoleValidator: ValidationChain[] = [
  body('role')
    .notEmpty()
    .withMessage('Role is required.')
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER.'),

  param('memberId')
    .notEmpty()
    .withMessage('Member ID is required.')
    .isString()
    .withMessage('Invalid member ID.'),
];

// ─── Meeting validators ───────────────────────────────────────────────────────
export const createMeetingValidator: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Meeting title is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters.'),

  body('workspaceId')
    .trim()
    .notEmpty()
    .withMessage('Workspace ID is required.')
    .isString()
    .withMessage('Invalid workspace ID.'),
];

export const updateMeetingValidator: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters.'),

  body('transcript')
    .optional()
    .isString()
    .withMessage('Transcript must be a string.'),
];

export const transcriptValidator: ValidationChain[] = [
  body('transcript')
    .trim()
    .notEmpty()
    .withMessage('Transcript is required.')
    .isLength({ min: 10 })
    .withMessage('Transcript is too short to process.')
    .isLength({ max: 500000 })
    .withMessage('Transcript exceeds maximum allowed length.'),

  body('meetingId')
    .trim()
    .notEmpty()
    .withMessage('Meeting ID is required.')
    .isString()
    .withMessage('Invalid meeting ID.'),
];

// ─── Task validators ──────────────────────────────────────────────────────────
export const createTaskValidator: ValidationChain[] = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Task description is required.')
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters.'),

  body('meetingId')
    .trim()
    .notEmpty()
    .withMessage('Meeting ID is required.')
    .isString()
    .withMessage('Invalid meeting ID.'),

  body('assigneeId')
    .optional()
    .isString()
    .withMessage('Invalid assignee ID.'),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date (ISO 8601 format).')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Deadline cannot be in the past.');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT.'),
];

export const updateTaskValidator: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters.'),

  body('assigneeId')
    .optional()
    .isString()
    .withMessage('Invalid assignee ID.'),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid date (ISO 8601 format).'),

  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT.'),

  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .withMessage('Status must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED.'),
];

export const confirmTasksValidator: ValidationChain[] = [
  body('tasks')
    .isArray({ min: 1 })
    .withMessage('Tasks must be a non-empty array.'),

  body('tasks.*.id')
    .notEmpty()
    .withMessage('Each task must have an ID.')
    .isString()
    .withMessage('Task ID must be a string.'),

  body('tasks.*.title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task title must be between 2 and 200 characters.'),

  body('tasks.*.deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date.'),

  body('tasks.*.assigneeId')
    .optional()
    .isString()
    .withMessage('Invalid assignee ID.'),
];

// ─── Param validators ─────────────────────────────────────────────────────────
export const idParamValidator = (paramName: string): ValidationChain =>
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required.`)
    .isString()
    .withMessage(`Invalid ${paramName}.`);

// ─── Pagination validators ────────────────────────────────────────────────────
export const paginationValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100.')
    .toInt(),
];