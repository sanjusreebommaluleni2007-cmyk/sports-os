const API_BASE_URL = 'http://localhost:5000/api';

function getToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || localStorage.getItem('token');
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch { return null; }
}

function redirectToLogin() { window.location.href = 'login.html'; }

// ─────────────────────────────────────────────────────────────
// Sport-specific content config — drives all dashboard text
// ─────────────────────────────────────────────────────────────
const SPORT_CONTENT = {
    cricket: {
        icon: '🏏',
        nextMatch: {
            title: 'U-16 Elite vs Mumbai Colts',
            time: '🕐 Sat, 10:30 AM',
            location: '📍 Wankhede Practice Ground',
            tags: ['T20 · League', 'Squad: 14', '5 days out'],
        },
        practiceList: [
            { status: 'dark', title: 'Net 3 (Throw-downs)', meta: 'R. Gaikwad', time: '10:00–11:30' },
            { status: 'yellow', title: 'Center Wicket', meta: 'Match Sim · U-19', time: '11:00–13:00' },
        ],
        workloadLabel: 'FAST BOWLER WORKLOAD',
        equipmentStats: [
            { label: 'NEW LEATHER BALLS', value: '48', note: '~6 today' },
            { label: 'OLD BALLS (PRACTICE)', value: '212', note: 'stable' },
            { label: 'BOWLING MACHINES', value: '3/4', note: '1 maintenance' },
        ],
        athletePerfStats: [
            { label: 'Strike Rate', value: '162', highlight: true },
            { label: 'Average', value: '48' },
            { label: 'Attendance', value: '92%', highlight: true },
            { label: 'Sessions', value: '14' },
        ],
        athleteNextEvent: {
            title: 'Net 3 (Throw-downs)',
            time: '🕐 Today, 10:00 AM',
            location: '📍 Wankhede Practice Ground',
        },
    },
    tennis: {
        icon: '🎾',
        nextMatch: {
            title: 'U-16 Elite vs City Aces',
            time: '🕐 Sat, 10:30 AM',
            location: '📍 Main Court Complex',
            tags: ['Singles · League', 'Squad: 14', '5 days out'],
        },
        practiceList: [
            { status: 'dark', title: 'Practice Wall', meta: 'M. Rao', time: '10:00–11:30' },
            { status: 'yellow', title: 'Center Court', meta: 'Match Sim · U-19', time: '11:00–13:00' },
        ],
        workloadLabel: 'SERVE LOAD MONITOR',
        equipmentStats: [
            { label: 'NEW TENNIS BALLS', value: '60', note: '~12 today' },
            { label: 'PRACTICE BALLS', value: '140', note: 'stable' },
            { label: 'BALL MACHINES', value: '1/1', note: 'ok' },
        ],
        athletePerfStats: [
            { label: 'First Serve %', value: '68%', highlight: true },
            { label: 'Rally Win %', value: '54%' },
            { label: 'Attendance', value: '92%', highlight: true },
            { label: 'Sessions', value: '14' },
        ],
        athleteNextEvent: {
            title: 'Practice Wall',
            time: '🕐 Today, 10:00 AM',
            location: '📍 Main Court Complex',
        },
    },
    kabaddi: {
        icon: '🤼',
        nextMatch: {
            title: 'U-16 Elite vs Iron Lions',
            time: '🕐 Sat, 10:30 AM',
            location: '📍 Main Mat',
            tags: ['Pro Kabaddi · League', 'Squad: 14', '5 days out'],
        },
        practiceList: [
            { status: 'dark', title: 'Fitness Zone', meta: 'K. Patil', time: '10:00–11:30' },
            { status: 'yellow', title: 'Main Mat', meta: 'Match Sim · U-19', time: '11:00–13:00' },
        ],
        workloadLabel: 'RAID LOAD MONITOR',
        equipmentStats: [
            { label: 'LIME POWDER', value: '20', note: 'stable' },
            { label: 'KABADDI MATS', value: '2', note: 'ok' },
            { label: 'JERSEYS / BIBS', value: '30', note: 'ok' },
        ],
        athletePerfStats: [
            { label: 'Raid Points', value: '7', highlight: true },
            { label: 'Tackle Points', value: '4' },
            { label: 'Attendance', value: '92%', highlight: true },
            { label: 'Sessions', value: '14' },
        ],
        athleteNextEvent: {
            title: 'Fitness Zone',
            time: '🕐 Today, 10:00 AM',
            location: '📍 Main Mat',
        },
    },
};

