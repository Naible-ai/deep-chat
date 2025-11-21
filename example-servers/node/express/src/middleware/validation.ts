import {Request, Response, NextFunction} from 'express';
import {body, validationResult} from 'express-validator';

/**
 * Validation middleware for chat requests
 */
export const validateChatRequest = [
  body('messages')
    .isArray({min: 1, max: 100})
    .withMessage('Messages must be an array with 1-100 items'),
  body('messages.*.text')
    .optional()
    .isString()
    .trim()
    .isLength({max: 10000})
    .withMessage('Message text must be a string with max 10000 characters'),
  body('messages.*.role')
    .optional()
    .isIn(['user', 'ai', 'assistant'])
    .withMessage('Role must be user, ai, or assistant'),
  body('model')
    .optional()
    .isString()
    .trim()
    .isLength({max: 100})
    .withMessage('Model must be a string with max 100 characters'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({error: 'Validation error', details: errors.array()});
    }
    next();
  },
];

/**
 * Sanitize HTML to prevent XSS attacks
 * Note: For production use, consider using DOMPurify or similar library
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Basic HTML entity encoding to prevent XSS
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file uploads
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({error: 'No files uploaded'});
  }

  // Additional validation beyond multer
  for (const file of files) {
    // Check file size again (belt and suspenders)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({error: 'File size exceeds 10MB limit'});
    }

    // Validate filename - prevent path traversal
    if (file.originalname.includes('..') || file.originalname.includes('/')) {
      return res.status(400).json({error: 'Invalid filename'});
    }
  }

  next();
}

/**
 * Validate environment variables are set
 */
export function validateApiKey(keyName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = process.env[keyName];
    if (!apiKey) {
      return res.status(500).json({
        error: `${keyName} environment variable is not set. Please configure it in .env file.`,
      });
    }
    next();
  };
}
