//+------------------------------------------------------------------+
//|                  myfxboard Standalone Connector v1.0             |
//|          Syncs open positions to the myfxboard web dashboard      |
//+------------------------------------------------------------------+
#property copyright "myfxboard"
#property version   "1.00"
#property strict
#property description "Standalone connector EA - syncs positions and account data to myfxboard dashboard"

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

      string current_account = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
      s_last_sync_ms = now_ms;
      s_in_flight    = true;

      string payload   = BuildPayload(now_ms, current_account);
      string signature = CreateSignature(current_account, now_ms, s_psk);
      PostSync(payload, current_account, signature, now_ms);
      return true;
   }

   static int  GetSuccessCount()          { return s_success_count; }
   static int  GetErrorCount()            { return s_error_count; }
   static void SetDebugLog(bool enabled)  { s_debug_log = enabled; }

private:
   static string BuildPayload(ulong sync_time_ms, string account_number) {
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

      double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
      double balance      = AccountInfoDouble(ACCOUNT_BALANCE);
      double margin_used  = AccountInfoDouble(ACCOUNT_MARGIN);
      double margin_free  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      double margin_level = (margin_used > 0) ? (equity * 100.0 / margin_used) : 0;

      string account_json = StringFormat(
         "{\"equity\":%.2f,\"balance\":%.2f,\"margin_used\":%.2f,\"margin_free\":%.2f,\"margin_level\":%.2f}",
         equity, balance, margin_used, margin_free, margin_level
      );

      string payload = StringFormat(
         "{\"account_number\":\"%s\",\"positions\":%s,\"closed_trades\":[],\"account\":%s,\"sync_id\":\"%lld\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"\",\"open_positions_hash\":\"\"}",
         account_number, positions_json, account_json, sync_time_ms, sync_time_ms
      );

      if(s_debug_log)
         Print("[DashboardConnector] Payload: ", StringLen(payload), " bytes");

      return payload;
   }

   static string CreateSignature(string account_number, ulong timestamp_ms, string psk) {
      return "dashboard_v2_" + account_number + "_" + IntegerToString((int)timestamp_ms) + "_" + psk;
   }

   static void PostSync(string payload, string account_number, string signature, long timestamp_ms) {
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
         if(s_debug_log)
            Print("[DashboardConnector] Sync sent for account ", account_number,
                  " (", StringLen(payload), " bytes, response=", res, ")");
         s_success_count++;
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
