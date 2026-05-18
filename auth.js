// auth.js - 认证模块，无自动跳转
const DEMO_USERS = [
    { username: 'admin', password: 'admin', displayName: 'Administrator' },
    { username: 'student', password: 'wykmath', displayName: '...' },
    { username: 'user2', password: 'password2', displayName: '...' }
];

function setCurrentUser(user) {
    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('currentUser');
    }
}

function getCurrentUser() {
    const data = sessionStorage.getItem('currentUser');
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
        const sessionUser = {
            username: user.username,
            displayName: user.displayName
        };
        setCurrentUser(sessionUser);
        return { success: true, user: sessionUser };
    }
    return { success: false, message: 'Invalid username or password.' };
}

function logout() {
    setCurrentUser(null);
}