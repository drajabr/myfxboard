import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validateRequestBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      res.status(400).json({ error: 'Invalid request body' });
    }
  };
};

export const validateQueryParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
};

// Validation schemas for ingestion payload
export const ingestPayloadSchema = z.object({
  positions: z.array(z.object({
    symbol: z.string(),
    volume: z.number().positive(),
    open_price: z.number(),
    avg_sl: z.number().nullable(),
    avg_tp: z.number().nullable(),
    open_time_ms: z.number(),
    pnl: z.number(),
  })),
  closed_trades: z.array(z.object({
    symbol: z.string(),
    volume: z.number().positive(),
    entry: z.number(),
    exit: z.number(),
    profit: z.number(),
    entry_time_ms: z.number(),
    exit_time_ms: z.number(),
    duration_sec: z.number(),
    method: z.string(),
  })),
  account: z.object({
    equity: z.number(),
    balance: z.number(),
    margin_used: z.number(),
  }),
  sync_id: z.string().uuid(),
  ea_latest_closed_time_ms: z.number(),
  ea_latest_closed_deal_id: z.string(),
  open_positions_hash: z.string(),
});

export const createAccountSchema = z.object({
  account_id: z.string().min(3).max(50),
  secret_key: z.string().min(16),
  account_name: z.string().max(100),
});

export const rotateSecretSchema = z.object({
  new_secret_key: z.string().min(16),
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  refresh_interval_ms: z.number().min(1000).max(60000).optional(),
  account_nickname: z.string().max(100).optional(),
});
