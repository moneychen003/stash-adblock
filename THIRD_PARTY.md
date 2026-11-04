# 来源、署名与许可

本项目保留原有去广告规则与修复，不以来源整理为由整体裁掉广告覆盖。本仓库原创内容及注明的 GPL 衍生补丁按 **GPL-3.0-or-later** 发布，完整条款见 [LICENSE](LICENSE)；此声明不替第三方独立代码重新授予许可。

## 规则与补丁来源

- **奶思（fmz200/wool_scripts）**：域名／URL 广告规则主要来自其 [广告拦截合集](https://github.com/fmz200/wool_scripts/blob/4b7830670baf235ed945085cb926dc499cf619e0/QuantumultX/rewrite/rewrite.snippet)及 [App 与小程序清理合集](https://github.com/fmz200/wool_scripts/blob/4b7830670baf235ed945085cb926dc499cf619e0/QuantumultX/rewrite/cleanup.snippet)。转换为 Stash 格式，剔除非广告或过宽规则；保留上游署名及 GPL 许可。公开配置的 JSON 源文件可直接编辑和重建。
- **AWAvenue-Ads-Rule**：通用广告域名规则集通过固定提交的远程 URL 引用，遵循上游 GPL-3.0。
- **原有本地修复**：豆瓣、微博、拼多多、中国广电、酷安、京东、哔哩哔哩七个定向处理器保留；广告字段与端点也参照既有上游规则和实机证据。
- **优酷广告专用补丁**：`scripts/youku-ad-only.js` 的广告字段、节点类型与端点参考 fmz200 的 `cnftp.js`。这次改成只处理匹配的优酷广告，保留播放流、水印、普通导航、付费状态及青少年配置；文件中保留固定来源链接，按 GPL 发布。
- **其他声明式广告端点及源模块**：保留既有 App／小程序的广告请求路径与原作者远程处理器，包含 ddgksf2013、Keywos 等来源；没有把引用的独立脚本正文复制进本仓库，也没有宣称它们是本仓库原创。

## 远程依赖

| 原项目 | 仓库声明／使用方式 |
| --- | --- |
| [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock) | Apache-2.0；固定版本 URL 引用，具体文件声明优先。 |
| [Keywos/rule](https://github.com/Keywos/rule) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [Maasea/sgmodule](https://github.com/Maasea/sgmodule) | Apache-2.0；固定版本 URL 引用，具体文件声明优先。 |
| [Script-Hub-Org/Script-Hub](https://github.com/Script-Hub-Org/Script-Hub) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [TG-Twilight/AWAvenue-Ads-Rule](https://github.com/TG-Twilight/AWAvenue-Ads-Rule) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [app2smile/rules](https://github.com/app2smile/rules) | MIT；固定版本 URL 引用，具体文件声明优先。 |
| [ddgksf2013/Scripts](https://github.com/ddgksf2013/Scripts) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [ishowshu/qx](https://github.com/ishowshu/qx) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [kokoryh/Script](https://github.com/kokoryh/Script) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [zirawell/R-Store](https://github.com/zirawell/R-Store) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [zmqcherish/proxy-script](https://github.com/zmqcherish/proxy-script) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |

许可证信息根据 2026-11-04 原项目仓库元数据核对。未检测到统一许可证不等于可任意复制或重新授权；本项目对这类独立脚本只保留原作者远程 URL。不要依据本仓库 GPL 标识擅自复制或更改它们的许可。其他项目中的作者及第三方代码署名以其原文件为准。

固定提交／发布版本、下载大小、HTTP 状态与 SHA-256 见 [upstream-lock.json](rules/upstream-lock.json)。其中 `cnftp.js` 同时作为优酷补丁的代码参考，不再直接挂载它的混合处理器。固定版本帮助复现，上游更新不会自动成为本项目版本，需要复核后更新。

远程脚本在使用者自己的 Stash 中处理匹配请求／响应；本仓库没有统一共享 CA，也没有新增数据收集或统计服务。原始抓包、个人设备清单、账号、证书、密钥和安装包不入库。实际删改范围见[覆盖说明](docs/COVERAGE.md)。

## 双端合并候选的来源补充

`sources/upstream/fmz-rewrite.snippet` 保留奶思 fmz200 的原始声明与固定提交，按上游 GPL-3.0 保留来源与可编辑源文件。`sources/legacy-reviewed.json` 是已审核旧版的声明式配置，不含私人信息；AWA 同一固定 payload 已内联到两个客户端。外部可执行脚本仍使用固定原作者 URL，没有复制其正文。

新增自有兼容处理器包括 `qx-body-transform.js`、`fmz-video-ad-only.js` 与已有知乎定向处理器；视频广告字段参考原上游，去掉付费、普通导航等非广告分支。完整依赖与哈希见源依赖清单及锁文件，未公开自有脚本标为待发布，不伪称网络校验通过。
