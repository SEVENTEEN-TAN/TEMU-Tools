/**
 * 状态管理器 - 公共组件
 * 用于管理应用中各个模块的状态显示
 */
class StatusManager {
    constructor() {
        this.indicator = null;
        this.statusText = null;
        this.statusIcon = null;
        this.currentTimeout = null;
    }

    /**
     * 初始化状态管理器
     */
    init() {
        this.indicator = document.getElementById('moduleStatusIndicator');
        this.statusText = document.getElementById('module-status-text');
        this.statusIcon = this.indicator?.querySelector('.status-icon');
        
        if (!this.indicator) {
            console.warn('状态指示器元素未找到');
            return false;
        }
        
        return true;
    }

    /**
     * 显示状态
     * @param {string} message - 状态消息
     * @param {string} type - 状态类型: loading, success, error, warning, info
     * @param {number} duration - 显示时长(毫秒)，0表示持续显示
     */
    show(message, type = 'info', duration = 0) {
        if (!this.indicator) {
            if (!this.init()) return;
        }

        // 清除之前的定时器
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // 移除所有状态类
        this.indicator.classList.remove('hidden', 'loading', 'success', 'error', 'warning', 'info');
        
        // 设置新状态
        this.indicator.classList.add(type);
        if (this.statusText) {
            this.statusText.textContent = message;
        }

        // 如果设置了持续时间，自动隐藏
        if (duration > 0) {
            this.currentTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     */
    loading(message = '正在加载...') {
        this.show(message, 'loading', 0);
    }

    /**
     * 显示成功状态
     * @param {string} message - 成功消息
     * @param {number} duration - 显示时长，默认3秒
     */
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误消息
     * @param {number} duration - 显示时长，默认5秒
     */
    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    /**
     * 显示警告状态
     * @param {string} message - 警告消息
     * @param {number} duration - 显示时长，默认4秒
     */
    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    /**
     * 显示信息状态
     * @param {string} message - 信息消息
     * @param {number} duration - 显示时长，默认3秒
     */
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    /**
     * 隐藏状态指示器
     */
    hide() {
        if (this.indicator) {
            this.indicator.classList.add('hidden');
        }
        
        // 清除定时器
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
    }

    /**
     * 更新进度
     * @param {number} current - 当前值
     * @param {number} total - 总值
     * @param {string} prefix - 前缀文本
     */
    progress(current, total, prefix = '进度') {
        const percentage = Math.round((current / total) * 100);
        const message = `${prefix}: ${percentage}% (${current}/${total})`;
        this.loading(message);
    }
}

// 创建全局状态管理器实例
window.statusManager = new StatusManager();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.statusManager.init();
});