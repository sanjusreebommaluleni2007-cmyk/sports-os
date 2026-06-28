const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';

function getToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || localStorage.getItem('token');
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch { return null; }
}

let currentBatches = [];
let selectedBatch = null;
let attendanceState = {};
let isGroupedView = false; // true for head_coach / owner

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Helpers that resolve to whichever picker mode is active ───────

function getDateInput() {
    return isGroupedView
        ? document.getElementById('attendanceDateGrouped')
        : document.getElementById('attendanceDate');
}

function getCounterEls() {
    const suffix = isGroupedView ? 'Grouped' : '';
    return {
        present: document.getElementById(`presentCount${suffix}`),
        absent: document.getElementById(`absentCount${suffix}`),
        pending: document.getElementById(`pendingCount${suffix}`),
    };
}

// ── Initial load ───────────────────────────────────────────────

async function loadBatches() {
    const user = getStoredUser();
    isGroupedView = user?.role === 'head_coach' || user?.role === 'owner';

    document.getElementById('simpleBatchPicker').style.display = isGroupedView ? 'none' : 'grid';
    document.getElementById('groupedBatchPicker').style.display = isGroupedView ? 'block' : 'none';

    const subtitle = document.getElementById('pageSubtitle');
    if (subtitle) {
        subtitle.textContent = isGroupedView
            ? "Academy-wide attendance — pick any coach's batch to capture or review."
            : 'Pick a batch, capture attendance in seconds.';
    }

    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/batches`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const batches = await res.json();
    currentBatches = Array.isArray(batches) ? batches : [];

    if (isGroupedView) {
        renderGroupedPicker();
    } else {
        renderSimplePicker();
    }

    // Wire the date input for whichever mode is active
    const dateInput = getDateInput();
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', onBatchOrDateChange);
    }

    if (currentBatches.length === 0) {
        renderAthleteList([]);
        return;
    }

    selectedBatch = currentBatches[0];
    onBatchOrDateChange();
}

function renderSimplePicker() {
    const select = document.getElementById('batchSelect');
    if (!select) return;

    if (currentBatches.length === 0) {
        select.innerHTML = `<option value="">No batches assigned</option>`;
        return;
    }

    select.innerHTML = currentBatches
        .map(b => `<option value="${b._id}">${b.name}</option>`)
        .join('');

    select.value = currentBatches[0]._id;
    select.addEventListener('change', onBatchOrDateChange);
}

function renderGroupedPicker() {
    const container = document.getElementById('coachGroups');
    if (!container) return;

    if (currentBatches.length === 0) {
        container.innerHTML = `<p style="color:#6B7280;">No batches found across the academy yet.</p>`;
        return;
    }

    // Group batches by coach name (falls back to "Unassigned" if coachId didn't populate)
    const groups = {};
    currentBatches.forEach(b => {
        const coachName = b.coachId?.name || 'Unassigned';
        if (!groups[coachName]) groups[coachName] = [];
        groups[coachName].push(b);
    });

    const coachNames = Object.keys(groups).sort();

    container.innerHTML = coachNames.map(coachName => `
        <div class="coach-group">
            <p class="coach-group-label">${coachName}</p>
            <div class="coach-group-batches">
                ${groups[coachName].map(b => `
                    <button class="batch-pill ${selectedBatch?._id === b._id ? 'active' : ''}" data-batch-id="${b._id}">
                        ${b.name}
                        <span class="batch-pill-count">${b.athletes?.length || 0}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.batch-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const batchId = pill.dataset.batchId;
            selectedBatch = currentBatches.find(b => b._id === batchId);
            container.querySelectorAll('.batch-pill').forEach(p => p.classList.toggle('active', p === pill));
            onBatchOrDateChange();
        });
    });

    // Default-select the first pill if nothing is selected yet
    if (!selectedBatch && currentBatches.length) {
        selectedBatch = currentBatches[0];
        const firstPill = container.querySelector('.batch-pill');
        if (firstPill) firstPill.classList.add('active');
    }
}

function updateBatchLabel() {
    const labelEl = document.getElementById('selectedBatchLabel');
    if (!labelEl || !selectedBatch) return;
    const count = selectedBatch.athletes?.length || 0;
    const coachSuffix = isGroupedView && selectedBatch.coachId?.name
        ? ` · Coach ${selectedBatch.coachId.name}`
        : '';
    labelEl.textContent = `${selectedBatch.name} · ${count} athlete${count === 1 ? '' : 's'}${coachSuffix}`;
}

function renderAthleteList(athletes) {
    const container = document.getElementById('athleteList');
    if (!container) return;

    if (!athletes || athletes.length === 0) {
        container.innerHTML = `<p style="color:#6B7280;padding:20px 0;">No athletes in this batch yet.</p>`;
        updateCounters();
        return;
    }

    container.innerHTML = athletes.map(a => `
        <div class="athlete-row" data-athlete-id="${a._id}">
            <div class="athlete-info">
                <div class="athlete-avatar">${getInitials(a.name)}</div>
                <div class="athlete-details">
                    <p class="athlete-name">${a.name}</p>
                    <p class="athlete-role">${a.specialization || 'Athlete'}</p>
                </div>
            </div>
            <div class="athlete-actions">
                <button class="status-button present" data-status="present">✓ PRESENT</button>
                <button class="status-button absent" data-status="absent">✗ ABSENT</button>
                <button class="status-button late" data-status="late">🕐 LATE</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.status-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('.athlete-row');
            const athleteId = row.dataset.athleteId;
            const status = btn.dataset.status;

            attendanceState[athleteId] = status;

            applyRowState(row, attendanceState[athleteId]);
            updateCounters();
        });
    });

    athletes.forEach(a => {
        if (!attendanceState[a._id]) attendanceState[a._id] = 'late';
    });

    container.querySelectorAll('.athlete-row').forEach(row => {
        const athleteId = row.dataset.athleteId;
        applyRowState(row, attendanceState[athleteId]);
    });

    updateCounters();
}

