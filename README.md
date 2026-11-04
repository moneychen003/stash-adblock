# 上游广告规则＋实测补丁：Shadowrocket 与 Stash

**版本：2026.11.04.4｜本地发布候选，尚未更新公开订阅。**

同一份合并规则，分别生成 **Shadowrocket 模块**和 **Stash 覆写**。输入包含固定版本的 fmz200 上游广告合集、此前已审核的 2026.11.04.2 规则，以及你的定向实测修复。精确修复放在前面，避免再次被上游的拒绝规则抢先拦住。两端共用来源、删除策略与补丁，不维护两份各自变化的规则。

## 两个版本

| 客户端 | 生成文件 | 导入位置 |
| --- | --- | --- |
| Shadowrocket | [stash-adblock.shadowrocket.module](rules/stash-adblock.shadowrocket.module) | 配置 → 模块 |
| Stash | [stash-adblock.stoverride](rules/stash-adblock.stoverride) | 远程覆写 |

**候选文件已构建，但新增脚本提交还未公开。发布前不要将候选当作已经可在线安装的正式订阅。**发布后计划使用下面两个地址，Stash 的原地址保持不变：

```text
https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.shadowrocket.module
https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride
```

本项目不提供节点，不替换你的节点订阅和普通分流。不要同时启用本合并版、上游原版广告合集和旧定制广告模块；运行合并版不依赖 Script Hub 转换工具。安装分别见 [Shadowrocket](docs/INSTALL_SHADOWROCKET.md) 和 [Stash](docs/INSTALL.md)。

## 合并范围

| 项目 | 两端共用的内容 |
| --- | --- |
| 分流 | 3098 条；固定 AWA 广告条目已内联，避免把 Clash YAML 交给小火箭读取 |
| URL／正文改写 | 1150 条 URL 改写、29 条正文改写 |
| 脚本 | 225 条绑定、97 个 provider；保留二进制、正文、超时与参数信息 |
| 静态响应 | 3 项；两端核对响应字节与头部 |
| HTTPS 范围 | 1025 个主机条目，包含原上游的有限域名通配，无全局 `*` |

上游快照中 **4383 条有效语句**均有编译、拆窄、排除或补丁替代记录，见 [conversion-ledger.json](rules/conversion-ledger.json)。此前已审核规则也参与取并集；精确重复项去重，广告覆盖不按 App 类型整组删除。具体来源和计数见 [coverage.json](rules/coverage.json)。

保留微博、B站、豆瓣、广电、拼多多、雪球、QQ音乐和优酷等定向处理，京东、酷安及其他 App／小程序的原有广告处理也保留。**规则数和上游声称的支持数量，不等于实测成功的 App 数。**旧版成功、本轮波动、仍有推广及受阻项目，继续在 [App 逐项观察与历史记录](docs/APP-STATUS.md)中区分。

## 去掉哪些内容

不带入个人证书、私钥、认证密钥、节点、设备清单、抓包、家庭路由或私人 DNS 偏好。会员／鉴权篡改、支付与激活阻断、安全检查和更新阻断等非广告功能排除；过宽的正常内容拒绝与混合脚本分支有逐条理由。广告专用视频处理保留播放流、付费状态、水印、普通导航及青少年配置。没有把历史私人配置原样分享出去。

## 缓存与验证边界

部分 App 会保留旧广告素材或状态，可能需要清缓存或重装。先确认规则与证书正常，再依照[缓存与重装指南](docs/CACHE-AND-REINSTALL.md)处理；删除 App 前同步或备份本地内容。QQ音乐重装后的四次观察、优酷使用者确认等历史结果，不等于这次双端合并版已重新实机验收。

当前已验证共同来源的重建一致性、两种输出的完整对应、关键修复优先级、JS／JQ／正则语法、普通功能与二进制样例。**双端合并候选尚未做手机回归，也未完成发布后的匿名下载校验。**

## 文档与反馈

- [Shadowrocket 安装](docs/INSTALL_SHADOWROCKET.md) · [Stash 安装](docs/INSTALL.md)
- [双端构建与差异](docs/DUAL-CLIENT.md) · [实测分类](docs/APP-STATUS.md)
- [缓存与重装](docs/CACHE-AND-REINSTALL.md) · [故障反馈](docs/TROUBLESHOOTING.md)
- [来源与许可](THIRD_PARTY.md) · [维护方法](docs/MAINTENANCE.md)

本仓库原创内容按各文件 SPDX 发布，包含 GPL-3.0-or-later 与单独的 Apache-2.0 实现；上游及衍生内容保留其原许可范围；原作者署名保留，第三方独立脚本按原项目声明，仅引用固定 URL。反馈时不要上传账号、证书、密钥、原始抓包或完整个人应用清单。
