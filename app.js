// app.js - 访客可浏览，受保护操作弹出登录框

(function() {
    // ----- DOM 元素 -----
    const appContainer = document.getElementById('appContainer');
    const modal = document.getElementById('loginModal');
    const modalForm = document.getElementById('modalLoginForm');
    const modalUsername = document.getElementById('modalUsername');
    const modalPassword = document.getElementById('modalPassword');
    const modalError = document.getElementById('modalLoginError');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    const usernameSpan = document.getElementById('currentUsername');
    const clockEl = document.getElementById('clockTime');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebar = document.getElementById('sidebar');
    const topbarLeft = document.querySelector('.topbar-left');
    const mobileToggle = document.getElementById('sidebarToggle');
    const body = document.body;

    // ----- 辅助函数 -----
    function updateUsername() {
        const user = getCurrentUser();
        if (usernameSpan) {
            usernameSpan.textContent = user ? user.displayName : 'Guest';
        }
    }

    // GMT+8 时钟
    function getGMT8Date(date) {
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        return new Date(utc + (8 * 3600000));
    }

    function updateClock() {
        if (!clockEl) return;
        const gmt8 = getGMT8Date(new Date());
        const time = [gmt8.getHours(), gmt8.getMinutes(), gmt8.getSeconds()]
            .map(v => String(v).padStart(2, '0')).join(':');
        clockEl.textContent = time;
    }

    function updateDate() {
        const dateSpan = document.getElementById('currentDate');
        if (!dateSpan) return;
        const gmt8 = getGMT8Date(new Date());
        dateSpan.textContent = gmt8.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // ----- 侧边栏控制 (与之前相同)-----
    let topToggleBtn = null;
    function setSidebarState(open) {
        if (!sidebar) return;
        if (open) {
            sidebar.classList.add('open');
            if (topToggleBtn) topToggleBtn.innerHTML = '✕';
            if (window.innerWidth > 768) body.classList.remove('sidebar-closed');
        } else {
            sidebar.classList.remove('open');
            if (topToggleBtn) topToggleBtn.innerHTML = '☰';
            if (window.innerWidth > 768) body.classList.add('sidebar-closed');
        }
    }
    function toggleSidebar() { setSidebarState(!sidebar.classList.contains('open')); }

    function initSidebarToggle() {
        if (!topbarLeft || !sidebar) return;
        let existing = document.getElementById('sidebarToggleTop');
        if (!existing) {
            topToggleBtn = document.createElement('button');
            topToggleBtn.id = 'sidebarToggleTop';
            topToggleBtn.className = 'topbar-sidebar-toggle';
            topToggleBtn.title = 'Toggle Sidebar';
            topbarLeft.insertBefore(topToggleBtn, topbarLeft.firstChild);
        } else {
            topToggleBtn = existing;
        }
        topToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
    }

    function initSidebarState() {
        if (!sidebar) return;
        setSidebarState(window.innerWidth > 768);
    }

    // ----- 用户菜单和退出 -----
    function initUserMenu() {
        if (!userMenu) return;
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isLoggedIn()) userMenu.classList.toggle('open');
            else showLoginModal();   // 未登录点击用户菜单也弹出登录框
        });
        document.addEventListener('click', () => userMenu.classList.remove('open'));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') userMenu.classList.remove('open');
        });
    }

    function initLogout() {
        if (!logoutBtn) return;
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            logout();
            updateUsername();
            // 刷新页面以重置所有受保护状态（简单处理）
            location.reload();
        });
    }

    // ----- 登录模态框逻辑 -----
    let pendingAction = null;  // 存储被拦截的操作函数

    function showLoginModal(callbackAfterLogin) {
        pendingAction = callbackAfterLogin || null;
        if (modal) {
            modal.style.display = 'flex';
            if (modalUsername) modalUsername.focus();
        }
    }

    function hideLoginModal() {
        if (modal) modal.style.display = 'none';
        if (modalError) modalError.classList.add('hidden');
        if (modalForm) modalForm.reset();
        pendingAction = null;
    }

    function handleModalLogin(e) {
        e.preventDefault();
        const username = modalUsername.value.trim();
        const password = modalPassword.value;
        if (!username || !password) {
            if (modalError) {
                modalError.textContent = 'Please enter both fields.';
                modalError.classList.remove('hidden');
            }
            return;
        }
        const result = login(username, password);
        if (result.success) {
            updateUsername();
            hideLoginModal();
            // 执行之前被拦截的操作
            if (pendingAction && typeof pendingAction === 'function') {
                pendingAction();
                pendingAction = null;
            } else {
                // 可选：刷新页面状态
                location.reload();
            }
        } else {
            if (modalError) {
                modalError.textContent = result.message;
                modalError.classList.remove('hidden');
            }
        }
    }

    // 关闭模态框
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideLoginModal);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) hideLoginModal();
    });
    if (modalForm) modalForm.addEventListener('submit', handleModalLogin);

    // ----- 拦截所有需要登录的链接/按钮 -----
    function interceptProtectedElements() {
        // 拦截侧边栏中带有 .require-login 的链接
        const protectedLinks = document.querySelectorAll('.require-login');
        protectedLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (!isLoggedIn()) {
                    e.preventDefault();
                    const targetUrl = link.getAttribute('data-href') || link.getAttribute('href');
                    showLoginModal(() => {
                        window.location.href = targetUrl;
                    });
                } // 如果已登录，正常跳转（无需额外操作）
            });
        });

        // 额外：拦截任何带有 .require-login 类的按钮或元素（可扩展）
        const protectedButtons = document.querySelectorAll('.require-login-button');
        protectedButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!isLoggedIn()) {
                    e.preventDefault();
                    e.stopPropagation();
                    showLoginModal(() => {
                        // 登录后重新执行按钮原有逻辑（可自定义）
                        btn.click();
                    });
                }
            });
        });
    }

    // ----- 通用初始化（仅 UI，不强制登录）-----
    function initUI() {
        updateUsername();
        updateClock();
        setInterval(updateClock, 500);
        updateDate();
        initSidebarToggle();
        initSidebarState();
        initUserMenu();
        initLogout();

        if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
        window.addEventListener('resize', () => {
            if (!sidebar) return;
            if (window.innerWidth > 768) {
                if (sidebar.classList.contains('open')) body.classList.remove('sidebar-closed');
                else body.classList.add('sidebar-closed');
            } else body.classList.remove('sidebar-closed');
        });
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
        });

        interceptProtectedElements();
    }

    // 启动（无需登录检查）
    initUI();
})();