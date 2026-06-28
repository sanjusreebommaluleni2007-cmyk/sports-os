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

function redirectToLogin() {
    window.location.href = 'login.html';
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const timetableState = {
    slots: [],
    batches: [],
    coaches: [],
    canManage: false,
    currentView: 'today',
    editingId: null,
    weekOffset: 0,
};

function canManageTimetable(user) {
    return user?.role === 'head_coach' || user?.role === 'owner';
}

function todayName() {
    return DAYS_OF_WEEK[(new Date().getDay() + 6) % 7];
}

function formatTimeRange(start, end) {
    return `${start} – ${end}`;
}

function getTodayHeader() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${weekday} · ${day} ${month}`;
}

// ── Data loading ──────────────────────────────────────────────

async function loadTimetable() {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
        const res = await fetch(`${API_BASE_URL}/timetable`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load timetable');
        const data = await res.json();
        timetableState.slots = Array.isArray(data) ? data : [];
        renderCurrentView();
    } catch (error) {
        console.error('Error loading timetable:', error);
        const container = timetableState.currentView === 'today'
            ? document.getElementById('todayList')
            : document.getElementById('weekGrid');
        if (container) container.innerHTML = '<div class="empty-state">Unable to load timetable.</div>';
    }
}

async function loadBatchesAndCoaches() {
    const token = getToken();
    try {
        const [batchesRes, coachesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/batches`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/auth/coaches`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const batches = await batchesRes.json();
        timetableState.batches = Array.isArray(batches) ? batches : [];

        if (coachesRes.ok) {
            const coaches = await coachesRes.json();
            timetableState.coaches = Array.isArray(coaches) ? coaches : [];
        }

        const batchSelect = document.getElementById('slotBatch');
        if (batchSelect) {
            batchSelect.innerHTML = `<option value="">Select batch</option>` +
                timetableState.batches.map(b => `<option value="${b._id}">${b.name}</option>`).join('');
        }

        const coachSelect = document.getElementById('slotCoach');
        if (coachSelect) {
            coachSelect.innerHTML = `<option value="">Select coach</option>` +
                timetableState.coaches.map(c => `<option value="${c._id}">${c.name}${c.role === 'head_coach' ? ' (Head Coach)' : ''}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading batches/coaches for slot form:', error);
    }
}

// ── Week date helpers ─────────────────────────────────────────

function getWeekDates(offset) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return DAYS_OF_WEEK.map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function formatWeekRange(dates) {
    const start = dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const end = dates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} – ${end}`;
}

function updateWeekNavUI() {
    const weekDates = getWeekDates(timetableState.weekOffset);
    const rangeLabel = document.getElementById('weekRangeLabel');
    if (rangeLabel) rangeLabel.textContent = formatWeekRange(weekDates);

    const title = document.getElementById('weekViewTitle');
    if (title) {
        title.textContent = timetableState.weekOffset === 0 ? 'This Week' :
            timetableState.weekOffset === -1 ? 'Last Week' :
                timetableState.weekOffset === 1 ? 'Next Week' : 'Week View';
    }
}

// ── View rendering ────────────────────────────────────────────

function renderCurrentView() {
    if (timetableState.currentView === 'today') {
        renderTodayView();
    } else {
        renderWeekView();
    }
}

function renderTodayView() {
    const list = document.getElementById('todayList');
    const label = document.getElementById('todayLabel');
    if (!list) return;

    const today = todayName();
    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (label) label.textContent = `Today's Schedule — ${today}, ${dateLabel}`;

    const todaySlots = timetableState.slots
        .filter(s => s.dayOfWeek === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (!todaySlots.length) {
        list.innerHTML = '<div class="empty-state">No sessions scheduled for today.</div>';
        return;
    }

    list.innerHTML = todaySlots.map(buildSlotCard).join('');
    attachSlotCardListeners(list);
}

