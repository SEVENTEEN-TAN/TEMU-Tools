# TEMU小助手 - 批量取消活动功能改造规划

## 项目概述

**目标**：将现有的单SPU取消活动功能升级为支持批量SPU操作的高效管理工具，通过智能的活动分组和批量选择机制，大幅提升用户的操作效率。

**当前状态**：单SPU查询 → 单活动选择 → 单个取消  
**目标状态**：批量SPU输入 → 智能活动分组 → 批量选择取消

## 技术架构决策

### 已确认的技术方案
- **架构延续**：基于现有 CancelActivityModule 类扩展，保持向下兼容
- **技术栈**：原生 JavaScript + Electron IPC + 纯CSS样式
- **数据聚合**：按 activityName 分组策略，支持同名活动批量操作
- **状态管理**：扩展现有类属性状态管理机制

### 核心设计原则
- **SOLID**：单一职责，每个方法专注特定功能
- **KISS**：保持界面和交互的简洁直观
- **DRY**：复用现有组件和样式，避免重复开发
- **YAGNI**：仅实现核心批量功能，避免过度设计

## 详细实施计划

### 阶段 1：数据结构重构（预估9小时）

#### 任务 1.1：扩展状态管理模型（2小时）
**目标**：支持多SPU的状态追踪和活动数据存储

**当前状态结构**：
```javascript
this.state = {
    currentProductId: null,      // 单个商品ID
    currentActivities: [],       // 单个商品的活动列表
    selectedActivity: null,      // 选中的单个活动
    isLoading: false
};
```

**目标状态结构**：
```javascript
this.state = {
    // 保持向下兼容的单SPU字段
    currentProductId: null,
    currentActivities: [],
    selectedActivity: null,
    isLoading: false,
    
    // 新增批量操作字段
    batchMode: false,                    // 批量模式标志
    inputSpuList: [],                    // 输入的SPU列表
    batchProductsData: [],               // 所有商品的数据
    batchActivitiesData: [],             // 所有活动的原始数据
    groupedActivities: {},               // 按activityName分组的活动
    selectedActivityGroups: new Set(),   // 选中的活动组
    batchProgress: {                     // 批量操作进度
        total: 0,
        completed: 0,
        failed: 0,
        results: []
    }
};
```

**涉及文件**：`cancel-activity.js:8-16`

#### 任务 1.2：设计活动聚合数据结构（3小时）
**目标**：创建按activityName分组的数据结构，便于批量操作

**聚合数据结构设计**：
```javascript
// 分组活动数据结构
groupedActivities: {
    "限时秒杀-双11大促": {
        activityName: "限时秒杀-双11大促",
        activityType: 1,
        totalCount: 15,              // 参与此活动的SPU总数
        productIds: [...],           // 参与的商品ID列表
        enrollIds: [...],            // 对应的报名ID列表
        activities: [...]            // 详细活动数据
    }
}
```

**新增核心方法**：
- `aggregateActivitiesByName()` - 活动分组聚合
- `calculateGroupStatistics()` - 分组统计计算
- `getGroupedActivityList()` - 获取分组列表

#### 任务 1.3：优化API调用策略（4小时）
**目标**：实现并发查询多个SPU，提升查询效率

**并发控制策略**：
- 并发数限制：3个
- 错误重试机制：最多重试2次
- 超时控制：单个请求30秒超时

**新增方法**：
- `batchQueryActivities(spuList)` - 批量查询控制器
- `concurrentRequest(requests, limit)` - 并发请求管理器
- `handleBatchQueryResults(results)` - 批量结果处理器

### 阶段 2：UI界面改造（预估15小时）

#### 任务 2.1：重新设计SPU输入界面（3小时）
**目标**：支持多行输入、智能解析、输入验证

