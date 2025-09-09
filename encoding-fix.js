// 编码修复工具
// 此文件用于设置Windows控制台的正确编码

const { exec } = require('child_process');
const os = require('os');

// 设置控制台编码
function setConsoleEncoding() {
    if (os.platform() === 'win32') {
        // Windows系统设置控制台编码为UTF-8
        exec('chcp 65001', (error) => {
            if (error) {
                console.log('Warning: Unable to set console encoding');
            }
        });
        
        // 设置Node.js进程的编码
        if (process.stdout && process.stdout.isTTY) {
            process.stdout.setEncoding('utf8');
        }
        if (process.stderr && process.stderr.isTTY) {
            process.stderr.setEncoding('utf8');
        }
    }
}

// 导出函数
module.exports = { setConsoleEncoding };

// 如果直接运行此文件，则执行编码设置
if (require.main === module) {
    setConsoleEncoding();
    console.log('✅ 控制台编码已设置为UTF-8');
    console.log('测试中文输出：你好，世界！');
    console.log('=====================================');
}