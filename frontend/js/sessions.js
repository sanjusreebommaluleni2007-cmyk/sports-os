const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

const ATTACHMENTS = {
    mediaRecorder: null,
    chunks: [],
    duration: 0,
    audioUrl: null,
};

let currentBatches = [];

// ── Sport-based drill types ───────────────────────────────────────────────────
const SPORT_DRILLS = {
    cricket: [
        'Target Bowling', 'Batting Drills', 'Fielding Drills',
        'Throw-downs', 'Net Practice', 'Match Simulation',
        'Fitness Training', 'Video Review',
    ],
    tennis: [
        'Serve Practice', 'Return Drills', 'Baseline Rally',
        'Net Play', 'Match Simulation', 'Footwork Drills',
        'Fitness Training', 'Video Review',
    ],
    kabaddi: [
        'Raid Drills', 'Tackle Practice', 'Do-or-Die Raids',
        'Bonus Line Drills', 'Defense Formation', 'Match Simulation',
        'Fitness Training', 'Video Review',
    ],
};

const DRILL_BADGE_CLASSES = {
    'Target Bowling': 'badge-target',
    'Batting Drills': 'badge-batting',
    'Fielding Drills': 'badge-fielding',
    'Net Practice': 'badge-net',
    'Match Simulation': 'badge-match',
    'Fitness Training': 'badge-fitness',
    'Throw-downs': 'badge-target',
    'Video Review': 'badge-net',
    'Serve Practice': 'badge-target',
    'Return Drills': 'badge-batting',
    'Baseline Rally': 'badge-fielding',
    'Net Play': 'badge-net',
    'Footwork Drills': 'badge-fitness',
    'Raid Drills': 'badge-target',
    'Tackle Practice': 'badge-batting',
    'Do-or-Die Raids': 'badge-match',
    'Bonus Line Drills': 'badge-fielding',
    'Defense Formation': 'badge-net',
};

function getSport() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.sport || 'cricket';
}

function populateDrillTypes() {
    const sport = getSport();
    const drills = SPORT_DRILLS[sport] || SPORT_DRILLS.cricket;
    const select = document.getElementById('drillType');
    select.innerHTML = `<option value="" disabled selected>Select drill type</option>` +
        drills.map(d => `<option value="${d}">${d}</option>`).join('');
}

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

function redirectToLogin() { window.location.href = 'login.html'; }

function getTodayDate() { return new Date().toISOString().slice(0, 10); }

