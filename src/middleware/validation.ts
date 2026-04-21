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
  account_number: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'account_number is required',
  }),
  positions: z.array(z.object({
    symbol: z.string(),
    volume: z.number().positive().finite(),
    size_units: z.number().finite().optional(),
    contract_size: z.number().positive().finite().optional(),
    direction: z.enum(['BUY', 'SELL']),
    open_price: z.number().finite(),
    current_price: z.number().finite().optional(),
    avg_sl: z.number().finite().nullable(),
    avg_tp: z.number().finite().nullable(),
    tick_size: z.number().finite().optional(),
    tick_value: z.number().finite().optional(),
    margin: z.number().finite().optional(),
    open_time_ms: z.number().finite(),
    pnl: z.number().finite(),
  })),
  closed_trades: z.array(z.object({
    symbol: z.string(),
    volume: z.number().positive().finite(),
    size_units: z.number().finite().optional(),
    contract_size: z.number().positive().finite().optional(),
    entry: z.number().finite(),
    exit: z.number().finite(),
    profit: z.number().finite(),
    entry_time_ms: z.number().finite(),
    exit_time_ms: z.number().finite(),
    duration_sec: z.number().finite(),
    method: z.string(),
  })),
  account: z.object({
    equity: z.number().finite(),
    balance: z.number().finite(),
    margin_used: z.number().finite(),
    currency: z.string().optional(),
    margin_free: z.number().optional(),
    margin_level: z.number().optional(),
    nickname: z.string().optional(),
    account_name: z.string().optional(),
    broker: z.string().optional(),
    category: z.string().optional(),
  }),
  sync_id: z.string().min(1),
  ea_latest_closed_time_ms: z.number(),
  ea_latest_closed_deal_id: z.string(),
  open_positions_hash: z.string(),
  include_history: z.boolean().optional(),
  history_hash: z.string().optional(),
});

export const ingestHealthPayloadSchema = z.object({
  account_number: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).refine((v) => v.length > 0, {
    message: 'account_number is required',
  }),
  sync_id: z.string().min(1),
  history_hash: z.string().min(1),
  account_currency: z.string().optional(),
});
