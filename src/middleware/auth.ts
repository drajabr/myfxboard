import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { accountQueries } from '../db/queries.js';

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
 * Authorization header: "HMAC-SHA256 {account_id}:{signature}"
 * X-Signature-Timestamp: unix milliseconds
 * Expected signature over: {account_id}:{timestamp}
 */
export const validateIngestionAuth = async (req: any, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    const timestamp = req.headers['x-signature-timestamp'];

    if (!authHeader || !timestamp) {
      return _res.status(401).json({ error: 'Missing authorization or timestamp header' });
    }

    const [scheme, creds] = authHeader.split(' ');
    if (scheme !== 'HMAC-SHA256' || !creds) {
      return _res.status(401).json({ error: 'Invalid authorization scheme' });
    }

    const [accountId, signature] = creds.split(':');
    if (!accountId || !signature) {
      return _res.status(401).json({ error: 'Invalid credentials format' });
    }

    const timestampMs = parseInt(timestamp, 10);
    const nowMs = Date.now();
    const timeDiff = nowMs - timestampMs;

    // 5-second tolerance window
    if (timeDiff > 5000 || timeDiff < -5000) {
      return _res.status(401).json({ error: 'Request timestamp out of window' });
    }

    // Fetch account and verify secret
    const account = await accountQueries.findById(accountId);
    if (!account) {
      return _res.status(404).json({ error: 'Account not found' });
    }

    // Recompute expected signature
    const message = `${accountId}:${timestampMs}`;
    const expectedSignature = crypto.createHmac('sha256', account.secret_hash).update(message).digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return _res.status(401).json({ error: 'Invalid signature' });
    }

    req.accountId = accountId;
    req.timestamp = timestampMs;
    next();
  } catch (error) {
    console.error('Auth validation error', error);
    _res.status(500).json({ error: 'Auth validation failed' });
  }
};

/**
 * Validate unlock token for settings endpoints
 * Bearer token in Authorization header
 */
export const validateUnlockToken = async (req: any, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/Bearer\s+(\S+)/);

    if (!match || !match[1]) {
      // Settings are readonly, allow but mark as locked
      req.unlocked = false;
      return next();
    }

    // TODO: Validate token against database unlock_sessions table
    req.unlocked = true;
    next();
  } catch (error) {
    console.error('Unlock token validation error', error);
    req.unlocked = false;
    next();
  }
};

export const requireUnlocked = (_req: any, _res: Response, next: NextFunction) => {
  if (!_req.unlocked) {
    return _res.status(403).json({ error: 'Settings locked. Unlock required.' });
  }
  next();
};
