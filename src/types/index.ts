export interface Account {
  account_id: string;
  account_name: string;
  secret_hash: string;
  broker: string;
  created_at: number;
  last_sync_at: number | null;
  last_closed_deal_id: string | null;
  last_closed_time_ms: number | null;
  history_sync_cursor: string | null;
  history_in_sync: boolean;
}

export interface Position {
  id: number;
  account_id: string;
  symbol: string;
  size: number;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  current_price: number | null;
  avg_sl: number | null;
  avg_tp: number | null;
  unrealized_pnl: number | null;
  open_time_ms: number;
  updated_at_ms: number;
}

export interface Trade {
  id: number;
  account_id: string;
  symbol: string;
  size: number;
  entry_price: number;
  exit_price: number | null;
  profit: number | null;
  profit_pct: number | null;
  entry_time_ms: number;
  exit_time_ms: number | null;
  duration_sec: number | null;
  result: 'win' | 'loss' | 'breakeven' | 'open';
  close_method: string | null;
}

export interface AccountSettings {
  id: number;
  account_id: string;
  theme: string;
  refresh_interval_ms: number;
  api_token: string | null;
  token_expires_at: number | null;
  readonly_until_unlock: boolean;
  created_at: number;
  updated_at: number;
}

export interface DailySnapshot {
  id: number;
  account_id: string;
  date: string;
  snapshot_time_ms: number;
  equity: number;
  balance: number;
  return_pct: number;
  trades_count: number;
  wins: number;
  losses: number;
}

export interface SyncLog {
  id: number;
  account_id: string;
  sync_timestamp_ms: number;
  sync_id: string | null;
  position_count: number;
  trade_count: number;
  data_hash: string | null;
  status: 'ok' | 'error';
  error_msg: string | null;
}

export interface IngestPayload {
  account_number: string;
  positions: Array<{
    symbol: string;
    volume: number;
    open_price: number;
    avg_sl: number | null;
    avg_tp: number | null;
    open_time_ms: number;
    pnl: number;
  }>;
  closed_trades: Array<{
    symbol: string;
    volume: number;
    entry: number;
    exit: number;
    profit: number;
    entry_time_ms: number;
    exit_time_ms: number;
    duration_sec: number;
    method: string;
  }>;
  account: {
    equity: number;
    balance: number;
    margin_used: number;
  };
  sync_id: string;
  ea_latest_closed_time_ms: number;
  ea_latest_closed_deal_id: string;
  open_positions_hash: string;
}

export interface AuthContext {
  account_id: string;
  timestamp: number;
  signature: string;
}

export interface UnlockToken {
  token: string;
  expires_at: number;
  locked: boolean;
}

export interface DashboardSummary {
  summary: {
    equity: number;
    balance: number;
    free_margin: number;
    used_margin: number;
    current_pnl: number;
    current_return_pct: number;
    risk_reward_ratio: number;
  };
  positions: Position[];
  todays_stats: {
    trades_count: number;
    wins: number;
    losses: number;
    win_rate_pct: number;
    daily_pnl: number;
    largest_win: number;
    largest_loss: number;
  };
  charts: {
    equity_curve: Array<{ ts: number; equity: number }>;
    returns: { daily: number[]; weekly: number[]; monthly: number[] };
  };
}
