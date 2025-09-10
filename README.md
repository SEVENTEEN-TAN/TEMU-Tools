# TEMU小助手

一款基于 Electron 的 TEMU 跨境电商管理桌面应用，采用模块化架构设计，提供便捷的店铺管理功能。

## 功能特点

- 🔐 **双层认证系统**：自动管理跨境卖货平台和 TEMU 站点的认证流程
- 📦 **商品管理**：查看在售商品列表，支持 Excel 导出
- 🎯 **模块化架构**：基于插槽机制的动态模块加载系统
- 🌍 **多站点支持**：支持不同国家/地区的 TEMU 站点切换
- 💻 **跨平台**：支持 Windows、macOS 系统

## 技术架构

### 核心技术栈
- **框架**：Electron 27.0.0
- **前端**：原生 HTML5 + CSS3 + JavaScript
- **架构**：模块化插槽系统（Module Slot System）
- **进程通信**：IPC (Inter-Process Communication)

### 项目结构
```
TEMU小助手/
├── index.html              # 主界面
├── main.js                 # 主进程
├── preload.js              # 预加载脚本
├── encoding-fix.js         # Windows 编码修复
├── modules/                # 功能模块目录
│   ├── module-loader.js    # 模块加载器核心
│   └── products/           # 商品管理模块
│       ├── products.html
│       ├── products.css
│       └── products.js
├── js/                     # 核心脚本
│   ├── app.js              # 应用核心逻辑
│   └── module-registry.js  # 模块注册中心
├── styles/                 # 样式文件
│   ├── main.css            # 主样式
│   └── module-loader.css   # 模块加载器样式
└── doc/                    # API 文档
```

## 快速开始

### 环境要求
- Node.js 14.0+
- npm 或 yarn
- Windows 7/10/11 或 macOS 10.10+

### 安装与运行

```bash
# 克隆项目
git clone [项目地址]

# 进入项目目录
cd TEMU小助手

# 安装依赖
npm install

# 启动应用
npm start

# 开发模式
npm run dev
```

### Windows 用户
可直接使用提供的批处理文件：
- `start.bat` - 生产模式启动
- `dev.bat` - 开发模式启动

## 使用指南

1. **登录流程**
   - 点击"登录"按钮
   - 登录跨境卖货平台账号
   - 选择要管理的 TEMU 站点
   - 系统自动完成双层认证

2. **商品管理**
   - 登录后自动加载在售商品
   - 支持分页浏览（每页100条）
   - 点击"导出Excel"保存商品数据

3. **模块切换**
   - 通过顶部标签切换不同功能模块
   - 模块按需加载，提高性能

## 模块化架构

### 核心特性
- **动态加载**：模块按需加载，减少初始加载时间
- **插槽机制**：统一的模块容器和生命周期管理
- **事件驱动**：模块间通过事件总线通信，完全解耦
- **权限控制**：模块级别的认证检查

### 添加新模块

在 `js/module-registry.js` 中注册新模块：

```javascript
moduleLoader.registerModule('moduleName', {
    name: '模块名称',
    icon: '📊',
    description: '模块描述',
    path: 'modules/moduleName',
    requiresAuth: true
});
```

## 开发说明

### 模块开发规范
1. 每个模块独立目录，包含 HTML、CSS、JS 文件
2. 实现标准生命周期方法：init、show、hide、destroy
3. 通过事件总线与其他模块通信
4. 遵循统一的命名规范

### 调试技巧
- 主进程日志：查看控制台输出
- 渲染进程：使用开发者工具（F12）
- IPC 通信：在 preload.js 中添加日志

## 安全特性

1. **进程隔离**：主进程与渲染进程完全隔离
2. **上下文隔离**：`contextIsolation: true`
3. **禁用Node集成**：`nodeIntegration: false`
4. **Cookie加密**：敏感信息不明文存储
5. **HTTPS通信**：所有API请求使用HTTPS

## 注意事项

- Windows 系统已包含控制台编码修复
- Cookie 信息仅保存在内存中，不会持久化存储
- 请确保网络连接稳定以保证 API 调用正常

## 更新日志

### v2.0.0 (2024-09-10)
- 🎯 全新模块化架构重构
- ✨ 实现插槽式模块加载系统
- 🔧 优化商品管理界面和功能
- 🗑️ 清理冗余代码和文件
- 📦 项目结构优化

### v1.0.0 (2024-09-09)
- 🚀 初始版本发布
- 🔐 实现双层认证系统
- 📦 商品管理基础功能

## License

MIT