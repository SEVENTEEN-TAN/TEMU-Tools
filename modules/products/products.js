/**
 * 商品管理模块
 * 独立的功能模块，通过模块加载器动态加载
 */

class ProductsModule {
    constructor() {
        this.state = {
            currentPage: 1,
            pageSize: 50,  // 每页50条商品，更加合理
            totalProducts: 0,
            totalPages: 1,
            products: [],
            isLoading: false,
            lastUpdateTime: null  // 记录最后更新时间
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

        console.log('初始化商品管理模块');
        
        // 设置全局引用，供分页按钮使用
        window.productsModule = this;
        
        // 绑定事件
        this.bindEvents();
        
        // 监听用户信息更新
        window.addEventListener('userInfoUpdated', (e) => {
            this.onUserInfoUpdated(e.detail);
        });
        
        this.initialized = true;
        
        // 自动加载数据（如果已登录）
        if (window.app && window.app.isLoggedIn()) {
            // 自动加载商品数据
            setTimeout(() => this.fetchProducts(), 500);
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshProductsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.fetchProducts());
        }
        
        // 导出Excel按钮
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportExcel());
        }
        
        // 分页按钮
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
    }

    /**
     * 获取商品数据
     */
    async fetchProducts() {
        if (this.state.isLoading) return;
        
        // 检查登录状态
        if (!window.app || !window.app.isLoggedIn()) {
            this.showMessage('请先登录并选择TEMU站点', 'error');
            return;
        }
        
        try {
            this.state.isLoading = true;
            this.updateLoadingState(true);
            this.showStatus('正在获取在售商品数据...', 'loading');
            
            // 调用API - 获取分页商品数据
            const result = await window.electronAPI.fetchProducts({
                page: this.state.currentPage,
                pageSize: this.state.pageSize,
                skcTopStatus: 100  // 在售商品状态
            });
            
            if (result.success && result.data) {
                // 处理API返回的数据结构
                const pageItems = result.data.pageItems || result.data.records || [];
                const totalCount = result.data.total || 0;
                
                // 调试：打印第一个商品的数据结构
                if (pageItems.length > 0) {
                    console.log('=== 商品数据结构调试 ===');
                    console.log('第一个商品的完整数据:', JSON.stringify(pageItems[0], null, 2));
                    console.log('图片字段检查:', {
                        mainImageUrl: pageItems[0].mainImageUrl,
                        thumbUrl: pageItems[0].productSkuSummaries && pageItems[0].productSkuSummaries[0] && pageItems[0].productSkuSummaries[0].thumbUrl
                    });
                    console.log('商品总数:', pageItems.length);
                }
                
                // 更新状态
                this.state.products = pageItems;
                this.state.totalProducts = totalCount;
                this.state.totalPages = Math.ceil(totalCount / this.state.pageSize);
                this.state.lastUpdateTime = new Date();
                
                // 更新显示
                this.updateDisplay();
                this.updatePagination();
                this.updateStatistics();
                
                // 启用导出按钮
                this.enableExportButton(this.state.products.length > 0);
                
                const currentPageCount = this.state.products.length;
                this.showStatus(`成功获取第${this.state.currentPage}页商品，共${currentPageCount}件（总计${this.state.totalProducts}件）`, 'success');
            } else {
                throw new Error(result.error || '获取商品失败');
            }
            
        } catch (error) {
            console.error('获取商品失败:', error);
            this.showStatus('获取商品失败，请重试', 'error');
            this.showMessage('获取商品失败：' + error.message, 'error');
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState(false);
            
            // 5秒后显示最后更新时间
            setTimeout(() => {
                const timeStr = this.state.lastUpdateTime ? 
                    `最后更新：${this.formatTime(this.state.lastUpdateTime)}` : 
                    '准备就绪';
                this.showStatus(timeStr);
            }, 5000);
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const totalCount = document.getElementById('totalProductsCount');
        const pageInfo = document.getElementById('currentPageInfo');
        const updateTime = document.getElementById('lastUpdateTime');
        const tableInfo = document.getElementById('tableProductsInfo');
        
        if (totalCount) {
            totalCount.textContent = this.state.totalProducts || '-';
        }
        
        if (pageInfo) {
            if (this.state.totalPages > 0) {
                pageInfo.textContent = `${this.state.currentPage}/${this.state.totalPages}`;
            } else {
                pageInfo.textContent = '-';
            }
        }
        
        if (updateTime) {
            updateTime.textContent = this.state.lastUpdateTime ? 
                this.formatTime(this.state.lastUpdateTime) : '-';
        }
        
        // 更新表格标题中的商品信息
        if (tableInfo) {
            const currentPageCount = this.state.products.length;
            tableInfo.textContent = `当前页 ${currentPageCount} 件，共 ${this.state.totalProducts} 件商品`;
        }
    }
    
    /**
     * 格式化时间
     */
    formatTime(date) {
        if (!date) return '-';
        
        const now = new Date();
        const diff = now - date;
        
        // 如果是1分钟内
        if (diff < 60000) {
            return '刚刚';
        }
        
        // 如果是1小时内
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}分钟前`;
        }
        
        // 显示具体时间
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
            return `今天 ${hours}:${minutes}`;
        }
        
        // 显示日期和时间
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}-${day} ${hours}:${minutes}`;
    }

    /**
     * 导出Excel
     */
    async exportExcel() {
        if (this.state.products.length === 0) {
            this.showMessage('没有可导出的商品数据', 'warning');
            return;
        }
        
        try {
            this.showStatus('正在导出Excel...', 'loading');
            
            const result = await window.electronAPI.exportProductsExcel(this.state.products);
            
            if (result.success) {
                this.showStatus('Excel导出成功', 'success');
                this.showMessage(`Excel文件已保存至：\n${result.path}`, 'success');
            } else {
                throw new Error(result.error || '导出失败');
            }
            
        } catch (error) {
            console.error('导出Excel失败:', error);
            this.showStatus('导出失败，请重试', 'error');
            this.showMessage('导出Excel失败：' + error.message, 'error');
        } finally {
            setTimeout(() => {
                this.showStatus('准备就绪');
            }, 3000);
        }
    }

    /**
     * 更新商品显示
     */
    updateDisplay() {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        
        if (this.state.products.length === 0) {
            // 显示空状态
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 60px 20px; color: #718096;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">暂无商品数据</div>
                        <div style="font-size: 14px;">请确认已登录TEMU站点</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 生成表格行 - 根据API文档的数据结构
        const rowsHTML = this.state.products.map(product => {
            // 基本信息
            const productId = product.productId || product.productSkcId || '-';
            const productName = product.productName || '-';
            const productCode = product.extCode || '-';
            
            // 分类信息
            const categoryName = product.leafCat?.catName || 
                                product.categories?.cat1?.catName || 
                                '未分类';
            
            // 价格信息 - 从SKU中获取价格
            let price = '-';
            if (product.productSkuSummaries && product.productSkuSummaries.length > 0) {
                const firstSku = product.productSkuSummaries[0];
                if (firstSku.supplierPrice) {
                    // 价格单位是分，需要转换为元
                    price = (firstSku.supplierPrice / 100).toFixed(2);
                }
            }
            
            // 库存信息 - 从SKU中获取总库存
            let totalStock = 0;
            if (product.productSkuSummaries && product.productSkuSummaries.length > 0) {
                totalStock = product.productSkuSummaries.reduce((sum, sku) => {
                    return sum + (sku.virtualStock || 0);
                }, 0);
            }
            
            // SKU数量
            const skuCount = product.productSkuSummaries?.length || 0;
            
            // 状态 - 根据skcStatus判断
            let statusText = '在售';
            let statusClass = 'active';
            if (product.skcStatus === 11) {
                statusText = '在售';
                statusClass = 'active';
            } else if (product.skcStatus === 10) {
                statusText = '待审核';
                statusClass = 'pending';
            } else {
                statusText = '其他';
                statusClass = 'inactive';
            }
            
            // 创建时间
            let createTime = '-';
            if (product.createdAt) {
                const date = new Date(product.createdAt);
                createTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }
            
            // 主图URL - 直接使用API返回的mainImageUrl字段
            const mainImageUrl = product.mainImageUrl || '';
            
            // 强化调试 - 为每个商品输出图片信息
            console.log(`商品 [${productName}] 图片URL:`, mainImageUrl);
            if (!mainImageUrl) {
                console.warn(`警告: 商品 [${productName}] 没有主图URL`);
            }
            
            return `
                <tr class="table-row">
                    <td class="col-image">
                        <div class="product-image">
                            ${mainImageUrl ? 
                                `<img src="${mainImageUrl}" alt="商品图片" class="product-thumb" loading="lazy">` : 
                                `<div class="product-thumb-placeholder">📦</div>`
                            }
                        </div>
                    </td>
                    <td class="col-name">
                        <div class="product-info">
                            <div class="product-details">
                                <div class="product-title" title="${productName}">${productName}</div>
                                <div class="product-id">ID: ${productId}</div>
                            </div>
                        </div>
                    </td>
                    <td class="col-category">
                        <span class="category-name" title="${categoryName}">${categoryName}</span>
                    </td>
                    <td class="col-code">
                        <span class="product-code">${productCode}</span>
                    </td>
                    <td class="col-price">
                        <span class="price">${price !== '-' ? '¥' + price : '-'}</span>
                    </td>
                    <td class="col-stock">
                        <span class="stock ${totalStock > 0 ? 'in-stock' : 'out-of-stock'}">${totalStock}</span>
                    </td>
                    <td class="col-sku">
                        <span class="sku-count">${skuCount} 个规格</span>
                    </td>
                    <td class="col-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td class="col-date">
                        <span class="create-time">${createTime}</span>
                    </td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = rowsHTML;
    }

    /**
     * 更新分页控制
     */
    updatePagination() {
        // 更新统计信息
        const totalInfo = document.getElementById('totalProductsInfo');
        const pageInfo = document.getElementById('pageInfo');
        
        if (totalInfo) {
            totalInfo.textContent = `共 ${this.state.totalProducts} 件商品`;
        }
        
        if (pageInfo) {
            pageInfo.textContent = `第 ${this.state.currentPage} 页，共 ${this.state.totalPages} 页`;
        }
        
        // 更新分页按钮状态
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.state.currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.state.currentPage === this.state.totalPages;
        }
        
        // 更新页码按钮
        this.updatePageNumbers();
    }

    /**
     * 更新页码按钮
     */
    updatePageNumbers() {
        const container = document.getElementById('pageNumbers');
        if (!container) return;
        
        const currentPage = this.state.currentPage;
        const totalPages = this.state.totalPages;
        
        if (totalPages === 0) {
            container.innerHTML = '';
            return;
        }
        
        // 计算显示的页码范围
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        // 确保显示5个页码
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + 4);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, endPage - 4);
            }
        }
        
        let buttonsHTML = '';
        
        for (let page = startPage; page <= endPage; page++) {
            const isActive = page === currentPage ? 'active' : '';
            buttonsHTML += `
                <button class="page-number ${isActive}" 
                        onclick="window.productsModule.goToPage(${page})">
                    ${page}
                </button>
            `;
        }
        
        container.innerHTML = buttonsHTML;
    }

    /**
     * 跳转到指定页
     */
    async goToPage(page) {
        if (page >= 1 && page <= this.state.totalPages && page !== this.state.currentPage) {
            this.state.currentPage = page;
            // 重新获取数据
            await this.fetchProducts();
        }
    }

    /**
     * 更新加载状态
     */
    updateLoadingState(isLoading) {
        const refreshBtn = document.getElementById('refreshProductsBtn');
        const btnText = refreshBtn?.querySelector('.btn-text');
        const btnLoading = refreshBtn?.querySelector('.btn-loading');
        
        if (refreshBtn && btnText && btnLoading) {
            if (isLoading) {
                refreshBtn.disabled = true;
                btnText.classList.add('hidden');
                btnLoading.classList.remove('hidden');
            } else {
                refreshBtn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoading.classList.add('hidden');
            }
        }
        
        // 显示/隐藏加载遮罩
        const overlay = document.getElementById('tableLoadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !isLoading);
        }
    }

    /**
     * 启用/禁用导出按钮
     */
    enableExportButton(enable) {
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.disabled = !enable;
        }
    }

    /**
     * 显示状态信息
     */
    showStatus(text, type = '') {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = statusIndicator?.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            statusText.textContent = text;
            
            // 清除之前的状态类
            statusIndicator.classList.remove('loading', 'success', 'error');
            
            // 添加新的状态类
            if (type) {
                statusIndicator.classList.add(type);
            }
        }
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info') {
        // 这里可以实现更优雅的消息提示
        // 暂时使用alert
        alert(message);
    }

    /**
     * 用户信息更新处理
     */
    onUserInfoUpdated(userInfo) {
        console.log('商品模块：用户信息已更新', userInfo);
        // 可以根据需要重置状态或重新加载数据
    }

    /**
     * 模块显示时调用
     */
    show() {
        console.log('显示商品管理模块');
        
        // 如果已登录且没有数据，自动加载
        if (window.app && window.app.isLoggedIn()) {
            if (this.state.products.length === 0 && !this.state.isLoading) {
                setTimeout(() => this.fetchProducts(), 300);
            } else if (this.state.lastUpdateTime) {
                // 如果有数据，更新统计信息
                this.updateStatistics();
                
                // 如果数据超过5分钟，提示可以刷新
                const now = new Date();
                const diff = now - this.state.lastUpdateTime;
                if (diff > 300000) { // 5分钟
                    this.showStatus('数据可能已过期，建议刷新', 'warning');
                }
            }
        } else {
            this.showStatus('请先登录TEMU站点', 'warning');
        }
    }

    /**
     * 模块隐藏时调用
     */
    hide() {
        console.log('隐藏商品管理模块');
    }

    /**
     * 模块销毁
     */
    destroy() {
        console.log('销毁商品管理模块');
        // 清理事件监听器等
        this.state = {
            currentPage: 1,
            pageSize: 50,  // 每页50条商品，更加合理
            totalProducts: 0,
            totalPages: 1,
            products: [],
            isLoading: false,
            lastUpdateTime: null  // 记录最后更新时间
        };
        this.initialized = false;
    }
}

// 创建模块实例并注册到全局
window.productsModule = new ProductsModule();

// 注册到全局以支持降级加载
window.Module_products = window.productsModule;

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductsModule;
}