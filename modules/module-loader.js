/**
 * 模块加载器 - 负责动态加载和管理各个功能模块
 * 使用插槽机制实现模块的动态切换
 */

class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.currentModule = null;
        this.moduleContainer = null;
        this.moduleSlot = null;
        this.eventBus = new EventTarget();
    }

    /**
     * 初始化模块加载器
     * @param {string} containerSelector - 模块容器选择器
     * @param {string} slotSelector - 模块插槽选择器
     */
    init(containerSelector = '#module-container', slotSelector = '#module-slot') {
        this.moduleContainer = document.querySelector(containerSelector);
        this.moduleSlot = document.querySelector(slotSelector);
        
        if (!this.moduleContainer || !this.moduleSlot) {
            console.error('模块容器或插槽未找到');
            return false;
        }
        
        console.log('模块加载器初始化成功');
        return true;
    }

    /**
     * 注册模块
     * @param {string} moduleId - 模块ID
     * @param {Object} moduleConfig - 模块配置
     */
    registerModule(moduleId, moduleConfig) {
        const config = {
            id: moduleId,
            name: moduleConfig.name || moduleId,
            path: moduleConfig.path,
            icon: moduleConfig.icon || '📦',
            description: moduleConfig.description || '',
            dependencies: moduleConfig.dependencies || [],
            requiresAuth: moduleConfig.requiresAuth !== false,
            loadPriority: moduleConfig.loadPriority || 0,
            instance: null,
            loaded: false,
            ...moduleConfig
        };
        
        this.modules.set(moduleId, config);
        console.log(`模块注册成功: ${moduleId}`);
        
        // 触发模块注册事件
        this.eventBus.dispatchEvent(new CustomEvent('module-registered', { 
            detail: { moduleId, config } 
        }));
    }

    /**
     * 加载模块
     * @param {string} moduleId - 模块ID
     */
    async loadModule(moduleId) {
        const module = this.modules.get(moduleId);
        
        if (!module) {
            console.error(`模块未注册: ${moduleId}`);
            return false;
        }
        
        // 检查权限
        if (module.requiresAuth && !this.checkAuth()) {
            console.warn(`模块需要登录: ${moduleId}`);
            this.eventBus.dispatchEvent(new CustomEvent('auth-required', { 
                detail: { moduleId } 
            }));
            return false;
        }
        
        try {
            console.log(`开始加载模块: ${moduleId}`);
            
            // 卸载当前模块
            if (this.currentModule) {
                await this.unloadModule(this.currentModule);
            }
            
            // 显示加载中状态
            this.showLoading();
            
            // 加载模块资源
            const success = await this.loadModuleResources(module);
            
            if (success) {
                // 渲染模块内容
                await this.renderModule(module);
                
                // 初始化模块
                if (module.instance && typeof module.instance.init === 'function') {
                    await module.instance.init();
                }
                
                // 显示模块
                if (module.instance && typeof module.instance.show === 'function') {
                    module.instance.show();
                }
                
                module.loaded = true;
                this.currentModule = moduleId;
                
                // 隐藏加载状态
                this.hideLoading();
                
                console.log(`模块加载成功: ${moduleId}`);
                
                // 触发模块加载完成事件
                this.eventBus.dispatchEvent(new CustomEvent('module-loaded', { 
                    detail: { moduleId, module } 
                }));
                
                return true;
            }
            
        } catch (error) {
            console.error(`模块加载失败: ${moduleId}`, error);
            this.hideLoading();
            this.showError(`加载模块失败: ${error.message}`);
            
            // 触发模块加载失败事件
            this.eventBus.dispatchEvent(new CustomEvent('module-error', { 
                detail: { moduleId, error } 
            }));
        }
        
        return false;
    }

    /**
     * 加载模块资源（HTML、CSS、JS）
     */
    async loadModuleResources(module) {
        const basePath = module.path || `modules/${module.id}`;
        
        try {
            // 加载HTML
            if (module.htmlFile !== false) {
                const htmlPath = `${basePath}/${module.htmlFile || `${module.id}.html`}`;
                const htmlResponse = await fetch(htmlPath);
                if (htmlResponse.ok) {
                    module.html = await htmlResponse.text();
                } else {
                    console.warn(`HTML文件未找到: ${htmlPath}`);
                }
            }
            
            // 加载CSS
            if (module.cssFile !== false) {
                const cssPath = `${basePath}/${module.cssFile || `${module.id}.css`}`;
                const cssId = `module-css-${module.id}`;
                
                // 移除旧的CSS
                const oldCss = document.getElementById(cssId);
                if (oldCss) oldCss.remove();
                
                // 添加新的CSS
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = cssPath;
                document.head.appendChild(link);
            }
            
            // 加载JavaScript
            if (module.jsFile !== false) {
                const jsPath = `${basePath}/${module.jsFile || `${module.id}.js`}`;
                
                // 动态导入模块
                if (module.useModuleImport) {
                    const moduleExports = await import(jsPath);
                    const ModuleClass = moduleExports.default || moduleExports[module.className];
                    if (ModuleClass) {
                        module.instance = new ModuleClass();
                    }
                } else {
                    // 使用script标签加载（向后兼容）
                    await this.loadScript(jsPath, module.id);
                    
                    // 尝试获取全局注册的模块实例
                    const globalInstance = window[`Module_${module.id}`] || window[`${module.id}Module`];
                    if (globalInstance) {
                        module.instance = globalInstance;
                    }
                }
            }
            
            return true;
            
        } catch (error) {
            console.error('加载模块资源失败:', error);
            return false;
        }
    }

    /**
     * 渲染模块内容到插槽
     */
    async renderModule(module) {
        if (!this.moduleSlot) return;
        
        // 清空插槽
        this.moduleSlot.innerHTML = '';
        
        // 插入模块HTML
        if (module.html) {
            this.moduleSlot.innerHTML = module.html;
        } else if (module.render && typeof module.render === 'function') {
            // 支持自定义渲染函数
            const content = await module.render();
            if (typeof content === 'string') {
                this.moduleSlot.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.moduleSlot.appendChild(content);
            }
        }
        
        // 设置模块属性
        this.moduleSlot.setAttribute('data-module', module.id);
        this.moduleSlot.className = `module-content module-${module.id}`;
    }

    /**
     * 卸载模块
     */
    async unloadModule(moduleId) {
        const module = this.modules.get(moduleId);
        
        if (!module || !module.loaded) return;
        
        console.log(`卸载模块: ${moduleId}`);
        
        // 调用模块的销毁方法
        if (module.instance) {
            if (typeof module.instance.hide === 'function') {
                module.instance.hide();
            }
            if (typeof module.instance.destroy === 'function') {
                module.instance.destroy();
            }
        }
        
        // 清空插槽
        if (this.moduleSlot) {
            this.moduleSlot.innerHTML = '';
        }
        
        // 移除模块CSS
        const cssId = `module-css-${module.id}`;
        const cssElement = document.getElementById(cssId);
        if (cssElement) cssElement.remove();
        
        module.loaded = false;
        
        // 触发模块卸载事件
        this.eventBus.dispatchEvent(new CustomEvent('module-unloaded', { 
            detail: { moduleId } 
        }));
    }

    /**
     * 切换模块
     */
    async switchModule(moduleId) {
        if (this.currentModule === moduleId) {
            console.log(`模块已加载: ${moduleId}`);
            return true;
        }
        
        return await this.loadModule(moduleId);
    }

    /**
     * 重新加载当前模块
     */
    async reloadCurrentModule() {
        if (this.currentModule) {
            const moduleId = this.currentModule;
            this.currentModule = null;
            return await this.loadModule(moduleId);
        }
        return false;
    }

    /**
     * 获取所有已注册的模块
     */
    getModules() {
        return Array.from(this.modules.values());
    }

    /**
     * 获取模块信息
     */
    getModule(moduleId) {
        return this.modules.get(moduleId);
    }

    /**
     * 检查认证状态
     */
    checkAuth() {
        // 检查是否已登录
        return window.app?.isLoggedIn?.() || false;
    }

    /**
     * 显示加载中状态
     */
    showLoading() {
        if (!this.moduleSlot) return;
        
        this.moduleSlot.innerHTML = `
            <div class="module-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载模块...</div>
            </div>
        `;
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loadingElement = this.moduleSlot?.querySelector('.module-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        if (!this.moduleSlot) return;
        
        this.moduleSlot.innerHTML = `
            <div class="module-error">
                <div class="error-icon">❌</div>
                <div class="error-message">${message}</div>
                <button class="retry-btn" onclick="moduleLoader.reloadCurrentModule()">重试</button>
            </div>
        `;
    }

    /**
     * 动态加载脚本
     */
    loadScript(src, moduleId) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            const existingScript = document.querySelector(`script[data-module="${moduleId}"]`);
            if (existingScript) {
                existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.setAttribute('data-module', moduleId);
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    /**
     * 监听事件
     */
    on(event, handler) {
        this.eventBus.addEventListener(event, handler);
    }

    /**
     * 移除事件监听
     */
    off(event, handler) {
        this.eventBus.removeEventListener(event, handler);
    }

    /**
     * 触发事件
     */
    emit(event, detail) {
        this.eventBus.dispatchEvent(new CustomEvent(event, { detail }));
    }
}

// 创建全局模块加载器实例
window.moduleLoader = new ModuleLoader();