// ── Log Score Modal ──────────────────────────────────────────────────────────

const SPORT_METRICS_MODAL = {
    cricket: ['Batting Strike Rate', 'Bowling Speed (km/h)', 'Fielding Accuracy (%)', 'Bowling Economy', 'Batting Average', 'Catches per Session'],
    tennis: ['Serve Speed (km/h)', 'First Serve %', 'Rally Win %', 'Ace Count', 'Double Fault %', 'Break Points Won %'],
    kabaddi: ['Raid Points', 'Tackle Points', 'Super Raids', 'Bonus Points', 'Do-or-Die Raid Success %', 'Tackle Success %'],
};

function getModalSport() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.sport || 'cricket';
}

function getModalMetrics() {
    return SPORT_METRICS_MODAL[getModalSport()] || SPORT_METRICS_MODAL.cricket;
}

function injectLogScoreButton() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role === 'athlete') return;

    const athleteGroup = document.getElementById('athleteGroup');
    if (!athleteGroup) return;

    const btn = document.createElement('button');
    btn.id = 'openLogScoreBtn';
    btn.textContent = '+ Log Score';
    btn.style.cssText = `margin-top:12px;padding:10px 20px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;width:100%;`;
    btn.onclick = openLogScoreModal;
    athleteGroup.appendChild(btn);

    const modal = document.createElement('div');
    modal.id = 'logScoreModal';
    modal.style.cssText = `display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;`;
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:32px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
            <h2 style="margin:0 0 24px;font-size:20px;color:#1e3a5f;">Log Performance Score</h2>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">ATHLETE</label>
                <select id="logAthleteSelect" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;">
                    <option value="">Select athlete...</option>
                </select>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">METRIC</label>
                <select id="logMetricSelect" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;">
                    ${getModalMetrics().map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">SCORE</label>
                <input id="logScoreValue" type="number" step="0.1" placeholder="e.g. 142.5" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;box-sizing:border-box;"/>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">BENCHMARK (optional)</label>
                <input id="logBenchmarkValue" type="number" step="0.1" placeholder="e.g. 143" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;box-sizing:border-box;"/>
            </div>
            <div style="margin-bottom:24px;">
                <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">DATE</label>
                <input id="logScoreDate" type="date" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;box-sizing:border-box;"/>
            </div>
            <div id="logScoreError" style="color:#DC2626;font-size:13px;margin-bottom:12px;display:none;"></div>
            <div style="display:flex;gap:12px;">
                <button onclick="closeLogScoreModal()" style="flex:1;padding:12px;background:#F3F4F6;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;color:#374151;">Cancel</button>
                <button onclick="submitLogScore()" style="flex:1;padding:12px;background:#1e3a5f;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;color:white;">Save Score</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function openLogScoreModal() {
    const modal = document.getElementById('logScoreModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const dateInput = document.getElementById('logScoreDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const select = document.getElementById('logAthleteSelect');
    if (select && currentAthletes.length) {
        select.innerHTML = '<option value="">Select athlete...</option>' +
            currentAthletes.map(a => `<option value="${a._id}">${a.name}</option>`).join('');
    }

    const mainSelect = document.getElementById('athleteSelect');
    if (mainSelect?.value) select.value = mainSelect.value;

    const mainMetric = document.getElementById('metricSelect');
    if (mainMetric) {
        const key = mainMetric.value.split(':')[1];
        const logMetric = document.getElementById('logMetricSelect');
        if (logMetric && getModalMetrics().includes(key)) logMetric.value = key;
    }
}

function closeLogScoreModal() {
    const modal = document.getElementById('logScoreModal');
    if (modal) modal.style.display = 'none';
    const err = document.getElementById('logScoreError');
    if (err) err.style.display = 'none';
}

async function submitLogScore() {
    const athleteId = document.getElementById('logAthleteSelect')?.value;
    const metric = document.getElementById('logMetricSelect')?.value;
    const value = parseFloat(document.getElementById('logScoreValue')?.value);
    const benchmark = parseFloat(document.getElementById('logBenchmarkValue')?.value) || null;
    const recordedDate = document.getElementById('logScoreDate')?.value;
    const errEl = document.getElementById('logScoreError');

    if (!athleteId || !metric || isNaN(value) || !recordedDate) {
        errEl.textContent = 'Please fill in athlete, metric, score and date.';
        errEl.style.display = 'block';
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.token;

    try {
        const res = await fetch(`${API_BASE_URL}/performance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ athleteId, metric, value, benchmark, recordedDate })
        });
        if (!res.ok) throw new Error('Failed to save');
        closeLogScoreModal();
        const mainAthleteSelect = document.getElementById('athleteSelect');
        const mainMetricSelect = document.getElementById('metricSelect');
        if (mainAthleteSelect) mainAthleteSelect.value = athleteId;
        if (mainMetricSelect) {
            const matchingOption = [...mainMetricSelect.options].find(o => o.value.includes(metric));
            if (matchingOption) mainMetricSelect.value = matchingOption.value;
        }
        initChart(mainMetricSelect?.value);
        showToast('Score saved!');
    } catch (e) {
        errEl.textContent = 'Error saving score. Try again.';
        errEl.style.display = 'block';
    }
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:32px;right:32px;background:#1e3a5f;color:white;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectLogScoreButton, 500);
});