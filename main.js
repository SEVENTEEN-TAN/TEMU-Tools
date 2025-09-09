const { app, BrowserWindow, ipcMain, session, net } = require('electron');
const path = require('path');

let mainWindow;
let loginWindow;

// 创建主窗口
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'), // 可选：添加图标
        resizable: true,
        minWidth: 1000,
        minHeight: 650,
        title: 'TEMU小助手'
    });

    mainWindow.loadFile('index.html');

    // 默认打开开发者工具以便查看控制台
    mainWindow.webContents.openDevTools();

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
        title: '跨境卖货平台登录'
    });

    // 加载核心站点登录页面
    loginWindow.loadURL('https://seller.kuajingmaihuo.com/login');

    // 监听新窗口创建事件（用于处理站点选择后的新窗口）
    loginWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log('检测到尝试打开新窗口:', url);
        
        // 如果是TEMU站点，在当前窗口打开
        if (url.includes('agentseller.temu.com')) {
            console.log('拦截TEMU站点新窗口，在当前窗口加载');
            loginWindow.loadURL(url);
            return { action: 'deny' }; // 阻止新窗口打开
        }
        
        // 其他链接允许打开
        return { action: 'allow' };
    });
    
    // 监听页面导航
    loginWindow.webContents.on('did-navigate', async (event, url) => {
        console.log('导航到:', url);
        
        // 检测是否导航到TEMU站点
        if (url.includes('agentseller.temu.com')) {
            console.log('检测到跳转至TEMU站点，准备获取TEMU Cookie...');
        }
    });

    // 监听页面加载完成
    loginWindow.webContents.on('did-finish-load', async () => {
        const currentURL = loginWindow.webContents.getURL();
        console.log('页面加载完成:', currentURL);
        
        // 在site-main页面获取初始Cookie
        if (currentURL.includes('seller.kuajingmaihuo.com/settle/site-main')) {
            console.log('检测到已跳转到site-main页面，开始获取Cookie...');
            console.log('等待用户选择站点区域...');
            
            // 在页面中注入提示信息
            loginWindow.webContents.executeJavaScript(`
                // 创建提示框
                const alertDiv = document.createElement('div');
                alertDiv.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px 30px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    z-index: 10000;
                    font-size: 16px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                \`;
                alertDiv.innerHTML = '<span style="font-size: 20px;">⚠️</span><span>请选择"全球/美国"站点进入TEMU</span>';
                document.body.appendChild(alertDiv);
                
                // 5秒后自动消失
                setTimeout(() => {
                    alertDiv.style.transition = 'opacity 0.5s';
                    alertDiv.style.opacity = '0';
                    setTimeout(() => alertDiv.remove(), 500);
                }, 5000);
                
                console.log('提示：请选择"全球/美国"站点');
            `);
            
            // 延迟一下确保所有Cookie都已设置
            setTimeout(async () => {
                await checkLoginStatus();
            }, 1500);
        }
        
        // 在TEMU站点页面获取TEMU Cookie
        if (currentURL.includes('agentseller.temu.com')) {
            console.log('检测到已跳转到TEMU站点，开始获取TEMU Cookie...');
            // 延迟一下确保所有Cookie都已设置
            setTimeout(async () => {
                await getTemuCookies();
            }, 1500);
        }
    });
    
    // 打开登录窗口的开发者工具，方便查看网络请求
    loginWindow.webContents.openDevTools();

    loginWindow.on('closed', () => {
        loginWindow = null;
    });
}

