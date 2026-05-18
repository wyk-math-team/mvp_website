// auth.js - 从 data.json 加载用户数据，支持跨标签页同步
const USERS_DATA_URL = './data.json';

let userDatabase = [];          // 存储从 JSON 加载的用户
let usersLoaded = false;        // 数据是否加载完成
let loadError = false;          // 加载是否出错

// 异步加载用户数据（在页面启动时自动执行）
function loadUserData() {
    return fetch(USERS_DATA_URL)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                userDatabase = data;
                usersLoaded = true;
                console.log(`Loaded ${userDatabase.length} user(s) from data.json`);
            } else {
                throw new Error('Invalid data format');
            }
        })
        .catch(err => {
            console.error('Failed to load user data:', err);
            loadError = true;
            // 提供降级默认用户（避免完全无法登录）
            userDatabase = [
                { username: 'admin', password: 'admin', displayName: 'Admin (fallback)' },
                { username: 'student', password: 'wykmath', displayName: 'Student (fallback)' }
            ];
            usersLoaded = true;
        });
}

// 立即开始加载（不阻塞页面渲染）
loadUserData();

// localStorage 存储当前登录用户（跨标签页同步）
const STORAGE_KEY = 'currentUser';

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function getCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            return JSON.parse(data);
        } catch(e) { return null; }
    }
    return null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

// 登录函数：如果数据尚未加载完成，返回错误并提示稍后重试
function login(username, password) {
    if (!usersLoaded) {
        return { success: false, message: 'User data is still loading, please try again in a moment.' };
    }
    if (loadError) {
        return { success: false, message: 'Unable to load user data. Please refresh the page.' };
    }
    const user = userDatabase.find(u => u.username === username && u.password === password);
    if (user) {
        setCurrentUser({
            username: user.username,
            displayName: user.displayName
        });
        return { success: true, user: user };
    }
    return { success: false, message: 'Invalid username or password.' };
}

function logout() {
    setCurrentUser(null);
}

// 跨标签页同步：其他标签页修改用户信息时刷新当前页面
window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
        location.reload();
    }
});
