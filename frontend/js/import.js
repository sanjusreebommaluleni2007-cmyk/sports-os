const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────
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

// ── State ─────────────────────────────────────────────────────────────────────
let parsedRows = [];
let fileBase64 = '';
let currentFile = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');
const clearFileBtn = document.getElementById('clearFile');
const previewBtn = document.getElementById('previewBtn');

const stepUpload = document.getElementById('step-upload');
const stepPreview = document.getElementById('step-preview');
const stepResult = document.getElementById('step-result');

const previewMeta = document.getElementById('previewMeta');
const previewBody = document.getElementById('previewBody');
const previewErrors = document.getElementById('previewErrors');
const backToUpload = document.getElementById('backToUpload');
const confirmBtn = document.getElementById('confirmImport');
const cancelBtn = document.getElementById('cancelImport');
const importSpinner = document.getElementById('importSpinner');

const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultSubtitle = document.getElementById('resultSubtitle');
const resultStats = document.getElementById('resultStats');
const resultErrors = document.getElementById('resultErrors');
const importAnother = document.getElementById('importAnother');
const downloadTpl = document.getElementById('downloadTemplate');

// ── Utility ───────────────────────────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function getRowValue(row, key) {
    const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return found ? (row[found] || '').toString().trim() : '';
}

const VALID_TYPES = ['athlete', 'coach', 'head_coach'];

function validateRow(row, index) {
    const type = getRowValue(row, 'type').toLowerCase();
    const name = getRowValue(row, 'name');
    const email = getRowValue(row, 'email');
    const password = getRowValue(row, 'password');
    const errors = [];

    if (!type) errors.push('missing type');
    if (!name) errors.push('missing name');
    if (!email) errors.push('missing email');
    if (!password) errors.push('missing password');
    if (type && !VALID_TYPES.includes(type)) errors.push(`invalid type "${type}"`);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('invalid email');

    return errors;
}

// ── File handling ─────────────────────────────────────────────────────────────
function handleFile(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
        alert('Please upload an .xlsx or .xls file.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('File is too large. Maximum size is 10 MB.');
        return;
    }

    currentFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatBytes(file.size);
    show(fileInfo);
    dropZone.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = (e) => {
        fileBase64 = e.target.result.split(',')[1];

        const workbook = XLSX.read(atob(fileBase64), { type: 'binary', cellDates: true });
        const user = getStoredUser();
        const sheetName = workbook.SheetNames.find(
            name => name.toLowerCase() === (user?.sport || '').toLowerCase()
        ) || workbook.SheetNames[0];
        parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        previewBtn.disabled = parsedRows.length === 0;
    };
    reader.readAsDataURL(file);
}

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

clearFileBtn.addEventListener('click', () => {
    currentFile = null;
    fileBase64 = '';
    parsedRows = [];
    fileInput.value = '';
    hide(fileInfo);
    dropZone.classList.remove('has-file');
    previewBtn.disabled = true;
});

// ── Preview ───────────────────────────────────────────────────────────────────
previewBtn.addEventListener('click', () => {
    if (!parsedRows.length) return;

    previewBody.innerHTML = '';
    const rowErrors = [];

    parsedRows.forEach((row, i) => {
        const errors = validateRow(row, i);
        const type = getRowValue(row, 'type').toLowerCase();
        const name = getRowValue(row, 'name');
        const email = getRowValue(row, 'email');
        const batch = getRowValue(row, 'batch');
        const phone = getRowValue(row, 'phone');
        const hasErr = errors.length > 0;

        if (hasErr) rowErrors.push(`Row ${i + 2}: ${errors.join(', ')}.`);

        const tr = document.createElement('tr');
        tr.className = hasErr ? 'row-error' : '';
        tr.innerHTML = `
            <td>${i + 2}</td>
            <td>${type ? `<span class="type-badge type-${type}">${type}</span>` : '<span class="type-badge type-invalid">—</span>'}</td>
            <td>${name || '<span class="text-muted">—</span>'}</td>
            <td class="email-cell">${email || '<span class="text-muted">—</span>'}</td>
            <td>${batch || '<span class="text-muted">no batch</span>'}</td>
            <td>${phone || '<span class="text-muted">—</span>'}</td>
            <td>${hasErr
                ? `<span class="status-badge error">⚠ ${errors[0]}${errors.length > 1 ? ` +${errors.length - 1}` : ''}</span>`
                : '<span class="status-badge success">✓ OK</span>'
            }</td>
        `;
        previewBody.appendChild(tr);
    });

    const validCount = parsedRows.length - rowErrors.length;
    previewMeta.textContent = `${parsedRows.length} rows found · ${validCount} valid · ${rowErrors.length} with errors`;

    if (rowErrors.length) {
        previewErrors.innerHTML = `
            <p class="error-title">⚠ ${rowErrors.length} row${rowErrors.length > 1 ? 's' : ''} have issues and will be skipped:</p>
            <ul>${rowErrors.map(e => `<li>${e}</li>`).join('')}</ul>
        `;
        show(previewErrors);
    } else {
        hide(previewErrors);
    }

    confirmBtn.disabled = validCount === 0;

    hide(stepUpload);
    show(stepPreview);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

backToUpload.addEventListener('click', () => { hide(stepPreview); show(stepUpload); });
cancelBtn.addEventListener('click', () => { hide(stepPreview); show(stepUpload); });

// ── Confirm & Import ──────────────────────────────────────────────────────────
confirmBtn.addEventListener('click', async () => {
    if (!fileBase64) return;

    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    show(importSpinner);

    try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/import/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fileData: fileBase64 })
        });

        const data = await res.json();

        hide(stepPreview);
        show(stepResult);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!res.ok) {
            resultIcon.textContent = '❌';
            resultTitle.textContent = 'Import Failed';
            resultSubtitle.textContent = data.message || 'An error occurred.';
            resultStats.innerHTML = '';
        } else {
            const hasErrors = data.errors && data.errors.length > 0;
            resultIcon.textContent = hasErrors ? '⚠️' : '✅';
            resultTitle.textContent = 'Import Complete';
            resultSubtitle.textContent = `Finished processing ${currentFile?.name || 'file'}.`;

            resultStats.innerHTML = `
                <div class="stat-pill success">
                    <span class="stat-num">${data.created}</span>
                    <span class="stat-lbl">Created</span>
                </div>
                <div class="stat-pill update">
                    <span class="stat-num">${data.updated}</span>
                    <span class="stat-lbl">Updated</span>
                </div>
                <div class="stat-pill skip">
                    <span class="stat-num">${data.skipped}</span>
                    <span class="stat-lbl">Skipped</span>
                </div>
                <div class="stat-pill batch">
                    <span class="stat-num">${data.batchesProcessed ?? '—'}</span>
                    <span class="stat-lbl">Batches</span>
                </div>
            `;

            if (hasErrors) {
                resultErrors.innerHTML = `
                    <p class="error-title">⚠ Rows skipped due to errors:</p>
                    <ul>${data.errors.map(e => `<li>${e}</li>`).join('')}</ul>
                `;
                show(resultErrors);
            } else {
                hide(resultErrors);
            }
        }

    } catch (err) {
        hide(stepPreview);
        show(stepResult);
        resultIcon.textContent = '❌';
        resultTitle.textContent = 'Network Error';
        resultSubtitle.textContent = 'Could not reach the server. Check your connection and try again.';
        resultStats.innerHTML = '';
        console.error('Import error:', err);
    } finally {
        hide(importSpinner);
    }
});

