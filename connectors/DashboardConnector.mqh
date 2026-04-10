//+------------------------------------------------------------------+
//|                     Dashboard Connector v1.0                     |
//|             Internal sync helper for myfxboard full EA           |
//|                                                                  |
//| Maintained as part of the standalone full EA package only.       |
//+------------------------------------------------------------------+

#ifndef DASHBOARD_CONNECTOR_H
#define DASHBOARD_CONNECTOR_H

class DashboardConnector {
private:
   static string   s_url;
   static string   s_account_id;
   static string   s_psk;
   static int      s_sync_interval_ms;
   static ulong    s_last_sync_ms;
   static bool     s_in_flight;
   static int      s_success_count;
   static int      s_error_count;
   static bool     s_debug_log;
   static ulong    s_last_log_ms;

public:
   // Initialize connector with dashboard server details
   static void Init(string url, string account_id, string psk, int interval_sec, bool debug = false) {
      s_url = url;
      s_account_id = account_id;
      s_psk = psk;
      s_sync_interval_ms = interval_sec * 1000;
      s_debug_log = debug;
      s_last_sync_ms = 0;
      s_in_flight = false;
      s_success_count = 0;
      s_error_count = 0;
      
      if (s_debug_log) {
         Print("[DashboardConnector] Initialized: url=", s_url, " account=", s_account_id, " interval=", interval_sec, "s");
      }
   }

   // Call this periodically to sync data
   static bool Sync() {
      if (s_url == "" || s_account_id == "" || s_psk == "") {
         return false;  // Not configured
      }

      ulong now_ms = GetTickCount64();

      if (s_in_flight) {
         if (s_debug_log && now_ms - s_last_log_ms > 60000) {
            Print("[DashboardConnector] Sync in flight, skipping");
            s_last_log_ms = now_ms;
         }
         return false;
      }

      if (s_last_sync_ms > 0 && now_ms < s_last_sync_ms + s_sync_interval_ms) {
         return false;  // Not yet time
      }

      // Guard: Verify account ID matches
      string current_account = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
      if (current_account != s_account_id) {
         if (s_debug_log) {
            Print("[DashboardConnector] Account mismatch: current=", current_account, " configured=", s_account_id);
         }
         return false;
      }

      s_last_sync_ms = now_ms;
      s_in_flight = true;

      // Build payload and send
      string payload = BuildPayload(now_ms);
      string signature = CreateSignature(s_account_id, now_ms, s_psk);
      PostSync(payload, signature, now_ms);

      return true;
   }

   // Get statistics
   static int GetSuccessCount() { return s_success_count; }
   static int GetErrorCount() { return s_error_count; }

   // Enable/disable debug logging
   static void SetDebugLog(bool enabled) { s_debug_log = enabled; }

private:
   // Build JSON payload with current positions and account data
   static string BuildPayload(ulong sync_time_ms) {
      string positions_json = "[";
      bool first_pos = true;

      for (int i = 0; i < PositionsTotal(); i++) {
         if (!PositionSelectByTicket(PositionGetTicket(i))) continue;

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
            symbol, volume, open_price, sl, tp, open_time_ms, pnl, (int)dir
         );
      }
      positions_json += "]";

      // Account info
      double equity = AccountInfoDouble(ACCOUNT_EQUITY);
      double balance = AccountInfoDouble(ACCOUNT_BALANCE);
      double margin_used = AccountInfoDouble(ACCOUNT_MARGIN);
      double margin_free = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      double margin_level = (margin_used > 0) ? (equity * 100.0 / margin_used) : 0;

      string account_json = StringFormat(
         "{\"equity\":%.2f,\"balance\":%.2f,\"margin_used\":%.2f,\"margin_free\":%.2f,\"margin_level\":%.2f}",
         equity, balance, margin_used, margin_free, margin_level
      );

      string payload = StringFormat(
         "{\"positions\":%s,\"closed_trades\":[],\"account\":%s,\"sync_id\":\"%lld\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"\"}",
         positions_json, account_json, sync_time_ms, sync_time_ms
      );

      if (s_debug_log) {
         Print("[DashboardConnector] Payload: ", StringLen(payload), " bytes");
      }

      return payload;
   }

   // Create HMAC signature
   static string CreateSignature(string account_id, ulong timestamp_ms, string psk) {
      // Simplified signature for MVP (production needs real HMAC-SHA256)
      return "dashboard_v1_" + IntegerToString(timestamp_ms);
   }

   // Post sync request to server
   static void PostSync(string payload, string signature, long timestamp_ms) {
      string url = s_url + "/api/ingestion/" + s_account_id;

      char request_data[];
      char response_data[];

      string headers = "Content-Type: application/json\r\n";
      headers += "Authorization: HMAC-SHA256 " + s_account_id + ":" + signature + "\r\n";
      headers += "X-Signature-Timestamp: " + (string)timestamp_ms + "\r\n";

      int payload_len = StringLen(payload);
      ArrayResize(request_data, payload_len, 0);
      for (int i = 0; i < payload_len; i++) {
         request_data[i] = (uchar)payload[i];
      }

      int res = WebRequest("POST", url, headers, 5000, request_data, response_data);

      if (res == -1) {
         s_error_count++;
         if (s_debug_log) {
            int err = GetLastError();
            Print("[DashboardConnector] Error: ", err);
            ResetLastError();
         }
         s_in_flight = false;
      } else {
         if (s_debug_log) {
            Print("[DashboardConnector] Sync sent (", StringLen(payload), " bytes, response=", res, ")");
         }
         s_success_count++;
         s_in_flight = false;
      }
   }
};

// Static member initialization
string   DashboardConnector::s_url = "";
string   DashboardConnector::s_account_id = "";
string   DashboardConnector::s_psk = "";
int      DashboardConnector::s_sync_interval_ms = 3000;
ulong    DashboardConnector::s_last_sync_ms = 0;
bool     DashboardConnector::s_in_flight = false;
int      DashboardConnector::s_success_count = 0;
int      DashboardConnector::s_error_count = 0;
bool     DashboardConnector::s_debug_log = false;
ulong    DashboardConnector::s_last_log_ms = 0;

#endif
