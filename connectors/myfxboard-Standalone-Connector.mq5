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

      // Backend auth expects unix epoch milliseconds, not terminal uptime milliseconds.
      long timestamp_ms = (long)TimeGMT() * 1000;
      string current_account = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
      s_last_sync_ms = now_ms;
      s_in_flight    = true;

      string payload   = BuildPayload(timestamp_ms, current_account);
      string signature = CreateSignature(current_account, timestamp_ms, s_psk);
      PostSync(payload, current_account, signature, timestamp_ms);
      return true;
   }

   static int  GetSuccessCount()          { return s_success_count; }
   static int  GetErrorCount()            { return s_error_count; }
   static void SetDebugLog(bool enabled)  { s_debug_log = enabled; }

private:
   static string BuildPayload(long sync_time_ms, string account_number) {
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

      // Collect all closed trades/deals from history
      // MT5 trades are pairs: BUY deal (entry) + SELL deal (exit)
      string closed_trades_json = "[";
      bool first_trade = true;
      
      // Build a map of deals by symbol, then pair entry/exit
      if(HistorySelect(0, sync_time_ms)) {
         int deals_total = HistoryDealsTotal();
         
         // Temporary storage for unpaired BUY deals (entry price, entry time, and the deal ticket)
         struct UnpairedEntry {
            string symbol;
            double entry_price;
            long entry_time_ms;
            ulong buy_deal_ticket;
         };
         UnpairedEntry entries[1000];
         int entry_count = 0;
         
         // First pass: collect all deals and pair them
         for(int i = 0; i < deals_total; i++) {
            ulong deal_ticket = HistoryDealGetTicket(i);
            if(deal_ticket == 0) continue;
            
            int deal_type = (int)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
            string deal_symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
            double deal_volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
            double deal_price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
            long deal_time_ms = HistoryDealGetInteger(deal_ticket, DEAL_TIME_MSC);
            double deal_profit = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT) + HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION) + HistoryDealGetDouble(deal_ticket, DEAL_SWAP);
            
            // BUY deal (type=0) = entry
            if(deal_type == 0) {
               if(entry_count < 1000) {
                  entries[entry_count].symbol = deal_symbol;
                  entries[entry_count].entry_price = deal_price;
                  entries[entry_count].entry_time_ms = deal_time_ms;
                  entries[entry_count].buy_deal_ticket = deal_ticket;
                  entry_count++;
               }
            }
            // SELL deal (type=1) = exit — match with most recent unpaired entry for same symbol
            else if(deal_type == 1) {
               int matched_idx = -1;
               // Find the most recent unpaired BUY for this symbol
               for(int j = entry_count - 1; j >= 0; j--) {
                  if(entries[j].symbol == deal_symbol) {
                     matched_idx = j;
                     break;
                  }
               }
               
               if(matched_idx >= 0) {
                  long entry_time = entries[matched_idx].entry_time_ms;
                  double entry_price = entries[matched_idx].entry_price;
                  long duration_ms = deal_time_ms - entry_time;
                  long duration_sec = duration_ms / 1000;
                  
                  if(!first_trade) closed_trades_json += ",";
                  first_trade = false;
                  
                  closed_trades_json += StringFormat(
                     "{\"symbol\":\"%s\",\"volume\":%.2f,\"entry\":%.5f,\"exit\":%.5f,\"profit\":%.2f,\"entry_time_ms\":%lld,\"exit_time_ms\":%lld,\"duration_sec\":%lld,\"method\":\"paired\"}",
                     deal_symbol, deal_volume, entry_price, deal_price, deal_profit, entry_time, deal_time_ms, duration_sec
                  );
                  
                  // Remove matched entry from the list
                  for(int k = matched_idx; k < entry_count - 1; k++) {
                     entries[k] = entries[k + 1];
                  }
                  entry_count--;
               }
            }
         }
      }
      closed_trades_json += "]";

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
         "{\"account_number\":\"%s\",\"positions\":%s,\"closed_trades\":%s,\"account\":%s,\"sync_id\":\"%lld\",\"ea_latest_closed_time_ms\":%lld,\"ea_latest_closed_deal_id\":\"\",\"open_positions_hash\":\"\"}",
         account_number, positions_json, closed_trades_json, account_json, sync_time_ms, sync_time_ms
      );

      if(s_debug_log)
         Print("[DashboardConnector] Payload: ", StringLen(payload), " bytes, trades: ", HistoryDealsTotal());

      return payload;
   }

   static string CreateSignature(string account_number, long timestamp_ms, string psk) {
      return "dashboard_v2_" + account_number + "_" + StringFormat("%lld", timestamp_ms) + "_" + psk;
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
         string response_text = CharArrayToString(response_data, 0, WHOLE_ARRAY, CP_UTF8);
         if(res >= 200 && res < 300) {
            if(s_debug_log)
               Print("[DashboardConnector] Sync accepted for account ", account_number,
                     " (", StringLen(payload), " bytes, status=", res, ")");
            s_success_count++;
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
