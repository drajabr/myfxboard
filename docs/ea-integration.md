# MT5 EA Integration Guide

This guide explains how to integrate the dashboard sync feature into your MetaTrader 5 Expert Advisor.

## 1. Add Input Parameters

Add these to your EA's input section:

```mql5
input group "Dashboard Sync Settings"
input string   InpDashboardUrl = "http://localhost:3000";    // Server URL
input string   InpAccountId = "my_account_001";              // Dashboard Account ID
input string   InpDashboardPSK = "";                         // Pre-Shared Key (copy from dashboard)
input int      InpSyncInterval = 3;                          // Sync interval (seconds)
input bool     InpSyncEnabled = true;                        // Enable sync
```

## 2. Global Variables

Add these to track sync state:

```mql5
// Dashboard sync state
ulong g_lastDashboardSyncMs = 0;
bool g_dashboardSyncInFlight = false;
int g_dashboardSyncErrorCount = 0;
string g_dashboardSyncNonce = "";
```

## 3. Sync Function

Add this function to handle the periodic sync:

```mql5
void DashboardSync() {
  if (!InpSyncEnabled || InpAccountId == "" || InpDashboardPSK == "") return;
  
  ulong now = GetTickCount64();
  ulong intervalMs = InpSyncInterval * 1000;
  
  if (g_dashboardSyncInFlight) {
    Print("[Dashboard] Sync already in flight, skipping");
    return;
  }
  
  if (now < g_lastDashboardSyncMs + intervalMs) {
    return; // Not yet time to sync
  }
  
  // Guard: Only sync if account ID matches current login
  if (AccountInfoString(ACCOUNT_LOGIN) != InpAccountId) {
    Print("[Dashboard] Account ID mismatch; skipping sync");
    return;
  }
  
  g_lastDashboardSyncMs = now;
  g_dashboardSyncInFlight = true;
  
  // Build payload
  string payload = BuildDashboardPayload(now);
  
  // Create signature
  string signature = CreateHmacSignature(InpAccountId, now, InpDashboardPSK);
  
  // Send async request
  PostDashboardSync(payload, signature, (long)now);
}

string BuildDashboardPayload(ulong sync_time_ms) {
  // Collect open positions
  string positions_str = "[";
  bool first = true;
  
  for (int i = 0; i < PositionsTotal(); i++) {
    if (!PositionSelectByTicket(PositionGetTicket(i))) continue;
    
    if (!first) positions_str += ",";
    first = false;
    
    positions_str += StringFormat(
      "{\"symbol\":\"%s\",\"volume\":%g,\"open_price\":%g,\"avg_sl\":%g,\"avg_tp\":%g,\"open_time_ms\":%lld,\"pnl\":%g}",
      PositionGetString(POSITION_SYMBOL),
      PositionGetDouble(POSITION_VOLUME),
      PositionGetDouble(POSITION_PRICE_OPEN),
      PositionGetDouble(POSITION_SL),
      PositionGetDouble(POSITION_TP),
      (long)PositionGetInteger(POSITION_TIME_MSC),
      PositionGetDouble(POSITION_PROFIT)
    );
  }
  positions_str += "]";
  
  // Account info
  string account_str = StringFormat(
    "{\"equity\":%g,\"balance\":%g,\"margin_used\":%g}",
    AccountInfoDouble(ACCOUNT_EQUITY),
    AccountInfoDouble(ACCOUNT_BALANCE),
    AccountInfoDouble(ACCOUNT_MARGIN)
  );
  
  // Build full payload (simplified - no closed trades for now)
  string payload = StringFormat(
    "{\"positions\":%s,\"closed_trades\":[],\"account\":%s,\"sync_id\":\"%s\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"\",\"open_positions_hash\":\"\"}",
    positions_str,
    account_str,
    GenerateUUID(),
    sync_time_ms
  );
  
  return payload;
}

string CreateHmacSignature(string account_id, ulong timestamp_ms, string psk) {
  // HMAC-SHA256(psk, "{account_id}:{timestamp_ms}")
  string message = account_id + ":" + (string)timestamp_ms;
  
  // Note: MQL5 doesn't have built-in HMAC-SHA256, so this is pseudocode
  // In practice, you'd need to call into a DLL or use pre-computed signatures
  // For MVP, you can use a simpler approach like hash the PSK once
  
  // TODO: Implement HMAC-SHA256 or use simplified auth
  return "";
}

void PostDashboardSync(string payload, string signature, long timestamp_ms) {
  // Send HTTP POST request asynchronously
  string url = InpDashboardUrl + "/api/ingestion/" + InpAccountId;
  
  char request[];
  char result[];
  string headers = "Content-Type: application/json\r\n"
                   "Authorization: HMAC-SHA256 " + InpAccountId + ":" + signature + "\r\n"
                   "X-Signature-Timestamp: " + (string)timestamp_ms + "\r\n";
  
  int res = WebRequest("POST", url, headers, 5000, request, result);
  
  if (res == 200) {
    Print("[Dashboard] Sync successful");
    g_dashboardSyncErrorCount = 0;
  } else {
    g_dashboardSyncErrorCount++;
    Print("[Dashboard] Sync failed: ", res, " Error count: ", g_dashboardSyncErrorCount);
  }
  
  g_dashboardSyncInFlight = false;
}

string GenerateUUID() {
  return StringFormat("%04X%04X-%04X-%04X-%04X-%04X%04X%04X",
    MathRand(), MathRand(),
    MathRand(),
    MathRand(),
    MathRand(),
    MathRand(), MathRand(), MathRand()
  );
}
```

## 4. Call from Timer or OnTick

Add sync call to your main loop:

```mql5
void OnTimer() {
  // Your existing logic...
  
  // Dashboard sync (low-overhead)
  DashboardSync();
}
```

Or in OnTick with frequency guard:

```mql5
ulong g_lastTickMs = 0;

void OnTick() {
  ulong now = GetTickCount64();
  
  if (now > g_lastTickMs + 1000) { // Check every 1 second
    g_lastTickMs = now;
    DashboardSync();
  }
  
  // Your trading logic...
}
```

## 5. Dashboard Account Setup

1. Go to http://localhost (or your dashboard URL)
2. Click "Settings" (🔓 button)
3. Enter your MASTER_TOKEN
4. Click "Create Account"
5. Fill in:
   - **Account ID**: Same as `InpAccountId` in your EA
   - **Secret Key**: Generate and copy to `InpDashboardPSK` in your EA
   - **Account Name**: Friendly name for this account
6. Click "Create"

## 6. Testing

1. Set `InpSyncEnabled = true` in EA parameters
2. Open the dashboard
3. Select your account from the dropdown
4. Create a position in your EA
5. Check dashboard for real-time updates

## Troubleshooting

### Sync Not Working

1. Check `InpAccountId` matches dashboard account ID
2. Verify `InpDashboardUrl` is correct (include http:// or https://)
3. Confirm `InpDashboardPSK` matches the one from dashboard
4. Check EA logs in MetaTrader Journal for network errors
5. Ensure firewall allows outbound HTTP/HTTPS

### "Account ID Mismatch"

- Make sure `InpAccountId` exactly matches the account ID shown in your dashboard

### Signature Errors

- HMAC-SHA256 is technically required; for MVP, a simpler hash might be sufficient
- Timestamps must be within 5-second window of server time

## Next Steps

- Implement proper HMAC-SHA256 (may require a DLL wrapper)
- Add closed trades sync for full history
- Add error recovery with exponential backoff
- Test with multiple accounts
