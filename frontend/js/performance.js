const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';
function getToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || localStorage.getItem('token');
}

function getStoredUser() {
    try {
        const data = JSON.parse(localStorage.getItem('user'));
        return data?.user || data || null;
    } catch { return null; }
}

function getSport() {
    const user = getStoredUser();
    return user?.sport || 'cricket';
}

// ── Sport-based metrics ───────────────────────────────────────────────────────
const SPORT_METRICS = {
    cricket: [
        { key: 'Batting Strike Rate', benchmark: 143 },
        { key: 'Bowling Speed (km/h)', benchmark: 130 },
        { key: 'Fielding Accuracy (%)', benchmark: 80 },
        { key: 'Bowling Economy', benchmark: 6.5 },
        { key: 'Batting Average', benchmark: 40 },
        { key: 'Catches per Session', benchmark: 4 },
    ],
    tennis: [
        { key: 'Serve Speed (km/h)', benchmark: 180 },
        { key: 'First Serve %', benchmark: 65 },
        { key: 'Rally Win %', benchmark: 55 },
        { key: 'Ace Count', benchmark: 5 },
        { key: 'Double Fault %', benchmark: 5 },
        { key: 'Break Points Won %', benchmark: 40 },
    ],
    kabaddi: [
        { key: 'Raid Points', benchmark: 6 },
        { key: 'Tackle Points', benchmark: 4 },
        { key: 'Super Raids', benchmark: 2 },
        { key: 'Bonus Points', benchmark: 3 },
        { key: 'Do-or-Die Raid Success %', benchmark: 60 },
        { key: 'Tackle Success %', benchmark: 55 },
    ],
};

function getMockData() {
    const sport = getSport();
    const metrics = SPORT_METRICS[sport] || SPORT_METRICS.cricket;
    const mock = {};
    const baseSets = [
        [110, 118, 132, 128, 148, 162],
        [118, 122, 125, 121, 128, 132],
        [72, 75, 78, 74, 80, 85],
        [7.2, 6.8, 6.5, 7.0, 6.2, 5.9],
        [32, 35, 38, 36, 42, 48],
        [2, 3, 2, 4, 3, 5],
    ];
    metrics.forEach((m, i) => {
        mock[m.key] = { data: baseSets[i] || baseSets[0], benchmark: m.benchmark };
    });
    return mock;
}

function populateSportMetrics() {
    const sport = getSport();
    const metrics = SPORT_METRICS[sport] || SPORT_METRICS.cricket;
    const group = document.getElementById('sportMetricsGroup');
    if (!group) return;
    group.innerHTML = metrics.map(m =>
        `<option value="mock:${m.key}">${m.key}</option>`
    ).join('');
}

let performanceChart = null;
let performanceBarChart = null;
let currentZoom = 100;
let currentAthletes = [];
let currentGranularity = 'monthly';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

