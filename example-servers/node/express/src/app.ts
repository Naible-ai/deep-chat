import express, {Express, NextFunction, Request, Response} from 'express';
import {HuggingFace} from './services/huggingFace';
import {StabilityAI} from './services/stabilityAI';
import {ErrorUtils} from './utils/errorUtils';
import {Custom} from './services/custom';
import {OpenAI} from './services/openAI';
import {Cohere} from './services/cohere';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';

// ------------------ SETUP ------------------

dotenv.config();

const app: Express = express();
const port = 8080;

// ------------------ SECURITY MIDDLEWARE ------------------

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - restrict to specific origins in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser with size limits
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

// File upload configuration with limits and validation
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5, // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, audio, and PDF files are allowed.'));
    }
  },
});

// ------------------ CUSTOM API ------------------

app.post('/chat', async (req: Request, res: Response) => {
  Custom.chat(req.body, res);
});

app.post('/chat-stream', async (req: Request, res: Response) => {
  Custom.chatStream(req.body, res);
});

app.post('/files', upload.array('files'), async (req: Request, res: Response) => {
  Custom.files(req, res);
});

// ------------------ OPENAI API ------------------

app.post('/openai-chat', async (req: Request, res: Response, next: NextFunction) => {
  OpenAI.chat(req.body, res, next);
});

app.post('/openai-chat-stream', async (req: Request, res: Response, next: NextFunction) => {
  OpenAI.chatStream(req.body, res, next);
});

app.post('/openai-image', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  OpenAI.imageVariation(req, res, next);
});

// ------------------ HUGGING FACE API ------------------

app.post('/huggingface-conversation', async (req: Request, res: Response, next: NextFunction) => {
  HuggingFace.conversation(req.body, res, next);
});

app.post('/huggingface-image', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  HuggingFace.imageClassification(req, res, next);
});

app.post('/huggingface-speech', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  HuggingFace.speechRecognition(req, res, next);
});

// ------------------ STABILITY AI API ------------------

app.post('/stability-text-to-image', async (req: Request, res: Response, next: NextFunction) => {
  StabilityAI.textToImage(req.body, res, next);
});

app.post('/stability-image-to-image', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  StabilityAI.imageToImage(req, res, next);
});

app.post('/stability-image-upscale', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
  StabilityAI.imageToImageUpscale(req, res, next);
});

// ------------------ Cohere API ------------------

app.post('/cohere-chat', async (req: Request, res: Response, next: NextFunction) => {
  Cohere.chat(req.body, res, next);
});

app.post('/cohere-generate', async (req: Request, res: Response, next: NextFunction) => {
  Cohere.generateText(req.body, res, next);
});

app.post('/cohere-summarize', async (req: Request, res: Response, next: NextFunction) => {
  Cohere.summarizeText(req.body, res, next);
});

// ------------------ START SERVER ------------------

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// ------------------ ERROR HANDLER ------------------

app.use(ErrorUtils.handle);