function renderWeekView() {
    const grid = document.getElementById('weekGrid');
    if (!grid) return;

    const weekDates = getWeekDates(timetableState.weekOffset);
    const todayStr = new Date().toDateString();

    updateWeekNavUI();

    grid.innerHTML = DAYS_OF_WEEK.map((day, i) => {
        const date = weekDates[i];
        const isToday = date.toDateString() === todayStr;
        const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        const daySlots = timetableState.slots
            .filter(s => s.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const cardsHtml = daySlots.length
            ? daySlots.map(buildWeekSlotCard).join('')
            : '<div class="week-day-empty">—</div>';

        return `
            <div class="week-day-col">
                <p class="week-day-header ${isToday ? 'is-today' : ''}">
                    ${day.slice(0, 3)}
                    <span style="display:block;font-size:11px;font-weight:400;color:var(--color-muted);margin-top:2px;">${dateLabel}</span>
                </p>
                ${cardsHtml}
            </div>`;
    }).join('');

    grid.querySelectorAll('.week-slot-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditForm(btn.dataset.id));
    });
    grid.querySelectorAll('.week-slot-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteSlot(btn.dataset.id));
    });
}

function buildSlotCard(slot) {
    const batchName = slot.batch?.name || 'Unknown batch';
    const coachName = slot.coach?.name || 'Unassigned';
    const manageButtons = timetableState.canManage ? `
        <div class="slot-actions">
            <button class="slot-edit-btn" data-id="${slot._id}">Edit</button>
            <button class="slot-delete-btn" data-id="${slot._id}">Delete</button>
        </div>` : '';

    return `
        <div class="slot-card">
            <span class="slot-time">${formatTimeRange(slot.startTime, slot.endTime)}</span>
            <div class="slot-info">
                <p class="slot-activity">${slot.activityType}</p>
                <p class="slot-meta">${batchName} · ${coachName}${slot.location ? ' · ' + slot.location : ''}</p>
            </div>
            ${manageButtons}
        </div>`;
}

function buildWeekSlotCard(slot) {
    const batchName = slot.batch?.name || 'Unknown';
    const coachName = slot.coach?.name || 'Unassigned';
    const manageButtons = timetableState.canManage ? `
        <div class="week-slot-actions">
            <button class="week-slot-edit" data-id="${slot._id}">Edit</button>
            <button class="week-slot-delete" data-id="${slot._id}">Delete</button>
        </div>` : '';

    return `
        <div class="week-slot-card">
            <p class="week-slot-time">${formatTimeRange(slot.startTime, slot.endTime)}</p>
            <p class="week-slot-activity">${slot.activityType}</p>
            <p class="week-slot-meta">${batchName} · ${coachName}</p>
            ${manageButtons}
        </div>`;
}

function attachSlotCardListeners(container) {
    container.querySelectorAll('.slot-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditForm(btn.dataset.id));
    });
    container.querySelectorAll('.slot-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSlot(btn.dataset.id));
    });
}

// ── Add / Edit form ───────────────────────────────────────────

function openAddForm() {
    timetableState.editingId = null;
    document.getElementById('slotFormTitle').textContent = 'Add Timetable Slot';
    document.getElementById('slotForm').reset();
    document.getElementById('slotForm').style.display = 'block';
}

