[根目录](../../CLAUDE.md) > [doc](../) > **登录功能**

# 登录功能模块 - 认证流程与API

## 模块职责

登录功能模块负责 TEMU小助手 的完整认证流程：
- **多阶段认证**：跨境卖货平台 → 站点选择 → TEMU 站点的完整流程
- **Cookie 管理**：双层 Cookie 的自动获取、验证和存储
- **API 集成**：用户信息获取和状态验证
- **流程指导**：为开发者提供详细的认证流程文档

## 入口与启动

### 认证流程入口
1. **初始登录页面**：`https://seller.kuajingmaihuo.com/login`
2. **站点选择页面**：`https://seller.kuajingmaihuo.com/settle/site-main`  
3. **TEMU 站点入口**：`https://agentseller.temu.com/main/authentication`

### 关键触发点
- 用户点击"登录平台"按钮
- 登录成功后自动跳转到站点选择
- 用户选择"全球/美国"站点后跳转到 TEMU

## 对外接口

### 用户信息 API
```bash
curl -X POST 'https://seller.kuajingmaihuo.com/bg/quiet/api/mms/userInfo' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: SUB_PASS_ID=eyJ0IjoiOEdzWFQ1UERZaC...' \
  -d '{}'
```

**响应示例**：
```json
{
  "success": true,
  "errorCode": 1000000,
  "result": {
    "userId": 24464941602922,
    "maskMobile": "+86 130****5118",
    "accountType": 1,
    "companyList": [{
      "malInfoList": [{
        "mallId": 634418224869329,
        "mallName": "HAPPY JAM",
        "mallStatus": 1
      }]
    }],
    "roleNameList": ["主账号"]
  }
}
```

### 核心 Cookie 清单
认证成功后获取的关键 Cookie：
- `SUB_PASS_ID` - 用户会话标识（核心）
- `api_uid` - API 用户标识
- `_bee` - 会话令牌
- `_nano_fp` - 指纹标识
- `_f77`, `_a42` - 安全标识

## 关键依赖与配置

### 认证依赖域名
- **核心认证域**：`.kuajingmaihuo.com`, `seller.kuajingmaihuo.com`
- **TEMU 业务域**：`.temu.com`, `agentseller.temu.com`

### 请求头配置
```javascript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'origin': 'https://seller.kuajingmaihuo.com',
  'referer': 'https://seller.kuajingmaihuo.com/settle/site-main',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin'
}
```

## 数据模型

### Cookie 数据模型
```javascript
// 标准 Cookie 结构
{
  name: "SUB_PASS_ID",                           // Cookie 名称
  value: "eyJ0IjoiOEdzWFQ1UER...",              // Cookie 值（通常是 JWT）
  domain: "seller.kuajingmaihuo.com",           // 所属域名
  path: "/",                                    // 路径范围
  expirationDate: 1725968856.325,               // 过期时间戳
  httpOnly: true,                               // HTTP Only 标志
  secure: true,                                 // HTTPS Only 标志
  sameSite: "None"                              // SameSite 策略
}
```

### 用户信息模型
```javascript
{
  userId: 24464941602922,           // 用户唯一标识
  maskMobile: "+86 130****5118",    // 脱敏手机号
  accountType: 1,                   // 账户类型：1=主账号
  accountStatus: 1,                 // 账户状态：1=正常
  companyList: [{                   // 关联公司列表
    companyName: "-",               // 公司名称
    malInfoList: [{                 // 店铺信息列表
      mallId: 634418224869329,      // 店铺ID
      mallName: "HAPPY JAM",        // 店铺名称
      mallStatus: 1,                // 店铺状态
      isSemiManagedMall: false      // 是否半托管
    }]
  }],
  roleNameList: ["主账号"]          // 角色权限列表
}
```

## 测试与质量

### 测试流程
1. **基础认证测试**：
   - 验证登录页面加载
   - 确认 Cookie 正确获取
   - 验证用户信息 API 调用

2. **站点切换测试**：
   - 验证站点选择页面跳转
   - 确认 TEMU 站点 Cookie 获取
   - 测试窗口自动关闭机制

3. **错误场景测试**：
   - 网络异常处理
   - Cookie 过期处理
   - API 调用失败处理

### 质量保证
- **Cookie 完整性检查**：确保获取所有必需的 Cookie
- **API 响应验证**：验证用户信息的完整性和正确性
- **流程状态跟踪**：详细的日志输出和状态提示

## 常见问题 (FAQ)

### Q: 为什么需要双层 Cookie？
A: 跨境卖货平台提供基础认证，TEMU 站点需要额外的业务授权 Cookie，两者结合才能使用完整功能。

### Q: 站点选择页面卡住不动？
A: 检查网络连接，确保能访问跨境卖货平台，等待页面完全加载后再操作。

### Q: 获取到的 Cookie 无法使用？
A: 检查 Cookie 的 domain 和 path 是否正确，确认是否已过期，验证请求头设置。

### Q: 如何手动验证 Cookie 有效性？
A: 使用获取到的 Cookie 调用用户信息 API，成功返回用户数据表示 Cookie 有效。

## 相关文件清单

### 文档文件
- `登录API.md` - 详细的登录流程和 API 说明文档
- `image.png` - 登录界面截图（已删除）

### 相关源码
- `main.js` 中的登录相关函数：
  - `createLoginWindow()` - 创建登录窗口
  - `checkLoginStatus()` - 检查登录状态
  - `getUserInfo()` - 获取用户信息
  - `getTemuCookies()` - 获取 TEMU Cookie

## 变更记录 (Changelog)

### 2025-09-09 22:57:17
- **创建登录功能模块文档**：整理认证流程和API接口说明
- **补充数据模型定义**：添加 Cookie 和用户信息的标准结构
- **完善测试指引**：提供完整的测试流程和质量保证措施

### 历史变更（基于git记录）
- **9154318** - 完成登录的Cookie操作
- **26c4ba7** - 初始化项目