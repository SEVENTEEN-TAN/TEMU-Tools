/**
 * 取消活动模块
 * 用于查询商品活动并取消活动
 */

class CancelActivityModule {
    constructor() {
        this.state = {
            currentProductId: null,
            currentActivities: [],
            selectedActivity: null,
            isLoading: false
        };
        
        this.initialized = false;
    }

    /**
     * 模块初始化
     */
    async init() {
        if (this.initialized) {
            return;
        }

        console.log('初始化取消活动模块');
        
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
    }

    /**
     * 查询商品活动
     */
    async queryActivities() {
        const spuInput = document.getElementById('product-spu');
        const productId = spuInput.value.trim();
        
        if (!productId) {
            this.showStatus('请输入商品SPU', 'error');
            return;
        }
        
        // 检查登录状态
        if (!window.app || !window.app.isLoggedIn()) {
            this.showStatus('请先登录并选择TEMU站点', 'error');
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
        
        // 创建站点信息
        let sitesInfo = '';
        if (enrollInfo.enrollSessions && enrollInfo.enrollSessions.length > 0) {
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
            
            sitesInfo = `
                <div class="sites-info">
                    <div class="sites-header">参与站点：</div>
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
                ${sitesInfo}
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
     * 重置表单
     */
    resetForm() {
        // 清空输入
        const spuInput = document.getElementById('product-spu');
        if (spuInput) spuInput.value = '';
        
        const cancelReason = document.getElementById('cancel-reason');
        if (cancelReason) cancelReason.value = '申请退出';
        
        // 隐藏所有部分
        this.hideAllSections();
        
        // 重置状态
        this.state = {
            currentProductId: null,
            currentActivities: [],
            selectedActivity: null,
            isLoading: false
        };
        
        // 清空状态提示
        this.showStatus('', '');
    }

    /**
     * 隐藏所有部分
     */
    hideAllSections() {
        const sections = [
            'product-info-section',
            'activities-section',
            'cancel-reason-section'
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

// 创建模块实例并注册到全局
window.cancelActivityModule = new CancelActivityModule();

// 注册到全局以支持降级加载
window.Module_cancelActivity = window.cancelActivityModule;
window['Module_cancel-activity'] = window.cancelActivityModule;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CancelActivityModule;
}