// auth.js - 认证模块，使用localStorage实现跨标签页同步
const DEMO_USERS = [
    { username: 'admin', password: 'admin', displayName: 'Test' },
    { username: 'student', password: 'wykmath', displayName: 'user' },
    { username: 'user2', password: 'password2', displayName: '...' }
];

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

function login(username, password) {
    const user = DEMO_USERS.find(u => u.username === username && u.password === password);
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

// 跨标签页同步：当其他标签页修改用户信息时，刷新当前页面
window.addEventListener('storage', function(e) {
    if (e.key === STORAGE_KEY) {
        location.reload();
    }
});
