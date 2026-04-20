const API_URL = '/api';
const THEME_KEY = 'themePreference';
const ACCENT_KEY = 'accentPreference';
const BACKGROUND_KEY = 'backgroundPreference';
const FONT_KEY = 'fontPreference';
const FONT_SIZE_KEY = 'fontSizePreference';
const QUICK_CONTROLS_COLLAPSED_KEY = 'quickControlsCollapsed';
const LAYOUT_KEY = 'layoutPreference';
const COMBINE_TRADES_KEY = 'combineTradesPreference';
const COMBINE_POSITIONS_KEY = 'combineOpenPositionsPreference';
const COMBINE_EXPOSURE_KEY = 'combineExposurePreference';
const UI_VERSION = 'v1.6';
const DASHBOARD_REFRESH_MS = 30000;
const ACCOUNTS_REFRESH_MS = 60000;
const LIVE_STREAM_MIN_EMIT_MS = 333;
const LIVE_STREAM_BUFFER_MS = 1000;
const LAYOUT_MODES = ['default', 'live', 'historic'];
const MAX_PNL_CURVE_POINTS = 180;
const LAYOUT_BUTTON_LABELS = {
    default: 'D',
    live: 'L',
    historic: 'H',
};
const LAYOUT_NAME_LABELS = {
    default: 'Default',
    live: 'Live',
    historic: 'Historic',
};

const ACCENT_PRESETS = [
    {
        key: 'emerald',
        light: { accent: '#2f8f62', accentStrong: '#25754f', pnlPositive: '#2f8f62', accentRgb: '47, 143, 98' },
        dark: { accent: '#59bd87', accentStrong: '#86d5a9', pnlPositive: '#59bd87', accentRgb: '89, 189, 135' },
    },
    {
        key: 'blue',
        light: { accent: '#2f72d6', accentStrong: '#2358a7', pnlPositive: '#2f72d6', accentRgb: '47, 114, 214' },
        dark: { accent: '#6ea9ff', accentStrong: '#9bc3ff', pnlPositive: '#6ea9ff', accentRgb: '110, 169, 255' },
    },
    {
        key: 'teal',
        light: { accent: '#2b8f8e', accentStrong: '#1f6f6e', pnlPositive: '#2b8f8e', accentRgb: '43, 143, 142' },
        dark: { accent: '#58c8c7', accentStrong: '#7fdddc', pnlPositive: '#58c8c7', accentRgb: '88, 200, 199' },
    },
    {
        key: 'orange',
        light: { accent: '#a56f1f', accentStrong: '#835715', pnlPositive: '#a56f1f', accentRgb: '165, 111, 31' },
        dark: { accent: '#e0ad5c', accentStrong: '#efc984', pnlPositive: '#e0ad5c', accentRgb: '224, 173, 92' },
    },
    {
        key: 'indigo',
        light: { accent: '#5b63d6', accentStrong: '#454caa', pnlPositive: '#5b63d6', accentRgb: '91, 99, 214' },
        dark: { accent: '#8f95ff', accentStrong: '#b1b5ff', pnlPositive: '#8f95ff', accentRgb: '143, 149, 255' },
    },
    {
        key: 'mint',
        light: { accent: '#2ea680', accentStrong: '#1f8162', pnlPositive: '#2ea680', accentRgb: '46, 166, 128' },
        dark: { accent: '#66d9b3', accentStrong: '#8be8c8', pnlPositive: '#66d9b3', accentRgb: '102, 217, 179' },
    },
    {
        key: 'gold',
        light: { accent: '#b0882a', accentStrong: '#8f6d1f', pnlPositive: '#b0882a', accentRgb: '176, 136, 42' },
        dark: { accent: '#e5bd5d', accentStrong: '#f0d08a', pnlPositive: '#e5bd5d', accentRgb: '229, 189, 93' },
    },
];

const FONT_PRESETS = [
    { key: 'manrope',     label: 'M', fontFamily: "'Manrope', 'Inter', Arial, sans-serif" },
    { key: 'sora',        label: 'R', fontFamily: "'Sora', 'Inter', Arial, sans-serif" },
    { key: 'inter',       label: 'I', fontFamily: "'Inter', Arial, sans-serif" },
    { key: 'dm-sans',     label: 'D', fontFamily: "'DM Sans', 'Inter', Arial, sans-serif" },
    { key: 'jetbrains',   label: 'J', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
    { key: 'fira-code',   label: 'F', fontFamily: "'Fira Code', 'JetBrains Mono', monospace" },
    { key: 'bahnschrift', label: 'B', fontFamily: "'Bahnschrift', 'Barlow Condensed', Arial, sans-serif" },
    { key: 'arial',       label: 'A', fontFamily: "Arial, sans-serif" },
    { key: 'verdana',     label: 'V', fontFamily: "Verdana, Arial, sans-serif" },
    { key: 'courier',     label: 'C', fontFamily: "'Courier New', Courier, monospace" },
    { key: 'georgia',     label: 'G', fontFamily: "Georgia, 'Times New Roman', serif" },
    { key: 'times',       label: 'T', fontFamily: "'Times New Roman', Times, serif" },
];

const FONT_SIZE_PRESETS = [
    { key: '1', label: '1', size: '14px' },
    { key: '2', label: '2', size: '15px' },
    { key: '3', label: '3', size: '16px' },
    { key: '4', label: '4', size: '17px' },
    { key: '5', label: '5', size: '18px' },
];

const BACKGROUND_PRESETS = [
    {
        key: 'mint',
        label: '🟩',
        light: { bg: '#f2f9f4', surfaceAlt: '#f4fbf7', tintRgb: '59, 146, 99' },
        dark: { bg: '#0f1714', surfaceAlt: '#13201a', tintRgb: '76, 156, 117' },
    },
    {
        key: 'sky',
        label: '🟦',
        light: { bg: '#f2f7ff', surfaceAlt: '#f5f9ff', tintRgb: '67, 129, 214' },
        dark: { bg: '#101722', surfaceAlt: '#131d2c', tintRgb: '101, 155, 229' },
    },
    {
        key: 'sand',
        label: '🟨',
        light: { bg: '#fbf7ef', surfaceAlt: '#fcf9f2', tintRgb: '184, 138, 57' },
        dark: { bg: '#1c1710', surfaceAlt: '#272015', tintRgb: '198, 156, 84' },
    },
    {
        key: 'rose',
        label: '🟥',
        light: { bg: '#fbf3f6', surfaceAlt: '#fdf5f8', tintRgb: '191, 94, 120' },
        dark: { bg: '#1b1116', surfaceAlt: '#261720', tintRgb: '196, 112, 136' },
    },
    {
        key: 'slate',
        label: '⬜',
        light: { bg: '#f2f5f7', surfaceAlt: '#f5f8fa', tintRgb: '96, 124, 145' },
        dark: { bg: '#101417', surfaceAlt: '#151c21', tintRgb: '113, 140, 159' },
    },
];

const state = {
    autoRefreshInterval: null,
    livePnlSource: null,
    historySource: null,
    sseGeneration: 0,
    liveStreamHealthy: false,
    historyStreamHealthy: false,
    monthShift: 0,
    yearShift: 0,
    tradesLimit: 50,
    activeTradeFilter: null,
    exposureSort: { key: 'size', direction: 'desc' },
    positionsSort: { key: 'symbol', direction: 'asc' },
    tradesSort: { key: 'exit_time_ms', direction: 'desc' },
    combinePositions: true,
    combineOpenPositions: true,
    combineExposure: true,
    expandedPositionGroups: new Set(),
    expandedTradeGroups: new Set(),
    accounts: [],
    accountsFetchedAt: 0,
    inflight: false,
    pendingRefresh: false,
    lastData: null,
    lastDataHash: null,
    statusLoadingSince: 0,
    statusSettleTimer: null,
    activeQuickPicker: null,
    livePnlBuffer: [],
    livePnlPumpTimer: null,
    livePositionValues: new Map(),
    beTolerance: 0,
};

const MIN_SYNC_HEARTBEAT_MS = 700;

const charts = {
    pnlCurve: null,
    dailyPnl: null,
    dailyWr: null,
    pnlByDayOfWeek: null,
    wrByDayOfWeek: null,
    pnlByHourOfDay: null,
    wrByHourOfDay: null,
    durationWinRate: null,
    durationWr: null,
    pnlHistogram: null,
};

const chartSignatures = {};

const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
let deferredInstallPrompt = null;
const numericTweenRaf = new WeakMap();
const numericTweenState = new Map();
let adaptiveLayoutRaf = 0;
const NON_LIVE_ANIM_MS = 1000;
// Live tween duration must be shorter than LIVE_STREAM_MIN_EMIT_MS so each
// tween finishes before the next pump fires, preventing cascading restarts.
const LIVE_ANIM_MS = Math.max(100, LIVE_STREAM_MIN_EMIT_MS - 60); // ~273ms

/* ── Scroll-into-view deferred animation ── */
const deferredAnimations = new Map();
const visibleElements = new WeakSet();
const scrollAnimObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            visibleElements.add(entry.target);
            scrollAnimObserver.unobserve(entry.target);
            const pending = deferredAnimations.get(entry.target);
            if (pending) {
                deferredAnimations.delete(entry.target);
                pending();
            }
        }
    }
}, { rootMargin: '0px', threshold: 0.05 });

function isElementVisible(el) {
    if (visibleElements.has(el)) return true;
    const rect = el.getBoundingClientRect();
    // Element not yet laid out (freshly inserted) – treat as visible
    if (rect.width === 0 && rect.height === 0) return true;
    return rect.bottom > 0 && rect.top < window.innerHeight;
}


function formatMoney(value) {
    return `$ ${Number(value || 0).toFixed(2)}`;
}

function formatPrice(value, decimals = 5) {
    return Number(value || 0).toFixed(decimals);
}

function formatSize(value) {
    return Number(value || 0).toFixed(2);
}

function decimalPlaces(value) {
    const str = String(value ?? '');
    if (!str.includes('.')) {
        return 0;
    }
    return str.split('.')[1].length;
}

function inferPriceDecimals(rows, key, fallback = 5) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return fallback;
    }
    const maxDec = rows.reduce((maxVal, row) => {
        const val = row?.[key];
        if (val === null || val === undefined) {
            return maxVal;
        }
        return Math.max(maxVal, decimalPlaces(val));
    }, 0);
    return Math.min(Math.max(maxDec, 2), 6);
}

function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateNumericText(el, nextValue, formatter, durationMs = NON_LIVE_ANIM_MS) {
    if (!el) {
        return;
    }

    const toValue = toNum(nextValue, 0);
    const fromValue = toNum(el.dataset.animValue, 0);
    const diff = toValue - fromValue;

    const prevRaf = numericTweenRaf.get(el);
    if (prevRaf) {
        cancelAnimationFrame(prevRaf);
    }

    if (Math.abs(diff) < 0.0000001) {
        el.textContent = formatter(toValue);
        el.dataset.animValue = String(toValue);
        return;
    }

    const startedAt = performance.now();
    const tick = (now) => {
        const elapsed = now - startedAt;
        const t = Math.max(0, Math.min(1, elapsed / durationMs));
        const eased = easeOutCubic(t);
        const currentValue = fromValue + (diff * eased);
        el.textContent = formatter(currentValue);

        if (t < 1) {
            const raf = requestAnimationFrame(tick);
            numericTweenRaf.set(el, raf);
            return;
        }

        el.textContent = formatter(toValue);
        el.dataset.animValue = String(toValue);
        numericTweenRaf.delete(el);
    };

    const raf = requestAnimationFrame(tick);
    numericTweenRaf.set(el, raf);
}

function animateNumericByKey(el, key, nextValue, formatter, durationMs = NON_LIVE_ANIM_MS) {
    if (!el || !key) {
        return;
    }
    const numericValue = toNum(nextValue, 0);

    /* If the element is off-screen, set its text to the "from" value
       immediately and defer the tween until it scrolls into view. */
    if (!isElementVisible(el)) {
        const fromValue = numericTweenState.has(key)
            ? toNum(numericTweenState.get(key), numericValue)
            : 0;
        el.textContent = formatter(fromValue);
        el.dataset.animValue = String(fromValue);
        numericTweenState.set(key, numericValue);
        deferredAnimations.set(el, () => {
            el.dataset.animValue = String(fromValue);
            animateNumericText(el, numericValue, formatter, durationMs);
        });
        scrollAnimObserver.observe(el);
        return;
    }

    const fromValue = numericTweenState.has(key)
        ? toNum(numericTweenState.get(key), numericValue)
        : toNum(el.dataset.animValue, 0);
    el.dataset.animValue = String(fromValue);
    animateNumericText(el, numericValue, formatter, durationMs);
    numericTweenState.set(key, numericValue);
}

function animateDeclaredNumericFields(root, durationMs = NON_LIVE_ANIM_MS) {
    if (!root) {
        return;
    }
    root.querySelectorAll('[data-anim-key][data-anim-target]').forEach((el) => {
        const key = el.getAttribute('data-anim-key') || '';
        const format = el.getAttribute('data-anim-format') || 'money';
        const raw = toNum(el.getAttribute('data-anim-target'), 0);
        let formatter = formatMoney;
        if (format === 'pct') {
            formatter = formatPct;
        } else if (format === 'fixed2') {
            formatter = (value) => Number(value || 0).toFixed(2);
        } else if (format === 'int') {
            formatter = (value) => String(Math.round(Number(value || 0)));
        }
        animateNumericByKey(el, key, raw, formatter, durationMs);
    });
}

/**
 * Diff-patch a <tbody>: reuse existing rows by key, animate numeric cells,
 * add enter animations for new rows, exit animations for removed rows.
 *
 * @param {HTMLTableSectionElement} tbody
 * @param {Array<{key: string, html: string, animCells?: Array<{col: number, key: string, value: number, format: string, className?: string}>}>} nextRows
 * @param {number} [durationMs]
 */
function diffTableRows(tbody, nextRows, durationMs = NON_LIVE_ANIM_MS) {
    // Remove any non-keyed rows (e.g. "No data" placeholders)
    for (const tr of [...tbody.querySelectorAll('tr:not([data-row-key])')]) {
        tr.remove();
    }

    const oldByKey = new Map();
    for (const tr of [...tbody.querySelectorAll('tr[data-row-key]')]) {
        const k = tr.getAttribute('data-row-key');
        if (k) oldByKey.set(k, tr);
    }

    const nextKeys = new Set(nextRows.map(r => r.key));
    const fmtInt = v => String(Math.round(Number(v || 0)));
    const fmtFixed2 = v => Number(v || 0).toFixed(2);
    const chooseFormatter = (cell) => {
        if (cell._fmt) return cell._fmt;
        const fmt = cell.format;
        if (fmt === 'money') return formatMoney;
        if (fmt === 'pct') return formatPct;
        if (fmt === 'int') return fmtInt;
        if (fmt === 'fixed2') return fmtFixed2;
        if (fmt === 'size') return formatSize;
        if (fmt === 'price') return v => formatPrice(v, 5);
        return formatMoney;
    };

    // Remove rows no longer present (with exit animation)
    for (const [key, tr] of oldByKey) {
        if (!nextKeys.has(key)) {
            tr.classList.add('row-exit');
            tr.addEventListener('animationend', () => tr.remove(), { once: true });
            // Fallback removal if animation doesn't fire
            setTimeout(() => { if (tr.parentNode) tr.remove(); }, 400);
        }
    }

    // Build or update rows in order
    let insertRef = tbody.querySelector('tr.row-exit') || null;
    // We'll insert in order, tracking previous sibling
    let prevTr = null;
    for (const rowData of nextRows) {
        const existing = oldByKey.get(rowData.key);
        if (existing) {
            // Update: animate numeric cells in place
            if (rowData.animCells) {
                for (const cell of rowData.animCells) {
                    const td = existing.children[cell.col];
                    if (!td) continue;
                    if (cell.className !== undefined) td.className = cell.className;
                    animateNumericByKey(td, cell.key, cell.value, chooseFormatter(cell), durationMs);
                }
            }
            // Update non-animated cells (className changes, static content)
            if (rowData.updateCells) {
                for (const upd of rowData.updateCells) {
                    const td = existing.children[upd.col];
                    if (!td) continue;
                    if (upd.className !== undefined) td.className = upd.className;
                    if (upd.html !== undefined) td.innerHTML = upd.html;
                }
            }
            existing.classList.remove('row-exit');
            // Move to correct position
            if (prevTr) {
                if (existing.previousElementSibling !== prevTr) {
                    prevTr.after(existing);
                }
            } else {
                if (existing !== tbody.firstElementChild) {
                    tbody.prepend(existing);
                }
            }
            prevTr = existing;
        } else {
            // New row: parse HTML, insert with enter animation
            const temp = document.createElement('template');
            temp.innerHTML = rowData.html.trim();
            const tr = temp.content.firstElementChild;
            if (tr) {
                tr.setAttribute('data-row-key', rowData.key);
                tr.classList.add('row-enter');
                tr.addEventListener('animationend', () => tr.classList.remove('row-enter'), { once: true });
                if (prevTr) {
                    prevTr.after(tr);
                } else {
                    tbody.prepend(tr);
                }
                // Animate numeric cells from 0 on new rows
                if (rowData.animCells) {
                    for (const cell of rowData.animCells) {
                        const td = tr.children[cell.col];
                        if (td) {
                            if (cell.className !== undefined) td.className = cell.className;
                            animateNumericByKey(td, cell.key, cell.value, chooseFormatter(cell), durationMs);
                        }
                    }
                }
                prevTr = tr;
            }
        }
    }
}

function estimatePositionTargetPnl(position, targetPrice) {
    if (targetPrice === null || targetPrice === undefined || targetPrice === 0) {
        return null;
    }
    const entryPrice = toNum(position?.entry_price, NaN);
    const target = toNum(targetPrice, NaN);
    const direction = String(position?.direction || '').toUpperCase() === 'SELL' ? -1 : 1;
    const tickSize = toNum(position?.tick_size, NaN);
    const tickValue = toNum(position?.tick_value, NaN);
    const size = Math.abs(toNum(position?.size, 0));

    if (!Number.isFinite(entryPrice) || !Number.isFinite(target)) {
        return null;
    }

    if (Number.isFinite(tickSize) && tickSize > 0 && Number.isFinite(tickValue) && tickValue > 0 && size > 0) {
        const ticks = ((target - entryPrice) * direction) / tickSize;
        return ticks * tickValue * size;
    }

    // Fallback: infer per-price-unit PnL from current live position state.
    // This keeps SL$/TP$ informative on brokers that don't expose tick specs.
    const currentPrice = toNum(position?.current_price, NaN);
    const currentPnl = toNum(position?.unrealized_pnl, NaN);
    const priceDeltaNow = (currentPrice - entryPrice) * direction;
    if (Number.isFinite(currentPrice)
        && Number.isFinite(currentPnl)
        && Number.isFinite(priceDeltaNow)
        && Math.abs(priceDeltaNow) > 1e-9) {
        const pnlPerPriceUnit = currentPnl / priceDeltaNow;
        const targetDelta = (target - entryPrice) * direction;
        return targetDelta * pnlPerPriceUnit;
    }

    // Without symbol specifications (tick_size / tick_value) we cannot
    // reliably estimate the monetary SL/TP value — return null so the
    // UI shows '-' instead of a misleading number.
    return null;
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

function formatIsoDateShort(value) {
    const parts = String(value || '').split('-').map((p) => Number(p));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
        return String(value || '');
    }
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? String(value || '') : d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function maxTicksForCount(count) {
    if (count > 180) {
        return 6;
    }
    if (count > 90) {
        return 8;
    }
    if (count > 45) {
        return 10;
    }
    return 12;
}

function formatPct(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedRounded(value) {
    const n = toNum(value, 0);
    const rounded = Math.round(n);
    return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function formatDeltaPct(value) {
    const numeric = toNum(value, 0);
    const arrow = numeric > 0 ? '↑' : numeric < 0 ? '↓' : '→';
    const sign = numeric > 0 ? '+' : '';
    return `${arrow} ${sign}${numeric.toFixed(1)}%`;
}

function hasInlineOverflow(el) {
    if (!el) {
        return false;
    }
    return (el.scrollWidth - el.clientWidth) > 1;
}

function hasBlockOverflow(el) {
    if (!el) {
        return false;
    }
    return (el.scrollHeight - el.clientHeight) > 1;
}

function cardTextFits(card) {
    if (!card) {
        return true;
    }
    const probes = card.querySelectorAll('.label, .value, .metric-card__meta, .year-card__meta, .month, .calendar-pnl, .calendar-trades');
    for (const probe of probes) {
        if (hasInlineOverflow(probe) || hasBlockOverflow(probe)) {
            return false;
        }
    }
    return !hasInlineOverflow(card);
}

function chooseBestColumnCount(container, cards, colsToTry, applyCols) {
    if (!container || !cards.length) {
        return colsToTry[colsToTry.length - 1];
    }

    let chosen = colsToTry[colsToTry.length - 1];
    for (const cols of colsToTry) {
        applyCols(cols);
        void container.offsetWidth;
        const overflowed = cards.some((card) => !cardTextFits(card));
        if (!overflowed) {
            chosen = cols;
            break;
        }
    }

    applyCols(chosen);
    return chosen;
}

function adaptSummarySpotlightByContent() {
    const container = document.querySelector('.summary-spotlight');
    if (!container) {
        return;
    }

    const cards = Array.from(container.querySelectorAll('.metric-card'));
    if (!cards.length) {
        return;
    }

    const applyCols = (cols) => {
        container.classList.remove('summary-spotlight--fit-1', 'summary-spotlight--fit-2', 'summary-spotlight--fit-3');
        container.classList.add(`summary-spotlight--fit-${cols}`);
    };

    chooseBestColumnCount(container, cards, [3, 2, 1], applyCols);
}

function adaptMetricGridByContent(containerId, colsToTry) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    const cards = Array.from(container.querySelectorAll('.metric-card'));
    if (!cards.length) {
        return;
    }

    const applyCols = (cols) => {
        container.classList.add('metric-grid--adaptive-fit');
        container.style.setProperty('--fit-cols', String(cols));
        if (containerId === 'periodStatsGrid') {
            const useBalancedRows = cols === 3 && cards.length === 5;
            container.classList.toggle('metric-grid--balanced-rows', useBalancedRows);
        }
    };

    chooseBestColumnCount(container, cards, colsToTry, applyCols);
}

function adaptYearGridByContent() {
    const container = document.getElementById('yearCalendar');
    if (!container) {
        return;
    }

    const cards = Array.from(container.querySelectorAll('.year-card'));
    if (!cards.length) {
        return;
    }

    const applyCols = (cols) => {
        container.style.setProperty('--fit-cols-year', String(cols));
    };

    // Keep at least 2 columns even in tight portrait.
    chooseBestColumnCount(container, cards, [3, 2], applyCols);
}

function adaptHeaderByContent() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }

    header.classList.remove('header--compact', 'header--ultra-compact', 'header--allow-wrap');
    if (hasInlineOverflow(header)) {
        header.classList.add('header--compact');
    }
    if (hasInlineOverflow(header)) {
        header.classList.add('header--ultra-compact');
    }
    if (hasInlineOverflow(header)) {
        header.classList.add('header--allow-wrap');
    }
}

