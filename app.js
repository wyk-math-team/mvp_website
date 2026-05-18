// app.js - 全局初始化：时钟、用户显示、侧边栏、键盘快捷键，并持久化侧边栏状态

(function() {
    // 1. 登录校验
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // 2. 获取当前用户
    let currentUser = { displayName: 'User' };
    if (typeof getCurrentUser === 'function') {
        const user = getCurrentUser();
        if (user && user.displayName) currentUser = user;
    }

    // 3. DOM 元素引用
    const usernameSpan = document.getElementById('currentUsername');
    const clockEl = document.getElementById('clockTime');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebar = document.getElementById('sidebar');
    const topbarLeft = document.querySelector('.topbar-left');
    const mobileToggle = document.getElementById('sidebarToggle'); // 原有移动端按钮

    // 设置用户名
    if (usernameSpan) usernameSpan.textContent = currentUser.displayName;

    // 4. GMT+8 时钟 (每秒更新)
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
    updateClock();
    setInterval(updateClock, 500);

    // 5. 侧边栏状态管理 (统一函数，并持久化)
    const body = document.body;
    let topToggleBtn = null; // 顶部栏动态生成的按钮

    // 保存侧边栏状态到 localStorage
    function saveSidebarState(isOpen) {
        localStorage.setItem('sidebarOpen', isOpen ? 'true' : 'false');
    }

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
        saveSidebarState(open);
    }

    function toggleSidebar() {
        setSidebarState(!sidebar.classList.contains('open'));
    }

    // 6. 创建顶部栏侧边开关 (如果不存在)
    if (topbarLeft && sidebar) {
        let existingBtn = document.getElementById('sidebarToggleTop');
        if (!existingBtn) {
            topToggleBtn = document.createElement('button');
            topToggleBtn.id = 'sidebarToggleTop';
            topToggleBtn.className = 'topbar-sidebar-toggle';
            topToggleBtn.title = 'Toggle Sidebar';
            topbarLeft.insertBefore(topToggleBtn, topbarLeft.firstChild);
        } else {
            topToggleBtn = existingBtn;
        }
        // 绑定点击事件
        topToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // 7. 用户菜单下拉
    if (userMenu) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        });
        document.addEventListener('click', () => {
            userMenu.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') userMenu.classList.remove('open');
        });
    }

    // 8. 退出登录
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof logout === 'function') logout();
            // 退出时清除侧边栏状态记录（可选）
            localStorage.removeItem('sidebarOpen');
            window.location.href = 'login.html';
        });
    }

    // 9. 初始侧边栏状态: 优先读取 localStorage，否则根据窗口宽度决定
    if (sidebar) {
        const savedState = localStorage.getItem('sidebarOpen');
        let initialOpen;
        if (savedState !== null) {
            initialOpen = savedState === 'true';
        } else {
            // 默认：桌面端打开，移动端关闭
            initialOpen = window.innerWidth > 768;
        }
        setSidebarState(initialOpen);
    }

    // 10. 响应窗口大小变化 (根据桌面/移动自动调整 padding 类，但不改变侧边栏开关状态)
    window.addEventListener('resize', () => {
        if (!sidebar) return;
        if (window.innerWidth > 768) {
            if (sidebar.classList.contains('open')) {
                body.classList.remove('sidebar-closed');
            } else {
                body.classList.add('sidebar-closed');
            }
        } else {
            body.classList.remove('sidebar-closed');
        }
    });

    // 11. 键盘快捷键 Ctrl + B
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
    });

    // 12. 侧边栏链接高亮当前页面 & 移动端点击后自动关闭侧边栏 (可选)
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const currentPath = window.location.pathname;

    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.endsWith(href)) {
            link.classList.add('active');
        }
        link.addEventListener('click', function() {
            // 移动端点击导航后自动收起侧边栏
            if (window.innerWidth <= 768 && sidebar) {
                setSidebarState(false);
            }
        });
    });

    // 13. 移动端底部按钮 (如果存在) 与顶部开关行为一致
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleSidebar);
    }

    console.log(`WYK Maths Team ready. Welcome, ${currentUser.displayName}!`);
})();