**界面改造方案**：
```html
<div class="input-group">
    <div class="input-mode-switcher">
        <button class="mode-btn active" data-mode="single">单个SPU</button>
        <button class="mode-btn" data-mode="batch">批量SPU</button>
    </div>
    
    <!-- 单个模式（保持兼容） -->
    <div id="single-input" class="input-container">
        <input type="text" id="product-spu" placeholder="请输入商品SPU">
    </div>
    
    <!-- 批量模式 -->
    <div id="batch-input" class="input-container" style="display:none;">
        <textarea id="batch-spu-input" 
                  placeholder="请输入多个SPU，支持换行、逗号、空格分隔&#10;例如：&#10;4975750079&#10;4975750080&#10;4975750081"
                  rows="5"></textarea>
        <div class="input-stats">
            <span id="spu-count">已识别 0 个SPU</span>
            <span id="spu-validation"></span>
        </div>
    </div>
    
    <button id="query-activities-btn" class="btn btn-primary">查询活动</button>
</div>
```

**智能解析功能**：
- 支持换行、逗号、空格、制表符分隔
- 自动去重和格式验证
- 实时显示解析结果统计

#### 任务 2.2：创建商品信息汇总展示组件（4小时）
**目标**：以紧凑的卡片形式展示多个商品的基本信息

**汇总展示设计**：
```html
<div class="step-section" id="products-summary-section">
    <h3 class="step-title">
        步骤2：商品信息汇总 
        <span class="summary-stats">(成功: <span id="success-count">0</span> / 失败: <span id="failed-count">0</span>)</span>
    </h3>
    
    <div class="products-grid" id="products-grid">
        <!-- 动态生成商品卡片 -->
    </div>
    
    <div class="failed-products" id="failed-products" style="display:none;">
        <h4>查询失败的商品</h4>
        <div class="failed-list"></div>
    </div>
</div>
```

**商品卡片样式**：
- 紧凑的网格布局（3-4列）
- 显示商品图片、名称、SPU
- 活动数量标记
- 失败状态标识

#### 任务 2.3：设计活动分组展示界面（5小时）
**目标**：按activityName分组展示活动，支持展开/收起和批量选择

**分组展示结构**：
```html
<div class="step-section" id="activities-groups-section">
    <h3 class="step-title">步骤3：选择要取消的活动组</h3>
    
    <div class="batch-selection-controls">
        <button class="btn btn-sm" id="select-all-groups">全选</button>
        <button class="btn btn-sm" id="unselect-all-groups">取消全选</button>
        <span class="selection-stats">已选择 <span id="selected-groups-count">0</span> 个活动组</span>
    </div>
    
    <div class="activity-groups-container" id="activity-groups-container">
        <!-- 动态生成活动分组 -->
    </div>
</div>
```

**分组卡片功能**：
- 可折叠的分组标题
- 批量选择checkbox
- 显示参与商品数量
- 展开显示详细活动信息

#### 任务 2.4：实现批量操作进度展示（3小时）
**目标**：提供清晰的批量操作进度反馈和结果统计

**进度展示组件**：
```html
<div class="batch-progress-section" id="batch-progress-section" style="display:none;">
    <div class="progress-header">
        <h4>批量取消进度</h4>
        <span class="progress-stats">
            <span id="progress-completed">0</span> / <span id="progress-total">0</span>
        </span>
    </div>
    
    <div class="progress-bar">
        <div class="progress-fill" id="progress-fill" style="width: 0%;"></div>
    </div>
    
    <div class="progress-details" id="progress-details">
        <!-- 详细进度日志 -->
    </div>
</div>
```

### 阶段 3：功能逻辑增强（预估17小时）

#### 任务 3.1：实现批量查询控制器（4小时）
**目标**：并发查询多个SPU活动，合并结果并处理异常

**核心方法实现**：
```javascript
async batchQueryActivities(spuList) {
    const results = [];
    const failedSpus = [];
    
    // 并发控制查询
    const chunks = this.chunkArray(spuList, 3); // 每次并发3个
    
    for (const chunk of chunks) {
        const promises = chunk.map(spu => 
            this.querySingleSpu(spu).catch(error => ({ spu, error }))
        );
        
        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);
    }
    
    return this.processBatchQueryResults(results);
}
```

