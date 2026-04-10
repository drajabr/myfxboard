const API_URL = '/api';
const THEME_KEY = 'themePreference';
const DASHBOARD_REFRESH_MS = 5000;
const ACCOUNTS_REFRESH_MS = 60000;

const state = {
    autoRefreshInterval: null,
    monthShift: 0,
    yearShift: 0,
    tradesLimit: 10,
    activeTradeFilter: null,
    exposureSort: { key: 'size', direction: 'desc' },
    accounts: [],
    accountsFetchedAt: 0,
    inflight: false,
    pendingRefresh: false,
    lastData: null,
};

const charts = {
    pnlCurve: null,
    dailyPnl: null,
    pnlByDayOfWeek: null,
    pnlByHourOfDay: null,
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

function formatDateShortMs(value) {
    const ms = toNum(value, 0);
    if (!ms) {
        return '';
    }
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function formatPct(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function formatDeltaPct(value) {
    const numeric = toNum(value, 0);
    const arrow = numeric > 0 ? '↑' : numeric < 0 ? '↓' : '→';
    const sign = numeric > 0 ? '+' : '';
    return `${arrow} ${sign}${numeric.toFixed(1)}%`;
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
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
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
        state.monthShift = 0;
        state.yearShift = 0;
        loadDashboard();
    });

    document.getElementById('monthPrevBtn').addEventListener('click', () => {
        state.monthShift -= 1;
        loadDashboard();
    });
    document.getElementById('monthNextBtn').addEventListener('click', () => {
        state.monthShift += 1;
        loadDashboard();
    });

    document.getElementById('yearPrevBtn').addEventListener('click', () => {
        state.yearShift -= 1;
        loadDashboard();
    });
    document.getElementById('yearNextBtn').addEventListener('click', () => {
        state.yearShift += 1;
        loadDashboard();
    });

    document.getElementById('resetTradesFilterBtn').addEventListener('click', () => {
        state.activeTradeFilter = null;
        state.tradesLimit = 10;
        loadDashboard();
    });

    document.getElementById('loadMoreTradesBtn').addEventListener('click', () => {
        state.tradesLimit += 10;
        loadDashboard();
    });

    document.querySelectorAll('[data-exposure-sort]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-exposure-sort');
            if (!key) {
                return;
            }
            if (state.exposureSort.key === key) {
                state.exposureSort.direction = state.exposureSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.exposureSort.key = key;
                state.exposureSort.direction = key === 'symbol' ? 'asc' : 'desc';
            }
            loadDashboard();
        });
    });

    document.getElementById('monthCalendar').addEventListener('click', (event) => {
        const cell = event.target.closest('.calendar-cell.filterable[data-day]');
        if (!cell) {
            return;
        }
        const day = toNum(cell.getAttribute('data-day'));
        const year = toNum(cell.getAttribute('data-year'));
        const month = toNum(cell.getAttribute('data-month'));
        if (day > 0 && year > 0 && month > 0) {
            setDayFilter(year, month, day);
        }
    });

    document.getElementById('yearCalendar').addEventListener('click', (event) => {
        const card = event.target.closest('.year-card.filterable[data-month][data-year]');
        if (!card) {
            return;
        }
        const month = toNum(card.getAttribute('data-month'));
        const year = toNum(card.getAttribute('data-year'));
        if (month > 0 && year > 0) {
            setMonthFilter(year, month);
        }
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

async function loadAccountsIfNeeded(force = false) {
    const now = Date.now();
    if (!force && state.accounts.length > 0 && (now - state.accountsFetchedAt) < ACCOUNTS_REFRESH_MS) {
        return state.accounts;
    }
    const accounts = await loadAccounts();
    state.accounts = accounts;
    state.accountsFetchedAt = now;
    syncAccountSelector(accounts);
    return accounts;
}

function syncAccountSelector(accounts) {
    const selector = document.getElementById('accountSelector');
    const selected = localStorage.getItem('selectedAccount') || '';
    selector.innerHTML = '<option value="">Aggregated (All Accounts)</option>';

    const now = Date.now();
    const healthThresholdMs = 5 * 60 * 1000;

    accounts.forEach((acc) => {
        const option = document.createElement('option');
        option.value = acc.account_id;
        const lastHealthMs = toNum(acc.last_ingest_received_at, 0) || toNum(acc.last_sync_at, 0);
        const healthy = lastHealthMs > 0 && (now - lastHealthMs) <= healthThresholdMs;
        const healthDot = healthy ? '🟢' : '🔴';
        const name = acc.account_name || acc.account_id;
        option.textContent = `${healthDot} ${name} (${acc.account_id})`;
        selector.appendChild(option);
    });

    selector.value = selected;
}

async function fetchAnalytics(accountId) {
    const scope = accountId || 'all';
    const params = new URLSearchParams({
        accountId: scope,
        days: '365',
        monthShift: String(state.monthShift),
        yearShift: String(state.yearShift),
        recentTradesLimit: String(state.tradesLimit),
    });
    if (state.activeTradeFilter) {
        params.set('tradeFromMs', String(state.activeTradeFilter.fromMs));
        params.set('tradeToMs', String(state.activeTradeFilter.toMs));
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

function updateKpis(summary, periods, tradeMetrics, filteredSummary) {
    const equityEl = document.getElementById('equity');
    const floatingEl = document.getElementById('floatingPnl');
    const equityMetaEl = document.getElementById('equityMeta');
    const floatingMetaEl = document.getElementById('floatingPnlMeta');

    const balanceBase = Math.max(Math.abs(toNum(summary.balance, 0)), 1);
    const floatingPct = (toNum(summary.floating_pnl, 0) / balanceBase) * 100;

    const rangePnl = state.activeTradeFilter
        ? toNum(filteredSummary?.pnl, 0)
        : toNum(periods?.all_time?.pnl, 0);
    const equityBase = Math.max(Math.abs(toNum(summary.balance, 0) - rangePnl), 1);
    const equityPct = (rangePnl / equityBase) * 100;

    equityEl.textContent = formatMoney(summary.equity);
    floatingEl.textContent = formatMoney(summary.floating_pnl);

    if (floatingMetaEl) {
        floatingMetaEl.textContent = formatDeltaPct(floatingPct);
        floatingMetaEl.className = `label metric-card__meta ${pnlClass(summary.floating_pnl)}`;
    }

    if (equityMetaEl) {
        equityMetaEl.textContent = state.activeTradeFilter
            ? `${formatDeltaPct(equityPct)} selected range`
            : `${formatDeltaPct(equityPct)} all history`;
        equityMetaEl.className = `label metric-card__meta ${pnlClass(rangePnl)}`;
    }

    applyPnlClass(floatingEl, summary.floating_pnl);
    applyPnlClass(equityEl, rangePnl);
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
        ['Profit Factor', Number(toNum(metrics.profit_factor)).toFixed(2), 0],
        ['Expectancy', formatMoney(metrics.expectancy), toNum(metrics.expectancy)],
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
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No trades</td></tr>';
        return;
    }

    tbody.innerHTML = trades.map((trade) => {
        const openTime = formatDateTimeMs(trade.entry_time_ms);
        const closeTime = formatDateTimeMs(trade.exit_time_ms);
        const accountLabel = trade.account_id ? String(trade.account_id) : '-';
        return `
        <tr>
            <td><span class="account-tag">${accountLabel}</span></td>
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
        if (state.exposureSort.key === 'symbol') {
            const cmp = String(a.symbol || '').localeCompare(String(b.symbol || ''));
            return state.exposureSort.direction === 'asc' ? cmp : -cmp;
        }
        const diff = toNum(a.size) - toNum(b.size);
        return state.exposureSort.direction === 'asc' ? diff : -diff;
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

    filterLabel.textContent = state.activeTradeFilter ? `Filter: ${state.activeTradeFilter.label}` : 'Filter: None';
    countInfo.textContent = `Showing ${toNum(data.trades_returned)} of ${toNum(data.trades_total_matching)} trades`;
    resetBtn.disabled = !state.activeTradeFilter;
    loadMoreBtn.disabled = toNum(data.trades_returned) >= toNum(data.trades_total_matching);
}

function setDayFilter(year, month, day) {
    const from = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const to = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    state.activeTradeFilter = {
        fromMs: from,
        toMs: to,
        label: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
    state.tradesLimit = 10;
    loadDashboard();
}

function setMonthFilter(year, month) {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
    const to = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    state.activeTradeFilter = {
        fromMs: from,
        toMs: to,
        label: `${year}-${String(month).padStart(2, '0')}`,
    };
    state.tradesLimit = 10;
    loadDashboard();
}

function getChartColorVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function hasUsableSeries(rows, valueKey) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return false;
    }
    return rows.some((row) => toNum(row?.[valueKey], 0) !== 0);
}

function buildBarDataset(label, values, positive, negative, neutral) {
    return {
        label,
        data: values,
        backgroundColor: values.map((v) => (v > 0 ? positive : v < 0 ? negative : neutral)),
        borderRadius: 8,
        borderSkipped: false,
        categoryPercentage: 0.72,
        barPercentage: 0.9,
        maxBarThickness: 22,
    };
}

function buildBarChartOptions(text) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: text } },
        },
        scales: {
            x: {
                ticks: {
                    color: text,
                    autoSkip: true,
                    maxTicksLimit: 10,
                    maxRotation: 0,
                    minRotation: 0,
                },
                grid: {
                    display: false,
                },
            },
            y: {
                ticks: {
                    color: text,
                    maxTicksLimit: 6,
                },
                grid: {
                    color: 'rgba(125, 138, 159, 0.2)',
                    drawBorder: false,
                },
            },
        },
    };
}

function updateDistributionProgress(wins, losses, neutralCount) {
    const winsSegment = document.getElementById('distWinsSegment');
    const lossesSegment = document.getElementById('distLossesSegment');
    const neutralSegment = document.getElementById('distNeutralSegment');
    const winsText = document.getElementById('distWinsText');
    const lossesText = document.getElementById('distLossesText');
    const neutralText = document.getElementById('distNeutralText');

    if (!winsSegment || !lossesSegment || !neutralSegment || !winsText || !lossesText || !neutralText) {
        return;
    }

    const total = Math.max(0, wins + losses + neutralCount);
    const winsPct = total > 0 ? (wins / total) * 100 : 0;
    const lossesPct = total > 0 ? (losses / total) * 100 : 0;
    const neutralPct = total > 0 ? (neutralCount / total) * 100 : 100;

    winsSegment.style.width = `${winsPct}%`;
    lossesSegment.style.width = `${lossesPct}%`;
    neutralSegment.style.width = `${neutralPct}%`;

    winsText.textContent = `Wins: ${wins} (${winsPct.toFixed(1)}%)`;
    lossesText.textContent = `Losses: ${losses} (${lossesPct.toFixed(1)}%)`;
    neutralText.textContent = `Neutral: ${neutralCount} (${neutralPct.toFixed(1)}%)`;
}

function updateCharts(data) {
    const positive = getChartColorVar('--pnl-positive');
    const negative = getChartColorVar('--pnl-negative');
    const neutral = getChartColorVar('--pnl-neutral');
    const text = getChartColorVar('--text');
    const accent = getChartColorVar('--accent');
    const floatingPointColor = '#ff8a00';

    const tradePnlCurveRows = Array.isArray(data.trade_pnl_curve) ? data.trade_pnl_curve : [];
    const floatingPnl = toNum(data.summary?.floating_pnl);
    const fallbackCurve = Array.from({ length: 30 }, (_, idx) => {
        const ts = new Date(Date.now() - ((29 - idx) * 24 * 60 * 60 * 1000)).setHours(0, 0, 0, 0);
        return { ts, cumulative_pnl: 0 };
    });

    const baseCurveRows = tradePnlCurveRows.length > 0 ? tradePnlCurveRows : fallbackCurve;
    const mainCurveRows = baseCurveRows.slice();
    const lastBaseValue = mainCurveRows.length > 0 ? toNum(mainCurveRows[mainCurveRows.length - 1].cumulative_pnl) : 0;
    mainCurveRows.push({
        ts: Date.now(),
        cumulative_pnl: lastBaseValue + floatingPnl,
    });

    const mainCurveValues = mainCurveRows.map((d) => toNum(d.cumulative_pnl));
    const mainCurveLabel = 'PnL Curve';
    const mainCurveType = 'line';
    const mainCurveLabels = mainCurveRows.map((d) => formatDateShortMs(d.ts));
    const mainCurvePointRadius = tradePnlCurveRows.length > 0 ? 2.5 : 1.5;
    const mainCurveFill = false;
    const mainCurvePointBackgroundColor = mainCurveRows.map((_, idx) =>
        idx === mainCurveRows.length - 1 ? floatingPointColor : accent
    );
    const mainCurvePointBorderColor = mainCurvePointBackgroundColor;
    const mainCurvePointRadiusByIndex = mainCurveRows.map((_, idx) =>
        idx === mainCurveRows.length - 1 ? 5 : mainCurvePointRadius
    );

    const pnlCurveTitle = document.getElementById('pnlCurveTitle');
    if (pnlCurveTitle) {
        pnlCurveTitle.textContent = 'PnL Curve (Last Point Includes Floating PnL)';
    }

    if (!charts.pnlCurve) {
        charts.pnlCurve = new Chart(document.getElementById('pnlCurveChart'), {
            type: mainCurveType,
            data: {
                labels: mainCurveLabels,
                datasets: [{
                    label: mainCurveLabel,
                    data: mainCurveValues,
                    borderColor: accent,
                    backgroundColor: 'rgba(31, 111, 235, 0.12)',
                    tension: 0.25,
                    pointRadius: mainCurvePointRadiusByIndex,
                    pointHoverRadius: mainCurvePointRadiusByIndex.map((r) => r + 1),
                    pointBackgroundColor: mainCurvePointBackgroundColor,
                    pointBorderColor: mainCurvePointBorderColor,
                    fill: mainCurveFill,
                    showLine: mainCurveType !== 'scatter',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: text } },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                if (!items.length) {
                                    return '';
                                }
                                const idx = items[0].dataIndex;
                                return formatDateTimeMs(mainCurveRows[idx]?.ts);
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 8,
                            maxRotation: 0,
                            minRotation: 0,
                            color: text,
                        },
                        grid: { display: false },
                    },
                    y: {
                        ticks: { color: text },
                    },
                },
            },
        });
    } else {
        charts.pnlCurve.config.type = mainCurveType;
        charts.pnlCurve.data.labels = mainCurveLabels;
        charts.pnlCurve.data.datasets[0].label = mainCurveLabel;
        charts.pnlCurve.data.datasets[0].data = mainCurveValues;
        charts.pnlCurve.data.datasets[0].borderColor = accent;
        charts.pnlCurve.data.datasets[0].pointRadius = mainCurvePointRadiusByIndex;
        charts.pnlCurve.data.datasets[0].pointHoverRadius = mainCurvePointRadiusByIndex.map((r) => r + 1);
        charts.pnlCurve.data.datasets[0].pointBackgroundColor = mainCurvePointBackgroundColor;
        charts.pnlCurve.data.datasets[0].pointBorderColor = mainCurvePointBorderColor;
        charts.pnlCurve.data.datasets[0].fill = mainCurveFill;
        charts.pnlCurve.data.datasets[0].showLine = mainCurveType !== 'scatter';
        charts.pnlCurve.options.plugins.legend.labels.color = text;
        charts.pnlCurve.options.scales.x.ticks.color = text;
        charts.pnlCurve.options.scales.y.ticks.color = text;
        charts.pnlCurve.update();
    }

    const wins = toNum(data.filtered_distribution?.wins);
    const losses = toNum(data.filtered_distribution?.losses);
    const neutralCount = toNum(data.filtered_distribution?.neutral);
    updateDistributionProgress(wins, losses, neutralCount);

    // Show all-time daily PnL by default; use filtered range when a trade filter is active
    const dailyRows = state.activeTradeFilter
        ? (Array.isArray(data.filtered_daily_pnl) ? data.filtered_daily_pnl : [])
        : ((Array.isArray(data.alltime_daily_pnl) && data.alltime_daily_pnl.length > 0)
            ? data.alltime_daily_pnl
            : (Array.isArray(data.filtered_daily_pnl) ? data.filtered_daily_pnl : []));
    const dailyLabels = dailyRows.map((r) => r.date || '');
    const dailyValues = dailyRows.map((r) => toNum(r.pnl));

    const dailyTitle = document.getElementById('dailyPnlChartTitle');
    if (dailyTitle) {
        dailyTitle.textContent = state.activeTradeFilter
            ? `Daily PnL (${state.activeTradeFilter.label})`
            : 'Daily PnL (All Time)';
    }

    if (!charts.dailyPnl) {
        charts.dailyPnl = new Chart(document.getElementById('dailyPnlChart'), {
            type: 'bar',
            data: {
                labels: dailyLabels,
                datasets: [buildBarDataset('Daily PnL', dailyValues, positive, negative, neutral)],
            },
            options: buildBarChartOptions(text),
        });
    } else {
        charts.dailyPnl.data.labels = dailyLabels;
        charts.dailyPnl.data.datasets[0].data = dailyValues;
        charts.dailyPnl.data.datasets[0].backgroundColor = dailyValues.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.dailyPnl.options.plugins.legend.labels.color = text;
        charts.dailyPnl.options.scales.x.ticks.color = text;
        charts.dailyPnl.options.scales.y.ticks.color = text;
        charts.dailyPnl.update();
    }

    // PnL by Day of Week
    const dayOfWeekRows = Array.isArray(data.pnl_by_day_of_week) ? data.pnl_by_day_of_week : [];
    const dayOfWeekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeekPnL = Array(7).fill(0);
    dayOfWeekRows.forEach((row) => {
        if (row.day_of_week >= 0 && row.day_of_week <= 6) dayOfWeekPnL[row.day_of_week] = toNum(row.pnl);
    });
    if (!charts.pnlByDayOfWeek) {
        charts.pnlByDayOfWeek = new Chart(document.getElementById('pnlByDayOfWeekChart'), {
            type: 'bar',
            data: {
                labels: dayOfWeekLabels,
                datasets: [buildBarDataset('PnL', dayOfWeekPnL, positive, negative, neutral)],
            },
            options: buildBarChartOptions(text),
        });
    } else {
        charts.pnlByDayOfWeek.data.datasets[0].data = dayOfWeekPnL;
        charts.pnlByDayOfWeek.data.datasets[0].backgroundColor = dayOfWeekPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.pnlByDayOfWeek.options.plugins.legend.labels.color = text;
        charts.pnlByDayOfWeek.options.scales.x.ticks.color = text;
        charts.pnlByDayOfWeek.options.scales.y.ticks.color = text;
        charts.pnlByDayOfWeek.update();
    }

    // PnL by Hour of Day
    const hourOfDayRows = Array.isArray(data.pnl_by_hour_of_day) ? data.pnl_by_hour_of_day : [];
    const hourOfDayLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const hourOfDayPnL = Array(24).fill(0);
    hourOfDayRows.forEach((row) => {
        if (row.hour_of_day >= 0 && row.hour_of_day <= 23) hourOfDayPnL[row.hour_of_day] = toNum(row.pnl);
    });
    if (!charts.pnlByHourOfDay) {
        charts.pnlByHourOfDay = new Chart(document.getElementById('pnlByHourOfDayChart'), {
            type: 'bar',
            data: {
                labels: hourOfDayLabels,
                datasets: [buildBarDataset('PnL', hourOfDayPnL, positive, negative, neutral)],
            },
            options: buildBarChartOptions(text),
        });
    } else {
        charts.pnlByHourOfDay.data.datasets[0].data = hourOfDayPnL;
        charts.pnlByHourOfDay.data.datasets[0].backgroundColor = hourOfDayPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.pnlByHourOfDay.options.plugins.legend.labels.color = text;
        charts.pnlByHourOfDay.options.scales.x.ticks.color = text;
        charts.pnlByHourOfDay.options.scales.y.ticks.color = text;
        charts.pnlByHourOfDay.update();
    }
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
            <div class="calendar-cell ${canFilter ? 'filterable' : ''}" ${canFilter ? `data-day="${d.day}" data-month="${monthly.month}" data-year="${monthly.year}"` : ''}>
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
        <div class="year-card ${toNum(m.trades) > 0 ? 'filterable' : ''}" ${toNum(m.trades) > 0 ? `data-month="${m.month}" data-year="${yearly.year}"` : ''}>
            <div class="month">${monthNames[m.month - 1]}</div>
            <div class="${pnlClass(m.pnl)}">${formatMoney(m.pnl)}</div>
            <div>${m.trades} trades</div>
        </div>
    `).join('');
}

function setLoadState(loading, errorMessage = '') {
    const systemStatus = document.getElementById('systemStatus');
    const systemStatusDot = document.getElementById('systemStatusDot');
    const systemStatusText = document.getElementById('systemStatusText');
    if (!systemStatus || !systemStatusDot || !systemStatusText) {
        return;
    }

    systemStatus.classList.remove('status-error');
    systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--error');

    if (errorMessage) {
        systemStatus.classList.add('status-error');
        systemStatusDot.classList.add('status-dot--error');
        systemStatusText.textContent = `Error: ${errorMessage}`;
        return;
    }

    if (loading) {
        systemStatusDot.classList.add('status-dot--loading');
        systemStatusText.textContent = 'Syncing...';
        return;
    }

    systemStatusDot.classList.add('status-dot--ok');
    systemStatusText.textContent = 'Healthy';
}

function renderDashboard(data) {
    updateStatusStrip(data.summary);
    updateKpis(data.summary, data.periods, data.trade_metrics, data.filtered_summary);
    renderPeriodStats(data.periods);
    renderTradeMetrics(data.trade_metrics);
    updatePositionsTable(data.positions);
    updateExposureTable(data.symbol_exposure);
    updateTradesTable(data.recent_trades);
    updateTradeControls(data);
    updateCharts(data);
    renderMonthlyCalendar(data.calendars.monthly);
    renderYearlyCalendar(data.calendars.yearly);
}

async function loadDashboard() {
    if (state.inflight) {
        state.pendingRefresh = true;
        return;
    }

    state.inflight = true;
    setLoadState(true);

    try {
        await loadAccountsIfNeeded(false);

        const selectedAccount = document.getElementById('accountSelector').value || localStorage.getItem('selectedAccount') || '';
        const data = await fetchAnalytics(selectedAccount);
        state.lastData = data;
        renderDashboard(data);
        setLoadState(false);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        setLoadState(false, error?.message || 'Failed to load dashboard data');
    } finally {
        state.inflight = false;
        if (state.pendingRefresh) {
            state.pendingRefresh = false;
            loadDashboard();
        }
    }
}

function startAutoRefresh(interval) {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
    }
    state.autoRefreshInterval = setInterval(loadDashboard, interval);
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
    setupEventListeners();
    loadAccountsIfNeeded(true).catch((error) => {
        console.error('Error loading accounts:', error);
    });
    loadDashboard();
    startAutoRefresh(DASHBOARD_REFRESH_MS);
});


