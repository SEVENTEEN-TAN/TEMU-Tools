/**
 * 仪表板模块
 * 展示Cookie状态和基本数据统计
 */

class DashboardModule {
    constructor() {
        this.state = {
            cookieStatus: {
                platform: false,
                temu: false,
                site: null
            },
            shopInfo: null,
            statistics: {
                products: 0,
                orders: 0,
                sales: 0,
                views: 0
            }
        };
        
        this.initialized = false;
        this.refreshInterval = null;
    }

    /**
     * 模块初始化
     */
    async init() {
        if (this.initialized) return;
        
        console.log('初始化仪表板模块');
        
        // 绑定事件
        this.bindEvents();
        
        // 加载数据
        await this.loadData();
        
        // 设置自动刷新（每30秒）
        this.startAutoRefresh();
        
        this.initialized = true;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 监听用户信息更新
        window.addEventListener('userInfoUpdated', (e) => {
            this.updateUserInfo(e.detail);
        });
    }

    /**
     * 加载数据
     */
    async loadData() {
        // 更新Cookie状态
        this.updateCookieStatus();
        
        // 加载店铺信息
        this.loadShopInfo();
        
        // 加载统计数据（模拟数据）
        this.loadStatistics();
    }

    /**
     * 更新Cookie状态
     */
    updateCookieStatus() {
        // 检查平台Cookie
        const hasPlatformCookie = window.app?.userInfo?.userId ? true : false;
        
        // 检查TEMU Cookie
        const hasTemuCookie = window.app?.userInfo?.temuCookieData ? true : false;
        
        // 获取当前站点
        const currentSite = window.app?.userInfo?.currentSite || null;
        
        this.state.cookieStatus = {
            platform: hasPlatformCookie,
            temu: hasTemuCookie,
            site: currentSite
        };
        
        // 更新UI
        this.updateCookieStatusUI();
    }

    /**
     * 更新Cookie状态UI
     */
    updateCookieStatusUI() {
        // 平台Cookie状态
        const platformStatus = document.getElementById('platform-cookie-status');
        if (platformStatus) {
            const indicator = platformStatus.querySelector('.status-indicator');
            const text = platformStatus.querySelector('.status-text');
            
            if (this.state.cookieStatus.platform) {
                indicator.setAttribute('data-status', 'active');
                text.textContent = '已获取';
                text.style.color = '#48bb78';
            } else {
                indicator.setAttribute('data-status', 'inactive');
                text.textContent = '未获取';
                text.style.color = '#cbd5e0';
            }
        }
        
        // TEMU Cookie状态
        const temuStatus = document.getElementById('temu-cookie-status');
        if (temuStatus) {
            const indicator = temuStatus.querySelector('.status-indicator');
            const text = temuStatus.querySelector('.status-text');
            
            if (this.state.cookieStatus.temu) {
                indicator.setAttribute('data-status', 'active');
                text.textContent = '已获取';
                text.style.color = '#48bb78';
            } else {
                indicator.setAttribute('data-status', 'inactive');
                text.textContent = '未获取';
                text.style.color = '#cbd5e0';
            }
        }
        
        // 当前站点
        const siteElement = document.getElementById('current-site');
        if (siteElement) {
            siteElement.textContent = this.state.cookieStatus.site || '-';
        }
    }

    /**
     * 加载店铺信息
     */
    loadShopInfo() {
        const userInfo = window.app?.userInfo;
        
        if (userInfo) {
            this.state.shopInfo = {
                name: userInfo.shopName || userInfo.mallName || '-',
                id: userInfo.mallId || userInfo.userId || '-',
                type: userInfo.roleNameList?.[0] || '主账号'
            };
            
            // 更新UI
            this.updateShopInfoUI();
        }
    }

    /**
     * 更新店铺信息UI
     */
    updateShopInfoUI() {
        if (!this.state.shopInfo) return;
        
        const shopName = document.getElementById('shop-name');
        if (shopName) shopName.textContent = this.state.shopInfo.name;
        
        const shopId = document.getElementById('shop-id');
        if (shopId) shopId.textContent = this.state.shopInfo.id;
        
        const accountType = document.getElementById('account-type');
        if (accountType) accountType.textContent = this.state.shopInfo.type;
    }

    /**
     * 加载统计数据（模拟）
     */
    loadStatistics() {
        // 生成模拟数据
        this.state.statistics = {
            products: Math.floor(Math.random() * 500) + 100,
            orders: Math.floor(Math.random() * 50) + 10,
            sales: Math.floor(Math.random() * 50000) + 10000,
            views: Math.floor(Math.random() * 5000) + 1000
        };
        
        // 更新UI
        this.updateStatisticsUI();
    }

    /**
     * 更新统计数据UI
     */
    updateStatisticsUI() {
        const stats = this.state.statistics;
        
        const products = document.getElementById('total-products');
        if (products) products.textContent = stats.products.toLocaleString();
        
        const orders = document.getElementById('today-orders');
        if (orders) orders.textContent = stats.orders.toLocaleString();
        
        const sales = document.getElementById('today-sales');
        if (sales) sales.textContent = `¥${stats.sales.toLocaleString()}`;
        
        const views = document.getElementById('today-views');
        if (views) views.textContent = stats.views.toLocaleString();
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        console.log('刷新仪表板数据');
        
        // 显示刷新动画
        const refreshBtn = document.querySelector('.quick-action-btn');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('.action-icon');
            if (icon) {
                icon.style.animation = 'spin 1s linear';
                setTimeout(() => {
                    icon.style.animation = '';
                }, 1000);
            }
        }
        
        // 重新加载数据
        await this.loadData();
        
        // 显示提示
        if (window.app) {
            window.app.updateStatus('数据已刷新', 'success');
        }
    }

    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        // 每30秒刷新一次数据
        this.refreshInterval = setInterval(() => {
            this.loadStatistics(); // 只刷新统计数据
        }, 30000);
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * 更新用户信息
     */
    updateUserInfo(userInfo) {
        console.log('仪表板：用户信息已更新', userInfo);
        this.loadData();
    }

    /**
     * 模块显示时调用
     */
    show() {
        console.log('显示仪表板模块');
        this.loadData();
        this.startAutoRefresh();
    }

    /**
     * 模块隐藏时调用
     */
    hide() {
        console.log('隐藏仪表板模块');
        this.stopAutoRefresh();
    }

    /**
     * 模块销毁
     */
    destroy() {
        console.log('销毁仪表板模块');
        this.stopAutoRefresh();
        this.initialized = false;
        this.state = {
            cookieStatus: {
                platform: false,
                temu: false,
                site: null
            },
            shopInfo: null,
            statistics: {
                products: 0,
                orders: 0,
                sales: 0,
                views: 0
            }
        };
    }
}

// 创建模块实例并注册到全局
window.dashboardModule = new DashboardModule();

// 注册到全局以支持模块加载器
window.Module_dashboard = window.dashboardModule;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardModule;
}