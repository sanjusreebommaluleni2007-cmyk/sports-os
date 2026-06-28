const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';

function getToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || localStorage.getItem('token');
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

const feesState = {
    fees: [],
    athletes: [],
    selectedMonthKey: null,
    pieMode: 'count',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function formatCurrency(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInputValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

// ── Fee status helper ─────────────────────────────────────────
// Returns 'paid' | 'partial' | 'late'
function getFeeStatus(item) {
    const total = Number(item.amount || 0);
    const paid = Number(item.paidAmount || 0);
    if (item.feePaid || paid >= total) return 'paid';
    if (paid > 0 && paid < total) return 'partial';
    return 'late';
}

// ── Month-key helpers ─────────────────────────────────────────
function monthKeyFromLabel(label) {
    if (!label) return null;
    const match = String(label).trim().match(/([A-Za-z]+)\s+(\d{4})/);
    if (!match) return null;
    const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
    if (monthIndex === -1) return null;
    return `${match[2]}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function monthKeyFromDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getFeeMonthKey(item) {
    return monthKeyFromLabel(item.feeMonth) || monthKeyFromDate(item.dueDate) || monthKeyFromDate(item.createdAt);
}

function monthKeyToLabel(key) {
    if (!key) return 'Unknown';
    const [year, month] = key.split('-');
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonthKey(key, delta) {
    const [year, month] = key.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '00')}`;
}

// ── Data loading ──────────────────────────────────────────────
async function loadAthletes() {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/batches`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const batches = await res.json();

    feesState.athletes = [];
    if (Array.isArray(batches)) {
        batches.forEach(b => (b.athletes || []).forEach(a => feesState.athletes.push(a)));
    }

    const select = document.getElementById('feeAthleteSelect');
    if (!select) return;

    if (feesState.athletes.length === 0) {
        select.innerHTML = `<option value="">No athletes found</option>`;
        return;
    }

    select.innerHTML =
        `<option value="">Select athlete</option>` +
        feesState.athletes.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
}

async function fetchFees() {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
        const res = await fetch(`${API_BASE_URL}/resources?type=fee`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Unable to load fee records');
        const data = await res.json();
        feesState.fees = Array.isArray(data) ? data : [];

        populateMonthSelect();
        renderTrendBar();
        renderMonthView();
    } catch (error) {
        console.error('Error loading fee records:', error);
        const feeList = document.getElementById('feeList');
        if (feeList) feeList.innerHTML = '<div class="empty-state">Unable to load fee records.</div>';
    }
}

// ── Month dropdown ────────────────────────────────────────────
function populateMonthSelect() {
    const select = document.getElementById('feeMonthSelect');
    if (!select) return;

    const keysInData = new Set(feesState.fees.map(getFeeMonthKey).filter(Boolean));
    keysInData.add(currentMonthKey());

    const sortedKeys = Array.from(keysInData).sort().reverse();

    if (!feesState.selectedMonthKey || !sortedKeys.includes(feesState.selectedMonthKey)) {
        feesState.selectedMonthKey = sortedKeys.includes(currentMonthKey())
            ? currentMonthKey()
            : sortedKeys[0];
    }

    select.innerHTML = sortedKeys
        .map(key => `<option value="${key}" ${key === feesState.selectedMonthKey ? 'selected' : ''}>${monthKeyToLabel(key)}</option>`)
        .join('');

    select.onchange = () => {
        feesState.selectedMonthKey = select.value;
        renderTrendBar();
        renderMonthView();
    };
}

// ── 6-month trend bar ─────────────────────────────────────────
function renderTrendBar() {
    const wrap = document.getElementById('feeTrendBar');
    if (!wrap) return;

    const anchor = feesState.selectedMonthKey || currentMonthKey();
    const keys = [];
    for (let i = 5; i >= 0; i--) keys.push(shiftMonthKey(anchor, -i));

    const totals = keys.map(key => {
        const recordsInMonth = feesState.fees.filter(f => getFeeMonthKey(f) === key);
        return recordsInMonth.reduce((sum, f) => sum + Number(f.paidAmount || (f.feePaid ? f.amount : 0) || 0), 0);
    });

    const max = Math.max(...totals, 1);

    wrap.innerHTML = keys.map((key, i) => {
        const heightPct = Math.max(6, Math.round((totals[i] / max) * 100));
        const isSelected = key === feesState.selectedMonthKey;
        const [, m] = key.split('-');
        const shortLabel = MONTH_NAMES[Number(m) - 1].slice(0, 3);
        return `
        <div class="trend-col ${isSelected ? 'selected' : ''}" data-key="${key}" title="${monthKeyToLabel(key)} · ${formatCurrency(totals[i])}">
            <div class="trend-col-bar-wrap">
                <div class="trend-col-bar" style="height:${heightPct}%"></div>
            </div>
            <div class="trend-col-label">${shortLabel}</div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.trend-col').forEach(col => {
        col.addEventListener('click', () => {
            feesState.selectedMonthKey = col.dataset.key;
            const select = document.getElementById('feeMonthSelect');
            if (select) {
                if (![...select.options].some(o => o.value === col.dataset.key)) {
                    const opt = document.createElement('option');
                    opt.value = col.dataset.key;
                    opt.textContent = monthKeyToLabel(col.dataset.key);
                    select.appendChild(opt);
                }
                select.value = col.dataset.key;
            }
            renderTrendBar();
            renderMonthView();
        });
    });
}