function formatHeaderDate() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${weekday} · ${day} ${month}`;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

async function loadBatches() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/batches`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const batches = await response.json();
        currentBatches = Array.isArray(batches) ? batches : [];

        const select = document.getElementById('sessionBatch');
        select.innerHTML = '<option value="">Select Batch</option>' + currentBatches.map(batch =>
            `<option value="${batch._id}">${batch.name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function populateAthleteDropdown(batchId) {
    const athleteSelect = document.getElementById('sessionAthlete');
    const batch = currentBatches.find(b => b._id === batchId);

    if (!batch || !batch.athletes || batch.athletes.length === 0) {
        athleteSelect.innerHTML = '<option value="">No athletes in this batch</option>';
        return;
    }

    athleteSelect.innerHTML = '<option value="">Select Student</option>' + batch.athletes.map(a =>
        `<option value="${a._id}">${a.name}</option>`
    ).join('');
}

function updateRecordingBanner() {
    const athleteSelect = document.getElementById('sessionAthlete');
    const banner = document.getElementById('recordingStudentBanner');
    const nameSpan = document.getElementById('recordingStudentName');
    const selectedText = athleteSelect.options[athleteSelect.selectedIndex]?.text;

    if (athleteSelect.value && selectedText) {
        nameSpan.textContent = selectedText;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function openEditModal(session) {
    // Re-use the save modal or build an inline edit form
    // Populate drill type
    populateDrillTypes();
    document.getElementById('drillType').value = session.drillType || '';

    // Populate date
    const rawDate = session.sessionDate || session.date;
    document.getElementById('sessionDate').value = rawDate
        ? new Date(rawDate).toISOString().slice(0, 10)
        : getTodayDate();

    // Populate batch & athlete
    document.getElementById('sessionBatch').value = session.batch?._id || session.batch || '';
    populateAthleteDropdown(session.batch?._id || session.batch || '');

    // Wait a tick for athlete dropdown to populate, then set value
    setTimeout(() => {
        const athleteSelect = document.getElementById('sessionAthlete');
        // Try to match by name since we may not have athlete _id
        const opts = Array.from(athleteSelect.options);
        const match = opts.find(o => o.text === session.athleteName);
        if (match) athleteSelect.value = match.value;
        updateRecordingBanner();
    }, 100);

    document.getElementById('coachNotes').value = session.coachNotes || '';

    // Store editing session id so saveSession knows to PATCH
    document.getElementById('saveSessionBtn').dataset.editingId = session._id;
    document.getElementById('saveSessionBtn').textContent = '✏️ Update Session';

    // Scroll to form
    document.querySelector('.session-card').scrollIntoView({ behavior: 'smooth' });
    showToast('Editing session — make changes and click Update Session', 'success');
}

function resetFormToCreate() {
    document.getElementById('saveSessionBtn').removeAttribute('data-editing-id');
    document.getElementById('saveSessionBtn').textContent = '💾 Save Session';
    document.getElementById('drillType').value = '';
    document.getElementById('sessionDate').value = getTodayDate();
    document.getElementById('sessionBatch').value = '';
    document.getElementById('sessionAthlete').innerHTML = '<option value="">Select a batch first</option>';
    document.getElementById('coachNotes').value = '';
    document.getElementById('recordingStudentBanner').style.display = 'none';
    cancelRecording();
}

// ── Load & Render Sessions ────────────────────────────────────────────────────
async function loadSessions() {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const sessions = await response.json();
        const sessionsList = document.getElementById('sessionsList');
        if (!sessionsList) return;

        if (Array.isArray(sessions) && sessions.length > 0) {
            sessionsList.innerHTML = sessions.map((session, index) => {
                const sessionDate = new Date(session.sessionDate || session.date).toLocaleDateString();
                const batchName = session.batch?.name || 'N/A';
                const preview = session.coachNotes ? session.coachNotes.substring(0, 80) : 'No notes added yet.';
                const hasVoice = session.voiceNoteUrl ? '🎤' : '';
                return `
                <div class="recent-session-card" data-session-index="${index}" style="cursor:pointer;">
                    <div class="session-labels">
                        <span class="drill-badge ${getDrillBadgeClass(session.drillType)}">${session.drillType}</span>
                        <span class="session-meta">${sessionDate} | ${batchName}</span>
                    </div>
                    <p class="session-preview">${preview}</p>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="session-icon">${hasVoice}</span>
                        <button class="edit-session-btn" data-session-index="${index}"
                            style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 6px;"
                            title="Edit session">✏️</button>
                        <button class="delete-session-btn" data-session-id="${session._id}"
                            style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 6px;"
                            title="Delete session">🗑️</button>
                    </div>
                </div>`;
            }).join('');

            // Click card → open view modal (ignore edit/delete clicks)
            sessionsList.querySelectorAll('.recent-session-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-session-btn') || e.target.closest('.edit-session-btn')) return;
                    const idx = parseInt(card.dataset.sessionIndex, 10);
                    openSessionModal(sessions[idx]);
                });
            });

            // Edit buttons
            sessionsList.querySelectorAll('.edit-session-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.sessionIndex, 10);
                    openEditModal(sessions[idx]);
                });
            });

            // Delete buttons
            sessionsList.querySelectorAll('.delete-session-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this session? This cannot be undone.')) return;
                    const id = btn.dataset.sessionId;
                    const token = getToken();
                    try {
                        const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) throw new Error('Failed to delete');
                        showToast('Session deleted', 'success');
                        loadSessions();
                    } catch (err) {
                        showToast('Failed to delete session', 'error');
                    }
                });
            });

        } else {
            sessionsList.innerHTML = '<p>No sessions found. Create one to get started!</p>';
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        const sessionsList = document.getElementById('sessionsList');
        if (sessionsList) sessionsList.innerHTML = '<p>Error loading sessions</p>';
    }
}

// ── View Modal ────────────────────────────────────────────────────────────────
function openSessionModal(session) {
    const overlay = document.getElementById('sessionModalOverlay');
    const sessionDate = new Date(session.sessionDate || session.date).toLocaleDateString();
    const batchName = session.batch?.name || 'N/A';
    const loggedByName = session.loggedBy?.name ? `Logged by ${session.loggedBy.name}` : '';

    document.getElementById('modalDrillBadge').className = `drill-badge ${getDrillBadgeClass(session.drillType)}`;
    document.getElementById('modalDrillBadge').textContent = session.drillType;
    document.getElementById('modalDrillType').textContent = session.drillType;
    document.getElementById('modalMeta').textContent = `${sessionDate} · ${batchName}${loggedByName ? ' · ' + loggedByName : ''}`;
    document.getElementById('modalStudent').textContent = session.athleteName ? `Student: ${session.athleteName}` : '';
    document.getElementById('modalNotes').textContent = session.coachNotes || 'No notes added.';

    const audioWrap = document.getElementById('modalAudioWrap');
    const audio = document.getElementById('modalAudio');
    if (session.voiceNoteUrl) {
        audio.src = session.voiceNoteUrl;
        audioWrap.style.display = 'block';
    } else {
        audio.src = '';
        audioWrap.style.display = 'none';
    }

    overlay.style.display = 'flex';
}

function closeSessionModal() {
    document.getElementById('sessionModalOverlay').style.display = 'none';
    document.getElementById('modalAudio').pause();
}

function getDrillBadgeClass(type) {
    return DRILL_BADGE_CLASSES[type] || 'badge-target';
}

// ── Voice Recording ───────────────────────────────────────────────────────────
function beginRecording() {
    const recordBtn = document.getElementById('voiceRecordBtn');
    recordBtn.classList.add('recording');
    recordBtn.textContent = '🔴 Recording... Release to stop';
    ATTACHMENTS.chunks = [];
    ATTACHMENTS.duration = 0;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        ATTACHMENTS.mediaRecorder = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', event => { ATTACHMENTS.chunks.push(event.data); });
        mediaRecorder.addEventListener('stop', () => {
            const blob = new Blob(ATTACHMENTS.chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                ATTACHMENTS.base64Audio = reader.result;
                const audio = document.getElementById('voiceAudio');
                audio.src = reader.result;
                document.getElementById('voicePlaybackText').textContent = `🎤 Voice note recorded — ${ATTACHMENTS.duration}s`;
                document.getElementById('voicePlayback').classList.add('show');
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        const timer = setInterval(() => { ATTACHMENTS.duration += 1; }, 1000);

        recordBtn.addEventListener('mouseup', () => {
            if (ATTACHMENTS.mediaRecorder?.state === 'recording') ATTACHMENTS.mediaRecorder.stop();
            clearInterval(timer);
            recordBtn.classList.remove('recording');
            recordBtn.textContent = '🎙️ Hold to Record Voice Note';
        }, { once: true });
    }).catch(error => {
        console.error('Recording failed:', error);
        showToast('Unable to access microphone.', 'error');
        document.getElementById('voiceRecordBtn').classList.remove('recording');
        document.getElementById('voiceRecordBtn').textContent = '🎙️ Hold to Record Voice Note';
    });
}

function cancelRecording() {
    if (ATTACHMENTS.audioUrl) {
        URL.revokeObjectURL(ATTACHMENTS.audioUrl);
        ATTACHMENTS.audioUrl = null;
    }
    document.getElementById('voicePlayback').classList.remove('show');
    document.getElementById('voiceAudio').src = '';
    ATTACHMENTS.chunks = [];
    ATTACHMENTS.duration = 0;
    ATTACHMENTS.base64Audio = null;
}

// ── Save / Update Session ─────────────────────────────────────────────────────
async function saveSession() {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !user) { redirectToLogin(); return; }

    const drillType = document.getElementById('drillType').value;
    const sessionDate = document.getElementById('sessionDate').value;
    const batchId = document.getElementById('sessionBatch').value;
    const athleteSelect = document.getElementById('sessionAthlete');
    const athleteName = athleteSelect.options[athleteSelect.selectedIndex]?.text || '';
    const coachNotes = document.getElementById('coachNotes').value;

    if (!drillType) { showToast('Please select a drill type.', 'error'); return; }
    if (!sessionDate) { showToast('Please select a session date.', 'error'); return; }

    const editingId = document.getElementById('saveSessionBtn').dataset.editingId;
    const isEditing = !!editingId;

    const payload = {
        drillType,
        sessionDate,
        coachNotes,
        batch: batchId,
        athleteName: athleteSelect.value ? athleteName : undefined,
        loggedBy: user.id,
        voiceNoteUrl: ATTACHMENTS.base64Audio || undefined,
    };

    try {
        const response = await fetch(
            isEditing
                ? `${API_BASE_URL}/sessions/${editingId}`
                : `${API_BASE_URL}/sessions`,
            {
                method: isEditing ? 'PUT' : 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );

        if (response.ok) {
            showToast(isEditing ? '✅ Session updated!' : '✅ Session logged successfully!', 'success');
            resetFormToCreate();
            loadSessions();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to save session.', 'error');
        }
    } catch (error) {
        console.error('Error saving session:', error);
        showToast('Error saving session.', 'error');
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const user = getStoredUser();
    if (user?.role === 'athlete') {
        alert('You do not have access to this page.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('pageDate').textContent = formatHeaderDate();
    document.getElementById('sessionDate').value = getTodayDate();

    populateDrillTypes();

    document.getElementById('sessionBatch').addEventListener('change', (e) => {
        populateAthleteDropdown(e.target.value);
    });

    document.getElementById('sessionAthlete').addEventListener('change', updateRecordingBanner);

    const recordBtn = document.getElementById('voiceRecordBtn');
    recordBtn.addEventListener('mousedown', beginRecording);

    document.getElementById('deleteVoiceBtn')?.addEventListener('click', cancelRecording);
    document.getElementById('saveSessionBtn')?.addEventListener('click', saveSession);
    document.getElementById('closeSessionModal')?.addEventListener('click', closeSessionModal);

    loadBatches();
    loadSessions();
});