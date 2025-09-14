# TEMU小助手 - 批量取消活动功能改造规划 v1.1

## 用户确认的技术方案

✅ **SPU批量输入方式**：多行文本框 + 智能解析（逗号分隔为主，换行符为辅）  
✅ **活动展示策略**：按活动分组 + 折叠展示  
✅ **并发控制策略**：限制并发数（3个）+ 队列处理  

## 项目概述

**目标**：将现有的单个SPU活动取消功能改造为支持批量操作的高效工具，通过智能输入解析、分组展示和并发控制，提供优秀的用户体验和稳定的系统性能。

**技术栈**：原生 HTML5 + CSS3 + JavaScript + Electron IPC

## 详细实施计划

### 阶段 1：输入解析与验证改造（预估7-8小时）

#### 任务 1.1：改造 SPU 输入界面（2-3小时）
**目标**：将单行输入框改为多行文本框，支持批量SPU输入

**具体改造方案**：
```html
<!-- 原有单行输入 -->
<div class="input-group">
    <label for="product-spu">商品SPU：</label>
    <input type="text" id="product-spu" placeholder="请输入商品SPU，例如：4975750079" class="form-input">
    <button id="query-activities-btn" class="btn btn-primary">查询活动</button>
</div>

<!-- 改造后的批量输入 -->
<div class="input-group">
    <div class="input-mode-selector">
        <label class="toggle-label">
            <input type="checkbox" id="batch-mode-toggle">
            <span class="toggle-slider"></span>
            <span class="toggle-text">批量模式</span>
        </label>
    </div>
    
    <!-- 单个模式（保持兼容） -->
    <div id="single-input-container" class="input-container">
        <label for="product-spu">商品SPU：</label>
        <input type="text" id="product-spu" placeholder="请输入商品SPU，例如：4975750079" class="form-input">
    </div>
    
    <!-- 批量模式 -->
    <div id="batch-input-container" class="input-container" style="display:none;">
        <label for="batch-product-spu">批量商品SPU：</label>
        <textarea id="batch-product-spu" 
                  placeholder="请输入多个SPU，用逗号分隔，例如：4975750079,4975750080,4975750081" 
                  class="form-textarea" 
                  rows="4"></textarea>
        <div class="input-stats">
            <span id="spu-count">识别到 0 个SPU</span>
            <span id="spu-validation" class="validation-info"></span>
        </div>
    </div>
    
    <button id="query-activities-btn" class="btn btn-primary">查询活动</button>
</div>
```

**CSS样式补充**：
```css
/* 切换开关样式 */
.input-mode-selector {
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.toggle-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 8px;
}

.toggle-label input[type="checkbox"] {
    display: none;
}

.toggle-slider {
    width: 40px;
    height: 20px;
    background: #ccc;
    border-radius: 20px;
    position: relative;
    transition: all 0.3s;
}

.toggle-slider:before {
    content: '';
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s;
}

.toggle-label input:checked + .toggle-slider {
    background: #3b82f6;
}

.toggle-label input:checked + .toggle-slider:before {
    transform: translateX(20px);
}

/* 批量输入框样式 */
.input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-textarea {
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    resize: vertical;
    min-height: 100px;
    outline: none;
    transition: all 0.3s;
}

.form-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #6b7280;
}

.validation-info.error {
    color: #ef4444;
}

.validation-info.success {
    color: #10b981;
}
```

**涉及文件**：
- `modules/cancel-activity/cancel-activity.html` (第14-18行)
- `modules/cancel-activity/cancel-activity.css` (新增样式)

#### 任务 1.2：实现 SPU 智能解析逻辑（2-3小时）
**目标**：解析用户输入的多个SPU，支持逗号分隔和换行符分隔

