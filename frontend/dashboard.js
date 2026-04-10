const API_URL = '/api';
const THEME_KEY = 'themePreference';

let autoRefreshInterval;
let monthShift = 0;
let yearShift = 0;

const charts = {
    equityCurve: null,
    winLoss: null,
    dailyPnl: null,
    symbolExposure: null,
};

const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

function formatMoney(value) {
    return `$ ${Number(value || 0).toFixed(2)}`;
}

function formatPrice(value, decimals = 5) {
    return Number(value || 0).toFixed(decimals).replace(/\.?0+$/, '');
}

function formatPct(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function pnlClass(value) {
    if (value > 0) {
        return 'pnl-positive';
    }
    if (value < 0) {
        return 'pnl-negative';
    }
    return 'pnl-neutral';
}

function applyPnlClass(el, value) {
    el.classList.remove('pnl-positive', 'pnl-negative', 'pnl-neutral');
    el.classList.add(pnlClass(Number(value || 0)));
}

function durationLabel(seconds) {
    const sec = Math.max(0, Math.round(seconds || 0));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) {
        return `${d}d ${h}h`;
    }
    if (h > 0) {
        return `${h}h ${m}m`;
    }
    return `${m}m`;
}

function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
        return saved;
    }
    return themeMedia.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = theme;
    }
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    loadDashboard();
}

function applyThemeFromSystemIfNeeded() {
    if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(themeMedia.matches ? 'dark' : 'light');
    }
}

function setupEventListeners() {
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    document.getElementById('accountSelector').addEventListener('change', (e) => {
        localStorage.setItem('selectedAccount', e.target.value);
        monthShift = 0;
        yearShift = 0;
        loadDashboard();
    });

    document.getElementById('monthPrevBtn').addEventListener('click', () => {
        monthShift -= 1;
        loadDashboard();
    });
    document.getElementById('monthNextBtn').addEventListener('click', () => {
        monthShift += 1;
        loadDashboard();
    });

    document.getElementById('yearPrevBtn').addEventListener('click', () => {
        yearShift -= 1;
        loadDashboard();
    });
    document.getElementById('yearNextBtn').addEventListener('click', () => {
        yearShift += 1;
        loadDashboard();
    });

    themeMedia.addEventListener('change', applyThemeFromSystemIfNeeded);
}

async function loadAccounts() {
    const accountsRes = await fetch(`${API_URL}/account`);
    if (!accountsRes.ok) {
        throw new Error('Failed to load accounts');
    }
    return accountsRes.json();
}

function syncAccountSelector(accounts) {
    const selector = document.getElementById('accountSelector');
    const selected = localStorage.getItem('selectedAccount') || '';
    selector.innerHTML = '<option value="">Aggregated (All Accounts)</option>';

    accounts.forEach((acc) => {
        const option = document.createElement('option');
        option.value = acc.account_id;
        option.textContent = acc.account_name || acc.account_id;
        selector.appendChild(option);
    });

    selector.value = selected;
}

