const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';

function getToken() {
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        return u?.token || localStorage.getItem('token');
    } catch { return null; }
}

function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

function initials(name) {
    if (!name) return '??';
    const p = name.trim().split(/\s+/);
    return p.length >= 2
        ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
        : p[0][0].toUpperCase();
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ── Search filter ─────────────────────────────────────────────────────────────
document.getElementById('athleteSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#athleteTableBody tr[data-id]').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
});
document.getElementById('coachSearch').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#coachTableBody tr[data-id]').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
});

// ── Athletes ──────────────────────────────────────────────────────────────────
let athletes = [];

async function loadAthletes() {
    try {
        const res = await fetch(`${API_BASE_URL}/roster/athletes`, { headers: authHeaders() });
        athletes = await res.json();
        renderAthletes();
    } catch {
        document.getElementById('athleteTableBody').innerHTML =
            '<tr><td colspan="6" class="empty-state">Failed to load athletes.</td></tr>';
    }
}

function renderAthletes() {
    const tbody = document.getElementById('athleteTableBody');
    if (!athletes.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No athletes yet. Click + Add Athlete to get started.</td></tr>';
        return;
    }
    tbody.innerHTML = athletes.map(a => `
        <tr data-id="${a._id}">
            <td>
                <div class="avatar-cell">
                    <div class="avatar-sm">${initials(a.name)}</div>
                    <span>${a.name}</span>
                </div>
            </td>
            <td>${a.email}</td>
            <td>${a.specialization || '—'}</td>
            <td>${a.phone || '—'}</td>
            <td>${a.batchAssigned || '—'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="openEditAthlete('${a._id}')">✏️ Edit</button>
                    <button class="btn-icon danger" onclick="deleteAthlete('${a._id}', '${a.name}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Athlete modal state
let editAthleteId = null;

function openAddAthlete() {
    editAthleteId = null;
    document.getElementById('athleteModalTitle').textContent = 'Add Athlete';
    ['a_name', 'a_email', 'a_password', 'a_phone', 'a_specialization', 'a_dob', 'a_batch']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('a_password').placeholder = 'Min 6 characters';
    document.getElementById('athleteModal').classList.add('open');
}

function openEditAthlete(id) {
    const a = athletes.find(x => x._id === id);
    if (!a) return;
    editAthleteId = id;
    document.getElementById('athleteModalTitle').textContent = 'Edit Athlete';
    document.getElementById('a_name').value = a.name || '';
    document.getElementById('a_email').value = a.email || '';
    document.getElementById('a_password').value = '';
    document.getElementById('a_password').placeholder = 'Leave blank to keep current';
    document.getElementById('a_phone').value = a.phone || '';
    document.getElementById('a_specialization').value = a.specialization || '';
    document.getElementById('a_dob').value = a.dob || '';
    document.getElementById('a_batch').value = a.batchAssigned || '';
    document.getElementById('athleteModal').classList.add('open');
}

function closeAthleteModal() {
    document.getElementById('athleteModal').classList.remove('open');
}

async function saveAthlete() {
    const btn = document.getElementById('athleteModalSave');
    const body = {
        name: document.getElementById('a_name').value.trim(),
        email: document.getElementById('a_email').value.trim(),
        phone: document.getElementById('a_phone').value.trim(),
        specialization: document.getElementById('a_specialization').value.trim(),
        dob: document.getElementById('a_dob').value,
        batchAssigned: document.getElementById('a_batch').value.trim(),
    };
    const pw = document.getElementById('a_password').value;
    if (pw) body.password = pw;

    if (!body.name || !body.email) { showToast('Name and email are required', 'error'); return; }
    if (!editAthleteId && !pw) { showToast('Password is required for new athletes', 'error'); return; }

    btn.disabled = true;
    try {
        const url = editAthleteId
            ? `${API_BASE_URL}/roster/athletes/${editAthleteId}`
            : `${API_BASE_URL}/roster/athletes`;
        const method = editAthleteId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { showToast(data.message || 'Error saving athlete', 'error'); return; }
        showToast(editAthleteId ? 'Athlete updated' : 'Athlete added');
        closeAthleteModal();
        loadAthletes();
    } catch { showToast('Network error', 'error'); }
    finally { btn.disabled = false; }
}

async function deleteAthlete(id, name) {
    if (!confirm(`Delete athlete "${name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/roster/athletes/${id}`,
            { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { showToast('Failed to delete', 'error'); return; }
        showToast('Athlete deleted');
        loadAthletes();
    } catch { showToast('Network error', 'error'); }
}

document.getElementById('addAthleteBtn').addEventListener('click', openAddAthlete);
document.getElementById('athleteModalCancel').addEventListener('click', closeAthleteModal);
document.getElementById('athleteModalSave').addEventListener('click', saveAthlete);
document.getElementById('athleteModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAthleteModal();
});