function applyContentAdaptiveLayout() {
    adaptHeaderByContent();
    adaptSummarySpotlightByContent();
    adaptMetricGridByContent('periodStatsGrid', [5, 3]);
    adaptMetricGridByContent('tradeMetricsGrid', [2, 1]);
    adaptYearGridByContent();
    syncHeaderHeightVar();
}

function scheduleContentAdaptiveLayout() {
    if (adaptiveLayoutRaf) {
        cancelAnimationFrame(adaptiveLayoutRaf);
    }
    adaptiveLayoutRaf = requestAnimationFrame(() => {
        adaptiveLayoutRaf = 0;
        applyContentAdaptiveLayout();
    });
}

function buildAccountDisplay(accountId, primaryName, secondaryName) {
    const idText = String(accountId || '').trim();
    const first = String(primaryName || '').trim();
    const second = String(secondaryName || '').trim();
    const candidates = [first, second].filter(Boolean);
    const unique = [];
    for (const value of candidates) {
        if (value.toLowerCase() === idText.toLowerCase()) {
            continue;
        }
        if (!unique.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
            unique.push(value);
        }
    }
    return {
        idText: idText || '-',
        labelText: unique[0] || '',
    };
}

function accountNameOnly(accountId, primaryName, secondaryName) {
    const display = buildAccountDisplay(accountId, primaryName, secondaryName);
    return display.labelText || display.idText;
}

function shouldCompactAccountLabels() {
    const header = document.querySelector('.header');
    if (!header) {
        return window.innerWidth <= 920;
    }
    return window.innerWidth <= 920
        || header.classList.contains('header--compact')
        || header.classList.contains('header--ultra-compact');
}

function findAccountById(accountId) {
    const idText = String(accountId || '').trim();
    if (!idText || !Array.isArray(state.accounts)) {
        return null;
    }
    return state.accounts.find((acc) => String(acc?.account_id || '').trim() === idText) || null;
}

function preferredAccountLabel(accountId, accountName) {
    const idText = String(accountId || '').trim();
    const directName = String(accountName || '').trim();
    if (directName) {
        return directName;
    }
    const account = findAccountById(idText);
    const fallbackName = String(account?.nickname || account?.account_name || '').trim();
    return fallbackName || idText || '-';
}

function positionAccountLabel(position) {
    const groupedCount = toNum(position?._accountCount, 0);
    if (groupedCount > 1) {
        return `${groupedCount} accts`;
    }
    return preferredAccountLabel(position?.account_id, position?.account_name || position?.nickname);
}

function tradeAccountLabel(trade) {
    const groupedCount = toNum(trade?._accountCount, 0);
    if (groupedCount > 1) {
        return `${groupedCount} accts`;
    }
    return preferredAccountLabel(trade?.account_id, trade?.account_name || trade?.nickname);
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

function formatTradeResultShort(result) {
    const normalized = String(result || '').toLowerCase();
    if (normalized === 'win') {
        return 'W';
    }
    if (normalized === 'loss') {
        return 'L';
    }
    if (normalized === 'breakeven') {
        return 'BE';
    }
    return '-';
}

function formatDurationTick(seconds) {
    const s = Math.abs(seconds);
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    if (s < 86400) return `${+(s / 3600).toFixed(1)}h`;
    if (s < 604800) return `${+(s / 86400).toFixed(1)}d`;
    if (s < 2592000) return `${+(s / 604800).toFixed(1)}w`;
    return `${+(s / 2592000).toFixed(1)}M`;
}

function formatDurationTooltip(seconds) {
    const s = Math.abs(seconds);
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) { const m = Math.floor(s / 60); const ss = Math.round(s % 60); return ss > 0 ? `${m}m ${ss}s` : `${m}m`; }
    if (s < 86400) { const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; }
    const d = Math.floor(s / 86400); const h = Math.round((s % 86400) / 3600); return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
        return saved;
    }
    return themeMedia.matches ? 'dark' : 'light';
}

function getPreferredAccent() {
    const saved = localStorage.getItem(ACCENT_KEY);
    return ACCENT_PRESETS.some((preset) => preset.key === saved) ? saved : ACCENT_PRESETS[0].key;
}

function getPreferredBackground() {
    const saved = localStorage.getItem(BACKGROUND_KEY);
    return BACKGROUND_PRESETS.some((preset) => preset.key === saved) ? saved : BACKGROUND_PRESETS[0].key;
}

function getPreferredFont() {
    const saved = localStorage.getItem(FONT_KEY);
    return FONT_PRESETS.some((preset) => preset.key === saved) ? saved : FONT_PRESETS[0].key;
}

function getPreferredFontSize() {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return FONT_SIZE_PRESETS.some((preset) => preset.key === saved) ? saved : '3';
}

function getPreferredLayout() {
    const saved = localStorage.getItem(LAYOUT_KEY);
    return LAYOUT_MODES.includes(saved) ? saved : 'default';
}

function getStoredBoolean(key, defaultValue) {
    const saved = localStorage.getItem(key);
    if (saved === '1') {
        return true;
    }
    if (saved === '0') {
        return false;
    }
    return defaultValue;
}

function saveStoredBoolean(key, value) {
    localStorage.setItem(key, value ? '1' : '0');
}

function applyGroupingButtonState() {
    const tradesBtn = document.getElementById('combineTradesBtn');
    if (tradesBtn) {
        tradesBtn.textContent = state.combinePositions ? '❯' : '❮';
        tradesBtn.title = state.combinePositions ? 'Showing combined positions' : 'Showing individual trades';
        tradesBtn.setAttribute('aria-label', tradesBtn.title);
    }

    const positionsBtn = document.getElementById('combinePositionsBtn');
    if (positionsBtn) {
        positionsBtn.textContent = state.combineOpenPositions ? '❯' : '❮';
        positionsBtn.title = state.combineOpenPositions ? 'Showing combined positions' : 'Showing individual positions';
        positionsBtn.setAttribute('aria-label', positionsBtn.title);
    }

    const exposureBtn = document.getElementById('combineExposureBtn');
    if (exposureBtn) {
        exposureBtn.textContent = state.combineExposure ? '❯' : '❮';
        exposureBtn.title = state.combineExposure ? 'Showing grouped by account exposure' : 'Showing account + symbol exposure';
        exposureBtn.setAttribute('aria-label', exposureBtn.title);
    }
}

function loadGroupingPreferences() {
    state.combinePositions = getStoredBoolean(COMBINE_TRADES_KEY, true);
    state.combineOpenPositions = getStoredBoolean(COMBINE_POSITIONS_KEY, true);
    state.combineExposure = getStoredBoolean(COMBINE_EXPOSURE_KEY, true);
}

function getAccentPreset(key) {
    return ACCENT_PRESETS.find((preset) => preset.key === key) || ACCENT_PRESETS[0];
}

function getFontPreset(key) {
    return FONT_PRESETS.find((preset) => preset.key === key) || FONT_PRESETS[0];
}

function getFontSizePreset(key) {
    return FONT_SIZE_PRESETS.find((preset) => preset.key === key) || FONT_SIZE_PRESETS[2];
}

function getBackgroundPreset(key) {
    return BACKGROUND_PRESETS.find((preset) => preset.key === key) || BACKGROUND_PRESETS[0];
}

function getThemeMode() {
    return document.body.getAttribute('data-theme') || 'light';
}

function applyAccentTheme(accentKey) {
    const preset = getAccentPreset(accentKey);
    const modePalette = getThemeMode() === 'dark' ? preset.dark : preset.light;
    document.body.style.setProperty('--accent', modePalette.accent);
    document.body.style.setProperty('--accent-strong', modePalette.accentStrong);
    document.body.style.setProperty('--pnl-positive', modePalette.pnlPositive);
    document.body.style.setProperty('--accent-rgb', modePalette.accentRgb);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', modePalette.accent);
    }

    const accentBtn = document.getElementById('accentCycleBtn');
    if (accentBtn) {
        accentBtn.style.setProperty('--dot-color', modePalette.accent);
        accentBtn.title = `Accent: ${preset.key}`;
    }
}

function applyBackgroundTheme(backgroundKey) {
    const preset = getBackgroundPreset(backgroundKey);
    const modePalette = getThemeMode() === 'dark' ? preset.dark : preset.light;
    document.body.style.setProperty('--bg', modePalette.bg);
    document.body.style.setProperty('--surface-alt', modePalette.surfaceAlt);
    document.body.style.setProperty('--bg-tint-rgb', modePalette.tintRgb);

    const backgroundBtn = document.getElementById('backgroundCycleBtn');
    if (backgroundBtn) {
        backgroundBtn.textContent = preset.label;
        backgroundBtn.title = `Background: ${preset.key}`;
        backgroundBtn.style.background = `radial-gradient(circle at 50% 50%, rgba(${modePalette.tintRgb}, 0.34), rgba(${modePalette.tintRgb}, 0.18))`;
        backgroundBtn.style.borderColor = `rgba(${modePalette.tintRgb}, 0.52)`;
    }
}

function applyFont(fontKey) {
    const preset = getFontPreset(fontKey);
    document.documentElement.style.setProperty('--app-font', preset.fontFamily);
    const fontBtn = document.getElementById('fontCycleBtn');
    if (fontBtn) {
        fontBtn.textContent = preset.label;
        fontBtn.title = `Font: ${preset.key}`;
    }
}

function applyFontSize(fontSizeKey) {
    const preset = getFontSizePreset(fontSizeKey);
    document.documentElement.style.setProperty('--app-font-size', preset.size);
    const sizeBtn = document.getElementById('fontSizeCycleBtn');
    if (sizeBtn) {
        sizeBtn.textContent = preset.label;
        sizeBtn.title = `Font size level: ${preset.label} (${preset.size})`;
    }
}

function setQuickControlsCollapsed(collapsed) {
    const controls = document.getElementById('uiQuickControls');
    const toggleBtn = document.getElementById('uiControlsToggleBtn');
    if (controls) {
        controls.classList.toggle('is-collapsed', collapsed);
    }
    if (toggleBtn) {
        toggleBtn.textContent = collapsed ? '⚙' : '✕';
        toggleBtn.title = collapsed ? 'Show style controls' : 'Hide style controls';
        toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    const header = document.querySelector('.header');
    if (header) {
        header.classList.toggle('header--controls-collapsed', collapsed);
    }
    scheduleContentAdaptiveLayout();
}

function cycleAccentTheme() {
    const current = getPreferredAccent();
    const currentIndex = ACCENT_PRESETS.findIndex((preset) => preset.key === current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ACCENT_PRESETS.length : 0;
    const next = ACCENT_PRESETS[nextIndex].key;
    localStorage.setItem(ACCENT_KEY, next);
    applyAccentTheme(next);
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function cycleBackgroundTheme() {
    const current = getPreferredBackground();
    const currentIndex = BACKGROUND_PRESETS.findIndex((preset) => preset.key === current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % BACKGROUND_PRESETS.length : 0;
    const next = BACKGROUND_PRESETS[nextIndex].key;
    localStorage.setItem(BACKGROUND_KEY, next);
    applyBackgroundTheme(next);
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function cycleFontPreset() {
    const current = getPreferredFont();
    const currentIndex = FONT_PRESETS.findIndex((preset) => preset.key === current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % FONT_PRESETS.length : 0;
    const next = FONT_PRESETS[nextIndex].key;
    localStorage.setItem(FONT_KEY, next);
    applyFont(next);
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function cycleFontSizePreset() {
    const current = getPreferredFontSize();
    const currentIndex = FONT_SIZE_PRESETS.findIndex((preset) => preset.key === current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % FONT_SIZE_PRESETS.length : 0;
    const next = FONT_SIZE_PRESETS[nextIndex].key;
    localStorage.setItem(FONT_SIZE_KEY, next);
    applyFontSize(next);
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function toggleQuickControls() {
    const controls = document.getElementById('uiQuickControls');
    if (!controls) {
        return;
    }
    const collapsed = !controls.classList.contains('is-collapsed');
    localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, collapsed ? '1' : '0');
    setQuickControlsCollapsed(collapsed);
}

function hideQuickPicker() {
    const picker = document.getElementById('quickControlPicker');
    if (!picker) {
        return;
    }
    picker.classList.add('is-collapsed');
    picker.innerHTML = '';
    state.activeQuickPicker = null;
}

function setQuickControlsPinned(open) {
    const wrap = document.querySelector('.ui-controls-wrap');
    if (!wrap) {
        return;
    }
    wrap.classList.toggle('is-hovering', open);
}

function closeAccountMenu() {
    const menu = document.getElementById('accountSelectorMenu');
    const btn = document.getElementById('accountSelectorBtn');
    if (!menu || !btn) {
        return;
    }
    menu.classList.add('is-collapsed');
    btn.setAttribute('aria-expanded', 'false');
}

function toggleAccountMenu() {
    const menu = document.getElementById('accountSelectorMenu');
    const btn = document.getElementById('accountSelectorBtn');
    if (!menu || !btn) {
        return;
    }
    const opening = menu.classList.contains('is-collapsed');
    menu.classList.toggle('is-collapsed', !opening);
    btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
}

function applyControlSelection(type, key) {
    if (type === 'accent') {
        localStorage.setItem(ACCENT_KEY, key);
        applyAccentTheme(key);
    }
    if (type === 'background') {
        localStorage.setItem(BACKGROUND_KEY, key);
        applyBackgroundTheme(key);
    }
    if (type === 'theme') {
        localStorage.setItem(THEME_KEY, key);
        applyTheme(key);
    }
    if (type === 'font') {
        localStorage.setItem(FONT_KEY, key);
        applyFont(key);
    }
    if (type === 'fontSize') {
        localStorage.setItem(FONT_SIZE_KEY, key);
        applyFontSize(key);
    }
    if (type === 'layout') {
        setLayout(key);
        return;
    }
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function showQuickPicker(type, triggerEl, action = {}) {
    const picker = document.getElementById('quickControlPicker');
    if (!picker) {
        return;
    }

    const forceRefresh = Boolean(action.forceRefresh);
    const isOpenSamePicker = state.activeQuickPicker === type && !picker.classList.contains('is-collapsed');

    if (isOpenSamePicker && !forceRefresh) {
        hideQuickPicker();
        setQuickControlsPinned(false);
        const controls = document.getElementById('uiQuickControls');
        if (controls && !controls.classList.contains('is-collapsed')) {
            localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, '1');
            setQuickControlsCollapsed(true);
        }
        return;
    }

    let options = [];
    let activeKey = '';

    if (type === 'accent') {
        activeKey = getPreferredAccent();
        options = ACCENT_PRESETS.map((preset) => {
            const color = (getThemeMode() === 'dark' ? preset.dark : preset.light).accent;
            return {
                key: preset.key,
                label: preset.key.charAt(0).toUpperCase() + preset.key.slice(1),
                swatchStyle: `background:${color}; border-radius:50%; border-color:rgba(0,0,0,0.12)`,
                previewText: '',
                labelStyle: `color:${color}; font-weight:600`,
            };
        });
    }
    if (type === 'background') {
        activeKey = getPreferredBackground();
        options = BACKGROUND_PRESETS.map((preset) => {
            const p = getThemeMode() === 'dark' ? preset.dark : preset.light;
            return {
                key: preset.key,
                label: preset.key.charAt(0).toUpperCase() + preset.key.slice(1),
                swatchStyle: `background:radial-gradient(circle at 35% 30%, rgba(${p.tintRgb}, 0.65), ${p.bg}); border-color:rgba(${p.tintRgb}, 0.6); border-radius:6px`,
                previewText: '',
                labelStyle: '',
            };
        });
    }
    if (type === 'theme') {
        activeKey = getThemeMode();
        options = [
            { key: 'light', label: 'Light', swatchStyle: 'background:#f3f8f5; border-radius:5px', previewText: '', labelStyle: '' },
            { key: 'dark', label: 'Dark', swatchStyle: 'background:#0f141b; border-radius:5px', previewText: '', labelStyle: '' },
        ];
    }
    if (type === 'font') {
        activeKey = getPreferredFont();
        options = FONT_PRESETS.map((preset) => ({
            key: preset.key,
            label: preset.key.charAt(0).toUpperCase() + preset.key.slice(1),
            swatchStyle: `font-family:${preset.fontFamily}; font-size:1rem; font-weight:700; color:var(--text); background:none; border-color:transparent; width:auto; height:auto; padding:0 4px`,
            previewText: 'Ag',
            labelStyle: `font-family:${preset.fontFamily}`,
        }));
    }
    if (type === 'fontSize') {
        activeKey = getPreferredFontSize();
        options = FONT_SIZE_PRESETS.map((preset) => ({
            key: preset.key,
            label: `Size ${preset.label} (${preset.size})`,
            swatchStyle: `font-size:${preset.size}; font-weight:700; color:var(--text); background:none; border-color:transparent; width:auto; height:auto; padding:0 2px`,
            previewText: 'A',
            labelStyle: `font-size:${preset.size}`,
        }));
    }
    if (type === 'layout') {
        activeKey = getPreferredLayout();
        options = LAYOUT_MODES.map((key) => ({
            key,
            label: LAYOUT_NAME_LABELS[key] || key,
            swatchStyle: `font-weight:700; color:var(--text); background:none; border-color:transparent; width:auto; height:auto; padding:0 4px`,
            previewText: LAYOUT_BUTTON_LABELS[key] || key,
            labelStyle: '',
        }));
    }

    picker.innerHTML = options.map((option) => `
        <button class="quick-picker-option ${option.key === activeKey ? 'is-active' : ''}" type="button" data-picker-type="${type}" data-picker-key="${option.key}" title="${option.label}">
            <span class="qp-swatch" style="${option.swatchStyle || ''}">${option.previewText || ''}</span>
            <span class="qp-label" style="${option.labelStyle || ''}">${option.label}</span>
        </button>
    `).join('');

    picker.classList.remove('is-collapsed');
    state.activeQuickPicker = type;

    // Keep the picker edges aligned with the controls drawer edges.
    if (triggerEl) {
        const controlsBar = document.getElementById('uiQuickControls');
        if (controlsBar) {
            picker.style.left = '0';
            picker.style.right = '0';
            picker.style.minWidth = `${controlsBar.clientWidth}px`;
        }
    }

    picker.querySelectorAll('.quick-picker-option').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const selectedType = btn.getAttribute('data-picker-type');
            const selectedKey = btn.getAttribute('data-picker-key');
            if (!selectedType || !selectedKey) {
                return;
            }
            const isSameSelection = selectedKey === activeKey;
            applyControlSelection(selectedType, selectedKey);
            if (isSameSelection) {
                // User confirmed current selection — dismiss everything.
                hideQuickPicker();
                setQuickControlsPinned(false);
                const controls = document.getElementById('uiQuickControls');
                if (controls && !controls.classList.contains('is-collapsed')) {
                    localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, '1');
                    setQuickControlsCollapsed(true);
                }
                return;
            }
            showQuickPicker(selectedType, triggerEl, {
                source: 'option',
                key: selectedKey,
                forceRefresh: true,
            });
        });
    });
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '🌙' : '☀️';
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = theme;
    }
    applyBackgroundTheme(getPreferredBackground());
    applyAccentTheme(getPreferredAccent());
}

function syncHeaderHeightVar() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }
    document.documentElement.style.setProperty('--header-height', `${Math.ceil(header.offsetHeight)}px`);
}