**核心解析方法**：
```javascript
/**
 * 智能解析SPU输入
 * @param {string} inputText - 用户输入的文本
 * @returns {Object} { spus: Array, errors: Array, stats: Object }
 */
parseSPUInput(inputText) {
    const result = {
        spus: [],
        errors: [],
        stats: {
            total: 0,
            valid: 0,
            invalid: 0,
            duplicates: 0
        }
    };
    
    // 1. 基础清理
    let cleanText = inputText.trim();
    if (!cleanText) return result;
    
    // 2. 智能分隔符检测和分割
    let rawSpus = [];
    if (cleanText.includes(',')) {
        // 优先使用逗号分隔
        rawSpus = cleanText.split(',');
    } else if (cleanText.includes('\n')) {
        // 备选换行符分隔
        rawSpus = cleanText.split('\n');
    } else if (cleanText.includes('\t')) {
        // 制表符分隔
        rawSpus = cleanText.split('\t');
    } else if (cleanText.includes(' ')) {
        // 空格分隔（最后备选）
        rawSpus = cleanText.split(/\s+/);
    } else {
        // 单个SPU
        rawSpus = [cleanText];
    }
    
    // 3. 清理、验证和去重
    const seenSpus = new Set();
    
    rawSpus.forEach((spu, index) => {
        const cleanSpu = spu.trim();
        result.stats.total++;
        
        if (!cleanSpu) return; // 跳过空字符串
        
        // SPU格式验证（数字，10-15位）
        if (!/^\d{10,15}$/.test(cleanSpu)) {
            result.errors.push({
                index: index + 1,
                value: cleanSpu,
                reason: 'SPU格式错误：应为10-15位数字'
            });
            result.stats.invalid++;
            return;
        }
        
        // 去重检查
        if (seenSpus.has(cleanSpu)) {
            result.errors.push({
                index: index + 1,
                value: cleanSpu,
                reason: '重复的SPU'
            });
            result.stats.duplicates++;
            return;
        }
        
        seenSpus.add(cleanSpu);
        result.spus.push(cleanSpu);
        result.stats.valid++;
    });
    
    return result;
}

/**
 * 更新输入统计显示
 * @param {Object} parseResult - 解析结果
 */
updateInputStats(parseResult) {
    const spuCountEl = document.getElementById('spu-count');
    const validationEl = document.getElementById('spu-validation');
    
    if (spuCountEl) {
        spuCountEl.textContent = `识别到 ${parseResult.spus.length} 个有效SPU`;
    }
    
    if (validationEl) {
        if (parseResult.errors.length > 0) {
            validationEl.textContent = `${parseResult.errors.length} 个错误`;
            validationEl.className = 'validation-info error';
        } else if (parseResult.spus.length > 0) {
            validationEl.textContent = '格式正确';
            validationEl.className = 'validation-info success';
        } else {
            validationEl.textContent = '';
            validationEl.className = 'validation-info';
        }
    }
}
```

**涉及文件**：`modules/cancel-activity/cancel-activity.js`

#### 任务 1.3：增强输入验证和提示（2小时）
**目标**：实时验证SPU格式，提供输入统计和错误提示

**实时验证功能**：
```javascript
/**
 * 绑定批量输入相关事件
 */
bindBatchInputEvents() {
    // 模式切换
    const batchModeToggle = document.getElementById('batch-mode-toggle');
    if (batchModeToggle) {
        batchModeToggle.addEventListener('change', (e) => {
            this.toggleBatchMode(e.target.checked);
        });
    }
    
    // 实时解析验证
    const batchInput = document.getElementById('batch-product-spu');
    if (batchInput) {
        let timeoutId;
        batchInput.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const parseResult = this.parseSPUInput(e.target.value);
                this.updateInputStats(parseResult);
                this.state.currentBatchParseResult = parseResult;
            }, 300); // 防抖300ms
        });
    }
}

/**
 * 切换批量模式
 * @param {boolean} isBatchMode - 是否批量模式
 */
toggleBatchMode(isBatchMode) {
    const singleContainer = document.getElementById('single-input-container');
    const batchContainer = document.getElementById('batch-input-container');
    
    if (singleContainer && batchContainer) {
        if (isBatchMode) {
            singleContainer.style.display = 'none';
            batchContainer.style.display = 'block';
            this.state.batchMode = true;
        } else {
            singleContainer.style.display = 'block';
            batchContainer.style.display = 'none';
            this.state.batchMode = false;
        }
    }
}
```

