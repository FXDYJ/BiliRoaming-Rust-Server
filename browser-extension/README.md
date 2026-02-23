# BiliRoaming 浏览器扩展

基于 [BiliRoaming-Rust-Server](https://github.com/FXDYJ/BiliRoaming-Rust-Server) 的 Chrome/Chromium 浏览器扩展，用于解除 B 站区域限制。

## 功能

- 🎬 **解锁区域限制播放** — 通过代理服务器获取被区域限制的视频播放链接
- 🔍 **解锁区域限制搜索** — 通过代理服务器搜索被区域限制的番剧内容
- 🌏 **多区域支持** — 支持大陆 (CN)、香港 (HK)、台湾 (TW)、泰国 (TH) 区域
- ⚡ **一键开关** — 快速启用/禁用插件
- 🔗 **连接测试** — 快速检测代理服务器是否可用

## 安装方法

### 开发者模式安装

1. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `browser-extension` 目录
5. 扩展安装完成后，会在工具栏显示 BiliRoaming 图标

### Edge 浏览器

1. 打开 Edge 浏览器，在地址栏输入 `edge://extensions/`
2. 开启左下角的 **开发人员模式**
3. 点击 **加载解压缩的扩展**
4. 选择 `browser-extension` 目录

## 使用方法

1. 点击工具栏中的 BiliRoaming 图标打开设置面板
2. 在 **服务器地址** 中填入 BiliRoaming-Rust-Server 的地址（如 `https://your-server.com`）
3. 点击 🔗 按钮测试连接是否正常
4. 选择 **默认区域**（如香港 HK）
5. 根据需要开启/关闭 **解锁播放** 和 **解锁搜索**
6. 开启 **启用插件** 开关
7. 点击 **保存设置**
8. 刷新 B 站页面即可生效

## 工作原理

扩展使用 Chrome 的 `declarativeNetRequest` API 将以下 Bilibili API 请求重定向到配置的代理服务器：

| 原始请求 | 说明 |
|---------|------|
| `api.bilibili.com/pgc/player/web/playurl` | 视频播放链接 |
| `api.bilibili.com/x/web-interface/search/type` | 搜索接口 |

重定向时会自动添加 `area` 参数以指定解锁区域。代理服务器会转发请求到对应区域的 Bilibili API，并返回解锁后的结果。

## 前置要求

- Chrome 88+ 或其他基于 Chromium 的浏览器（Edge、Brave、Vivaldi 等）
- 一个可用的 [BiliRoaming-Rust-Server](https://github.com/FXDYJ/BiliRoaming-Rust-Server) 代理服务器

## 注意事项

- 代理服务器需要开启 CORS 支持，或使用 `declarativeNetRequest` 重定向方式（本扩展默认使用后者，无需 CORS）
- 请确保代理服务器稳定可用
- 本扩展仅供学习和研究使用
