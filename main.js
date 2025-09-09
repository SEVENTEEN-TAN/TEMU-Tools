const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;
let loginWindow;

// 创建主窗口
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'), // 可选：添加图标
        resizable: false,
        title: 'TEMU小助手'
    });

    mainWindow.loadFile('index.html');

    // 开发环境打开开发者工具
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
}

// 创建登录窗口
function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        parent: mainWindow,
        modal: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'TEMU登录'
    });

    // 加载TEMU登录页面
    loginWindow.loadURL('https://www.temu.com');

    // 监听页面导航，检测登录成功
    loginWindow.webContents.on('did-navigate', async (event, url) => {
        console.log('导航到:', url);
        
        // 检查是否登录成功（通过URL变化或其他标识判断）
        // TEMU登录后通常会跳转到首页或用户中心
        if (url.includes('temu.com') && !url.includes('login')) {
            // 延迟一下确保Cookie已设置
            setTimeout(async () => {
                await checkLoginStatus();
            }, 1000);
        }
    });

    // 监听页面加载完成
    loginWindow.webContents.on('did-finish-load', async () => {
        // 检查是否已登录
        await checkLoginStatus();
    });

    loginWindow.on('closed', () => {
        loginWindow = null;
    });
}

// 检查登录状态
async function checkLoginStatus() {
    try {
        // 获取TEMU的cookies
        const cookies = await session.defaultSession.cookies.get({
            domain: '.temu.com'
        });

        // 查找关键的登录Cookie（具体名称需要根据TEMU实际情况调整）
        const loginCookie = cookies.find(cookie => 
            cookie.name === 'access_token' || 
            cookie.name === 'user_token' || 
            cookie.name === 'jwt_token' ||
            cookie.name === '_nano_fp' // TEMU可能使用的用户标识
        );

        if (loginCookie) {
            console.log('检测到登录Cookie');
            
            // 获取用户信息（这里需要根据TEMU的实际API调整）
            const userInfo = await getUserInfo(cookies);
            
            // 发送用户信息到主窗口
            mainWindow.webContents.send('login-success', userInfo);
            
            // 关闭登录窗口
            if (loginWindow && !loginWindow.isDestroyed()) {
                loginWindow.close();
            }
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
    }
}

// 获取用户信息
async function getUserInfo(cookies) {
    // 这里应该调用TEMU的API获取用户信息
    // 暂时返回模拟数据，实际使用时需要根据TEMU的API调整
    
    // 将cookies转换为cookie字符串
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // TODO: 调用TEMU API获取真实用户信息
    // const response = await fetch('https://api.temu.com/user/info', {
    //     headers: {
    //         'Cookie': cookieString
    //     }
    // });
    // const data = await response.json();
    
    // 暂时返回模拟数据
    return {
        username: 'TEMU用户',
        email: 'user@example.com',
        userId: '123456789',
        cookies: cookieString // 保存Cookie供后续API调用使用
    };
}

// IPC通信处理
ipcMain.handle('open-login', () => {
    createLoginWindow();
});

ipcMain.handle('get-login-status', async () => {
    try {
        const cookies = await session.defaultSession.cookies.get({
            domain: '.temu.com'
        });
        
        if (cookies.length > 0) {
            const userInfo = await getUserInfo(cookies);
            return { loggedIn: true, userInfo };
        }
        
        return { loggedIn: false };
    } catch (error) {
        console.error('获取登录状态失败:', error);
        return { loggedIn: false };
    }
});

ipcMain.handle('logout', async () => {
    try {
        // 清除TEMU相关的cookies
        await session.defaultSession.clearStorageData({
            storages: ['cookies'],
            origin: 'https://www.temu.com'
        });
        return { success: true };
    } catch (error) {
        console.error('退出登录失败:', error);
        return { success: false, error: error.message };
    }
});

// 应用启动
app.whenReady().then(() => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});