async function fetchAnalytics(accountId) {
    const scope = accountId || 'all';
    const url = `${API_URL}/account/analytics?accountId=${encodeURIComponent(scope)}&days=365&monthShift=${monthShift}&yearShift=${yearShift}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to load analytics');
    }
    return res.json();
}

function updateStatusStrip(summary) {
    document.getElementById('lastRefresh').textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
    document.getElementById('accountsCount').textContent = `Accounts: ${summary.accounts_count}`;
    document.getElementById('positionsCount').textContent = `Open positions: ${summary.open_positions}`;
}

function updateKpis(summary, periods, tradeMetrics) {
    const equityEl = document.getElementById('equity');
    const floatingEl = document.getElementById('floatingPnl');
    const dailyEl = document.getElementById('dailyPnl');
    const winRateEl = document.getElementById('winRate');
    const marginEl = document.getElementById('marginLevel');

    equityEl.textContent = formatMoney(summary.equity);
    floatingEl.textContent = formatMoney(summary.floating_pnl);
    dailyEl.textContent = formatMoney(periods.today.pnl);
    winRateEl.textContent = formatPct(tradeMetrics.win_rate_pct);
    marginEl.textContent = formatPct(summary.margin_level_pct);

    applyPnlClass(floatingEl, summary.floating_pnl);
    applyPnlClass(dailyEl, periods.today.pnl);
}

function renderPeriodStats(periods) {
    const grid = document.getElementById('periodStatsGrid');
    const labels = [
        ['today', 'Today'],
        ['last7d', 'Last 7 Days'],
        ['last30d', 'Last 30 Days'],
        ['ytd', 'YTD'],
        ['all_time', 'All Time'],
    ];

    grid.innerHTML = labels.map(([key, title]) => {
        const p = periods[key];
        return `
            <div class="metric-card">
                <div class="label">${title}</div>
                <div class="value ${pnlClass(p.pnl)}">${formatMoney(p.pnl)}</div>
                <div class="label">Trades: ${p.trades_count} | Win rate: ${formatPct(p.win_rate_pct)}</div>
            </div>
        `;
    }).join('');
}

function renderTradeMetrics(metrics) {
    const grid = document.getElementById('tradeMetricsGrid');
    const cards = [
        ['Win Rate', formatPct(metrics.win_rate_pct), metrics.win_rate_pct],
        ['Average Win', formatMoney(metrics.avg_win), metrics.avg_win],
        ['Average Loss', formatMoney(metrics.avg_loss), metrics.avg_loss],
        ['Max Win', formatMoney(metrics.max_win), metrics.max_win],
        ['Max Loss', formatMoney(metrics.max_loss), metrics.max_loss],
        ['Avg Hold Time', durationLabel(metrics.avg_hold_seconds), 0],
    ];

    grid.innerHTML = cards.map(([label, value, pnl]) => `
        <div class="metric-card">
            <div class="label">${label}</div>
            <div class="value ${label.includes('Hold') || label.includes('Rate') ? '' : pnlClass(pnl)}">${value}</div>
        </div>
    `).join('');
}

function updatePositionsTable(positions) {
    const tbody = document.getElementById('positionsTable');
    if (!positions || positions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No open positions</td></tr>';
        return;
    }

    tbody.innerHTML = positions.map((pos) => `
        <tr>
            <td>${pos.symbol}</td>
            <td>${Number(pos.size || 0).toFixed(2)}</td>
            <td>${formatPrice(pos.entry_price)}</td>
            <td>${pos.current_price !== null ? formatPrice(pos.current_price) : '-'}</td>
            <td class="${pnlClass(pos.unrealized_pnl || 0)}">${formatMoney(pos.unrealized_pnl || 0)}</td>
            <td>${pos.avg_sl !== null ? formatPrice(pos.avg_sl) : '-'}</td>
            <td>${pos.avg_tp !== null ? formatPrice(pos.avg_tp) : '-'}</td>
        </tr>
    `).join('');
}

function updateTradesTable(trades) {
    const tbody = document.getElementById('tradesTable');
    if (!trades || trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No trades</td></tr>';
        return;
    }

    tbody.innerHTML = trades.map((trade) => {
        const entryTime = trade.entry_time_ms ? new Date(trade.entry_time_ms).toLocaleString() : '-';
        const direction = trade.profit > 0 ? 'SELL' : trade.profit < 0 ? 'BUY' : '-';
        return `
        <tr>
            <td>${trade.symbol}</td>
            <td>${formatPrice(trade.entry_price)}</td>
            <td>${trade.exit_price !== null ? formatPrice(trade.exit_price) : '-'}</td>
            <td>${Number(trade.size || 0).toFixed(2)}</td>
            <td class="${pnlClass(trade.profit || 0)}">${formatMoney(trade.profit || 0)}</td>
            <td>${trade.result || '-'}</td>
            <td>${direction}</td>
            <td>${entryTime}</td>
        </tr>
    `}).join('');
}

function destroyChart(chart) {
    if (chart) {
        chart.destroy();
    }
}

function getChartColorVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function updateCharts(data) {
    destroyChart(charts.equityCurve);
    destroyChart(charts.winLoss);
    destroyChart(charts.dailyPnl);
    destroyChart(charts.symbolExposure);

    const positive = getChartColorVar('--pnl-positive');
    const negative = getChartColorVar('--pnl-negative');
    const neutral = getChartColorVar('--pnl-neutral');
    const text = getChartColorVar('--text');

    const equityLabels = data.equity_curve.map((d) => new Date(d.ts).toLocaleDateString());
    const equityValues = data.equity_curve.map((d) => d.equity);

    charts.equityCurve = new Chart(document.getElementById('equityCurveChart'), {
        type: 'line',
        data: {
            labels: equityLabels,
            datasets: [{
                label: 'Equity',
                data: equityValues,
                borderColor: positive,
                backgroundColor: 'rgba(31, 111, 235, 0.12)',
                tension: 0.25,
                pointRadius: 0,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: text } } },
        },
    });

    const wins = data.recent_trades.filter((t) => (t.profit || 0) > 0).length;
    const losses = data.recent_trades.filter((t) => (t.profit || 0) < 0).length;
    const neutralCount = data.recent_trades.length - wins - losses;

    charts.winLoss = new Chart(document.getElementById('winLossChart'), {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses', 'Neutral'],
            datasets: [{ data: [wins, losses, neutralCount], backgroundColor: [positive, negative, neutral] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });

    const pnlByDay = new Map();
    const from = Date.now() - (30 * 24 * 60 * 60 * 1000);
    data.recent_trades.forEach((t) => {
        const ts = t.exit_time_ms || t.entry_time_ms;
        if (!ts || ts < from) {
            return;
        }
        const key = new Date(ts).toLocaleDateString();
        pnlByDay.set(key, (pnlByDay.get(key) || 0) + (t.profit || 0));
    });

    const dailyLabels = Array.from(pnlByDay.keys());
    const dailyValues = Array.from(pnlByDay.values());

    charts.dailyPnl = new Chart(document.getElementById('dailyPnlChart'), {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: [{
                label: 'Daily PnL',
                data: dailyValues,
                backgroundColor: dailyValues.map((v) => v > 0 ? positive : v < 0 ? negative : neutral),
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: text } } },
        },
    });

    charts.symbolExposure = new Chart(document.getElementById('symbolExposureChart'), {
        type: 'bar',
        data: {
            labels: data.symbol_exposure.slice(0, 10).map((s) => s.symbol),
            datasets: [{
                label: 'Exposure',
                data: data.symbol_exposure.slice(0, 10).map((s) => s.size),
                backgroundColor: positive,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: text } } },
        },
    });
}

function renderMonthlyCalendar(monthly) {
    document.getElementById('monthCalendarTitle').textContent = monthly.title;
    const target = document.getElementById('monthCalendar');

    const cells = [];
    for (let i = 0; i < monthly.first_weekday; i += 1) {
        cells.push('<div class="calendar-cell empty"></div>');
    }

    monthly.days.forEach((d) => {
        cells.push(`
            <div class="calendar-cell">
                <div class="day">${d.day}</div>
                <div class="${pnlClass(d.pnl)}">${formatMoney(d.pnl)}</div>
                <div>${d.trades} trades</div>
            </div>
        `);
    });

    target.innerHTML = cells.join('');
}

function renderYearlyCalendar(yearly) {
    document.getElementById('yearCalendarTitle').textContent = yearly.title;
    const target = document.getElementById('yearCalendar');

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    target.innerHTML = yearly.months.map((m) => `
        <div class="year-card">
            <div class="month">${monthNames[m.month - 1]}</div>
            <div class="${pnlClass(m.pnl)}">${formatMoney(m.pnl)}</div>
            <div>${m.trades} trades</div>
        </div>
    `).join('');
}

async function loadDashboard() {
    try {
        const accounts = await loadAccounts();
        syncAccountSelector(accounts);

        const selectedAccount = localStorage.getItem('selectedAccount') || '';
        const data = await fetchAnalytics(selectedAccount);

        updateStatusStrip(data.summary);
        updateKpis(data.summary, data.periods, data.trade_metrics);
        renderPeriodStats(data.periods);
        renderTradeMetrics(data.trade_metrics);
        updatePositionsTable(data.positions);
        updateTradesTable(data.recent_trades);
        updateCharts(data);
        renderMonthlyCalendar(data.calendars.monthly);
        renderYearlyCalendar(data.calendars.yearly);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function startAutoRefresh(interval) {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(loadDashboard, interval);
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    setupEventListeners();
    loadDashboard();
    startAutoRefresh(5000);
});