function applyRowState(row, status) {
    row.querySelectorAll('.status-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    row.classList.remove('present', 'absent', 'late');
    row.classList.add(status);
}

function updateCounters() {
    const values = Object.values(attendanceState);
    const present = values.filter(v => v === 'present').length;
    const absent = values.filter(v => v === 'absent').length;
    const pending = values.filter(v => v === 'late').length;

    const { present: pEl, absent: aEl, pending: pdEl } = getCounterEls();
    if (pEl) pEl.textContent = present;
    if (aEl) aEl.textContent = absent;
    if (pdEl) pdEl.textContent = pending;
}

async function onBatchOrDateChange() {
    if (!isGroupedView) {
        const select = document.getElementById('batchSelect');
        if (select) {
            const batchId = select.value;
            const found = currentBatches.find(b => b._id === batchId);
            if (found) selectedBatch = found;
        }
    }

    if (!selectedBatch) return;

    attendanceState = {};
    renderAthleteList(selectedBatch.athletes);
    updateBatchLabel();

    const dateInput = getDateInput();
    const date = dateInput?.value || new Date().toISOString().split('T')[0];
    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/attendance?batchId=${selectedBatch._id}&date=${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data?.records?.length) {
            data.records.forEach(r => {
                const athleteId = r.athlete?._id || r.athlete;
                attendanceState[athleteId] = r.status;
                const row = document.querySelector(`.athlete-row[data-athlete-id="${athleteId}"]`);
                if (row) applyRowState(row, r.status);
            });
            updateCounters();
        }
    } catch (err) {
        console.log('No existing attendance found for this date.');
    }

    loadAttendanceHistory();
}