async function loadAthletes() {
    const token = getToken();
    const user = getStoredUser();
    const select = document.getElementById('athleteSelect');
    const athleteGroup = document.getElementById('athleteGroup');

    if (user?.role === 'athlete') {
        if (athleteGroup) athleteGroup.style.display = 'none';
        currentAthletes = [{ _id: user.id, name: user.name || 'You' }];
        if (select) select.innerHTML = `<option value="${user.id}">${user.name || 'You'}</option>`;
        return;
    }

    const res = await fetch(`${API_BASE_URL}/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const batches = await res.json();
    currentAthletes = [];
    if (Array.isArray(batches)) {
        batches.forEach(b => (b.athletes || []).forEach(a => {
            if (a && a._id && !currentAthletes.find(x => x._id === a._id)) {
                currentAthletes.push(a);
            }
        }));
    }

    if (!select) return;
    if (currentAthletes.length === 0) {
        select.innerHTML = `<option value="">No athletes found</option>`;
        return;
    }
    select.innerHTML = currentAthletes.map(a =>
        `<option value="${a._id}">${a.name}</option>`
    ).join('');
}

function buildFetchUrl(athleteId, metricKey) {
    const base = `${API_BASE_URL}/performance/real?athleteId=${athleteId}&metric=${encodeURIComponent(metricKey)}`;
    if (currentGranularity === 'daily') return `${base}&granularity=daily`;
    if (currentGranularity === 'month') {
        const monthVal = document.getElementById('monthPicker')?.value;
        if (monthVal) return `${base}&granularity=month&month=${monthVal}`;
    }
    return `${base}&months=6`;
}

async function fetchMetric(athleteId, metricKey) {
    const token = getToken();
    const url = buildFetchUrl(athleteId, metricKey);
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    return res.json();
}

async function initChart(metricValue) {
    const ctx = document.getElementById('performanceChart');
    const barCtx = document.getElementById('performanceBarChart');
    if (!ctx || !barCtx) return;

    const mockData = getMockData();
    const [type, key] = metricValue.split(':');
    const athleteSelect = document.getElementById('athleteSelect');
    const athleteId = athleteSelect?.value;
    const athleteName = athleteSelect?.options[athleteSelect.selectedIndex]?.text || 'Athlete';

    let labels, values, benchmark, metricLabel;
    const isNonMonthly = currentGranularity === 'daily' || currentGranularity === 'month';

    if (type === 'real') {
        if (!athleteId) {
            labels = months; values = [0, 0, 0, 0, 0, 0]; benchmark = null;
            metricLabel = key === 'attendance' ? 'Attendance %' : 'Session Count';
        } else {
            const result = await fetchMetric(athleteId, key);
            labels = result.labels || months;
            values = result.values || [0, 0, 0, 0, 0, 0];
            benchmark = result.benchmark;
            metricLabel = result.metric || key;
        }
    } else {
        if (isNonMonthly && athleteId) {
            const result = await fetchMetric(athleteId, key);
            labels = result.labels || months;
            values = result.values || mockData[key]?.data || [];
            benchmark = result.benchmark ?? (mockData[key]?.benchmark ?? null);
            metricLabel = result.metric || key;
        } else {
            const dataset = mockData[key] || Object.values(mockData)[0];
            labels = months; values = dataset.data;
            benchmark = dataset.benchmark; metricLabel = key;
        }
    }

    if (performanceChart) performanceChart.destroy();
    if (performanceBarChart) performanceBarChart.destroy();

    const isDense = isNonMonthly;
    const xTickConfig = isDense
        ? { color: '#6B7280', font: { size: 11 }, maxTicksLimit: 10, maxRotation: 45, minRotation: 30 }
        : { color: '#6B7280', font: { size: 12 } };

    const lineDatasets = [{
        label: metricLabel, data: values,
        borderColor: '#1e3a5f', backgroundColor: 'transparent',
        pointBackgroundColor: '#1e3a5f',
        pointRadius: isDense ? 2 : 5, pointHoverRadius: isDense ? 4 : 7,
        tension: 0.3, borderWidth: 2.5
    }];

    if (benchmark !== null && benchmark !== undefined) {
        lineDatasets.push({
            label: 'Benchmark', data: Array(labels.length).fill(benchmark),
            borderColor: '#DC2626', borderDash: [6, 4],
            backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5
        });
    }

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                grid: { color: '#F3F4F6' },
                ticks: { color: '#6B7280', font: { size: 12 } },
                title: { display: true, text: metricLabel, color: '#6B7280', font: { size: 12, weight: '600' } }
            },
            x: {
                grid: { display: false },
                ticks: xTickConfig,
                title: { display: true, text: 'Date', color: '#6B7280', font: { size: 12, weight: '600' } }
            }
        }
    };
    window._chartLabels = labels;
    window._chartValues = values;
    performanceChart = new Chart(ctx, { type: 'line', data: { labels, datasets: lineDatasets }, options: chartOptions });
    performanceBarChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels, datasets: [{ label: metricLabel, data: values, backgroundColor: '#F5C518', borderRadius: isDense ? 2 : 6, maxBarThickness: isDense ? 12 : 40 }] },
        options: chartOptions
    });

    applyZoom();
    updateStats(values, benchmark);
    updateChartHeader(metricLabel, athleteName);
}

function applyZoom() {
    const scale = currentZoom / 100;
    const newHeight = Math.round(280 * scale);
    document.querySelectorAll('.chart-wrap').forEach(w => w.style.height = `${newHeight}px`);
    if (performanceChart) performanceChart.resize();
    if (performanceBarChart) performanceBarChart.resize();
    const zoomLabel = document.getElementById('zoomLevel');
    if (zoomLabel) zoomLabel.textContent = `${currentZoom}%`;
}

function updateChartHeader(metricLabel, athleteName) {
    const titleEl = document.getElementById('chartTitle');
    const subtitleEl = document.getElementById('chartSubtitle');
    const legendMetric = document.getElementById('legendMetric');
    if (titleEl) titleEl.textContent = metricLabel;
    const rangeLabel = currentGranularity === 'daily' ? 'last 30 days'
        : currentGranularity === 'month' ? (document.getElementById('monthPicker')?.value || 'selected month')
            : 'last 6 months';
    if (subtitleEl) subtitleEl.textContent = `${athleteName} · ${rangeLabel}`;
    if (legendMetric) legendMetric.textContent = metricLabel;
}

function updateStats(values, benchmark) {
    const nums = values.map(v => Number(v) || 0);
    const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    const latest = nums[nums.length - 1];
    const prev = nums[nums.length - 2];
    const trajectory = latest > prev ? '↑ Improving' : latest < prev ? '↓ Declining' : '→ Stable';
    const tColor = latest > prev ? '#16A34A' : latest < prev ? '#DC2626' : '#6B7280';

    const set = (id, val, color) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; if (color) el.style.color = color; }
    };
    set('statAvg', avg);
    set('statLatest', latest, '#16A34A');
    set('statTrajectory', trajectory, tColor);

    const benchEl = document.getElementById('statBenchmark');
    const benchSubEl = document.getElementById('statBenchmarkSub');
    if (benchmark !== null && benchmark !== undefined && benchmark > 0) {
        const vs = (((latest - benchmark) / benchmark) * 100).toFixed(1);
        const color = parseFloat(vs) >= 0 ? '#16A34A' : '#DC2626';
        const prefix = parseFloat(vs) >= 0 ? '+' : '';
        if (benchEl) { benchEl.textContent = `${prefix}${vs}%`; benchEl.style.color = color; }
        if (benchSubEl) benchSubEl.textContent = parseFloat(vs) >= 0 ? 'above target' : 'below target';
    } else {
        if (benchEl) benchEl.textContent = 'N/A';
        if (benchSubEl) benchSubEl.textContent = 'no benchmark set';
    }
}

function setToggleActive(granularity) {
    currentGranularity = granularity;
    ['toggleMonthly', 'toggleDaily', 'toggleMonth'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const activeMap = { monthly: 'toggleMonthly', daily: 'toggleDaily', month: 'toggleMonth' };
    document.getElementById(activeMap[granularity])?.classList.add('active');
    const pickerGroup = document.getElementById('monthPickerGroup');
    if (pickerGroup) pickerGroup.style.display = granularity === 'month' ? 'block' : 'none';
}

async function setupPerformancePage() {
    const user = getStoredUser();
    if (!user || !getToken()) { window.location.href = 'login.html'; return; }

    const dateEl = document.getElementById('pageDate');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = `${now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()} · ${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}`;
    }

    const monthPicker = document.getElementById('monthPicker');
    if (monthPicker) {
        const now = new Date();
        monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthPicker.addEventListener('change', () => { if (currentGranularity === 'month') refresh(); });
    }

    // Populate sport-specific metrics
    populateSportMetrics();

    await loadAthletes();

    const metricSelect = document.getElementById('metricSelect');
    const athleteSelect = document.getElementById('athleteSelect');
    const refresh = () => initChart(metricSelect?.value || 'real:attendance');

    if (metricSelect) metricSelect.addEventListener('change', refresh);
    if (athleteSelect) athleteSelect.addEventListener('change', refresh);

    document.getElementById('toggleMonthly')?.addEventListener('click', () => { setToggleActive('monthly'); refresh(); });
    document.getElementById('toggleDaily')?.addEventListener('click', () => { setToggleActive('daily'); refresh(); });
    document.getElementById('toggleMonth')?.addEventListener('click', () => { setToggleActive('month'); refresh(); });

    document.getElementById('zoomInBtn')?.addEventListener('click', () => { currentZoom = Math.min(currentZoom + 20, 200); applyZoom(); });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => { currentZoom = Math.max(currentZoom - 20, 60); applyZoom(); });

    refresh();
}

document.addEventListener('DOMContentLoaded', setupPerformancePage);