// ── Month view ────────────────────────────────────────────────
function renderMonthView() {
    const monthFees = feesState.fees.filter(f => getFeeMonthKey(f) === feesState.selectedMonthKey);

    const monthLabel = document.getElementById('recordsMonthLabel');
    if (monthLabel) monthLabel.textContent = monthKeyToLabel(feesState.selectedMonthKey);

    renderSummary(monthFees);
    renderPieChart(monthFees);
    renderFees(monthFees);
}

function renderSummary(monthFees) {
    const paid = monthFees.filter(f => getFeeStatus(f) === 'paid');
    const partial = monthFees.filter(f => getFeeStatus(f) === 'partial');
    const late = monthFees.filter(f => getFeeStatus(f) === 'late');

    // Total collected = fully paid amounts + partial amounts paid so far
    const totalCollected =
        paid.reduce((sum, f) => sum + Number(f.amount || 0), 0) +
        partial.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);

    // Total due = unpaid balance (late full + partial remaining)
    const totalDue =
        late.reduce((sum, f) => sum + Number(f.amount || 0), 0) +
        partial.reduce((sum, f) => sum + (Number(f.amount || 0) - Number(f.paidAmount || 0)), 0);

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    setText('summaryCollected', formatCurrency(totalCollected));
    setText('summaryPaidCount', String(paid.length));
    setText('summaryPartialCount', String(partial.length));
    setText('summaryLateCount', String(late.length));
    setText('summaryTotalDue', formatCurrency(totalDue));
}

// ── Pie chart ─────────────────────────────────────────────────
function renderPieChart(monthFees) {
    const svg = document.getElementById('feePieChart');
    if (!svg) return;

    const paid = monthFees.filter(f => getFeeStatus(f) === 'paid');
    const partial = monthFees.filter(f => getFeeStatus(f) === 'partial');
    const late = monthFees.filter(f => getFeeStatus(f) === 'late');

    let paidVal, partialVal, lateVal;
    if (feesState.pieMode === 'amount') {
        paidVal = paid.reduce((s, f) => s + Number(f.amount || 0), 0);
        partialVal = partial.reduce((s, f) => s + Number(f.paidAmount || 0), 0);
        lateVal = late.reduce((s, f) => s + Number(f.amount || 0), 0);
    } else {
        paidVal = paid.length;
        partialVal = partial.length;
        lateVal = late.length;
    }

    document.getElementById('pieLegendPaid').textContent = feesState.pieMode === 'amount' ? formatCurrency(paidVal) : paidVal;
    document.getElementById('pieLegendPartial').textContent = feesState.pieMode === 'amount' ? formatCurrency(partialVal) : partialVal;
    document.getElementById('pieLegendLate').textContent = feesState.pieMode === 'amount' ? formatCurrency(lateVal) : lateVal;

    const total = paidVal + partialVal + lateVal;
    if (total === 0) {
        svg.innerHTML = `<circle cx="60" cy="60" r="50" fill="#F3F4F6" />`;
        return;
    }

    svg.innerHTML = buildThreeSlicePie(paidVal / total, partialVal / total, lateVal / total);
}