function getSportContent() {
    const user = getStoredUser();
    const sport = user?.sport || 'cricket';
    return SPORT_CONTENT[sport] || SPORT_CONTENT.cricket;
}

function setDashboardHeader() {
    const user = getStoredUser();
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

    const dateEl = document.getElementById('pageDate');
    if (dateEl) dateEl.textContent = `${weekday} · ${day} ${month}`;

    const greetingEl = document.getElementById('greetingName');
    if (greetingEl && user?.name) greetingEl.textContent = user.name.split(' ')[0];
}

function renderDashboard() {
    const content = getSportContent();
    const user = getStoredUser();
    const role = user?.role;

    // Next match card
    const matchTitleEl = document.getElementById('nextMatchTitle');
    const matchTimeEl = document.getElementById('nextMatchTime');
    const matchLocEl = document.getElementById('nextMatchLocation');
    const matchTagsEl = document.getElementById('nextMatchTags');
    if (matchTitleEl) matchTitleEl.textContent = content.nextMatch.title;
    if (matchTimeEl) matchTimeEl.textContent = content.nextMatch.time;
    if (matchLocEl) matchLocEl.textContent = content.nextMatch.location;
    if (matchTagsEl) {
        matchTagsEl.innerHTML = content.nextMatch.tags.map((tag, i) =>
            `<span class="pill ${i === content.nextMatch.tags.length - 1 ? 'green-pill' : ''}">${tag}</span>`
        ).join('');
    }

    // Hide "Manage" link for athletes
    const manageLinkEl = document.querySelector('.practice-net-card .text-link');
    if (manageLinkEl && role === 'athlete') {
        manageLinkEl.style.display = 'none';
    }

    // Practice list
    const practiceListEl = document.getElementById('practiceList');
    if (practiceListEl) {
        const list = role === 'athlete' ? [content.athleteNextEvent] : content.practiceList;
        practiceListEl.innerHTML = (list || []).map(p => `
            <div class="practice-row">
                <span class="status-dot ${p.status || ''}"></span>
                <div class="practice-info">
                    <p class="practice-title">${p.title}</p>
                    <p class="practice-meta">${p.meta || ''}</p>
                </div>
                <span class="practice-time">${p.time || ''}</span>
            </div>
        `).join('');
    }

    // Workload alerts — loaded async via loadWorkloadAlerts()

    // Equipment snapshot
    const equipmentTitleEl = document.getElementById('equipmentTitle');
    const equipmentStatsEl = document.getElementById('equipmentStats');
    if (equipmentTitleEl) equipmentTitleEl.textContent = `${content.icon} Equipment Snapshot`;
    if (equipmentStatsEl) {
        equipmentStatsEl.innerHTML = content.equipmentStats.map(s => `
            <div class="stat-box">
                <p class="stat-label">${s.label}</p>
                <p class="stat-value">${s.value}</p>
                <p class="stat-note">${s.note || ''}</p>
            </div>
        `).join('');
    }

    // Role-based visibility
    if (role === 'athlete') {
        const matchCard = document.querySelector('.next-match-card');
        const alertsCard = document.querySelector('.workload-card');
        const equipCard = document.querySelector('.equipment-card');
        const attendanceSummaryCard = document.querySelector('.attendance-summary-card');
        if (matchCard) matchCard.style.display = 'none';
        if (alertsCard) alertsCard.style.display = 'none';
        if (equipCard) equipCard.style.display = 'none';
        if (attendanceSummaryCard) attendanceSummaryCard.style.display = 'none';
    }

    if (role === 'coach') {
        const workloadCard = document.querySelector('.workload-card');
        if (workloadCard) workloadCard.style.display = 'none';
        const subtitle = document.querySelector('.page-subtitle');
        if (subtitle) subtitle.textContent = "Here's what's happening with your batch today.";
    }
}