// ── Coaches ───────────────────────────────────────────────────────────────────
let coaches = [];

async function loadCoaches() {
    try {
        const res = await fetch(`${API_BASE_URL}/roster/coaches`, { headers: authHeaders() });
        coaches = await res.json();
        renderCoaches();
    } catch {
        document.getElementById('coachTableBody').innerHTML =
            '<tr><td colspan="6" class="empty-state">Failed to load coaches.</td></tr>';
    }
}

function renderCoaches() {
    const tbody = document.getElementById('coachTableBody');
    if (!coaches.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No coaches yet. Click + Add Coach to get started.</td></tr>';
        return;
    }
    tbody.innerHTML = coaches.map(c => `
        <tr data-id="${c._id}">
            <td>
                <div class="avatar-cell">
                    <div class="avatar-sm">${initials(c.name)}</div>
                    <span>${c.name}</span>
                </div>
            </td>
            <td>${c.email}</td>
            <td><span class="role-pill ${c.role}">${c.role === 'head_coach' ? 'Head Coach' : 'Coach'}</span></td>
            <td>${c.specialization || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="openEditCoach('${c._id}')">✏️ Edit</button>
                    <button class="btn-icon danger" onclick="deleteCoach('${c._id}', '${c.name}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

let editCoachId = null;

function openAddCoach() {
    editCoachId = null;
    document.getElementById('coachModalTitle').textContent = 'Add Coach';
    ['c_name', 'c_email', 'c_password', 'c_specialization', 'c_phone']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('c_role').value = 'coach';
    document.getElementById('c_password').placeholder = 'Min 6 characters';
    document.getElementById('coachModal').classList.add('open');
}

function openEditCoach(id) {
    const c = coaches.find(x => x._id === id);
    if (!c) return;
    editCoachId = id;
    document.getElementById('coachModalTitle').textContent = 'Edit Coach';
    document.getElementById('c_name').value = c.name || '';
    document.getElementById('c_email').value = c.email || '';
    document.getElementById('c_password').value = '';
    document.getElementById('c_password').placeholder = 'Leave blank to keep current';
    document.getElementById('c_role').value = c.role || 'coach';
    document.getElementById('c_specialization').value = c.specialization || '';
    document.getElementById('c_phone').value = c.phone || '';
    document.getElementById('coachModal').classList.add('open');
}

function closeCoachModal() {
    document.getElementById('coachModal').classList.remove('open');
}

async function saveCoach() {
    const btn = document.getElementById('coachModalSave');
    const body = {
        name: document.getElementById('c_name').value.trim(),
        email: document.getElementById('c_email').value.trim(),
        role: document.getElementById('c_role').value,
        specialization: document.getElementById('c_specialization').value.trim(),
        phone: document.getElementById('c_phone').value.trim(),
    };
    const pw = document.getElementById('c_password').value;
    if (pw) body.password = pw;

    if (!body.name || !body.email) { showToast('Name and email are required', 'error'); return; }
    if (!editCoachId && !pw) { showToast('Password is required for new coaches', 'error'); return; }

    btn.disabled = true;
    try {
        const url = editCoachId
            ? `${API_BASE_URL}/roster/coaches/${editCoachId}`
            : `${API_BASE_URL}/roster/coaches`;
        const method = editCoachId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { showToast(data.message || 'Error saving coach', 'error'); return; }
        showToast(editCoachId ? 'Coach updated' : 'Coach added');
        closeCoachModal();
        loadCoaches();
    } catch { showToast('Network error', 'error'); }
    finally { btn.disabled = false; }
}

async function deleteCoach(id, name) {
    if (!confirm(`Delete coach "${name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/roster/coaches/${id}`,
            { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { showToast('Failed to delete', 'error'); return; }
        showToast('Coach deleted');
        loadCoaches();
    } catch { showToast('Network error', 'error'); }
}

document.getElementById('addCoachBtn').addEventListener('click', openAddCoach);
document.getElementById('coachModalCancel').addEventListener('click', closeCoachModal);
document.getElementById('coachModalSave').addEventListener('click', saveCoach);
document.getElementById('coachModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCoachModal();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadAthletes();
loadCoaches();