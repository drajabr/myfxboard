//+------------------------------------------------------------------+
//|                  myfxboard Standalone Connector v1.0             |
//|          Syncs open positions to the myfxboard web dashboard      |
//+------------------------------------------------------------------+
#property copyright "myfxboard"
#property version   "1.00"
#property strict
#property description "Standalone connector EA - syncs positions and account data to myfxboard dashboard"

#include <Trade\DealInfo.mqh>

//--- Inputs
input group "myfxboard Dashboard Connection"
input string InpDashboardUrl         = "http://localhost:3000"; // Server URL
input string InpDashboardPSK         = "";                      // Shared Secret (PSK)
input int    InpSyncIntervalSec      = 3;                       // Sync Interval (seconds)
input int    InpKeepaliveSec         = 0;                       // Keepalive Interval (seconds, 0=disable)
input bool   InpDebugLog             = false;                   // Debug Logging

//+------------------------------------------------------------------+
//| DashboardConnector class                                         |
//+------------------------------------------------------------------+
class DashboardConnector {
private:
   static string   s_url;
   static string   s_psk;
   static int      s_sync_interval_ms;
   static int      s_keepalive_ms;
   static ulong    s_last_sync_ms;
   static bool     s_in_flight;
   static int      s_success_count;
   static int      s_error_count;
   static bool     s_debug_log;
   static ulong    s_last_log_ms;
   static uint     s_last_live_payload_hash;
   static long     s_last_live_payload_sent_ms;
   static long     s_last_keepalive_probe_ms;
   static string   s_last_ack_history_hash;
   static bool     s_startup_health_checked;
   static bool     s_last_sync_ok;
   static long     s_last_keepalive_attempt_ms;

   static uint HashPayload(const string payload) {
      uchar bytes[];
      int n = StringToCharArray(payload, bytes, 0, WHOLE_ARRAY, CP_UTF8);
      if(n <= 1)
         return 0;

      uint hash = 2166136261;
      for(int i = 0; i < n - 1; i++) {
         hash ^= (uint)bytes[i];
         hash *= 16777619;
      }
      return hash;
   }

   static string ExtractJsonString(const string json, const string key) {
      string token = "\"" + key + "\":\"";
      int start = StringFind(json, token);
      if(start < 0)
         return "";
      start += StringLen(token);
      int finish = StringFind(json, "\"", start);
      if(finish < 0)
         return "";
      return StringSubstr(json, start, finish - start);
   }

   static bool ExtractJsonBool(const string json, const string key, bool default_value = false) {
      string true_token = "\"" + key + "\":true";
      if(StringFind(json, true_token) >= 0)
         return true;
      string false_token = "\"" + key + "\":false";
      if(StringFind(json, false_token) >= 0)
         return false;
      return default_value;
   }

public:
   static void Init(string url, string psk, int interval_sec, int keepalive_sec = 0, bool debug = false) {
      s_url              = url;
      s_psk              = psk;
      s_sync_interval_ms = interval_sec * 1000;
      // Force keepalive to 60s regardless of input
      s_keepalive_ms     = 60000;
      s_debug_log        = debug;
      s_last_sync_ms     = 0;
      s_in_flight        = false;
      s_success_count    = 0;
      s_error_count      = 0;
      s_last_live_payload_hash = 0;
      s_last_live_payload_sent_ms = 0;
      s_last_keepalive_probe_ms = 0;
      s_last_ack_history_hash = "";
      s_startup_health_checked = false;
      s_last_sync_ok            = false;
      s_last_keepalive_attempt_ms = 0;
      if(s_debug_log)
         Print("[DashboardConnector] Initialized: url=", s_url, " interval=", interval_sec, "s, keepalive=60s");
   }

