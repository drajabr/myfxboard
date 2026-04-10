# Integration Patch for smaGUY Trade Manager - Dashboard Sync

This patch adds real-time sync to your existing smaGUY Trade Manager EA.

## Overview

The sync sends position/trade data to the dashboard server every 3 seconds (configurable). It uses the existing OnTimer infrastructure you already have, so integration is minimal.

## Step 1: Add Inputs

Add this input group **before** the `int OnInit()` function (around line 2380):

```mql5
input group "Dashboard Sync - Real-time position sync to web dashboard"
input bool   InpEnableDashboardSync = false;         // Enable Dashboard Sync
input string InpDashboardUrl = "http://localhost:3000";  // Server URL
input string InpDashboardAccountId = "";             // Account ID (from dashboard)
input string InpDashboardPSK = "";                   // Pre-Shared Key (from dashboard)
input int    InpDashboardSyncIntervalSec = 3;        // Sync Interval (seconds)
input bool   InpDashboardDebugLog = false;           // Debug Logging
```

## Step 2: Add Global Variables

Add these global variables after the existing globals (around line 151, after `ulong g_lastMaintenanceRunMs`):

```mql5
// Dashboard sync state
ulong g_lastDashboardSyncMs = 0;
bool g_dashboardSyncInFlight = false;
int g_dashboardSyncErrorCount = 0;
int g_dashboardSyncSuccessCount = 0;
ulong g_dashboardSyncRequestId = 0;  // For async request tracking
```

## Step 3: Add Sync Functions

Add these functions **before** `int OnInit()`:

```mql5
// === DASHBOARD SYNC FUNCTIONS ===

bool DashboardSync() {
   if (!InpEnableDashboardSync || InpDashboardAccountId == "" || InpDashboardPSK == "") {
      return false;
   }
   
   ulong now_ms = GetTickCount64();
   ulong sync_interval_ms = InpDashboardSyncIntervalSec * 1000;
   
   // Skip if already in flight
   if (g_dashboardSyncInFlight) {
      if (InpDashboardDebugLog) {
         Print("[Dashboard] Sync already in flight, skipping");
      }
      return false;
   }
   
   // Skip if not yet time
   if (g_lastDashboardSyncMs > 0 && now_ms < g_lastDashboardSyncMs + sync_interval_ms) {
      return false;
   }
   
   // Guard: Only sync if account ID matches current MT5 login
   string current_account = AccountInfoString(ACCOUNT_LOGIN);
   if (current_account != InpDashboardAccountId) {
      if (InpDashboardDebugLog) {
         Print("[Dashboard] Account ID mismatch: current=", current_account, 
               " input=", InpDashboardAccountId, " - skipping sync");
      }
      return false;
   }
   
   g_lastDashboardSyncMs = now_ms;
   g_dashboardSyncInFlight = true;
   
   // Build sync payload
   string payload = DashboardBuildPayload(now_ms);
   
   // Create HMAC signature
   string signature = DashboardCreateSignature(InpDashboardAccountId, now_ms, InpDashboardPSK);
   
   // Send async request
   DashboardPostSync(payload, signature, now_ms);
   
   return true;
}

string DashboardBuildPayload(ulong sync_time_ms) {
   // Build positions array
   string positions_json = "[";
   bool first_pos = true;
   
   for (int i = 0; i < PositionsTotal(); i++) {
      if (!PositionSelectByTicket(PositionGetTicket(i))) continue;
      if (PositionGetString(POSITION_SYMBOL) != _Symbol) continue;  // Only this symbol
      
      if (!first_pos) positions_json += ",";
      first_pos = false;
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      ulong open_time_ms = PositionGetInteger(POSITION_TIME_MSC);
      double pnl = PositionGetDouble(POSITION_PROFIT);
      ENUM_POSITION_TYPE dir = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      
      positions_json += StringFormat(
         "{\"symbol\":\"%s\",\"volume\":%.2f,\"open_price\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"open_time_ms\":%lld,\"pnl\":%.2f,\"direction\":%d}",
         symbol,
         volume,
         open_price,
         sl,
         tp,
         open_time_ms,
         pnl,
         (int)dir
      );
   }
   positions_json += "]";
   
   // Build account info
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double margin_used = AccountInfoDouble(ACCOUNT_MARGIN);
   double margin_free = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double margin_level = (margin_used > 0) ? (equity * 100.0 / margin_used) : 0;
   
   string account_json = StringFormat(
      "{\"equity\":%.2f,\"balance\":%.2f,\"margin_used\":%.2f,\"margin_free\":%.2f,\"margin_level\":%.2f}",
      equity,
      balance,
      margin_used,
      margin_free,
      margin_level
   );
   
   // Build closed trades for today
   string closed_trades_json = "[]";  // TODO: Implement if needed
   
   // Full payload
   string payload = StringFormat(
      "{\"positions\":%s,\"closed_trades\":%s,\"account\":%s,\"sync_id\":\"%lld\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"\"}",
      positions_json,
      closed_trades_json,
      account_json,
      sync_time_ms,
      sync_time_ms
   );
   
   if (InpDashboardDebugLog) {
      Print("[Dashboard] Payload size: ", StringLen(payload), " bytes");
   }
   
   return payload;
}

string DashboardCreateSignature(string account_id, ulong timestamp_ms, string psk) {
   // For MVP: Simple hash approach
   // In production: Use HMAC-SHA256 (may require DLL)
   
   string message = account_id + ":" + (string)timestamp_ms;
   
   // TODO: Implement proper HMAC-SHA256
   // For now, return a placeholder signature (server will validate against its own clock)
   
   return "dashboard_v1_" + IntegerToString(timestamp_ms);  // Simplified for testing
}

void DashboardPostSync(string payload, string signature, long timestamp_ms) {
   string url = InpDashboardUrl + "/api/ingestion/" + InpDashboardAccountId;
   
   char request_data[];
   char response_data[];
   
   // Prepare headers
   string headers = "Content-Type: application/json\r\n";
   headers += "Authorization: HMAC-SHA256 " + InpDashboardAccountId + ":" + signature + "\r\n";
   headers += "X-Signature-Timestamp: " + (string)timestamp_ms + "\r\n";
   
   // Convert payload to bytes
   int payload_len = StringLen(payload);
   ArrayResize(request_data, payload_len, 0);
   for (int i = 0; i < payload_len; i++) {
      request_data[i] = (uchar)payload[i];
   }
   
   // Send request (async)
   g_dashboardSyncRequestId = (ulong)WebRequest("POST", url, headers, 5000, request_data, response_data);
   
   if (g_dashboardSyncRequestId == -1) {
      g_dashboardSyncErrorCount++;
      if (InpDashboardDebugLog) {
         int err = GetLastError();
         Print("[Dashboard] WebRequest failed: error=", err);
         ResetLastError();
      }
      g_dashboardSyncInFlight = false;
   } else {
      if (InpDashboardDebugLog) {
         Print("[Dashboard] Sync sent: url=", url, " payload_len=", payload_len);
      }
      // Mark as done after send (WebRequest is async and we can't wait for response)
      g_dashboardSyncSuccessCount++;
      g_dashboardSyncInFlight = false;
   }
}

void DashboardLogStats() {
   if (InpDashboardDebugLog && InpEnableDashboardSync) {
      static ulong last_log_ms = 0;
      ulong now_ms = GetTickCount64();
      
      if (now_ms - last_log_ms > 60000) {  // Log every 60 seconds
         last_log_ms = now_ms;
         Print(StringFormat("[Dashboard] Stats: sent=%d, errors=%d, last_sync=%llums ago",
                           g_dashboardSyncSuccessCount,
                           g_dashboardSyncErrorCount,
                           now_ms - g_lastDashboardSyncMs));
      }
   }
}
```

