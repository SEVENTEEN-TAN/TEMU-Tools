[根目录](../../CLAUDE.md) > [doc](../) > **获取在售商品**

# 商品管理模块 - 商品数据获取与处理

## 模块职责

商品管理模块负责 TEMU 平台商品数据的获取和处理：
- **商品列表获取**：分页查询在售商品信息
- **商品详情解析**：完整的商品属性、SKU、库存信息
- **分类数据处理**：商品类目树和属性模板解析
- **库存状态管理**：实时库存和销售数据跟踪

## 入口与启动

### API 入口
- **主要接口**：`https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery`
- **请求方法**：POST
- **认证要求**：需要有效的 TEMU 站点 Cookie

### 调用前置条件
1. 完成双层登录认证（核心站点 + TEMU 站点）
2. 获取有效的 TEMU Cookie（包含 `_bee`, `seller_temp` 等）
3. 设置正确的 `mallid` 请求头（店铺ID）

## 对外接口

### 商品列表查询 API
```bash
curl -X POST 'https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery' \
  -H 'Content-Type: application/json' \
  -H 'mallid: 634418224869329' \
  -H 'Cookie: api_uid=CuJB1Gi6f7gnUQBVBLi/Ag==; _bee=snPhSxs5lqJ3lRPmGBtgxpODwqg2lapz; seller_temp=N_eyJ0IjoiTGhFei...' \
  -d '{"page":1,"pageSize":50,"skcTopStatus":100}'
```

### 请求参数
```javascript
{
  page: 1,              // 页码（从1开始）
  pageSize: 50,         // 每页商品数量（最大100）
  skcTopStatus: 100     // 商品状态筛选（100=全部）
}
```

### 响应数据结构
```javascript
{
  success: true,
  errorCode: 1000000,
  result: {
    total: 98,          // 总商品数
    pageItems: [...]    // 商品列表数组
  }
}
```

## 关键依赖与配置

### 必需请求头
```javascript
{
  'Content-Type': 'application/json',
  'mallid': '634418224869329',                    // 店铺ID（必需）
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'origin': 'https://agentseller.temu.com',
  'referer': 'https://agentseller.temu.com/goods/list',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin'
}
```

### 关键 Cookie
- `api_uid` - API 用户标识
- `_bee` - TEMU 会话令牌（核心）
- `seller_temp` - 卖家临时令牌
- `mallid` - 店铺ID Cookie
- `_nano_fp` - 设备指纹

## 数据模型

### 商品基础信息
```javascript
{
  productId: 4565222906,                    // 商品ID
  productSkcId: 85853265963,               // SKC ID
  productName: "3条装 男士超薄透视打底裤 混色紧身裤 透气高弹运动健身裤",
  productType: 1,                          // 商品类型
  sourceType: 1,                           // 来源类型
  goodsId: 601103415926079,                // 商品唯一标识
  extCode: "AD773",                        // 外部编码
  skcStatus: 11,                           // SKC状态
  skcSiteStatus: 1,                        // 站点状态
  mainImageUrl: "https://img.kwcdn.com/product/open/a59ab5ab819f45a398f48bcc8f80198e-goods.jpeg"
}
```

### 商品分类信息
```javascript
{
  leafCat: {                               // 叶子类目
    catId: 30228,
    catName: "男士新奇平角内裤",
    catType: 1
  },
  categories: {                            // 完整类目路径
    cat1: { catId: 27011, catName: "服装、鞋靴和珠宝饰品" },
    cat2: { catId: 30065, catName: "新奇物品" },
    cat3: { catId: 30066, catName: "新奇服装和产品" },
    // ... 最多到cat10
  }
}
```

### SKU 信息模型
```javascript
{
  productSkuId: 22406403126,               // SKU ID
  productSkuSpecList: [                    // 规格列表
    {
      parentSpecId: 1001,                  // 父规格ID
      parentSpecName: "颜色",              // 父规格名称
      specId: 21263,                       // 规格ID
      specName: "混合色"                   // 规格值
    }
  ],
  supplierPrice: 7202,                     // 供货价（分为单位）
  currencyType: "CNY",                     // 货币类型
  virtualStock: 159,                       // 虚拟库存
  extCode: "(3)AD773-multi-S"             // SKU外部编码
}
```

### 商品属性模型
```javascript
{
  templatePid: 532853,                     // 模板属性ID
  pid: 1,                                  // 属性ID
  refPid: 12,                              // 关联属性ID
  propName: "材质",                        // 属性名称
  vid: 52,                                 // 属性值ID
  propValue: "尼龙",                       // 属性值
  valueUnit: "%",                          // 单位（可选）
  numberInputValue: "67.00"                // 数值输入（可选）
}
```

## 测试与质量

### API 测试要点
1. **认证测试**：
   - 验证 Cookie 有效性
   - 测试 mallid 参数正确性
   - 确认请求头完整性

2. **分页测试**：
   - 测试不同页码和页大小
   - 验证总数计算准确性
   - 测试边界条件（空结果、超出范围）

3. **数据完整性测试**：
   - 验证商品基础信息完整
   - 检查SKU数据一致性
   - 确认图片URL可访问

### 错误处理
- **认证失败**：Cookie 过期或无效
- **权限不足**：店铺ID不匹配或无权限
- **网络异常**：请求超时或连接失败
- **数据异常**：返回格式不符合预期

## 常见问题 (FAQ)

### Q: API 返回 401 错误？
A: 检查 TEMU Cookie 是否有效，确认已完成完整的双层登录流程。

### Q: 返回数据为空但状态成功？
A: 检查 mallid 请求头是否正确，确认店铺是否有在售商品。

### Q: 商品图片无法显示？
A: TEMU 图片使用 CDN，可能存在防盗链，需要设置正确的 referer。

### Q: 如何获取更多商品信息？
A: 当前 API 返回基础信息，详细信息需要调用商品详情 API（需要单独的接口）。

### Q: SKU 价格单位是什么？
A: supplierPrice 以分为单位，需要除以100得到元价格。

## 相关文件清单

### 文档文件
- `获取在售商品.md` - 详细的API调用示例和响应数据

### 相关源码位置
- `main.js` 中的相关逻辑（计划中）：
  - 商品数据获取函数
  - 数据解析和处理逻辑
  - 批量操作支持

### 未来扩展计划
- 商品详情获取 API
- 商品编辑和更新接口
- 库存批量调整功能
- 商品上下架管理

## 变更记录 (Changelog)

### 2025-09-09 22:57:17
- **创建商品管理模块文档**：整理商品API接口和数据模型
- **补充数据结构说明**：详细定义商品、SKU、属性等数据模型
- **完善错误处理指引**：提供常见问题的排查和解决方案