   static bool Sync() {
      if(s_url == "" || s_psk == "") return false;

      ulong now_ms = GetTickCount64();

      if(s_in_flight) {
         if(s_debug_log && now_ms - s_last_log_ms > 60000) {
            Print("[DashboardConnector] Sync in flight, skipping");
            s_last_log_ms = now_ms;
         }
         return false;
      }

      if(s_last_sync_ms > 0 && now_ms < s_last_sync_ms + s_sync_interval_ms)
         return false;

      // Backend auth expects unix epoch milliseconds, not terminal uptime milliseconds.
      long timestamp_ms = (long)TimeGMT() * 1000;
      string current_account = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));

      long latest_closed_time_ms = 0;
      string latest_closed_deal_id = "";
      string positions_json = BuildPositionsJson();
      string closed_trades_json = BuildClosedTradesJson(latest_closed_time_ms, latest_closed_deal_id);
      string account_json = BuildAccountJson();

      uint live_payload_hash = HashPayload(positions_json + "|" + account_json + "|" + StringFormat("%lld", latest_closed_time_ms));
      string history_hash = StringFormat("%u", HashPayload(closed_trades_json));

      if(!s_startup_health_checked) {
         // One-shot probe: if unavailable/fails, continue with normal sync and avoid retry spam.
         s_startup_health_checked = true;
         bool history_sync_required = true;
         string server_history_hash = "";
         if(PostHealthCheck(current_account, timestamp_ms, history_hash, history_sync_required, server_history_hash)) {
            if(server_history_hash != "")
               s_last_ack_history_hash = server_history_hash;

            if(!history_sync_required) {
               s_last_live_payload_hash = live_payload_hash;
               s_last_live_payload_sent_ms = timestamp_ms;
               s_last_sync_ms = now_ms;
               if(s_debug_log)
                  Print("[DashboardConnector] Startup health check matched server state, skipping initial full sync");
               return false;
            }
         }
      }

      bool include_history = (history_hash != s_last_ack_history_hash);
      long keepalive_reference_ms = s_last_live_payload_sent_ms;
      if(s_last_keepalive_probe_ms > keepalive_reference_ms)
         keepalive_reference_ms = s_last_keepalive_probe_ms;

      if(!include_history
         && live_payload_hash == s_last_live_payload_hash
         && keepalive_reference_ms > 0) {
         if(s_keepalive_ms <= 0 || (timestamp_ms - keepalive_reference_ms) < s_keepalive_ms) {
            s_last_sync_ms = now_ms;
            if(s_debug_log && now_ms - s_last_log_ms > 30000) {
               Print("[DashboardConnector] No live payload changes, skipping sync");
               s_last_log_ms = now_ms;
            }
            return false;
         }

         bool history_sync_required = false;
         string server_history_hash = "";
         s_last_sync_ms = now_ms;
         s_last_keepalive_probe_ms = timestamp_ms;
         if(PostHealthCheck(current_account, timestamp_ms, history_hash, history_sync_required, server_history_hash)) {
            if(server_history_hash != "")
               s_last_ack_history_hash = server_history_hash;
            s_success_count++;
            s_last_sync_ok = true;
            s_last_live_payload_sent_ms = timestamp_ms;
            if(!history_sync_required) {
               if(s_debug_log)
                  Print("[DashboardConnector] Keepalive health accepted, no payload needed");
               return false;
            }

            include_history = true;
            if(s_debug_log)
               Print("[DashboardConnector] Keepalive health requested history sync");
         } else {
            s_error_count++;
            s_last_sync_ok = false;
            if(s_debug_log)
               Print("[DashboardConnector] Keepalive health failed, skipping full sync");
            return false;
         }
      }

      string payload = BuildPayload(
         timestamp_ms,
         current_account,
         positions_json,
         include_history ? closed_trades_json : "[]",
         account_json,
         latest_closed_time_ms,
         latest_closed_deal_id,
         include_history,
         history_hash
      );

      string signature = CreateSignature(current_account, timestamp_ms, s_psk);
      s_last_sync_ms = now_ms;
      s_in_flight    = true;
      PostSync(payload, current_account, signature, timestamp_ms, live_payload_hash, include_history, history_hash);
      return true;
   }

   static int  GetSuccessCount()          { return s_success_count; }
   static int  GetErrorCount()            { return s_error_count; }
   static bool GetLastSyncOk()            { return s_last_sync_ok; }
   static void SetDebugLog(bool enabled)  { s_debug_log = enabled; }