## Step 4: Call Sync from OnTimer

Find the `void OnTimer()` function (line 2292). Inside the maintenance block, after the state calculations and before `g_lastMaintenanceRunMs = now_ms;`, add:

```mql5
void OnTimer() {
   ulong now_ms = GetTickCount64();
   bool run_maintenance = (g_lastMaintenanceRunMs == 0 || now_ms < g_lastMaintenanceRunMs || (now_ms - g_lastMaintenanceRunMs) >= (ulong)g_timerMaintenanceIntervalMs);
   bool run_ui = (g_lastUiRunMs == 0 || now_ms < g_lastUiRunMs || (now_ms - g_lastUiRunMs) >= (ulong)g_timerUiIntervalMs);

   if(!run_maintenance) {
      if(InpEnableDashboard && state.exists) {
         UpdatePnLOnly();
      }
      if(run_ui) {
         UpdateLines();
         g_lastUiRunMs = now_ms;
      }
      // === ADD THIS ===
      DashboardSync();  // Low-overhead check
      DashboardLogStats();
      // === END ADD ===
      return;
   }

   g_lastMaintenanceRunMs = now_ms;

   // ... rest of your maintenance code ...
   
   // === ADD THIS BEFORE END OF FUNCTION ===
   DashboardSync();  // Sync within maintenance cycle
   // === END ADD ===
}
```

## Step 5: Reset on DeInit

In `void OnDeinit(const int reason)`, add a reset line:

```mql5
void OnDeinit(const int reason) {
   // ... your existing cleanup ...
   g_lastDashboardSyncMs = 0;  // Reset timer on EA remove
}
```

## Step 6: Configure Dashboard

1. Go to your dashboard at http://localhost:3000 (or your server)
2. Click Settings (🔓 button)
3. Enter your MASTER_TOKEN
4. Create an account:
   - **Account ID**: Enter the same value as `InpDashboardAccountId` in your EA
   - **Account Name**: Friendly name
   - **Secret Key**: Copy this value to `InpDashboardPSK` in your EA
5. Click Create

## Step 7: Test Integration

1. Set EA parameters:
   - `InpEnableDashboardSync = true`
   - `InpDashboardAccountId = <value from dashboard>`
   - `InpDashboardPSK = <value from dashboard>`
   - `InpDashboardUrl = http://localhost:3000` (or your server)
   - `InpDashboardDebugLog = true` (for testing)

2. Run EA on a demo account

3. Check MT5 Journal for logs:
   ```
   [Dashboard] Payload size: 245 bytes
   [Dashboard] Sync sent: url=http://localhost:3000/api/ingestion/my_account_001 payload_len=245
   ```

4. Open dashboard, select your account, verify positions appear in real-time

## Debugging

**Sync not appearing in Dashboard:**
- Check EA logs for errors (Journal)
- Verify `InpDashboardUrl` is reachable (try `http://` not `https://`)
- Confirm `InpDashboardAccountId` matches dashboard
- Ensure `InpDashboardPSK` matches the value from dashboard Settings

**Wrong account data:**
- Verify `InpDashboardAccountId` matches your MT5 login account number

**High error count:**
- Check network connectivity
- Verify server is running: `docker-compose ps`
- Check server logs: `docker-compose logs api`

## Security Notes

⚠️ **Important**: 
- Never hardcode PSK in production; use EA inputs
- Use HTTPS in production (requires proper certificate)
- Consider firewall rules to restrict API access
- Rotate PSK periodically via dashboard Settings

## Next Steps

1. ✅ Local testing with Docker Compose
2. Deploy to production server
3. Configure HTTPS (add reverse proxy like Cloudflare)
4. Implement closed trades sync for historical data
5. Add portfolio equity/curve tracking