// 检查登录状态
async function checkLoginStatus() {
    try {
        console.log('\n=====================================');
        console.log('开始获取Cookie...');
        console.log('=====================================\n');
        
        // 方法1：获取所有Cookie（不指定domain）
        const allCookiesUnfiltered = await session.defaultSession.cookies.get({});
        
        // 过滤出kuajingmaihuo.com相关的cookies
        const relevantCookies = allCookiesUnfiltered.filter(cookie => 
            cookie.domain.includes('kuajingmaihuo.com')
        );
        
        console.log(`从所有Cookie中筛选出 ${relevantCookies.length} 个相关Cookie`);
        
        // 方法2：分别获取不同域名的cookies（作为补充）
        const domainPatterns = [
            'kuajingmaihuo.com',
            '.kuajingmaihuo.com', 
            'seller.kuajingmaihuo.com',
            '.seller.kuajingmaihuo.com'
        ];
        
        let additionalCookies = [];
        for (const domain of domainPatterns) {
            try {
                const cookies = await session.defaultSession.cookies.get({ domain });
                console.log(`域名 ${domain}: 获取到 ${cookies.length} 个Cookie`);
                additionalCookies = additionalCookies.concat(cookies);
            } catch (e) {
                console.log(`域名 ${domain}: 获取失败`);
            }
        }
        
        // 合并并去重
        const cookieMap = new Map();
        [...relevantCookies, ...additionalCookies].forEach(cookie => {
            const key = `${cookie.name}_${cookie.domain}_${cookie.path}`;
            cookieMap.set(key, cookie);
        });
        
        const allCookies = Array.from(cookieMap.values());
        
        console.log('\n【获取到的所有Cookie】');
        console.log('=====================================');
        
        // 按照文档格式输出Cookie
        allCookies.forEach((cookie, index) => {
            console.log(`[${index + 1}] ${cookie.name}`);
            console.log(`    值: ${cookie.value}`);
            console.log(`    域名: ${cookie.domain}`);
            console.log(`    路径: ${cookie.path}`);
            console.log(`    过期: ${cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString() : '会话Cookie'}`);
            console.log(`    HttpOnly: ${cookie.httpOnly ? '是' : '否'}`);
            console.log(`    Secure: ${cookie.secure ? '是' : '否'}`);
            console.log(`    SameSite: ${cookie.sameSite || '无'}`);
            console.log('-------------------------------------');
        });
        
        console.log(`\n总计获取到 ${allCookies.length} 个Cookie`);
        console.log('=====================================\n');
        
        // 输出可直接使用的Cookie字符串
        const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('【Cookie字符串（可直接用于API请求）】');
        console.log('=====================================');
        console.log(cookieString);
        console.log('=====================================\n');
        
        // 同时在登录窗口的控制台也输出一份
        if (loginWindow && !loginWindow.isDestroyed()) {
            loginWindow.webContents.executeJavaScript(`
                console.log('\\n【在登录窗口获取到的Cookie】');
                console.log('Total Cookies: ${allCookies.length}');
                console.log('${cookieString}');
            `);
        }

        // 查找关键的登录Cookie（SUB_PASS_ID是关键的用户标识）
        const loginCookie = allCookies.find(cookie => 
            cookie.name === 'SUB_PASS_ID' || 
            cookie.name === '_bee' ||
            cookie.name === 'api_uid'
        );

        if (loginCookie || allCookies.length > 0) {
            console.log('✅ Cookie获取成功，准备获取用户信息');
            
            // 保存Cookie到全局变量，方便调试
            global.savedCookies = allCookies;
            console.log('提示：Cookie已保存到 global.savedCookies 变量中');
            
            // 获取用户信息
            const userInfo = await getUserInfo(allCookies);
            
            // 保存用户信息到全局变量，供后续TEMU站点使用
            global.savedUserInfo = userInfo;
            
            // 发送用户信息到主窗口
            mainWindow.webContents.send('login-success', userInfo);
            
            // 不自动关闭登录窗口，让用户手动关闭
            console.log('\n========================================');
            console.log('Cookie获取成功！');
            console.log('请继续选择站点区域...');
            console.log('========================================\n');
        } else {
            console.log('⚠️ 未检测到Cookie，可能尚未登录');
        }
    } catch (error) {
        console.error('❌ 检查登录状态失败:', error);
    }
}