private:
   static string BuildPositionsJson() {
      string positions_json = "[";
      bool first_pos = true;

      for(int i = 0; i < PositionsTotal(); i++) {
         if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
         if(!first_pos) positions_json += ",";
         first_pos = false;

         string symbol      = PositionGetString(POSITION_SYMBOL);
         double volume      = PositionGetDouble(POSITION_VOLUME);
         double open_price  = PositionGetDouble(POSITION_PRICE_OPEN);
         double sl          = PositionGetDouble(POSITION_SL);
         double tp          = PositionGetDouble(POSITION_TP);
         ulong  open_time_ms = PositionGetInteger(POSITION_TIME_MSC);
         double pnl         = PositionGetDouble(POSITION_PROFIT);
         ENUM_POSITION_TYPE dir = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         string direction = (dir == POSITION_TYPE_BUY) ? "BUY" : "SELL";

         positions_json += StringFormat(
            "{\"symbol\":\"%s\",\"volume\":%.2f,\"direction\":\"%s\",\"open_price\":%.5f,\"avg_sl\":%.5f,\"avg_tp\":%.5f,\"open_time_ms\":%lld,\"pnl\":%.2f}",
            symbol, volume, direction, open_price, sl, tp, open_time_ms, pnl
         );
      }
      positions_json += "]";

      return positions_json;
   }

   static string BuildClosedTradesJson(long &latest_closed_time_ms, string &latest_closed_deal_id) {
      // Collect closed trades from deal history, paired by position id.
      string closed_trades_json = "[";
      bool first_trade = true;
      latest_closed_time_ms = 0;
      latest_closed_deal_id = "";
      
      // HistorySelect expects datetime seconds, not unix milliseconds.
      if(HistorySelect(0, TimeCurrent())) {
         static bool Sync() {
            if(s_url == "" || s_psk == "") return false;

            ulong now_ms = GetTickCount64();

            if(s_in_flight) {
               if(s_debug_log && now_ms - s_last_log_ms > 60000) {
                  Print("[DashboardConnector] Sync in flight, skipping");
                  s_last_log_ms = now_ms;
               }
               return false;
            }

            if(s_last_sync_ms > 0 && now_ms < s_last_sync_ms + s_sync_interval_ms)
               return false;

            // Backend auth expects unix epoch milliseconds, not terminal uptime milliseconds.
            long timestamp_ms = (long)TimeGMT() * 1000;
            string current_account = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));

            long latest_closed_time_ms = 0;
            string latest_closed_deal_id = "";
            string positions_json = BuildPositionsJson();
            string closed_trades_json = BuildClosedTradesJson(latest_closed_time_ms, latest_closed_deal_id);
            string account_json = BuildAccountJson();

            uint live_payload_hash = HashPayload(positions_json + "|" + account_json + "|" + StringFormat("%lld", latest_closed_time_ms));
            string history_hash = StringFormat("%u", HashPayload(closed_trades_json));

            if(!s_startup_health_checked) {
               // One-shot probe: if unavailable/fails, continue with normal sync and avoid retry spam.
               s_startup_health_checked = true;
               bool history_sync_required = true;
               string server_history_hash = "";
               if(PostHealthCheck(current_account, timestamp_ms, history_hash, history_sync_required, server_history_hash)) {
                  if(server_history_hash != "")
                     s_last_ack_history_hash = server_history_hash;

                  if(!history_sync_required) {
                     s_last_live_payload_hash = live_payload_hash;
                     s_last_live_payload_sent_ms = timestamp_ms;
                     s_last_sync_ms = now_ms;
                     if(s_debug_log)
                        Print("[DashboardConnector] Startup health check matched server state, skipping initial full sync");
                     return false;
                  }
               }
            }

            bool include_history = (history_hash != s_last_ack_history_hash);
            long keepalive_reference_ms = s_last_live_payload_sent_ms;
            if(s_last_keepalive_probe_ms > keepalive_reference_ms)
               keepalive_reference_ms = s_last_keepalive_probe_ms;

            // Only run keepalive every 60s, not every sync tick
            if(!include_history && live_payload_hash == s_last_live_payload_hash && keepalive_reference_ms > 0) {
               if(s_keepalive_ms <= 0 || (timestamp_ms - keepalive_reference_ms) < s_keepalive_ms) {
                  s_last_sync_ms = now_ms;
                  if(s_debug_log && now_ms - s_last_log_ms > 30000) {
                     Print("[DashboardConnector] No live payload changes, skipping sync");
                     s_last_log_ms = now_ms;
                  }
                  return false;
               }

               // Only attempt keepalive if 60s have passed since last attempt
               if(timestamp_ms - s_last_keepalive_attempt_ms >= 60000) {
                  bool history_sync_required = false;
                  string server_history_hash = "";
                  s_last_sync_ms = now_ms;
                  s_last_keepalive_probe_ms = timestamp_ms;
                  s_last_keepalive_attempt_ms = timestamp_ms;
                  if(PostHealthCheck(current_account, timestamp_ms, history_hash, history_sync_required, server_history_hash)) {
                     if(server_history_hash != "")
                        s_last_ack_history_hash = server_history_hash;
                     s_success_count++;
                     s_last_sync_ok = true;
                     s_last_live_payload_sent_ms = timestamp_ms;
                     if(!history_sync_required) {
                        if(s_debug_log)
                           Print("[DashboardConnector] Keepalive health accepted, no payload needed");
                        return false;
                     }
                     include_history = true;
                     if(s_debug_log)
                        Print("[DashboardConnector] Keepalive health requested history sync");
                  } else {
                     s_error_count++;
                     s_last_sync_ok = false;
                     if(s_debug_log)
                        Print("[DashboardConnector] Keepalive health failed, will retry in 60s");
                     return false;
                  }
               } else {
                  // Not time for keepalive yet
                  s_last_sync_ms = now_ms;
                  return false;
               }
            }
                  latest_closed_deal_id = StringFormat("%llu", deal_ticket);
               }
            }
         }
      }
      closed_trades_json += "]";

      return closed_trades_json;
   }

   static string BuildAccountJson() {
      double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
      double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
      double margin_used  = AccountInfoDouble(ACCOUNT_MARGIN);
      double margin_free  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      double margin_level = (margin_used > 0) ? (equity * 100.0 / margin_used) : 0;

      string account_json = StringFormat(
         "{\"equity\":%.2f,\"balance\":%.2f,\"margin_used\":%.2f,\"margin_free\":%.2f,\"margin_level\":%.2f}",
         equity, balance, margin_used, margin_free, margin_level
      );

      return account_json;
   }

   static string BuildPayload(
      long sync_time_ms,
      string account_number,
      string positions_json,
      string closed_trades_json,
      string account_json,
      long latest_closed_time_ms,
      string latest_closed_deal_id,
      bool include_history,
      string history_hash
   ) {

      string payload = StringFormat(
         "{\"account_number\":\"%s\",\"positions\":%s,\"closed_trades\":%s,\"account\":%s,\"sync_id\":\"%lld\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"%s\",\"open_positions_hash\":\"\",\"include_history\":%s,\"history_hash\":\"%s\"}",
         account_number,
         positions_json,
         closed_trades_json,
         account_json,
         sync_time_ms,
         latest_closed_time_ms,
         latest_closed_deal_id,
         include_history ? "true" : "false",
         history_hash
      );

      if(s_debug_log)
         Print("[DashboardConnector] Payload: ", StringLen(payload), " bytes, include_history=", include_history ? "true" : "false");

      return payload;
   }

   static string ToHex(const uchar &bytes[]) {
      string out = "";
      int n = ArraySize(bytes);
      for(int i = 0; i < n; i++)
         out += StringFormat("%02x", bytes[i]);
      return out;
   }

   static bool Sha256(const uchar &payload_bytes[], uchar &digest[]) {
      uchar no_key[];
      ArrayResize(no_key, 0, 0);
      return CryptEncode(CRYPT_HASH_SHA256, payload_bytes, no_key, digest) > 0;
   }

   static bool BuildHmacSha256(const uchar &key[], const uchar &message[], uchar &out_digest[]) {
      const int BLOCK_SIZE = 64;
      uchar normalized_key[];
      ArrayCopy(normalized_key, key);

      if(ArraySize(normalized_key) > BLOCK_SIZE) {
         uchar key_hash[];
         if(!Sha256(normalized_key, key_hash))
            return false;
         ArrayFree(normalized_key);
         ArrayCopy(normalized_key, key_hash);
      }

      if(ArraySize(normalized_key) < BLOCK_SIZE) {
         int old_size = ArraySize(normalized_key);
         ArrayResize(normalized_key, BLOCK_SIZE, 0);
         for(int i = old_size; i < BLOCK_SIZE; i++)
            normalized_key[i] = 0;
      }

      uchar ipad[];
      uchar opad[];
      ArrayResize(ipad, BLOCK_SIZE, 0);
      ArrayResize(opad, BLOCK_SIZE, 0);
      for(int i = 0; i < BLOCK_SIZE; i++) {
         ipad[i] = normalized_key[i] ^ 0x36;
         opad[i] = normalized_key[i] ^ 0x5c;
      }

      uchar inner_data[];
      int message_size = ArraySize(message);
      ArrayResize(inner_data, BLOCK_SIZE + message_size, 0);
      for(int i = 0; i < BLOCK_SIZE; i++)
         inner_data[i] = ipad[i];
      for(int i = 0; i < message_size; i++)
         inner_data[BLOCK_SIZE + i] = message[i];

      uchar inner_hash[];
      if(!Sha256(inner_data, inner_hash))
         return false;

      uchar outer_data[];
      int inner_size = ArraySize(inner_hash);
      ArrayResize(outer_data, BLOCK_SIZE + inner_size, 0);
      for(int i = 0; i < BLOCK_SIZE; i++)
         outer_data[i] = opad[i];
      for(int i = 0; i < inner_size; i++)
         outer_data[BLOCK_SIZE + i] = inner_hash[i];

      return Sha256(outer_data, out_digest);
   }

   static string CreateSignature(string account_number, long timestamp_ms, string psk) {
      string message = account_number + ":" + StringFormat("%lld", timestamp_ms);
      uchar message_bytes[];
      uchar key_bytes[];
      uchar digest[];

      int message_len = StringToCharArray(message, message_bytes, 0, WHOLE_ARRAY, CP_UTF8);
      if(message_len > 0)
         ArrayResize(message_bytes, message_len - 1, 0);

      int key_len = StringToCharArray(psk, key_bytes, 0, WHOLE_ARRAY, CP_UTF8);
      if(key_len > 0)
         ArrayResize(key_bytes, key_len - 1, 0);

      if(!BuildHmacSha256(key_bytes, message_bytes, digest)) {
         if(s_debug_log)
            Print("[DashboardConnector] Failed to build HMAC signature");
         return "";
      }

      return ToHex(digest);
   }

   static void PostSync(
      string payload,
      string account_number,
      string signature,
      long timestamp_ms,
      uint live_payload_hash,
      bool include_history,
      string history_hash
   ) {
      string url = s_url + "/api/ingestion";

      uchar request_data[];
      uchar response_data[];
      string response_headers = "";

      string headers  = "Content-Type: application/json\r\n";
      headers        += "Authorization: HMAC-SHA256 " + signature + "\r\n";
      headers        += "X-Signature-Timestamp: " + (string)timestamp_ms + "\r\n";

      int payload_size = StringToCharArray(payload, request_data, 0, WHOLE_ARRAY, CP_UTF8);
      if(payload_size > 0)
         ArrayResize(request_data, payload_size - 1, 0);

      int res = WebRequest("POST", url, headers, 5000, request_data, response_data, response_headers);

      if(res == -1) {
         s_error_count++;
         s_last_sync_ok = false;
         if(!include_history && live_payload_hash == s_last_live_payload_hash && s_keepalive_ms > 0)
            s_last_live_payload_sent_ms = timestamp_ms;
         if(s_debug_log) {
            Print("[DashboardConnector] Error: ", GetLastError());
            ResetLastError();
         }
      } else {
         string response_text = CharArrayToString(response_data, 0, WHOLE_ARRAY, CP_UTF8);
         if(res >= 200 && res < 300) {
            string server_history_hash = ExtractJsonString(response_text, "server_history_hash");
            if(server_history_hash != "")
               s_last_ack_history_hash = server_history_hash;
            else if(include_history)
               s_last_ack_history_hash = history_hash;

            bool history_sync_required = ExtractJsonBool(response_text, "history_sync_required", false);
            if(s_debug_log)
               Print("[DashboardConnector] Sync accepted for account ", account_number,
                     " (", StringLen(payload), " bytes, status=", res, ")");
            s_success_count++;
            s_last_sync_ok = true;
            s_last_live_payload_hash = live_payload_hash;
            s_last_live_payload_sent_ms = timestamp_ms;
            if(history_sync_required && s_debug_log)
               Print("[DashboardConnector] Server requested history resend (hash mismatch)");
         } else {
            s_error_count++;
            s_last_sync_ok = false;
            if(!include_history && live_payload_hash == s_last_live_payload_hash && s_keepalive_ms > 0)
               s_last_live_payload_sent_ms = timestamp_ms;
            if(s_debug_log)
               Print("[DashboardConnector] Sync rejected for account ", account_number,
                     " (status=", res, ", body=", response_text, ")");
         }
      }
      s_in_flight = false;
   }

   static bool PostHealthCheck(
      string account_number,
      long timestamp_ms,
      string history_hash,
      bool &history_sync_required,
      string &server_history_hash
   ) {
      string url = s_url + "/api/ingestion/health";
      string signature = CreateSignature(account_number, timestamp_ms, s_psk);

      string payload = StringFormat(
         "{\"account_number\":\"%s\",\"sync_id\":\"%lld\",\"history_hash\":\"%s\"}",
         account_number,
         timestamp_ms,
         history_hash
      );

      uchar request_data[];
      uchar response_data[];
      string response_headers = "";

      string headers  = "Content-Type: application/json\r\n";
      headers        += "Authorization: HMAC-SHA256 " + signature + "\r\n";
      headers        += "X-Signature-Timestamp: " + (string)timestamp_ms + "\r\n";

      int payload_size = StringToCharArray(payload, request_data, 0, WHOLE_ARRAY, CP_UTF8);
      if(payload_size > 0)
         ArrayResize(request_data, payload_size - 1, 0);

      int res = WebRequest("POST", url, headers, 5000, request_data, response_data, response_headers);
      if(res < 200 || res >= 300)
         return false;

      string response_text = CharArrayToString(response_data, 0, WHOLE_ARRAY, CP_UTF8);
      server_history_hash = ExtractJsonString(response_text, "server_history_hash");
      history_sync_required = ExtractJsonBool(response_text, "history_sync_required", true);
      return true;
   }
};

