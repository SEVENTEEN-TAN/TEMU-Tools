// 渲染进程脚本
let currentUserInfo = null;

// DOM元素
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnLoading = document.getElementById('loginBtnLoading');
const notLoggedIn = document.getElementById('notLoggedIn');
const loggedIn = document.getElementById('loggedIn');
const username = document.getElementById('username');
const email = document.getElementById('email');
const userId = document.getElementById('userId');
const actionButtons = document.getElementById('actionButtons');

// 页面加载时检查登录状态
window.addEventListener('DOMContentLoaded', async () => {
    await checkLoginStatus();
    
    // 监听登录成功事件
    window.electronAPI.onLoginSuccess((userInfo) => {
        console.log('登录成功:', userInfo);
        updateUI(true, userInfo);
    });
});

// 检查登录状态
async function checkLoginStatus() {
    try {
        const result = await window.electronAPI.getLoginStatus();
        if (result.loggedIn) {
            updateUI(true, result.userInfo);
        } else {
            updateUI(false);
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        updateUI(false);
    }
}

// 更新UI
function updateUI(isLoggedIn, userInfo = null) {
    if (isLoggedIn && userInfo) {
        // 已登录状态
        currentUserInfo = userInfo;
        notLoggedIn.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        
        // 更新用户信息显示
        username.textContent = userInfo.username || '-';
        email.textContent = userInfo.email || '-';
        userId.textContent = userInfo.userId || '-';
        
        // 更改按钮为退出登录
        loginBtnText.textContent = '退出登录';
        loginBtn.onclick = handleLogout;
    } else {
        // 未登录状态
        currentUserInfo = null;
        notLoggedIn.classList.remove('hidden');
        loggedIn.classList.add('hidden');
        actionButtons.classList.add('hidden');
        
        // 更改按钮为登录
        loginBtnText.textContent = '登录 TEMU';
        loginBtn.onclick = handleLogin;
    }
}

// 处理登录
async function handleLogin() {
    try {
        // 显示加载状态
        loginBtnText.classList.add('hidden');
        loginBtnLoading.classList.remove('hidden');
        loginBtn.disabled = true;
        
        // 打开登录窗口
        await window.electronAPI.openLogin();
        
    } catch (error) {
        console.error('打开登录窗口失败:', error);
        alert('打开登录窗口失败，请重试');
    } finally {
        // 恢复按钮状态
        loginBtnText.classList.remove('hidden');
        loginBtnLoading.classList.add('hidden');
        loginBtn.disabled = false;
    }
}

// 处理退出登录
async function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        try {
            const result = await window.electronAPI.logout();
            if (result.success) {
                updateUI(false);
                alert('已成功退出登录');
            } else {
                alert('退出登录失败，请重试');
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            alert('退出登录失败，请重试');
        }
    }
}

// 初始化登录按钮点击事件
loginBtn.onclick = handleLogin;

// 功能按钮点击事件（示例）
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const btnText = e.target.textContent;
        alert(`功能 "${btnText}" 即将开发，敬请期待！`);
        
        // 这里可以添加具体的功能实现
        // 例如：调用TEMU API，使用保存的cookies
        if (currentUserInfo && currentUserInfo.cookies) {
            console.log('可以使用cookies调用API:', currentUserInfo.cookies);
        }
    });
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    window.electronAPI.removeAllListeners();
});