### 阶段 2：数据结构与UI重构（预估10-12小时）

#### 任务 2.1：重构活动数据结构（3-4小时）
**目标**：将单个商品的活动数据重构为支持多商品的分组数据结构

**新增状态结构**：
```javascript
constructor() {
    this.state = {
        // 保持原有状态（向下兼容）
        currentProductId: null,
        currentActivities: [],
        selectedActivity: null,
        isLoading: false,
        
        // 新增批量状态
        batchMode: false,                    // 批量模式标志
        currentBatchParseResult: null,       // 当前解析结果
        batchProductsData: new Map(),        // SPU -> 商品数据映射
        batchActivitiesData: [],             // 所有活动的原始数据
        groupedActivities: new Map(),        // activityName -> 分组数据
        selectedGroups: new Set(),           // 选中的活动组
        batchProgress: {                     // 批量操作进度
            total: 0,
            completed: 0,
            failed: 0,
            current: '',
            results: []
        }
    };
}
```

**活动分组算法**：
```javascript
/**
 * 按活动名称分组活动数据
 * @param {Array} allActivities - 所有活动数据
 * @returns {Map} 分组后的活动数据
 */
groupActivitiesByName(allActivities) {
    const groups = new Map();
    
    allActivities.forEach(activityData => {
        const { productId, activities } = activityData;
        
        activities.forEach(activity => {
            if (activity.feedbackEnrollInfoList) {
                activity.feedbackEnrollInfoList.forEach(enrollInfo => {
                    const key = activity.activityName;
                    
                    if (!groups.has(key)) {
                        groups.set(key, {
                            activityName: activity.activityName,
                            activityType: activity.activityType,
                            items: [],
                            productCount: new Set(),
                            totalEnrollments: 0,
                            expanded: true,
                            selected: false
                        });
                    }
                    
                    const group = groups.get(key);
                    group.items.push({
                        productId,
                        enrollId: enrollInfo.enrollId,
                        enrollInfo,
                        activityData: activity,
                        selected: false
                    });
                    group.productCount.add(productId);
                    group.totalEnrollments++;
                });
            }
        });
    });
    
    // 转换Set为数字以便显示
    groups.forEach(group => {
        group.productCount = group.productCount.size;
    });
    
    return groups;
}
```

#### 任务 2.2：实现活动分组展示界面（4-5小时）
**目标**：创建按活动类型分组的折叠式展示界面

**分组展示HTML结构**：
```html
<!-- 替换原有的activities-section -->
<div class="step-section" id="activities-groups-section" style="display: none;">
    <h3 class="step-title">
        步骤3：选择要取消的活动组
        <span class="selection-summary" id="selection-summary"></span>
    </h3>
    
    <div class="batch-controls">
        <div class="control-buttons">
            <button id="expand-all-btn" class="btn btn-sm">展开全部</button>
            <button id="collapse-all-btn" class="btn btn-sm">收起全部</button>
            <button id="select-all-groups-btn" class="btn btn-sm btn-primary">全选</button>
            <button id="clear-all-groups-btn" class="btn btn-sm">清空选择</button>
        </div>
    </div>
    
    <div class="activity-groups-container" id="activity-groups-container">
        <!-- 动态生成分组内容 -->
    </div>
</div>
```

