/**
 * 模块注册
 * 在这里注册所有可用的功能模块
 */

function registerModules() {
    console.log('注册功能模块...');
    
    // 仪表板模块（默认首页）
    moduleLoader.registerModule('dashboard', {
        name: '仪表板',
        icon: '📊',
        description: 'Cookie状态和数据概览',
        path: 'modules/dashboard',
        htmlFile: 'dashboard.html',
        cssFile: 'dashboard.css',
        jsFile: 'dashboard.js',
        requiresAuth: false,  // 仪表板不需要认证也能查看
        loadPriority: 0,      // 最高优先级
        useModuleImport: false
    });
    
    // 在售商品模块
    moduleLoader.registerModule('products', {
        name: '在售商品',
        icon: '📦',
        description: '管理在售商品，支持查看和导出',
        path: 'modules/products',
        htmlFile: 'products.html',
        cssFile: 'products.css',
        jsFile: 'products.js',
        requiresAuth: true,
        loadPriority: 1,
        useModuleImport: false
    });
    
    // 取消活动模块
    moduleLoader.registerModule('cancel-activity', {
        name: '取消活动',
        icon: '🚫',
        description: '查询商品活动并取消活动',
        path: 'modules/cancel-activity',
        htmlFile: 'cancel-activity.html',
        cssFile: 'cancel-activity.css',
        jsFile: 'cancel-activity.js',
        requiresAuth: true,
        loadPriority: 2,
        useModuleImport: false
    });
    
    // 订单管理模块（示例）
    moduleLoader.registerModule('orders', {
        name: '订单管理',
        icon: '📋',
        description: '查看和处理订单',
        path: 'modules/orders',
        requiresAuth: true,
        loadPriority: 3,
        // 如果模块不存在，将显示占位内容
        render: async () => {
            return `
                <div style="padding: 40px; text-align: center;">
                    <h2>订单管理</h2>
                    <p style="color: #718096; margin-top: 20px;">该模块正在开发中...</p>
                </div>
            `;
        }
    });
    
    // 数据分析模块（示例）
    moduleLoader.registerModule('analytics', {
        name: '数据分析',
        icon: '📊',
        description: '销售数据分析和报表',
        path: 'modules/analytics',
        requiresAuth: true,
        loadPriority: 4,
        render: async () => {
            return `
                <div style="padding: 40px; text-align: center;">
                    <h2>数据分析</h2>
                    <p style="color: #718096; margin-top: 20px;">该模块正在开发中...</p>
                </div>
            `;
        }
    });
    
    // 店铺设置模块（示例）
    moduleLoader.registerModule('settings', {
        name: '店铺设置',
        icon: '⚙️',
        description: '管理店铺配置和设置',
        path: 'modules/settings',
        requiresAuth: true,
        loadPriority: 5,
        render: async () => {
            return `
                <div style="padding: 40px; text-align: center;">
                    <h2>店铺设置</h2>
                    <p style="color: #718096; margin-top: 20px;">该模块正在开发中...</p>
                </div>
            `;
        }
    });
    
    // 帮助中心模块
    moduleLoader.registerModule('help', {
        name: '帮助中心',
        icon: '❓',
        description: '使用指南和常见问题',
        path: 'modules/help',
        requiresAuth: false,  // 不需要登录即可访问
        loadPriority: 6,
        render: async () => {
            return `
                <div style="padding: 40px;">
                    <h2>帮助中心</h2>
                    <div style="margin-top: 30px;">
                        <h3>快速开始</h3>
                        <ol style="margin-top: 15px; line-height: 2;">
                            <li>点击"登录"按钮，登录跨境卖货平台</li>
                            <li>选择您要管理的TEMU站点</li>
                            <li>系统将自动完成认证</li>
                            <li>选择功能模块开始使用</li>
                        </ol>
                        
                        <h3 style="margin-top: 30px;">功能模块</h3>
                        <ul style="margin-top: 15px; line-height: 2;">
                            <li><strong>在售商品</strong>：查看在售商品，支持Excel导出</li>
                            <li><strong>订单管理</strong>：处理订单（开发中）</li>
                            <li><strong>数据分析</strong>：销售报表（开发中）</li>
                            <li><strong>店铺设置</strong>：配置管理（开发中）</li>
                        </ul>
                        
                        <h3 style="margin-top: 30px;">常见问题</h3>
                        <div style="margin-top: 15px;">
                            <p><strong>Q: 如何切换不同的TEMU站点？</strong></p>
                            <p style="margin-top: 10px; color: #718096;">A: 退出登录后重新登录，在站点选择页面选择其他站点。</p>
                            
                            <p style="margin-top: 20px;"><strong>Q: 商品数据多久更新一次？</strong></p>
                            <p style="margin-top: 10px; color: #718096;">A: 进入在售商品模块时自动获取最新数据，也可手动点击刷新。</p>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    console.log(`已注册 ${moduleLoader.getModules().length} 个模块`);
}

// 导出注册函数
window.registerModules = registerModules;