function applyLayout(layoutMode) {
    const mode = LAYOUT_MODES.includes(layoutMode) ? layoutMode : 'default';
    document.body.setAttribute('data-layout', mode);
    scheduleContentAdaptiveLayout();
    const layoutBtn = document.getElementById('layoutCycleBtn');
    const layoutModeLabel = document.getElementById('layoutModeLabel');
    if (layoutBtn) {
        layoutBtn.textContent = LAYOUT_BUTTON_LABELS[mode] || 'P';
        layoutBtn.title = `Layout: ${LAYOUT_NAME_LABELS[mode] || mode}`;
        layoutBtn.setAttribute('aria-label', `Layout: ${LAYOUT_NAME_LABELS[mode] || mode}`);
    }
    if (layoutModeLabel) {
        layoutModeLabel.textContent = LAYOUT_NAME_LABELS[mode] || 'Default';
    }
}

function setLayout(layoutMode) {
    const mode = LAYOUT_MODES.includes(layoutMode) ? layoutMode : 'default';
    localStorage.setItem(LAYOUT_KEY, mode);
    applyLayout(mode);
    Object.values(charts).forEach((chart) => {
        if (chart) {
            chart.resize();
        }
    });
    if (state.lastData) {
        renderDashboard(state.lastData);
    }
}

function cycleLayoutMode() {
    const current = document.body.getAttribute('data-layout') || 'default';
    const idx = LAYOUT_MODES.indexOf(current);
    const next = LAYOUT_MODES[(idx + 1) % LAYOUT_MODES.length];
    setLayout(next);
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

function updateLastUpdatedLabel(timestampMs) {
    const label = document.getElementById('lastUpdatedLabel');
    if (!label) {
        return;
    }
    if (!timestampMs) {
        label.textContent = 'Updated: -';
        return;
    }
    const dt = new Date(timestampMs);
    const timeText = Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleTimeString();
    label.textContent = `Updated: ${timeText}`;
}

function setupPwaInstall() {
    const installBtn = document.getElementById('installAppBtn');
    if (!installBtn) {
        return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        installBtn.classList.remove('is-hidden');
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        installBtn.classList.add('is-hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            return;
        }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installBtn.classList.add('is-hidden');
    });
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

function applyThemeFromSystemIfNeeded() {
    if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(themeMedia.matches ? 'dark' : 'light');
    }
}

