#!/bin/bash

# TEMU小助手 - Mac/Linux 启动脚本
# 确保脚本使用UTF-8编码

# 设置语言环境为UTF-8
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请确保Node.js正确安装"
    exit 1
fi

# 显示启动信息
echo "🚀 TEMU小助手启动中..."
echo "系统: $(uname -s)"
echo "Node版本: $(node --version)"
echo "npm版本: $(npm --version)"
echo ""

# 启动应用
npm start

# Mac特定的处理 - 保持窗口打开
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "应用已关闭，按任意键继续..."
    read -n 1 -s
fi