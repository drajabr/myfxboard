import { Response, NextFunction } from 'express';
import crypto from 'crypto';

const DEFAULT_ALLOWED_TIMESTAMP_DRIFT_MS = 180000;

const resolveAllowedTimestampDriftMs = (): number => {
  const configured = Number(process.env.INGEST_ALLOWED_TIMESTAMP_DRIFT_MS);
  if (Number.isFinite(configured) && configured >= 0) {
    return configured;
  }
  return DEFAULT_ALLOWED_TIMESTAMP_DRIFT_MS;
};

const resolveSourceIp = (req: any) => {
  const forwardedForHeader = req.headers?.['x-forwarded-for'];
  const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;
  return String(forwardedFor || req.ip || req.socket?.remoteAddress || '-').trim();
};

const logAuthReject = (req: any, reason: string, details?: string) => {
  const accountNumber = String(req.body?.account_number || '').trim() || '-';
  const message = `[INGEST][AUTH] reject reason=${reason} account=${accountNumber} ip=${resolveSourceIp(req)} path=${req.path || '-'}${details ? ` ${details}` : ''}`;
  console.warn(message);
};

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
    const allowedTimestampDriftMs = resolveAllowedTimestampDriftMs();
    const authHeader = req.headers.authorization || '';
    const timestampHeader = req.headers['x-signature-timestamp'];
    const accountNumber = req.body?.account_number;

    const timestamp = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;

    if (!authHeader || !timestamp || accountNumber === undefined || accountNumber === null) {
      logAuthReject(req, 'missing_fields');
      return _res.status(401).json({ error: 'Missing authorization, timestamp, or account_number' });
    }

    const [scheme, creds] = authHeader.split(' ');
    if (scheme !== 'HMAC-SHA256' || !creds) {
      logAuthReject(req, 'invalid_scheme', `scheme=${String(scheme || '-')}`);
      return _res.status(401).json({ error: 'Invalid authorization scheme' });
    }

    const signature = creds.trim();
    if (!signature) {
      logAuthReject(req, 'empty_signature');
      return _res.status(401).json({ error: 'Invalid credentials format' });
    }

    const timestampMs = parseInt(String(timestamp), 10);
    if (!Number.isFinite(timestampMs)) {
      logAuthReject(req, 'invalid_timestamp_format', `timestamp=${String(timestamp)}`);
      return _res.status(401).json({ error: 'Invalid timestamp' });
    }

    const nowMs = Date.now();
    const timeDiff = nowMs - timestampMs;

    // Accept moderate connector clock drift to avoid false 401s.
    if (timeDiff > allowedTimestampDriftMs || timeDiff < -allowedTimestampDriftMs) {
      logAuthReject(req, 'timestamp_out_of_window', `diff_ms=${timeDiff} allowed_ms=${allowedTimestampDriftMs} now_ms=${nowMs} ts_ms=${timestampMs}`);
      return _res.status(401).json({ error: 'Request timestamp out of window' });
    }

    const sharedSecret = process.env.CONNECTOR_SHARED_SECRET;
    if (!sharedSecret) {
      console.error('[INGEST][AUTH] reject reason=missing_shared_secret path=', req.path || '-');
      return _res.status(500).json({ error: 'CONNECTOR_SHARED_SECRET is not configured' });
    }

    // Recompute expected signature
    const normalizedAccountNumber = String(accountNumber).trim();
    const message = `${normalizedAccountNumber}:${timestampMs}`;
    const expectedHmacSignature = crypto.createHmac('sha256', sharedSecret).update(message).digest('hex');

    const hmacMatch = signature.length === expectedHmacSignature.length
      && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmacSignature));

    if (!hmacMatch) {
      logAuthReject(req, 'invalid_signature', `ts_ms=${timestampMs}`);
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