#### 任务 3.2：开发活动智能分组算法（3小时）
**目标**：按活动名称分组，计算可批量操作的活动集合

**分组算法核心**：
```javascript
groupActivitiesByName(allActivities) {
    const groups = {};
    
    allActivities.forEach(activity => {
        const key = activity.activityName;
        
        if (!groups[key]) {
            groups[key] = {
                activityName: key,
                activityType: activity.activityType,
                activities: [],
                productIds: new Set(),
                enrollIds: []
            };
        }
        
        groups[key].activities.push(activity);
        groups[key].productIds.add(activity.productId);
        groups[key].enrollIds.push(activity.enrollId);
    });
    
    return groups;
}
```

#### 任务 3.3：构建批量选择管理器（3小时）
**目标**：管理用户的批量选择状态，支持全选、反选等操作

**选择管理器功能**：
- 分组级别的选择控制
- 全选/取消全选操作
- 选择状态持久化
- 选择数量统计

#### 任务 3.4：实现批量取消执行器（4小时）
**目标**：批量执行取消操作，提供详细的执行结果反馈

**批量执行策略**：
```javascript
async executeBatchCancel(selectedGroups, cancelReason) {
    const results = {
        total: 0,
        successful: 0,
        failed: 0,
        details: []
    };
    
    for (const group of selectedGroups) {
        for (const enrollId of group.enrollIds) {
            try {
                const result = await this.cancelSingleActivity(enrollId, cancelReason);
                results.successful++;
                results.details.push({ enrollId, status: 'success', result });
            } catch (error) {
                results.failed++;
                results.details.push({ enrollId, status: 'failed', error });
            }
        }
    }
    
    return results;
}
```

#### 任务 3.5：完善错误处理和用户体验（3小时）
**目标**：添加全面的异常处理、用户提示和操作引导

**用户体验优化**：
- 详细的错误信息和处理建议
- 操作确认和二次确认机制
- 友好的加载状态和进度提示
- 操作结果的详细展示和导出功能

## 待用户决策的关键问题

### 问题 1：SPU批量输入方式选择
**选项A（推荐）**：多行文本框 + 智能解析
- ✅ 支持快速粘贴，用户体验好
- ⚠️ 需要解析逻辑，可能存在格式识别误差

**选项B**：动态添加输入框
- ✅ 每个SPU独立输入，清晰准确
- ⚠️ 大量SPU时操作繁琐

### 问题 2：活动展示策略选择
**选项A（推荐）**：按活动名称分组 + 折叠展示
- ✅ 页面简洁，支持批量选择
- ⚠️ 需要展开交互查看详情

**选项B**：平铺展示 + 活动标记
- ✅ 信息一目了然
- ⚠️ 页面可能过长

### 问题 3：并发控制策略选择
**选项A（推荐）**：限制并发数（3个） + 队列处理
- ✅ 稳定可靠，避免服务器过载
- ⚠️ 大批量时耗时较长

**选项B**：无限制并发
- ✅ 速度最快
- ⚠️ 可能触发限制或网络问题

## 实施时间评估

- **总预估工作量**：41小时
- **开发周期**：5-7个工作日
- **测试和优化**：2-3个工作日
- **整体交付周期**：1-2周

## 技术风险评估

### 中等风险
- **API并发限制**：TEMU服务器可能有并发请求限制
- **数据聚合复杂度**：不同SPU的活动数据结构可能存在差异

### 低风险
- **UI兼容性**：基于现有样式扩展，风险较低
- **功能向下兼容**：保留原有功能，兼容性有保障

### 缓解方案
- 实现动态并发数调整机制
- 添加详细的数据验证和异常处理
- 分阶段发布，逐步验证功能稳定性

---

**创建时间**：2025-09-14  
**规划版本**：v1.0  
**状态**：等待用户确认关键决策