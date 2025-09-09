[根目录](../CLAUDE.md) > **核心模块**

# 核心模块 - 主要业务逻辑

## 模块职责

核心模块是 TEMU小助手 的业务逻辑核心，负责：
- **主进程管理**：窗口创建、生命周期管理、系统交互
- **Cookie 认证**：双层 Cookie 获取、存储、验证和恢复
- **站点切换**：处理跨境卖货平台到 TEMU 站点的完整跳转流程
- **进程通信**：IPC 事件处理和数据传递
- **用户界面**：UI 状态管理和用户交互逻辑

## 入口与启动

### 应用入口
- **主入口**：`main.js` - Electron 主进程
- **启动脚本**：`package.json` 中定义的 scripts
- **预加载**：`preload.js` - 安全桥接层

### 启动流程
1. `main.js` 创建主窗口和菜单
2. 加载 `index.html` 主界面
3. `preload.js` 建立安全的 IPC 通信
4. `renderer.js` 初始化 UI 交互逻辑
5. 等待用户触发登录流程

## 对外接口

### IPC 通信接口

#### 主进程暴露接口（通过 preload.js）
```javascript
// 登录相关
electronAPI.openLogin()           // 打开登录窗口
electronAPI.getLoginStatus()      // 获取登录状态  
electronAPI.logout()              // 退出登录
electronAPI.switchSite()          // 切换站点

// 事件监听
electronAPI.onLoginSuccess()      // 登录成功事件
electronAPI.onSiteSelected()      // 站点选择完成事件
```

#### HTTP API 接口
```javascript
// 用户信息获取
POST https://seller.kuajingmaihuo.com/bg/quiet/api/mms/userInfo

// 商品数据获取  
POST https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery
```

### 窗口管理接口
- **主窗口**：1200x750px，可调整大小，最小 1000x650px
- **登录窗口**：1200x800px，模态窗口，自动管理
- **开发者工具**：自动开启（生产环境应关闭）

## 关键依赖与配置

### 核心依赖
```json
{
  "electron": "^27.0.0",        // 主框架
  "electron-builder": "^24.6.4" // 构建工具
}
```

### 关键配置
- **安全配置**：
  - `nodeIntegration: false` - 禁用 Node.js 集成
  - `contextIsolation: true` - 启用上下文隔离
- **窗口配置**：自动隐藏菜单栏，支持最小尺寸限制
- **编码配置**：Windows 平台自动设置 UTF-8 编码

## 数据模型

### Cookie 数据结构
```javascript
// 核心站点 Cookie
{
  name: "SUB_PASS_ID",
  value: "eyJ0IjoiLi4uIixinYiOjEsInMiOjEwMDAwLCJ1IjoyNDQ2NDk0MTYwMjkyMn0=",
  domain: "seller.kuajingmaihuo.com", 
  path: "/",
  expirationDate: 1725968856.325,
  httpOnly: true,
  secure: true
}

// TEMU 站点 Cookie  
{
  name: "_bee",
  value: "snPhSxs5lqJ3lRPmGBtgxpODwqg2lapz",
  domain: ".temu.com",
  // ... 其他属性
}
```

### 用户信息数据结构
```javascript
{
  username: "跨境卖家",
  userId: "24464941602922", 
  email: "+86 130****5118",
  accountType: "主账号",
  mallName: "HAPPY JAM",
  mallId: "634418224869329",
  currentSite: "TEMU全球站点",
  cookieData: {
    cookies: [...],      // 核心站点 Cookie 数组
    cookieString: "..."  // 可直接使用的 Cookie 字符串
  },
  temuCookieData: {
    cookies: [...],      // TEMU 站点 Cookie 数组  
    cookieString: "..."  // TEMU Cookie 字符串
  }
}
```

## 测试与质量

### 当前测试覆盖
- **手动测试**：通过开发者控制台验证关键功能
- **集成测试**：完整的登录→站点选择→Cookie获取流程
- **错误处理**：API 调用失败和网络异常场景

### 质量保证措施
- **错误日志**：详细的控制台输出和错误追踪
- **用户提示**：登录流程中的可视化提示
- **状态恢复**：Cookie 持久化和会话恢复
- **安全验证**：Cookie 有效性检查

### 测试建议
1. **Cookie 管理测试**：
   - 验证双层 Cookie 正确获取
   - 测试 Cookie 过期和刷新机制
   - 验证站点切换时的 Cookie 恢复

2. **错误场景测试**：
   - 网络断开时的处理
   - API 返回错误时的回退机制  
   - 登录失败时的用户提示

## 常见问题 (FAQ)

### Q: 登录后无法获取 Cookie？
A: 检查网络连接，确保能访问 `seller.kuajingmaihuo.com`，查看控制台是否有错误信息。

### Q: 站点选择后没有跳转？
A: 确保选择"全球/美国"站点，检查是否被浏览器拦截弹窗。

### Q: TEMU Cookie 获取失败？
A: 等待页面完全加载后再操作，确保已成功跳转到 `agentseller.temu.com`。

### Q: 如何查看已保存的 Cookie？
A: 在控制台输入 `global.savedCookies` 查看核心站点 Cookie，`global.temuCookies` 查看 TEMU Cookie。

## 相关文件清单

### 核心文件
- `main.js` (681行) - 主进程逻辑，窗口管理和 Cookie 处理
- `renderer.js` (348行) - 渲染进程逻辑，UI 交互和状态管理  
- `preload.js` (36行) - 预加载脚本，IPC 通信桥接
- `index.html` (660行) - 主界面模板和样式定义

### 配置文件
- `package.json` - 项目配置和依赖管理
- `.gitignore` - 版本控制忽略规则

### 工具文件
- `encoding-fix.js` (36行) - Windows 编码修复工具
- `start.bat`, `start.ps1`, `dev.bat` - 启动脚本

## 变更记录 (Changelog)

### 2025-09-09 22:57:17
- **创建核心模块文档**：详细记录主要业务逻辑和接口
- **完善数据模型说明**：添加 Cookie 和用户信息的数据结构
- **补充测试指引**：提供测试覆盖情况和改进建议