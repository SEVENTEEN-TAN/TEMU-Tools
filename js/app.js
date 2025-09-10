/**
 * 应用核心逻辑
 * 负责整体应用的状态管理和模块协调
 */

class App {
    constructor() {
        this.isAuthenticated = false;
        this.userInfo = null;
        this.currentModule = null;
        this.isFirstLogin = true;  // 标记是否首次登录
    }

    /**
     * 初始化应用
     */
    async init() {
        console.log('初始化应用...');
        
        // 绑定事件
        this.bindEvents();
        
        // 检查登录状态
        const hasLogin = await this.checkLoginStatus();
        
        // 监听模块事件
        this.setupModuleListeners();
        
        // 如果已登录，直接显示主界面
        if (hasLogin && this.userInfo?.temuCookieData) {
            this.showMainInterface();
        }
        
        // 初始化完成
        this.updateStatus('应用就绪');
    }
    
    /**
     * 开始登录流程
     */
    startLogin() {
        console.log('开始登录流程');
        this.openLogin();
    }
    
    /**
     * 显示主界面
     */
    showMainInterface() {
        console.log('显示主界面');
        
        // 隐藏欢迎页面
        const welcomeContainer = document.getElementById('welcome-container');
        if (welcomeContainer) {
            welcomeContainer.classList.add('hidden');
            setTimeout(() => {
                welcomeContainer.style.display = 'none';
            }, 500);
        }
        
        // 显示主应用容器
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.display = 'flex';
            appContainer.classList.remove('hidden');
        }
        
        // 渲染左侧菜单
        this.renderSidebarMenu();
        
        // 加载仪表板模块
        if (window.moduleLoader) {
            setTimeout(() => {
                moduleLoader.loadModule('dashboard');
            }, 100);
        }
        