function setupEventListeners() {
    document.getElementById('backgroundCycleBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showQuickPicker('background', e.currentTarget);
    });
    document.getElementById('themeToggleBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showQuickPicker('theme', e.currentTarget);
    });
    document.getElementById('accentCycleBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showQuickPicker('accent', e.currentTarget);
    });
    document.getElementById('fontCycleBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showQuickPicker('font', e.currentTarget);
    });
    document.getElementById('fontSizeCycleBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showQuickPicker('fontSize', e.currentTarget);
    });
    const layoutCycleBtn = document.getElementById('layoutCycleBtn');
    if (layoutCycleBtn) {
        layoutCycleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showQuickPicker('layout', e.currentTarget);
        });
    }
    document.getElementById('uiControlsToggleBtn').addEventListener('click', toggleQuickControls);

    const refreshNowBtn = document.getElementById('refreshNowBtn');
    if (refreshNowBtn) {
        refreshNowBtn.addEventListener('click', () => {
            loadDashboard();
        });
    }

    document.addEventListener('click', (event) => {
        const wrap = document.querySelector('.ui-controls-wrap');
        const controls = document.getElementById('uiQuickControls');
        const accountPicker = document.getElementById('accountPicker');
        if (!wrap || !controls || wrap.contains(event.target)) {
            if (accountPicker && !accountPicker.contains(event.target)) {
                closeAccountMenu();
            }
            return;
        }
        hideQuickPicker();
        setQuickControlsPinned(false);
        if (!controls.classList.contains('is-collapsed')) {
            localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, '1');
            setQuickControlsCollapsed(true);
        }
        if (accountPicker && !accountPicker.contains(event.target)) {
            closeAccountMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') {
            return;
        }
        const controls = document.getElementById('uiQuickControls');
        if (controls && !controls.classList.contains('is-collapsed')) {
            localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, '1');
            setQuickControlsCollapsed(true);
        }
        setQuickControlsPinned(false);
        closeAccountMenu();
    });

    const accountBtn = document.getElementById('accountSelectorBtn');
    if (accountBtn) {
        accountBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleAccountMenu();
        });
    }

    document.getElementById('accountSelector').addEventListener('change', (e) => {
        localStorage.setItem('selectedAccount', e.target.value);
        const selector = e.target;
        const selectorLabel = document.getElementById('accountSelectorLabel');
        if (selectorLabel) {
            const activeOption = selector.options[selector.selectedIndex];
            selectorLabel.textContent = activeOption ? activeOption.textContent : 'All Accounts';
        }
        const selectorMenu = document.getElementById('accountSelectorMenu');
        if (selectorMenu) {
            selectorMenu.querySelectorAll('.account-option').forEach((btn) => {
                const value = btn.getAttribute('data-account-value') || '';
                btn.classList.toggle('is-active', value === selector.value);
            });
        }
        state.monthShift = 0;
        state.yearShift = 0;
        loadDashboard();
        startLivePnlPolling(); // reconnect SSE for the newly selected account
        startHistoryPolling(); // reconnect history invalidation SSE for the newly selected account
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

    document.getElementById('monthResetFilterBtn').addEventListener('click', () => {
        state.activeTradeFilter = null;
        state.monthShift = 0;
        state.tradesLimit = 50;
        loadDashboard();
    });

    document.getElementById('yearResetFilterBtn').addEventListener('click', () => {
        state.activeTradeFilter = null;
        state.yearShift = 0;
        state.tradesLimit = 50;
        loadDashboard();
    });

    document.getElementById('combineTradesBtn').addEventListener('click', () => {
        state.combinePositions = !state.combinePositions;
        saveStoredBoolean(COMBINE_TRADES_KEY, state.combinePositions);
        state.expandedTradeGroups.clear();
        applyGroupingButtonState();
        if (state.lastData) {
            document.getElementById('tradesTable').innerHTML = '';
            updateTradesTable(getRecentTrades(state.lastData));
            updateTradeControls(state.lastData);
        }
    });

    document.getElementById('combinePositionsBtn').addEventListener('click', () => {
        state.combineOpenPositions = !state.combineOpenPositions;
        saveStoredBoolean(COMBINE_POSITIONS_KEY, state.combineOpenPositions);
        state.expandedPositionGroups.clear();
        applyGroupingButtonState();
        if (state.lastData) {
            document.getElementById('positionsTable').innerHTML = '';
            updatePositionsTable(state.lastData.positions);
        }
    });

    document.getElementById('loadMoreTradesBtn').addEventListener('click', async () => {
        state.tradesLimit += 50;
        const selectedAccount = document.getElementById('accountSelector').value || localStorage.getItem('selectedAccount') || '';
        const data = await fetchAnalytics(selectedAccount);
        state.lastData = { ...(state.lastData || {}), ...data };
        updateTradesTable(getRecentTrades(data));
        updateTradeControls(data);
    });

    document.getElementById('combineExposureBtn').addEventListener('click', () => {
        state.combineExposure = !state.combineExposure;
        saveStoredBoolean(COMBINE_EXPOSURE_KEY, state.combineExposure);
        applyGroupingButtonState();
        if (state.lastData) {
            updateExposureTable(state.lastData.positions || []);
        }
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

    document.querySelectorAll('[data-positions-sort]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-positions-sort');
            if (!key) {
                return;
            }
            if (state.positionsSort.key === key) {
                state.positionsSort.direction = state.positionsSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.positionsSort.key = key;
                state.positionsSort.direction = key === 'symbol' || key === 'direction' || key === 'account_id' ? 'asc' : 'desc';
            }
            if (state.lastData) {
                updatePositionsTable(state.lastData.positions || []);
            }
        });
    });

    document.querySelectorAll('[data-trades-sort]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-trades-sort');
            if (!key) {
                return;
            }
            if (state.tradesSort.key === key) {
                state.tradesSort.direction = state.tradesSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.tradesSort.key = key;
                state.tradesSort.direction = key === 'account_id' || key === 'symbol' || key === 'result' ? 'asc' : 'desc';
            }
            if (state.lastData) {
                renderDashboard(state.lastData);
            }
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

    window.addEventListener('resize', () => {
        if (Array.isArray(state.accounts) && state.accounts.length) {
            syncAccountSelector(state.accounts);
        }
        scheduleContentAdaptiveLayout();
        scheduleAutoFitOpenPositions();
        scheduleAutoFitHistoricTrades();
    });

    // Auto-hide header on scroll down, re-show on scroll up
    (function setupScrollHideHeader() {
        const header = document.querySelector('.header');
        if (!header) return;
        let lastScrollY = window.scrollY;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const y = window.scrollY;
                    if (y > lastScrollY && y > 4) {
                        header.classList.add('header--hidden');
                    } else if (y < lastScrollY - 2 || y <= 0) {
                        header.classList.remove('header--hidden');
                    }
                    lastScrollY = y;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    })();
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
    const selectorMenu = document.getElementById('accountSelectorMenu');
    const selectorLabel = document.getElementById('accountSelectorLabel');
    const selectorBtn = document.getElementById('accountSelectorBtn');
    const selectorChevron = selectorBtn ? selectorBtn.querySelector('.account-selector-btn__chevron') : null;
    const selected = localStorage.getItem('selectedAccount') || '';

    // Collect all distinct categories across accounts (each account may have comma-separated categories)
    const categoryCountMap = new Map(); // category → count of accounts
    accounts.forEach((acc) => {
        const raw = String(acc.category || '').trim();
        if (!raw) return;
        raw.split(',').forEach((c) => {
            const cat = c.trim();
            if (cat) categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + 1);
        });
    });
    const categories = [...categoryCountMap.keys()].sort((a, b) => a.localeCompare(b));

    selector.innerHTML = `<option value="">All Accounts (${accounts.length})</option>`;
    const menuItems = [{
        value: '',
        label: `All Accounts (${accounts.length})`,
        title: `All Accounts (${accounts.length})`,
        fullLabel: `All Accounts (${accounts.length})`,
        compactLabel: `All Accounts (${accounts.length})`,
        isGroup: false,
    }];

    // Category group options
    categories.forEach((cat) => {
        const count = categoryCountMap.get(cat);
        const value = `cat:${cat}`;
        const label = `${cat} (${count})`;
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        selector.appendChild(option);
        menuItems.push({
            value,
            label,
            title: `Category: ${cat} — ${count} account${count !== 1 ? 's' : ''}`,
            fullLabel: label,
            compactLabel: cat,
            isGroup: true,
        });
    });

    const now = Date.now();
    const healthThresholdMs = 5 * 60 * 1000;

    accounts.forEach((acc) => {
        const option = document.createElement('option');
        option.value = acc.account_id;
        const accountDisplay = buildAccountDisplay(acc.account_id, acc.nickname || acc.account_name, acc.broker);
        const accountNameOnlyText = accountNameOnly(acc.account_id, acc.nickname || acc.account_name, acc.broker);
        const lastSync = toNum(acc.last_sync_at || acc.last_ingest_received_at, 0);
        const isOnline = lastSync > 0 && (now - lastSync) < healthThresholdMs;
        const statusMark = isOnline ? '🟢' : '🟥';
        const fullLabelText = `${statusMark} ${accountDisplay.idText}${accountDisplay.labelText ? ` - ${accountDisplay.labelText}` : ''}`;
        const compactLabelText = accountNameOnlyText;
        option.textContent = fullLabelText;
        selector.appendChild(option);
        menuItems.push({
            value: acc.account_id,
            label: fullLabelText,
            title: fullLabelText,
            fullLabel: fullLabelText,
            compactLabel: compactLabelText,
            isGroup: false,
        });
    });

    selector.value = selected;
    if (!selector.value) {
        selector.value = '';
    }

    if (selectorMenu) {
        const parts = [];
        let lastWasGroup = false;
        for (const item of menuItems) {
            if (item.isGroup && !lastWasGroup && parts.length > 0) {
                parts.push(`<div class="account-option-separator"></div>`);
            }
            const groupClass = item.isGroup ? ' account-option--group' : '';
            parts.push(`<button class="account-option${groupClass} ${item.value === selector.value ? 'is-active' : ''}" type="button" data-account-value="${item.value}" title="${item.title}">${item.label}</button>`);
            lastWasGroup = item.isGroup;
        }
        // Add a separator before the individual accounts section if there are categories
        if (categories.length > 0) {
            const catEnd = 1 + categories.length; // index after last category item
            // Already inserted inline above; rebuild with separator after categories
            const allParts = [];
            for (let i = 0; i < menuItems.length; i++) {
                const item = menuItems[i];
                const groupClass = item.isGroup ? ' account-option--group' : '';
                // Separator between "All Accounts" and first category
                if (i === 1 && item.isGroup) allParts.push(`<div class="account-option-separator"></div>`);
                // Separator after last category, before first individual account
                if (i === catEnd && !item.isGroup && i > 1) allParts.push(`<div class="account-option-separator"></div>`);
                allParts.push(`<button class="account-option${groupClass} ${item.value === selector.value ? 'is-active' : ''}" type="button" data-account-value="${item.value}" title="${item.title}">${item.label}</button>`);
            }
            selectorMenu.innerHTML = allParts.join('');
        } else {
            selectorMenu.innerHTML = menuItems.map((item) => `
                <button class="account-option ${item.value === selector.value ? 'is-active' : ''}" type="button" data-account-value="${item.value}" title="${item.title}">${item.label}</button>
            `).join('');
        }

        selectorMenu.querySelectorAll('.account-option').forEach((btn) => {
            btn.addEventListener('click', () => {
                const value = btn.getAttribute('data-account-value') || '';
                if (value === selector.value) {
                    toggleAccountMenu();
                    return;
                }
                selector.value = value;
                selector.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    const activeItem = menuItems.find((item) => item.value === selector.value) || menuItems[0];
    if (selectorLabel && activeItem) {
        selectorLabel.textContent = activeItem.fullLabel;
    }

    if (selectorBtn && menuItems.length > 0) {
        const ruler = document.createElement('span');
        ruler.className = 'account-selector-btn__label';
        ruler.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;max-width:none;overflow:visible;text-overflow:clip;white-space:nowrap;';
        document.body.appendChild(ruler);
        let maxTextWidth = 0;
        for (const item of menuItems) {
            ruler.textContent = item.fullLabel || item.label || '';
            maxTextWidth = Math.max(maxTextWidth, ruler.getBoundingClientRect().width);
        }
        document.body.removeChild(ruler);

        const btnStyles = getComputedStyle(selectorBtn);
        const paddingX = toNum(parseFloat(btnStyles.paddingLeft), 0) + toNum(parseFloat(btnStyles.paddingRight), 0);
        const borderX = toNum(parseFloat(btnStyles.borderLeftWidth), 0) + toNum(parseFloat(btnStyles.borderRightWidth), 0);
        const gap = toNum(parseFloat(btnStyles.gap), 0);
        const chevronWidth = selectorChevron ? selectorChevron.getBoundingClientRect().width : 10;
        const btnWidth = Math.ceil(maxTextWidth + paddingX + borderX + gap + chevronWidth);
        selectorBtn.style.width = btnWidth > 0 ? `${btnWidth}px` : '';

        if (selectorLabel && activeItem) {
            requestAnimationFrame(() => {
                selectorLabel.textContent = activeItem.fullLabel;
                const isOverflowing = selectorLabel.scrollWidth > (selectorLabel.clientWidth + 1);
                if (isOverflowing && activeItem.compactLabel) {
                    selectorLabel.textContent = activeItem.compactLabel;
                }
            });
        }
    }

    scheduleContentAdaptiveLayout();
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
    const systemStatusText = document.getElementById('systemStatusText');
    const systemStatusDot = document.getElementById('systemStatusDot');
    if (!systemStatusText || !systemStatusDot) return;
    systemStatusText.textContent = UI_VERSION;
    systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--error', 'status-dot--ok');
    systemStatusDot.classList.add('status-dot--ok-pulse');
    setTimeout(() => {
        systemStatusDot.classList.remove('status-dot--ok-pulse');
        systemStatusDot.classList.add('status-dot--ok');
    }, 620);
}

function updateKpis(summary, periods, tradeMetrics, filteredSummary) {
    const balanceEl = document.getElementById('balance');
    const balanceMetaEl = document.getElementById('balanceMeta');
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

    if (balanceEl) {
        animateNumericByKey(balanceEl, 'kpi-balance', toNum(summary.balance, 0), formatMoney, NON_LIVE_ANIM_MS);
        applyPnlClass(balanceEl, 0);
    }

    if (balanceMetaEl) {
        if (!balanceMetaEl.querySelector('[data-anim-key]')) {
            balanceMetaEl.innerHTML = '🔒 <span data-anim-key="kpi-meta-allocated"></span> · <span data-anim-key="kpi-meta-alloc-pct"></span>';
        }
        const allocSpan = balanceMetaEl.querySelector('[data-anim-key="kpi-meta-allocated"]');
        const pctSpan = balanceMetaEl.querySelector('[data-anim-key="kpi-meta-alloc-pct"]');
        const marginUsed = toNum(summary.margin_used, 0);
        const bal = toNum(summary.balance, 0);
        const allocPct = bal !== 0 ? (marginUsed / bal) * 100 : 0;
        animateNumericByKey(allocSpan, 'kpi-meta-allocated', marginUsed, formatMoney, NON_LIVE_ANIM_MS);
        animateNumericByKey(pctSpan, 'kpi-meta-alloc-pct', allocPct, v => v.toFixed(1) + '%', NON_LIVE_ANIM_MS);
        balanceMetaEl.className = 'label metric-card__meta';
    }

    animateNumericByKey(equityEl, 'kpi-equity', toNum(summary.equity, 0), formatMoney, NON_LIVE_ANIM_MS);
    animateNumericByKey(floatingEl, 'kpi-floating', toNum(summary.floating_pnl, 0), formatMoney, NON_LIVE_ANIM_MS);

    if (floatingMetaEl) {
        animateNumericByKey(floatingMetaEl, 'kpi-meta-floating-pct', floatingPct, formatDeltaPct, NON_LIVE_ANIM_MS);
        floatingMetaEl.className = `label metric-card__meta ${pnlClass(summary.floating_pnl)}`;
    }

    if (equityMetaEl) {
        const eqSuffix = state.activeTradeFilter ? ' selected range' : ' all history';
        animateNumericByKey(equityMetaEl, 'kpi-meta-equity-pct', equityPct, v => formatDeltaPct(v) + eqSuffix, NON_LIVE_ANIM_MS);
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

    grid.classList.remove('metric-grid--dense-table');

    grid.innerHTML = labels.map(([key, title]) => {
        const p = periods[key];
        return `
            <div class="metric-card">
                <div class="label">${title}</div>
                <div class="value ${pnlClass(p.pnl)}" data-anim-key="period-${key}-pnl" data-anim-target="${toNum(p.pnl, 0)}" data-anim-format="money">${formatMoney(p.pnl)}</div>
                <div class="label period-meta period-meta--full">Trades <span data-anim-key="period-${key}-trades" data-anim-target="${toNum(p.trades_count, 0)}" data-anim-format="int">${toNum(p.trades_count, 0)}</span> · Win <span data-anim-key="period-${key}-wr" data-anim-target="${toNum(p.win_rate_pct, 0)}" data-anim-format="pct">${formatPct(p.win_rate_pct)}</span></div>
                <div class="label period-meta period-meta--short">T <span data-anim-key="period-${key}-trades-s" data-anim-target="${toNum(p.trades_count, 0)}" data-anim-format="int">${toNum(p.trades_count, 0)}</span> · W <span data-anim-key="period-${key}-wr-s" data-anim-target="${toNum(p.win_rate_pct, 0)}" data-anim-format="pct">${formatPct(p.win_rate_pct)}</span></div>
            </div>
        `;
    }).join('');

    animateDeclaredNumericFields(grid, NON_LIVE_ANIM_MS);
}

function renderTradeMetrics(metrics, periods) {
    const grid = document.getElementById('tradeMetricsGrid');

    // MoM win-rate trend: compare last30d vs all_time
    let wrTrendHtml = '';
    if (periods) {
        const recent = toNum(periods.last30d?.win_rate_pct);
        const baseline = toNum(periods.all_time?.win_rate_pct);
        const delta = recent - baseline;
        if (Math.abs(delta) >= 0.1) {
            const arrow = delta > 0 ? '▲' : '▼';
            const cls = delta > 0 ? 'pnl-positive' : 'pnl-negative';
            wrTrendHtml = `<div class="label metric-card__trend ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}% vs avg</div>`;
        }
    }

    const cards = [
        { label: 'Win Rate', value: toNum(metrics.win_rate_pct), format: 'pct', pnl: 0, mode: 'neutral', animKey: 'trade-metric-win-rate' },
        { label: 'Profit Factor', value: toNum(metrics.profit_factor), format: 'fixed2', pnl: 0, mode: 'neutral', animKey: 'trade-metric-profit-factor' },
        { label: 'Expectancy', value: toNum(metrics.expectancy), format: 'money', pnl: toNum(metrics.expectancy), mode: 'pnl', animKey: 'trade-metric-expectancy' },
        { label: 'Average RR', value: toNum(metrics.avg_rr), format: 'fixed2', pnl: 0, mode: 'neutral', animKey: 'trade-metric-avg-rr' },
        { label: 'Average Win', value: toNum(metrics.avg_win), format: 'money', pnl: toNum(metrics.avg_win), mode: 'pnl', animKey: 'trade-metric-avg-win' },
        { label: 'Max Win', value: toNum(metrics.max_win), format: 'money', pnl: toNum(metrics.max_win), mode: 'pnl', animKey: 'trade-metric-max-win' },
        { label: 'Average Loss', value: toNum(metrics.avg_loss), format: 'money', pnl: toNum(metrics.avg_loss), mode: 'pnl', animKey: 'trade-metric-avg-loss' },
        { label: 'Max Loss', value: toNum(metrics.max_loss), format: 'money', pnl: toNum(metrics.max_loss), mode: 'pnl', animKey: 'trade-metric-max-loss' },
        { label: 'Max Drawdown', value: toNum(metrics.max_drawdown), format: 'money', pnl: -Math.abs(toNum(metrics.max_drawdown)), mode: 'pnl', animKey: 'trade-metric-max-drawdown' },
        { label: 'Avg Hold Time', value: durationLabel(metrics.avg_hold_seconds), format: 'text', pnl: 0, mode: 'neutral', animKey: '' },
    ];

    grid.classList.remove('metric-grid--dense-table');

    grid.innerHTML = cards.map((card, idx) => {
        const isAnim = card.format !== 'text' && card.animKey;
        let renderedValue = String(card.value);
        if (card.format === 'money') {
            renderedValue = formatMoney(card.value);
        } else if (card.format === 'pct') {
            renderedValue = formatPct(card.value);
        } else if (card.format === 'fixed2') {
            renderedValue = Number(toNum(card.value)).toFixed(2);
        }
        const animAttrs = isAnim
            ? ` data-anim-key="${card.animKey}" data-anim-target="${toNum(card.value, 0)}" data-anim-format="${card.format}"`
            : '';
        return `
        <div class="metric-card ${idx < 2 ? 'metric-card--lead' : ''}">
            <div class="label">${card.label}</div>
            <div class="value ${card.mode === 'pnl' ? pnlClass(card.pnl) : ''}"${animAttrs}>${renderedValue}</div>
            ${card.label === 'Win Rate' ? wrTrendHtml : ''}
        </div>
    `;
    }).join('');

    animateDeclaredNumericFields(grid, NON_LIVE_ANIM_MS);
}

function renderDenseOverview(data) {
    const tbody = document.getElementById('denseOverviewTable');
    if (!tbody) {
        return;
    }

    const summary = data?.summary || {};
    const allTime = data?.periods?.all_time || {};
    const metrics = data?.trade_metrics || {};
    const distribution = data?.filtered_distribution || {};
    const directions = data?.filtered_direction_distribution || {};
    const histogramStats = data?.pnl_histogram?.stats || {};

    const items = [
        ['Accounts / Open', `${toNum(summary.accounts_count)} / ${toNum(summary.open_positions)}`],
        ['Equity', formatMoney(summary.equity)],
        ['Balance', formatMoney(summary.balance)],
        ['Floating PnL', formatMoney(summary.floating_pnl)],
        ['All Time PnL', formatMoney(allTime.pnl)],
        ['All Time Trades', String(toNum(allTime.trades_count))],
        ['Win Rate', formatPct(allTime.win_rate_pct)],
        ['Expectancy', formatMoney(metrics.expectancy)],
        ['Profit Factor', Number(toNum(metrics.profit_factor)).toFixed(2)],
        ['Average RR', Number(toNum(metrics.avg_rr)).toFixed(2)],
        ['Max Drawdown', formatMoney(metrics.max_drawdown)],
        ['Avg Hold', durationLabel(metrics.avg_hold_seconds)],
        ['Wins / Losses / BE', `${toNum(distribution.wins)} / ${toNum(distribution.losses)} / ${toNum(distribution.breakeven || distribution.neutral)}`],
        ['Long / Short / Unk', `${toNum(directions.longs)} / ${toNum(directions.shorts)} / ${toNum(directions.unknown)}`],
        ['Mean / StdDev', `${formatSignedRounded(histogramStats.mean)} / ${toNum(histogramStats.std_dev).toFixed(1)}`],
    ];

    const cols = 3;
    const rowCount = Math.ceil(items.length / cols);
    let html = '';
    for (let r = 0; r < rowCount; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
            const item = items[r + c * rowCount];
            if (item) {
                html += `<td>${item[0]}</td><td>${item[1]}</td>`;
            } else {
                html += '<td></td><td></td>';
            }
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function getRecentTrades(data) {
    if (Array.isArray(data?.recent_trades)) {
        return data.recent_trades;
    }
    if (Array.isArray(data?.trades)) {
        return data.trades;
    }
    return [];
}

const POSITIONS_TABLE_PRIORITY_LEVELS = [8, 7, 5, 6, 4, 3, 2];
const TRADES_TABLE_PRIORITY_LEVELS = [7, 6, 5, 4, 3, 2];
const tableAutoFitRaf = {
    positions: 0,
    trades: 0,
};

function getTableScrollHost(table) {
    if (!table) {
        return null;
    }
    return table.closest('.table-scroll') || table.parentElement;
}

function isTableOverflowing(table, scrollHost) {
    if (!table || !scrollHost) {
        return false;
    }
    return (scrollHost.scrollWidth - scrollHost.clientWidth) > 1 || (table.scrollWidth - scrollHost.clientWidth) > 1;
}

function setPriorityColumnsVisible(table, classPrefix, level, visible) {
    if (!table) {
        return;
    }
    table.querySelectorAll(`.${classPrefix}${level}`).forEach((el) => {
        el.style.display = visible ? 'table-cell' : 'none';
    });
}

function autoFitPriorityColumns(tableBodyId, classPrefix, priorityLevels) {
    const tableBody = document.getElementById(tableBodyId);
    if (!tableBody) {
        return;
    }
    const table = tableBody.closest('table');
    if (!table) {
        return;
    }
    const scrollHost = getTableScrollHost(table);
    if (!scrollHost) {
        return;
    }

    for (const level of priorityLevels) {
        setPriorityColumnsVisible(table, classPrefix, level, true);
    }

    void table.offsetWidth;

    for (const level of priorityLevels) {
        if (!isTableOverflowing(table, scrollHost)) {
            break;
        }
        setPriorityColumnsVisible(table, classPrefix, level, false);
        void table.offsetWidth;
    }
}

function scheduleAutoFitOpenPositions() {
    if (tableAutoFitRaf.positions) {
        cancelAnimationFrame(tableAutoFitRaf.positions);
    }
    tableAutoFitRaf.positions = requestAnimationFrame(() => {
        tableAutoFitRaf.positions = 0;
        autoFitPriorityColumns('positionsTable', 'col-pos-prio-', POSITIONS_TABLE_PRIORITY_LEVELS);
    });
}

function scheduleAutoFitHistoricTrades() {
    if (tableAutoFitRaf.trades) {
        cancelAnimationFrame(tableAutoFitRaf.trades);
    }
    tableAutoFitRaf.trades = requestAnimationFrame(() => {
        tableAutoFitRaf.trades = 0;
        autoFitPriorityColumns('tradesTable', 'col-trades-prio-', TRADES_TABLE_PRIORITY_LEVELS);
    });
}

function updatePositionsTable(positions, durationMs = NON_LIVE_ANIM_MS) {
    const tbody = document.getElementById('positionsTable');
    const prevPositionValues = state.livePositionValues || new Map();
    const nextPositionValues = new Map();
    if (!positions || positions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;">No open positions</td></tr>';
        state.livePositionValues = nextPositionValues;
        scheduleAutoFitOpenPositions();
        return;
    }

    const nowMs = Date.now();
    let rows = [...positions].map((pos) => ({
        ...pos,
        _combined: false,
        _sortSymbol: normalizeSymbol(pos.symbol),
        sl_amount: estimatePositionTargetPnl(pos, pos.avg_sl),
        tp_amount: estimatePositionTargetPnl(pos, pos.avg_tp),
    }));

    if (state.combineOpenPositions && rows.length > 1) {
        const signedSize = (position) => {
            const rawSize = Math.abs(toNum(position?.size, 0));
            const side = String(position?.direction || '').toUpperCase();
            if (side === 'SELL') {
                return -rawSize;
            }
            if (side === 'BUY') {
                return rawSize;
            }
            return toNum(position?.size, 0);
        };
        const groups = {};
        for (const pos of rows) {
            const normSym = pos._sortSymbol || normalizeSymbol(pos.symbol);
            if (!groups[normSym]) {
                groups[normSym] = { symbol: pos.symbol, normSymbol: normSym, children: [] };
            }
            groups[normSym].children.push(pos);
        }
        rows = Object.values(groups).map((g) => {
            if (g.children.length === 1) {
                return { ...g.children[0], _combined: false };
            }
            const children = g.children.slice().sort((a, b) => {
                const acctCmp = positionAccountLabel(a).localeCompare(positionAccountLabel(b));
                return acctCmp || (toNum(b.unrealized_pnl) - toNum(a.unrealized_pnl));
            });
            const eps = 1e-9;
            const buySize = g.children.reduce((s, p) => {
                return s + (String(p.direction || '').toUpperCase() === 'BUY' ? Math.abs(toNum(p.size, 0)) : 0);
            }, 0);
            const sellSize = g.children.reduce((s, p) => {
                return s + (String(p.direction || '').toUpperCase() === 'SELL' ? Math.abs(toNum(p.size, 0)) : 0);
            }, 0);
            const netSizeSigned = buySize - sellSize;
            const isHedged = Math.abs(netSizeSigned) <= eps;
            const netDirection = isHedged ? 'HDG' : (netSizeSigned > 0 ? 'BUY' : 'SELL');
            const netSizeAbs = Math.abs(netSizeSigned);
            const totalPnl = g.children.reduce((s, p) => s + toNum(p.unrealized_pnl || 0), 0);
            const signedEntryNotional = g.children.reduce((s, p) => s + (toNum(p.entry_price) * signedSize(p)), 0);
            const signedCurrentNotional = g.children.reduce((s, p) => s + (toNum(p.current_price || p.entry_price) * signedSize(p)), 0);
            const absTotalSize = g.children.reduce((s, p) => s + Math.abs(toNum(p.size, 0)), 0);
            const absCurrentNotional = g.children.reduce((s, p) => {
                return s + (toNum(p.current_price || p.entry_price) * Math.abs(toNum(p.size, 0)));
            }, 0);
            const avgEntry = !isHedged
                ? signedEntryNotional / netSizeSigned
                : null;
            const avgCurrent = !isHedged
                ? signedCurrentNotional / netSizeSigned
                : (absTotalSize > 0 ? absCurrentNotional / absTotalSize : null);
            const directionalChildren = isHedged
                ? []
                : g.children.filter((p) => String(p.direction || '').toUpperCase() === netDirection);
            const slChildren = directionalChildren.filter((p) => p.avg_sl != null && p.avg_sl !== 0);
            const tpChildren = directionalChildren.filter((p) => p.avg_tp != null && p.avg_tp !== 0);
            const slSize = slChildren.reduce((s, p) => s + Math.abs(toNum(p.size, 0)), 0);
            const tpSize = tpChildren.reduce((s, p) => s + Math.abs(toNum(p.size, 0)), 0);
            const avgSl = slChildren.length > 0 && slSize > 0
                ? slChildren.reduce((s, p) => s + (toNum(p.avg_sl) * Math.abs(toNum(p.size, 0))), 0) / slSize
                : null;
            const avgTp = tpChildren.length > 0 && tpSize > 0
                ? tpChildren.reduce((s, p) => s + (toNum(p.avg_tp) * Math.abs(toNum(p.size, 0))), 0) / tpSize
                : null;
            const totalMargin = g.children.reduce((s, p) => s + toNum(p.margin || 0), 0);
            const earliestOpen = Math.min(...g.children.map(p => toNum(p.open_time_ms)).filter(t => t > 0));
            const accounts = [...new Set(g.children.map((p) => String(p.account_id || '-')))];
            const combinedRow = {
                _combined: true,
                _children: children,
                _accountCount: accounts.length,
                account_id: accounts.length === 1 ? accounts[0] : '',
                symbol: g.symbol,
                _sortSymbol: g.normSymbol,
                direction: netDirection,
                size: netSizeAbs,
                entry_price: avgEntry,
                current_price: avgCurrent,
                unrealized_pnl: totalPnl,
                avg_sl: avgSl,
                avg_tp: avgTp,
                tick_size: toNum(g.children[0]?.tick_size, NaN),
                tick_value: toNum(g.children[0]?.tick_value, NaN),
                margin: totalMargin || null,
                _entryDecimals: inferPriceDecimals(g.children, 'entry_price'),
                _currentDecimals: inferPriceDecimals(g.children, 'current_price'),
                _slDecimals: inferPriceDecimals(g.children, 'avg_sl'),
                _tpDecimals: inferPriceDecimals(g.children, 'avg_tp'),
                open_time_ms: earliestOpen === Infinity ? 0 : earliestOpen,
            };
            const slMoneyParts = g.children.map(c => c.sl_amount).filter(v => v !== null && v !== undefined);
            combinedRow.sl_amount = isHedged
                ? null
                : (slMoneyParts.length > 0 ? slMoneyParts.reduce((a, b) => a + b, 0) : null);
            const tpMoneyParts = g.children.map(c => c.tp_amount).filter(v => v !== null && v !== undefined);
            combinedRow.tp_amount = isHedged
                ? null
                : (tpMoneyParts.length > 0 ? tpMoneyParts.reduce((a, b) => a + b, 0) : null);
            return combinedRow;
        });
    }

    rows.sort((a, b) => {
        const key = state.positionsSort.key;
        const aVal = key === 'symbol' ? (a._sortSymbol || normalizeSymbol(a.symbol)) : a[key];
        const bVal = key === 'symbol' ? (b._sortSymbol || normalizeSymbol(b.symbol)) : b[key];
        let cmp = 0;
        if (key === 'symbol' || key === 'direction' || key === 'account_id') {
            if (key === 'account_id') {
                cmp = positionAccountLabel(a).localeCompare(positionAccountLabel(b));
            } else {
                cmp = String(aVal || '').localeCompare(String(bVal || ''));
            }
        } else {
            cmp = toNum(aVal) - toNum(bVal);
        }
        return state.positionsSort.direction === 'asc' ? cmp : -cmp;
    });

    const buildPosRowData = (pos, isChild) => {
        const openMs = toNum(pos.open_time_ms);
        const ageSec = openMs > 0 ? Math.max(0, (nowMs - openMs) / 1000) : 0;
        const ageText = openMs > 0 ? durationLabel(ageSec) : '-';
        const side = String(pos.direction || '-').toUpperCase();
        const slMoney = pos.sl_amount ?? estimatePositionTargetPnl(pos, pos.avg_sl);
        const tpMoney = pos.tp_amount ?? estimatePositionTargetPnl(pos, pos.avg_tp);
        const childAttr = isChild ? ` class="pos-combine-child" data-group-symbol="${normalizeSymbol(pos.symbol)}"` : '';
        const accountInner = `<span class="account-tag">${positionAccountLabel(pos)}</span>`;
        const symbolCell = pos._combined
            ? `<td class="pos-combine-toggle" data-group-symbol="${normalizeSymbol(pos.symbol)}" title="Click to expand">\u25B6 ${pos.symbol} (${pos._children.length})</td>`
            : `<td>${pos.symbol}</td>`;
        const entryDecimals = pos._entryDecimals || inferPriceDecimals([pos], 'entry_price');
        const currentDecimals = pos._currentDecimals || inferPriceDecimals([pos], 'current_price');
        const slDecimals = pos._slDecimals || inferPriceDecimals([pos], 'avg_sl');
        const tpDecimals = pos._tpDecimals || inferPriceDecimals([pos], 'avg_tp');
        const rowKey = pos._combined
            ? `combined|${normalizeSymbol(pos.symbol)}`
            : `${isChild ? 'pos-child' : 'pos'}|${normalizeSymbol(pos.symbol)}|${String(pos.account_id || '-')}|${String(pos.direction || '-')}`
              + `|${String(toNum(pos.open_time_ms, 0))}|${String(toNum(pos.size, 0))}`;
        const pnlValue = toNum(pos.unrealized_pnl || 0);
        const marginValue = toNum(pos.margin, 0);
        const entryValue = pos.entry_price !== null ? toNum(pos.entry_price, NaN) : NaN;
        const currentValue = pos.current_price !== null ? toNum(pos.current_price, NaN) : NaN;
        const slValue = (pos.avg_sl !== null && pos.avg_sl !== 0) ? toNum(pos.avg_sl, NaN) : NaN;
        const tpValue = (pos.avg_tp !== null && pos.avg_tp !== 0) ? toNum(pos.avg_tp, NaN) : NaN;
        const slMoneyValue = slMoney !== null ? toNum(slMoney, NaN) : NaN;
        const tpMoneyValue = tpMoney !== null ? toNum(tpMoney, NaN) : NaN;

        nextPositionValues.set(rowKey, {
            current_price: Number.isFinite(currentValue) ? currentValue : NaN,
            unrealized_pnl: pnlValue,
        });

        const fmtEntry = v => formatPrice(v, entryDecimals);
        const fmtCurrent = v => formatPrice(v, currentDecimals);
        const fmtSl = v => formatPrice(v, slDecimals);
        const fmtTp = v => formatPrice(v, tpDecimals);

        // Columns: 0=symbol, 1=dir, 2=size, 3=entry, 4=sl, 5=sl$, 6=tp, 7=tp$, 8=age, 9=current, 10=margin, 11=pnl, 12=account
        const animCells = [];
        const updateCells = [];
        if (Number.isFinite(entryValue)) animCells.push({ col: 3, key: `pos-entry-${rowKey}`, value: entryValue, format: 'price', _fmt: fmtEntry });
        if (Number.isFinite(slValue)) animCells.push({ col: 4, key: `pos-sl-${rowKey}`, value: slValue, format: 'price', _fmt: fmtSl });
        if (Number.isFinite(slMoneyValue)) animCells.push({ col: 5, key: `pos-sl$-${rowKey}`, value: slMoneyValue, format: 'money', className: `col-pos-prio-5 ${pnlClass(slMoneyValue)}` });
        if (Number.isFinite(tpValue)) animCells.push({ col: 6, key: `pos-tp-${rowKey}`, value: tpValue, format: 'price', _fmt: fmtTp });
        if (Number.isFinite(tpMoneyValue)) animCells.push({ col: 7, key: `pos-tp$-${rowKey}`, value: tpMoneyValue, format: 'money', className: `col-pos-prio-6 ${pnlClass(tpMoneyValue)}` });
        if (Number.isFinite(currentValue)) animCells.push({ col: 9, key: `pos-cur-${rowKey}`, value: currentValue, format: 'price', _fmt: fmtCurrent, className: `col-pos-prio-7 ${pnlClass(pnlValue)}` });
        if (marginValue > 0) animCells.push({ col: 10, key: `pos-margin-${rowKey}`, value: marginValue, format: 'money' });
        animCells.push({ col: 11, key: `pos-pnl-${rowKey}`, value: pnlValue, format: 'money', className: pnlClass(pnlValue) });

        const html = `
        <tr${childAttr} data-row-key="${rowKey}">
            ${symbolCell}
            <td><span class="dir-badge ${side === 'BUY' ? 'dir-buy' : side === 'SELL' ? 'dir-sell' : ''}">${side}</span></td>
            <td>${formatSize(pos.size)}</td>
            <td class="col-pos-prio-4">${Number.isFinite(entryValue) ? fmtEntry(entryValue) : '-'}</td>
            <td class="col-pos-prio-5">${Number.isFinite(slValue) ? fmtSl(slValue) : '-'}</td>
            <td class="col-pos-prio-5 ${pnlClass(slMoneyValue || 0)}">${Number.isFinite(slMoneyValue) ? formatMoney(slMoneyValue) : '-'}</td>
            <td class="col-pos-prio-6">${Number.isFinite(tpValue) ? fmtTp(tpValue) : '-'}</td>
            <td class="col-pos-prio-6 ${pnlClass(tpMoneyValue || 0)}">${Number.isFinite(tpMoneyValue) ? formatMoney(tpMoneyValue) : '-'}</td>
            <td class="col-pos-prio-7">${ageText}</td>
            <td class="col-pos-prio-7 ${pnlClass(pnlValue)}">${Number.isFinite(currentValue) ? fmtCurrent(currentValue) : '-'}</td>
            <td class="col-pos-prio-8">${marginValue > 0 ? formatMoney(marginValue) : '-'}</td>
            <td class="${pnlClass(pnlValue)}">${formatMoney(pnlValue)}</td>
            <td class="col-pos-prio-7">${accountInner}</td>
        </tr>`;

        return { key: rowKey, html, animCells, updateCells };
    };

    // Build row data list
    const rowDataList = [];
    if (!state.combineOpenPositions) {
        for (const pos of rows) {
            rowDataList.push(buildPosRowData(pos, false));
        }
    } else {
        for (const pos of rows) {
            rowDataList.push(buildPosRowData(pos, false));
            if (pos._combined && pos._children) {
                for (const child of pos._children) {
                    rowDataList.push(buildPosRowData(child, true));
                }
            }
        }
    }

    diffTableRows(tbody, rowDataList, durationMs);

    // Wire combine toggle handlers
    tbody.querySelectorAll('.pos-combine-toggle').forEach((td) => {
        if (td._toggleWired) return;
        td._toggleWired = true;
        td.addEventListener('click', (event) => {
            event.preventDefault();
            const parentRow = td.closest('tr');
            const symbol = td.getAttribute('data-group-symbol');
            let sibling = parentRow.nextElementSibling;
            const isCurrentlyHidden = sibling && sibling.classList.contains('pos-combine-child') && sibling.style.display === 'none';
            while (sibling && sibling.classList.contains('pos-combine-child')) {
                sibling.style.display = isCurrentlyHidden ? '' : 'none';
                sibling = sibling.nextElementSibling;
            }
            if (isCurrentlyHidden) {
                state.expandedPositionGroups.add(symbol);
            } else {
                state.expandedPositionGroups.delete(symbol);
            }
            const count = td.textContent.trim().replace(/^[\u25B6\u25BC]\s*/, '');
            td.textContent = isCurrentlyHidden ? `\u25BC ${count}` : `\u25B6 ${count}`;
        });
    });

    tbody.querySelectorAll('.pos-combine-child').forEach((row) => {
        const symbol = row.getAttribute('data-group-symbol');
        row.style.display = state.expandedPositionGroups.has(symbol) ? '' : 'none';
    });

    tbody.querySelectorAll('.pos-combine-toggle').forEach((td) => {
        const symbol = td.getAttribute('data-group-symbol');
        if (state.expandedPositionGroups.has(symbol)) {
            const count = td.textContent.trim().replace(/^[\u25B6\u25BC]\s*/, '');
            td.textContent = `\u25BC ${count}`;
        }
    });

    state.livePositionValues = nextPositionValues;

    scheduleAutoFitOpenPositions();
}

const SYMBOL_ALIASES = {
    // Precious Metals
    'GOLD': 'XAUUSD', 'GLD': 'XAUUSD', 'GC': 'XAUUSD',
    'SILVER': 'XAGUSD', 'SLV': 'XAGUSD', 'SI': 'XAGUSD',
    'PLATINUM': 'XPTUSD', 'PL': 'XPTUSD',
    'PALLADIUM': 'XPDUSD', 'PA': 'XPDUSD',
    'COPPER': 'XCUUSD', 'HG': 'XCUUSD',
    // US Indices
    'DJ30': 'US30', 'DJI30': 'US30', 'DOWJONES30': 'US30', 'DJIA': 'US30', 'WS30': 'US30', 'YM': 'US30', 'DOW30': 'US30', 'USA30': 'US30',
    'USTEC': 'NAS100', 'US100': 'NAS100', 'NDX100': 'NAS100', 'USTECH': 'NAS100', 'NQ100': 'NAS100', 'NSDQ100': 'NAS100', 'NQ': 'NAS100', 'NASDAQ100': 'NAS100', 'NDX': 'NAS100', 'USTEC100': 'NAS100', 'USTECH100': 'NAS100', 'NDAQ': 'NAS100',
    'SP500': 'SPX500', 'US500': 'SPX500', 'ES': 'SPX500', 'SPX': 'SPX500', 'USA500': 'SPX500',
    'RUSS2000': 'US2000', 'RUSSELL2000': 'US2000', 'RTY': 'US2000',
    // EU Indices
    'DE30': 'DE40', 'DAX40': 'DE40', 'DAX30': 'DE40', 'GER40': 'DE40', 'GER30': 'DE40', 'GDAXI': 'DE40', 'GERMANY40': 'DE40', 'GRXEUR': 'DE40',
    'FTSE100': 'UK100', 'FTSE': 'UK100', 'UKX': 'UK100',
    'FRA40': 'FR40', 'CAC40': 'FR40', 'FCHI40': 'FR40', 'FRANCE40': 'FR40',
    'EUSTX50': 'EU50', 'STOX50': 'EU50', 'STOXX50E': 'EU50', 'EURO50': 'EU50', 'SX5E': 'EU50', 'EUROSTOXX50': 'EU50',
    'SPN35': 'ES35', 'IBEX35': 'ES35', 'ESP35': 'ES35', 'SPAIN35': 'ES35',
    'FTMIB': 'IT40', 'ITA40': 'IT40', 'ITALY40': 'IT40',
    // Asia-Pac
    'NI225': 'JP225', 'NIKKEI225': 'JP225', 'NIKKEI': 'JP225', 'NK225': 'JP225', 'JPN225': 'JP225', 'NKD': 'JP225', 'JAPAN225': 'JP225',
    'HSI50': 'HK50', 'HSI': 'HK50', 'HANGSENG': 'HK50', 'HKG33': 'HK50', 'HONGKONG50': 'HK50',
    'AU200': 'AUS200', 'ASX200': 'AUS200', 'AUSTRALIA200': 'AUS200',
    'CN50': 'CHINA50', 'CHINAA50': 'CHINA50', 'FTXIN9': 'CHINA50',
    'NIFTY50': 'INDIA50',
    // Energy
    'WTI': 'USOIL', 'CRUDEOIL': 'USOIL', 'CLOIL': 'USOIL', 'CL': 'USOIL', 'XTIUSD': 'USOIL', 'USCRUDE': 'USOIL', 'WTIUSD': 'USOIL', 'OILUSD': 'USOIL', 'OIL': 'USOIL', 'OILWTI': 'USOIL', 'USOUSD': 'USOIL', 'EXTRALIGHT': 'USOIL',
    'BRENT': 'UKOIL', 'BRN': 'UKOIL', 'XBRUSD': 'UKOIL', 'UKCRUDE': 'UKOIL', 'BRENTOIL': 'UKOIL', 'BRT': 'UKOIL', 'OILBRENT': 'UKOIL', 'BRENTUSD': 'UKOIL',
    'NGAS': 'NATGAS', 'XNGUSD': 'NATGAS', 'NATURALGAS': 'NATGAS', 'NG': 'NATGAS',
    // Crypto
    'BITCOIN': 'BTCUSD', 'BTC': 'BTCUSD', 'XBT': 'BTCUSD', 'XBTUSD': 'BTCUSD',
    'ETHEREUM': 'ETHUSD', 'ETH': 'ETHUSD',
    'LITECOIN': 'LTCUSD', 'LTC': 'LTCUSD',
    'RIPPLE': 'XRPUSD', 'XRP': 'XRPUSD',
    'BITCOINCASH': 'BCHUSD', 'BCH': 'BCHUSD', 'BAB': 'BCHUSD',
    'DOGECOIN': 'DOGEUSD', 'DOGUSD': 'DOGEUSD', 'DOGE': 'DOGEUSD',
    'CARDANO': 'ADAUSD', 'ADA': 'ADAUSD',
    'SOLANA': 'SOLUSD', 'SOL': 'SOLUSD',
    'POLKADOT': 'DOTUSD', 'DOT': 'DOTUSD',
};

const SYMBOL_PREFIX_RE = /^(?:#|!|\.|m\.|c\.|e\.|s\.|FX[_:]|CFD[_:]|IDX[_:])/i;
const SYMBOL_SUFFIX_RE = /(?:\.cash|Cash|_SB|_sb|\.ecn|\.raw|\.stp|\.pro|\.prime|\.ndd|\.std|\.stnd|micro|_micro|_mini|\.fx|\.fs|-OTC|mini|cent|eco|pro|raw|\.[a-z]{1,2}|[+!#.\-_]m$|[+!#.\-_]$|_[mMiz]$)/;

function normalizeSymbol(sym) {
    if (!sym) return '';
    let s = sym.trim();
    s = s.replace(SYMBOL_PREFIX_RE, '');
    s = s.replace(SYMBOL_SUFFIX_RE, '');
    s = s.replace(SYMBOL_SUFFIX_RE, '');
    s = s.replace(/[\/._\-\s]/g, '').toUpperCase();
    return SYMBOL_ALIASES[s] || s;
}

function deriveDirection(trade) {
    const entry = toNum(trade.entry_price);
    const exit = trade.exit_price !== null ? toNum(trade.exit_price) : null;
    const profit = toNum(trade.profit);
    if (exit === null || profit === 0 || entry === exit) return 'N/A';
    return ((exit - entry) * profit) > 0 ? 'Buy' : 'Sell';
}

function combineOverlappingTrades(trades) {
    const sorted = [...trades].sort((a, b) => toNum(a.entry_time_ms) - toNum(b.entry_time_ms));
    const groups = [];

    for (const trade of sorted) {
        const dir = deriveDirection(trade);
        const normSym = normalizeSymbol(trade.symbol);
        let merged = false;
        for (let i = groups.length - 1; i >= 0; i--) {
            const g = groups[i];
            if (g.normSymbol !== normSym || g.direction !== dir) continue;
            const gClose = Math.max(...g.children.map(c => toNum(c.exit_time_ms) || toNum(c.entry_time_ms)));
            if (toNum(trade.entry_time_ms) <= gClose) {
                g.children.push(trade);
                merged = true;
                break;
            }
        }
        if (!merged) {
            groups.push({ symbol: trade.symbol, normSymbol: normSym, direction: dir, children: [trade] });
        }
    }

    return groups.map((g) => {
        if (g.children.length === 1) {
            const t = g.children[0];
            return { ...t, direction: g.direction, _combined: false };
        }
        const totalSize = g.children.reduce((s, t) => s + toNum(t.size), 0);
        const totalPnl = g.children.reduce((s, t) => s + toNum(t.profit), 0);
        const avgEntry = totalSize > 0
            ? g.children.reduce((s, t) => s + toNum(t.entry_price) * toNum(t.size), 0) / totalSize
            : 0;
        const avgExit = totalSize > 0
            ? g.children.reduce((s, t) => s + (t.exit_price !== null ? toNum(t.exit_price) : toNum(t.entry_price)) * toNum(t.size), 0) / totalSize
            : 0;
        const firstOpen = Math.min(...g.children.map(c => toNum(c.entry_time_ms)));
        const lastClose = Math.max(...g.children.map(c => toNum(c.exit_time_ms) || toNum(c.entry_time_ms)));
        const entryDecimals = inferPriceDecimals(g.children, 'entry_price');
        const exitDecimals = inferPriceDecimals(g.children, 'exit_price');
        const accounts = [...new Set(g.children.map(c => c.account_id).filter(Boolean))];
        const beTol = state.beTolerance || 0;
        const result = totalPnl > beTol ? 'win' : totalPnl < -beTol ? 'loss' : 'breakeven';
        return {
            _combined: true,
            _children: g.children,
            _accountCount: accounts.length,
            account_id: accounts.length === 1 ? accounts[0] : `${accounts.length} accts`,
            symbol: g.symbol,
            direction: g.direction,
            entry_price: avgEntry,
            exit_price: avgExit,
            size: totalSize,
            profit: totalPnl,
            result,
            _entryDecimals: entryDecimals,
            _exitDecimals: exitDecimals,
            entry_time_ms: firstOpen,
            exit_time_ms: lastClose,
            duration_sec: (lastClose - firstOpen) / 1000,
        };
    });
}

function updateTradesTable(trades) {
    const tbody = document.getElementById('tradesTable');
    let rows = Array.isArray(trades) ? [...trades] : [];

    rows = rows.map((t) => ({ ...t, direction: deriveDirection(t) }));

    if (state.combinePositions && rows.length > 0) {
        rows = combineOverlappingTrades(rows);
    }

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">No trades</td></tr>';
        scheduleAutoFitHistoricTrades();
        return;
    }

    rows.sort((a, b) => {
        const key = state.tradesSort.key;
        let cmp = 0;

        if (key === 'account_id' || key === 'symbol' || key === 'result' || key === 'direction') {
            if (key === 'account_id') {
                cmp = tradeAccountLabel(a).localeCompare(tradeAccountLabel(b));
            } else {
                cmp = String(a[key] || '').localeCompare(String(b[key] || ''));
            }
        } else {
            cmp = toNum(a[key]) - toNum(b[key]);
        }

        return state.tradesSort.direction === 'asc' ? cmp : -cmp;
    });

    const dirBadge = (dir) => {
        const cls = dir === 'Buy' ? 'dir-buy' : dir === 'Sell' ? 'dir-sell' : '';
        return `<span class="dir-badge ${cls}">${dir}</span>`;
    };

    const buildTradeRowData = (trade, isChild) => {
        const openTime = formatDateTimeMs(trade.entry_time_ms);
        const closeTime = formatDateTimeMs(trade.exit_time_ms);
        const accountLabel = tradeAccountLabel(trade);
        const duration = durationLabel(trade.duration_sec);
        const resultShort = formatTradeResultShort(trade.result);
        const childAttr = isChild ? ` class="combine-child" data-group-symbol="${normalizeSymbol(trade.symbol)}"` : '';
        const accountInner = `<span class="account-tag">${accountLabel}</span>`;
        const symbolCell = trade._combined
            ? `<td class="combine-toggle" data-group-symbol="${normalizeSymbol(trade.symbol)}" title="Click to expand">▶ ${trade.symbol} (${trade._children.length})</td>`
            : `<td>${trade.symbol}</td>`;
        const entryDecimals = trade._entryDecimals || inferPriceDecimals([trade], 'entry_price');
        const exitDecimals = trade._exitDecimals || inferPriceDecimals([trade], 'exit_price');
        const profitValue = toNum(trade.profit || 0);
        const rowKey = trade._combined
            ? `trade-combined|${normalizeSymbol(trade.symbol)}|${trade.direction}`
            : `${isChild ? 'trade-child' : 'trade'}|${normalizeSymbol(trade.symbol)}|${String(trade.account_id || '-')}|${toNum(trade.entry_time_ms)}|${toNum(trade.exit_time_ms)}`;
        const fmtEntryP = v => formatPrice(v, entryDecimals);
        const fmtExitP = v => formatPrice(v, exitDecimals);
        const entryPriceVal = toNum(trade.entry_price, NaN);
        const exitPriceVal = trade.exit_price !== null ? toNum(trade.exit_price, NaN) : NaN;
        // Cols: 0=symbol, 1=dir, 2=size, 3=entry, 4=open, 5=close, 6=duration, 7=exit, 8=result, 9=profit, 10=account
        const animCells = [
            { col: 9, key: `${rowKey}-pnl`, value: profitValue, format: 'money', className: pnlClass(profitValue) },
        ];
        if (Number.isFinite(entryPriceVal)) animCells.push({ col: 3, key: `${rowKey}-entry`, value: entryPriceVal, format: 'price', _fmt: fmtEntryP });
        if (Number.isFinite(exitPriceVal)) animCells.push({ col: 7, key: `${rowKey}-exit`, value: exitPriceVal, format: 'price', _fmt: fmtExitP });
        return {
            key: rowKey,
            html: `
        <tr${childAttr} data-row-key="${rowKey}">
            ${symbolCell}
            <td>${dirBadge(trade.direction || deriveDirection(trade))}</td>
            <td>${Number(trade.size || 0).toFixed(2)}</td>
            <td class="col-trades-prio-4">${Number.isFinite(entryPriceVal) ? fmtEntryP(entryPriceVal) : '-'}</td>
            <td class="col-trades-prio-5">${openTime}</td>
            <td class="col-trades-prio-5">${closeTime}</td>
            <td class="col-trades-prio-6">${duration}</td>
            <td class="col-trades-prio-7">${Number.isFinite(exitPriceVal) ? fmtExitP(exitPriceVal) : '-'}</td>
            <td class="col-trades-prio-7">${resultShort}</td>
            <td class="${pnlClass(profitValue)}">${formatMoney(profitValue)}</td>
            <td class="col-trades-prio-7">${accountInner}</td>
        </tr>`,
            animCells,
        };
    };

    const tradeRowData = [];
    for (const trade of rows) {
        tradeRowData.push(buildTradeRowData(trade, false));
        if (trade._combined && trade._children) {
            const children = trade._children.slice().sort((a, b) => {
                const acctCmp = tradeAccountLabel(a).localeCompare(tradeAccountLabel(b));
                return acctCmp || (toNum(b.exit_time_ms) - toNum(a.exit_time_ms));
            });
            for (const child of children) {
                tradeRowData.push(buildTradeRowData({ ...child, direction: deriveDirection(child) }, true));
            }
        }
    }

    diffTableRows(tbody, tradeRowData);

    // Wire combine toggle handlers
    tbody.querySelectorAll('.combine-toggle').forEach((td) => {
        if (td._toggleWired) return;
        td._toggleWired = true;
        td.addEventListener('click', (event) => {
            event.preventDefault();
            const parentRow = td.closest('tr');
            const symbol = td.getAttribute('data-group-symbol');
            let sibling = parentRow.nextElementSibling;
            const isCurrentlyHidden = sibling && sibling.classList.contains('combine-child') && sibling.style.display === 'none';
            while (sibling && sibling.classList.contains('combine-child')) {
                sibling.style.display = isCurrentlyHidden ? '' : 'none';
                sibling = sibling.nextElementSibling;
            }
            if (isCurrentlyHidden) {
                state.expandedTradeGroups.add(symbol);
            } else {
                state.expandedTradeGroups.delete(symbol);
            }
            const label = td.textContent.trim().replace(/^[▶▼]\s*/, '');
            td.textContent = isCurrentlyHidden ? `▼ ${label}` : `▶ ${label}`;
        });
    });

    tbody.querySelectorAll('.combine-child').forEach((row) => {
        const symbol = row.getAttribute('data-group-symbol');
        row.style.display = state.expandedTradeGroups.has(symbol) ? '' : 'none';
    });

    tbody.querySelectorAll('.combine-toggle').forEach((td) => {
        const symbol = td.getAttribute('data-group-symbol');
        if (state.expandedTradeGroups.has(symbol)) {
            const label = td.textContent.trim().replace(/^[▶▼]\s*/, '');
            td.textContent = `▼ ${label}`;
        }
    });

    scheduleAutoFitHistoricTrades();
}

function updateExposureTable(positions, durationMs = NON_LIVE_ANIM_MS) {
    const tbody = document.getElementById('exposureTable');
    const source = Array.isArray(positions) ? positions : [];

    if (source.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No exposure</td></tr>';
        return;
    }

    // Always group by symbol first
    const symbolGroups = new Map();
    source.forEach((p) => {
        const sym = normalizeSymbol(p.symbol);
        if (!symbolGroups.has(sym)) symbolGroups.set(sym, []);
        symbolGroups.get(sym).push(p);
    });

    // Use account-level margin_used from live data for total margin
    const totalMarginUsed = toNum(state.lastData?.summary?.margin_used, 0);
    const totalSize = source.reduce((s, p) => s + Math.abs(toNum(p.size)), 0);
    const totalPositionMargin = source.reduce((s, p) => s + toNum(p.margin, 0), 0);
    const effectiveTotalMargin = totalMarginUsed > 0 ? totalMarginUsed : totalPositionMargin;
    const safeTotal = Math.max(totalSize, 1e-9);
    let rows = [];

    for (const [sym, posArr] of symbolGroups) {
        const symSize = posArr.reduce((s, p) => s + Math.abs(toNum(p.size)), 0);
        const symMargin = posArr.reduce((s, p) => s + toNum(p.margin, 0), 0);
        const accounts = [...new Set(posArr.map((p) => preferredAccountLabel(p.account_id, p.account_name || p.nickname)))];

        // Symbol total row always present
        rows.push({
            isSymbol: true,
            symbol: sym,
            size: symSize,
            margin: symMargin,
            pct: effectiveTotalMargin > 0 && symMargin > 0
                ? (symMargin / effectiveTotalMargin) * 100
                : (symSize / safeTotal) * 100,
            account: accounts.length === 1 ? accounts[0] : `${accounts.length} accts`,
            hasChildren: !state.combineExposure && accounts.length > 1,
        });

        // When ungrouped, show per-account breakdown
        if (!state.combineExposure) {
            const acctMap = new Map();
            posArr.forEach((p) => {
                const acctKey = String(p.account_id || '-');
                if (!acctMap.has(acctKey)) {
                    acctMap.set(acctKey, {
                        size: 0,
                        margin: 0,
                        account: preferredAccountLabel(p.account_id, p.account_name || p.nickname),
                    });
                }
                const entry = acctMap.get(acctKey);
                entry.size += Math.abs(toNum(p.size));
                entry.margin += toNum(p.margin, 0);
            });
            if (acctMap.size > 1) {
                for (const [, data] of acctMap) {
                    rows.push({
                        isSymbol: false,
                        _parentSymbol: sym,
                        symbol: '',
                        size: data.size,
                        margin: data.margin,
                            pct: effectiveTotalMargin > 0 && data.margin > 0
                                ? (data.margin / effectiveTotalMargin) * 100
                            : (data.size / safeTotal) * 100,
                        account: data.account,
                    });
                }
            }
        }
    }

    // Sort symbol groups
    const symbolRows = rows.filter((r) => r.isSymbol);
    symbolRows.sort((a, b) => {
        if (state.exposureSort.key === 'symbol') {
            const cmp = a.symbol.localeCompare(b.symbol);
            return state.exposureSort.direction === 'asc' ? cmp : -cmp;
        }
        const diff = a.size - b.size;
        return state.exposureSort.direction === 'asc' ? diff : -diff;
    });

    // Rebuild rows keeping children after their parent
    const final = [];
    for (const sym of symbolRows) {
        final.push(sym);
        const childRows = rows.filter((r) => !r.isSymbol && r._parentSymbol === sym.symbol);
        final.push(...childRows);
    }

    const orderedRows = final.length > 0 ? final : rows;
    const exposureRowData = orderedRows.map((row) => {
        const rowKey = row.isSymbol ? `exp-sym|${row.symbol}` : `exp-acct|${row._parentSymbol}|${row.account}`;
        const sizeVal = toNum(row.size);
        const marginVal = toNum(row.margin, 0);
        const pctVal = toNum(row.pct);
        const animCells = [
            { col: 1, key: `${rowKey}-size`, value: sizeVal, format: 'size' },
            { col: 3, key: `${rowKey}-pct`, value: pctVal, format: 'pct' },
        ];
        if (marginVal > 0) {
            animCells.push({ col: 2, key: `${rowKey}-margin`, value: marginVal, format: 'money' });
        }
        return {
            key: rowKey,
            html: `
        <tr class="${row.isSymbol ? 'exposure-symbol-row' : 'exposure-child-row'}" data-row-key="${rowKey}">
            <td>${row.isSymbol ? row.symbol : ''}</td>
            <td>${sizeVal.toFixed(2)}</td>
            <td>${marginVal > 0 ? formatMoney(marginVal) : '-'}</td>
            <td>${formatPct(pctVal)}</td>
            <td><span class="account-tag">${row.account || '-'}</span></td>
        </tr>`,
            animCells,
        };
    });

    diffTableRows(tbody, exposureRowData, durationMs);
}

function updateTradeControls(data) {
    const filterLabel = document.getElementById('tradesFilterLabel');
    const countInfo = document.getElementById('tradesCountInfo');
    const loadMoreBtn = document.getElementById('loadMoreTradesBtn');

    filterLabel.textContent = state.activeTradeFilter ? `Filter: ${state.activeTradeFilter.label}` : 'Filter: None';
    const returned = toNum(data.trades_returned, getRecentTrades(data).length);
    const total = toNum(data.trades_total_matching, getRecentTrades(data).length);
    countInfo.textContent = `Showing ${returned} of ${total} trades`;
    loadMoreBtn.disabled = returned >= total;
}

function setDayFilter(year, month, day) {
    const from = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const to = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    state.activeTradeFilter = {
        fromMs: from,
        toMs: to,
        label: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
    state.tradesLimit = 50;
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
    state.tradesLimit = 50;
    loadDashboard();
}

function getChartColorVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function getChartFontSpec() {
    const rootStyles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    const family = bodyStyles.getPropertyValue('font-family').trim() || 'Inter, Arial, sans-serif';
    const baseSizePx = toNum(parseFloat(rootStyles.getPropertyValue('--app-font-size')) || parseFloat(rootStyles.fontSize), 16);
    const size = Math.max(11, Math.min(15, Math.round(baseSizePx * 0.78)));
    return { family, size };
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

function buildWinRateDataset(label, values, accent) {
    return {
        label,
        data: values,
        backgroundColor: values.map(() => `rgba(${getChartColorVar('--accent-rgb') || '47, 143, 98'}, 0.32)`),
        borderColor: values.map(() => accent),
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
        categoryPercentage: 0.72,
        barPercentage: 0.9,
        maxBarThickness: 22,
    };
}

function toChartSignature(parts) {
    return JSON.stringify(parts);
}

function shouldUpdateChart(key, signature) {
    if (chartSignatures[key] === signature) {
        return false;
    }
    chartSignatures[key] = signature;
    return true;
}

function buildBarChartOptions(text, labelCount = 0) {
    const chartFont = getChartFontSpec();
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: NON_LIVE_ANIM_MS,
            easing: 'easeOutCubic',
            y: {
                from: (ctx) => {
                    if (ctx.type !== 'data') return undefined;
                    return ctx.chart.scales.y.getPixelForValue(0);
                },
            },
        },
        transitions: {
            active: { animation: { duration: 200 } },
        },
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        layout: {
            padding: { left: 10, right: 18, top: 8, bottom: 18 },
        },
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                ticks: {
                    color: text,
                    font: chartFont,
                    autoSkip: true,
                    maxTicksLimit: maxTicksForCount(labelCount),
                    maxRotation: 0,
                    minRotation: 0,
                    padding: 6,
                },
                grid: {
                    display: false,
                },
            },
            y: {
                ticks: {
                    color: text,
                    font: chartFont,
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

function positionDistLabels(trackEl, segments) {
    let labelsEl = trackEl.nextElementSibling;
    if (!labelsEl || !labelsEl.classList.contains('distribution-labels')) {
        labelsEl = document.createElement('div');
        labelsEl.className = 'distribution-labels';
        trackEl.after(labelsEl);
    }
    labelsEl.innerHTML = '';

    const colorMap = { W: 'var(--pnl-positive)', L: 'var(--pnl-negative)', BE: 'var(--pnl-neutral)' };
    let offset = 0;
    const entries = [];
    for (const seg of segments) {
        if (!seg.visible) { offset += seg.pct; continue; }
        const label = document.createElement('div');
        label.className = 'dist-label';
        label.style.left = `${offset}%`;

        const dot = document.createElement('span');
        dot.className = 'dist-label-dot';
        dot.style.background = colorMap[seg.letter] || 'var(--text-muted)';

        const text = document.createElement('span');
        text.className = 'dist-label-text';
        text.textContent = seg.labelText || `${seg.count} ${seg.letter} (${seg.pct.toFixed(1)}%)`;

        label.appendChild(dot);
        label.appendChild(text);
        labelsEl.appendChild(label);
        entries.push({ el: label, textEl: text, startPct: offset, widthPct: seg.pct });
        offset += seg.pct;
    }

    requestAnimationFrame(() => {
        const containerW = labelsEl.getBoundingClientRect().width;
        if (containerW <= 0) return;

        const measured = entries.map((e) => ({ ...e, labelW: e.el.getBoundingClientRect().width }));
        const GAP = 4;

        // Initial ideal positions
        const idealPositions = measured.map((m) => {
            const startPx = (m.startPct / 100) * containerW;
            return { left: startPx, width: m.labelW };
        });

        // Place each label at its ideal position
        const positions = idealPositions.map((p) => ({ left: p.left }));

        // Clamp all labels to container, and pack left-to-right
        for (let i = 0; i < positions.length; i++) {
            // Clamp right edge
            const maxLeft = containerW - measured[i].labelW;
            if (positions[i].left > maxLeft) positions[i].left = maxLeft;
            if (positions[i].left < 0) positions[i].left = 0;
            // Prevent overlap with previous
            if (i > 0) {
                const prevRight = positions[i - 1].left + measured[i - 1].labelW + GAP;
                if (positions[i].left < prevRight) {
                    positions[i].left = prevRight;
                }
            }
        }
        // Now pack right-to-left to ensure last label never overflows
        for (let i = positions.length - 1; i >= 0; i--) {
            const maxLeft = containerW - measured[i].labelW;
            if (positions[i].left > maxLeft) positions[i].left = maxLeft;
            if (positions[i].left < 0) positions[i].left = 0;
            if (i < positions.length - 1) {
                const nextLeft = positions[i + 1].left - GAP - measured[i].labelW;
                if (positions[i].left > nextLeft) {
                    positions[i].left = Math.max(0, nextLeft);
                }
            }
        }

        // Apply positions
        for (let i = 0; i < measured.length; i++) {
            measured[i].el.style.left = `${positions[i].left}px`;
        }
    });
}

function updateDistributionProgress(wins, losses, neutralCount, directionalOutcomes) {
    const winsSegment = document.getElementById('distWinsSegment');
    const lossesSegment = document.getElementById('distLossesSegment');
    const neutralSegment = document.getElementById('distNeutralSegment');
    const allText = document.getElementById('distAllText');
    const winsText = document.getElementById('distWinsText');
    const lossesText = document.getElementById('distLossesText');
    const neutralText = document.getElementById('distNeutralText');

    const longsText = document.getElementById('distLongsText');
    const shortsText = document.getElementById('distShortsText');

    const longWinsSegment = document.getElementById('distLongWinsSegment');
    const longLossesSegment = document.getElementById('distLongLossesSegment');
    const longNeutralSegment = document.getElementById('distLongNeutralSegment');
    const longWinsText = document.getElementById('distLongWinsText');
    const longLossesText = document.getElementById('distLongLossesText');
    const longNeutralText = document.getElementById('distLongNeutralText');

    const shortWinsSegment = document.getElementById('distShortWinsSegment');
    const shortLossesSegment = document.getElementById('distShortLossesSegment');
    const shortNeutralSegment = document.getElementById('distShortNeutralSegment');
    const shortWinsText = document.getElementById('distShortWinsText');
    const shortLossesText = document.getElementById('distShortLossesText');
    const shortNeutralText = document.getElementById('distShortNeutralText');

    if (!winsSegment || !lossesSegment || !neutralSegment || !allText || !winsText || !lossesText || !neutralText || !longsText || !shortsText || !longWinsSegment || !longLossesSegment || !longNeutralSegment || !longWinsText || !longLossesText || !longNeutralText || !shortWinsSegment || !shortLossesSegment || !shortNeutralSegment || !shortWinsText || !shortLossesText || !shortNeutralText) {
        return;
    }

    const total = Math.max(0, wins + losses + neutralCount);
    const winsPct = total > 0 ? (wins / total) * 100 : 0;
    const lossesPct = total > 0 ? (losses / total) * 100 : 0;
    const neutralPct = total > 0 ? (neutralCount / total) * 100 : 100;

    winsSegment.style.width = `${winsPct}%`;
    lossesSegment.style.width = `${lossesPct}%`;
    neutralSegment.style.width = `${neutralPct}%`;

    winsSegment.style.display = wins > 0 ? '' : 'none';
    lossesSegment.style.display = losses > 0 ? '' : 'none';
    neutralSegment.style.display = neutralCount > 0 ? '' : 'none';

    const fmtInt = v => String(Math.round(Number(v || 0)));
    const fmtPct1 = v => Number(v || 0).toFixed(1);
    const animTotal = (el, k, val) => {
        if (!el) return;
        const tk = `dist-${k}-total`;
        if (!el.querySelector(`[data-anim-key="${tk}"]`)) {
            el.innerHTML = `<span data-anim-key="${tk}"></span> total`;
        }
        animateNumericByKey(el.querySelector(`[data-anim-key="${tk}"]`), tk, val, fmtInt, NON_LIVE_ANIM_MS);
    };
    const animOutcome = (el, k, prefix, count, pct) => {
        if (!el) return;
        const ck = `dist-${k}-n`;
        const pk = `dist-${k}-p`;
        if (!el.querySelector(`[data-anim-key="${ck}"]`)) {
            el.innerHTML = `${prefix}<span data-anim-key="${ck}"></span> (<span data-anim-key="${pk}"></span>%)`;
        }
        animateNumericByKey(el.querySelector(`[data-anim-key="${ck}"]`), ck, count, fmtInt, NON_LIVE_ANIM_MS);
        animateNumericByKey(el.querySelector(`[data-anim-key="${pk}"]`), pk, pct, fmtPct1, NON_LIVE_ANIM_MS);
    };

    animTotal(allText, 'all', total);
    animOutcome(winsText, 'all-w', 'W ', wins, winsPct);
    animOutcome(lossesText, 'all-l', 'L ', losses, lossesPct);
    animOutcome(neutralText, 'all-be', 'BE ', neutralCount, neutralPct);
    winsText.parentElement.style.display = wins > 0 ? '' : 'none';
    lossesText.parentElement.style.display = losses > 0 ? '' : 'none';
    neutralText.parentElement.style.display = neutralCount > 0 ? '' : 'none';

    const longWins = toNum(directionalOutcomes?.long_wins);
    const longLosses = toNum(directionalOutcomes?.long_losses);
    const longNeutral = toNum(directionalOutcomes?.long_neutral);
    const shortWins = toNum(directionalOutcomes?.short_wins);
    const shortLosses = toNum(directionalOutcomes?.short_losses);
    const shortNeutral = toNum(directionalOutcomes?.short_neutral);

    const longTotal = Math.max(0, longWins + longLosses + longNeutral);
    const shortTotal = Math.max(0, shortWins + shortLosses + shortNeutral);

    const longWinsPct = longTotal > 0 ? (longWins / longTotal) * 100 : 0;
    const longLossesPct = longTotal > 0 ? (longLosses / longTotal) * 100 : 0;
    const longNeutralPct = longTotal > 0 ? (longNeutral / longTotal) * 100 : 100;

    const shortWinsPct = shortTotal > 0 ? (shortWins / shortTotal) * 100 : 0;
    const shortLossesPct = shortTotal > 0 ? (shortLosses / shortTotal) * 100 : 0;
    const shortNeutralPct = shortTotal > 0 ? (shortNeutral / shortTotal) * 100 : 100;

    longWinsSegment.style.width = `${longWinsPct}%`;
    longLossesSegment.style.width = `${longLossesPct}%`;
    longNeutralSegment.style.width = `${longNeutralPct}%`;
    longWinsSegment.style.display = longWins > 0 ? '' : 'none';
    longLossesSegment.style.display = longLosses > 0 ? '' : 'none';
    longNeutralSegment.style.display = longNeutral > 0 ? '' : 'none';

    shortWinsSegment.style.width = `${shortWinsPct}%`;
    shortLossesSegment.style.width = `${shortLossesPct}%`;
    shortNeutralSegment.style.width = `${shortNeutralPct}%`;
    shortWinsSegment.style.display = shortWins > 0 ? '' : 'none';
    shortLossesSegment.style.display = shortLosses > 0 ? '' : 'none';
    shortNeutralSegment.style.display = shortNeutral > 0 ? '' : 'none';

    animTotal(longsText, 'long', longTotal);
    animOutcome(longWinsText, 'long-w', 'W ', longWins, longWinsPct);
    animOutcome(longLossesText, 'long-l', 'L ', longLosses, longLossesPct);
    animOutcome(longNeutralText, 'long-be', 'BE ', longNeutral, longNeutralPct);
    longWinsText.parentElement.style.display = longWins > 0 ? '' : 'none';
    longLossesText.parentElement.style.display = longLosses > 0 ? '' : 'none';
    longNeutralText.parentElement.style.display = longNeutral > 0 ? '' : 'none';

    animTotal(shortsText, 'short', shortTotal);
    animOutcome(shortWinsText, 'short-w', 'W ', shortWins, shortWinsPct);
    animOutcome(shortLossesText, 'short-l', 'L ', shortLosses, shortLossesPct);
    animOutcome(shortNeutralText, 'short-be', 'BE ', shortNeutral, shortNeutralPct);
    shortWinsText.parentElement.style.display = shortWins > 0 ? '' : 'none';
    shortLossesText.parentElement.style.display = shortLosses > 0 ? '' : 'none';
    shortNeutralText.parentElement.style.display = shortNeutral > 0 ? '' : 'none';

    positionDistLabels(winsSegment.parentElement, [
        { pct: winsPct, count: wins, letter: 'W', visible: wins > 0 },
        { pct: lossesPct, count: losses, letter: 'L', visible: losses > 0 },
        { pct: neutralPct, count: neutralCount, letter: 'BE', visible: neutralCount > 0 },
    ]);
    positionDistLabels(longWinsSegment.parentElement, [
        { pct: longWinsPct, count: longWins, letter: 'W', visible: longWins > 0 },
        { pct: longLossesPct, count: longLosses, letter: 'L', visible: longLosses > 0 },
        { pct: longNeutralPct, count: longNeutral, letter: 'BE', visible: longNeutral > 0 },
    ]);
    positionDistLabels(shortWinsSegment.parentElement, [
        { pct: shortWinsPct, count: shortWins, letter: 'W', visible: shortWins > 0 },
        { pct: shortLossesPct, count: shortLosses, letter: 'L', visible: shortLosses > 0 },
        { pct: shortNeutralPct, count: shortNeutral, letter: 'BE', visible: shortNeutral > 0 },
    ]);
}

function updateSymbolPanels(symbolStats) {
    const pnlPanel = document.getElementById('symbolPnlPanel');
    const wrPanel = document.getElementById('symbolWrPanel');
    if (!pnlPanel || !wrPanel || !Array.isArray(symbolStats) || symbolStats.length === 0) {
        if (pnlPanel) pnlPanel.innerHTML = '';
        if (wrPanel) wrPanel.innerHTML = '';
        return;
    }

    const renderDistBlock = (symbol, wins, losses, total, headerMeta, segments) => {
        const neutralCount = Math.max(0, total - wins - losses);
        const wPct = total > 0 ? (wins / total) * 100 : 0;
        const lPct = total > 0 ? (losses / total) * 100 : 0;
        const nPct = total > 0 ? (neutralCount / total) * 100 : 100;
        return {
            html: `
            <div class="distribution-block">
                <div class="distribution-block-head">
                    <span class="distribution-block-title">${symbol}</span>
                    <span class="distribution-block-meta">${headerMeta}</span>
                </div>
                <div class="distribution-track" role="img" aria-label="${symbol} distribution">
                    ${wins > 0 ? `<div class="distribution-segment distribution-segment--wins" style="width:${wPct}%"></div>` : ''}
                    ${losses > 0 ? `<div class="distribution-segment distribution-segment--losses" style="width:${lPct}%"></div>` : ''}
                    ${neutralCount > 0 ? `<div class="distribution-segment distribution-segment--neutral" style="width:${nPct}%"></div>` : ''}
                </div>
            </div>`,
            segments: segments || [
                { pct: wPct, count: wins, letter: 'W', visible: wins > 0 },
                { pct: lPct, count: losses, letter: 'L', visible: losses > 0 },
                { pct: nPct, count: neutralCount, letter: 'BE', visible: neutralCount > 0 },
            ],
        };
    };

    const applyLabels = (panel, blocks) => {
        const tracks = panel.querySelectorAll('.distribution-track');
        tracks.forEach((track, idx) => {
            if (blocks[idx]) positionDistLabels(track, blocks[idx].segments);
        });
    };

    // Keep both symbol panels in the exact same order for easier visual comparison.
    const symbolOrder = symbolStats.slice().sort((a, b) => {
        const pnlDiff = toNum(b.pnl) - toNum(a.pnl);
        if (pnlDiff !== 0) {
            return pnlDiff;
        }
        return String(a.symbol || '').localeCompare(String(b.symbol || ''));
    });

    // PnL panel — ordered by the shared symbol order, labels show money amounts
    const pnlBlocks = symbolOrder.map((s) => {
        const neutralCount = Math.max(0, s.trades - s.wins - s.losses);
        const wPct = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
        const lPct = s.trades > 0 ? (s.losses / s.trades) * 100 : 0;
        const nPct = s.trades > 0 ? (neutralCount / s.trades) * 100 : 100;
        return renderDistBlock(s.symbol, s.wins, s.losses, s.trades,
            `${formatMoney(s.pnl)} · ${s.trades} trades`,
            [
                { pct: wPct, count: s.wins, letter: 'W', visible: s.wins > 0, labelText: `${s.wins} W (${formatMoney(s.win_pnl || 0)})` },
                { pct: lPct, count: s.losses, letter: 'L', visible: s.losses > 0, labelText: `${s.losses} L (${formatMoney(s.loss_pnl || 0)})` },
                { pct: nPct, count: neutralCount, letter: 'BE', visible: neutralCount > 0, labelText: `${neutralCount} BE (${formatMoney(s.be_pnl || 0)})` },
            ]
        );
    });
    pnlPanel.innerHTML = pnlBlocks.map((b) => b.html).join('');
    applyLabels(pnlPanel, pnlBlocks);

    // Win Rate panel — use the same shared symbol order, labels show percentages
    const wrBlocks = symbolOrder.map((s) => {
        const neutralCount = Math.max(0, s.trades - s.wins - s.losses);
        const wPct = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
        const lPct = s.trades > 0 ? (s.losses / s.trades) * 100 : 0;
        const nPct = s.trades > 0 ? (neutralCount / s.trades) * 100 : 100;
        return renderDistBlock(s.symbol, s.wins, s.losses, s.trades,
            `WR ${formatPct(s.win_rate_pct)} · ${s.trades} trades`,
            [
                { pct: wPct, count: s.wins, letter: 'W', visible: s.wins > 0, labelText: `${s.wins} W (${wPct.toFixed(1)}%)` },
                { pct: lPct, count: s.losses, letter: 'L', visible: s.losses > 0, labelText: `${s.losses} L (${lPct.toFixed(1)}%)` },
                { pct: nPct, count: neutralCount, letter: 'BE', visible: neutralCount > 0, labelText: `${neutralCount} BE (${nPct.toFixed(1)}%)` },
            ]
        );
    });
    wrPanel.innerHTML = wrBlocks.map((b) => b.html).join('');
    applyLabels(wrPanel, wrBlocks);
}

function updateCharts(data) {
    const positive = getChartColorVar('--pnl-positive');
    const negative = getChartColorVar('--pnl-negative');
    const neutral = getChartColorVar('--pnl-neutral');
    const text = getChartColorVar('--text');
    const chartFont = getChartFontSpec();
    const accent = getChartColorVar('--accent');
    const accentRgb = getChartColorVar('--accent-rgb') || '47, 143, 98';
    const floatingPointColor = '#ff8a00';
    const styleSignature = `${text}|${accent}|${accentRgb}|${chartFont.family}|${chartFont.size}`;

    const tradePnlCurveRows = Array.isArray(data.trade_pnl_curve) ? data.trade_pnl_curve : [];
    const floatingPnl = toNum(data.summary?.floating_pnl);
    const fallbackCurve = Array.from({ length: 30 }, (_, idx) => {
        const ts = new Date(Date.now() - ((29 - idx) * 24 * 60 * 60 * 1000)).setHours(0, 0, 0, 0);
        return { ts, cumulative_pnl: 0 };
    });

    const baseCurveRows = tradePnlCurveRows.length > 0 ? tradePnlCurveRows : fallbackCurve;
    const visibleBaseCurveRows = state.activeTradeFilter ? baseCurveRows.slice(-MAX_PNL_CURVE_POINTS) : baseCurveRows;
    const mainCurveRows = visibleBaseCurveRows.slice();
    const lastBaseValue = mainCurveRows.length > 0 ? toNum(mainCurveRows[mainCurveRows.length - 1].cumulative_pnl) : 0;
    const floatingTs = mainCurveRows.length > 0 ? toNum(mainCurveRows[mainCurveRows.length - 1].ts, Date.now()) + 1 : Date.now();
    mainCurveRows.push({
        ts: floatingTs,
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
        pnlCurveTitle.textContent = 'PnL Curve';
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
                    backgroundColor: `rgba(${accentRgb}, 0.12)`,
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
                animation: (function () {
                    const n = Math.max(mainCurveValues.length, 1);
                    const perPoint = Math.max(NON_LIVE_ANIM_MS / n, 12);
                    const totalMs = perPoint * n;
                    return {
                        x: {
                            type: 'number',
                            easing: 'linear',
                            duration: perPoint,
                            from: NaN,
                            delay: (ctx) => ctx.type === 'data' ? ctx.index * perPoint : 0,
                        },
                        y: {
                            type: 'number',
                            easing: 'easeOutCubic',
                            duration: Math.min(perPoint * 4, totalMs),
                            from: (ctx) => {
                                if (ctx.type !== 'data' || ctx.index === 0) return ctx.chart.scales.y.getPixelForValue(0);
                                return ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1]?.getProps(['y'], true).y;
                            },
                            delay: (ctx) => ctx.type === 'data' ? ctx.index * perPoint : 0,
                        },
                    };
                })(),
                interaction: { mode: 'nearest', intersect: false, axis: 'x' },
                layout: {
                    padding: { left: 10, right: 18, top: 8, bottom: 18 },
                },
                plugins: {
                    legend: { display: false, labels: { color: text, font: chartFont } },
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
                            maxTicksLimit: maxTicksForCount(mainCurveLabels.length),
                            maxRotation: 0,
                            minRotation: 0,
                            color: text,
                            font: chartFont,
                            padding: 6,
                        },
                        grid: { display: false },
                    },
                    y: {
                        ticks: { color: text, font: chartFont },
                    },
                },
            },
        });
    } else {
        const curveSig = toChartSignature([mainCurveLabels, mainCurveValues, mainCurvePointRadiusByIndex, styleSignature]);
        if (shouldUpdateChart('pnlCurve', curveSig)) {
            charts.pnlCurve.config.type = mainCurveType;
            charts.pnlCurve.data.labels = mainCurveLabels;
            charts.pnlCurve.data.datasets[0].label = mainCurveLabel;
            charts.pnlCurve.data.datasets[0].data = mainCurveValues;
            charts.pnlCurve.data.datasets[0].borderColor = accent;
            charts.pnlCurve.data.datasets[0].backgroundColor = `rgba(${accentRgb}, 0.12)`;
            charts.pnlCurve.data.datasets[0].pointRadius = mainCurvePointRadiusByIndex;
            charts.pnlCurve.data.datasets[0].pointHoverRadius = mainCurvePointRadiusByIndex.map((r) => r + 1);
            charts.pnlCurve.data.datasets[0].pointBackgroundColor = mainCurvePointBackgroundColor;
            charts.pnlCurve.data.datasets[0].pointBorderColor = mainCurvePointBorderColor;
            charts.pnlCurve.data.datasets[0].fill = mainCurveFill;
            charts.pnlCurve.data.datasets[0].showLine = mainCurveType !== 'scatter';
            charts.pnlCurve.options.plugins.legend.labels.color = text;
            charts.pnlCurve.options.plugins.legend.labels.font = chartFont;
            charts.pnlCurve.options.scales.x.ticks.color = text;
            charts.pnlCurve.options.scales.x.ticks.font = chartFont;
            charts.pnlCurve.options.scales.y.ticks.color = text;
            charts.pnlCurve.options.scales.y.ticks.font = chartFont;
            const updN = Math.max(mainCurveValues.length, 1);
            const updPP = Math.max(NON_LIVE_ANIM_MS / updN, 12);
            const updTotal = updPP * updN;
            charts.pnlCurve.options.animation = {
                x: {
                    type: 'number', easing: 'linear', duration: updPP,
                    from: NaN,
                    delay: (ctx) => ctx.type === 'data' ? ctx.index * updPP : 0,
                },
                y: {
                    type: 'number', easing: 'easeOutCubic', duration: Math.min(updPP * 4, updTotal),
                    from: (ctx) => {
                        if (ctx.type !== 'data' || ctx.index === 0) return ctx.chart.scales.y.getPixelForValue(0);
                        return ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1]?.getProps(['y'], true).y;
                    },
                    delay: (ctx) => ctx.type === 'data' ? ctx.index * updPP : 0,
                },
            };
            charts.pnlCurve.update();
        }
    }

    const wins = toNum(data.filtered_distribution?.wins);
    const losses = toNum(data.filtered_distribution?.losses);
    const neutralCount = toNum(data.filtered_distribution?.breakeven ?? data.filtered_distribution?.neutral);
    updateDistributionProgress(wins, losses, neutralCount, data.filtered_direction_outcome_distribution);

    // Show all-time daily PnL by default; use filtered range when a trade filter is active
    const dailyRows = state.activeTradeFilter
        ? (Array.isArray(data.filtered_daily_pnl) ? data.filtered_daily_pnl : [])
        : ((Array.isArray(data.alltime_daily_pnl) && data.alltime_daily_pnl.length > 0)
            ? data.alltime_daily_pnl
            : (Array.isArray(data.filtered_daily_pnl) ? data.filtered_daily_pnl : []));
    const dailyRawLabels = dailyRows.map((r) => r.date || '');
    const dailyLabels = dailyRawLabels.map((d) => formatIsoDateShort(d));
    const dailyValues = dailyRows.map((r) => toNum(r.pnl));
    const dailyTitle = document.getElementById('dailyPnlChartTitle');
    if (dailyTitle) {
        dailyTitle.textContent = state.activeTradeFilter
            ? `Historical PnL (${state.activeTradeFilter.label})`
            : 'Historical PnL (All Time)';
    }

    if (!charts.dailyPnl) {
        charts.dailyPnl = new Chart(document.getElementById('dailyPnlChart'), {
            type: 'bar',
            data: {
                labels: dailyLabels,
                datasets: [buildBarDataset('Daily PnL', dailyValues, positive, negative, neutral)],
            },
            options: {
                ...buildBarChartOptions(text, dailyLabels.length),
                plugins: {
                    ...buildBarChartOptions(text, dailyLabels.length).plugins,
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                if (!items.length) {
                                    return '';
                                }
                                return dailyRawLabels[items[0].dataIndex] || '';
                            },
                        },
                    },
                },
            },
        });
    } else {
        const dailyPnlSig = toChartSignature([dailyLabels, dailyValues, styleSignature, state.activeTradeFilter?.label || 'all']);
        if (shouldUpdateChart('dailyPnl', dailyPnlSig)) {
            charts.dailyPnl.data.labels = dailyLabels;
            charts.dailyPnl.data.datasets[0].data = dailyValues;
            charts.dailyPnl.data.datasets[0].backgroundColor = dailyValues.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
            charts.dailyPnl.options.scales.x.ticks.color = text;
            charts.dailyPnl.options.scales.x.ticks.font = chartFont;
            charts.dailyPnl.options.scales.y.ticks.color = text;
            charts.dailyPnl.options.scales.y.ticks.font = chartFont;
            charts.dailyPnl.options.scales.x.ticks.maxTicksLimit = maxTicksForCount(dailyLabels.length);
            charts.dailyPnl.options.plugins.tooltip = {
                callbacks: {
                    title: (items) => {
                        if (!items.length) {
                            return '';
                        }
                        return dailyRawLabels[items[0].dataIndex] || '';
                    },
                },
            };
            charts.dailyPnl.update();
        }
    }

    const dailyWrRows = state.activeTradeFilter
        ? (Array.isArray(data.daily_win_rate_filtered) ? data.daily_win_rate_filtered : [])
        : ((Array.isArray(data.daily_win_rate_all_time) && data.daily_win_rate_all_time.length > 0)
            ? data.daily_win_rate_all_time
            : (Array.isArray(data.daily_win_rate_filtered) ? data.daily_win_rate_filtered : []));
    const dailyWrRawLabels = dailyWrRows.map((r) => r.date || '');
    const dailyWrLabels = dailyWrRawLabels.map((d) => formatIsoDateShort(d));
    const dailyWrValues = dailyWrRows.map((r) => toNum(r.win_rate_pct));
    const dailyWrTitle = document.getElementById('dailyWrChartTitle');
    if (dailyWrTitle) {
        dailyWrTitle.textContent = state.activeTradeFilter
            ? `Historical Win Rate (${state.activeTradeFilter.label})`
            : 'Historical Win Rate (All Time)';
    }

    if (!charts.dailyWr) {
        charts.dailyWr = new Chart(document.getElementById('dailyWrChart'), {
            type: 'bar',
            data: {
                labels: dailyWrLabels,
                datasets: [buildWinRateDataset('Win Rate', dailyWrValues, accent)],
            },
            options: {
                ...buildBarChartOptions(text, dailyWrLabels.length),
                scales: {
                    ...buildBarChartOptions(text, dailyWrLabels.length).scales,
                    y: {
                        ...buildBarChartOptions(text, dailyWrLabels.length).scales.y,
                        min: 0,
                        max: 100,
                        ticks: {
                            color: text,
                            font: chartFont,
                            callback: (v) => `${v}%`,
                        },
                    },
                },
            },
        });
    } else {
        const dailyWrSig = toChartSignature([dailyWrLabels, dailyWrValues, styleSignature, state.activeTradeFilter?.label || 'all']);
        if (shouldUpdateChart('dailyWr', dailyWrSig)) {
            charts.dailyWr.data.labels = dailyWrLabels;
            charts.dailyWr.data.datasets[0].data = dailyWrValues;
            charts.dailyWr.data.datasets[0].backgroundColor = dailyWrValues.map(() => `rgba(${accentRgb}, 0.32)`);
            charts.dailyWr.data.datasets[0].borderColor = dailyWrValues.map(() => accent);
            charts.dailyWr.options.scales.x.ticks.color = text;
            charts.dailyWr.options.scales.x.ticks.font = chartFont;
            charts.dailyWr.options.scales.y.ticks.color = text;
            charts.dailyWr.options.scales.y.ticks.font = chartFont;
            charts.dailyWr.options.scales.x.ticks.maxTicksLimit = maxTicksForCount(dailyWrLabels.length);
            charts.dailyWr.update();
        }
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
            options: buildBarChartOptions(text, dayOfWeekLabels.length),
        });
    } else {
        const dayPnlSig = toChartSignature([dayOfWeekPnL, styleSignature]);
        if (shouldUpdateChart('pnlByDayOfWeek', dayPnlSig)) {
            charts.pnlByDayOfWeek.data.datasets[0].data = dayOfWeekPnL;
            charts.pnlByDayOfWeek.data.datasets[0].backgroundColor = dayOfWeekPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
            charts.pnlByDayOfWeek.options.scales.x.ticks.color = text;
            charts.pnlByDayOfWeek.options.scales.x.ticks.font = chartFont;
            charts.pnlByDayOfWeek.options.scales.y.ticks.color = text;
            charts.pnlByDayOfWeek.options.scales.y.ticks.font = chartFont;
            charts.pnlByDayOfWeek.update();
        }
    }

    const dayOfWeekWrRows = Array.isArray(data.win_rate_by_day_of_week) ? data.win_rate_by_day_of_week : [];
    const dayOfWeekWr = Array(7).fill(0);
    dayOfWeekWrRows.forEach((row) => {
        if (row.day_of_week >= 0 && row.day_of_week <= 6) dayOfWeekWr[row.day_of_week] = toNum(row.win_rate_pct);
    });
    if (!charts.wrByDayOfWeek) {
        charts.wrByDayOfWeek = new Chart(document.getElementById('wrByDayOfWeekChart'), {
            type: 'bar',
            data: {
                labels: dayOfWeekLabels,
                datasets: [buildWinRateDataset('Win Rate', dayOfWeekWr, accent)],
            },
            options: {
                ...buildBarChartOptions(text, dayOfWeekLabels.length),
                scales: {
                    ...buildBarChartOptions(text, dayOfWeekLabels.length).scales,
                    y: {
                        ...buildBarChartOptions(text, dayOfWeekLabels.length).scales.y,
                        min: 0,
                        max: 100,
                        ticks: { color: text, font: chartFont, callback: (v) => `${v}%` },
                    },
                },
            },
        });
    } else {
        const dayWrSig = toChartSignature([dayOfWeekWr, styleSignature]);
        if (shouldUpdateChart('wrByDayOfWeek', dayWrSig)) {
            charts.wrByDayOfWeek.data.datasets[0].data = dayOfWeekWr;
            charts.wrByDayOfWeek.data.datasets[0].backgroundColor = dayOfWeekWr.map(() => `rgba(${accentRgb}, 0.32)`);
            charts.wrByDayOfWeek.data.datasets[0].borderColor = dayOfWeekWr.map(() => accent);
            charts.wrByDayOfWeek.options.scales.x.ticks.color = text;
            charts.wrByDayOfWeek.options.scales.x.ticks.font = chartFont;
            charts.wrByDayOfWeek.options.scales.y.ticks.color = text;
            charts.wrByDayOfWeek.options.scales.y.ticks.font = chartFont;
            charts.wrByDayOfWeek.update();
        }
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
            options: buildBarChartOptions(text, hourOfDayLabels.length),
        });
    } else {
        const hourPnlSig = toChartSignature([hourOfDayPnL, styleSignature]);
        if (shouldUpdateChart('pnlByHourOfDay', hourPnlSig)) {
            charts.pnlByHourOfDay.data.datasets[0].data = hourOfDayPnL;
            charts.pnlByHourOfDay.data.datasets[0].backgroundColor = hourOfDayPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
            charts.pnlByHourOfDay.options.scales.x.ticks.color = text;
            charts.pnlByHourOfDay.options.scales.x.ticks.font = chartFont;
            charts.pnlByHourOfDay.options.scales.y.ticks.color = text;
            charts.pnlByHourOfDay.options.scales.y.ticks.font = chartFont;
            charts.pnlByHourOfDay.update();
        }
    }

    const hourOfDayWrRows = Array.isArray(data.win_rate_by_hour_of_day) ? data.win_rate_by_hour_of_day : [];
    const hourOfDayWr = Array(24).fill(0);
    hourOfDayWrRows.forEach((row) => {
        if (row.hour_of_day >= 0 && row.hour_of_day <= 23) hourOfDayWr[row.hour_of_day] = toNum(row.win_rate_pct);
    });
    if (!charts.wrByHourOfDay) {
        charts.wrByHourOfDay = new Chart(document.getElementById('wrByHourOfDayChart'), {
            type: 'bar',
            data: {
                labels: hourOfDayLabels,
                datasets: [buildWinRateDataset('Win Rate', hourOfDayWr, accent)],
            },
            options: {
                ...buildBarChartOptions(text, hourOfDayLabels.length),
                scales: {
                    ...buildBarChartOptions(text, hourOfDayLabels.length).scales,
                    y: {
                        ...buildBarChartOptions(text, hourOfDayLabels.length).scales.y,
                        min: 0,
                        max: 100,
                        ticks: { color: text, font: chartFont, callback: (v) => `${v}%` },
                    },
                },
            },
        });
    } else {
        const hourWrSig = toChartSignature([hourOfDayWr, styleSignature]);
        if (shouldUpdateChart('wrByHourOfDay', hourWrSig)) {
            charts.wrByHourOfDay.data.datasets[0].data = hourOfDayWr;
            charts.wrByHourOfDay.data.datasets[0].backgroundColor = hourOfDayWr.map(() => `rgba(${accentRgb}, 0.32)`);
            charts.wrByHourOfDay.data.datasets[0].borderColor = hourOfDayWr.map(() => accent);
            charts.wrByHourOfDay.options.scales.x.ticks.color = text;
            charts.wrByHourOfDay.options.scales.x.ticks.font = chartFont;
            charts.wrByHourOfDay.options.scales.y.ticks.color = text;
            charts.wrByHourOfDay.options.scales.y.ticks.font = chartFont;
            charts.wrByHourOfDay.update();
        }
    }

    const durationRows = Array.isArray(data.win_rate_by_trade_duration) ? data.win_rate_by_trade_duration : [];
    const durationTitle = document.getElementById('durationWinRateTitle');
    if (durationTitle) {
        durationTitle.textContent = state.activeTradeFilter
            ? `PnL by Trade Duration (${state.activeTradeFilter.label})`
            : 'PnL by Trade Duration (All Trades)';
    }
    const durationPnlLabels = durationRows.map((row) => row.label || 'N/A');
    const durationPnlValues = durationRows.map((row) => toNum(row.avg_pnl));
    const durationPnlTrades = durationRows.map((row) => toNum(row.trades));
    const durationPnlChartData = {
        labels: durationPnlLabels,
        datasets: [buildBarDataset('Avg PnL', durationPnlValues, positive, negative, neutral)],
    };
    const durationPnlBaseOptions = buildBarChartOptions(text, durationPnlLabels.length);
    const durationPnlOptions = {
        ...durationPnlBaseOptions,
        plugins: {
            ...durationPnlBaseOptions.plugins,
            tooltip: {
                callbacks: {
                    label: (ctx) => `Avg PnL: $${toNum(ctx.parsed.y).toFixed(2)} · Trades: ${durationPnlTrades[ctx.dataIndex] ?? 0}`,
                },
            },
        },
        scales: {
            ...durationPnlBaseOptions.scales,
            y: {
                ...durationPnlBaseOptions.scales.y,
                ticks: {
                    color: text,
                    font: chartFont,
                    callback: (v) => `$${v}`,
                },
            },
        },
    };

    if (charts.durationWinRate && charts.durationWinRate.config.type !== 'bar') {
        charts.durationWinRate.destroy();
        charts.durationWinRate = null;
    }
    if (!charts.durationWinRate) {
        charts.durationWinRate = new Chart(document.getElementById('durationWinRateChart'), {
            type: 'bar',
            data: durationPnlChartData,
            options: durationPnlOptions,
        });
    } else {
        const durationPnlSig = toChartSignature([durationPnlLabels, durationPnlValues, durationPnlTrades, styleSignature, state.activeTradeFilter?.label || 'all']);
        if (shouldUpdateChart('durationWinRate', durationPnlSig)) {
            charts.durationWinRate.data.labels = durationPnlLabels;
            charts.durationWinRate.data.datasets[0].data = durationPnlValues;
            charts.durationWinRate.data.datasets[0].backgroundColor = durationPnlValues.map((v) => (v > 0 ? positive : v < 0 ? negative : neutral));
            charts.durationWinRate.options.scales.x.ticks.color = text;
            charts.durationWinRate.options.scales.x.ticks.font = chartFont;
            charts.durationWinRate.options.scales.y.ticks.color = text;
            charts.durationWinRate.options.scales.y.ticks.font = chartFont;
            charts.durationWinRate.update();
        }
    }

    const durationWrRows = durationRows;
    const durationWrLabels = durationWrRows.map((row) => row.label || 'N/A');
    const durationWrValues = durationWrRows.map((row) => toNum(row.win_rate_pct));
    const durationWrTitle = document.getElementById('durationWrChartTitle');
    if (durationWrTitle) {
        durationWrTitle.textContent = state.activeTradeFilter
            ? `Win Rate by Trade Duration (${state.activeTradeFilter.label})`
            : 'Win Rate by Trade Duration (All Trades)';
    }
    if (!charts.durationWr) {
        charts.durationWr = new Chart(document.getElementById('durationWrChart'), {
            type: 'bar',
            data: {
                labels: durationWrLabels,
                datasets: [buildWinRateDataset('Win Rate', durationWrValues, accent)],
            },
            options: {
                ...buildBarChartOptions(text, durationWrLabels.length),
                scales: {
                    ...buildBarChartOptions(text, durationWrLabels.length).scales,
                    y: {
                        ...buildBarChartOptions(text, durationWrLabels.length).scales.y,
                        min: 0,
                        max: 100,
                        ticks: { color: text, font: chartFont, callback: (v) => `${v}%` },
                    },
                },
            },
        });
    } else {
        const durationWrSig = toChartSignature([durationWrLabels, durationWrValues, styleSignature, state.activeTradeFilter?.label || 'all']);
        if (shouldUpdateChart('durationWr', durationWrSig)) {
            charts.durationWr.data.labels = durationWrLabels;
            charts.durationWr.data.datasets[0].data = durationWrValues;
            charts.durationWr.data.datasets[0].backgroundColor = durationWrValues.map(() => `rgba(${accentRgb}, 0.32)`);
            charts.durationWr.data.datasets[0].borderColor = durationWrValues.map(() => accent);
            charts.durationWr.options.scales.x.ticks.color = text;
            charts.durationWr.options.scales.x.ticks.font = chartFont;
            charts.durationWr.options.scales.y.ticks.color = text;
            charts.durationWr.options.scales.y.ticks.font = chartFont;
            charts.durationWr.update();
        }
    }

    const histogram = data.pnl_histogram || {};
    const bins = histogram.bins || [];
    const normalCurve = histogram.normal_curve || [];
    const histogramStats = histogram.stats || {};
    const histogramTitle = document.getElementById('pnlHistogramTitle');
    if (histogramTitle) {
        histogramTitle.textContent = `PnL Distribution (${toNum(histogramStats.total_trades)} trades)`;
    }

    const binLabels = bins.map((b) => {
        const center = (b.from + b.to) / 2;
        return `$${center.toFixed(0)}`;
    });
    const barColors = bins.map((b) => ((b.from + b.to) / 2) >= 0 ? positive : negative);

    const histogramChartData = {
        labels: binLabels,
        datasets: [
            {
                type: 'bar',
                label: 'Trades',
                data: bins.map((b) => b.count),
                backgroundColor: barColors,
                borderColor: barColors,
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
                order: 2,
            },
            {
                type: 'line',
                label: 'Normal Curve',
                data: normalCurve.map((p) => p.expected_count),
                borderColor: text,
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
                tension: 0.4,
                order: 1,
            },
        ],
    };

    const histogramOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: NON_LIVE_ANIM_MS,
            easing: 'easeOutCubic',
            y: {
                from: (ctx) => {
                    if (ctx.type !== 'data') return undefined;
                    return ctx.chart.scales.y.getPixelForValue(0);
                },
            },
        },
        transitions: {
            active: { animation: { duration: 200 } },
        },
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        layout: {
            padding: { left: 10, right: 18, top: 8, bottom: 18 },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => items[0]?.label || '',
                    label: (ctx) => {
                        if (ctx.datasetIndex === 0) return `Trades: ${ctx.parsed.y}`;
                        return `Expected: ${ctx.parsed.y.toFixed(1)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: text,
                    font: chartFont,
                    maxRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
                grid: { display: false },
            },
            y: {
                ticks: {
                    color: text,
                    font: chartFont,
                    precision: 0,
                },
                grid: {
                    color: 'rgba(125, 138, 159, 0.2)',
                    drawBorder: false,
                },
            },
        },
    };

    if (!charts.pnlHistogram) {
        charts.pnlHistogram = new Chart(document.getElementById('pnlHistogramChart'), {
            type: 'bar',
            data: histogramChartData,
            options: histogramOptions,
        });
    } else {
        const histogramSig = toChartSignature([binLabels, bins.map((b) => b.count), normalCurve.map((p) => p.expected_count), styleSignature]);
        if (shouldUpdateChart('pnlHistogram', histogramSig)) {
            charts.pnlHistogram.data.labels = binLabels;
            charts.pnlHistogram.data.datasets[0].data = bins.map((b) => b.count);
            charts.pnlHistogram.data.datasets[0].backgroundColor = barColors;
            charts.pnlHistogram.data.datasets[0].borderColor = barColors;
            charts.pnlHistogram.data.datasets[1].data = normalCurve.map((p) => p.expected_count);
            charts.pnlHistogram.data.datasets[1].borderColor = text;
            charts.pnlHistogram.options.scales.x.ticks.color = text;
            charts.pnlHistogram.options.scales.x.ticks.font = chartFont;
            charts.pnlHistogram.options.scales.y.ticks.color = text;
            charts.pnlHistogram.options.scales.y.ticks.font = chartFont;
            charts.pnlHistogram.update();
        }
    }
}

function applyCalendarCenterLabelWidth() {
    const monthLabel = document.getElementById('monthCalendarTitle');
    if (!monthLabel) {
        return;
    }

    const computed = window.getComputedStyle(monthLabel);
    const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const padLeft = parseFloat(computed.paddingLeft) || 0;
    const padRight = parseFloat(computed.paddingRight) || 0;

    const measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (!ctx) {
        return;
    }

    ctx.font = font;
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    let maxTextWidth = 0;

    for (let month = 0; month < 12; month += 1) {
        const candidate = formatter.format(new Date(2099, month, 1));
        maxTextWidth = Math.max(maxTextWidth, ctx.measureText(candidate).width);
    }

    const fallbackWidth = 136;
    const fixedWidth = Math.max(fallbackWidth, Math.ceil(maxTextWidth + padLeft + padRight + 2));
    document.documentElement.style.setProperty('--calendar-center-label-width', `${fixedWidth}px`);
}

function renderMonthlyCalendar(monthly) {
    applyCalendarCenterLabelWidth();
    const monthDate = new Date(monthly.year, Math.max(0, monthly.month - 1), 1);
    document.getElementById('monthCalendarTitle').textContent = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const target = document.getElementById('monthCalendar');
    const weekRows = Math.max(5, Math.ceil((toNum(monthly.first_weekday) + (monthly.days?.length || 0)) / 7));
    target.style.setProperty('--month-calendar-week-rows', String(weekRows));
    const compact = window.innerWidth < 1200;
    const tight = window.innerWidth < 940;

    const cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-dow">${day}</div>`);
    for (let i = 0; i < monthly.first_weekday; i += 1) {
        cells.push('<div class="calendar-cell empty"></div>');
    }

    monthly.days.forEach((d) => {
        const canFilter = toNum(d.trades) > 0;
        const isMuted = toNum(d.trades) === 0 && toNum(d.pnl) === 0;
        const pnlText = compact ? `$ ${toNum(d.pnl).toFixed(0)}` : formatMoney(d.pnl);
        const winRateText = Number.isFinite(toNum(d.win_rate_pct, NaN)) ? ` · W ${formatPct(d.win_rate_pct)}` : '';
        const tradesText = tight ? '' : `${d.trades}t${winRateText}`;
        cells.push(`
            <div class="calendar-cell ${canFilter ? 'filterable' : ''} ${isMuted ? 'muted' : ''}" ${canFilter ? `data-day="${d.day}" data-month="${monthly.month}" data-year="${monthly.year}"` : ''}>
                <div class="day">${d.day}</div>
                <div class="calendar-pnl ${pnlClass(d.pnl)}">${pnlText}</div>
                <div class="calendar-trades">${tradesText}</div>
            </div>
        `);
    });

    target.innerHTML = cells.join('');
}

