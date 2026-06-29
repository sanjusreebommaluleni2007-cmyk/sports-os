const NAV_ITEMS = [
    {
        label: 'Dashboard', icon: '🏠', href: 'dashboard.html',
        roles: ['owner', 'head_coach', 'coach', 'athlete']
    },
    {
        label: 'Timetable', icon: '🗓️', href: 'timetable.html',
        roles: ['owner', 'head_coach', 'coach', 'athlete']
    },
    {
        label: 'Batches & Attendance', icon: '👥', href: 'batches.html',
        roles: ['head_coach', 'coach']
    },
    {
        label: 'Coach Attendance', icon: '📋', href: 'batches.html',
        roles: ['owner']
    },
    {
        label: 'My Attendance', icon: '📅', href: 'my-attendance.html',
        roles: ['athlete']
    },
    {
        label: 'Session & Voice Logging', icon: '🎙️', href: 'sessions.html',
        roles: ['head_coach', 'coach']
    },
    {
        label: 'Performance & Benchmarks', icon: '📈', href: 'performance.html',
        roles: ['owner', 'head_coach', 'coach', 'athlete']
    },
    {
        label: 'My Profile', icon: '👤', href: 'my-profile.html',
        roles: ['athlete']
    },
    {
        label: 'Resource Management', icon: '🎒', href: 'resources.html',
        roles: ['owner', 'head_coach', 'coach']
    },
    {
        label: 'Fee Collection', icon: '💰', href: 'fees.html',
        roles: ['owner', 'head_coach', 'coach']
    },
    {
        label: 'Bulk Import', icon: '📥', href: 'import.html',
        roles: ['owner']
    },
    {
        label: 'Manage Roster', icon: '📋', href: 'roster.html',
        roles: ['owner', 'head_coach', 'coach']
    },
];

const ROLE_LABELS = {
    owner: 'Owner',
    head_coach: 'Head Coach',
    coach: 'Coach',
    athlete: 'Athlete',
};

const SPORT_LABELS = {
    cricket: 'CRICKET ACADEMY',
    tennis: 'TENNIS ACADEMY',
    kabaddi: 'KABADDI ACADEMY',
};

const SPORT_ICONS = {
    cricket: '🏏',
    tennis: '🎾',
    kabaddi: '🤼',
};

function getStoredUser() {
    try {
        const data = JSON.parse(localStorage.getItem('user'));
        return data?.user || data || null;
    } catch {
        return null;
    }
}