// ── Import Another ────────────────────────────────────────────────────────────
importAnother.addEventListener('click', () => {
    parsedRows = [];
    fileBase64 = '';
    currentFile = null;
    fileInput.value = '';
    hide(fileInfo);
    dropZone.classList.remove('has-file');
    previewBtn.disabled = true;
    previewBody.innerHTML = '';
    hide(previewErrors);
    hide(resultErrors);
    confirmBtn.disabled = false;
    cancelBtn.disabled = false;

    hide(stepResult);
    show(stepUpload);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Download Template ─────────────────────────────────────────────────────────
downloadTpl.addEventListener('click', (e) => {
    e.preventDefault();

    const user = getStoredUser();
    const sport = user?.sport || 'cricket';

    const TEMPLATES = {
        cricket: [
            { type: 'head_coach', name: 'Anil Kumble', email: 'anil@academy.com', password: 'Coach@2024', batch: 'U-19 Elite', phone: '9800000001', dob: '17/10/1970' },
            { type: 'coach', name: 'Zaheer Khan', email: 'zaheer@academy.com', password: 'Coach@2024', batch: 'U-16 Elite', phone: '9800000002', dob: '07/10/1978' },
            { type: 'athlete', name: 'Rohit Sharma', email: 'rohit@academy.com', password: 'Athlete@2024', batch: 'U-16 Elite', phone: '9800000003', dob: '30/04/2008' },
            { type: 'athlete', name: 'Shubman Gill', email: 'shubman@academy.com', password: 'Athlete@2024', batch: 'U-19 Elite', phone: '9800000004', dob: '08/09/2007' },
        ],
        tennis: [
            { type: 'head_coach', name: 'Mahesh Bhupathi', email: 'mahesh@academy.com', password: 'Coach@2024', batch: 'Juniors A', phone: '9800000001', dob: '07/06/1974' },
            { type: 'coach', name: 'Leander Paes', email: 'leander@academy.com', password: 'Coach@2024', batch: 'Juniors B', phone: '9800000002', dob: '17/06/1973' },
            { type: 'athlete', name: 'Sumit Nagal', email: 'sumit@academy.com', password: 'Athlete@2024', batch: 'Juniors A', phone: '9800000003', dob: '16/08/2007' },
            { type: 'athlete', name: 'Yuki Bhambri', email: 'yuki@academy.com', password: 'Athlete@2024', batch: 'Juniors B', phone: '9800000004', dob: '04/09/2007' },
        ],
        kabaddi: [
            { type: 'head_coach', name: 'Anup Kumar', email: 'anup@academy.com', password: 'Coach@2024', batch: 'Senior Squad', phone: '9800000001', dob: '14/07/1983' },
            { type: 'coach', name: 'Rakesh Kumar', email: 'rakesh@academy.com', password: 'Coach@2024', batch: 'Junior Squad', phone: '9800000002', dob: '22/03/1985' },
            { type: 'athlete', name: 'Pardeep Narwal', email: 'pardeep@academy.com', password: 'Athlete@2024', batch: 'Senior Squad', phone: '9800000003', dob: '13/12/2006' },
            { type: 'athlete', name: 'Pawan Sehrawat', email: 'pawan@academy.com', password: 'Athlete@2024', batch: 'Junior Squad', phone: '9800000004', dob: '05/07/2007' },
        ],
    };

    const templateData = TEMPLATES[sport] || TEMPLATES.cricket;
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 28 }, { wch: 16 },
        { wch: 16 }, { wch: 14 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import');
    XLSX.writeFile(wb, `sports-os-import-template-${sport}.xlsx`);
});

// ── Auth guard (owner only) ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const user = getStoredUser();
    if (!user || !getToken()) { redirectToLogin(); return; }
    if (user.role !== 'owner') {
        window.location.href = 'dashboard.html';
        return;
    }
});