async function loadAttendanceHistory() {
    const historyContainer = document.getElementById('attendanceHistoryList');
    if (!historyContainer || !selectedBatch) return;

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/attendance/history?batchId=${selectedBatch._id}&days=7`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const records = await res.json();

        if (!Array.isArray(records) || records.length === 0) {
            historyContainer.innerHTML = `<p style="color:#6B7280;">No attendance recorded in the last 7 days.</p>`;
            return;
        }

        historyContainer.innerHTML = records.map(r => {
            const dateLabel = new Date(r.date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const present = r.records?.filter(x => x.status === 'present').length || 0;
            const absent = r.records?.filter(x => x.status === 'absent').length || 0;
            const late = r.records?.filter(x => x.status === 'late').length || 0;

            return `
                <div class="history-row">
                    <span class="history-date">${dateLabel}</span>
                    <div class="history-counts">
                        <span class="history-count-present">✅ ${present} Present</span>
                        <span class="history-count-absent">❌ ${absent} Absent</span>
                        <span class="history-count-late">🕐 ${late} Late</span>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Error loading attendance history:', err);
        historyContainer.innerHTML = `<p style="color:#DC2626;">Failed to load attendance history.</p>`;
    }
}

async function saveAttendance() {
    const token = getToken();
    const user = getStoredUser();
    const dateInput = getDateInput();
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    if (!selectedBatch) return;

    const records = Object.entries(attendanceState).map(([athlete, status]) => ({
        athlete, status
    }));

    try {
        const res = await fetch(`${API_BASE_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                batchId: selectedBatch._id,
                date,
                records,
                takenBy: user.id
            })
        });

        if (res.ok) {
            showToast(`✅ Attendance saved for ${date}!`, 'success');
            loadAttendanceHistory();
        } else {
            showToast('❌ Failed to save attendance', 'error');
        }
    } catch (err) {
        showToast('❌ Network error while saving attendance', 'error');
    }
}

function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    if (container) {
        container.appendChild(toast);
    } else {
        document.body.appendChild(toast);
    }
    setTimeout(() => toast.remove(), 3000);
}

// ═══════════════════════════════════════════════════════════════
// COACH ATTENDANCE (Owner only) — fully separate state from the
// athlete attendance logic above, so the two never collide.
// ═══════════════════════════════════════════════════════════════

let allCoaches = [];
let coachAttendanceState = {};

function getCoachCounterEls() {
    return {
        present: document.getElementById('coachPresentCount'),
        absent: document.getElementById('coachAbsentCount'),
        late: document.getElementById('coachLateCount'),
    };
}

function updateCoachCounters() {
    const values = Object.values(coachAttendanceState);
    const present = values.filter(v => v === 'present').length;
    const absent = values.filter(v => v === 'absent').length;
    const late = values.filter(v => v === 'late').length;

    const { present: pEl, absent: aEl, late: lEl } = getCoachCounterEls();
    if (pEl) pEl.textContent = present;
    if (aEl) aEl.textContent = absent;
    if (lEl) lEl.textContent = late;
}

function applyCoachRowState(row, status) {
    row.querySelectorAll('.status-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    row.classList.remove('present', 'absent', 'late');
    row.classList.add(status);
}

function renderCoachAttendanceList() {
    const container = document.getElementById('coachAttendanceList');
    if (!container) return;

    if (!allCoaches.length) {
        container.innerHTML = `<p style="color:#6B7280;padding:20px 0;">No coaches found yet.</p>`;
        updateCoachCounters();
        return;
    }

    container.innerHTML = allCoaches.map(c => `
        <div class="athlete-row" data-coach-id="${c._id}">
            <div class="athlete-info">
                <div class="athlete-avatar">${getInitials(c.name)}</div>
                <div class="athlete-details">
                    <p class="athlete-name">${c.name}</p>
                    <p class="athlete-role">${c.role === 'head_coach' ? 'Head Coach' : 'Coach'}</p>
                </div>
            </div>
            <div class="athlete-actions">
                <button class="status-button present" data-status="present">✓ PRESENT</button>
                <button class="status-button absent" data-status="absent">✗ ABSENT</button>
                <button class="status-button late" data-status="late">🕐 LATE</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.status-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('.athlete-row');
            const coachId = row.dataset.coachId;
            const status = btn.dataset.status;

            coachAttendanceState[coachId] = status;
            applyCoachRowState(row, status);
            updateCoachCounters();
        });
    });

    // Default everyone to present unless we load existing data for the day
    allCoaches.forEach(c => {
        if (!coachAttendanceState[c._id]) coachAttendanceState[c._id] = 'present';
    });

    container.querySelectorAll('.athlete-row').forEach(row => {
        const coachId = row.dataset.coachId;
        applyCoachRowState(row, coachAttendanceState[coachId]);
    });

    updateCoachCounters();
}

