# 来源、署名与许可

本版以**奶思（fmz200）**的完整 [rewrite.snippet](https://github.com/fmz200/wool_scripts/blob/4b7830670baf235ed945085cb926dc499cf619e0/QuantumultX/rewrite/rewrite.snippet)为编译输入，保留其 GPL-3.0 许可、作者信息与固定版本。原文存放于 [sources/upstream](sources/upstream/fmz-rewrite.snippet)，逐条策略和转换结果可重建。早期 cleanup 合集属于历史参考，不作为本轮完整输入。

本仓库原创代码默认以 **GPL-3.0-or-later** 发布，见 [LICENSE](LICENSE)。上游原文及其衍生部分仍遵循原来源的 GPL-3.0 与版本声明，不扩展原作者授予的范围。`scripts/youtube-ad-only.js` 单独采用 **Apache-2.0**，依据文件 SPDX；完整许可见 [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)。本声明不替第三方独立代码重新授权。

## 本仓库的广告专用实现

- 原有豆瓣、微博、拼多多、中国广电、酷安、京东、哔哩哔哩处理器及知乎广告补丁保留；精确路径和响应字段来自既有修复与对应来源证据。
- 优酷、爱奇艺／芒果 TV 的广告字段和节点标识参考 fmz200 `cnftp.js`，改为只处理广告，保留播放流、水印、付费状态、普通导航和青少年配置。
- 小红书广告专用实现参考 fmz 的对应脚本，采用局部 JSON 文本编辑，保留普通图文／视频、作者身份和大整数；未带入水印、下载及普通界面删改。
- YouTube 广告专用实现根据 [Maasea/sgmodule 固定来源](https://github.com/Maasea/sgmodule/blob/65075cdb388fc5e3094afd7e7314c67b243f3525/Script/Youtube/youtube.response.js)的广告字段路径重新实现，不打包其运行库，不开启会员、后台播放、字幕或普通信息流布局改写。
- QX 文本替换与条件处理适配器为本仓库通用代码；原生 jq 由 Stash 处理。
- 彩云天气静态 Mock 使用上游引用的 [Keywos 功能响应数据](https://github.com/Keywos/rule/blob/a06d921d370ad6fca9e972a3f76e64d90bc8cfae/mocks/caiyun.json)，保留来源；没有复制其独立脚本正文或替其授予统一许可证。

## 当前远程运行依赖

| 原项目 | 仓库声明／使用方式 |
| --- | --- |
| [NobyDa/Script](https://github.com/NobyDa/Script) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [Sliverkiss/QuantumultX](https://github.com/Sliverkiss/QuantumultX) | MIT；固定版本 URL 引用，具体文件声明优先。 |
| [TG-Twilight/AWAvenue-Ads-Rule](https://github.com/TG-Twilight/AWAvenue-Ads-Rule) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [app2smile/rules](https://github.com/app2smile/rules) | MIT；固定版本 URL 引用，具体文件声明优先。 |
| [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [ishowshu/qx](https://github.com/ishowshu/qx) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [kokoryh/Script](https://github.com/kokoryh/Script) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |
| [zirawell/R-Store](https://github.com/zirawell/R-Store) | GPL-3.0；固定版本 URL 引用，具体文件声明优先。 |
| [zmqcherish/proxy-script](https://github.com/zmqcherish/proxy-script) | 未检测到仓库统一许可证；固定版本 URL 引用，具体文件声明优先。 |

元数据于 2026-11-04 核对。未检测到统一许可证不等于允许任意复制；对这些独立脚本只引用原作者 URL，没有把它们的正文复制到本仓库。本仓库 GPL 不替它们重新授权。历史版本出现过的其他依赖，不能据旧列表认定仍被当前配置挂载。

固定来源、HTTP 状态、大小与 SHA-256 见 [upstream-lock.json](rules/upstream-lock.json)，完整来源元数据见 [dependencies.json](sources/dependencies.json)。部分来源只用于审查或字段参考，不是当前运行依赖。固定版本不会自动跟随上游分支更新，需要维护者审核后发布。

脚本在使用者自己的 Stash 中处理匹配请求／响应；部分上游处理会请求原站 API。没有新增本项目的统计或数据收集服务。手机自己的 CA、私人 DNS、家庭路由、设备标识和原始请求／截图不进入公开构建，也不应在反馈中上传。
