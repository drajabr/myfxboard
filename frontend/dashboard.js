const API_URL = '/api';
const THEME_KEY = 'themePreference';
const ACCENT_KEY = 'accentPreference';
const BACKGROUND_KEY = 'backgroundPreference';
const FONT_KEY = 'fontPreference';
const FONT_SIZE_KEY = 'fontSizePreference';
const QUICK_CONTROLS_COLLAPSED_KEY = 'quickControlsCollapsed';
const LAYOUT_KEY = 'layoutPreference';
const DASHBOARD_REFRESH_MS = 5000;
const ACCOUNTS_REFRESH_MS = 60000;
const LAYOUT_MODES = ['comfy', 'compact', 'dense'];
const MAX_PNL_CURVE_POINTS = 180;
const LAYOUT_BUTTON_LABELS = {
    comfy: 'C',
    compact: 'P',
    dense: 'D',
};
const LAYOUT_NAME_LABELS = {
    comfy: 'Comfy',
    compact: 'Compact',
    dense: 'Dense',
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
    { key: 'manrope', label: 'M', fontFamily: "'Manrope', 'Segoe UI', Tahoma, sans-serif" },
    { key: 'sora', label: 'R', fontFamily: "'Sora', 'Segoe UI', Tahoma, sans-serif" },
    { key: 'jetbrains', label: 'J', fontFamily: "'JetBrains Mono', 'Consolas', monospace" },
    { key: 'bahnschrift', label: 'B', fontFamily: "'Bahnschrift', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
    { key: 'sans', label: 'S', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
    { key: 'arial', label: 'A', fontFamily: "Arial, 'Segoe UI', Tahoma, sans-serif" },
    { key: 'verdana', label: 'V', fontFamily: "Verdana, 'Segoe UI', Tahoma, sans-serif" },
    { key: 'courier', label: 'C', fontFamily: "'Courier New', Courier, monospace" },
    { key: 'consolas', label: 'N', fontFamily: "Consolas, 'Courier New', monospace" },
    { key: 'georgia', label: 'G', fontFamily: "Georgia, 'Times New Roman', serif" },
    { key: 'times', label: 'T', fontFamily: "'Times New Roman', Times, serif" },
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
    monthShift: 0,
    yearShift: 0,
    tradesLimit: 10,
    activeTradeFilter: null,
    exposureSort: { key: 'size', direction: 'desc' },
    tradesSort: { key: 'exit_time_ms', direction: 'desc' },
    accounts: [],
    accountsFetchedAt: 0,
    inflight: false,
    pendingRefresh: false,
    lastData: null,
    statusLoadingSince: 0,
    statusSettleTimer: null,
};

const MIN_SYNC_HEARTBEAT_MS = 700;

const charts = {
    pnlCurve: null,
    dailyPnl: null,
    pnlByDayOfWeek: null,
    pnlByHourOfDay: null,
    durationWinRate: null,
    pnlHistogram: null,
};

const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
let deferredInstallPrompt = null;

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
    return LAYOUT_MODES.includes(saved) ? saved : 'comfy';
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
    if (!controls || !toggleBtn) {
        return;
    }
    controls.classList.toggle('is-collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '⚙' : '✕';
    toggleBtn.title = collapsed ? 'Show style controls' : 'Hide style controls';
    toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
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

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.value = theme;
    }
    applyBackgroundTheme(getPreferredBackground());
    applyAccentTheme(getPreferredAccent());
}

function applyLayout(layoutMode) {
    const mode = LAYOUT_MODES.includes(layoutMode) ? layoutMode : 'comfy';
    document.body.setAttribute('data-layout', mode);
    const layoutBtn = document.getElementById('layoutCycleBtn');
    const layoutModeLabel = document.getElementById('layoutModeLabel');
    if (layoutBtn) {
        layoutBtn.textContent = LAYOUT_BUTTON_LABELS[mode] || 'C';
        layoutBtn.title = `Layout: ${mode}`;
        layoutBtn.setAttribute('aria-label', `Switch layout (current: ${mode})`);
    }
    if (layoutModeLabel) {
        layoutModeLabel.textContent = LAYOUT_NAME_LABELS[mode] || 'Comfy';
    }
}

function setLayout(layoutMode) {
    const mode = LAYOUT_MODES.includes(layoutMode) ? layoutMode : 'comfy';
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
    const current = getPreferredLayout();
    const currentIndex = LAYOUT_MODES.indexOf(current);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % LAYOUT_MODES.length : 0;
    setLayout(LAYOUT_MODES[nextIndex]);
}

function onLayoutCycleClick(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    cycleLayoutMode();
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
    document.getElementById('backgroundCycleBtn').addEventListener('click', cycleBackgroundTheme);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('accentCycleBtn').addEventListener('click', cycleAccentTheme);
    document.getElementById('fontCycleBtn').addEventListener('click', cycleFontPreset);
    document.getElementById('fontSizeCycleBtn').addEventListener('click', cycleFontSizePreset);
    document.getElementById('uiControlsToggleBtn').addEventListener('click', toggleQuickControls);

    const layoutCycleBtn = document.getElementById('layoutCycleBtn');
    if (layoutCycleBtn) {
        layoutCycleBtn.addEventListener('click', onLayoutCycleClick);
    }

    const layoutModeLabel = document.getElementById('layoutModeLabel');
    if (layoutModeLabel) {
        layoutModeLabel.addEventListener('click', onLayoutCycleClick);
        layoutModeLabel.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                onLayoutCycleClick(event);
            }
        });
    }

    const refreshNowBtn = document.getElementById('refreshNowBtn');
    if (refreshNowBtn) {
        refreshNowBtn.addEventListener('click', () => {
            loadDashboard();
        });
    }

    document.addEventListener('click', (event) => {
        const cycleTarget = event.target.closest('#layoutCycleBtn, #layoutModeLabel');
        if (cycleTarget) {
            onLayoutCycleClick(event);
            return;
        }
        const wrap = document.querySelector('.ui-controls-wrap');
        const controls = document.getElementById('uiQuickControls');
        if (!wrap || !controls || wrap.contains(event.target)) {
            return;
        }
        if (!controls.classList.contains('is-collapsed')) {
            localStorage.setItem(QUICK_CONTROLS_COLLAPSED_KEY, '1');
            setQuickControlsCollapsed(true);
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
    });

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
    const systemStatusText = document.getElementById('systemStatusText');
    if (!systemStatusText) {
        return;
    }
    if (String(systemStatusText.textContent || '').startsWith('Error:')) {
        return;
    }
    systemStatusText.textContent = 'Healthy';
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
    const isDense = getPreferredLayout() === 'dense';
    const labels = [
        ['today', 'Today'],
        ['last7d', 'Last 7 Days'],
        ['last30d', 'Last 30 Days'],
        ['ytd', 'YTD'],
        ['all_time', 'All Time'],
    ];

    if (isDense) {
        grid.classList.add('metric-grid--dense-table');
        grid.innerHTML = `
            <table class="data-table metric-table-dense">
                <thead>
                    <tr>
                        <th>Window</th>
                        <th>PnL</th>
                        <th>Trades</th>
                        <th>Win Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${labels.map(([key, title]) => {
                        const p = periods[key];
                        return `
                            <tr>
                                <td>${title}</td>
                                <td class="${pnlClass(p.pnl)}">${formatMoney(p.pnl)}</td>
                                <td>${toNum(p.trades_count)}</td>
                                <td>${formatPct(p.win_rate_pct)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        return;
    }

    grid.classList.remove('metric-grid--dense-table');

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
    const isDense = getPreferredLayout() === 'dense';
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

    if (isDense) {
        grid.classList.add('metric-grid--dense-table');
        grid.innerHTML = `
            <table class="data-table metric-table-dense">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${cards.map(([label, value, pnl]) => `
                        <tr>
                            <td>${label}</td>
                            <td class="${label.includes('Hold') || label.includes('Rate') ? '' : pnlClass(pnl)}">${value}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return;
    }

    grid.classList.remove('metric-grid--dense-table');

    grid.innerHTML = cards.map(([label, value, pnl]) => `
        <div class="metric-card">
            <div class="label">${label}</div>
            <div class="value ${label.includes('Hold') || label.includes('Rate') ? '' : pnlClass(pnl)}">${value}</div>
        </div>
    `).join('');
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

    const rows = [
        ['Accounts', String(toNum(summary.accounts_count))],
        ['Open Positions', String(toNum(summary.open_positions))],
        ['Equity', formatMoney(summary.equity)],
        ['Balance', formatMoney(summary.balance)],
        ['Floating PnL', formatMoney(summary.floating_pnl)],
        ['All Time PnL', formatMoney(allTime.pnl)],
        ['All Time Trades', String(toNum(allTime.trades_count))],
        ['All Time Win Rate', formatPct(allTime.win_rate_pct)],
        ['Expectancy', formatMoney(metrics.expectancy)],
        ['Profit Factor', Number(toNum(metrics.profit_factor)).toFixed(2)],
        ['Filtered Wins/Losses/BE', `${toNum(distribution.wins)} / ${toNum(distribution.losses)} / ${toNum(distribution.breakeven || distribution.neutral)}`],
        ['Directional Mix L/S/U', `${toNum(directions.longs)} / ${toNum(directions.shorts)} / ${toNum(directions.unknown)}`],
        ['PnL Dist Mean / StdDev', `${formatSignedRounded(histogramStats.mean)} / ${toNum(histogramStats.std_dev).toFixed(1)}`],
        ['Histogram Trades', String(toNum(histogramStats.total_trades))],
    ];

    tbody.innerHTML = rows.map(([label, value]) => `
        <tr>
            <td>${label}</td>
            <td>${value}</td>
        </tr>
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
    const rows = Array.isArray(trades) ? [...trades] : [];

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No trades</td></tr>';
        return;
    }

    rows.sort((a, b) => {
        const key = state.tradesSort.key;
        let cmp = 0;

        if (key === 'account_id' || key === 'symbol' || key === 'result') {
            cmp = String(a[key] || '').localeCompare(String(b[key] || ''));
        } else {
            cmp = toNum(a[key]) - toNum(b[key]);
        }

        return state.tradesSort.direction === 'asc' ? cmp : -cmp;
    });

    tbody.innerHTML = rows.map((trade) => {
        const openTime = formatDateTimeMs(trade.entry_time_ms);
        const closeTime = formatDateTimeMs(trade.exit_time_ms);
        const accountLabel = trade.account_id ? String(trade.account_id) : '-';
        const duration = durationLabel(trade.duration_sec);
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
            <td>${duration}</td>
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

function getChartFontSpec() {
    const rootStyles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    const family = bodyStyles.getPropertyValue('font-family').trim() || 'Segoe UI, sans-serif';
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

function buildBarChartOptions(text, labelCount = 0) {
    const chartFont = getChartFontSpec();
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { left: 10, right: 18, top: 8, bottom: 18 },
        },
        plugins: {
            legend: { labels: { color: text, font: chartFont } },
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

    allText.textContent = `${total} total`;
    winsText.textContent = `W ${wins} (${winsPct.toFixed(1)}%)`;
    lossesText.textContent = `L ${losses} (${lossesPct.toFixed(1)}%)`;
    neutralText.textContent = `BE ${neutralCount} (${neutralPct.toFixed(1)}%)`;

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

    shortWinsSegment.style.width = `${shortWinsPct}%`;
    shortLossesSegment.style.width = `${shortLossesPct}%`;
    shortNeutralSegment.style.width = `${shortNeutralPct}%`;

    longsText.textContent = `${longTotal} total`;
    longWinsText.textContent = `W ${longWins} (${longWinsPct.toFixed(1)}%)`;
    longLossesText.textContent = `L ${longLosses} (${longLossesPct.toFixed(1)}%)`;
    longNeutralText.textContent = `BE ${longNeutral} (${longNeutralPct.toFixed(1)}%)`;

    shortsText.textContent = `${shortTotal} total`;
    shortWinsText.textContent = `W ${shortWins} (${shortWinsPct.toFixed(1)}%)`;
    shortLossesText.textContent = `L ${shortLosses} (${shortLossesPct.toFixed(1)}%)`;
    shortNeutralText.textContent = `BE ${shortNeutral} (${shortNeutralPct.toFixed(1)}%)`;
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

    const tradePnlCurveRows = Array.isArray(data.trade_pnl_curve) ? data.trade_pnl_curve : [];
    const floatingPnl = toNum(data.summary?.floating_pnl);
    const fallbackCurve = Array.from({ length: 30 }, (_, idx) => {
        const ts = new Date(Date.now() - ((29 - idx) * 24 * 60 * 60 * 1000)).setHours(0, 0, 0, 0);
        return { ts, cumulative_pnl: 0 };
    });

    const baseCurveRows = tradePnlCurveRows.length > 0 ? tradePnlCurveRows : fallbackCurve;
    const visibleBaseCurveRows = baseCurveRows.slice(-MAX_PNL_CURVE_POINTS);
    const mainCurveRows = visibleBaseCurveRows.slice();
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
        pnlCurveTitle.textContent = `PnL Curve (Latest ${MAX_PNL_CURVE_POINTS} Points, Last Includes Floating PnL)`;
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
        charts.pnlCurve.update('none');
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
        charts.dailyPnl.data.labels = dailyLabels;
        charts.dailyPnl.data.datasets[0].data = dailyValues;
        charts.dailyPnl.data.datasets[0].backgroundColor = dailyValues.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.dailyPnl.options.plugins.legend.labels.color = text;
        charts.dailyPnl.options.plugins.legend.labels.font = chartFont;
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
        charts.pnlByDayOfWeek.data.datasets[0].data = dayOfWeekPnL;
        charts.pnlByDayOfWeek.data.datasets[0].backgroundColor = dayOfWeekPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.pnlByDayOfWeek.options.plugins.legend.labels.color = text;
        charts.pnlByDayOfWeek.options.plugins.legend.labels.font = chartFont;
        charts.pnlByDayOfWeek.options.scales.x.ticks.color = text;
        charts.pnlByDayOfWeek.options.scales.x.ticks.font = chartFont;
        charts.pnlByDayOfWeek.options.scales.y.ticks.color = text;
        charts.pnlByDayOfWeek.options.scales.y.ticks.font = chartFont;
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
            options: buildBarChartOptions(text, hourOfDayLabels.length),
        });
    } else {
        charts.pnlByHourOfDay.data.datasets[0].data = hourOfDayPnL;
        charts.pnlByHourOfDay.data.datasets[0].backgroundColor = hourOfDayPnL.map((v) => v > 0 ? positive : v < 0 ? negative : neutral);
        charts.pnlByHourOfDay.options.plugins.legend.labels.color = text;
        charts.pnlByHourOfDay.options.plugins.legend.labels.font = chartFont;
        charts.pnlByHourOfDay.options.scales.x.ticks.color = text;
        charts.pnlByHourOfDay.options.scales.x.ticks.font = chartFont;
        charts.pnlByHourOfDay.options.scales.y.ticks.color = text;
        charts.pnlByHourOfDay.options.scales.y.ticks.font = chartFont;
        charts.pnlByHourOfDay.update();
    }

    const durationRows = Array.isArray(data.win_rate_by_trade_duration) ? data.win_rate_by_trade_duration : [];
    const durationLabels = durationRows.map((row) => String(row.label || ''));
    const durationWinRates = durationRows.map((row) => toNum(row.win_rate_pct));
    const durationTrades = durationRows.map((row) => toNum(row.trades));
    const durationTitle = document.getElementById('durationWinRateTitle');
    if (durationTitle) {
        durationTitle.textContent = state.activeTradeFilter
            ? `Win Rate by Trade Duration (${state.activeTradeFilter.label})`
            : 'Win Rate by Trade Duration (All Trades)';
    }

    const durationChartData = {
        labels: durationLabels,
        datasets: [
            {
                type: 'bar',
                label: 'Win Rate %',
                data: durationWinRates,
                yAxisID: 'y',
                borderRadius: 8,
                borderSkipped: false,
                backgroundColor: durationWinRates.map((v) => `rgba(${accentRgb}, ${Math.min(0.92, 0.3 + (v / 130))})`),
                borderColor: accent,
                borderWidth: 1,
            },
            {
                type: 'line',
                label: 'Trades',
                data: durationTrades,
                yAxisID: 'yTrades',
                borderColor: text,
                backgroundColor: text,
                pointRadius: 2.4,
                tension: 0.25,
            },
        ],
    };

    const durationOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { left: 10, right: 18, top: 8, bottom: 18 },
        },
        plugins: {
            legend: { labels: { color: text, font: chartFont } },
        },
        scales: {
            x: {
                ticks: { color: text, font: chartFont },
                grid: { display: false },
            },
            y: {
                position: 'left',
                min: 0,
                max: 100,
                ticks: {
                    color: text,
                    font: chartFont,
                    callback: (v) => `${v}%`,
                },
                grid: {
                    color: 'rgba(125, 138, 159, 0.2)',
                    drawBorder: false,
                },
            },
            yTrades: {
                position: 'right',
                beginAtZero: true,
                ticks: { color: text, font: chartFont },
                grid: { drawOnChartArea: false },
            },
        },
    };

    if (!charts.durationWinRate) {
        charts.durationWinRate = new Chart(document.getElementById('durationWinRateChart'), {
            type: 'bar',
            data: durationChartData,
            options: durationOptions,
        });
    } else {
        charts.durationWinRate.data = durationChartData;
        charts.durationWinRate.options = durationOptions;
        charts.durationWinRate.update();
    }

    const histogramBins = Array.isArray(data.pnl_histogram?.bins) ? data.pnl_histogram.bins : [];
    const histogramCurve = Array.isArray(data.pnl_histogram?.normal_curve) ? data.pnl_histogram.normal_curve : [];
    const histogramLabels = histogramBins.map((bin) => `${formatSignedRounded(bin.from)}..${formatSignedRounded(bin.to)}`);
    const histogramCounts = histogramBins.map((bin) => toNum(bin.count));
    const curveCounts = histogramCurve.map((point) => toNum(point.expected_count));
    const histogramTitle = document.getElementById('pnlHistogramTitle');
    const histogramStats = data.pnl_histogram?.stats || {};
    if (histogramTitle) {
        histogramTitle.textContent = `PnL Distribution (μ ${formatSignedRounded(histogramStats.mean)}, σ ${toNum(histogramStats.std_dev).toFixed(1)})`;
    }

    const histogramChartData = {
        labels: histogramLabels,
        datasets: [
            {
                type: 'bar',
                label: 'Trades',
                data: histogramCounts,
                borderRadius: 6,
                borderSkipped: false,
                backgroundColor: histogramBins.map((bin) => {
                    const center = (toNum(bin.from) + toNum(bin.to)) / 2;
                    return center >= 0 ? `rgba(${accentRgb}, 0.68)` : 'rgba(224, 72, 72, 0.6)';
                }),
            },
            {
                type: 'line',
                label: 'Normal Curve',
                data: curveCounts,
                borderColor: text,
                backgroundColor: text,
                pointRadius: 0,
                borderWidth: 2,
                tension: 0.35,
            },
        ],
    };

    const histogramOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { left: 10, right: 18, top: 8, bottom: 18 },
        },
        plugins: {
            legend: { labels: { color: text, font: chartFont } },
        },
        scales: {
            x: {
                ticks: {
                    color: text,
                    font: chartFont,
                    autoSkip: true,
                    maxTicksLimit: maxTicksForCount(histogramLabels.length),
                    maxRotation: 0,
                    minRotation: 0,
                },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                ticks: { color: text, font: chartFont },
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
        charts.pnlHistogram.data = histogramChartData;
        charts.pnlHistogram.options = histogramOptions;
        charts.pnlHistogram.update();
    }
}

function renderMonthlyCalendar(monthly) {
    document.getElementById('monthCalendarTitle').textContent = monthly.title;
    const target = document.getElementById('monthCalendar');

    const cells = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-dow">${day}</div>`);
    for (let i = 0; i < monthly.first_weekday; i += 1) {
        cells.push('<div class="calendar-cell empty"></div>');
    }

    monthly.days.forEach((d) => {
        const canFilter = toNum(d.trades) > 0;
        const isMuted = toNum(d.trades) === 0 && toNum(d.pnl) === 0;
        cells.push(`
            <div class="calendar-cell ${canFilter ? 'filterable' : ''} ${isMuted ? 'muted' : ''}" ${canFilter ? `data-day="${d.day}" data-month="${monthly.month}" data-year="${monthly.year}"` : ''}>
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
    target.innerHTML = yearly.months.map((m) => {
        const canFilter = toNum(m.trades) > 0;
        const isMuted = toNum(m.trades) === 0 && toNum(m.pnl) === 0;
        return `
        <div class="year-card ${canFilter ? 'filterable' : ''} ${isMuted ? 'muted' : ''}" ${canFilter ? `data-month="${m.month}" data-year="${yearly.year}"` : ''}>
            <div class="month">${monthNames[m.month - 1]}</div>
            <div class="${pnlClass(m.pnl)}">${formatMoney(m.pnl)}</div>
            <div>${m.trades} trades</div>
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
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--error');
        systemStatusDot.classList.add('status-dot--ok');
        systemStatusText.textContent = 'Healthy';
    };

    if (errorMessage) {
        systemStatus.classList.remove('status-error');
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--error');
        systemStatus.classList.add('status-error');
        systemStatusDot.classList.add('status-dot--error');
        systemStatusText.textContent = `Error: ${errorMessage}`;
        return;
    }

    if (loading) {
        state.statusLoadingSince = Date.now();
        systemStatus.classList.remove('status-error');
        systemStatusDot.classList.remove('status-dot--idle', 'status-dot--loading', 'status-dot--ok', 'status-dot--error');
        systemStatusDot.classList.add('status-dot--loading');
        systemStatusText.textContent = 'Healthy';
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
    updateStatusStrip(data.summary);
    updateKpis(data.summary, data.periods, data.trade_metrics, data.filtered_summary);
    renderPeriodStats(data.periods);
    renderTradeMetrics(data.trade_metrics);
    renderDenseOverview(data);
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
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
    }
    state.autoRefreshInterval = setInterval(loadDashboard, interval);
}

document.addEventListener('DOMContentLoaded', () => {
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
    loadAccountsIfNeeded(true).catch((error) => {
        console.error('Error loading accounts:', error);
    });
    loadDashboard();
    startAutoRefresh(DASHBOARD_REFRESH_MS);
});