function buildThreeSlicePie(paidFrac, partialFrac, lateFrac) {
    const cx = 60, cy = 60, r = 50;
    if (lateFrac <= 0 && partialFrac <= 0) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#16A34A" />`;
    if (paidFrac <= 0 && partialFrac <= 0) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#DC2626" />`;

    function polarToXY(fraction) {
        const angle = fraction * 2 * Math.PI;
        return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
    }

    const [x1, y1] = polarToXY(paidFrac);
    const [x2, y2] = polarToXY(paidFrac + partialFrac);

    const la1 = paidFrac > 0.5 ? 1 : 0;
    const la2 = partialFrac > 0.5 ? 1 : 0;
    const la3 = lateFrac > 0.5 ? 1 : 0;

    const paidPath = `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${la1} 1 ${x1},${y1} Z`;
    const partialPath = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${la2} 1 ${x2},${y2} Z`;
    const latePath = `M${cx},${cy} L${x2},${y2} A${r},${r} 0 ${la3} 1 ${cx},${cy - r} Z`;

    return `
        <path d="${latePath}"    fill="#DC2626" />
        <path d="${partialPath}" fill="#F59E0B" />
        <path d="${paidPath}"    fill="#16A34A" />
    `;
}

// ── Fee row builder ───────────────────────────────────────────
function buildFeeRow(item) {
    const status = getFeeStatus(item);
    const total = Number(item.amount || 0);
    const paidAmt = Number(item.paidAmount || 0);
    const balance = total - paidAmt;

    const badgeLabel = status === 'paid' ? 'PAID' : status === 'partial' ? 'PARTIAL' : 'LATE';

    // Show remaining balance for partial records
    const balanceInfo = status === 'partial'
        ? `<div class="partial-balance">Paid ${formatCurrency(paidAmt)} · Balance <strong>${formatCurrency(balance)}</strong></div>`
        : '';

    return `
        <div class="fee-row" data-fee-id="${item._id}">
            <div class="fee-cell fee-athlete">${item.athleteName || 'Unknown Athlete'}</div>
            <div class="fee-cell">${item.feeMonth || '—'}</div>
            <div class="fee-cell fee-amount">${formatCurrency(total)}</div>
            <div class="fee-cell">${formatDate(item.dueDate)}</div>
            <div class="fee-cell">
                <span class="fee-badge ${status}" data-id="${item._id}">${badgeLabel}</span>
                ${balanceInfo}
            </div>
            <div class="fee-cell fee-actions">
                ${status !== 'paid' ? `<button class="partial-pay-btn btn-secondary" data-id="${item._id}" data-balance="${balance}" data-total="${total}">💰 Partial Pay</button>` : ''}
                <button class="edit-fee-btn" data-id="${item._id}">Edit</button>
            </div>
        </div>

        <!-- Partial payment panel -->
        <div class="partial-pay-panel" data-partial-panel="${item._id}" style="display:none;">
            <div class="partial-pay-inner">
                <p>Total: <strong>${formatCurrency(total)}</strong> &nbsp;|&nbsp; Already paid: <strong>${formatCurrency(paidAmt)}</strong> &nbsp;|&nbsp; Remaining: <strong>${formatCurrency(balance)}</strong></p>
                <div class="partial-pay-row">
                    <label class="filter-label">NOW PAYING (₹)</label>
                    <input type="number" min="1" max="${balance}" step="1" class="form-control partial-amount-input" data-id="${item._id}" placeholder="Enter amount" style="width:160px;">
                    <button class="btn-primary confirm-partial-btn" data-id="${item._id}" data-paid-so-far="${paidAmt}" data-total="${total}">Confirm</button>
                    <button class="btn-secondary cancel-partial-btn" data-id="${item._id}">Cancel</button>
                </div>
            </div>
        </div>

        <!-- Edit form -->
        <form class="fee-edit-form" data-edit-form="${item._id}" style="display:none;">
            <div class="fee-form-grid">
                <div class="form-group">
                    <label class="filter-label">FEE MONTH</label>
                    <input type="text" class="form-control edit-month" value="${item.feeMonth || ''}" placeholder="e.g. June 2026">
                </div>
                <div class="form-group">
                    <label class="filter-label">AMOUNT (₹)</label>
                    <input type="number" min="0" step="1" class="form-control edit-amount" value="${item.amount || 0}">
                </div>
                <div class="form-group">
                    <label class="filter-label">DUE DATE</label>
                    <input type="date" class="form-control edit-duedate" value="${toDateInputValue(item.dueDate)}">
                </div>
            </div>
            <div class="fee-form-buttons">
                <button type="button" class="btn-secondary cancel-edit-btn" data-id="${item._id}">Cancel</button>
                <button type="button" class="btn-primary save-edit-btn" data-id="${item._id}">Save Changes</button>
            </div>
        </form>
    `;
}

function renderFees(monthFees) {
    const feeList = document.getElementById('feeList');
    if (!feeList) return;

    if (!monthFees.length) {
        feeList.innerHTML = '<div class="empty-state">No fee records for this month yet.</div>';
        return;
    }

    feeList.innerHTML = monthFees.map(buildFeeRow).join('');
    attachRowListeners();
}

function attachRowListeners() {
    // Toggle PAID / LATE by clicking the badge (only for non-partial)
    document.querySelectorAll('.fee-badge').forEach(badge => {
        badge.addEventListener('click', async () => {
            const id = badge.dataset.id;
            const item = feesState.fees.find(e => e._id === id);
            if (!item) return;

            const status = getFeeStatus(item);
            if (status === 'partial') return; // use partial pay panel instead

            item.feePaid = !item.feePaid;
            if (item.feePaid) item.paidAmount = item.amount; // full pay
            else item.paidAmount = 0;

            await patchFee(id, { feePaid: item.feePaid, paidAmount: item.paidAmount });
        });
    });

    // Open / close partial pay panel
    document.querySelectorAll('.partial-pay-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const panel = document.querySelector(`.partial-pay-panel[data-partial-panel="${id}"]`);
            if (!panel) return;
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.cancel-partial-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = document.querySelector(`.partial-pay-panel[data-partial-panel="${btn.dataset.id}"]`);
            if (panel) panel.style.display = 'none';
        });
    });

    // Confirm partial payment
    document.querySelectorAll('.confirm-partial-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const paidSoFar = Number(btn.dataset.paidSoFar || 0);
            const total = Number(btn.dataset.total || 0);
            const input = document.querySelector(`.partial-amount-input[data-id="${id}"]`);
            const nowPaying = Number(input?.value || 0);

            if (!nowPaying || nowPaying <= 0) {
                alert('Please enter a valid amount.');
                return;
            }

            const newPaidAmount = paidSoFar + nowPaying;

            if (newPaidAmount > total) {
                alert(`Amount exceeds balance. Max you can pay now: ₹${total - paidSoFar}`);
                return;
            }

            const isFullyPaid = newPaidAmount >= total;

            await patchFee(id, {
                paidAmount: newPaidAmount,
                feePaid: isFullyPaid,
            });
        });
    });

    // Edit form toggle
    document.querySelectorAll('.edit-fee-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const form = document.querySelector(`.fee-edit-form[data-edit-form="${id}"]`);
            if (!form) return;
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const item = feesState.fees.find(e => e._id === id);
            const form = document.querySelector(`.fee-edit-form[data-edit-form="${id}"]`);
            if (!form || !item) return;
            form.querySelector('.edit-month').value = item.feeMonth || '';
            form.querySelector('.edit-amount').value = item.amount || 0;
            form.querySelector('.edit-duedate').value = toDateInputValue(item.dueDate);
            form.style.display = 'none';
        });
    });

    document.querySelectorAll('.save-edit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const form = document.querySelector(`.fee-edit-form[data-edit-form="${id}"]`);
            if (!form) return;
            await patchFee(id, {
                feeMonth: form.querySelector('.edit-month').value,
                amount: Number(form.querySelector('.edit-amount').value || 0),
                dueDate: form.querySelector('.edit-duedate').value,
            });
            form.style.display = 'none';
        });
    });
}

async function patchFee(id, updates) {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
        const res = await fetch(`${API_BASE_URL}/resources/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Failed to update fee record');

        const updated = await res.json();
        const index = feesState.fees.findIndex(e => e._id === updated._id);
        if (index > -1) feesState.fees[index] = updated;

        populateMonthSelect();
        renderTrendBar();
        renderMonthView();
    } catch (error) {
        console.error('Error updating fee record:', error);
        alert('Unable to update fee record. Please try again.');
    }
}