**分组卡片生成方法**：
```javascript
/**
 * 创建活动分组卡片
 * @param {string} groupName - 分组名称
 * @param {Object} groupData - 分组数据
 * @returns {HTMLElement} 分组卡片元素
 */
createActivityGroupCard(groupName, groupData) {
    const card = document.createElement('div');
    card.className = 'activity-group-card';
    card.dataset.groupName = groupName;
    
    const activityTypeMap = {
        1: '限时秒杀',
        5: '官方大促', 
        27: '清仓甩卖'
    };
    const typeLabel = activityTypeMap[groupData.activityType] || '其他活动';
    
    card.innerHTML = `
        <div class="group-header" onclick="cancelActivityModule.toggleGroup('${groupName}')">
            <div class="group-info">
                <div class="group-title">
                    <span class="group-type-badge">${typeLabel}</span>
                    <h4 class="group-name">${groupName}</h4>
                </div>
                <div class="group-stats">
                    <span class="stat-item">
                        <span class="stat-icon">📦</span>
                        <span class="stat-value">${groupData.productCount}</span>
                        <span class="stat-label">商品</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-value">${groupData.totalEnrollments}</span>
                        <span class="stat-label">活动</span>
                    </span>
                </div>
            </div>
            <div class="group-controls">
                <label class="group-checkbox">
                    <input type="checkbox" onchange="cancelActivityModule.toggleGroupSelection('${groupName}', this.checked)">
                    <span class="checkmark"></span>
                </label>
                <button class="expand-btn ${groupData.expanded ? 'expanded' : ''}" 
                        onclick="event.stopPropagation(); cancelActivityModule.toggleGroup('${groupName}')">
                    <span class="expand-icon">▼</span>
                </button>
            </div>
        </div>
        
        <div class="group-content ${groupData.expanded ? 'expanded' : ''}" style="display: ${groupData.expanded ? 'block' : 'none'};">
            <div class="group-items-container">
                ${this.renderGroupItems(groupData.items)}
            </div>
        </div>
    `;
    
    return card;
}

/**
 * 渲染分组内的活动项目
 * @param {Array} items - 活动项目数组
 * @returns {string} HTML字符串
 */
renderGroupItems(items) {
    return items.map(item => {
        const productData = this.state.batchProductsData.get(item.productId);
        const productName = productData ? productData.productName : '未知商品';
        
        return `
            <div class="group-item" data-enroll-id="${item.enrollId}">
                <div class="item-product-info">
                    <span class="product-name">${productName}</span>
                    <span class="product-spu">${item.productId}</span>
                </div>
                <div class="item-activity-info">
                    <span class="enroll-id">报名ID: ${item.enrollId}</span>
                    <span class="activity-price">
                        ¥${(item.enrollInfo.minActivityPrice / 100).toFixed(2)} ~ 
                        ¥${(item.enrollInfo.maxActivityPrice / 100).toFixed(2)}
                    </span>
                </div>
                <div class="item-controls">
                    <label class="item-checkbox">
                        <input type="checkbox" onchange="cancelActivityModule.toggleItemSelection('${item.enrollId}', this.checked)">
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>
        `;
    }).join('');
}
```

**对应CSS样式**：
```css
/* 活动分组样式 */
.activity-groups-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.activity-group-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s;
}

.activity-group-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.activity-group-card.selected {
    border-color: #3b82f6;
    background: #eff6ff;
}

.group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    cursor: pointer;
    background: #f9fafb;
    border-bottom: 1px solid #f3f4f6;
}

.group-info {
    flex: 1;
}

.group-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.group-type-badge {
    background: #3b82f6;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
}

.group-name {
    font-size: 16px;
    color: #1f2937;
    margin: 0;
}

.group-stats {
    display: flex;
    gap: 15px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #6b7280;
}

.stat-value {
    font-weight: 600;
    color: #1f2937;
}

.group-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.group-checkbox input {
    display: none;
}

.group-checkbox .checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid #d1d5db;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;
}

.group-checkbox input:checked + .checkmark {
    background: #3b82f6;
    border-color: #3b82f6;
}

.group-checkbox input:checked + .checkmark:after {
    content: '✓';
    color: white;
    font-size: 12px;
    font-weight: bold;
}

.expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.3s;
}

.expand-btn:hover {
    background: #e5e7eb;
}

.expand-icon {
    transition: transform 0.3s;
}

.expand-btn.expanded .expand-icon {
    transform: rotate(180deg);
}

.group-content {
    transition: all 0.3s ease;
    overflow: hidden;
}

.group-content.expanded {
    display: block !important;
}

.group-items-container {
    padding: 10px 15px 15px;
}

.group-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    background: #f9fafb;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: all 0.3s;
}

.group-item:hover {
    background: #f3f4f6;
}

.item-product-info {
    flex: 1;
}

.product-name {
    display: block;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 4px;
}

.product-spu {
    font-size: 12px;
    color: #6b7280;
}

.item-activity-info {
    flex: 1;
    text-align: center;
}

.enroll-id {
    display: block;
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
}

.activity-price {
    font-size: 13px;
    color: #ef4444;
    font-weight: 500;
}

.item-controls {
    width: 40px;
    text-align: center;
}

.item-checkbox {
    cursor: pointer;
}

.batch-controls {
    margin-bottom: 15px;
    padding: 15px;
    background: #f9fafb;
    border-radius: 6px;
}

.control-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 13px;
}

.selection-summary {
    font-size: 14px;
    color: #6b7280;
    font-weight: normal;
}
```

