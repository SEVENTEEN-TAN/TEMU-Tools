const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 打开登录窗口
    openLogin: () => ipcRenderer.invoke('open-login'),
    
    // 获取登录状态
    getLoginStatus: () => ipcRenderer.invoke('get-login-status'),
    
    // 退出登录
    logout: () => ipcRenderer.invoke('logout'),
    
    // 监听登录成功事件
    onLoginSuccess: (callback) => {
        ipcRenderer.on('login-success', (event, userInfo) => {
            callback(userInfo);
        });
    },
    
    // 移除所有监听器
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('login-success');
    }
});