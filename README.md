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
├── encoding-fix.js         # 编码修复工具
├── start.bat / start.sh    # 跨平台启动脚本（生产模式）
├── dev.bat / dev.sh        # 跨平台开发启动脚本
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

### 跨平台启动方式

#### Windows 用户
可以使用以下任一方式启动：

**方式1：批处理文件（推荐）**
```bash
# 生产模式启动
start.bat

# 开发模式启动
dev.bat
```

**方式2：npm 脚本**
```bash
# Windows 专用启动命令
npm run start:win
npm run dev:win

# 通用启动命令（自动适配）
npm start
npm run dev
```

#### macOS/Linux 用户
可以使用以下任一方式启动：

**方式1：Shell脚本（推荐）**
```bash
# 确保脚本有执行权限
chmod +x start.sh dev.sh

# 生产模式启动
./start.sh

# 开发模式启动
./dev.sh
```

**方式2：npm 脚本**
```bash
# Unix 专用启动命令
npm run start:unix
npm run dev:unix

# 跨平台启动命令（使用cross-env）
npm run start:cross
npm run dev:cross

# 通用启动命令（自动适配）
npm start
npm run dev
```

### 启动选项说明

| 启动方式 | 平台 | 特点 | 使用场景 |
|---------|------|------|----------|
| `start.bat` / `start.sh` | Windows / macOS/Linux | 自动设置编码，显示系统信息 | 日常使用推荐 |
| `npm start` | 全平台 | 自动适配平台，使用cross-env处理 | 通用方式 |
| `npm run start:win` | Windows | Windows专用，设置UTF-8编码 | Windows特定需求 |
| `npm run start:unix` | macOS/Linux | Unix专用，设置环境变量 | Unix特定需求 |
| `npm run start:cross` | 全平台 | 使用cross-env设置NODE_OPTIONS | 开发环境推荐 |

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

### 平台特性
- **Windows**: 自动设置控制台编码为UTF-8，支持中文显示
- **macOS/Linux**: 自动配置UTF-8语言环境变量
- Cookie 信息仅保存在内存中，不会持久化存储
- 请确保网络连接稳定以保证 API 调用正常

### 故障排除

#### Windows 平台
1. **中文乱码问题**
   - 使用 `start.bat` 启动脚本，自动设置编码
   - 或手动执行: `chcp 65001`

2. **PowerShell 执行策略错误**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

#### macOS/Linux 平台
1. **Shell脚本权限问题**
   ```bash
   chmod +x start.sh dev.sh
   ```

2. **UTF-8 环境变量问题**
   ```bash
   export LC_ALL=en_US.UTF-8
   export LANG=en_US.UTF-8
   ```

3. **Node.js 版本兼容性**
   - 确保 Node.js 版本 >= 14.0
   - 推荐使用 LTS 版本

#### 通用问题
1. **依赖安装失败**
   ```bash
   # 清理缓存后重新安装
   npm cache clean --force
   npm install
   ```

2. **应用无法启动**
   ```bash
   # 检查 Electron 是否正确安装
   npx electron --version
   
   # 如果未安装，手动安装
   npm install electron --save-dev
   ```

## 更新日志

### v2.1.0 (2025-09-10)
- 🍎 **新增 macOS 支持**：完整的跨平台兼容性
- 🐧 **Linux 支持**：支持主流 Linux 发行版
- 🔧 **跨平台启动脚本**：自动适配不同操作系统
- 📝 **完善文档**：添加详细的跨平台使用说明
- 🛠️ **工具增强**：自动编码设置和环境检查
- 🔄 **多种启动方式**：提供多种启动选项满足不同需求

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