const API_URL = '/api';
const THEME_KEY = 'themePreference';

let autoRefreshInterval;
let monthShift = 0;
let yearShift = 0;
let tradesLimit = 10;
let activeTradeFilter = null;
let exposureSort = { key: 'size', direction: 'desc' };

const charts = {
    equityCurve: null,
    winLoss: null,
    dailyPnl: null,
};

const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');

function formatMoney(value) {
    return `$ ${Number(value || 0).toFixed(2)}`;
}

function formatPrice(value, decimals = 5) {
    return Number(value || 0).toFixed(decimals).replace(/\.?0+$/, '');
}

function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function formatDateTimeMs(value) {
    const ms = toNum(value, 0);
    if (!ms) {
        return '-';
    }
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function formatDateMs(value) {
    const ms = toNum(value, 0);
    if (!ms) {
        return '';
    }
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
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

    document.getElementById('resetTradesFilterBtn').addEventListener('click', () => {
        activeTradeFilter = null;
        tradesLimit = 10;
        loadDashboard();
    });

    document.getElementById('loadMoreTradesBtn').addEventListener('click', () => {
        tradesLimit += 10;
        loadDashboard();
    });

    document.querySelectorAll('[data-exposure-sort]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-exposure-sort');
            if (!key) {
                return;
            }
            if (exposureSort.key === key) {
                exposureSort.direction = exposureSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                exposureSort.key = key;
                exposureSort.direction = key === 'symbol' ? 'asc' : 'desc';
            }
            loadDashboard();
        });
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
    const params = new URLSearchParams({
        accountId: scope,
        days: '365',
        monthShift: String(monthShift),
        yearShift: String(yearShift),
        recentTradesLimit: String(tradesLimit),
    });
    if (activeTradeFilter) {
        params.set('tradeFromMs', String(activeTradeFilter.fromMs));
        params.set('tradeToMs', String(activeTradeFilter.toMs));
    }
    const url = `${API_URL}/account/analytics?${params.toString()}`;
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

    equityEl.textContent = formatMoney(summary.equity);
    floatingEl.textContent = formatMoney(summary.floating_pnl);
    dailyEl.textContent = formatMoney(periods.today.pnl);
    winRateEl.textContent = formatPct(tradeMetrics.win_rate_pct);

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
        const openTime = formatDateTimeMs(trade.entry_time_ms);
        const closeTime = formatDateTimeMs(trade.exit_time_ms);
        return `
        <tr>
            <td>${trade.symbol}</td>
            <td>${formatPrice(trade.entry_price)}</td>
            <td>${trade.exit_price !== null ? formatPrice(trade.exit_price) : '-'}</td>
            <td>${Number(trade.size || 0).toFixed(2)}</td>
            <td class="${pnlClass(trade.profit || 0)}">${formatMoney(trade.profit || 0)}</td>
            <td>${trade.result || '-'}</td>
            <td>${openTime}</td>
            <td>${closeTime}</td>
        </tr>
    `}).join('');
}

