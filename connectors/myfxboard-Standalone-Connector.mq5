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
input bool   InpDebugLog             = false;                   // Debug Logging

//+------------------------------------------------------------------+
//| DashboardConnector class                                         |
//+------------------------------------------------------------------+
class DashboardConnector {
private:
   static string   s_url;
   static string   s_psk;
   static int      s_sync_interval_ms;
   static ulong    s_last_sync_ms;
   static bool     s_in_flight;
   static int      s_success_count;
   static int      s_error_count;
   static bool     s_debug_log;
   static ulong    s_last_log_ms;
   static uint     s_last_live_payload_hash;
   static long     s_last_live_payload_sent_ms;
   static string   s_last_ack_history_hash;

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
   static void Init(string url, string psk, int interval_sec, bool debug = false) {
      s_url              = url;
      s_psk              = psk;
      s_sync_interval_ms = interval_sec * 1000;
      s_debug_log        = debug;
      s_last_sync_ms     = 0;
      s_in_flight        = false;
      s_success_count    = 0;
      s_error_count      = 0;
      s_last_live_payload_hash = 0;
      s_last_live_payload_sent_ms = 0;
      s_last_ack_history_hash = "";
      if(s_debug_log)
         Print("[DashboardConnector] Initialized: url=", s_url, " interval=", interval_sec, "s");
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
      bool include_history = (history_hash != s_last_ack_history_hash);

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

      const long unchanged_keepalive_ms = 60000;
      if(!include_history
         && live_payload_hash == s_last_live_payload_hash
         && s_last_live_payload_sent_ms > 0
         && (timestamp_ms - s_last_live_payload_sent_ms) < unchanged_keepalive_ms) {
         s_last_sync_ms = now_ms;
         if(s_debug_log && now_ms - s_last_log_ms > 30000) {
            Print("[DashboardConnector] No live payload changes, skipping sync");
            s_last_log_ms = now_ms;
         }
         return false;
      }

      string signature = CreateSignature(current_account, timestamp_ms, s_psk);
      s_last_sync_ms = now_ms;
      s_in_flight    = true;
      PostSync(payload, current_account, signature, timestamp_ms, live_payload_hash, include_history, history_hash);
      return true;
   }

   static int  GetSuccessCount()          { return s_success_count; }
   static int  GetErrorCount()            { return s_error_count; }
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

         positions_json += StringFormat(
            "{\"symbol\":\"%s\",\"volume\":%.2f,\"open_price\":%.5f,\"avg_sl\":%.5f,\"avg_tp\":%.5f,\"open_time_ms\":%lld,\"pnl\":%.2f,\"direction\":%d}",
            symbol, volume, open_price, sl, tp, open_time_ms, pnl, (int)dir
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
         int deals_total = HistoryDealsTotal();

         struct PositionEntry {
            long position_id;
            string symbol;
            double avg_entry_price;
            double open_volume;
            long first_entry_time_ms;
            bool active;
         };
         PositionEntry entries[2000];
         int entry_count = 0;

         for(int i = 0; i < deals_total; i++) {
            ulong deal_ticket = HistoryDealGetTicket(i);
            if(deal_ticket == 0) continue;

            int deal_type = (int)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
            if(deal_type != DEAL_TYPE_BUY && deal_type != DEAL_TYPE_SELL)
               continue;

            int deal_entry = (int)HistoryDealGetInteger(deal_ticket, DEAL_ENTRY);
            long position_id = (long)HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
            string deal_symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
            if(deal_symbol == "")
               continue;

            double deal_volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
            double deal_price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
            long deal_time_ms = HistoryDealGetInteger(deal_ticket, DEAL_TIME_MSC);
            double deal_profit = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT) + HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION) + HistoryDealGetDouble(deal_ticket, DEAL_SWAP);

            if(position_id <= 0)
               continue;

            int pos_idx = -1;
            for(int idx = 0; idx < entry_count; idx++) {
               if(entries[idx].active && entries[idx].position_id == position_id) {
                  pos_idx = idx;
                  break;
               }
            }