async function loadCoaches() {
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE_URL}/auth/coaches`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load coaches');
        const data = await res.json();
        allCoaches = Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('Error loading coaches:', err);
        allCoaches = [];
    }
}

async function onCoachAttendanceDateChange() {
    coachAttendanceState = {};
    const dateInput = document.getElementById('coachAttendanceDate');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/coach-attendance?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data?.records?.length) {
            data.records.forEach(r => {
                const coachId = r.coach?._id || r.coach;
                coachAttendanceState[coachId] = r.status;
            });
        }
    } catch (err) {
        console.log('No existing coach attendance found for this date.');
    }

    renderCoachAttendanceList();
    loadCoachAttendanceHistory();
}

async function loadCoachAttendanceHistory() {
    const historyContainer = document.getElementById('coachAttendanceHistoryList');
    if (!historyContainer) return;

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/coach-attendance/history?days=7`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const records = await res.json();

        if (!Array.isArray(records) || records.length === 0) {
            historyContainer.innerHTML = `<p style="color:#6B7280;">No coach attendance recorded in the last 7 days.</p>`;
            return;
        }

        historyContainer.innerHTML = records.map(r => {
            const dateLabel = new Date(r.date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const present = r.records?.filter(x => x.status === 'present').length || 0;
            const absent = r.records?.filter(x => x.status === 'absent').length || 0;
            const late = r.records?.filter(x => x.status === 'late').length || 0;

            return `
                <div class="history-row">
                    <span class="history-date">${dateLabel}</span>
                    <div class="history-counts">
                        <span class="history-count-present">✅ ${present} Present</span>
                        <span class="history-count-absent">❌ ${absent} Absent</span>
                        <span class="history-count-late">🕐 ${late} Late</span>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('Error loading coach attendance history:', err);
        historyContainer.innerHTML = `<p style="color:#DC2626;">Failed to load coach attendance history.</p>`;
    }
}

async function saveCoachAttendance() {
    const token = getToken();
    const user = getStoredUser();
    const dateInput = document.getElementById('coachAttendanceDate');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    const records = allCoaches.map(c => ({
        coach: c._id,
        coachName: c.name,
        status: coachAttendanceState[c._id] || 'present',
    }));

    try {
        const res = await fetch(`${API_BASE_URL}/coach-attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                date,
                records,
                markedBy: user.id,
            }),
        });

        if (res.ok) {
            showToast(`✅ Coach attendance saved for ${date}!`, 'success');
            loadCoachAttendanceHistory();
        } else {
            showToast('❌ Failed to save coach attendance', 'error');
        }
    } catch (err) {
        showToast('❌ Network error while saving coach attendance', 'error');
    }
}

async function setupCoachAttendancePanel() {
    const user = getStoredUser();
    if (user?.role !== 'owner') return; // owner-only panel stays hidden for everyone else

    document.getElementById('coachAttendanceCard').style.display = 'block';

    const dateInput = document.getElementById('coachAttendanceDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        dateInput.addEventListener('change', onCoachAttendanceDateChange);
    }

    document.getElementById('saveCoachAttendanceBtn')?.addEventListener('click', saveCoachAttendance);

    await loadCoaches();
    await onCoachAttendanceDateChange();
}

document.addEventListener('DOMContentLoaded', () => {
    const user = getStoredUser();
    if (!user || !getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const saveBtn = document.getElementById('saveAttendanceBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }

    loadBatches();
    setupCoachAttendancePanel();
});