// 获取用户信息
async function getUserInfo(cookies) {
    // 将cookies转换为cookie字符串
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    console.log('\n=====================================');
    console.log('开始调用用户信息API...');
    console.log('=====================================\n');
    
    try {
        // 使用net模块发送请求
        const request = net.request({
            method: 'POST',
            url: 'https://seller.kuajingmaihuo.com/bg/quiet/api/mms/userInfo',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': cookieString,
                'origin': 'https://seller.kuajingmaihuo.com',
                'referer': 'https://seller.kuajingmaihuo.com/settle/site-main',
                'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin'
            }
        });
        
        // 发送请求体
        request.write(JSON.stringify({}));
        
        // 创建Promise来处理异步响应
        const response = await new Promise((resolve, reject) => {
            let responseData = '';
            
            request.on('response', (response) => {
                console.log(`API响应状态码: ${response.statusCode}`);
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    try {
                        const data = JSON.parse(responseData);
                        console.log('API响应数据:', JSON.stringify(data, null, 2));
                        resolve(data);
                    } catch (error) {
                        console.error('解析响应数据失败:', error);
                        reject(error);
                    }
                });
            });
            
            request.on('error', (error) => {
                console.error('API请求失败:', error);
                reject(error);
            });
            
            request.end();
        });
        
        // 处理API响应
        if (response.success && response.result) {
            const userResult = response.result;
            console.log('\n✅ 成功获取用户信息！');
            console.log('=====================================');
            console.log(`用户ID: ${userResult.userId}`);
            console.log(`手机号: ${userResult.maskMobile}`);
            console.log(`账号类型: ${userResult.accountType === 1 ? '主账号' : '子账号'}`);
            if (userResult.companyList && userResult.companyList.length > 0) {
                const company = userResult.companyList[0];
                if (company.malInfoList && company.malInfoList.length > 0) {
                    const mall = company.malInfoList[0];
                    console.log(`店铺名称: ${mall.mallName}`);
                    console.log(`店铺ID: ${mall.mallId}`);
                }
            }
            console.log('=====================================\n');
            
            // 返回格式化的用户信息
            return {
                username: userResult.nickName || '跨境卖家',
                email: userResult.maskMobile || 'user@kuajingmaihuo.com',
                userId: userResult.userId ? userResult.userId.toString() : '未知',
                accountType: userResult.roleNameList ? userResult.roleNameList.join(', ') : '主账号',
                mallName: userResult.companyList?.[0]?.malInfoList?.[0]?.mallName || '未设置',
                mallId: userResult.companyList?.[0]?.malInfoList?.[0]?.mallId || '',
                cookieData: {
                    cookies: cookies,
                    cookieString: cookieString
                },
                rawData: userResult // 保存原始数据
            };
        } else {
            console.error('API返回错误:', response.errorMsg || '未知错误');
            // 返回默认值
            return getDefaultUserInfo(cookies, cookieString);
        }
        
    } catch (error) {
        console.error('调用用户信息API失败:', error);
        // 出错时返回默认值
        return getDefaultUserInfo(cookies, cookieString);
    }
}

// 获取默认用户信息（API调用失败时使用）
function getDefaultUserInfo(cookies, cookieString) {
    const subPassId = cookies.find(c => c.name === 'SUB_PASS_ID');
    const apiUid = cookies.find(c => c.name === 'api_uid');
    
    return {
        username: '跨境卖家',
        email: subPassId ? `用户${subPassId.value.substring(0, 10)}...` : 'user@kuajingmaihuo.com',
        userId: apiUid ? apiUid.value : '未知',
        accountType: '主账号',
        mallName: '未获取',
        mallId: '',
        cookieData: {
            cookies: cookies,
            cookieString: cookieString
        }
    };
}

