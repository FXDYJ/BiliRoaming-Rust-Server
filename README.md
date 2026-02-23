# BiliRoaming-Rust-Server

## [项目原理]

BiliRoaming-Rust-Server 是配合 [BiliRoaming](https://github.com/yujincheng08/BiliRoaming)（一款哔哩哔哩 Android 客户端的 Xposed 模块）使用的后端解析服务器。其核心工作原理如下：

1. **请求代理与区域分流**：哔哩哔哩对番剧内容进行了地区限制（如港澳台独家、泰区独家等），大陆用户直接访问会收到「地区限制」错误。BiliRoaming 模块在客户端拦截播放链接请求，将其转发给本服务器；本服务器根据请求中携带的 `area` 参数（`cn`/`hk`/`tw`/`th`）选择对应区域的上游 API 地址，再代表客户端向哔哩哔哩服务器发起请求。如果部署了位于香港/台湾等地区的服务器或配置了对应的代理，即可拿到该地区可用的播放地址。

2. **响应缓存**：服务端将从哔哩哔哩获取到的播放地址、搜索结果、剧集信息等缓存至 Redis，避免对同一内容的重复请求，既降低了被限速的风险，也提升了响应速度。缓存时间可在 `config.json` 的 `cache` 字段中按返回码分别配置。

3. **鉴权与签名校验**：服务端支持对客户端请求进行签名校验（`check sign`），防止非授权客户端滥用。同时支持 access_key 鉴权转发，可为客户端自动刷新 Token。

4. **黑白名单**：可通过本地配置或远程接口对用户 UID 设置黑名单（禁止使用）或白名单（仅允许白名单内用户使用）。

5. **去除付费/登录限制**：服务端在向上游请求时会移除 `need_vip` 和 `need_login` 标记，使响应中不再携带这些限制字段，配合 BiliRoaming 模块实现解锁效果。

6. **健康检测**：后台任务会定期对各区域的上游 API 进行连通性检测，并通过 Telegram Bot / PushPlus 等渠道推送状态变化通知。

## [如何用已部署的服务器观看港澳台番剧]

> **前提**：您需要在 Android 设备上安装 Xposed 框架（如 [LSPosed](https://github.com/LSPosed/LSPosed)）以及 [BiliRoaming](https://github.com/yujincheng08/BiliRoaming) 模块，并激活该模块作用于哔哩哔哩客户端。

### 步骤

1. **获取服务器地址**：确认已部署本项目的服务器域名或 IP，例如 `https://example.com`（需可被您的设备访问）。

2. **在 BiliRoaming 中配置解析服务器**：
   - 打开哔哩哔哩 App，进入「我的」→「设置」→「哔哩漫游」（由 BiliRoaming 模块注入的设置页）。
   - 找到「解析服务器」或「自定义解析服务器」选项，填入服务器地址，例如：
     ```
     https://example.com
     ```
   - 根据需要开启对应区域的解析，例如勾选「香港」「台湾」「泰区」等。

3. **选择播放区域**：
   - 在 BiliRoaming 设置中，将目标地区（如「香港」）设为首选解析区域。
   - 也可开启「自动区域选择」，由服务器健康检测结果自动切换。

4. **播放限区番剧**：
   - 在哔哩哔哩 App 中搜索或进入仅限港澳台的番剧页面，点击播放。
   - BiliRoaming 会自动将请求转发至已配置的解析服务器，服务器再通过香港/台湾区域的网络（或代理）获取播放地址并返回，即可正常观看。

### 注意事项

* 服务器本身需要具备访问对应地区 API 的能力，通常需要服务器的 IP 属于香港/台湾等地区，或在 `config.json` 中为对应区域配置了可用代理（`hk_proxy_playurl_url`、`tw_proxy_playurl_url` 等）。
* 请勿将服务器地址公开传播，避免被滥用导致封禁风险（详见 `appsearch_remake` 配置中的提示）。
* 本项目仅供学习研究，请遵守哔哩哔哩用户协议及所在地区相关法律法规。

## [Features]

* local black&white list
* check sign
* support config.json & config.yaml
* support http,https,socks5.. proxy 
* remove need_vip & need_login
* support auto_update
* read the cfg from json
* health check
* https support
* 向后兼容

## [TODO] 

* ~~/intl/gateway/v2/app/search/v2?~~ web脚本已弃用
* ~~/intl/gateway/v2/ogv/view/app/season2?~~ web脚本已弃用
* ~~/intl/gateway/v2/ogv/view/app/episode?~~ web脚本已弃用
* ~~/pgc/view/web/season?~~ web脚本已弃用
* web panel
* local search
* to be faster

## [使用说明]

### 1. 使用一键安装器
* 将域名解析至您的服务器
*  `wget -c -t 5 https://github.com/pchpub/biliroaming-rust-server-installer/releases/download/v0.1.0/biliroaming-rust-server-installer && chmod 777 biliroaming-rust-server-installer && ./biliroaming-rust-server-installer` 
* 按提示操作 默认回车 (推荐使用 auto_proxy 并输入 clash 订阅)
* (如果没开启自动https)使用 Nginx 反代安装器最后给的URL/(开启了自动https)不用安装nginx, 直接使用
* Enjoy~

### 2. 使用已编译的二进制文件
* 下载二进制文件(使用Action编译的较新)
  * 从[Release](https://github.com/pchpub/BiliRoaming-Rust-Server/releases)中下载二进制文件及 config.json
  * 从[Action](https://github.com/pchpub/BiliRoaming-Rust-Server/actions/workflows/ci.yml)中下载二进制文件,从仓库中下载config.json
* 安装 Redis
  * 使用宝塔安装 Redis
  * `apt install redis` #Ubuntu&Debian
  * `yum install redis` #CentOS
* 填写 config.json
*  `./biliroaming_rust_server` 启动服务端
* 使用 Nginx 反代 `http://127.0.0.1:2662` (端口号可在 config.json 中修改)
* Enjoy~

### 3. 自行编译二进制文件
*  `git clone https://github.com/pchpub/BiliRoaming-Rust-Server.git` 下载源代码
* 安装 Cargo
  * `apt install cargo` #Ubuntu&Debian
  * `yum install cargo` #CentOS
* `cd BiliRoaming-Rust-Server` 进入源代码目录下
* `cargo build --profile=fast` 编译二进制文件
* 安装 Redis
  * 使用宝塔安装 Redis
  * `apt install redis` #Ubuntu&Debian
  * `yum install redis` #CentOS
* `cp config.example.json config.json` 复制配置文件并重命名
* `cp target/fast/biliroaming_rust_server biliroaming_rust_server`将编译好的二进制文件复制至项目根目录
* 填写 config.json
* 使用 `./biliroaming_rust_server` 启动服务端
* 使用 Nginx 反代 `http://127.0.0.1:2662` (端口号可在 config.json 中修改)
* Enjoy~

### 4. 使用一键安装脚本
*  `curl -sSO https://raw.githubusercontent.com/pchpub/BiliRoaming-Rust-Server/main/install.sh && sudo bash install.sh` 
* 按提示操作 默认选y（yes）
* 使用 Nginx 反代 `http://127.0.0.1:2662` (端口号可在 config.json 中修改)
* Enjoy~
## [温馨提示]
* config中code为0时的缓存设置已无效,缓存时间由播放链接deadline决定
* 非常不建议将缓存时间设为0（永久缓存）,可能会导致后续错误无法自动恢复
* 目前服务端只是小范围测试,有已知但未修复的严重bug,可能会导致您的机子更容易-412

## [API]

* /pgc/player/api/playurl
* /pgc/player/web/playurl
* /intl/gateway/v2/ogv/playurl
* /intl/gateway/v2/app/search/type
* /x/v2/search/type
* /x/web-interface/search/type
* /intl/gateway/v2/ogv/view/app/season
* /x/intl/passport-login/oauth2/refresh_token
* /intl/gateway/v2/app/subtitle
* /api/accesskey