function renderYearlyCalendar(yearly) {
    applyCalendarCenterLabelWidth();
    document.getElementById('yearCalendarTitle').textContent = String(yearly.year);
    const target = document.getElementById('yearCalendar');

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    target.innerHTML = yearly.months.map((m) => {
        const canFilter = toNum(m.trades) > 0;
        const isMuted = toNum(m.trades) === 0 && toNum(m.pnl) === 0;
        const wrText = Number.isFinite(toNum(m.win_rate_pct, NaN)) ? `W ${formatPct(m.win_rate_pct)}` : '';
        return `
        <div class="year-card ${canFilter ? 'filterable' : ''} ${isMuted ? 'muted' : ''}" ${canFilter ? `data-month="${m.month}" data-year="${yearly.year}"` : ''}>
            <div class="month">${monthNames[m.month - 1]}</div>
            <div class="${pnlClass(m.pnl)}">${formatMoney(m.pnl)}</div>
            <div class="year-card__meta">${m.trades}t${wrText ? ' · ' + wrText : ''}</div>
        </div>
    `;
    }).join('');
}

function setLoadState(loading, errorMessage = '') {
    const systemStatus = document.getElementById('systemStatus');
    const systemStatusDot = document.getElementById('systemStatusDot');
    const systemStatusText = document.getElementById('systemStatusText');
    if (!systemStatus || !systemStatusDot || !systemStatusText) {
        return;
    }

    if (state.statusSettleTimer) {
        clearTimeout(state.statusSettleTimer);
        state.statusSettleTimer = null;
    }

    const applyHealthyState = () => {
        systemStatus.classList.remove('status-error');
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--ok-pulse', 'status-dot--error');
        systemStatusDot.classList.add('status-dot--ok');
        systemStatusText.textContent = UI_VERSION;
    };

    if (errorMessage) {
        systemStatus.classList.remove('status-error');
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--ok-pulse', 'status-dot--error');
        systemStatus.classList.add('status-error');
        systemStatusDot.classList.add('status-dot--error');
        systemStatusText.textContent = UI_VERSION;
        return;
    }

    if (loading) {
        state.statusLoadingSince = Date.now();
        systemStatus.classList.remove('status-error');
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--ok-pulse', 'status-dot--error');
        systemStatusDot.classList.add('status-dot--loading');
        systemStatusText.textContent = UI_VERSION;
        return;
    }

    const elapsed = Date.now() - state.statusLoadingSince;
    if (elapsed < MIN_SYNC_HEARTBEAT_MS) {
        state.statusSettleTimer = setTimeout(applyHealthyState, MIN_SYNC_HEARTBEAT_MS - elapsed);
        return;
    }

    applyHealthyState();
}