#### 任务 2.3：实现批量选择机制（3小时）
**目标**：支持按分组全选、单个选择等多种选择模式

**选择控制方法**：
```javascript
/**
 * 切换分组展开/收起状态
 * @param {string} groupName - 分组名称
 */
toggleGroup(groupName) {
    const groupData = this.state.groupedActivities.get(groupName);
    if (!groupData) return;
    
    groupData.expanded = !groupData.expanded;
    
    const card = document.querySelector(`.activity-group-card[data-group-name="${groupName}"]`);
    if (card) {
        const expandBtn = card.querySelector('.expand-btn');
        const content = card.querySelector('.group-content');
        
        if (groupData.expanded) {
            expandBtn.classList.add('expanded');
            content.classList.add('expanded');
            content.style.display = 'block';
        } else {
            expandBtn.classList.remove('expanded');
            content.classList.remove('expanded');
            content.style.display = 'none';
        }
    }
}

/**
 * 切换分组选择状态
 * @param {string} groupName - 分组名称
 * @param {boolean} selected - 是否选中
 */
toggleGroupSelection(groupName, selected) {
    const groupData = this.state.groupedActivities.get(groupName);
    if (!groupData) return;
    
    groupData.selected = selected;
    
    // 更新组内所有项目的选择状态
    groupData.items.forEach(item => {
        item.selected = selected;
    });
    
    // 更新UI状态
    this.updateGroupSelectionUI(groupName);
    this.updateSelectionSummary();
}

/**
 * 切换单个项目选择状态
 * @param {string} enrollId - 报名ID
 * @param {boolean} selected - 是否选中
 */
toggleItemSelection(enrollId, selected) {
    // 找到对应的项目和分组
    let targetGroup = null;
    let targetItem = null;
    
    for (const [groupName, groupData] of this.state.groupedActivities) {
        const item = groupData.items.find(i => i.enrollId === enrollId);
        if (item) {
            targetGroup = { name: groupName, data: groupData };
            targetItem = item;
            break;
        }
    }
    
    if (!targetItem || !targetGroup) return;
    
    targetItem.selected = selected;
    
    // 检查分组是否应该全选或取消全选
    const allSelected = targetGroup.data.items.every(item => item.selected);
    const noneSelected = targetGroup.data.items.every(item => !item.selected);
    
    if (allSelected || noneSelected) {
        targetGroup.data.selected = allSelected;
        this.updateGroupSelectionUI(targetGroup.name);
    }
    
    this.updateSelectionSummary();
}

/**
 * 更新选择摘要显示
 */
updateSelectionSummary() {
    let selectedGroups = 0;
    let selectedItems = 0;
    
    for (const [groupName, groupData] of this.state.groupedActivities) {
        const groupSelectedItems = groupData.items.filter(item => item.selected);
        if (groupSelectedItems.length > 0) {
            selectedGroups++;
            selectedItems += groupSelectedItems.length;
        }
    }
    
    const summaryEl = document.getElementById('selection-summary');
    if (summaryEl) {
        summaryEl.textContent = `(已选择 ${selectedGroups} 个活动组，共 ${selectedItems} 个活动)`;
    }
}
```

