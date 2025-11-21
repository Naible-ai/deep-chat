# Security Setup Guide

This guide explains the security features implemented in the Express example server and how to configure them for production use.

## Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your settings in `.env`:**
   ```bash
   # Add your API keys
   OPENAI_API_KEY=sk-...
   HUGGING_FACE_API_KEY=hf_...
   STABILITY_API_KEY=sk-...
   COHERE_API_KEY=...

   # Set allowed origins (comma-separated)
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

   # Set environment
   NODE_ENV=production
   PORT=8080
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start server:**
   ```bash
   npm start
   ```

## Security Features

### 1. Security Headers (Helmet.js)

Automatically adds security headers to all responses:

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Strict-Transport-Security` - Forces HTTPS
- `Content-Security-Policy` - Prevents XSS and injection attacks

**Configuration:** `src/app.ts:23-34`

### 2. CORS Protection

Restricts which domains can access your API.

**Development:**
```bash
ALLOWED_ORIGINS=*  # Allows all origins (development only)
```

**Production:**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Configuration:** `src/app.ts:36-44`

### 3. Rate Limiting

Prevents abuse by limiting requests per IP address.

**Default:** 100 requests per 15 minutes per IP

**Customize:**
```typescript
// src/app.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window
  max: 100, // Max requests per window
  message: 'Too many requests',
});
```

**Configuration:** `src/app.ts:46-53`

### 4. Request Size Limits

Prevents DoS attacks via large payloads.

**Limits:**
- JSON body: 10MB max
- URL-encoded body: 10MB max

**Configuration:** `src/app.ts:56-58`

### 5. File Upload Protection

Secure file upload handling with restrictions.

**Limits:**
- Max file size: 10MB per file
- Max files: 5 per request
- Allowed types: images, audio, PDF

**Customize:**
```typescript
// src/app.ts:60-84
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    // Add or remove MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      // ...add more
    ];
    // ...
  },
});
```

### 6. Input Validation

Validates and sanitizes user input.

**Usage:**
```typescript
import {validateChatRequest} from './middleware/validation';

app.post('/chat', validateChatRequest, chatHandler);
```

**Features:**
- Array size validation (1-100 messages)
- Text length limits (max 10,000 characters)
- Role validation (user, ai, assistant)
- Model name validation
- HTML sanitization

**Configuration:** `src/middleware/validation.ts`

## Production Deployment

### Required Configuration

1. **Set environment to production:**
   ```bash
   NODE_ENV=production
   ```

2. **Configure specific CORS origins:**
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

3. **Enable HTTPS:**
   ```typescript
   // Add to src/app.ts
   import https from 'https';
   import fs from 'fs';

   const options = {
     key: fs.readFileSync('path/to/private-key.pem'),
     cert: fs.readFileSync('path/to/certificate.pem'),
   };

   https.createServer(options, app).listen(443);
   ```

### Recommended Enhancements

1. **Add Authentication:**
   ```typescript
   import jwt from 'jsonwebtoken';

   function authenticateToken(req, res, next) {
     const token = req.headers['authorization']?.split(' ')[1];
     if (!token) return res.status(401).json({error: 'Unauthorized'});

     jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
       if (err) return res.status(403).json({error: 'Forbidden'});
       req.user = user;
       next();
     });
   }

   app.post('/chat', authenticateToken, chatHandler);
   ```

2. **Add Logging:**
   ```bash
   npm install winston
   ```

   ```typescript
   import winston from 'winston';

   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({filename: 'error.log', level: 'error'}),
       new winston.transports.File({filename: 'combined.log'}),
     ],
   });
   ```

3. **Implement Caching:**
   ```bash
   npm install redis
   ```

4. **Add Monitoring:**
   ```bash
   npm install @sentry/node
   ```

## API Key Management

### Development

Store keys in `.env` file (never commit this file):
```bash
OPENAI_API_KEY=sk-dev-123456789...
```

### Production

Use a secrets management service:

**AWS Secrets Manager:**
```typescript
import {SecretsManager} from 'aws-sdk';

const secretsManager = new SecretsManager();
const secret = await secretsManager
  .getSecretValue({SecretId: 'openai-api-key'})
  .promise();
process.env.OPENAI_API_KEY = secret.SecretString;
```

**HashiCorp Vault:**
```bash
vault kv get -field=key secret/openai
```

## Testing Security

### Run Security Audit
```bash
npm audit
```

### Test CORS
```bash
curl -H "Origin: http://unauthorized-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:8080/chat
```

### Test Rate Limiting
```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl -X POST http://localhost:8080/chat \
       -H "Content-Type: application/json" \
       -d '{"messages":[{"text":"test","role":"user"}]}'
done
```

### Test File Upload Limits
```bash
# Test with large file (should fail)
dd if=/dev/zero of=test.bin bs=1M count=11
curl -X POST http://localhost:8080/files \
     -F "files=@test.bin"
```

## Security Checklist

Before deploying to production:

- [ ] Environment set to `production`
- [ ] CORS configured with specific origins
- [ ] HTTPS/TLS enabled
- [ ] API keys in secure vault
- [ ] Authentication implemented
- [ ] Logging and monitoring configured
- [ ] Error messages sanitized
- [ ] Input validation applied to all endpoints
- [ ] Rate limiting tested
- [ ] File upload restrictions tested
- [ ] Security headers verified
- [ ] Dependencies updated (`npm audit`)

## Troubleshooting

### CORS Errors

**Error:** "Access to fetch at '...' has been blocked by CORS policy"

**Solution:** Add your frontend domain to `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Rate Limit Errors

**Error:** "Too many requests from this IP"

**Solution:** Adjust rate limit or wait for window to reset:
```typescript
// Increase limit for production
max: 1000, // Instead of 100
```

### File Upload Errors

**Error:** "Invalid file type"

**Solution:** Add file MIME type to allowed list:
```typescript
const allowedMimes = [
  'image/jpeg',
  'your/mimetype', // Add this
];
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

## Support

For security concerns, see the main [SECURITY.md](../../../SECURITY.md) file in the project root.
