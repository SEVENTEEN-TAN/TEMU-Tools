# 状态管理器使用指南

## 概述
状态管理器（StatusManager）是一个公共组件，用于在主页面底部中间位置显示各个模块的状态信息。所有模块都可以调用这个组件来显示统一的状态提示。

## 位置
- **文件路径**: `utils/status-manager.js`
- **显示位置**: 主页面底部状态栏中间
- **DOM元素ID**: `moduleStatusIndicator`

## 使用方法

### 1. 基本使用
```javascript
// 状态管理器已经在全局挂载，直接使用 window.statusManager
if (window.statusManager) {
    window.statusManager.show('正在处理...', 'loading');
}
```

### 2. 快捷方法

#### 加载状态
```javascript
// 显示加载状态（持续显示，需手动隐藏）
window.statusManager.loading('正在获取数据...');
```

#### 成功状态
```javascript
// 显示成功状态（默认3秒后自动隐藏）
window.statusManager.success('操作成功');

// 自定义显示时长（5秒）
window.statusManager.success('数据保存成功', 5000);
```

#### 错误状态
```javascript
// 显示错误状态（默认5秒后自动隐藏）
window.statusManager.error('操作失败，请重试');

// 自定义显示时长（10秒）
window.statusManager.error('网络连接失败', 10000);
```

#### 警告状态
```javascript
// 显示警告状态（默认4秒后自动隐藏）
window.statusManager.warning('数据可能已过期');
```

#### 信息状态
```javascript
// 显示信息状态（默认3秒后自动隐藏）
window.statusManager.info('准备就绪');
```

### 3. 进度更新
```javascript
// 显示进度（适用于批量操作）
window.statusManager.progress(50, 100, '导出进度');
// 显示为：导出进度: 50% (50/100)
```

### 4. 手动隐藏
```javascript
// 立即隐藏状态指示器
window.statusManager.hide();
```

## 实际使用示例

### 示例1：API请求
```javascript
async fetchData() {
    try {
        // 显示加载状态
        window.statusManager.loading('正在获取数据...');
        
        // 执行API请求
        const result = await api.getData();
        
        // 显示成功状态
        window.statusManager.success('数据获取成功');
        
        return result;
    } catch (error) {
        // 显示错误状态
        window.statusManager.error('获取数据失败：' + error.message);
        throw error;
    }
}
```

### 示例2：批量操作
```javascript
async exportAllData() {
    const items = await getAllItems();
    const total = items.length;
    
    for (let i = 0; i < total; i++) {
        // 更新进度
        window.statusManager.progress(i + 1, total, '导出进度');
        
        await exportItem(items[i]);
    }
    
    // 完成后显示成功
    window.statusManager.success(`成功导出 ${total} 条数据`);
}
```

### 示例3：表单提交
```javascript
async submitForm(data) {
    // 显示提交中状态
    window.statusManager.loading('正在提交表单...');
    
    try {
        const response = await api.submitForm(data);
        
        if (response.success) {
            window.statusManager.success('表单提交成功');
        } else {
            window.statusManager.warning('表单提交部分成功');
        }
    } catch (error) {
        window.statusManager.error('表单提交失败');
    }
}
```

## 状态类型说明

| 类型 | 图标颜色 | 默认持续时间 | 使用场景 |
|------|---------|------------|---------|
| loading | 蓝色动画 | 持续显示 | 异步操作进行中 |
| success | 绿色 | 3秒 | 操作成功完成 |
| error | 红色 | 5秒 | 操作失败 |
| warning | 橙色动画 | 4秒 | 需要注意的提示 |
| info | 灰色 | 3秒 | 一般信息提示 |

## 样式定制

状态指示器的样式定义在 `styles/main.css` 中：
```css
.module-status-indicator {
    /* 容器样式 */
}

.module-status-indicator.loading {
    /* 加载状态样式 */
}

.module-status-indicator.success {
    /* 成功状态样式 */
}
/* ... 其他状态样式 */
```

## 注意事项

1. **自动初始化**: 状态管理器在页面加载完成后自动初始化
2. **全局访问**: 通过 `window.statusManager` 全局访问
3. **自动清理**: 设置了持续时间的状态会自动清理
4. **优先级**: 新的状态会覆盖旧的状态显示
5. **兼容性检查**: 使用前请检查 `window.statusManager` 是否存在

## 集成到新模块

在你的模块中使用状态管理器：

```javascript
class YourModule {
    async doSomething() {
        // 检查状态管理器是否可用
        if (!window.statusManager) {
            console.warn('状态管理器未初始化');
            return;
        }
        
        // 使用状态管理器
        window.statusManager.loading('处理中...');
        
        try {
            // 你的业务逻辑
            await yourBusinessLogic();
            window.statusManager.success('处理完成');
        } catch (error) {
            window.statusManager.error('处理失败');
        }
    }
}
```

## 最佳实践

1. **及时反馈**: 在长时间操作前立即显示加载状态
2. **清晰描述**: 使用明确的状态描述文字
3. **适当时长**: 根据信息重要性设置合适的显示时长
4. **错误处理**: 始终在 catch 块中显示错误状态
5. **进度更新**: 批量操作时定期更新进度信息