### 阶段 3：并发控制与队列处理（预估8-10小时）

#### 任务 3.1：实现并发控制机制（3-4小时）
**目标**：限制同时处理的请求数量为3个，避免服务器压力

**并发控制器实现**：
```javascript
/**
 * 并发控制器类
 */
class ConcurrencyController {
    constructor(maxConcurrency = 3) {
        this.maxConcurrency = maxConcurrency;
        this.running = 0;
        this.queue = [];
    }
    
    /**
     * 执行任务队列
     * @param {Array} tasks - 任务数组
     * @returns {Promise<Array>} 执行结果数组
     */
    async execute(tasks) {
        const results = [];
        
        for (let i = 0; i < tasks.length; i++) {
            const result = await this.addToQueue(tasks[i], i);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * 添加任务到队列
     * @param {Function} task - 任务函数
     * @param {number} index - 任务索引
     * @returns {Promise} 任务结果
     */
    async addToQueue(task, index) {
        return new Promise((resolve) => {
            this.queue.push({ task, index, resolve });
            this.processQueue();
        });
    }
    
    /**
     * 处理队列
     */
    async processQueue() {
        if (this.running >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }
        
        this.running++;
        const { task, index, resolve } = this.queue.shift();
        
        try {
            const startTime = Date.now();
            const result = await task();
            const endTime = Date.now();
            
            resolve({ 
                success: true, 
                data: result, 
                index,
                duration: endTime - startTime 
            });
        } catch (error) {
            resolve({ 
                success: false, 
                error: error.message, 
                index 
            });
        } finally {
            this.running--;
            this.processQueue(); // 继续处理队列
        }
    }
}

/**
 * 批量查询活动（改造版）
 */
async batchQueryActivities(spuList) {
    this.state.batchProgress = {
        total: spuList.length,
        completed: 0,
        failed: 0,
        current: '',
        results: []
    };
    
    this.showBatchProgress();
    
    const controller = new ConcurrencyController(3); // 并发数限制为3
    const tasks = spuList.map(spu => () => this.querySingleProductActivities(spu));
    
    const results = await controller.execute(tasks);
    
    // 处理结果
    const successResults = [];
    const failedResults = [];
    
    results.forEach((result, index) => {
        const spu = spuList[index];
        
        if (result.success) {
            successResults.push({
                productId: spu,
                ...result.data
            });
        } else {
            failedResults.push({
                productId: spu,
                error: result.error
            });
        }
        
        // 更新进度
        this.state.batchProgress.completed++;
        if (!result.success) {
            this.state.batchProgress.failed++;
        }
        
        this.updateBatchProgress();
    });
    
    // 处理成功的查询结果
    if (successResults.length > 0) {
        this.state.batchActivitiesData = successResults;
        const groupedActivities = this.groupActivitiesByName(successResults);
        this.state.groupedActivities = groupedActivities;
        
        this.displayBatchActivities(groupedActivities);
        this.showStatus(`成功查询 ${successResults.length} 个商品的活动，失败 ${failedResults.length} 个`, 'success');
    } else {
        this.showStatus('所有商品查询都失败了', 'error');
    }
    
    this.hideBatchProgress();
}

/**
 * 查询单个商品活动（包装方法）
 * @param {string} productId - 商品ID
 * @returns {Promise} 查询结果
 */
async querySingleProductActivities(productId) {
    this.state.batchProgress.current = `正在查询 ${productId}...`;
    this.updateBatchProgress();
    
    const result = await window.electronAPI.request('queryProductActivities', {
        productId: productId
    });
    
    if (result.success && result.data && result.data.result) {
        // 保存商品基础信息
        this.state.batchProductsData.set(productId, result.data.result);
        
        return {
            productInfo: result.data.result,
            activities: result.data.result.activityList || []
        };
    } else {
        throw new Error(result.error || '查询失败');
    }
}
```

