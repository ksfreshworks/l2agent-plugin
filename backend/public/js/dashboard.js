// L2 Agent Dashboard - JavaScript
// Handles data fetching, rendering, and interactivity

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    currentPage: 'overview',
    data: {
        crashes: [],
        apiErrors: [],
        consoleErrors: [],
        pageErrors: [],
        sessions: {},
        stats: {}
    },
    filters: {
        timeRange: '24h',
        search: '',
        errorType: 'all',
        severity: 'all',
        apiStatus: 'all',
        apiMethod: 'all'
    },
    charts: {
        errorChart: null,
        distributionChart: null
    },
    currentError: null,
    currentApi: null
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    initCharts();
    initSearch();
    initModals();
    checkConnection();
    loadData();
    
    // Auto-refresh every 30 seconds
    setInterval(loadData, 30000);
});

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });
    
    // Update header
    const titles = {
        overview: { title: 'Overview', subtitle: 'Error analytics and crash diagnostics' },
        errors: { title: 'Console Errors', subtitle: 'JavaScript errors and exceptions' },
        api: { title: 'API Failures', subtitle: 'Failed HTTP requests and network errors' },
        crashes: { title: 'Crashes', subtitle: 'Page crash events with full context' },
        sessions: { title: 'Sessions', subtitle: 'User session tracking and correlation' },
        heatmap: { title: 'Error Heatmap', subtitle: 'Error frequency by page and component' }
    };
    
    document.getElementById('page-title').textContent = titles[page]?.title || page;
    document.getElementById('page-subtitle').textContent = titles[page]?.subtitle || '';
    
    state.currentPage = page;
    renderCurrentPage();
}

