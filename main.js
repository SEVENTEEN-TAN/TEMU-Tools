// 修复Windows控制台编码问题
const { setConsoleEncoding } = require('./encoding-fix');
setConsoleEncoding();

const { app, BrowserWindow, ipcMain, session, net, Menu } = require('electron');
const path = require('path');

// 站点配置
const SITE_CONFIG = {
    GLOBAL: {
        url: 'https://agentseller.temu.com/',
        name: '全球站(除美国、欧洲)',
        domains: ['agentseller.temu.com', '.agentseller.temu.com']
    },
    US: {
        url: 'https://agentseller-us.temu.com/',
        name: '美国站',
        domains: ['agentseller-us.temu.com', '.agentseller-us.temu.com']
    },
    EU: {
        url: 'https://agentseller-eu.temu.com/',
        name: '欧洲站',
        domains: ['agentseller-eu.temu.com', '.agentseller-eu.temu.com']
    },
    SELLER_CENTER: {
        url: 'https://seller.kuajingmaihuo.com/main',
        name: '商家中心',
        domains: ['seller.kuajingmaihuo.com', '.seller.kuajingmaihuo.com']
    }
};

// 从URL中提取域名信息的辅助函数
function getDomainInfo(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // 获取完整域名
        const fullDomain = hostname;
        
        // 获取一级域名（最后两段）
        const parts = hostname.split('.');
        let mainDomain = '';
        if (parts.length >= 2) {
            mainDomain = parts.slice(-2).join('.');
        }
        
        return {
            fullDomain: fullDomain,      // 完整域名，如：seller.kuajingmaihuo.com
            mainDomain: mainDomain,      // 一级域名，如：kuajingmaihuo.com
            dotMainDomain: '.' + mainDomain  // 带点的一级域名，如：.kuajingmaihuo.com
        };
    } catch (error) {
        console.warn('解析URL域名失败:', url, error);
        return {
            fullDomain: '',
            mainDomain: '',
            dotMainDomain: ''
        };
    }
}

// 检查Cookie是否属于指定域名
function isCookieForDomain(cookie, domainInfo) {
    const cookieDomain = cookie.domain.toLowerCase();
    
    return cookieDomain === domainInfo.fullDomain ||       // 完全匹配完整域名
           cookieDomain === domainInfo.mainDomain ||       // 完全匹配一级域名
           cookieDomain === domainInfo.dotMainDomain ||    // 完全匹配带点的一级域名
           cookieDomain === '.' + domainInfo.fullDomain;   // 完全匹配带点的完整域名
}

// 判断URL是否为TEMU或商家中心站点
function isTargetSite(url) {
    if (!url) return false;
    
    // 检查是否为TEMU站点
    const temuSites = [
        'agentseller.temu.com',
        'agentseller-us.temu.com',
        'agentseller-eu.temu.com'
    ];
    
    // 检查商家中心（已登录后的页面）
    if (url.includes('seller.kuajingmaihuo.com/main')) {
        return true;
    }
    
    return temuSites.some(site => url.includes(site));
}

// 获取站点名称
function getSiteName(url) {
    if (!url) return '未知站点';
    
    if (url.includes('agentseller-us.temu.com')) {
        return SITE_CONFIG.US.name;
    } else if (url.includes('agentseller-eu.temu.com')) {
        return SITE_CONFIG.EU.name;
    } else if (url.includes('agentseller.temu.com')) {
        return SITE_CONFIG.GLOBAL.name;
    } else if (url.includes('seller.kuajingmaihuo.com/main')) {
        return SITE_CONFIG.SELLER_CENTER.name;
    }
    
    return '未知站点';
}