function openEditForm(id) {
    const slot = timetableState.slots.find(s => s._id === id);
    if (!slot) return;

    timetableState.editingId = id;
    document.getElementById('slotFormTitle').textContent = 'Edit Timetable Slot';
    document.getElementById('slotBatch').value = slot.batch?._id || '';
    document.getElementById('slotCoach').value = slot.coach?._id || '';
    document.getElementById('slotDay').value = slot.dayOfWeek;
    document.getElementById('slotActivity').value = slot.activityType;
    document.getElementById('slotStart').value = slot.startTime;
    document.getElementById('slotEnd').value = slot.endTime;
    document.getElementById('slotLocation').value = slot.location || '';
    document.getElementById('slotNotes').value = slot.notes || '';
    document.getElementById('slotForm').style.display = 'block';
    document.getElementById('slotForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeForm() {
    document.getElementById('slotForm').style.display = 'none';
    document.getElementById('slotForm').reset();
    timetableState.editingId = null;
}

async function submitSlotForm(event) {
    event.preventDefault();
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const payload = {
        batch: document.getElementById('slotBatch').value,
        coach: document.getElementById('slotCoach').value,
        dayOfWeek: document.getElementById('slotDay').value,
        activityType: document.getElementById('slotActivity').value,
        startTime: document.getElementById('slotStart').value,
        endTime: document.getElementById('slotEnd').value,
        location: document.getElementById('slotLocation').value,
        notes: document.getElementById('slotNotes').value,
    };

    if (!payload.batch || !payload.coach || !payload.dayOfWeek || !payload.activityType || !payload.startTime || !payload.endTime) {
        alert('Please fill in batch, coach, day, activity, and start/end time.');
        return;
    }

    try {
        const isEdit = !!timetableState.editingId;
        const url = isEdit
            ? `${API_BASE_URL}/timetable/${timetableState.editingId}`
            : `${API_BASE_URL}/timetable`;

        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to save slot');
        closeForm();
        await loadTimetable();
    } catch (error) {
        console.error('Error saving timetable slot:', error);
        alert('Unable to save this slot. Please try again.');
    }
}

async function deleteSlot(id) {
    if (!confirm('Remove this slot from the timetable?')) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE_URL}/timetable/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete slot');
        await loadTimetable();
    } catch (error) {
        console.error('Error deleting timetable slot:', error);
        alert('Unable to delete this slot. Please try again.');
    }
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const user = getStoredUser();
    if (!user || !getToken()) { redirectToLogin(); return; }

    document.getElementById('pageDate').textContent = getTodayHeader();
    timetableState.canManage = canManageTimetable(user);

    if (timetableState.canManage) {
        document.getElementById('addSlotBtn').style.display = 'inline-block';
        await loadBatchesAndCoaches();
    }

    // View toggle
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            timetableState.currentView = btn.dataset.view;
            document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.getElementById('todayView').style.display = btn.dataset.view === 'today' ? 'block' : 'none';
            document.getElementById('weekView').style.display = btn.dataset.view === 'week' ? 'block' : 'none';

            // Show/hide week nav
            const weekNav = document.getElementById('weekNavControls');
            if (weekNav) weekNav.style.display = btn.dataset.view === 'week' ? 'flex' : 'none';

            renderCurrentView();
        });
    });

    // Week navigation
    document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
        timetableState.weekOffset--;
        renderWeekView();
    });
    document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
        timetableState.weekOffset++;
        renderWeekView();
    });
    document.getElementById('jumpToTodayBtn')?.addEventListener('click', () => {
        timetableState.weekOffset = 0;
        const picker = document.getElementById('weekDatePicker');
        if (picker) picker.value = '';
        renderWeekView();
    });
    document.getElementById('weekDatePicker')?.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const picked = new Date(e.target.value);
        const now = new Date();
        const nowMonday = new Date(now);
        nowMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        nowMonday.setHours(0, 0, 0, 0);
        const pickedMonday = new Date(picked);
        pickedMonday.setDate(picked.getDate() - ((picked.getDay() + 6) % 7));
        pickedMonday.setHours(0, 0, 0, 0);
        const diff = Math.round((pickedMonday - nowMonday) / (7 * 24 * 60 * 60 * 1000));
        timetableState.weekOffset = diff;
        renderWeekView();
    });

    document.getElementById('addSlotBtn')?.addEventListener('click', openAddForm);
    document.getElementById('cancelSlotBtn')?.addEventListener('click', closeForm);
    document.getElementById('slotForm')?.addEventListener('submit', submitSlotForm);

    await loadTimetable();
});