        // 更新用户界面
        this.updateUI();
    }
    
    /**
     * 显示欢迎页面
     */
    showWelcomePage() {
        console.log('显示欢迎页面');
        
        // 显示欢迎页面容器
        const welcomeContainer = document.getElementById('welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.display = 'flex';
            welcomeContainer.classList.remove('hidden');
        }
        
        // 隐藏主应用容器
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.style.display = 'none';
            appContainer.classList.add('hidden');
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 登录按钮
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openLogin());
        }
        
        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // 监听站点选择事件
        window.electronAPI?.onSiteSelected((userInfo) => {
            this.handleSiteSelected(userInfo);
        });
        
        // 监听用户信息更新（如果API存在）
        if (typeof window.electronAPI?.onUserInfoUpdate === 'function') {
            window.electronAPI.onUserInfoUpdate((userInfo) => {
                this.updateUserInfo(userInfo);
            });
        }
    }

    /**
     * 渲染左侧菜单
     */
    renderSidebarMenu() {
        const navMenu = document.getElementById('nav-menu');
        if (!navMenu || !window.moduleLoader) return;
        
        const modules = moduleLoader.getModules();
        
        navMenu.innerHTML = modules.map(module => {
            return `
                <li class="nav-item" data-module="${module.id}">
                    <button class="nav-link" onclick="app.switchModule('${module.id}')">
                        <span class="nav-icon">${module.icon}</span>
                        <span class="nav-text">${module.name}</span>
                    </button>
                </li>
            `;
        }).join('');
        
        // 默认选中第一个模块
        const firstItem = navMenu.querySelector('.nav-item');
        if (firstItem) {
            firstItem.classList.add('active');
        }
    }
    
    /**
     * 更新菜单激活状态
     */
    updateSidebarActive(moduleId) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.module === moduleId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 设置模块监听器
     */
    setupModuleListeners() {
        if (!window.moduleLoader) return;
        
        // 监听模块加载事件
        moduleLoader.on('module-loaded', (event) => {
            const { moduleId, module } = event.detail;
            console.log(`模块已加载: ${moduleId}`);
            this.currentModule = moduleId;
            this.updateSidebarActive(moduleId);  // 更新左侧菜单激活状态
        });
        
        // 监听认证需求
        moduleLoader.on('auth-required', (event) => {
            const { moduleId } = event.detail;
            console.log(`模块需要登录: ${moduleId}`);
            this.showAuthRequired();
        });
        
        // 监听模块错误
        moduleLoader.on('module-error', (event) => {
            const { moduleId, error } = event.detail;
            console.error(`模块错误: ${moduleId}`, error);
            this.showError(`模块加载失败: ${error.message}`);
        });
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus() {
        try {
            const result = await window.electronAPI?.getLoginStatus();
            
            if (result?.loggedIn) {
                this.isAuthenticated = true;
                this.userInfo = result.userInfo;
                
                // 如果有TEMU Cookie，说明已完成站点选择
                if (result.userInfo?.temuCookieData) {
                    return true;
                }
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
        
        this.isAuthenticated = false;
        return false;
    }

    /**
     * 打开登录窗口
     */
    async openLogin() {
        try {
            await window.electronAPI?.openLogin();
        } catch (error) {
            console.error('打开登录窗口失败:', error);
            this.showError('无法打开登录窗口');
        }
    }

    /**
     * 退出登录
     */
    async logout() {
        if (!confirm('确定要退出登录吗？')) return;
        
        try {
            const result = await window.electronAPI?.logout();
            if (result?.success) {
                this.isAuthenticated = false;
                this.userInfo = null;
                
                // 卸载当前模块
                if (window.moduleLoader && window.moduleLoader.currentModule) {
                    await moduleLoader.unloadModule(moduleLoader.currentModule);
                }
                
                // 重置用户界面显示
                const userAvatar = document.getElementById('user-avatar');
                const userName = document.getElementById('user-name');
                const shopIdDisplay = document.getElementById('shop-id-display');
                
                if (userAvatar) userAvatar.textContent = 'S';
                if (userName) userName.textContent = '未登录';
                if (shopIdDisplay) shopIdDisplay.textContent = 'ID: -';
                
                // 重置Cookie悬浮框
                const platformCount = document.getElementById('platform-cookie-count');
                const temuCount = document.getElementById('temu-cookie-count');
                const currentSite = document.getElementById('current-site-tooltip');
                
                if (platformCount) {
                    platformCount.textContent = '未获取';
                    platformCount.className = 'tooltip-value warning';
                }
                if (temuCount) {
                    temuCount.textContent = '未获取';
                    temuCount.className = 'tooltip-value warning';
                }
                if (currentSite) {
                    currentSite.textContent = '-';
                    currentSite.className = 'tooltip-value';
                }
                
                // 显示欢迎页面
                this.showWelcomePage();
                
                this.updateStatus('已退出登录');
                console.log('✅ 已退出登录，返回欢迎页面');
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            this.showError('退出登录失败');
        }
    }

    /**
     * 处理站点选择完成
     */
    handleSiteSelected(userInfo) {
        console.log('站点选择完成:', userInfo);
        this.isAuthenticated = true;
        this.userInfo = userInfo;
        
        // 添加Cookie数量信息
        // 主站Cookie数量（从platformCookies获取）
        if (userInfo.cookieData && userInfo.cookieData.cookies) {
            this.userInfo.platformCookieCount = userInfo.cookieData.cookies.length;
        }
        
        // 分站Cookie数量（从temuCookieData获取）
        if (userInfo.temuCookieData && userInfo.temuCookieData.cookies) {
            this.userInfo.temuCookieCount = userInfo.temuCookieData.cookies.length;
        }
        
        // 在主窗口控制台输出Cookie信息，方便调试
        console.log('\n=====================================');
        console.log('【Cookie调试信息】');
        console.log('=====================================');
        
        // 输出主站Cookie
        if (userInfo.cookieData && userInfo.cookieData.cookies) {
            console.log('\n主站Cookie (global.platformCookies):');
            console.log(`  数量: ${userInfo.cookieData.cookies.length}个`);
            console.log('  Cookie列表:');
            userInfo.cookieData.cookies.forEach((cookie, index) => {
                console.log(`    ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            });
        }
        
        // 输出分站Cookie
        if (userInfo.temuCookieData && userInfo.temuCookieData.cookies) {
            console.log('\n分站Cookie (global.temuCookies):');
            console.log(`  数量: ${userInfo.temuCookieData.cookies.length}个`);
            console.log(`  站点: ${userInfo.currentSite || 'TEMU站点'}`);
            console.log('  Cookie列表:');
            userInfo.temuCookieData.cookies.forEach((cookie, index) => {
                console.log(`    ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
            });
        }
        
        console.log('=====================================\n');
        
        // 显示主界面
        this.showMainInterface();
        
        // 触发用户信息更新事件
        window.dispatchEvent(new CustomEvent('userInfoUpdated', { 
            detail: userInfo 
        }));
        
        this.updateStatus('已登录 - ' + (userInfo.currentSite || 'TEMU站点'));
    }

    /**
     * 更新用户信息
     */
    updateUserInfo(userInfo) {
        this.userInfo = userInfo;
        this.updateUI();
    }

    /**
     * 更新UI
     */
    updateUI() {
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const shopIdDisplay = document.getElementById('shop-id-display');
        
        if (this.isAuthenticated && this.userInfo) {
            // 更新用户头像（使用店铺名称首字母）
            if (userAvatar) {
                const shopName = this.userInfo.shopName || this.userInfo.mallName || '店铺';
                const initial = shopName[0].toUpperCase();
                userAvatar.textContent = initial;
            }
            
            // 更新用户名（显示店铺名称）
            if (userName) {
                userName.textContent = this.userInfo.shopName || this.userInfo.mallName || '店铺';
            }
            
            // 更新店铺ID
            if (shopIdDisplay) {
                const mallId = this.userInfo.mallId || this.userInfo.userId || '-';
                shopIdDisplay.textContent = `ID: ${mallId}`;
            }
            
            // 更新Cookie信息悬浮框
            this.updateCookieTooltip();
        }
    }
    
    /**
     * 更新Cookie悬浮框信息
     */
    updateCookieTooltip() {
        const platformCount = document.getElementById('platform-cookie-count');
        const temuCount = document.getElementById('temu-cookie-count');
        const currentSite = document.getElementById('current-site-tooltip');
        
        // 获取Cookie数量 (从全局变量或userInfo中)
        const platformCookies = this.userInfo?.platformCookieCount || 0;
        const temuCookies = this.userInfo?.temuCookieCount || 0;
        const site = this.userInfo?.currentSite || '-';
        
        if (platformCount) {
            if (platformCookies > 0) {
                platformCount.textContent = `已获取(${platformCookies}个)`;
                platformCount.className = 'tooltip-value success';
            } else {
                platformCount.textContent = '未获取';
                platformCount.className = 'tooltip-value warning';
            }
        }
        
        if (temuCount) {
            if (temuCookies > 0) {
                temuCount.textContent = `已获取(${temuCookies}个)`;
                temuCount.className = 'tooltip-value success';
            } else {
                temuCount.textContent = '未获取';
                temuCount.className = 'tooltip-value warning';
            }
        }
        
        if (currentSite) {
            currentSite.textContent = site;
            currentSite.className = site !== '-' ? 'tooltip-value success' : 'tooltip-value';
        }
    }

    /**
     * 渲染模块标签
     */
    renderModuleTabs() {
        const moduleNav = document.getElementById('module-nav');
        if (!moduleNav || !window.moduleLoader) return;
        
        const modules = moduleLoader.getModules();
        
        moduleNav.innerHTML = modules.map(module => {
            // 检查模块是否需要认证
            if (module.requiresAuth && !this.isAuthenticated) {
                return '';
            }
            
            const isActive = module.id === this.currentModule ? 'active' : '';
            
            return `
                <button class="module-tab ${isActive}" 
                        data-module="${module.id}"
                        onclick="app.switchModule('${module.id}')">
                    <span class="module-tab-icon">${module.icon}</span>
                    <span class="module-tab-name">${module.name}</span>
                </button>
            `;
        }).join('');
    }

    /**
     * 更新模块标签状态
     */
    updateModuleTabs() {
        const tabs = document.querySelectorAll('.module-tab');
        tabs.forEach(tab => {
            const moduleId = tab.dataset.module;
            if (moduleId === this.currentModule) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    /**
     * 切换模块
     */
    async switchModule(moduleId) {
        if (!this.isAuthenticated) {
            this.showAuthRequired();
            return;
        }
        
        try {
            await moduleLoader.switchModule(moduleId);
        } catch (error) {
            console.error('切换模块失败:', error);
            this.showError('切换模块失败');
        }
    }

    /**
     * 显示模块欢迎内容（在插槽中）
     */
    showWelcomeModule() {
        const moduleSlot = document.getElementById('module-slot');
        if (!moduleSlot) return;
        
        moduleSlot.innerHTML = `
            <div class="welcome-page">
                <div class="welcome-content">
                    <h1>欢迎使用 TEMU小助手</h1>
                    <p>请先登录您的账号，然后选择功能模块开始使用</p>
                    <div class="quick-actions">
                        <button class="action-card" onclick="app.openLogin()">
                            <span class="action-icon">🔐</span>
                            <span class="action-title">登录账号</span>
                            <span class="action-desc">登录跨境卖货平台并选择站点</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示需要认证提示
     */
    showAuthRequired() {
        const moduleSlot = document.getElementById('module-slot');
        if (!moduleSlot) return;
        
        moduleSlot.innerHTML = `
            <div class="welcome-page">
                <div class="welcome-content">
                    <h2>需要登录</h2>
                    <p>此功能需要登录后才能使用</p>
                    <div class="quick-actions">
                        <button class="action-card" onclick="app.openLogin()">
                            <span class="action-icon">🔐</span>
                            <span class="action-title">立即登录</span>
                            <span class="action-desc">登录后即可使用全部功能</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.updateStatus(`错误: ${message}`, 'error');
        // 可以添加更优雅的错误提示
    }

    /**
     * 更新状态栏
     */
    updateStatus(text, type = 'normal') {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = text;
            statusText.className = `status-text status-${type}`;
        }
    }

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return this.isAuthenticated && this.userInfo?.temuCookieData;
    }
}

// 创建全局应用实例
window.app = new App();

// 添加Cookie调试功能
window.debugCookies = function() {
    console.log('\n=====================================');
    console.log('【Cookie调试信息】');
    console.log('=====================================');
    
    // 通过Electron API获取Cookie
    if (window.electronAPI) {
        window.electronAPI.debugCookies().then(result => {
            if (result.platformCookies) {
                console.log('\n主站Cookie (global.platformCookies):');
                console.log(`  数量: ${result.platformCookies.length}个`);
                console.log('  Cookie列表:');
                result.platformCookies.forEach((cookie, index) => {
                    console.log(`    ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
                });
            } else {
                console.log('\n主站Cookie: 未获取');
            }
            
            if (result.temuCookies) {
                console.log('\n分站Cookie (global.temuCookies):');
                console.log(`  数量: ${result.temuCookies.length}个`);
                console.log('  Cookie列表:');
                result.temuCookies.forEach((cookie, index) => {
                    console.log(`    ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
                });
            } else {
                console.log('\n分站Cookie: 未获取');
            }
            
            console.log('=====================================\n');
            console.log('提示: 你可以随时在控制台输入 debugCookies() 查看Cookie信息');
        });
    }
};

console.log('提示: 输入 debugCookies() 可以查看当前保存的Cookie信息');