// ─────────────────────────────────────────────────────────────
// Attendance Summary Card — coach/owner/head_coach only
// FIX: pct = present / totalAthletes (not present / marked)
// ─────────────────────────────────────────────────────────────
async function loadAttendanceSummary() {
    const user = getStoredUser();
    if (user?.role === 'athlete') return;

    const statsEl = document.getElementById('attendanceSummaryStats');
    const subEl = document.getElementById('attendanceSummarySub');
    if (!statsEl) return;

    const token = getToken();
    const today = new Date().toISOString().slice(0, 10);

    try {
        const athletesRes = await fetch(`${API_BASE_URL}/roster/athletes`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const athletes = athletesRes.ok ? await athletesRes.json() : [];
        const totalAthletes = Array.isArray(athletes) ? athletes.length : 0;

        const batchesRes = await fetch(`${API_BASE_URL}/batches`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const batches = batchesRes.ok ? await batchesRes.json() : [];

        let present = 0;
        let marked = 0;

        if (Array.isArray(batches) && batches.length > 0) {
            const attendanceResults = await Promise.all(
                batches.map(b =>
                    fetch(`${API_BASE_URL}/attendance?batchId=${b._id}&date=${today}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                        .then(r => (r.ok ? r.json() : null))
                        .catch(() => null)
                )
            );

            attendanceResults.forEach(doc => {
                if (doc && Array.isArray(doc.records)) {
                    doc.records.forEach(r => {
                        marked++;
                        if (r.status === 'present') present++;
                    });
                }
            });
        }

        // ✅ FIX: divide by totalAthletes, not marked
        const pct = totalAthletes > 0 ? Math.round((present / totalAthletes) * 100) : 0;

        if (subEl) {
            subEl.textContent = marked > 0
                ? `${present} present · ${marked - present} absent · ${totalAthletes - marked} not yet marked`
                : 'No attendance marked yet today';
        }

        statsEl.innerHTML = `
            <div class="stat-box">
                <p class="stat-label">TOTAL ATHLETES</p>
                <p class="stat-value">${totalAthletes}</p>
            </div>
            <div class="stat-box">
                <p class="stat-label">PRESENT TODAY</p>
                <p class="stat-value">${present}</p>
            </div>
            <div class="stat-box">
                <p class="stat-label">ATTENDANCE %</p>
                <p class="stat-value">${totalAthletes > 0 ? pct + '%' : '—'}</p>
            </div>`;
    } catch (err) {
        console.error('Error loading attendance summary:', err);
        if (subEl) subEl.textContent = 'Unable to load attendance.';
        statsEl.innerHTML = '<p class="stat-label">No data available.</p>';
    }
}

// ─────────────────────────────────────────────────────────────
// Workload Alerts — real data from backend
// ─────────────────────────────────────────────────────────────
async function loadWorkloadAlerts() {
    const workloadLabelEl = document.getElementById('workloadLabel');
    const workloadBadgeEl = document.getElementById('workloadBadge');
    const workloadAlertsEl = document.getElementById('workloadAlerts');
    if (!workloadAlertsEl) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE_URL}/performance/workload-alerts`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load workload alerts');
        const data = await res.json();

        if (workloadLabelEl) workloadLabelEl.textContent = data.label;
        if (workloadBadgeEl) {
            workloadBadgeEl.textContent = data.criticalCount > 0
                ? `${data.criticalCount} CRITICAL`
                : 'ALL CLEAR';
            workloadBadgeEl.className = data.criticalCount > 0 ? 'badge red' : 'badge green';
        }

        if (!data.alerts || !data.alerts.length) {
            workloadAlertsEl.innerHTML = '<p class="card-subtext">No workload concerns this week.</p>';
            return;
        }

        workloadAlertsEl.innerHTML = data.alerts.map(a => `
            <div class="alert-row ${a.badgeClass === 'red' ? 'alert-high' : 'alert-ok'}">
                <div class="alert-icon">${a.icon}</div>
                <div>
                    <p class="alert-title">${a.title}</p>
                    <p class="alert-meta">${a.meta}</p>
                </div>
                <span class="badge ${a.badgeClass}">${a.badge}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading workload alerts:', err);
        if (workloadAlertsEl) workloadAlertsEl.innerHTML = '<p class="card-subtext">Unable to load workload data.</p>';
    }
}

// ─────────────────────────────────────────────────────────────
// Athlete extras: profile, performance, streak, to-dos, quote
// ─────────────────────────────────────────────────────────────
const MOTIVATIONAL_QUOTES = [
    "Discipline is choosing between what you want now and what you want most.",
    "Champions keep playing until they get it right.",
    "The pain you feel today will be the strength you feel tomorrow.",
    "Hard work beats talent when talent doesn't work hard.",
    "Small steps every day lead to big results.",
    "You don't have to be great to start, but you have to start to be great.",
    "Push yourself, because no one else is going to do it for you.",
    "Train like you've never won. Perform like you've never lost.",
];

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
}

function renderAthleteProfile(user) {
    const avatarEl = document.getElementById('athleteAvatar');
    const nameEl = document.getElementById('athleteProfileName');
    const metaEl = document.getElementById('athleteProfileMeta');
    if (avatarEl) avatarEl.textContent = getInitials(user?.name);
    if (nameEl) nameEl.textContent = user?.name || 'Athlete';
    if (metaEl) {
        const sport = (user?.sport || '').charAt(0).toUpperCase() + (user?.sport || '').slice(1);
        metaEl.textContent = `${sport} · ${user?.batchAssigned || 'No batch assigned'}`;
    }
}

function renderAthletePerfStats() {
    const content = getSportContent();
    const el = document.getElementById('athletePerfStatsEl');
    if (!el) return;
    el.innerHTML = content.athletePerfStats.map(s => `
        <div class="stat-box">
            <p class="stat-label">${s.label}</p>
            <p class="stat-value">${s.value}</p>
        </div>
    `).join('');
}

function renderMotivationQuote() {
    const el = document.getElementById('motivationQuote');
    if (!el) return;
    const dayIndex = new Date().getDate() % MOTIVATIONAL_QUOTES.length;
    el.textContent = `"${MOTIVATIONAL_QUOTES[dayIndex]}"`;
}

function updateLoginStreak(user) {
    const streakEl = document.getElementById('streakValue');
    const subEl = document.getElementById('streakSub');
    if (!streakEl) return;

    const key = `streak_${user?.id || user?.email || 'user'}`;
    const todayStr = new Date().toDateString();

    let data;
    try { data = JSON.parse(localStorage.getItem(key)) || {}; } catch { data = {}; }

    if (data.lastLoginDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const wasYesterday = data.lastLoginDate === yesterday.toDateString();
        data.streak = wasYesterday ? (data.streak || 0) + 1 : 1;
        data.lastLoginDate = todayStr;
        localStorage.setItem(key, JSON.stringify(data));
    }

    const streak = data.streak || 1;
    streakEl.textContent = `${streak} day${streak === 1 ? '' : 's'}`;
    if (subEl) {
        subEl.textContent = streak >= 7
            ? "You're on fire! Keep it going."
            : 'Log in daily to build your streak.';
    }
}

function renderAthleteTodos(content) {
    const listEl = document.getElementById('athleteTodoList');
    if (!listEl) return;

    const key = 'athlete_todos_' + new Date().toDateString();
    let checked;
    try { checked = JSON.parse(localStorage.getItem(key)) || {}; } catch { checked = {}; }

    const todos = [
        { id: 'session', label: `Attend session: ${content.athleteNextEvent?.title || "Today's training"}` },
        { id: 'hydrate', label: 'Stay hydrated through training' },
        { id: 'log_notes', label: 'Check coach notes from last session' },
        { id: 'warmup', label: 'Complete warm-up routine before practice' },
    ];

    listEl.innerHTML = todos.map(t => `
        <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" class="athlete-todo-checkbox" data-id="${t.id}" ${checked[t.id] ? 'checked' : ''}>
            <span style="${checked[t.id] ? 'text-decoration:line-through;color:var(--color-muted);' : ''}">${t.label}</span>
        </label>
    `).join('');

    listEl.querySelectorAll('.athlete-todo-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            let state;
            try { state = JSON.parse(localStorage.getItem(key)) || {}; } catch { state = {}; }
            state[cb.dataset.id] = cb.checked;
            localStorage.setItem(key, JSON.stringify(state));
            renderAthleteTodos(content);
        });
    });
}

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = getStoredUser();
    if (!user || !getToken()) { redirectToLogin(); return; }

    setDashboardHeader();
    renderDashboard();
    loadAttendanceSummary();
    loadWorkloadAlerts();

    // Button handlers
    document.getElementById('viewSquadBtn')?.addEventListener('click', () => {
        window.location.href = 'batches.html';
    });
    document.getElementById('enterMatchModeBtn')?.addEventListener('click', () => {
        alert('Match Mode is coming soon!');
    });

    // Athlete-only extras
    if (user.role === 'athlete') {
        const topRow = document.getElementById('athleteTopRow');
        if (topRow) topRow.style.display = 'grid';

        const content = getSportContent();
        renderAthleteProfile(user);
        renderAthletePerfStats();
        renderMotivationQuote();
        updateLoginStreak(user);
        renderAthleteTodos(content);
    }
});