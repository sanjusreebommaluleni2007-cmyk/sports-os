const API_BASE_URL = 'https://sports-os-production.up.railway.app/api';

function getUser() {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch { return null; }
}

function getToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || localStorage.getItem('token');
}

function getSport() {
    const user = getUser();
    return user?.sport || 'cricket';
}

function redirectToLogin() { window.location.href = 'login.html'; }

// ── Sport-based facility config ───────────────────────────────────────────────
const SPORT_FACILITIES = {
    cricket: [
        {
            name: 'Net 1 (Pace)', key: 'pace-1',
            slots: [
                { time: '08:00', name: 'M. Pathirana', badge: 'pace', label: 'PACE' },
                { time: '09:30', name: 'J. Bumrah', badge: 'pace', label: 'PACE' },
                { time: '11:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['PACE', 'FREE'],
        },
        {
            name: 'Net 2 (Spin)', key: 'spin-2',
            slots: [
                { time: '08:00', name: 'Y. Chahal', badge: 'spin', label: 'SPIN' },
                { time: '09:30', name: 'R. Ashwin', badge: 'spin', label: 'SPIN' },
                { time: '11:00', name: 'A. Patel', badge: 'spin', label: 'SPIN' },
            ],
            options: ['SPIN', 'FREE'],
        },
        {
            name: 'Center Wicket', key: 'center-3',
            slots: [
                { time: '08:00', name: 'U-16 Sim', badge: 'match', label: 'MATCH' },
                { time: '10:00', name: 'U-19 Sim', badge: 'match', label: 'MATCH' },
                { time: '12:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['MATCH', 'FREE'],
        },
    ],
    tennis: [
        {
            name: 'Court 1 (Singles)', key: 'court-1',
            slots: [
                { time: '07:00', name: 'Serve Practice', badge: 'pace', label: 'SERVE' },
                { time: '09:00', name: 'Baseline Rally', badge: 'match', label: 'RALLY' },
                { time: '11:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['SERVE', 'RALLY', 'FREE'],
        },
        {
            name: 'Court 2 (Doubles)', key: 'court-2',
            slots: [
                { time: '08:00', name: 'Net Play Drills', badge: 'spin', label: 'NET' },
                { time: '10:00', name: 'Match Simulation', badge: 'match', label: 'MATCH' },
                { time: '12:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['NET', 'MATCH', 'FREE'],
        },
        {
            name: 'Practice Wall', key: 'wall-3',
            slots: [
                { time: '07:00', name: 'Footwork Drills', badge: 'fitness', label: 'FITNESS' },
                { time: '09:00', name: 'Return Practice', badge: 'batting', label: 'RETURN' },
                { time: '11:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['FITNESS', 'RETURN', 'FREE'],
        },
    ],
    kabaddi: [
        {
            name: 'Main Mat (Raid)', key: 'mat-1',
            slots: [
                { time: '07:00', name: 'Raid Drills', badge: 'pace', label: 'RAID' },
                { time: '09:00', name: 'Do-or-Die Practice', badge: 'match', label: 'DOD' },
                { time: '11:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['RAID', 'DOD', 'FREE'],
        },
        {
            name: 'Side Mat (Tackle)', key: 'mat-2',
            slots: [
                { time: '08:00', name: 'Tackle Practice', badge: 'spin', label: 'TACKLE' },
                { time: '10:00', name: 'Defense Formation', badge: 'match', label: 'DEFENSE' },
                { time: '12:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['TACKLE', 'DEFENSE', 'FREE'],
        },
        {
            name: 'Fitness Zone', key: 'fitness-3',
            slots: [
                { time: '06:00', name: 'Strength Training', badge: 'fitness', label: 'FITNESS' },
                { time: '08:00', name: 'Agility Drills', badge: 'batting', label: 'AGILITY' },
                { time: '10:00', name: 'Open', badge: 'free', label: 'FREE' },
            ],
            options: ['FITNESS', 'AGILITY', 'FREE'],
        },
    ],
};

function renderFacilities() {
    const sport = getSport();
    const facilities = SPORT_FACILITIES[sport] || SPORT_FACILITIES.cricket;
    const grid = document.getElementById('facilityGrid');
    if (!grid) return;

    grid.innerHTML = facilities.map(facility => `
        <div class="facility-card-inner">
            <h3>${facility.name}</h3>
            ${facility.slots.map(slot => `
                <div class="slot-row">
                    <span class="slot-time">${slot.time}</span>
                    <span class="slot-name">${slot.name}</span>
                    <span class="slot-badge ${slot.badge}">${slot.label}</span>
                </div>
            `).join('')}
            <button class="add-slot-btn" data-net="${facility.key}">+ Add Slot</button>
            <form class="slot-form" data-net-form="${facility.key}" style="display:none;">
                <div class="slot-form-row">
                    <input type="time" class="slot-input" placeholder="Time" required>
                    <input type="text" class="slot-input" placeholder="Name" required>
                    <select class="slot-select">
                        ${facility.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                    </select>
                </div>
                <button type="button" class="btn-primary slot-submit">Save Slot</button>
            </form>
        </div>
    `).join('');

    setupSlotForms();
}

const resourcesState = { equipment: [] };

function openResourceForm() { document.getElementById('resourceForm').style.display = 'block'; }
function closeResourceForm() {
    document.getElementById('resourceForm').style.display = 'none';
    document.getElementById('resourceFormSubmit').reset();
}

async function createResource(event) {
    event.preventDefault();
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    const name = document.getElementById('resourceName').value;
    const type = document.getElementById('resourceType').value;
    const description = document.getElementById('resourceDescription').value;
    const url = document.getElementById('resourceURL').value;
    const quantity = Number(document.getElementById('resourceQuantity').value || 0);

    try {
        const response = await fetch(`${API_BASE_URL}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, type, description, url, quantity }),
        });
        if (!response.ok) throw new Error('Failed to create resource');
        closeResourceForm();
        fetchResources();
    } catch (error) {
        console.error('Error creating resource:', error);
        alert('Unable to add resource. Please try again.');
    }
}

function buildEquipmentCard(item) {
    const statusClass = item.status === 'LOW' ? 'low' : item.status === 'OUT' ? 'out' : 'in-stock';
    return `
        <div class="equipment-card" data-equipment-id="${item._id}">
            <h3>${item.name}</h3>
            <div class="equipment-condition">${item.condition || 'Standard issue'}</div>
            <div class="equipment-status ${statusClass}">${item.status || 'IN STOCK'}</div>
            <div class="qty-control">
                <button class="qty-btn decrement" data-id="${item._id}">-</button>
                <span class="qty-value" id="qty-${item._id}">${item.quantity || 0}</span>
                <button class="qty-btn increment" data-id="${item._id}">+</button>
            </div>
        </div>`;
}

function renderEquipment() {
    const equipmentGrid = document.getElementById('equipmentGrid');
    if (!resourcesState.equipment.length) {
        equipmentGrid.innerHTML = '<div class="empty-state">No equipment resources have been added yet.</div>';
        return;
    }
    equipmentGrid.innerHTML = resourcesState.equipment.map(buildEquipmentCard).join('');

    document.querySelectorAll('.qty-btn.increment').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const item = resourcesState.equipment.find(e => e._id === id);
            if (!item) return;
            item.quantity = (item.quantity || 0) + 1;
            document.getElementById(`qty-${id}`).textContent = item.quantity;
            await patchResource(id, { quantity: item.quantity });
        });
    });

    document.querySelectorAll('.qty-btn.decrement').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const item = resourcesState.equipment.find(e => e._id === id);
            if (!item) return;
            item.quantity = Math.max(0, (item.quantity || 0) - 1);
            document.getElementById(`qty-${id}`).textContent = item.quantity;
            await patchResource(id, { quantity: item.quantity });
        });
    });
}

function setupSlotForms() {
    document.querySelectorAll('.add-slot-btn').forEach(button => {
        button.addEventListener('click', () => {
            const net = button.dataset.net;
            const form = document.querySelector(`.slot-form[data-net-form="${net}"]`);
            form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.slot-submit').forEach(button => {
        button.addEventListener('click', event => {
            const form = event.target.closest('.slot-form');
            const timeInput = form.querySelector('.slot-input[type="time"]');
            const nameInput = form.querySelector('.slot-input[type="text"]');
            const select = form.querySelector('.slot-select');
            if (!timeInput.value || !nameInput.value) return;

            const parentCard = form.closest('.facility-card-inner');
            const row = document.createElement('div');
            row.className = 'slot-row';
            row.innerHTML = `
                <span class="slot-time">${timeInput.value}</span>
                <span class="slot-name">${nameInput.value}</span>
                <span class="slot-badge ${select.value.toLowerCase()}">${select.value}</span>`;
            parentCard.insertBefore(row, form);
            form.style.display = 'none';
            timeInput.value = '';
            nameInput.value = '';
        });
    });
}

async function fetchResources() {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
        const equipRes = await fetch(`${API_BASE_URL}/resources?type=equipment`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const equipData = await equipRes.json();
        if (!equipRes.ok) throw new Error('Unable to load equipment data');
        resourcesState.equipment = equipData;
        renderEquipment();
    } catch (error) {
        console.error('Error loading resources:', error);
        document.getElementById('equipmentGrid').innerHTML = '<div class="empty-state">Unable to load equipment resources.</div>';
    }
}

async function patchResource(id, update) {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    try {
        const response = await fetch(`${API_BASE_URL}/resources/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(update),
        });
        if (!response.ok) throw new Error('Failed to update resource');
        const updatedResource = await response.json();
        if (updatedResource.type === 'equipment') {
            const index = resourcesState.equipment.findIndex(e => e._id === updatedResource._id);
            if (index > -1) { resourcesState.equipment[index] = updatedResource; renderEquipment(); }
        }
    } catch (error) {
        console.error('Error updating resource:', error);
    }
}

function getTodayHeader() {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    return `${weekday} · ${day} ${month}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) { redirectToLogin(); return; }

    document.getElementById('pageDate').textContent = getTodayHeader();
    document.getElementById('addResourceBtn')?.addEventListener('click', openResourceForm);
    document.getElementById('cancelResourceBtn')?.addEventListener('click', closeResourceForm);
    document.getElementById('resourceFormSubmit')?.addEventListener('submit', createResource);

    renderFacilities();
    fetchResources();
});