async function createFee(event) {
    event.preventDefault();
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const athleteName = document.getElementById('feeAthleteSelect').value;
    const feeMonth = document.getElementById('feeMonthInput').value;
    const amount = Number(document.getElementById('feeAmountInput').value || 0);
    const dueDate = document.getElementById('feeDueDateInput').value;
    const feePaid = document.getElementById('feePaidCheckbox').checked;

    if (!athleteName || !feeMonth || !dueDate) {
        alert('Please fill in athlete, month, and due date.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                type: 'fee', name: `${athleteName} Fee — ${feeMonth}`,
                athleteName, feeMonth, amount, dueDate, feePaid,
                paidAmount: feePaid ? amount : 0,
            }),
        });
        if (!res.ok) throw new Error('Failed to create fee record');

        const created = await res.json();
        const newKey = getFeeMonthKey(created);
        if (newKey) feesState.selectedMonthKey = newKey;

        closeAddFeeForm();
        await fetchFees();
    } catch (error) {
        console.error('Error creating fee record:', error);
        alert('Unable to add fee record. Please try again.');
    }
}

function openAddFeeForm() { document.getElementById('addFeeForm').style.display = 'block'; }
function closeAddFeeForm() {
    const form = document.getElementById('addFeeForm');
    form.style.display = 'none';
    form.reset();
}

function getTodayHeader() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${weekday} · ${day} ${month}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    document.getElementById('pageDate').textContent = getTodayHeader();

    document.getElementById('toggleAddFeeBtn')?.addEventListener('click', () => {
        const form = document.getElementById('addFeeForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('cancelAddFeeBtn')?.addEventListener('click', closeAddFeeForm);
    document.getElementById('addFeeForm')?.addEventListener('submit', createFee);

    document.querySelectorAll('.pie-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            feesState.pieMode = btn.dataset.mode;
            document.querySelectorAll('.pie-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
            const monthFees = feesState.fees.filter(f => getFeeMonthKey(f) === feesState.selectedMonthKey);
            renderPieChart(monthFees);
        });
    });

    await loadAthletes();
    await fetchFees();
});