            if(deal_entry == DEAL_ENTRY_IN) {
               if(pos_idx >= 0) {
                  double new_total_volume = entries[pos_idx].open_volume + deal_volume;
                  if(new_total_volume > 0.0) {
                     entries[pos_idx].avg_entry_price = ((entries[pos_idx].avg_entry_price * entries[pos_idx].open_volume) + (deal_price * deal_volume)) / new_total_volume;
                     entries[pos_idx].open_volume = new_total_volume;
                     if(deal_time_ms < entries[pos_idx].first_entry_time_ms)
                        entries[pos_idx].first_entry_time_ms = deal_time_ms;
                  }
               } else if(entry_count < 2000) {
                  entries[entry_count].position_id = position_id;
                  entries[entry_count].symbol = deal_symbol;
                  entries[entry_count].avg_entry_price = deal_price;
                  entries[entry_count].open_volume = deal_volume;
                  entries[entry_count].first_entry_time_ms = deal_time_ms;
                  entries[entry_count].active = true;
                  entry_count++;
               }
            }

            if(deal_entry == DEAL_ENTRY_OUT || deal_entry == DEAL_ENTRY_OUT_BY) {
               long entry_time = deal_time_ms;
               double entry_price = deal_price;

               if(pos_idx >= 0) {
                  entry_time = entries[pos_idx].first_entry_time_ms;
                  entry_price = entries[pos_idx].avg_entry_price;

                  entries[pos_idx].open_volume -= deal_volume;
                  if(entries[pos_idx].open_volume <= 0.00000001) {
                     entries[pos_idx].open_volume = 0.0;
                     entries[pos_idx].active = false;
                  }
               }

               long duration_ms = deal_time_ms - entry_time;
               long duration_sec = duration_ms / 1000;
               if(duration_sec < 0) duration_sec = 0;

               if(!first_trade) closed_trades_json += ",";
               first_trade = false;

               closed_trades_json += StringFormat(
                  "{\"symbol\":\"%s\",\"volume\":%.2f,\"entry\":%.5f,\"exit\":%.5f,\"profit\":%.5f,\"entry_time_ms\":%lld,\"exit_time_ms\":%lld,\"duration_sec\":%lld,\"method\":\"deal_out\"}",
                  deal_symbol, deal_volume, entry_price, deal_price, deal_profit, entry_time, deal_time_ms, duration_sec
               );

               if(deal_time_ms > latest_closed_time_ms) {
                  latest_closed_time_ms = deal_time_ms;
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

   static string CreateSignature(string account_number, long timestamp_ms, string psk) {
      return "dashboard_v2_" + account_number + "_" + StringFormat("%lld", timestamp_ms) + "_" + psk;
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
            s_last_live_payload_hash = live_payload_hash;
            s_last_live_payload_sent_ms = timestamp_ms;
            if(history_sync_required && s_debug_log)
               Print("[DashboardConnector] Server requested history resend (hash mismatch)");
         } else {
            s_error_count++;
            if(s_debug_log)
               Print("[DashboardConnector] Sync rejected for account ", account_number,
                     " (status=", res, ", body=", response_text, ")");
         }
      }
      s_in_flight = false;
   }
};

// Static member initialization
string DashboardConnector::s_url              = "";
string DashboardConnector::s_psk              = "";
int    DashboardConnector::s_sync_interval_ms = 3000;
ulong  DashboardConnector::s_last_sync_ms     = 0;
bool   DashboardConnector::s_in_flight        = false;
int    DashboardConnector::s_success_count    = 0;
int    DashboardConnector::s_error_count      = 0;
bool   DashboardConnector::s_debug_log        = false;
ulong  DashboardConnector::s_last_log_ms      = 0;
uint   DashboardConnector::s_last_live_payload_hash = 0;
long   DashboardConnector::s_last_live_payload_sent_ms = 0;
string DashboardConnector::s_last_ack_history_hash = "";

//+------------------------------------------------------------------+
//| EA lifecycle                                                     |
//+------------------------------------------------------------------+
int OnInit() {
   if(InpDashboardUrl == "" || InpDashboardPSK == "") {
      Print("[myfxboard] ERROR: Server URL and PSK must be set.");
      return INIT_PARAMETERS_INCORRECT;
   }
   DashboardConnector::Init(InpDashboardUrl, InpDashboardPSK, InpSyncIntervalSec, InpDebugLog);
   EventSetMillisecondTimer(500);
   Print("[myfxboard] Connector started. Syncing every ", InpSyncIntervalSec, "s to ", InpDashboardUrl);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
   Print("[myfxboard] Connector stopped. Success=", DashboardConnector::GetSuccessCount(),
         " Errors=", DashboardConnector::GetErrorCount());
}

void OnTimer() {
   DashboardConnector::Sync();
}

void OnTick() {
   // Not needed - timer-driven only
}