#### 任务 3.2：实现进度反馈系统（3小时）
**目标**：实时展示批量操作进度，包括成功、失败和进行中的状态

**进度展示界面**：
```html
<!-- 批量操作进度展示 -->
<div class="batch-progress-section" id="batch-progress-section" style="display: none;">
    <div class="progress-header">
        <h4>批量操作进度</h4>
        <button class="btn btn-sm btn-secondary" id="cancel-batch-btn">取消操作</button>
    </div>
    
    <div class="progress-info">
        <div class="progress-stats">
            <span class="stat-item success">
                <span class="stat-icon">✅</span>
                <span class="stat-value" id="progress-success">0</span>
                <span class="stat-label">成功</span>
            </span>
            <span class="stat-item failed">
                <span class="stat-icon">❌</span>
                <span class="stat-value" id="progress-failed">0</span>
                <span class="stat-label">失败</span>
            </span>
            <span class="stat-item total">
                <span class="stat-icon">📊</span>
                <span class="stat-value" id="progress-total">0</span>
                <span class="stat-label">总数</span>
            </span>
        </div>
        
        <div class="progress-bar-container">
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: 0%;"></div>
            </div>
            <span class="progress-percentage" id="progress-percentage">0%</span>
        </div>
        
        <div class="current-operation" id="current-operation">准备开始...</div>
    </div>
</div>
```

**进度控制方法**：
```javascript
/**
 * 显示批量进度界面
 */
showBatchProgress() {
    const progressSection = document.getElementById('batch-progress-section');
    if (progressSection) {
        progressSection.style.display = 'block';
    }
}

/**
 * 隐藏批量进度界面
 */
hideBatchProgress() {
    const progressSection = document.getElementById('batch-progress-section');
    if (progressSection) {
        setTimeout(() => {
            progressSection.style.display = 'none';
        }, 2000); // 2秒后自动隐藏
    }
}

/**
 * 更新批量进度显示
 */
updateBatchProgress() {
    const { total, completed, failed, current } = this.state.batchProgress;
    const successCount = completed - failed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // 更新统计数据
    const successEl = document.getElementById('progress-success');
    const failedEl = document.getElementById('progress-failed');
    const totalEl = document.getElementById('progress-total');
    const fillEl = document.getElementById('progress-fill');
    const percentageEl = document.getElementById('progress-percentage');
    const currentEl = document.getElementById('current-operation');
    
    if (successEl) successEl.textContent = successCount;
    if (failedEl) failedEl.textContent = failed;
    if (totalEl) totalEl.textContent = total;
    if (percentageEl) percentageEl.textContent = `${percentage}%`;
    if (currentEl) currentEl.textContent = current;
    
    // 更新进度条
    if (fillEl) {
        fillEl.style.width = `${percentage}%`;
        
        // 根据状态改变颜色
        if (failed > 0 && completed === total) {
            fillEl.style.background = '#f59e0b'; // 橙色：部分失败
        } else if (failed === total) {
            fillEl.style.background = '#ef4444'; // 红色：全部失败
        } else if (completed === total) {
            fillEl.style.background = '#10b981'; // 绿色：全部成功
        } else {
            fillEl.style.background = '#3b82f6'; // 蓝色：进行中
        }
    }
}
```

#### 任务 3.3：实现错误处理和重试机制（2-3小时）
**目标**：对失败的请求提供重试功能，增强系统稳定性

