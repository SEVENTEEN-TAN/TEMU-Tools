const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 打开登录窗口
    openLogin: () => ipcRenderer.invoke('open-login'),
    
    // 获取登录状态
    getLoginStatus: () => ipcRenderer.invoke('get-login-status'),
    
    // 退出登录
    logout: () => ipcRenderer.invoke('logout'),
    
    // 切换站点
    switchSite: () => ipcRenderer.invoke('switch-site'),
    
    // 监听登录成功事件
    onLoginSuccess: (callback) => {
        ipcRenderer.on('login-success', (event, userInfo) => {
            callback(userInfo);
        });
    },
    
    // 监听站点选择完成事件
    onSiteSelected: (callback) => {
        ipcRenderer.on('site-selected', (event, userInfo) => {
            callback(userInfo);
        });
    },
    
    // 监听用户信息更新事件
    onUserInfoUpdate: (callback) => {
        ipcRenderer.on('user-info-update', (event, userInfo) => {
            callback(userInfo);
        });
    },
    
    // 移除所有监听器
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('login-success');
        ipcRenderer.removeAllListeners('site-selected');
        ipcRenderer.removeAllListeners('user-info-update');
    },
    
    // 获取商品数据
    fetchProducts: (params) => ipcRenderer.invoke('fetch-products', params),
    
    // 导出商品Excel
    exportProductsExcel: (products) => ipcRenderer.invoke('export-products-excel', products),
    
    // 查询商品活动
    queryProductActivities: (params) => ipcRenderer.invoke('queryProductActivities', params),
    
    // 取消活动
    cancelActivity: (params) => ipcRenderer.invoke('cancelActivity', params),
    
    // 通用请求方法 - 兼容旧的调用方式
    request: (method, params) => {
        switch(method) {
            case 'queryProductActivities':
                return ipcRenderer.invoke('queryProductActivities', params);
            case 'cancelActivity':
                return ipcRenderer.invoke('cancelActivity', params);
            default:
                return Promise.reject(new Error(`Unknown method: ${method}`));
        }
    },
    
    // 调试Cookie
    debugCookies: () => ipcRenderer.invoke('debug-cookies')
});