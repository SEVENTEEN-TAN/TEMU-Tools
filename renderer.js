// 渲染进程脚本
let currentUserInfo = null;

// DOM元素 - 登录页面
const loginPage = document.getElementById('loginPage');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnLoading = document.getElementById('loginBtnLoading');

// DOM元素 - 主应用页面  
const mainApp = document.getElementById('mainApp');
const logoutBtn = document.getElementById('logoutBtn');
const headerUsername = document.getElementById('headerUsername');
const headerShop = document.getElementById('headerShop');
const userAvatar = document.getElementById('userAvatar');

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 默认显示登录页面
    showLoginPage();
    
    // 监听登录成功事件
    window.electronAPI.onLoginSuccess((userInfo) => {
        console.log('登录成功:', userInfo);
        currentUserInfo = userInfo;
        showMainApp(userInfo);
    });
    
    // 监听站点选择完成事件
    window.electronAPI.onSiteSelected((userInfo) => {
        console.log('站点选择完成:', userInfo);
        currentUserInfo = userInfo;
        
        // 更新用户信息，显示站点信息
        if (userInfo.currentSite) {
            headerShop.textContent = `${userInfo.mallName || '店铺未设置'} (${userInfo.currentSite})`;
        }
        
        // 更新TEMU Cookie状态显示
        updateTemuCookieStatus(userInfo);
        
        // 现在用户有了TEMU站点的Cookie，可以使用更多功能
        console.log('TEMU Cookie已获取，可以使用完整功能');
        
        // 可以在这里启用之前禁用的功能按钮
        enableAllFunctions();
    });
    
    // 初始化事件监听
    initializeEventListeners();
});

// 显示登录页面
function showLoginPage() {
    loginPage.classList.remove('hidden');
    mainApp.classList.add('hidden');
    currentUserInfo = null;
}

// 显示主应用页面
function showMainApp(userInfo) {
    loginPage.classList.add('hidden');
    mainApp.classList.remove('hidden');
    
    // 更新用户信息显示
    if (userInfo) {
        // 更新头部用户信息
        headerUsername.textContent = userInfo.username || userInfo.userId || '用户';
        headerShop.textContent = userInfo.mallName || '店铺未设置';
        
        // 设置用户头像首字母
        const firstLetter = (userInfo.mallName || userInfo.username || 'T')[0].toUpperCase();
        userAvatar.textContent = firstLetter;
        
        // 更新核心站点Cookie状态
        updateCoreCookieStatus(userInfo);
    }
}

// 更新核心站点Cookie状态
function updateCoreCookieStatus(userInfo) {
    const coreCookieStatus = document.getElementById('coreCookieStatus');
    const coreCookieInfo = document.getElementById('coreCookieInfo');
    
    if (userInfo && userInfo.cookieData && userInfo.cookieData.cookies) {
        // 更新状态标签
        coreCookieStatus.textContent = '已登录';
        coreCookieStatus.classList.remove('inactive');
        coreCookieStatus.classList.add('active');
        
        // 显示Cookie信息
        const cookieCount = userInfo.cookieData.cookies.length;
        const keyCooki = userInfo.cookieData.cookies.find(c => c.name === 'SUB_PASS_ID');
        
        coreCookieInfo.innerHTML = `
            <div class="cookie-detail"><strong>Cookie数量:</strong> ${cookieCount}个</div>
            <div class="cookie-detail"><strong>用户ID:</strong> ${userInfo.userId || '未知'}</div>
            <div class="cookie-detail"><strong>店铺:</strong> ${userInfo.mallName || '未设置'}</div>
            ${keyCooki ? `<div class="cookie-detail"><strong>SUB_PASS_ID:</strong> ${keyCooki.value.substring(0, 20)}...</div>` : ''}
        `;
    }
}

// 更新TEMU站点Cookie状态
function updateTemuCookieStatus(userInfo) {
    const temuCookieStatus = document.getElementById('temuCookieStatus');
    const temuCookieInfo = document.getElementById('temuCookieInfo');
    
    if (userInfo && userInfo.temuCookieData && userInfo.temuCookieData.cookies) {
        // 更新状态标签
        temuCookieStatus.textContent = '已连接';
        temuCookieStatus.classList.remove('inactive');
        temuCookieStatus.classList.add('active');
        
        // 显示TEMU Cookie信息
        const temuCookieCount = userInfo.temuCookieData.cookies.length;
        const sessionCookie = userInfo.temuCookieData.cookies.find(c => c.name === '_bee' || c.name === 'SUB_UID');
        
        temuCookieInfo.innerHTML = `
            <div class="cookie-detail"><strong>Cookie数量:</strong> ${temuCookieCount}个</div>
            <div class="cookie-detail"><strong>站点:</strong> ${userInfo.currentSite || 'TEMU全球站点'}</div>
            ${sessionCookie ? `<div class="cookie-detail"><strong>会话ID:</strong> ${sessionCookie.value.substring(0, 20)}...</div>` : ''}
            <div class="cookie-detail" style="color: #48bb78;"><strong>状态:</strong> ✅ 功能已全部启用</div>
        `;
    } else {
        // 未选择站点
        temuCookieStatus.textContent = '未选择';
        temuCookieStatus.classList.remove('active');
        temuCookieStatus.classList.add('inactive');
        
        temuCookieInfo.innerHTML = `
            <div class="cookie-detail">请在登录窗口选择站点区域</div>
            <div class="cookie-detail" style="color: #f56565;">⚠️ 部分功能需要站点授权</div>
        `;
    }
}