**错误处理和重试机制**：
```javascript
/**
 * 批量取消活动执行器
 */
async executeBatchCancel() {
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
        this.showStatus('请先选择要取消的活动', 'error');
        return;
    }
    
    const cancelReason = document.getElementById('cancel-reason').value.trim();
    if (!cancelReason) {
        this.showStatus('请填写取消理由', 'error');
        return;
    }
    
    // 初始化批量取消进度
    this.state.batchProgress = {
        total: selectedItems.length,
        completed: 0,
        failed: 0,
        current: '',
        results: []
    };
    
    this.showBatchProgress();
    
    const controller = new ConcurrencyController(3);
    const tasks = selectedItems.map(item => () => this.cancelSingleActivity(item, cancelReason));
    
    try {
        const results = await controller.execute(tasks);
        this.processBatchCancelResults(results, selectedItems);
    } catch (error) {
        this.showStatus('批量取消过程中发生错误: ' + error.message, 'error');
    } finally {
        this.hideBatchProgress();
    }
}

/**
 * 取消单个活动（带重试）
 * @param {Object} item - 活动项目
 * @param {string} reason - 取消理由
 * @param {number} retryCount - 重试次数
 * @returns {Promise} 取消结果
 */
async cancelSingleActivity(item, reason, retryCount = 0) {
    const maxRetries = 2;
    
    this.state.batchProgress.current = `正在取消 ${item.productId} 的活动...`;
    this.updateBatchProgress();
    
    try {
        const result = await window.electronAPI.request('cancelActivity', {
            productId: item.productId,
            enrollId: item.enrollId,
            activityName: item.activityData.activityName,
            remark: reason
        });
        
        if (result.success) {
            return {
                enrollId: item.enrollId,
                productId: item.productId,
                activityName: item.activityData.activityName,
                status: 'success',
                result: result
            };
        } else {
            throw new Error(result.error || '取消失败');
        }
    } catch (error) {
        if (retryCount < maxRetries) {
            // 重试前等待1秒
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.cancelSingleActivity(item, reason, retryCount + 1);
        } else {
            return {
                enrollId: item.enrollId,
                productId: item.productId,
                activityName: item.activityData.activityName,
                status: 'failed',
                error: error.message,
                retries: retryCount
            };
        }
    }
}

/**
 * 处理批量取消结果
 * @param {Array} results - 执行结果数组
 * @param {Array} originalItems - 原始项目数组
 */
processBatchCancelResults(results, originalItems) {
    let successCount = 0;
    let failedCount = 0;
    const detailedResults = [];
    
    results.forEach((result, index) => {
        if (result.success && result.data.status === 'success') {
            successCount++;
        } else {
            failedCount++;
        }
        
        detailedResults.push({
            ...originalItems[index],
            result: result.success ? result.data : { status: 'failed', error: result.error }
        });
    });
    
    // 保存结果用于可能的导出
    this.state.batchProgress.results = detailedResults;
    
    // 显示结果摘要
    if (failedCount === 0) {
        this.showStatus(`批量取消完成！成功取消 ${successCount} 个活动`, 'success');
    } else if (successCount === 0) {
        this.showStatus(`批量取消失败！所有 ${failedCount} 个活动都取消失败`, 'error');
    } else {
        this.showStatus(`批量取消完成！成功 ${successCount} 个，失败 ${failedCount} 个`, 'warning');
    }
    
    // 可以在这里提供导出结果的选项
    this.offerResultsExport(detailedResults);
}
```

## 待确认的细节选项

### 1. SPU解析容错策略
**选项A（推荐）**：宽容模式 - 自动过滤无效SPU，继续处理有效的
**选项B**：严格模式 - 遇到无效SPU立即停止，要求用户修正

### 2. 活动分组显示优先级
**选项A（推荐）**：按活动类型重要性排序（限时秒杀 > 官方大促 > 清仓甩卖）
**选项B**：按商品数量排序（包含商品最多的活动类型优先展示）

### 3. 操作结果导出功能
**选项A**：仅在界面显示结果，不提供导出
**选项B（推荐）**：支持导出为CSV格式的操作报告

## 实施时间评估

**总预估工作量**：25-30小时
**建议实施顺序**：
1. 阶段1（输入改造）：7-8小时
2. 阶段2（UI重构）：10-12小时  
3. 阶段3（并发控制）：8-10小时

**技术风险**：低-中等
**向下兼容性**：完全兼容现有单SPU功能

---

**更新时间**：2025-09-14  
**规划版本**：v1.1（已确认技术方案）  
**状态**：等待最终细节确认，可开始实施