// Static member initialization
string DashboardConnector::s_url              = "";
string DashboardConnector::s_psk              = "";
int    DashboardConnector::s_sync_interval_ms = 3000;
int    DashboardConnector::s_keepalive_ms     = 0;
ulong  DashboardConnector::s_last_sync_ms     = 0;
bool   DashboardConnector::s_in_flight        = false;
int    DashboardConnector::s_success_count    = 0;
int    DashboardConnector::s_error_count      = 0;
bool   DashboardConnector::s_debug_log        = false;
ulong  DashboardConnector::s_last_log_ms      = 0;
uint   DashboardConnector::s_last_live_payload_hash = 0;
long   DashboardConnector::s_last_live_payload_sent_ms = 0;
long   DashboardConnector::s_last_keepalive_probe_ms = 0;
string DashboardConnector::s_last_ack_history_hash = "";
bool   DashboardConnector::s_startup_health_checked = false;
bool   DashboardConnector::s_last_sync_ok            = false;

//+------------------------------------------------------------------+
//| Status dot                                                       |
//+------------------------------------------------------------------+
#define MFXB_DOT_OBJ "myfxboard_status_dot"
int   g_dot_seen_success = -1;
int   g_dot_seen_error   = -1;
ulong g_dot_blink_until_ms = 0;