function renderDashboard(data) {
    state.beTolerance = toNum(data.be_tolerance, 0);
    updateStatusStrip(data.summary);
    updateKpis(data.summary, data.periods, data.trade_metrics, data.filtered_summary);
    renderPeriodStats(data.periods);
    renderTradeMetrics(data.trade_metrics, data.periods);
    updatePositionsTable(data.positions);
    updateExposureTable(data.positions);
    updateTradesTable(getRecentTrades(data));
    updateTradeControls(data);
    updateSymbolPanels(data.symbol_stats);
    updateCharts(data);
    if (data?.calendars?.monthly) {
        renderMonthlyCalendar(data.calendars.monthly);
    }
    if (data?.calendars?.yearly) {
        renderYearlyCalendar(data.calendars.yearly);
    }

    const hasTradeFilter = Boolean(state.activeTradeFilter);
    const monthNeedsReset = hasTradeFilter || state.monthShift !== 0;
    const yearNeedsReset = hasTradeFilter || state.yearShift !== 0;
    const monthResetBtn = document.getElementById('monthResetFilterBtn');
    const yearResetBtn = document.getElementById('yearResetFilterBtn');
    if (monthResetBtn) {
        monthResetBtn.classList.toggle('is-filter-reset-off', !monthNeedsReset);
    }
    if (yearResetBtn) {
        yearResetBtn.classList.toggle('is-filter-reset-off', !yearNeedsReset);
    }

    scheduleContentAdaptiveLayout();
}