// 获取所有TEMU相关域名
function getAllTemuDomains() {
    const domains = [];
    
    // 基础TEMU域名
    domains.push('temu.com', '.temu.com');
    
    // 各站点特定域名
    Object.values(SITE_CONFIG).forEach(config => {
        if (config.url.includes('temu.com')) {
            domains.push(...config.domains);
        }
    });
    
    return [...new Set(domains)]; // 去重
}

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
        title: 'TEMU小助手',
        autoHideMenuBar: true  // 自动隐藏菜单栏
    });

    mainWindow.loadFile('index.html');
    
    // 移除窗口的菜单栏
    mainWindow.setMenuBarVisibility(false);

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
        title: '跨境卖货平台登录',
        autoHideMenuBar: true  // 自动隐藏菜单栏
    });

    // 加载核心站点登录页面
    loginWindow.loadURL('https://seller.kuajingmaihuo.com/login');

    // 监听新窗口创建事件（用于处理站点选择后的新窗口）
    loginWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log('检测到尝试打开新窗口:', url);
        
        // 如果是目标站点（TEMU各站或商家中心），在当前窗口打开
        if (isTargetSite(url)) {
            const siteName = getSiteName(url);
            console.log(`拦截${siteName}新窗口，在当前窗口加载`);
            loginWindow.loadURL(url);
            return { action: 'deny' }; // 阻止新窗口打开
        }
        
        // 其他链接允许打开
        return { action: 'allow' };
    });
    
    // 监听页面导航
    loginWindow.webContents.on('did-navigate', async (event, url) => {
        console.log('导航到:', url);
        
        // 检测是否导航到目标站点
        if (isTargetSite(url)) {
            const siteName = getSiteName(url);
            console.log(`检测到跳转至${siteName}，准备获取Cookie...`);
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
            
            
            // 延迟一下确保所有Cookie都已设置
            setTimeout(async () => {
                await checkLoginStatus();
            }, 1500);
        }
        
        // 在目标站点页面获取Cookie
        if (isTargetSite(currentURL)) {
            const siteName = getSiteName(currentURL);
            console.log(`检测到已跳转到${siteName}，开始获取Cookie...`);
            // 延迟一下确保所有Cookie都已设置
            setTimeout(async () => {
                await getTemuCookies(currentURL);  // 传入当前URL
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
        // 获取当前页面URL
        const currentURL = loginWindow.webContents.getURL();
        console.log('当前页面URL:', currentURL);
        
        // 获取当前页面的域名信息
        const domainInfo = getDomainInfo(currentURL);
        console.log('当前页面域名信息:', domainInfo);
        
        console.log('\n=====================================');
        console.log('开始获取主站Cookie...');
        console.log('=====================================\n');
        
        // 获取所有Cookie，然后根据当前页面域名进行动态过滤
        const allCookies = await session.defaultSession.cookies.get({});
        
        // 过滤出与当前页面域名相关的Cookie（主站Cookie）
        const platformCookies = allCookies.filter(cookie => isCookieForDomain(cookie, domainInfo));
        
        console.log(`从 ${allCookies.length} 个Cookie中筛选出 ${platformCookies.length} 个与当前域名(${domainInfo.mainDomain})相关的Cookie`);
        
        console.log('\n【获取到的主站Cookie】');
        console.log('=====================================');
        
        // 按照文档格式输出Cookie
        platformCookies.forEach((cookie, index) => {
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
        
        console.log(`\n总计获取到 ${platformCookies.length} 个主站Cookie`);
        console.log('=====================================\n');
        
        // 输出可直接使用的Cookie字符串
        const cookieString = platformCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('【主站Cookie字符串（可直接用于API请求）】');
        console.log('=====================================');
        console.log(cookieString);
        console.log('=====================================\n');
        
        // 查找关键的登录Cookie
        const loginCookie = platformCookies.find(cookie => 
            cookie.name === 'SUB_PASS_ID' || 
            cookie.name === '_bee' ||
            cookie.name === 'api_uid'
        );

        if (loginCookie || platformCookies.length > 0) {
            console.log('✅ 主站登录验证成功，已保存主站Cookie');
            
            // 保存主站Cookie到全局变量
            global.platformCookies = platformCookies;
            console.log('提示：主站Cookie已保存到 global.platformCookies 变量中');
            
            // 输出主站Cookie统计
            console.log('\n【主站Cookie信息】');
            console.log('=====================================');
            console.log(`Cookie数量: ${platformCookies.length}个`);
            console.log('Cookie列表:');
            platformCookies.forEach((cookie, index) => {
                console.log(`  ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            });
            console.log('=====================================\n');
            
            // 获取用户信息
            const userInfo = await getUserInfo(platformCookies);
            
            // 保存用户信息和Cookie到全局变量
            const userInfoWithCookies = {
                ...userInfo,
                cookieData: {
                    cookies: platformCookies,
                    cookieString: cookieString
                }
            };
            global.savedUserInfo = userInfoWithCookies;
            
            // 发送用户信息到主窗口（暂时不发送，等用户选择站点后再发送完整信息）
            // mainWindow.webContents.send('login-success', userInfoWithCookies);
            
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

// 获取分站Cookie
async function getTemuCookies(pageURL) {
    try {
        console.log('\n=====================================');
        console.log('开始获取分站Cookie...');
        console.log('=====================================\n');
        
        // 使用传入的URL或尝试从窗口获取
        let currentURL = pageURL || '';
        if (!currentURL && loginWindow && !loginWindow.isDestroyed()) {
            currentURL = loginWindow.webContents.getURL();
        }
        console.log('当前页面URL:', currentURL);
        
        const siteName = getSiteName(currentURL);
        console.log('当前站点:', siteName);
        
        // 如果是商家中心，特殊处理（使用主站Cookie）
        if (currentURL.includes('seller.kuajingmaihuo.com/main')) {
            console.log('商家中心站点，使用已有的主站Cookie作为分站Cookie');
            
            // 商家中心使用之前保存的主站Cookie
            if (global.platformCookies) {
                // 分站Cookie也使用主站Cookie
                global.temuCookies = global.platformCookies;
                
                // 更新用户信息
                if (global.savedUserInfo) {
                    const updatedUserInfo = {
                        ...global.savedUserInfo,
                        temuCookieData: {
                            cookies: global.platformCookies,
                            cookieString: global.platformCookies.map(c => `${c.name}=${c.value}`).join('; ')
                        },
                        platformCookieCount: global.platformCookies.length,
                        temuCookieCount: global.platformCookies.length,
                        currentSite: SITE_CONFIG.SELLER_CENTER.name
                    };
                    
                    // 发送更新后的用户信息到主窗口
                    mainWindow.webContents.send('site-selected', updatedUserInfo);
                    
                    console.log('\n========================================');
                    console.log('商家中心Cookie获取成功！');
                    console.log('已完成登录流程');
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
                return;
            }
        }
        
        // 其他分站（TEMU站点）：获取与当前页面域名相关的Cookie
        const allCookies = await session.defaultSession.cookies.get({});
        
        // 获取当前页面的域名信息
        const domainInfo = getDomainInfo(currentURL);
        console.log('分站页面域名信息:', domainInfo);
        
        // 过滤出与当前TEMU站点域名相关的Cookie
        const temuCookies = allCookies.filter(cookie => isCookieForDomain(cookie, domainInfo));
        
        console.log(`从 ${allCookies.length} 个Cookie中筛选出 ${temuCookies.length} 个与当前域名(${domainInfo.mainDomain})相关的Cookie`);
        
        console.log('\n【获取到的分站Cookie】');
        console.log('=====================================');
        
        // 按照文档格式输出Cookie
        temuCookies.forEach((cookie, index) => {
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
        
        console.log(`\n总计获取到 ${temuCookies.length} 个分站Cookie`);
        console.log(`当前站点: ${siteName}`);
        console.log('=====================================\n');
        
        // 输出可直接使用的Cookie字符串
        const cookieString = temuCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('【分站Cookie字符串（可直接用于API请求）】');
        console.log('=====================================');
        console.log(cookieString);
        console.log('=====================================\n');

        if (temuCookies.length > 0) {
            console.log('✅ 分站Cookie获取成功');
            
            // 保存分站Cookie到全局变量
            global.temuCookies = temuCookies;
            console.log('提示：分站Cookie已保存到 global.temuCookies 变量中');
            
            // 输出分站Cookie信息
            console.log('\n【分站Cookie信息】');
            console.log('=====================================');
            console.log(`Cookie数量: ${temuCookies.length}个`);
            console.log('Cookie列表:');
            temuCookies.forEach((cookie, index) => {
                console.log(`  ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            });
            console.log('当前站点: ', getSiteName(currentURL));
            console.log('=====================================\n');
            
            // 获取之前保存的用户信息
            if (global.savedUserInfo) {
                // 更新用户信息，添加分站Cookie
                const updatedUserInfo = {
                    ...global.savedUserInfo,
                    temuCookieData: {
                        cookies: temuCookies,
                        cookieString: cookieString
                    },
                    platformCookieCount: global.platformCookies ? global.platformCookies.length : 0,
                    temuCookieCount: temuCookies.length,
                    currentSite: getSiteName(currentURL)
                };
                
                // 发送更新后的用户信息到主窗口
                mainWindow.webContents.send('site-selected', updatedUserInfo);
                
                console.log('\n========================================');
                console.log(`${siteName}Cookie获取成功！`);
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
            console.log('⚠️ 未检测到Cookie，可能页面尚未完全加载');
        }
    } catch (error) {
        console.error('❌ 获取分站Cookie失败:', error);
    }
}

// IPC通信处理
ipcMain.handle('open-login', () => {
    createLoginWindow();
});

ipcMain.handle('get-login-status', async () => {
    // 每次启动都要求重新登录，不使用缓存的Cookie
    console.log('检查登录状态：需要重新登录');
    return { loggedIn: false };
});

ipcMain.handle('logout', async () => {
    try {
        console.log('执行退出登录，清除所有Cookie...');
        
        // 清除全局Cookie变量，分开存储主站和分站
        global.platformCookies = null;  // 主站Cookie
        global.temuCookies = null;      // 分站Cookie
        global.savedUserInfo = null;
        
        const ses = session.defaultSession;
        
        // 清除所有Cookie
        await ses.clearStorageData({
            storages: ['cookies']
        });
        
        // 清除kuajingmaihuo相关的cookies
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://seller.kuajingmaihuo.com'
        });
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://kuajingmaihuo.com'
        });
        
        // 清除所有站点的cookies
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://agentseller.temu.com'
        });
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://agentseller-us.temu.com'
        });
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://agentseller-eu.temu.com'
        });
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://temu.com'
        });
        await ses.clearStorageData({
            storages: ['cookies'],
            origin: 'https://seller.kuajingmaihuo.com'
        });
        
        console.log('✅ 所有Cookie已清除');
        return { success: true };
    } catch (error) {
        console.error('退出登录失败:', error);
        return { success: false, error: error.message };
    }
});