// 初始化事件监听
function initializeEventListeners() {
    // 登录按钮
    loginBtn.addEventListener('click', handleLogin);
    
    // 退出按钮
    logoutBtn.addEventListener('click', handleLogout);
    
    // 切换站点按钮
    const switchSiteBtn = document.getElementById('switchSiteBtn');
    if (switchSiteBtn) {
        switchSiteBtn.addEventListener('click', handleSwitchSite);
    }
    
    // 侧边栏菜单
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 移除所有active类
            document.querySelectorAll('.sidebar-item').forEach(i => {
                i.classList.remove('active');
            });
            // 添加active类到当前项
            item.classList.add('active');
            
            // 获取页面标识
            const page = item.dataset.page;
            console.log('切换到页面:', page);
            
            // 这里可以切换不同的页面内容
            switchPage(page);
        });
    });
    
    // 功能卡片点击
    document.querySelectorAll('.function-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const func = card.dataset.function;
            const funcName = card.querySelector('.function-name').textContent;
            handleFunctionClick(func, funcName);
        });
    });
    
    // 快速操作按钮
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnText = btn.textContent.trim();
            console.log('快速操作:', btnText);
            alert(`功能"${btnText}"开发中...`);
        });
    });
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
                showLoginPage();
                console.log('已成功退出登录');
            } else {
                alert('退出登录失败，请重试');
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            alert('退出登录失败，请重试');
        }
    }
}

// 处理切换站点
async function handleSwitchSite() {
    console.log('切换站点...');
    
    // 如果已有核心站点Cookie，直接打开站点选择页面
    if (currentUserInfo && currentUserInfo.cookieData) {
        // 调用主进程打开站点选择页面
        await window.electronAPI.switchSite();
    } else {
        // 没有登录，提示先登录
        alert('请先登录后再切换站点');
    }
}

// 切换页面
function switchPage(page) {
    // 隐藏所有页面内容
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.add('hidden');
    });
    
    // 显示对应页面（目前只有dashboard）
    switch(page) {
        case 'dashboard':
            const dashboardPage = document.getElementById('dashboardPage');
            if (dashboardPage) {
                dashboardPage.classList.remove('hidden');
            }
            break;
        case 'orders':
            alert('订单管理页面开发中...');
            break;
        case 'products':
            alert('商品管理页面开发中...');
            break;
        case 'inventory':
            alert('库存管理页面开发中...');
            break;
        case 'finance':
            alert('财务中心页面开发中...');
            break;
        case 'marketing':
            alert('营销推广页面开发中...');
            break;
        case 'data':
            alert('数据分析页面开发中...');
            break;
        case 'tools':
            alert('实用工具页面开发中...');
            break;
        default:
            console.log('未知页面:', page);
    }
}

// 处理功能卡片点击
function handleFunctionClick(func, funcName) {
    console.log(`点击功能: ${func} - ${funcName}`);
    
    // 检查是否有TEMU站点Cookie
    if (currentUserInfo && currentUserInfo.temuCookieData) {
        console.log('可用的TEMU Cookie数据:', currentUserInfo.temuCookieData);
        console.log('可用的跨境卖货平台Cookie数据:', currentUserInfo.cookieData);
        
        // 根据不同功能执行不同操作
        switch(func) {
            case 'batch-upload':
                alert('批量上传功能开发中...\n已获取TEMU站点权限');
                break;
            case 'price-monitor':
                alert('价格监控功能开发中...\n已获取TEMU站点权限');
                break;
            case 'auto-reply':
                alert('自动回复功能开发中...\n已获取TEMU站点权限');
                break;
            case 'export-data':
                alert('数据导出功能开发中...\n已获取TEMU站点权限');
                break;
            case 'stock-alert':
                alert('库存预警功能开发中...\n已获取TEMU站点权限');
                break;
            case 'promotion':
                alert('促销管理功能开发中...\n已获取TEMU站点权限');
                break;
            default:
                alert(`功能"${funcName}"即将推出！`);
        }
    } else if (currentUserInfo && currentUserInfo.cookieData) {
        // 只有跨境卖货平台Cookie，没有TEMU站点Cookie
        alert(`请先完成站点选择，才能使用"${funcName}"功能`);
    } else {
        alert('请先登录后再使用此功能');
    }
}

// 启用所有功能（当获取到TEMU Cookie后调用）
function enableAllFunctions() {
    // 更新功能卡片的状态，显示已启用
    document.querySelectorAll('.function-card').forEach(card => {
        // 可以添加一个视觉提示，表示功能已启用
        if (!card.classList.contains('enabled')) {
            card.classList.add('enabled');
        }
    });
    
    // 更新快速操作按钮状态
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        if (btn.disabled) {
            btn.disabled = false;
        }
    });
    
    console.log('所有功能已启用，TEMU站点Cookie已获取');
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    window.electronAPI.removeAllListeners();
});