function getToken() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) return user.token;
        return localStorage.getItem('token');
    } catch {
        return null;
    }
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const user = getStoredUser();
    const token = getToken();

    if (!user || !token) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'register.html') {
            window.location.href = 'login.html';
        }
        return;
    }

    const role = user?.role || 'coach';
    const sport = user?.sport || 'cricket';
    const initials = user?.initials ||
        (user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CO');
    const name = user?.name || 'Coach';
    const roleLabel = ROLE_LABELS[role] || 'Coach';
    const sportLabel = SPORT_LABELS[sport] || 'SPORTS ACADEMY';
    const sportIcon = SPORT_ICONS[sport] || '🏆';

    const filtered = NAV_ITEMS.filter(item => item.roles.includes(role));
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const navMarkup = filtered.map(item => {
        const isActive = item.href === currentPage;
        return `
            <li>
                <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}" data-href="${item.href}">
                    <span class="nav-icon">${item.icon}</span>
                    <span class="nav-text">${item.label}</span>
                </a>
            </li>`;
    }).join('');

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="sidebar-logo">
                <div class="logo-icon">${sportIcon}</div>
                <div class="logo-copy">
                    <div class="logo-title">Sports OS</div>
                    <div class="logo-subtitle">${sportLabel}</div>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <ul>${navMarkup}</ul>
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-user">
                <div class="avatar">${initials}</div>
                <div class="user-details">
                    <span class="user-name">${name}</span>
                    <span class="user-role">${roleLabel}</span>
                </div>
            </div>
            <button id="logoutBtn" class="btn-logout">Logout</button>
        </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ── 1. Render sidebar content first ──────────────────────────────────────
    renderSidebar();

    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    // ── 2. Create hamburger button ────────────────────────────────────────────
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'hamburger-btn';
    hamburgerBtn.innerHTML = '☰';
    hamburgerBtn.setAttribute('aria-label', 'Open menu');
    document.body.appendChild(hamburgerBtn);

    // ── 3. Create overlay ─────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // ── 4. Create desktop-mode toggle ─────────────────────────────────────────
    const desktopBtn = document.createElement('button');
    desktopBtn.className = 'desktop-toggle-btn';
    desktopBtn.setAttribute('aria-label', 'Toggle desktop mode');
    document.body.appendChild(desktopBtn);

    // ── 5. Single open/close state ────────────────────────────────────────────
    let sidebarOpen = false;
    let isDesktopMode = localStorage.getItem('desktopMode') === 'true';

    function openSidebar() {
        sidebarOpen = true;
        sidebarEl.style.transform = 'translateX(0)';
        overlay.style.display = 'block';
        hamburgerBtn.innerHTML = '✕';
        hamburgerBtn.setAttribute('aria-label', 'Close menu');
    }

    function closeSidebar() {
        sidebarOpen = false;
        sidebarEl.style.transform = 'translateX(-250px)';
        overlay.style.display = 'none';
        hamburgerBtn.innerHTML = '☰';
        hamburgerBtn.setAttribute('aria-label', 'Open menu');
    }

    // ── 6. Hamburger toggle ───────────────────────────────────────────────────
    hamburgerBtn.addEventListener('click', () => {
        if (sidebarOpen) closeSidebar();
        else openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    sidebarEl.addEventListener('click', (e) => {
        if (e.target.closest('.nav-link') && window.innerWidth <= 1024) {
            closeSidebar();
        }
    });

    // ── 7. Desktop-mode toggle ────────────────────────────────────────────────
    // Desktop mode = sidebar permanently visible, no hamburger
    // Mobile mode  = sidebar hidden, hamburger shown
    function applyDesktopMode(desktop) {
        const mainContent = document.querySelector('.main-content');

        if (desktop) {
            // Show sidebar permanently like a desktop
            sidebarEl.style.transform = 'translateX(0)';
            sidebarEl.style.zIndex = '100';
            if (mainContent) mainContent.style.marginLeft = '250px';
            hamburgerBtn.style.display = 'none';
            overlay.style.display = 'none';
            desktopBtn.innerHTML = '📱';
            desktopBtn.title = 'Switch to Mobile Mode';
            sidebarOpen = false;
        } else {
            // Back to mobile mode
            if (mainContent) mainContent.style.marginLeft = '0';
            desktopBtn.innerHTML = '🖥️';
            desktopBtn.title = 'Switch to Desktop Mode';
            forceSidebarLayout();
        }
    }

    desktopBtn.addEventListener('click', () => {
        isDesktopMode = !isDesktopMode;
        localStorage.setItem('desktopMode', String(isDesktopMode));
        applyDesktopMode(isDesktopMode);
    });

    // ── 8. Layout engine ──────────────────────────────────────────────────────
    function forceSidebarLayout() {
        // Skip if desktop mode is on — applyDesktopMode handles it
        if (isDesktopMode) return;

        hamburgerBtn.style.display = 'flex';
        desktopBtn.style.display = 'flex';
        if (!sidebarOpen) {
            sidebarEl.style.transform = 'translateX(-250px)';
        }
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.style.marginLeft = '0';
    }

    // ── 9. Init ───────────────────────────────────────────────────────────────
    // Always show desktop toggle button on mobile
    desktopBtn.style.display = 'flex';

    if (isDesktopMode) {
        applyDesktopMode(true);
    } else {
        forceSidebarLayout();
    }

    window.addEventListener('resize', () => {
        if (!isDesktopMode) forceSidebarLayout();
    });
});