function updateExposureTable(exposureRows) {
    const tbody = document.getElementById('exposureTable');
    const rows = Array.isArray(exposureRows) ? [...exposureRows] : [];
    rows.sort((a, b) => {
        if (exposureSort.key === 'symbol') {
            const cmp = String(a.symbol || '').localeCompare(String(b.symbol || ''));
            return exposureSort.direction === 'asc' ? cmp : -cmp;
        }
        const diff = toNum(a.size) - toNum(b.size);
        return exposureSort.direction === 'asc' ? diff : -diff;
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">No exposure</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td>${row.symbol || '-'}</td>
            <td>${toNum(row.size).toFixed(2)}</td>
        </tr>
    `).join('');
}

function updateTradeControls(data) {
    const filterLabel = document.getElementById('tradesFilterLabel');
    const countInfo = document.getElementById('tradesCountInfo');
    const resetBtn = document.getElementById('resetTradesFilterBtn');
    const loadMoreBtn = document.getElementById('loadMoreTradesBtn');

    filterLabel.textContent = activeTradeFilter ? `Filter: ${activeTradeFilter.label}` : 'Filter: None';
    countInfo.textContent = `Showing ${toNum(data.trades_returned)} of ${toNum(data.trades_total_matching)} trades`;
    resetBtn.disabled = !activeTradeFilter;
    loadMoreBtn.disabled = toNum(data.trades_returned) >= toNum(data.trades_total_matching);
}

function setDayFilter(year, month, day) {
    const from = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const to = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    activeTradeFilter = {
        fromMs: from,
        toMs: to,
        label: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
    tradesLimit = 10;
    loadDashboard();
}

function setMonthFilter(year, month) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
    const to = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    activeTradeFilter = {
        fromMs: from,
        toMs: to,
        label: `${year}-${String(month).padStart(2, '0')}`,
    };
    tradesLimit = 10;
    loadDashboard();
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

    const positive = getChartColorVar('--pnl-positive');
    const negative = getChartColorVar('--pnl-negative');
    const neutral = getChartColorVar('--pnl-neutral');
    const text = getChartColorVar('--text');

    const equityLabels = data.equity_curve.map((d) => formatDateMs(d.ts));
    const equityValues = data.equity_curve.map((d) => toNum(d.equity));

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

    const wins = toNum(data.filtered_distribution?.wins);
    const losses = toNum(data.filtered_distribution?.losses);
    const neutralCount = toNum(data.filtered_distribution?.neutral);

    charts.winLoss = new Chart(document.getElementById('winLossChart'), {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses', 'Neutral'],
            datasets: [{ data: [wins, losses, neutralCount], backgroundColor: [positive, negative, neutral] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });

    const dailyRows = Array.isArray(data.filtered_daily_pnl) ? data.filtered_daily_pnl : [];
    const dailyLabels = dailyRows.map((r) => r.date || '');
    const dailyValues = dailyRows.map((r) => toNum(r.pnl));

    const dailyTitle = document.getElementById('dailyPnlChartTitle');
    if (dailyTitle) {
        dailyTitle.textContent = activeTradeFilter
            ? `Daily PnL (${activeTradeFilter.label})`
            : 'Daily PnL (Last 30 Days)';
    }

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
}

function renderMonthlyCalendar(monthly) {
    document.getElementById('monthCalendarTitle').textContent = monthly.title;
    const target = document.getElementById('monthCalendar');

    const cells = [];
    for (let i = 0; i < monthly.first_weekday; i += 1) {
        cells.push('<div class="calendar-cell empty"></div>');
    }

    monthly.days.forEach((d) => {
        const canFilter = toNum(d.trades) > 0;
        cells.push(`
            <div class="calendar-cell ${canFilter ? 'filterable' : ''}" ${canFilter ? `data-day="${d.day}"` : ''}>
                <div class="day">${d.day}</div>
                <div class="${pnlClass(d.pnl)}">${formatMoney(d.pnl)}</div>
                <div>${d.trades} trades</div>
            </div>
        `);
    });

    target.innerHTML = cells.join('');

    target.querySelectorAll('.calendar-cell.filterable[data-day]').forEach((el) => {
        el.addEventListener('click', () => {
            const day = toNum(el.getAttribute('data-day'));
            if (day > 0) {
                setDayFilter(monthly.year, monthly.month, day);
            }
        });
    });
}

function renderYearlyCalendar(yearly) {
    document.getElementById('yearCalendarTitle').textContent = yearly.title;
    const target = document.getElementById('yearCalendar');

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    target.innerHTML = yearly.months.map((m) => `
        <div class="year-card ${toNum(m.trades) > 0 ? 'filterable' : ''}" ${toNum(m.trades) > 0 ? `data-month="${m.month}"` : ''}>
            <div class="month">${monthNames[m.month - 1]}</div>
            <div class="${pnlClass(m.pnl)}">${formatMoney(m.pnl)}</div>
            <div>${m.trades} trades</div>
        </div>
    `).join('');

    target.querySelectorAll('.year-card.filterable[data-month]').forEach((el) => {
        el.addEventListener('click', () => {
            const month = toNum(el.getAttribute('data-month'));
            if (month > 0) {
                setMonthFilter(yearly.year, month);
            }
        });
    });
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
        updateExposureTable(data.symbol_exposure);
        updateTradesTable(data.recent_trades);
        updateTradeControls(data);
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