// ============================================
// DATA FETCHING
// ============================================
async function loadData() {
    try {
        const response = await fetch('/api/dashboard/data');
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const result = await response.json();
        if (result.success) {
            state.data = result.data;
            updateBadges();
            renderCurrentPage();
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        // Try loading from local storage as fallback
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    // Attempt to get data from local storage (for demo purposes)
    const stored = localStorage.getItem('l2agent_dashboard_data');
    if (stored) {
        try {
            state.data = JSON.parse(stored);
            updateBadges();
            renderCurrentPage();
        } catch (e) {
            console.error('Failed to parse stored data:', e);
        }
    }
}

async function refreshData() {
    showToast('Refreshing data...', 'info');
    await loadData();
    showToast('Data refreshed!', 'success');
}

// Load demo data for testing
async function loadDemoData() {
    try {
        showToast('Loading demo data...', 'info');
        const response = await fetch('/api/dashboard/demo', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            showToast('Demo data loaded!', 'success');
            await loadData();
        } else {
            showToast('Failed to load demo data', 'error');
        }
    } catch (error) {
        console.error('Failed to load demo data:', error);
        showToast('Failed to load demo data: ' + error.message, 'error');
    }
}

// Make loadDemoData globally available
window.loadDemoData = loadDemoData;

// ============================================
// CONNECTION CHECK
// ============================================
async function checkConnection() {
    const statusEl = document.getElementById('connection-status');
    const statusText = statusEl.querySelector('.status-text');
    
    try {
        const response = await fetch('/health');
        if (response.ok) {
            statusEl.classList.add('connected');
            statusEl.classList.remove('error');
            statusText.textContent = 'Connected';
        } else {
            throw new Error('Not healthy');
        }
    } catch (error) {
        statusEl.classList.remove('connected');
        statusEl.classList.add('error');
        statusText.textContent = 'Disconnected';
    }
}

// ============================================
// RENDERING
// ============================================
function renderCurrentPage() {
    switch (state.currentPage) {
        case 'overview':
            renderOverview();
            break;
        case 'errors':
            renderErrors();
            break;
        case 'api':
            renderApiErrors();
            break;
        case 'crashes':
            renderCrashes();
            break;
        case 'sessions':
            renderSessions();
            break;
        case 'heatmap':
            renderHeatmap();
            break;
    }
}

function updateBadges() {
    const { crashes, apiErrors, consoleErrors, pageErrors } = state.data;
    
    document.getElementById('error-badge').textContent = 
        (consoleErrors?.length || 0) + (pageErrors?.length || 0);
    document.getElementById('api-badge').textContent = apiErrors?.length || 0;
    document.getElementById('crash-badge').textContent = crashes?.length || 0;
}

// ============================================
// OVERVIEW PAGE
// ============================================
function renderOverview() {
    const { crashes, apiErrors, consoleErrors, pageErrors, sessions } = state.data;
    
    // Update stats
    document.getElementById('stat-crashes').textContent = crashes?.length || 0;
    document.getElementById('stat-errors').textContent = 
        (consoleErrors?.length || 0) + (pageErrors?.length || 0);
    document.getElementById('stat-api').textContent = apiErrors?.length || 0;
    document.getElementById('stat-sessions').textContent = 
        Object.keys(sessions || {}).length;
    
    // Update charts
    updateErrorChart();
    updateDistributionChart();
    
    // Update recent activity
    renderRecentActivity();
}

function updateErrorChart() {
    const ctx = document.getElementById('error-chart');
    if (!ctx) return;
    
    // Get time-based data
    const { crashes, apiErrors, consoleErrors, pageErrors } = state.data;
    const allErrors = [
        ...(consoleErrors || []).map(e => ({ ...e, category: 'errors' })),
        ...(pageErrors || []).map(e => ({ ...e, category: 'errors' })),
        ...(apiErrors || []).map(e => ({ ...e, category: 'api' })),
        ...(crashes || []).map(e => ({ ...e, category: 'crashes' }))
    ];
    
    // Group by hour
    const hourlyData = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = hour.toISOString().slice(0, 13);
        hourlyData[key] = { crashes: 0, errors: 0, api: 0 };
    }
    
    allErrors.forEach(error => {
        const key = new Date(error.timestamp).toISOString().slice(0, 13);
        if (hourlyData[key]) {
            hourlyData[key][error.category]++;
        }
    });
    
    const labels = Object.keys(hourlyData).map(k => 
        new Date(k).toLocaleTimeString([], { hour: '2-digit' })
    );
    
    if (state.charts.errorChart) {
        state.charts.errorChart.destroy();
    }
    
    state.charts.errorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Crashes',
                    data: Object.values(hourlyData).map(d => d.crashes),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Errors',
                    data: Object.values(hourlyData).map(d => d.errors),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'API',
                    data: Object.values(hourlyData).map(d => d.api),
                    borderColor: '#eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#27272a' },
                    ticks: { color: '#71717a' }
                },
                y: {
                    grid: { color: '#27272a' },
                    ticks: { color: '#71717a' },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateDistributionChart() {
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;
    
    const { crashes, apiErrors, consoleErrors, pageErrors } = state.data;
    
    if (state.charts.distributionChart) {
        state.charts.distributionChart.destroy();
    }
    
    state.charts.distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Crashes', 'Console Errors', 'Page Errors', 'API Errors'],
            datasets: [{
                data: [
                    crashes?.length || 0,
                    consoleErrors?.length || 0,
                    pageErrors?.length || 0,
                    apiErrors?.length || 0
                ],
                backgroundColor: [
                    '#ef4444',
                    '#f97316',
                    '#eab308',
                    '#8b5cf6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a1a1aa' }
                }
            },
            cutout: '70%'
        }
    });
}

