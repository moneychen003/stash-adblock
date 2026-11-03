# 来源与许可

本仓库原创补丁、构建工具、文档及配置整理以 **GPL-3.0-or-later** 发布，完整条款见 [LICENSE](LICENSE)。本声明不替第三方独立代码重新授予许可。

| 来源 | 本项目的使用方式 | 来源许可/说明 |
| --- | --- | --- |
| [AWAvenue-Ads-Rule](https://github.com/TG-Twilight/AWAvenue-Ads-Rule) | 远程广告域名规则集；固定提交版本 | [GPL-3.0](https://github.com/TG-Twilight/AWAvenue-Ads-Rule/blob/main/LICENSE) |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) | 少量 App 广告路径的参考、Youku `cnftp.js` 的远程配置引用；保留来源 | [GPL-3.0](https://github.com/fmz200/wool_scripts/blob/main/LICENSE) |
| [zmqcherish/proxy-script](https://github.com/zmqcherish/proxy-script) | `weibo_launch.js` 仅远程 URL 引用，没有将其脚本正文复制到本仓库 | 上游未给仓库声明统一开源许可证；独立脚本按上游声明，不能据本仓库 GPL 将其再分发 |

固定的依赖提交、大小与内容哈希见 [upstream-lock.json](rules/upstream-lock.json)。固定版本有助于复现，也意味着上游修复不会自动进入本版本，需要本项目维护者复核更新后发布。

远程脚本会在用户自己的 Stash 中处理匹配的请求/响应。安装前应阅读上游代码；上游链接不可用、App 协议改变或证书限制都可能影响功能。本项目没有收集接口、统计上报或统一共享 CA。

公开版从最小范围重新整理：通用广告域名规则与微博、哔哩哔哩、豆瓣、QQ 音乐、优酷、酷安、中国广电相关核心补丁。没有把个人大聚合配置、未核清来源的完整规则表、网易会员接口改写、个人 DNS 修复或其他个人专属模块公开复制。历史实机记录与公开配置不构成逐字节相同的全量验收。