function simpleDataFingerprint(data) {
    const s = data.summary || {};
    const p = data.periods?.all_time || {};
    const tm = data.trade_metrics || {};
    return [
        s.equity, s.balance, s.floating_pnl, s.open_positions,
        p.pnl, p.trades_count,
        tm.win_rate_pct, tm.profit_factor,
        (data.positions || []).length,
        (data.recent_trades || []).length,
        (data.trade_pnl_curve || []).length,
    ].join('|');
}

async function loadDashboard() {
    if (state.inflight) {
        state.pendingRefresh = true;
        return;
    }

    state.inflight = true;
    setLoadState(true);

    try {
        await loadAccountsIfNeeded(true);

        const selectedAccount = document.getElementById('accountSelector').value || localStorage.getItem('selectedAccount') || '';
        const data = await fetchAnalytics(selectedAccount);
        state.lastData = data;
        state.lastDataHash = simpleDataFingerprint(data);
        renderDashboard(data);
        updateLastUpdatedLabel(Date.now());
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
    if (state.autoRefreshInterval) return;
    state.autoRefreshInterval = setInterval(loadDashboard, interval);
}

function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
}

function syncAdaptiveRefreshMode() {
    const streamsHealthy = state.liveStreamHealthy && state.historyStreamHealthy;
    if (streamsHealthy) {
        stopAutoRefresh();
    } else {
        startAutoRefresh(DASHBOARD_REFRESH_MS);
    }
}

