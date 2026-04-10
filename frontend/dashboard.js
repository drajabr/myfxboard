const API_URL = '/api';
let equityCurveChart, winLossChart, dailyPnlChart, symbolExposureChart;
let autoRefreshInterval;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setupEventListeners();
    startAutoRefresh(3000);
});

function setupEventListeners() {
    document.getElementById('unlockBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
    });

    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });

    document.getElementById('accountSelector').addEventListener('change', (e) => {
        localStorage.setItem('selectedAccount', e.target.value);
        loadDashboard();
    });
}

async function loadDashboard() {
    try {
        const selectedAccount = localStorage.getItem('selectedAccount') || '';
        
        // Load accounts list
        const accountsRes = await fetch(`${API_URL}/accounts`);
        const accounts = await accountsRes.json();
        
        const selector = document.getElementById('accountSelector');
        const currentValue = selector.value;
        selector.innerHTML = '<option value="">All Accounts</option>';
        
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.account_id;
            option.textContent = acc.account_name || acc.account_id;
            selector.appendChild(option);
        });
        
        selector.value = currentValue || '';

        // Load dashboard data
        if (selectedAccount) {
            const dashRes = await fetch(`${API_URL}/account/${selectedAccount}/dashboard`);
            const dashboard = await dashRes.json();
            updateDashboard(dashboard);
        } else if (accounts.length > 0) {
            // Load all accounts aggregated
            let aggregated = {
                summary: {
                    equity: 0,
                    balance: 0,
                    free_margin: 0,
                    used_margin: 0,
                    current_pnl: 0,
                    current_return_pct: 0,
                },
                positions: [],
                todays_stats: {
                    trades_count: 0,
                    wins: 0,
                    losses: 0,
                    win_rate_pct: 0,
                    daily_pnl: 0,
                },
            };

            for (const acc of accounts) {
                const dashRes = await fetch(`${API_URL}/account/${acc.account_id}/dashboard`);
                const dashboard = await dashRes.json();
                
                aggregated.summary.equity += dashboard.summary.equity;
                aggregated.summary.balance += dashboard.summary.balance;
                aggregated.summary.current_pnl += dashboard.summary.current_pnl;
                aggregated.positions.push(...dashboard.positions);
                aggregated.todays_stats.trades_count += dashboard.todays_stats.trades_count;
                aggregated.todays_stats.wins += dashboard.todays_stats.wins;
                aggregated.todays_stats.losses += dashboard.todays_stats.losses;
                aggregated.todays_stats.daily_pnl += dashboard.todays_stats.daily_pnl;
            }

            aggregated.todays_stats.win_rate_pct = aggregated.todays_stats.trades_count > 0
                ? (aggregated.todays_stats.wins / aggregated.todays_stats.trades_count) * 100
                : 0;

            updateDashboard(aggregated);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboard(data) {
    // Update KPI cards
    document.getElementById('equity').textContent = `$ ${data.summary.equity.toFixed(2)}`;
    document.getElementById('floatingPnl').textContent = `$ ${data.summary.current_pnl.toFixed(2)}`;
    document.getElementById('dailyPnl').textContent = `$ ${data.todays_stats.daily_pnl.toFixed(2)}`;
    document.getElementById('winRate').textContent = `${data.todays_stats.win_rate_pct.toFixed(1)}%`;
    document.getElementById('marginLevel').textContent = data.summary.equity > 0
        ? `${((data.summary.free_margin / data.summary.equity) * 100).toFixed(1)}%`
        : '0%';

    // Update tables
    updatePositionsTable(data.positions);
    updateTradesTable(data.positions);

    // Update charts
    updateCharts(data);
}

function updatePositionsTable(positions) {
    const tbody = document.getElementById('positionsTable');
    if (positions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No open positions</td></tr>';
        return;
    }

    tbody.innerHTML = positions.map(pos => `
        <tr>
            <td>${pos.symbol}</td>
            <td>${pos.size.toFixed(2)}</td>
            <td>${pos.entry_price.toFixed(5)}</td>
            <td>${pos.current_price?.toFixed(5) || '-'}</td>
            <td style="color: ${pos.unrealized_pnl >= 0 ? 'green' : 'red'}">
                $ ${pos.unrealized_pnl?.toFixed(2) || '0.00'}
            </td>
            <td>${pos.avg_sl?.toFixed(5) || '-'}</td>
            <td>${pos.avg_tp?.toFixed(5) || '-'}</td>
        </tr>
    `).join('');
}

function updateTradesTable(positions) {
    // Placeholder - would load from /api/account/:id/trades
    const tbody = document.getElementById('tradesTable');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading trades...</td></tr>';
}

function updateCharts(data) {
    // Initialize Chart.js charts
    // TODO: Fetch chart data from API endpoints and render
    console.log('Updating charts...', data);
}

function startAutoRefresh(interval) {
    autoRefreshInterval = setInterval(loadDashboard, interval);
}

async function unlockSettings() {
    const token = document.getElementById('masterToken').value;
    if (!token) return;

    try {
        document.getElementById('settingsForm').classList.remove('hidden');
    } catch (error) {
        alert('Invalid token');
    }
}

async function saveSettings() {
    const theme = document.getElementById('theme').value;
    const refreshInterval = document.getElementById('refreshInterval').value;
    
    // TODO: Send to API
    console.log('Saving settings:', { theme, refreshInterval });
    alert('Settings saved!');
    document.getElementById('settingsModal').classList.add('hidden');
}