// 获取TEMU站点Cookie
async function getTemuCookies() {
    try {
        console.log('\n=====================================');
        console.log('开始获取TEMU站点Cookie...');
        console.log('=====================================\n');
        
        // 方法1：获取所有Cookie（不指定domain）
        const allCookiesUnfiltered = await session.defaultSession.cookies.get({});
        
        // 过滤出temu.com相关的cookies
        const temuCookies = allCookiesUnfiltered.filter(cookie => 
            cookie.domain.includes('temu.com')
        );
        
        console.log(`从所有Cookie中筛选出 ${temuCookies.length} 个TEMU相关Cookie`);
        
        // 方法2：分别获取不同域名的cookies（作为补充）
        const temuDomainPatterns = [
            'temu.com',
            '.temu.com', 
            'agentseller.temu.com',
            '.agentseller.temu.com'
        ];
        
        let additionalTemuCookies = [];
        for (const domain of temuDomainPatterns) {
            try {
                const cookies = await session.defaultSession.cookies.get({ domain });
                console.log(`域名 ${domain}: 获取到 ${cookies.length} 个Cookie`);
                additionalTemuCookies = additionalTemuCookies.concat(cookies);
            } catch (e) {
                console.log(`域名 ${domain}: 获取失败`);
            }
        }
        
        // 合并并去重
        const cookieMap = new Map();
        [...temuCookies, ...additionalTemuCookies].forEach(cookie => {
            const key = `${cookie.name}_${cookie.domain}_${cookie.path}`;
            cookieMap.set(key, cookie);
        });
        
        const allTemuCookies = Array.from(cookieMap.values());
        
        console.log('\n【获取到的TEMU Cookie】');
        console.log('=====================================');
        
        // 按照文档格式输出Cookie
        allTemuCookies.forEach((cookie, index) => {
            console.log(`[${index + 1}] ${cookie.name}`);
            console.log(`    值: ${cookie.value}`);
            console.log(`    域名: ${cookie.domain}`);
            console.log(`    路径: ${cookie.path}`);
            console.log(`    过期: ${cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toISOString() : '会话Cookie'}`);
            console.log(`    HttpOnly: ${cookie.httpOnly ? '是' : '否'}`);
            console.log(`    Secure: ${cookie.secure ? '是' : '否'}`);
            console.log(`    SameSite: ${cookie.sameSite || '无'}`);
            console.log('-------------------------------------');
        });
        
        console.log(`\n总计获取到 ${allTemuCookies.length} 个TEMU Cookie`);
        console.log('=====================================\n');
        
        // 输出可直接使用的Cookie字符串
        const temuCookieString = allTemuCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('【TEMU Cookie字符串（可直接用于API请求）】');
        console.log('=====================================');
        console.log(temuCookieString);
        console.log('=====================================\n');
        
        // 同时在登录窗口的控制台也输出一份（转义特殊字符）
        if (loginWindow && !loginWindow.isDestroyed()) {
            const escapedCookieString = temuCookieString.replace(/'/g, "\\'").replace(/"/g, '\\"');
            loginWindow.webContents.executeJavaScript(`
                console.log('\\n【在TEMU站点获取到的Cookie】');
                console.log('Total TEMU Cookies: ${allTemuCookies.length}');
                console.log('Cookie String: ${escapedCookieString.substring(0, 200)}...');
            `);
        }

        if (allTemuCookies.length > 0) {
            console.log('✅ TEMU Cookie获取成功');
            
            // 保存TEMU Cookie到全局变量
            global.temuCookies = allTemuCookies;
            console.log('提示：TEMU Cookie已保存到 global.temuCookies 变量中');
            
            // 获取之前保存的用户信息
            if (global.savedUserInfo) {
                // 更新用户信息，添加TEMU Cookie
                const updatedUserInfo = {
                    ...global.savedUserInfo,
                    temuCookieData: {
                        cookies: allTemuCookies,
                        cookieString: temuCookieString
                    },
                    currentSite: 'TEMU全球站点' // 可以根据URL判断具体站点
                };
                
                // 发送更新后的用户信息到主窗口
                mainWindow.webContents.send('site-selected', updatedUserInfo);
                
                console.log('\n========================================');
                console.log('TEMU站点Cookie获取成功！');
                console.log('已完成多站点登录流程');
                console.log('正在自动关闭登录窗口...');
                console.log('========================================\n');
                
                // 延迟2秒后自动关闭登录窗口
                setTimeout(() => {
                    if (loginWindow && !loginWindow.isDestroyed()) {
                        console.log('自动关闭登录窗口');
                        loginWindow.close();
                    }
                }, 2000);
            }
        } else {
            console.log('⚠️ 未检测到TEMU Cookie，可能页面尚未完全加载');
        }
    } catch (error) {
        console.error('❌ 获取TEMU Cookie失败:', error);
    }
}