// 处理Cookie调试请求
ipcMain.handle('debug-cookies', () => {
    return {
        platformCookies: global.platformCookies || null,
        temuCookies: global.temuCookies || null
    };
});
ipcMain.handle('fetch-products', async (event, params) => {
    const { page = 1, pageSize = 500, skcTopStatus = 100 } = params;
    
    console.log('\n=====================================');
    console.log('开始获取商品数据...');
    console.log(`页码: ${page}, 每页: ${pageSize}, 状态: ${skcTopStatus}`);
    console.log('=====================================\n');
    
    // 检查TEMU Cookie
    if (!global.temuCookies) {
        console.error('未找到TEMU Cookie');
        return { 
            success: false, 
            error: '请先登录并选择TEMU站点' 
        };
    }
    
    try {
        // 构建Cookie字符串
        const cookieString = global.temuCookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // 构建请求
        const request = net.request({
            method: 'POST',
            url: 'https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Origin': 'https://agentseller.temu.com',
                'Referer': 'https://agentseller.temu.com/',
                'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
        });
        
        // 发送请求体
        const requestBody = JSON.stringify({
            page: page,
            pageSize: pageSize,
            skcTopStatus: skcTopStatus
        });
        
        console.log('发送请求体:', requestBody);
        request.write(requestBody);
        
        // 处理响应
        const response = await new Promise((resolve, reject) => {
            let responseData = '';
            
            request.on('response', (response) => {
                console.log(`API响应状态码: ${response.statusCode}`);
                console.log('响应头:', response.headers);
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    try {
                        const data = JSON.parse(responseData);
                        console.log('API响应数据预览:', {
                            success: data.success,
                            totalRecords: data.result?.total,
                            currentPage: data.result?.page,
                            recordsCount: data.result?.records?.length
                        });
                        resolve(data);
                    } catch (error) {
                        console.error('解析响应数据失败:', error);
                        console.error('原始响应:', responseData.substring(0, 500));
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
            const result = response.result;
            console.log(`✅ 成功获取 ${result.records?.length || 0} 条商品数据`);
            
            // 格式化商品数据
            const formattedRecords = (result.records || []).map(product => {
                return {
                    productId: product.productId || product.productSkcId,
                    productName: product.productName || product.productSkcName,
                    extCode: product.extCode || product.productCode,
                    salePrice: product.salePrice || product.price,
                    stock: product.stock || product.totalStock || 0,
                    status: '在售',
                    createTime: product.createTime ? 
                        new Date(product.createTime).toLocaleString('zh-CN') : 
                        '-'
                };
            });
            
            return { 
                success: true, 
                data: {
                    records: formattedRecords,
                    total: result.total || 0,
                    page: result.page || 1,
                    pageSize: result.pageSize || pageSize
                }
            };
        } else {
            console.error('API返回错误:', response.errorMsg || '未知错误');
            return { 
                success: false, 
                error: response.errorMsg || '获取商品失败' 
            };
        }
        
    } catch (error) {
        console.error('获取商品数据失败:', error);
        return { 
            success: false, 
            error: error.message || '网络请求失败' 
        };
    }
});

// 导出商品Excel
ipcMain.handle('export-products-excel', async (event, products) => {
    console.log('\n=====================================');
    console.log(`开始导出Excel，共 ${products.length} 条商品数据`);
    console.log('=====================================\n');
    
    try {
        const ExcelJS = require('exceljs');
        const { dialog } = require('electron');
        const path = require('path');
        
        // 创建工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('在售商品列表');
        
        // 设置列
        worksheet.columns = [
            { header: '商品ID', key: 'productId', width: 20 },
            { header: '商品名称', key: 'productName', width: 50 },
            { header: '商品编码', key: 'extCode', width: 20 },
            { header: '售价(元)', key: 'salePrice', width: 15 },
            { header: '库存', key: 'stock', width: 12 },
            { header: '状态', key: 'status', width: 10 },
            { header: '创建时间', key: 'createTime', width: 25 }
        ];
        
        // 设置表头样式
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667EEA' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        
        // 添加数据
        products.forEach((product, index) => {
            const row = worksheet.addRow(product);
            
            // 设置行样式
            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            
            // 交替行背景色
            if (index % 2 === 1) {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF7F9FC' }
                    };
                });
            }
        });
        
        // 设置自动筛选
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: 7 }
        };
        
        // 显示保存对话框
        const result = await dialog.showSaveDialog(mainWindow, {
            title: '保存商品数据',
            defaultPath: path.join(
                app.getPath('desktop'), 
                `TEMU商品列表_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
            ),
            filters: [
                { name: 'Excel文件', extensions: ['xlsx'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });
        
        if (!result.canceled && result.filePath) {
            // 保存文件
            await workbook.xlsx.writeFile(result.filePath);
            
            console.log(`✅ Excel文件已保存: ${result.filePath}`);
            return { 
                success: true, 
                path: result.filePath 
            };
        } else {
            console.log('用户取消保存');
            return { 
                success: false, 
                error: '用户取消保存' 
            };
        }
        
    } catch (error) {
        console.error('导出Excel失败:', error);
        return { 
            success: false, 
            error: error.message || '导出失败' 
        };
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
            title: '切换站点',
            autoHideMenuBar: true  // 自动隐藏菜单栏
        });
        
        // 监听新窗口创建事件（用于处理站点选择后的新窗口）
        loginWindow.webContents.setWindowOpenHandler(({ url }) => {
            console.log('检测到尝试打开新窗口:', url);
            
            // 如果是目标站点（TEMU各站或商家中心），在当前窗口打开
            if (isTargetSite(url)) {
                const siteName = getSiteName(url);
                console.log(`拦截${siteName}新窗口，在当前窗口加载`);
                loginWindow.loadURL(url);
                return { action: 'deny' }; // 阻止新窗口打开
            }
            
            // 其他链接允许打开
            return { action: 'allow' };
        });
        
        // 监听页面导航
        loginWindow.webContents.on('did-navigate', async (event, url) => {
            console.log('导航到:', url);
            
            // 检测是否导航到目标站点
            if (isTargetSite(url)) {
                const siteName = getSiteName(url);
                console.log(`检测到跳转至${siteName}，准备获取Cookie...`);
            }
        });
        
        // 监听页面加载完成
        loginWindow.webContents.on('did-finish-load', async () => {
            const currentURL = loginWindow.webContents.getURL();
            console.log('页面加载完成:', currentURL);
            
            // 在目标站点页面获取Cookie
            if (isTargetSite(currentURL)) {
                const siteName = getSiteName(currentURL);
                console.log(`检测到已跳转到${siteName}，开始获取Cookie...`);
                // 延迟一下确保所有Cookie都已设置
                setTimeout(async () => {
                    await getTemuCookies(currentURL);  // 传入当前URL
                }, 1500);
            }
        });
        
        // 打开登录窗口的开发者工具，方便查看网络请求
        loginWindow.webContents.openDevTools();
        
        loginWindow.on('closed', () => {
            loginWindow = null;
        });
    }
    
    // 如果有保存的主站Cookie，设置到新的窗口会话中
    if (global.platformCookies) {
        console.log('恢复已保存的主站Cookie...');
        for (const cookie of global.platformCookies) {
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
// 让Electron自动处理DPI缩放，不强制设置
// 这样会根据Windows的显示缩放设置自动调整

app.whenReady().then(async () => {
    // 移除默认菜单栏
    Menu.setApplicationMenu(null);
    
    // 清除所有存储的Cookie，确保每次启动都需要重新登录
    console.log('清除所有存储的Cookie...');
    
    // 清除全局Cookie变量，分开存储主站和分站
    global.platformCookies = null;  // 主站Cookie  
    global.temuCookies = null;      // 分站Cookie
    
    // 清除所有会话Cookie
    const ses = session.defaultSession;
    
    // 清除所有Cookie
    await ses.clearStorageData({
        storages: ['cookies']
    });
    
    // 清除跨境卖货平台的Cookie
    const kuajingDomains = [
        'https://seller.kuajingmaihuo.com',
        'https://kuajingmaihuo.com',
        'https://.kuajingmaihuo.com',
        'https://.seller.kuajingmaihuo.com'
    ];
    
    for (const domain of kuajingDomains) {
        try {
            const cookies = await ses.cookies.get({ url: domain });
            for (const cookie of cookies) {
                await ses.cookies.remove(domain, cookie.name);
            }
        } catch (e) {
            // 忽略错误
        }
    }
    
    // 清除所有站点的Cookie
    const allDomains = [
        'https://agentseller.temu.com',
        'https://agentseller-us.temu.com',
        'https://agentseller-eu.temu.com',
        'https://seller.kuajingmaihuo.com',
        'https://temu.com',
        'https://.temu.com',
        'https://.agentseller.temu.com',
        'https://.agentseller-us.temu.com',
        'https://.agentseller-eu.temu.com'
    ];
    
    for (const domain of allDomains) {
        try {
            const cookies = await ses.cookies.get({ url: domain });
            for (const cookie of cookies) {
                await ses.cookies.remove(domain, cookie.name);
            }
        } catch (e) {
            // 忽略错误
        }
    }
    
    console.log('✅ 所有Cookie已清除，需要重新登录');
    
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