void UpdateStatusDot() {
   ulong now_ms = GetTickCount64();

   int success_count = DashboardConnector::GetSuccessCount();
   int error_count   = DashboardConnector::GetErrorCount();

   if(g_dot_seen_success < 0 || g_dot_seen_error < 0) {
      g_dot_seen_success = success_count;
      g_dot_seen_error   = error_count;
   }

   bool has_event = (success_count != g_dot_seen_success || error_count != g_dot_seen_error);
   if(has_event) {
      g_dot_seen_success = success_count;
      g_dot_seen_error   = error_count;
      g_dot_blink_until_ms = now_ms + 220;
   }

   color dot_color;
   if(success_count == 0 && error_count == 0)
      dot_color = clrRed;
   else {
      bool is_positive = DashboardConnector::GetLastSyncOk();
      color settled_color = is_positive ? clrLime : clrRed;
      color pulse_color   = is_positive ? C'0,160,0' : C'120,0,0';
      dot_color = (now_ms < g_dot_blink_until_ms) ? pulse_color : settled_color;
   }

   long chart_id = 0;
   if(ObjectFind(chart_id, MFXB_DOT_OBJ) < 0) {
      ObjectCreate(chart_id, MFXB_DOT_OBJ, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_CORNER,      CORNER_RIGHT_UPPER);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_XDISTANCE,   18);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_YDISTANCE,   6);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_XSIZE,       12);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_YSIZE,       12);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_SELECTABLE,  false);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_HIDDEN,      true);
      ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_BACK,        false);
   }
   ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_CORNER,    CORNER_RIGHT_UPPER);
   ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_XDISTANCE, 18);
   ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_YDISTANCE, 6);
   ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_BGCOLOR, dot_color);
   ObjectSetInteger(chart_id, MFXB_DOT_OBJ, OBJPROP_COLOR,   dot_color);
   ChartRedraw(chart_id);
}

//+------------------------------------------------------------------+
//| EA lifecycle                                                     |
//+------------------------------------------------------------------+
int OnInit() {
   if(InpDashboardUrl == "" || InpDashboardPSK == "") {
      Print("[myfxboard] ERROR: Server URL and PSK must be set.");
      return INIT_PARAMETERS_INCORRECT;
   }
   DashboardConnector::Init(InpDashboardUrl, InpDashboardPSK, InpSyncIntervalSec, InpKeepaliveSec, InpDebugLog);
   EventSetMillisecondTimer(500);
   Print("[myfxboard] Connector started. Syncing every ", InpSyncIntervalSec, "s to ", InpDashboardUrl);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
   ObjectDelete(0, MFXB_DOT_OBJ);
   Print("[myfxboard] Connector stopped. Success=", DashboardConnector::GetSuccessCount(),
         " Errors=", DashboardConnector::GetErrorCount());
}

void OnTimer() {
   DashboardConnector::Sync();
   UpdateStatusDot();
}

void OnTick() {
   // Not needed - timer-driven only
}