function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    const { crashes, apiErrors, consoleErrors, pageErrors } = state.data;
    
    // Combine and sort all errors
    const allErrors = [
        ...(consoleErrors || []).map(e => ({ ...e, _type: 'console' })),
        ...(pageErrors || []).map(e => ({ ...e, _type: 'page' })),
        ...(apiErrors || []).map(e => ({ ...e, _type: 'api' })),
        ...(crashes || []).map(e => ({ ...e, _type: 'crash' }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, 10);
    
    if (allErrors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No recent activity</p>
                <small>Errors will appear here when captured by the extension</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allErrors.map(error => {
        const icon = getErrorIcon(error._type);
        const title = getErrorTitle(error);
        const subtitle = error.url || error.pageUrl || '';
        const time = formatTime(error.timestamp);
        
        return `
            <div class="activity-item" onclick="showErrorDetail('${error._type}', '${error.id || error.timestamp}')">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(title)}</div>
                    <div class="activity-subtitle">${escapeHtml(subtitle)}</div>
                </div>
                <div class="activity-time">${time}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// ERRORS PAGE
// ============================================
function renderErrors() {
    const { consoleErrors, pageErrors } = state.data;
    const allErrors = [
        ...(consoleErrors || []),
        ...(pageErrors || [])
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const filtered = filterErrors(allErrors);
    const tbody = document.getElementById('error-table-body');
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <span class="empty-icon">✅</span>
                        <p>No errors found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.slice(0, 50).map((error, idx) => `
        <tr>
            <td>
                <span class="error-type-badge ${getTypeBadgeClass(error.errorType)}">
                    ${error.errorType || 'Error'}
                </span>
            </td>
            <td class="truncate" title="${escapeHtml(error.message)}">${escapeHtml(truncate(error.message, 60))}</td>
            <td class="truncate" title="${escapeHtml(error.url)}">${escapeHtml(truncate(error.url || '', 40))}</td>
            <td>${formatTime(error.timestamp)}</td>
            <td>
                <button class="table-action-btn" onclick="showConsoleErrorDetail(${idx})">
                    View
                </button>
            </td>
        </tr>
    `).join('');
    
    // Store filtered for detail view
    state.filteredErrors = filtered;
}

function filterErrors(errors) {
    let filtered = errors;
    
    // Apply search
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(e => 
            (e.message || '').toLowerCase().includes(search) ||
            (e.url || '').toLowerCase().includes(search) ||
            (e.errorType || '').toLowerCase().includes(search)
        );
    }
    
    // Apply type filter
    if (state.filters.errorType !== 'all') {
        filtered = filtered.filter(e => e.errorType === state.filters.errorType);
    }
    
    return filtered;
}

// ============================================
// API ERRORS PAGE
// ============================================
function renderApiErrors() {
    const { apiErrors } = state.data;
    const filtered = filterApiErrors(apiErrors || []);
    const tbody = document.getElementById('api-table-body');
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <span class="empty-icon">✅</span>
                        <p>No API failures found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.slice(0, 50).map((error, idx) => `
        <tr>
            <td>
                <span class="method-badge ${(error.method || 'GET').toLowerCase()}">
                    ${error.method || 'GET'}
                </span>
            </td>
            <td class="truncate" title="${escapeHtml(error.url)}">${escapeHtml(truncate(error.url || '', 50))}</td>
            <td>
                <span class="status-badge ${getStatusBadgeClass(error.status)}">
                    ${error.status || 0}
                </span>
            </td>
            <td>${error.duration || 0}ms</td>
            <td class="truncate">${error.traceId || 'N/A'}</td>
            <td>${formatTime(error.timestamp)}</td>
            <td>
                <button class="table-action-btn" onclick="showApiErrorDetail(${idx})">
                    View
                </button>
            </td>
        </tr>
    `).join('');
    
    state.filteredApiErrors = filtered;
}

function filterApiErrors(errors) {
    let filtered = errors;
    
    // Apply search
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(e => 
            (e.url || '').toLowerCase().includes(search) ||
            (e.traceId || '').toLowerCase().includes(search)
        );
    }
    
    // Apply status filter
    if (state.filters.apiStatus !== 'all') {
        filtered = filtered.filter(e => {
            const status = e.status || 0;
            if (state.filters.apiStatus === '4xx') return status >= 400 && status < 500;
            if (state.filters.apiStatus === '5xx') return status >= 500;
            if (state.filters.apiStatus === '0') return status === 0;
            return true;
        });
    }
    
    // Apply method filter
    if (state.filters.apiMethod !== 'all') {
        filtered = filtered.filter(e => 
            (e.method || 'GET').toUpperCase() === state.filters.apiMethod
        );
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============================================
// CRASHES PAGE
// ============================================
function renderCrashes() {
    const { crashes } = state.data;
    const container = document.getElementById('crashes-grid');
    
    if (!crashes || crashes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✅</span>
                <p>No crashes detected</p>
                <small>Crashes will appear here when detected by the extension</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = crashes.slice(0, 20).map((crash, idx) => `
        <div class="crash-card">
            <div class="crash-header">
                <span class="crash-icon">💥</span>
                <div class="crash-title">
                    <h4>Crash Detected</h4>
                    <span>${formatTime(crash.timestamp)}</span>
                </div>
            </div>
            <div class="crash-body">
                <p class="crash-reason">${escapeHtml(crash.reason || 'Unknown crash')}</p>
                <div class="crash-stats">
                    <div class="crash-stat">
                        <span>🔴</span>
                        <span>${crash.recentConsoleErrors?.length || 0} errors</span>
                    </div>
                    <div class="crash-stat">
                        <span>🔗</span>
                        <span>${crash.recentApiErrors?.length || 0} API failures</span>
                    </div>
                </div>
                <div class="crash-actions">
                    <button class="btn btn-secondary" onclick="showCrashDetail(${idx})">
                        View Details
                    </button>
                    <button class="btn btn-primary" onclick="analyzeCrash(${idx})">
                        🤖 Analyze
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// SESSIONS PAGE
// ============================================
function renderSessions() {
    const { sessions } = state.data;
    const container = document.getElementById('sessions-list');
    const sessionList = Object.values(sessions || {});
    
    if (sessionList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👤</span>
                <p>No sessions tracked</p>
                <small>Sessions will appear here when users browse with the extension</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sessionList.map(session => `
        <div class="session-card">
            <div class="session-avatar">👤</div>
            <div class="session-info">
                <div class="session-id">${session.id}</div>
                <div class="session-url">${escapeHtml(session.pageUrl || 'Unknown')}</div>
            </div>
            <div class="session-stats">
                <div class="session-stat">
                    <div class="session-stat-value">${session.errorCount || 0}</div>
                    <div class="session-stat-label">Errors</div>
                </div>
                <div class="session-stat">
                    <div class="session-stat-value">${session.apiErrorCount || 0}</div>
                    <div class="session-stat-label">API</div>
                </div>
                <div class="session-stat">
                    <div class="session-stat-value">${session.crashCount || 0}</div>
                    <div class="session-stat-label">Crashes</div>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// HEATMAP PAGE
// ============================================
function renderHeatmap() {
    const { consoleErrors, pageErrors, apiErrors } = state.data;
    const container = document.getElementById('heatmap-grid');
    
    // Group errors by URL path
    const allErrors = [
        ...(consoleErrors || []),
        ...(pageErrors || []),
        ...(apiErrors || [])
    ];
    
    const urlGroups = {};
    allErrors.forEach(error => {
        try {
            const url = new URL(error.url || error.pageUrl || 'http://unknown');
            const path = url.pathname.split('/').slice(0, 3).join('/') || '/';
            if (!urlGroups[path]) {
                urlGroups[path] = { path, count: 0, errors: [] };
            }
            urlGroups[path].count++;
            urlGroups[path].errors.push(error);
        } catch (e) {
            // Invalid URL
        }
    });
    
    const sorted = Object.values(urlGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🗺️</span>
                <p>No data for heatmap</p>
                <small>Error patterns will be visualized here</small>
            </div>
        `;
        return;
    }
    
    const maxCount = Math.max(...sorted.map(g => g.count));
    
    container.innerHTML = sorted.map(group => {
        const intensity = group.count / maxCount;
        const color = getHeatmapColor(intensity);
        
        return `
            <div class="heatmap-cell" style="background: ${color}">
                <div class="heatmap-cell-title">${escapeHtml(group.path)}</div>
                <div class="heatmap-cell-count">${group.count}</div>
            </div>
        `;
    }).join('');
}

function getHeatmapColor(intensity) {
    // Gradient from green to yellow to red
    if (intensity < 0.33) {
        return `rgba(34, 197, 94, ${0.3 + intensity})`;
    } else if (intensity < 0.66) {
        return `rgba(234, 179, 8, ${0.3 + intensity})`;
    } else {
        return `rgba(239, 68, 68, ${0.3 + intensity})`;
    }
}

// ============================================
// FILTERS
// ============================================
function initFilters() {
    document.getElementById('time-range')?.addEventListener('change', (e) => {
        state.filters.timeRange = e.target.value;
        loadData();
    });
    
    document.getElementById('error-type-filter')?.addEventListener('change', (e) => {
        state.filters.errorType = e.target.value;
        renderErrors();
    });
    
    document.getElementById('api-status-filter')?.addEventListener('change', (e) => {
        state.filters.apiStatus = e.target.value;
        renderApiErrors();
    });
    
    document.getElementById('api-method-filter')?.addEventListener('change', (e) => {
        state.filters.apiMethod = e.target.value;
        renderApiErrors();
    });
}

function initSearch() {
    const searchInput = document.getElementById('global-search');
    let debounceTimer;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.filters.search = e.target.value;
            renderCurrentPage();
        }, 300);
    });
}

// ============================================
// CHARTS
// ============================================
function initCharts() {
    // Charts are initialized when Overview page loads
}

// ============================================
// MODALS
// ============================================
function initModals() {
    // Tab switching in API modal
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`)?.classList.add('active');
        });
    });
}

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function showConsoleErrorDetail(idx) {
    const error = state.filteredErrors?.[idx];
    if (!error) return;
    
    state.currentError = error;
    
    document.getElementById('modal-error-type').textContent = error.errorType || 'Error';
    document.getElementById('modal-error-message').textContent = error.message || 'No message';
    document.getElementById('modal-error-stack').textContent = error.stack || 'No stack trace';
    document.getElementById('modal-error-url').textContent = error.url || 'N/A';
    document.getElementById('modal-error-time').textContent = 
        new Date(error.timestamp).toLocaleString();
    document.getElementById('modal-error-file').textContent = 
        error.filename ? `${error.filename}:${error.lineno}:${error.colno}` : 'N/A';
    
    openModal('error-modal');
}

function showApiErrorDetail(idx) {
    const error = state.filteredApiErrors?.[idx];
    if (!error) return;
    
    state.currentApi = error;
    
    document.getElementById('modal-api-method').textContent = error.method || 'GET';
    document.getElementById('modal-api-status').textContent = error.status || 0;
    document.getElementById('modal-api-url').textContent = error.url || '';
    document.getElementById('modal-api-req-headers').textContent = 
        JSON.stringify(error.requestHeaders || {}, null, 2);
    document.getElementById('modal-api-req-body').textContent = 
        formatJson(error.requestBody);
    document.getElementById('modal-api-res-headers').textContent = 
        JSON.stringify(error.responseHeaders || {}, null, 2);
    document.getElementById('modal-api-res-body').textContent = 
        formatJson(error.responseBody);
    document.getElementById('modal-api-duration').textContent = `${error.duration || 0}ms`;
    document.getElementById('modal-api-trace').textContent = error.traceId || 'N/A';
    document.getElementById('modal-api-time').textContent = 
        new Date(error.timestamp).toLocaleString();
    
    openModal('api-modal');
}

function showCrashDetail(idx) {
    const crash = state.data.crashes?.[idx];
    if (!crash) return;
    
    // Show crash in error modal with full context
    state.currentError = crash;
    
    document.getElementById('modal-error-type').textContent = 'Crash';
    document.getElementById('modal-error-message').textContent = crash.reason || 'Unknown crash';
    document.getElementById('modal-error-stack').textContent = 
        crash.primaryError?.stack || crash.recentPageErrors?.[0]?.stack || 'No stack trace';
    document.getElementById('modal-error-url').textContent = crash.pageUrl || crash.url || 'N/A';
    document.getElementById('modal-error-time').textContent = 
        new Date(crash.timestamp).toLocaleString();
    document.getElementById('modal-error-file').textContent = 
        crash.primaryError?.filename || 'N/A';
    
    openModal('error-modal');
}

// ============================================
// LLM ANALYSIS
// ============================================
async function analyzeWithLLM() {
    if (!state.currentError) return;
    
    openModal('llm-modal');
    document.getElementById('llm-modal-body').innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Analyzing error data...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: JSON.stringify(state.currentError),
                context: { source: 'l2-agent-dashboard' },
                action: 'analyze'
            })
        });
        
        const result = await response.json();
        displayLLMResult(result);
    } catch (error) {
        document.getElementById('llm-modal-body').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <p>Analysis failed</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

async function analyzeApiWithLLM() {
    if (!state.currentApi) return;
    
    openModal('llm-modal');
    document.getElementById('llm-modal-body').innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Analyzing API failure...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: JSON.stringify(state.currentApi),
                context: { source: 'l2-agent-dashboard' },
                action: 'analyze'
            })
        });
        
        const result = await response.json();
        displayLLMResult(result);
    } catch (error) {
        document.getElementById('llm-modal-body').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <p>Analysis failed</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

async function analyzeCrash(idx) {
    const crash = state.data.crashes?.[idx];
    if (!crash) return;
    
    openModal('llm-modal');
    document.getElementById('llm-modal-body').innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Analyzing crash data...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: JSON.stringify(crash),
                context: { source: 'l2-agent-dashboard', type: 'crash' },
                action: 'analyze'
            })
        });
        
        const result = await response.json();
        displayLLMResult(result);
    } catch (error) {
        document.getElementById('llm-modal-body').innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <p>Analysis failed</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function displayLLMResult(result) {
    const analysis = result.result?.analysis || result.analysis || result;
    state.currentLLMResult = analysis;
    
    let html = '';
    
    if (analysis.tags) {
        html += `
            <div class="detail-section">
                <h4>Classification</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${analysis.tags.errorType ? `<span class="error-type-badge">${analysis.tags.errorType}</span>` : ''}
                    ${analysis.tags.severity ? `<span class="status-badge">${analysis.tags.severity}</span>` : ''}
                    ${analysis.tags.category ? `<span class="method-badge">${analysis.tags.category}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    if (analysis.rootCause) {
        html += `
            <div class="detail-section">
                <h4>Root Cause</h4>
                <div class="code-block">
                    <strong>${escapeHtml(analysis.rootCause.summary || '')}</strong>
                    <br><br>
                    ${escapeHtml(analysis.rootCause.details || '')}
                </div>
            </div>
        `;
    }
    
    if (analysis.recommendations?.length) {
        html += `
            <div class="detail-section">
                <h4>Recommendations</h4>
                <ul style="margin-left: 20px;">
                    ${analysis.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (!html) {
        html = `<pre class="code-block">${JSON.stringify(analysis, null, 2)}</pre>`;
    }
    
    document.getElementById('llm-modal-body').innerHTML = html;
}

// ============================================
// EXPORT / ACTIONS
// ============================================
async function exportErrors(type) {
    let data;
    let filename;
    
    switch (type) {
        case 'console':
            data = state.filteredErrors || state.data.consoleErrors;
            filename = 'console-errors';
            break;
        case 'api':
            data = state.filteredApiErrors || state.data.apiErrors;
            filename = 'api-errors';
            break;
        default:
            data = state.data;
            filename = 'all-errors';
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `l2agent-${filename}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Export downloaded!', 'success');
}

async function clearErrors(type) {
    if (!confirm('Are you sure you want to clear all errors?')) return;
    
    try {
        await fetch('/api/dashboard/clear', { method: 'POST' });
        await loadData();
        showToast('Errors cleared!', 'success');
    } catch (error) {
        showToast('Failed to clear errors', 'error');
    }
}

function copyErrorDetails() {
    if (!state.currentError) return;
    
    const text = JSON.stringify(state.currentError, null, 2);
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

function copyApiDetails() {
    if (!state.currentApi) return;
    
    const text = JSON.stringify(state.currentApi, null, 2);
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

function copyLLMAnalysis() {
    if (!state.currentLLMResult) return;
    
    const text = JSON.stringify(state.currentLLMResult, null, 2);
    navigator.clipboard.writeText(text)
        .then(() => showToast('Analysis copied!', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
}

function downloadLLMAnalysis() {
    if (!state.currentLLMResult) return;
    
    const blob = new Blob([JSON.stringify(state.currentLLMResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `l2agent-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Analysis downloaded!', 'success');
}

// ============================================
// UTILITIES
// ============================================
function getErrorIcon(type) {
    const icons = {
        crash: '💥',
        api: '🔗',
        console: '🔴',
        page: '⚠️'
    };
    return icons[type] || '⚠️';
}

function getErrorTitle(error) {
    if (error._type === 'crash') return error.reason || 'Crash detected';
    if (error._type === 'api') return `${error.method || 'GET'} ${error.status || 0}`;
    return error.errorType || error.type || 'Error';
}

function getTypeBadgeClass(type) {
    if (!type) return '';
    const t = type.toLowerCase();
    if (t.includes('type')) return 'type-error';
    if (t.includes('reference')) return 'reference-error';
    return 'console-error';
}

function getStatusBadgeClass(status) {
    if (!status || status === 0) return 'status-0';
    if (status >= 500) return 'status-5xx';
    if (status >= 400) return 'status-4xx';
    return '';
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

function formatJson(str) {
    if (!str) return 'No data';
    try {
        return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
        return str;
    }
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global function for error detail view
window.showErrorDetail = function(type, id) {
    // Find the error and show details
    console.log('Show detail:', type, id);
};

