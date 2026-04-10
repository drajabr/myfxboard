import { Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      accountId?: string;
      timestamp?: number;
    }
  }
}

/**
 * Validate HMAC-SHA256 signed ingestion request
 * Authorization header: "HMAC-SHA256 {signature}"
 * X-Signature-Timestamp: unix milliseconds
 * Expected signature over: {account_number}:{timestamp}
 */
export const validateIngestionAuth = async (req: any, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    const timestampHeader = req.headers['x-signature-timestamp'];
    const accountNumber = req.body?.account_number;

    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

    if (!authHeader || !timestamp || accountNumber === undefined || accountNumber === null) {
      return _res.status(401).json({ error: 'Missing authorization, timestamp, or account_number' });
    }

    const [scheme, creds] = authHeader.split(' ');
    if (scheme !== 'HMAC-SHA256' || !creds) {
      return _res.status(401).json({ error: 'Invalid authorization scheme' });
    }

    const signature = creds.trim();
    if (!signature) {
      return _res.status(401).json({ error: 'Invalid credentials format' });
    }

    const timestampMs = parseInt(String(timestamp), 10);
    if (!Number.isFinite(timestampMs)) {
      return _res.status(401).json({ error: 'Invalid timestamp' });
    }

    const nowMs = Date.now();
    const timeDiff = nowMs - timestampMs;

    // 5-second tolerance window
    if (timeDiff > 5000 || timeDiff < -5000) {
      return _res.status(401).json({ error: 'Request timestamp out of window' });
    }

    const sharedSecret = process.env.CONNECTOR_SHARED_SECRET;
    if (!sharedSecret) {
      return _res.status(500).json({ error: 'CONNECTOR_SHARED_SECRET is not configured' });
    }

    // Recompute expected signature
    const normalizedAccountNumber = String(accountNumber).trim();
    const message = `${normalizedAccountNumber}:${timestampMs}`;
    const expectedHmacSignature = crypto.createHmac('sha256', sharedSecret).update(message).digest('hex');

    const hmacMatch = signature.length === expectedHmacSignature.length
      && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmacSignature));

    if (!hmacMatch) {
      return _res.status(401).json({ error: 'Invalid signature' });
    }

    req.accountId = normalizedAccountNumber;
    req.timestamp = timestampMs;
    next();
  } catch (error) {
    console.error('Auth validation error', error);
    _res.status(500).json({ error: 'Auth validation failed' });
  }
};
