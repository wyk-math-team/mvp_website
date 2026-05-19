// app.js - 全局初始化：时钟、用户显示、侧边栏、键盘快捷键，并持久化侧边栏状态，添加数据导入/导出按钮，支持未登录时弹出模态框拦截受保护操作

(function() {
    // 获取当前页面文件名
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // 1. 登录校验：仅在非 index 页面执行，允许访客访问 index.html
    if (currentPage !== 'index.html' && typeof isLoggedIn === 'function' && !isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // 2. 获取当前用户 (对于 index 页面，可能未登录，显示 Guest)
    let currentUser = { displayName: 'Guest' };
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
    const topbarRight = document.querySelector('.topbar-right');
    const mobileToggle = document.getElementById('sidebarToggle');

    // 设置用户名
    if (usernameSpan) usernameSpan.textContent = currentUser.displayName;

    // 4. GMT+8 时钟
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

    // 5. 侧边栏状态管理
    const body = document.body;
    let topToggleBtn = null;
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

    // 6. 创建顶部栏侧边开关
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
            localStorage.removeItem('sidebarOpen');
            window.location.href = 'index.html';
        });
    }

    // 9. 初始侧边栏状态
    if (sidebar) {
        const savedState = localStorage.getItem('sidebarOpen');
        let initialOpen;
        if (savedState !== null) {
            initialOpen = savedState === 'true';
        } else {
            initialOpen = window.innerWidth > 768;
        }
        setSidebarState(initialOpen);
    }

    // 10. 响应窗口大小变化
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

    // 12. 侧边栏链接高亮及移动端关闭（原逻辑保留）
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const currentPath = window.location.pathname;
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.endsWith(href)) {
            link.classList.add('active');
        }
        // 移动端点击后自动关闭侧边栏（原有）
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768 && sidebar) {
                setSidebarState(false);
            }
        });
    });

    // 13. 移动端底部按钮
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleSidebar);
    }

    // ============================================================
    // 新增：未登录时拦截受保护操作（仅首页需要，其他页面已重定向）
    // ============================================================
    let pendingUrl = null; // 存储登录后要跳转的地址

    // 获取模态框相关元素
    const loginModal = document.getElementById('loginModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalForm = document.getElementById('modalLoginForm');
    const modalUsername = document.getElementById('modalUsername');
    const modalPassword = document.getElementById('modalPassword');
    const modalError = document.getElementById('modalLoginError');

    function showLoginModal(callbackAfterLogin) {
        if (loginModal) {
            loginModal.style.display = 'flex';
            if (modalUsername) modalUsername.focus();
            if (callbackAfterLogin) {
                // 存储回调，登录成功后执行
                window._pendingLoginCallback = callbackAfterLogin;
            }
        }
    }

    function hideLoginModal() {
        if (loginModal) loginModal.style.display = 'none';
        if (modalError) modalError.classList.add('hidden');
        if (modalForm) modalForm.reset();
        window._pendingLoginCallback = null;
    }

    // 处理模态框登录
    if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
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
                // 更新顶部用户名显示
                const updatedUser = getCurrentUser();
                if (usernameSpan && updatedUser) usernameSpan.textContent = updatedUser.displayName;
                hideLoginModal();
                // 如果有待执行的回调，执行它（通常是跳转）
                if (window._pendingLoginCallback) {
                    window._pendingLoginCallback();
                    window._pendingLoginCallback = null;
                } else {
                    // 没有回调时，刷新页面以更新状态
                    location.reload();
                }
            } else {
                if (modalError) {
                    modalError.textContent = result.message;
                    modalError.classList.remove('hidden');
                }
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideLoginModal);
    }
    // 点击模态框背景关闭
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) hideLoginModal();
        });
    }

    // 拦截所有 .require-login 元素的点击事件（仅在未登录时）
    function interceptProtectedClicks() {
        const protectedElements = document.querySelectorAll('.require-login');
        protectedElements.forEach(el => {
            // 移除旧的监听器避免重复（简单处理：先保存，再添加）
            el.removeEventListener('click', window._interceptHandler);
            const handler = function(e) {
                if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetUrl = el.getAttribute('href') || el.getAttribute('data-href');
                    if (targetUrl) {
                        showLoginModal(() => {
                            window.location.href = targetUrl;
                        });
                    } else {
                        showLoginModal();
                    }
                }
            };
            el.addEventListener('click', handler);
            window._interceptHandler = handler; // 用于后续移除（可选）
        });
    }

    // 由于动态内容可能改变（如 problems.html 中重新渲染），需要监听 DOM 变化重新绑定
    // 简单起见，每 500ms 重新绑定一次，或者使用 MutationObserver，此处使用 setInterval 轻量实现
    // 但更好的做法是在页面中手动调用（例如在渲染完成后），因为 app.js 只在初始加载时运行一次。
    // 对于单页面风格的渲染（如 problems.html 内部动态渲染），该页面内部会自行处理导航拦截，
    // 但 index.html 的侧边栏是静态的，所以只需在初始时绑定一次。
    interceptProtectedClicks();

    // ========== 14. 新增：Load Data 和 Export Data 按钮 ==========
    function addDataButtons() {
        if (document.getElementById('loadDataBtn')) return;
        
        const rightContainer = topbarRight || document.querySelector('.topbar-right');
        if (!rightContainer) return;
        
        const clockDiv = document.querySelector('.clock');
        
        // 导入按钮
        const loadBtn = document.createElement('button');
        loadBtn.id = 'loadDataBtn';
        loadBtn.className = 'data-action-btn';
        loadBtn.title = 'Import data from file';
        loadBtn.textContent = '📂 Load Data';
        loadBtn.style.background = 'none';
        loadBtn.style.border = 'none';
        loadBtn.style.color = 'var(--topbar-text)';
        loadBtn.style.cursor = 'pointer';
        loadBtn.style.padding = '0.5rem 0.8rem';
        loadBtn.style.borderRadius = '4px';
        loadBtn.style.fontSize = '0.9rem';
        loadBtn.addEventListener('mouseenter', () => loadBtn.style.background = 'rgba(255,255,255,0.1)');
        loadBtn.addEventListener('mouseleave', () => loadBtn.style.background = 'none');
        
        // 导出按钮
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportDataBtn';
        exportBtn.className = 'data-action-btn';
        exportBtn.title = 'Export all data to file';
        exportBtn.textContent = '💾 Export Data';
        exportBtn.style.background = 'none';
        exportBtn.style.border = 'none';
        exportBtn.style.color = 'var(--topbar-text)';
        exportBtn.style.cursor = 'pointer';
        exportBtn.style.padding = '0.5rem 0.8rem';
        exportBtn.style.borderRadius = '4px';
        exportBtn.style.fontSize = '0.9rem';
        exportBtn.addEventListener('mouseenter', () => exportBtn.style.background = 'rgba(255,255,255,0.1)');
        exportBtn.addEventListener('mouseleave', () => exportBtn.style.background = 'none');
        
        if (clockDiv) {
            rightContainer.insertBefore(loadBtn, clockDiv);
            rightContainer.insertBefore(exportBtn, clockDiv);
        } else {
            rightContainer.appendChild(loadBtn);
            rightContainer.appendChild(exportBtn);
        }
        
        // 导入逻辑
        loadBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const importedData = JSON.parse(ev.target.result);
                        const result = importDataToLocalStorage(importedData);
                        if (result.success) {
                            alert(`Import successful! Imported ${result.importedCount} user(s)/keys.`);
                            location.reload();
                        } else {
                            alert(`Import failed: ${result.message}`);
                        }
                    } catch (err) {
                        alert(`Invalid JSON file: ${err.message}`);
                    }
                };
                reader.readAsText(file);
            });
            fileInput.click();
        });
        
        // 导出逻辑
        exportBtn.addEventListener('click', () => {
            const exportData = exportLocalStorageData();
            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wyk_math_data_${new Date().toISOString().slice(0,19)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Exported ${Object.keys(exportData).length} user(s) data.`);
        });
    }
    
    // 导入逻辑（合并）
    function importDataToLocalStorage(data) {
        const currentUserObj = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const currentUsername = currentUserObj ? (currentUserObj.username || currentUserObj.displayName || 'guest') : 'guest';
        
        let importMap = null;
        const isMultiUser = Object.values(data).some(val => 
            val && typeof val === 'object' && (val.hasOwnProperty('problemStates') || val.hasOwnProperty('submissions'))
        );
        
        if (isMultiUser) {
            importMap = data;
        } else if (data.hasOwnProperty('problemStates') || data.hasOwnProperty('submissions')) {
            importMap = { [currentUsername]: data };
        } else {
            return { success: false, message: 'Unsupported format. Expected { "username": { "problemStates": {}, "submissions": [] } } or { "problemStates": {}, "submissions": [] }' };
        }
        
        let importedCount = 0;
        for (const [username, userData] of Object.entries(importMap)) {
            if (!userData || typeof userData !== 'object') continue;
            if (userData.problemStates && typeof userData.problemStates === 'object') {
                const key = `problemStates_${username}`;
                const existing = localStorage.getItem(key);
                let merged = existing ? JSON.parse(existing) : {};
                merged = { ...merged, ...userData.problemStates };
                localStorage.setItem(key, JSON.stringify(merged));
                importedCount++;
            }
            if (userData.submissions && Array.isArray(userData.submissions)) {
                const key = `submissions_${username}`;
                const existing = localStorage.getItem(key);
                const existingSubs = existing ? JSON.parse(existing) : [];
                const mergedSubs = [...existingSubs, ...userData.submissions];
                localStorage.setItem(key, JSON.stringify(mergedSubs));
                importedCount++;
            }
        }
        return { success: true, importedCount };
    }
    
    // 导出逻辑：收集所有相关 localStorage 键
    function exportLocalStorageData() {
        const exportObj = {};
        const relevantPrefixes = ['problemStates_', 'submissions_'];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (relevantPrefixes.some(prefix => key.startsWith(prefix))) {
                const username = key.split('_')[1];
                if (!exportObj[username]) exportObj[username] = {};
                if (key.startsWith('problemStates_')) {
                    exportObj[username].problemStates = JSON.parse(localStorage.getItem(key));
                } else if (key.startsWith('submissions_')) {
                    exportObj[username].submissions = JSON.parse(localStorage.getItem(key));
                }
            }
        }
        if (localStorage.getItem('sidebarOpen')) {
            exportObj._global = exportObj._global || {};
            exportObj._global.sidebarOpen = localStorage.getItem('sidebarOpen') === 'true';
        }
        return exportObj;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addDataButtons);
    } else {
        addDataButtons();
    }
    
    console.log(`WYK Maths Team ready. Welcome, ${currentUser.displayName}!`);
})();