// IPC通信处理
ipcMain.handle('open-login', () => {
    createLoginWindow();
});

ipcMain.handle('get-login-status', async () => {
    try {
        const cookies = await session.defaultSession.cookies.get({
            domain: '.kuajingmaihuo.com'
        });
        
        const sellerCookies = await session.defaultSession.cookies.get({
            domain: 'seller.kuajingmaihuo.com'
        });
        
        const allCookies = [...cookies, ...sellerCookies];
        
        if (allCookies.length > 0) {
            const userInfo = await getUserInfo(allCookies);
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
        // 清除kuajingmaihuo相关的cookies
        await session.defaultSession.clearStorageData({
            storages: ['cookies'],
            origin: 'https://seller.kuajingmaihuo.com'
        });
        await session.defaultSession.clearStorageData({
            storages: ['cookies'],
            origin: 'https://kuajingmaihuo.com'
        });
        return { success: true };
    } catch (error) {
        console.error('退出登录失败:', error);
        return { success: false, error: error.message };
    }
});

// 处理切换站点
ipcMain.handle('switch-site', async () => {
    console.log('切换站点请求...');
    
    // 创建新的登录窗口，直接打开站点选择页面
    if (!loginWindow || loginWindow.isDestroyed()) {
        loginWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            parent: mainWindow,
            modal: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            },
            title: '切换站点'
        });
        
        // 监听新窗口创建事件（用于处理站点选择后的新窗口）
        loginWindow.webContents.setWindowOpenHandler(({ url }) => {
            console.log('检测到尝试打开新窗口:', url);
            
            // 如果是TEMU站点，在当前窗口打开
            if (url.includes('agentseller.temu.com')) {
                console.log('拦截TEMU站点新窗口，在当前窗口加载');
                loginWindow.loadURL(url);
                return { action: 'deny' }; // 阻止新窗口打开
            }
            
            // 其他链接允许打开
            return { action: 'allow' };
        });
        
        // 监听页面导航
        loginWindow.webContents.on('did-navigate', async (event, url) => {
            console.log('导航到:', url);
            
            // 检测是否导航到TEMU站点
            if (url.includes('agentseller.temu.com')) {
                console.log('检测到跳转至TEMU站点，准备获取TEMU Cookie...');
            }
        });
        
        // 监听页面加载完成
        loginWindow.webContents.on('did-finish-load', async () => {
            const currentURL = loginWindow.webContents.getURL();
            console.log('页面加载完成:', currentURL);
            
            // 在TEMU站点页面获取TEMU Cookie
            if (currentURL.includes('agentseller.temu.com')) {
                console.log('检测到已跳转到TEMU站点，开始获取TEMU Cookie...');
                // 延迟一下确保所有Cookie都已设置
                setTimeout(async () => {
                    await getTemuCookies();
                }, 1500);
            }
        });
        
        // 打开登录窗口的开发者工具，方便查看网络请求
        loginWindow.webContents.openDevTools();
        
        loginWindow.on('closed', () => {
            loginWindow = null;
        });
    }
    
    // 如果有保存的Cookie，设置到新的窗口会话中
    if (global.savedCookies) {
        console.log('恢复已保存的核心站点Cookie...');
        for (const cookie of global.savedCookies) {
            try {
                await session.defaultSession.cookies.set({
                    url: `https://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}`,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    expirationDate: cookie.expirationDate
                });
            } catch (e) {
                console.log(`设置Cookie失败: ${cookie.name}`, e.message);
            }
        }
        console.log('核心站点Cookie恢复完成');
    }
    
    // 直接加载站点选择页面
    loginWindow.loadURL('https://seller.kuajingmaihuo.com/settle/site-main');
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