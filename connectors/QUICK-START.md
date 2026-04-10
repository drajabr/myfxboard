# Quick Integration Guide - Dashboard Connector

Use this guide to integrate the Dashboard Connector with ANY Expert Advisor.

## 30-Second Integration

### Step 1: Copy Connector File
Copy `DashboardConnector.mqh` to your EA folder.

### Step 2: Include in EA
Add this at the top of your EA (after #property statements):

```mql5
#include "DashboardConnector.mqh"
```

### Step 3: Initialize
Add this to your OnInit() function:

```mql5
void OnInit() {
   // Your existing code...
   
   // Initialize connector (add these 4 lines)
   DashboardConnector::Init(
      "http://localhost:3000",      // Server URL
      "EURUSD_001",                 // Account ID (from dashboard)
      "your_secret_key",            // PSK (from dashboard Settings)
      3                             // Sync every 3 seconds
   );
}
```

### Step 4: Sync in Timer/Tick
Add this to your OnTimer() or frequent OnTick():

```mql5
// Sync positions (low overhead - skips if not time yet)
DashboardConnector::Sync();
```

### Done! ✅

Your EA now syncs to the dashboard. Start seeing real-time positions on the web dashboard.

---

## Full Example EA

```mql5
//+------------------------------------------------------------------+
//|                     My Trading EA with Dashboard                |
//+------------------------------------------------------------------+
#property version "1.0"
#include "DashboardConnector.mqh"

input bool InpEnable = true;
input string InpDashUrl = "http://localhost:3000";
input string InpDashAccount = "EURUSD_001";
input string InpDashKey = "secret_key";

void OnInit() {
   if (InpEnable) {
      DashboardConnector::Init(InpDashUrl, InpDashAccount, InpDashKey, 3, true);
   }
}

void OnTick() {
   // Your trading logic here...
   
   // Sync to dashboard
   if (InpEnable) {
      DashboardConnector::Sync();
   }
}
```

---

## Configuration

### Get Your Dashboard Credentials

1. Start dashboard: `docker-compose up -d`
2. Open: http://localhost
3. Click Settings (🔓)
4. Enter Master Token: `test-master-token-12345`
5. Click "Create Account"
6. Fill in Account ID (e.g., "EURUSD_001")
7. Copy the Secret Key shown
8. Use these in your EA:

```mql5
DashboardConnector::Init(
   "http://localhost:3000",    // Server URL (from docker-compose)
   "EURUSD_001",              // From dashboard
   "secret_key_here",         // Copy from dashboard
   3                          // Sync interval
);
```

---

## Advanced Usage

### With Debug Logging

```mql5
DashboardConnector::Init(url, id, key, 3, true);  // Last param = debug on
```

### Check Statistics

```mql5
void OnTick() {
   if (DashboardConnector::Sync()) {
      Print("Success count: ", DashboardConnector::GetSuccessCount());
      Print("Error count: ", DashboardConnector::GetErrorCount());
   }
}
```

### Dynamic Enable/Disable

```mql5
void OnStart() {
   if (some_condition) {
      DashboardConnector::Init(url, id, key, 3);  // Enable
   }
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Account mismatch" | EA Account ID must match dashboard Account ID |
| No sync happening | Call `DashboardConnector::Sync()` regularly |
| Connection refused | Start dashboard: `docker-compose up -d` |
| Wrong positions shown | Verify Account ID matches current MT5 account |
| High error count | Check network/firewall, verify URL is correct |

---

## Production Checklist

- [ ] Change `InpDashUrl` to production server: `https://your-domain.com`
- [ ] Verify Account ID matches MT5 account number
- [ ] Update PSK from production dashboard
- [ ] Disable debug logging: Set 5th param to `false`
- [ ] Test with small position first
- [ ] Monitor logs for errors: `docker-compose logs api`
- [ ] Ready to trade!

---

## That's It!

Your EA now syncs with myfxboard dashboard. See real-time positions, equity, and P&L on the web dashboard 24/7.

**Happy trading!** 🚀