async function fetchLivePnl() {}

function applyLivePnl(data) {
    if (state.inflight) return;
    const floatingEl = document.getElementById('floatingPnl');
    const equityEl = document.getElementById('equity');
    const floatingMetaEl = document.getElementById('floatingPnlMeta');
    if (!floatingEl) return;
    const floatingPnl = toNum(data.floating_pnl, 0);
    // Keep balance anchored to analytics summary (DB-backed) to avoid connector-timing jumps.
    const balance = toNum(state.lastData?.summary?.balance, toNum(data.balance, 0));
    const rawEquity = toNum(data.equity, NaN);
    const liveEquity = Number.isFinite(rawEquity)
        ? rawEquity
        : toNum(state.lastData?.summary?.equity, balance + floatingPnl);
    const marginUsed = toNum(data.margin_used, toNum(state.lastData?.summary?.margin_used, 0));
    const balanceBase = Math.max(Math.abs(balance), 1);
    const floatingPct = (floatingPnl / balanceBase) * 100;

    if (state.lastData && state.lastData.summary) {
        state.lastData.summary.floating_pnl = floatingPnl;
        state.lastData.summary.equity = liveEquity;
        state.lastData.summary.balance = balance;
        state.lastData.summary.margin_used = marginUsed;
        state.lastData.summary.open_positions = toNum(data.open_positions, state.lastData.summary.open_positions || 0);
        if (Array.isArray(data.positions)) {
            state.lastData.positions = data.positions;
        }
    }

    animateNumericText(floatingEl, floatingPnl, formatMoney, LIVE_ANIM_MS);
    applyPnlClass(floatingEl, floatingPnl);
    if (equityEl) {
        animateNumericText(equityEl, liveEquity, formatMoney, LIVE_ANIM_MS);
        applyPnlClass(equityEl, liveEquity - balance);
    }
    if (floatingMetaEl) {
        animateNumericByKey(floatingMetaEl, 'kpi-meta-floating-pct', floatingPct, formatDeltaPct, LIVE_ANIM_MS);
        floatingMetaEl.className = `label metric-card__meta ${pnlClass(floatingPnl)}`;
    }

    const balanceMetaEl = document.getElementById('balanceMeta');
    if (balanceMetaEl && state.lastData?.summary) {
        if (!balanceMetaEl.querySelector('[data-anim-key]')) {
            balanceMetaEl.innerHTML = '🔒 <span data-anim-key="kpi-meta-allocated"></span> · <span data-anim-key="kpi-meta-alloc-pct"></span>';
        }
        const allocSpan = balanceMetaEl.querySelector('[data-anim-key="kpi-meta-allocated"]');
        const pctSpan = balanceMetaEl.querySelector('[data-anim-key="kpi-meta-alloc-pct"]');
        const marginUsed = toNum(state.lastData.summary.margin_used, 0);
        const bal = toNum(state.lastData.summary.balance, 0);
        const allocPct = bal !== 0 ? (marginUsed / bal) * 100 : 0;
        animateNumericByKey(allocSpan, 'kpi-meta-allocated', marginUsed, formatMoney, LIVE_ANIM_MS);
        animateNumericByKey(pctSpan, 'kpi-meta-alloc-pct', allocPct, v => v.toFixed(1) + '%', LIVE_ANIM_MS);
        balanceMetaEl.className = 'label metric-card__meta';
    }

    if (Array.isArray(data.positions)) {
        updatePositionsTable(data.positions, LIVE_ANIM_MS);
        updateExposureTable(data.positions, LIVE_ANIM_MS);
    }

    updateLastUpdatedLabel(Date.now());
}

/**
 * Opens an SSE connection to /api/account/live-pnl/stream.
 * The server pushes a JSON event every time ingestion updates positions,
 * so no periodic HTTP polling is needed.
 * Automatically reconnects (browser SSE behaviour) on transient failures.
 * Call again whenever the selected account changes.
 */
function startLivePnlPolling() {
    if (state.livePnlSource) {
        state.livePnlSource.close();
        state.livePnlSource = null;
    }
    if (state.livePnlPumpTimer) {
        clearInterval(state.livePnlPumpTimer);
        state.livePnlPumpTimer = null;
    }
    state.livePnlBuffer = [];
    state.liveStreamHealthy = false;
    const gen = ++state.sseGeneration;
    syncAdaptiveRefreshMode();
    const selectedAccount = document.getElementById('accountSelector')?.value || localStorage.getItem('selectedAccount') || '';
    const scope = selectedAccount || 'all';
    const url = `${API_URL}/account/live-pnl/stream?accountId=${encodeURIComponent(scope)}`;
    const es = new EventSource(url);
    es.onopen = () => {
        if (gen !== state.sseGeneration) return;
        state.liveStreamHealthy = true;
        syncAdaptiveRefreshMode();
    };
    es.onmessage = (event) => {
        if (gen !== state.sseGeneration) { es.close(); return; }
        try {
            const payload = JSON.parse(event.data);
            const now = Date.now();
            state.livePnlBuffer.push({ ts: now, payload });
            const cutoff = now - LIVE_STREAM_BUFFER_MS;
            state.livePnlBuffer = state.livePnlBuffer.filter((item) => item.ts >= cutoff);
            const maxBuffered = Math.max(1, Math.floor(LIVE_STREAM_BUFFER_MS / LIVE_STREAM_MIN_EMIT_MS));
            if (state.livePnlBuffer.length > maxBuffered) {
                state.livePnlBuffer = state.livePnlBuffer.slice(state.livePnlBuffer.length - maxBuffered);
            }
        } catch (_) {}
    };
    es.onerror = () => {
        if (gen !== state.sseGeneration) { es.close(); return; }
        state.liveStreamHealthy = false;
        syncAdaptiveRefreshMode();
    };
    state.livePnlSource = es;
    state.livePnlPumpTimer = setInterval(() => {
        if (!state.livePnlBuffer.length) {
            return;
        }
        const latest = state.livePnlBuffer[state.livePnlBuffer.length - 1];
        state.livePnlBuffer = [];
        applyLivePnl(latest.payload);
    }, LIVE_STREAM_MIN_EMIT_MS);
}

function startHistoryPolling() {
    if (state.historySource) {
        state.historySource.close();
        state.historySource = null;
    }
    state.historyStreamHealthy = false;
    const gen = state.sseGeneration;
    syncAdaptiveRefreshMode();
    const selectedAccount = document.getElementById('accountSelector')?.value || localStorage.getItem('selectedAccount') || '';
    const scope = selectedAccount || 'all';
    const url = `${API_URL}/account/history/stream?accountId=${encodeURIComponent(scope)}`;
    const es = new EventSource(url);
    es.onopen = () => {
        if (gen !== state.sseGeneration) return;
        state.historyStreamHealthy = true;
        syncAdaptiveRefreshMode();
    };
    es.onmessage = () => {
        if (gen !== state.sseGeneration) { es.close(); return; }
        loadDashboard();
    };
    es.onerror = () => {
        if (gen !== state.sseGeneration) { es.close(); return; }
        state.historyStreamHealthy = false;
        syncAdaptiveRefreshMode();
    };
    state.historySource = es;
}

document.addEventListener('DOMContentLoaded', () => {
    loadGroupingPreferences();
    applyTheme(getPreferredTheme());
    applyLayout(getPreferredLayout());
    applyBackgroundTheme(getPreferredBackground());
    applyAccentTheme(getPreferredAccent());
    applyFont(getPreferredFont());
    applyFontSize(getPreferredFontSize());
    updateLastUpdatedLabel(0);
    setQuickControlsCollapsed(localStorage.getItem(QUICK_CONTROLS_COLLAPSED_KEY) !== '0');
    setupPwaInstall();
    registerServiceWorker();
    setupEventListeners();
    applyGroupingButtonState();
    loadAccountsIfNeeded(true).catch((error) => {
        console.error('Error loading accounts:', error);
    });
    loadDashboard();
    syncAdaptiveRefreshMode();
    startLivePnlPolling();
    startHistoryPolling();
});


