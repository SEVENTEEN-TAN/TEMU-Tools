/**
 * 取消活动模块
 * 用于查询商品活动并取消活动
 */

class CancelActivityModule {
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
        
        this.initialized = false;
    }

    /**
     * 并发控制器类
     */
    getConcurrencyController() {
        if (!this.concurrencyController) {
            this.concurrencyController = new ConcurrencyController(3);
        }
        return this.concurrencyController;
    }

    /**
     * 模块初始化
     */
    async init() {
        if (this.initialized) {
            return;
        }

        console.log('初始化取消活动模块');
        
        // 每次进入模块时重置所有状态和显示
        this.resetForm();
        
        // 设置全局引用
        window.cancelActivityModule = this;
        
        // 绑定事件
        this.bindEvents();
        
        this.initialized = true;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 查询活动按钮
        const queryBtn = document.getElementById('query-activities-btn');
        if (queryBtn) {
            queryBtn.addEventListener('click', () => this.queryActivities());
        }
        
        // 重置结果按钮
        const clearResultsBtn = document.getElementById('clear-results-btn');
        if (clearResultsBtn) {
            clearResultsBtn.addEventListener('click', () => {
                this.clearQueryResults();
                this.showStatus('已重置查询结果', 'info');
            });
        }
        
        // 提交取消按钮
        const submitBtn = document.getElementById('submit-cancel-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitCancelActivity());
        }
        
        // 重置按钮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetForm());
        }
        
        // SPU输入框回车事件
        const spuInput = document.getElementById('product-spu');
        if (spuInput) {
            spuInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.queryActivities();
                }
            });
        }
        
        // 绑定批量输入相关事件
        this.bindBatchInputEvents();
    }

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
     * 智能解析SPU输入（宽容模式）
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
                // 宽容模式：记录错误但不停止处理
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
            
            // 切换模式时清除查询结果和状态
            this.clearQueryResults();
            this.showStatus('已切换模式，请重新输入SPU进行查询', 'info');
        }
    }

    /**
     * 清除查询结果但保留输入内容
     */
    clearQueryResults() {
        // 隐藏所有结果显示区域
        this.hideAllSections();
        
        // 清除查询相关的状态数据
        this.state.currentProductId = null;
        this.state.currentActivities = [];
        this.state.selectedActivity = null;
        this.state.currentBatchParseResult = null;
        this.state.batchProductsData.clear();
        this.state.batchActivitiesData = [];
        this.state.groupedActivities.clear();
        this.state.selectedGroups.clear();
        this.state.batchProgress = {
            total: 0,
            completed: 0,
            failed: 0,
            current: '',
            results: []
        };
        
        // 重置取消理由为默认值
        const cancelReason = document.getElementById('cancel-reason');
        if (cancelReason) {
            cancelReason.value = '申请退出';
        }
        
        // 清除导出按钮
        const exportBtn = document.getElementById('export-results-btn');
        if (exportBtn) {
            exportBtn.remove();
        }
        
        // 清除输入统计显示（但保留输入内容）
        const spuCount = document.getElementById('spu-count');
        const spuValidation = document.getElementById('spu-validation');
        if (spuCount) spuCount.textContent = '识别到 0 个SPU';
        if (spuValidation) {
            spuValidation.textContent = '';
            spuValidation.className = 'validation-info';
        }
    }

    /**
     * 查询商品活动
     */
    async queryActivities() {
        // 检查登录状态
        if (!window.app || !window.app.isLoggedIn()) {
            this.showStatus('请先登录并选择TEMU站点', 'error');
            return;
        }
        
        if (this.state.batchMode) {
            // 批量模式
            await this.batchQueryActivities();
        } else {
            // 单个模式（保持原有逻辑）
            await this.singleQueryActivities();
        }
    }

    /**
     * 单个SPU查询（原有逻辑）
     */
    async singleQueryActivities() {
        const spuInput = document.getElementById('product-spu');
        const productId = spuInput.value.trim();
        
        if (!productId) {
            this.showStatus('请输入商品SPU', 'error');
            return;
        }
        
        this.state.isLoading = true;
        this.showStatus('正在查询商品活动...', 'loading');
        
        try {
            const result = await window.electronAPI.request('queryProductActivities', {
                productId: productId
            });
            
            if (result.success && result.data) {
                this.handleActivitiesData(result.data);
                this.state.currentProductId = productId;
            } else {
                this.showStatus(result.error || '查询活动失败', 'error');
                this.hideAllSections();
            }
        } catch (error) {
            console.error('查询活动失败:', error);
            this.showStatus('查询活动失败: ' + error.message, 'error');
            this.hideAllSections();
        } finally {
            this.state.isLoading = false;
        }
    }

    /**
     * 批量SPU查询
     */
    async batchQueryActivities() {
        if (!this.state.currentBatchParseResult || this.state.currentBatchParseResult.spus.length === 0) {
            this.showStatus('请输入有效的SPU列表', 'error');
            return;
        }
        
        const spuList = this.state.currentBatchParseResult.spus;
        
        // 初始化批量进度
        this.state.batchProgress = {
            total: spuList.length,
            completed: 0,
            failed: 0,
            current: '',
            results: []
        };
        
        this.showBatchProgress();
        this.state.isLoading = true;
        
        try {
            // 并发控制查询
            const controller = this.getConcurrencyController();
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
            
        } catch (error) {
            console.error('批量查询失败:', error);
            this.showStatus('批量查询失败: ' + error.message, 'error');
        } finally {
            this.state.isLoading = false;
            this.hideBatchProgress();
        }
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
        
        // 转换Set为数字以便显示，并按商品数量排序
        const sortedGroups = new Map();
        Array.from(groups.entries())
            .sort(([,a], [,b]) => b.productCount.size - a.productCount.size) // 按商品数量降序排序
            .forEach(([key, group]) => {
                group.productCount = group.productCount.size;
                sortedGroups.set(key, group);
            });
        
        return sortedGroups;
    }

    /**
     * 显示批量活动结果
     * @param {Map} groupedActivities - 分组活动数据
     */
    displayBatchActivities(groupedActivities) {
        // 隐藏单个模式的显示区域
        this.hideAllSections();
        
        // 显示批量分组区域
        const activitiesGroupsSection = document.getElementById('activities-groups-section');
        if (activitiesGroupsSection) {
            activitiesGroupsSection.style.display = 'block';
        }
        
        // 渲染分组内容
        this.renderActivityGroups(groupedActivities);
        
        // 绑定批量控制事件
        this.bindBatchControlEvents();
        
        // 初始化选择摘要
        this.updateSelectionSummary();
    }

    /**
     * 渲染活动分组
     * @param {Map} groupedActivities - 分组活动数据
     */
    renderActivityGroups(groupedActivities) {
        const container = document.getElementById('activity-groups-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const [groupName, groupData] of groupedActivities) {
            const groupCard = this.createActivityGroupCard(groupName, groupData);
            container.appendChild(groupCard);
        }
    }

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

    /**
     * 绑定批量控制事件
     */
    bindBatchControlEvents() {
        // 展开全部
        const expandAllBtn = document.getElementById('expand-all-btn');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAllGroups());
        }
        
        // 收起全部
        const collapseAllBtn = document.getElementById('collapse-all-btn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAllGroups());
        }
        
        // 全选
        const selectAllBtn = document.getElementById('select-all-groups-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllGroups());
        }
        
        // 清空选择
        const clearAllBtn = document.getElementById('clear-all-groups-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllSelections());
        }
    }

    /**
     * 展开所有分组
     */
    expandAllGroups() {
        for (const [groupName, groupData] of this.state.groupedActivities) {
            groupData.expanded = true;
            this.updateGroupUI(groupName, true);
        }
    }

    /**
     * 收起所有分组
     */
    collapseAllGroups() {
        for (const [groupName, groupData] of this.state.groupedActivities) {
            groupData.expanded = false;
            this.updateGroupUI(groupName, false);
        }
    }

    /**
     * 更新分组UI状态
     * @param {string} groupName - 分组名称
     * @param {boolean} expanded - 是否展开
     */
    updateGroupUI(groupName, expanded) {
        const card = document.querySelector(`.activity-group-card[data-group-name="${groupName}"]`);
        if (card) {
            const expandBtn = card.querySelector('.expand-btn');
            const content = card.querySelector('.group-content');
            
            if (expanded) {
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
     * 全选所有分组
     */
    selectAllGroups() {
        for (const [groupName, groupData] of this.state.groupedActivities) {
            groupData.selected = true;
            groupData.items.forEach(item => {
                item.selected = true;
            });
            this.updateGroupSelectionUI(groupName);
        }
        this.updateSelectionSummary();
        this.showCancelReasonSection();
    }

    /**
     * 清空所有选择
     */
    clearAllSelections() {
        for (const [groupName, groupData] of this.state.groupedActivities) {
            groupData.selected = false;
            groupData.items.forEach(item => {
                item.selected = false;
            });
            this.updateGroupSelectionUI(groupName);
        }
        this.updateSelectionSummary();
        this.hideCancelReasonSection();
    }

    /**
     * 切换分组展开/收起状态
     * @param {string} groupName - 分组名称
     */
    toggleGroup(groupName) {
        const groupData = this.state.groupedActivities.get(groupName);
        if (!groupData) return;
        
        groupData.expanded = !groupData.expanded;
        this.updateGroupUI(groupName, groupData.expanded);
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
        
        // 检查是否需要显示/隐藏取消理由部分
        this.checkCancelReasonSection();
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
        this.checkCancelReasonSection();
    }

    /**
     * 更新分组选择UI
     * @param {string} groupName - 分组名称
     */
    updateGroupSelectionUI(groupName) {
        const groupData = this.state.groupedActivities.get(groupName);
        if (!groupData) return;
        
        const card = document.querySelector(`.activity-group-card[data-group-name="${groupName}"]`);
        if (!card) return;
        
        // 更新分组checkbox状态
        const groupCheckbox = card.querySelector('.group-checkbox input');
        if (groupCheckbox) {
            groupCheckbox.checked = groupData.selected;
        }
        
        // 更新分组卡片样式
        if (groupData.selected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        
        // 更新子项目checkbox状态
        groupData.items.forEach(item => {
            const itemCheckbox = card.querySelector(`.group-item[data-enroll-id="${item.enrollId}"] .item-checkbox input`);
            if (itemCheckbox) {
                itemCheckbox.checked = item.selected;
            }
        });
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

    /**
     * 检查是否需要显示取消理由部分
     */
    checkCancelReasonSection() {
        const hasSelection = this.getSelectedItems().length > 0;
        if (hasSelection) {
            this.showCancelReasonSection();
        } else {
            this.hideCancelReasonSection();
        }
    }

    /**
     * 显示取消理由部分
     */
    showCancelReasonSection() {
        const cancelReasonSection = document.getElementById('cancel-reason-section');
        if (cancelReasonSection) {
            cancelReasonSection.style.display = 'block';
            // 滚动到取消理由部分
            cancelReasonSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * 隐藏取消理由部分
     */
    hideCancelReasonSection() {
        const cancelReasonSection = document.getElementById('cancel-reason-section');
        if (cancelReasonSection) {
            cancelReasonSection.style.display = 'none';
        }
    }

    /**
     * 获取所有选中的活动项目
     * @returns {Array} 选中的活动项目数组
     */
    getSelectedItems() {
        const selectedItems = [];
        for (const [groupName, groupData] of this.state.groupedActivities) {
            groupData.items.forEach(item => {
                if (item.selected) {
                    selectedItems.push(item);
                }
            });
        }
        return selectedItems;
    }

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

    /**
     * 处理活动数据
     */
    handleActivitiesData(data) {
        const result = data.result;
        
        if (!result) {
            this.showStatus('未找到商品信息', 'error');
            this.hideAllSections();
            return;
        }
        
        // 显示商品信息
        this.displayProductInfo(result);
        
        // 显示活动列表
        if (result.activityList && result.activityList.length > 0) {
            this.displayActivities(result.activityList);
            this.showStatus(`找到 ${result.activityList.length} 个活动`, 'success');
        } else {
            this.showStatus('该商品暂无活动', 'warning');
            document.getElementById('activities-section').style.display = 'none';
            document.getElementById('cancel-reason-section').style.display = 'none';
        }
    }

    /**
     * 显示商品信息
     */
    displayProductInfo(result) {
        const productInfoSection = document.getElementById('product-info-section');
        const productImage = document.getElementById('product-image');
        const productName = document.getElementById('product-name');
        const productIdDisplay = document.getElementById('product-id-display');
        
        if (productInfoSection) {
            productInfoSection.style.display = 'block';
        }
        
        if (productImage && result.imageUrl) {
            productImage.src = result.imageUrl;
        }
        
        if (productName) {
            productName.textContent = result.productName || '未知商品';
        }
        
        if (productIdDisplay) {
            productIdDisplay.textContent = result.productId || '-';
        }
    }

    /**
     * 显示活动列表
     */
    displayActivities(activityList) {
        const activitiesSection = document.getElementById('activities-section');
        const activitiesContainer = document.getElementById('activities-container');
        
        if (!activitiesSection || !activitiesContainer) return;
        
        activitiesSection.style.display = 'block';
        activitiesContainer.innerHTML = '';
        
        this.state.currentActivities = [];
        
        activityList.forEach((activity, index) => {
            if (activity.feedbackEnrollInfoList && activity.feedbackEnrollInfoList.length > 0) {
                activity.feedbackEnrollInfoList.forEach(enrollInfo => {
                    const activityCard = this.createActivityCard(activity, enrollInfo, index);
                    activitiesContainer.appendChild(activityCard);
                    
                    // 保存活动信息
                    this.state.currentActivities.push({
                        activityName: activity.activityName,
                        activityType: activity.activityType,
                        enrollId: enrollInfo.enrollId,
                        enrollInfo: enrollInfo
                    });
                });
            }
        });
    }

    /**
     * 创建活动卡片
     */
    createActivityCard(activity, enrollInfo, index) {
        const card = document.createElement('div');
        card.className = 'activity-card';
        card.dataset.enrollId = enrollInfo.enrollId;
        card.dataset.activityName = activity.activityName;
        
        // 活动类型映射
        const activityTypeMap = {
            1: '限时秒杀',
            5: '官方大促',
            27: '清仓甩卖'
        };
        
        const activityTypeLabel = activityTypeMap[activity.activityType] || activity.activityName;
        
        // 格式化价格
        const formatPrice = (price) => {
            if (!price) return '-';
            return `¥${(price / 100).toFixed(2)}`;
        };
        
        // 格式化时间
        const formatDate = (timestamp) => {
            if (!timestamp) return '-';
            const date = new Date(timestamp);
            return date.toLocaleDateString('zh-CN');
        };
        
        // 创建站点悬浮信息
        let sitesHoverInfo = '';
        let sitesSummary = '';
        if (enrollInfo.enrollSessions && enrollInfo.enrollSessions.length > 0) {
            // 计算活跃站点数量
            const activeSites = enrollInfo.enrollSessions.filter(s => s.sessionStatus === 2).length;
            const totalSites = enrollInfo.enrollSessions.length;
            
            const sitesList = enrollInfo.enrollSessions.map(session => {
                const statusMap = {
                    1: '待开始',
                    2: '进行中',
                    3: '已结束',
                    4: '已完成'
                };
                const statusLabel = statusMap[session.sessionStatus] || '未知';
                const statusClass = session.sessionStatus === 2 ? 'status-active' : 
                                   session.sessionStatus === 1 ? 'status-pending' : 'status-inactive';
                
                return `
                    <div class="site-item">
                        <span class="site-name">${session.siteName}</span>
                        <span class="session-status ${statusClass}">${statusLabel}</span>
                        <span class="session-date">${session.startDateStr} ~ ${session.endDateStr}</span>
                    </div>
                `;
            }).join('');
            
            // 创建站点摘要信息
            sitesSummary = `
                <div class="sites-summary">
                    <span class="summary-icon">🌐</span>
                    <span class="summary-text">参与站点: ${activeSites}/${totalSites}</span>
                    <span class="hover-hint">悬停查看详情</span>
                </div>
            `;
            
            // 创建悬浮窗内容
            sitesHoverInfo = `
                <div class="sites-tooltip">
                    <div class="tooltip-header">参与站点详情</div>
                    <div class="sites-list">${sitesList}</div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="activity-header">
                <h4 class="activity-name">
                    <span class="activity-type-badge">${activityTypeLabel}</span>
                    ${activity.activityName}
                </h4>
                <div class="activity-id">报名ID: ${enrollInfo.enrollId}</div>
            </div>
            <div class="activity-body">
                <div class="activity-info">
                    <div class="info-item">
                        <span class="info-label">活动价格：</span>
                        <span class="info-value price">${formatPrice(enrollInfo.minActivityPrice)} ~ ${formatPrice(enrollInfo.maxActivityPrice)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">报名库存：</span>
                        <span class="info-value">${enrollInfo.stock || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">报名时间：</span>
                        <span class="info-value">${formatDate(enrollInfo.enrollTime)}</span>
                    </div>
                </div>
                ${sitesSummary}
                ${sitesHoverInfo}
            </div>
            <div class="activity-footer">
                <button class="select-activity-btn" onclick="cancelActivityModule.selectActivity('${enrollInfo.enrollId}', '${activity.activityName}')">
                    选择此活动
                </button>
            </div>
        `;
        
        return card;
    }

    /**
     * 选择活动
     */
    selectActivity(enrollId, activityName) {
        // 移除其他卡片的选中状态
        const allCards = document.querySelectorAll('.activity-card');
        allCards.forEach(card => card.classList.remove('selected'));
        
        // 添加选中状态
        const selectedCard = document.querySelector(`.activity-card[data-enroll-id="${enrollId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // 保存选中的活动
        this.state.selectedActivity = {
            enrollId: enrollId,
            activityName: activityName
        };
        
        // 显示取消理由部分
        const cancelReasonSection = document.getElementById('cancel-reason-section');
        if (cancelReasonSection) {
            cancelReasonSection.style.display = 'block';
            // 滚动到取消理由部分
            cancelReasonSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        this.showStatus(`已选择活动: ${activityName}`, 'info');
    }

    /**
     * 提交取消活动
     */
    async submitCancelActivity() {
        if (this.state.batchMode) {
            // 批量模式
            await this.executeBatchCancel();
        } else {
            // 单个模式（保持原有逻辑）
            await this.submitSingleCancel();
        }
    }

    /**
     * 提交单个取消活动（原有逻辑）
     */
    async submitSingleCancel() {
        if (!this.state.selectedActivity) {
            this.showStatus('请先选择要取消的活动', 'error');
            return;
        }
        
        const cancelReason = document.getElementById('cancel-reason').value.trim();
        if (!cancelReason) {
            this.showStatus('请填写取消理由', 'error');
            return;
        }
        
        if (this.state.isLoading) return;
        
        this.state.isLoading = true;
        this.showStatus('正在提交取消申请...', 'loading');
        
        try {
            const result = await window.electronAPI.request('cancelActivity', {
                productId: this.state.currentProductId,
                enrollId: this.state.selectedActivity.enrollId,
                activityName: this.state.selectedActivity.activityName,
                remark: cancelReason
            });
            
            if (result.success) {
                this.showStatus('取消活动申请已成功提交！', 'success');
                // 3秒后重置表单
                setTimeout(() => {
                    this.resetForm();
                }, 3000);
            } else {
                this.showStatus(result.error || '取消活动失败', 'error');
            }
        } catch (error) {
            console.error('取消活动失败:', error);
            this.showStatus('取消活动失败: ' + error.message, 'error');
        } finally {
            this.state.isLoading = false;
        }
    }

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
        this.state.isLoading = true;
        
        try {
            const controller = this.getConcurrencyController();
            const tasks = selectedItems.map(item => () => this.cancelSingleActivity(item, cancelReason));
            
            const results = await controller.execute(tasks);
            this.processBatchCancelResults(results, selectedItems);
        } catch (error) {
            this.showStatus('批量取消过程中发生错误: ' + error.message, 'error');
        } finally {
            this.state.isLoading = false;
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
            
            // 更新进度
            this.state.batchProgress.completed++;
            if (!result.success || result.data.status !== 'success') {
                this.state.batchProgress.failed++;
            }
            
            this.updateBatchProgress();
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
        
        // 提供结果导出选项
        this.offerResultsExport(detailedResults);
    }

    /**
     * 提供结果导出选项
     * @param {Array} results - 详细结果数组
     */
    offerResultsExport(results) {
        if (results.length === 0) return;
        
        // 创建导出按钮
        const statusSection = document.getElementById('operation-status');
        if (statusSection && !document.getElementById('export-results-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'export-results-btn';
            exportBtn.className = 'btn btn-sm btn-secondary';
            exportBtn.textContent = '导出结果(CSV)';
            exportBtn.style.marginLeft = '10px';
            exportBtn.onclick = () => this.exportResultsToCSV(results);
            
            statusSection.appendChild(exportBtn);
        }
    }

    /**
     * 导出结果到CSV
     * @param {Array} results - 结果数组
     */
    exportResultsToCSV(results) {
        const headers = ['商品SPU', '活动名称', '报名ID', '操作状态', '错误信息', '重试次数'];
        const csvContent = [
            headers.join(','),
            ...results.map(item => [
                item.productId,
                `"${item.activityData.activityName}"`,
                item.enrollId,
                item.result.status === 'success' ? '成功' : '失败',
                item.result.status === 'failed' ? `"${item.result.error || ''}"` : '',
                item.result.retries || 0
            ].join(','))
        ].join('\n');
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `批量取消活动结果_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatus('结果已导出为CSV文件', 'info');
    }

    /**
     * 重置表单
     */
    resetForm() {
        // 清空单个模式输入
        const spuInput = document.getElementById('product-spu');
        if (spuInput) spuInput.value = '';
        
        // 清空批量模式输入
        const batchSpuInput = document.getElementById('batch-product-spu');
        if (batchSpuInput) batchSpuInput.value = '';
        
        // 重置模式切换
        const batchModeToggle = document.getElementById('batch-mode-toggle');
        if (batchModeToggle) {
            batchModeToggle.checked = false;
            this.toggleBatchMode(false);
        }
        
        // 重置取消理由
        const cancelReason = document.getElementById('cancel-reason');
        if (cancelReason) cancelReason.value = '申请退出';
        
        // 隐藏所有部分
        this.hideAllSections();
        
        // 重置状态（包含新的批量状态）
        this.state = {
            // 保持原有状态（向下兼容）
            currentProductId: null,
            currentActivities: [],
            selectedActivity: null,
            isLoading: false,
            
            // 新增批量状态
            batchMode: false,
            currentBatchParseResult: null,
            batchProductsData: new Map(),
            batchActivitiesData: [],
            groupedActivities: new Map(),
            selectedGroups: new Set(),
            batchProgress: {
                total: 0,
                completed: 0,
                failed: 0,
                current: '',
                results: []
            }
        };
        
        // 清空状态提示和导出按钮
        this.showStatus('', '');
        const exportBtn = document.getElementById('export-results-btn');
        if (exportBtn) {
            exportBtn.remove();
        }
    }

    /**
     * 隐藏所有部分
     */
    hideAllSections() {
        const sections = [
            'product-info-section',
            'activities-section',
            'activities-groups-section',  // 新增批量分组区域
            'cancel-reason-section',
            'batch-progress-section'      // 新增进度区域
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    /**
     * 显示状态信息
     */
    showStatus(message, type) {
        const statusElement = document.getElementById('operation-status');
        if (!statusElement) return;
        
        if (!message) {
            statusElement.innerHTML = '';
            statusElement.className = 'status-message';
            return;
        }
        
        const typeClass = {
            'loading': 'status-loading',
            'success': 'status-success',
            'error': 'status-error',
            'warning': 'status-warning',
            'info': 'status-info'
        };
        
        const typeIcon = {
            'loading': '⏳',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        statusElement.className = `status-message ${typeClass[type] || ''}`;
        statusElement.innerHTML = `
            <span class="status-icon">${typeIcon[type] || ''}</span>
            <span class="status-text">${message}</span>
        `;
    }

    /**
     * 清理资源
     */
    destroy() {
        // 清理事件监听器
        this.initialized = false;
        window.cancelActivityModule = null;
    }
}

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

// 创建模块实例并注册到全局
window.cancelActivityModule = new CancelActivityModule();

// 注册到全局以支持降级加载
window.Module_cancelActivity = window.cancelActivityModule;
window['Module_cancel-activity'] = window.cancelActivityModule;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CancelActivityModule;
}