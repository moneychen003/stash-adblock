# Stash 去广告：fmz 全源适配与实测补丁

**版本：2026.11.04.3｜更新：2026-11-04**

以奶思（fmz200）的完整 `rewrite.snippet` 为输入，逐条适配去广告部分，再叠加此前实测的修复。**不按已安装 App 白名单缩减；也不把原文里的会员、去水印、安全检查和普通功能改写一起带入。**这是完整源文件的去广告适配，不是原文全部功能照搬，更不是全部 App 已实测无广告。

## 直接安装

复制地址，在 **Stash → 覆写 → 从 URL 安装**中添加并启用：

```text
https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride
```

也可打开[一键安装链接](https://link.stash.ws/install-override/raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride)。一键服务若提示 403 或无法跳转，使用上面的地址手动添加。已安装旧版时，更新同一个远程覆写即可，**不要叠加多份本项目副本**。

本项目不提供代理节点，无需替换节点订阅。需要 Stash 3.6+、正常的改写／脚本功能，以及你自己设备上安装并信任的 CA，详见[安装说明](docs/INSTALL.md)。公开文件没有共享 CA、账号、私人 DNS 或家庭路由。

## 来源与覆盖

| 内容 | 本版 |
| --- | --- |
| 完整源审查 | 4383 条启用语句，均有处理记录 |
| 分流规则 | 2480 条，另引用 AWA 广告规则集 |
| URL 及正文改写 | 1085 条 URL、29 条正文改写 |
| 脚本 | 157 条绑定、76 个 provider，其中 13 个本仓库处理器 |
| HTTPS 匹配 | 977 个指定主机／有限域名通配条目，无全局 `*` |

小红书、爱奇艺、芒果 TV、喜马拉雅、Keep、起点读书等原先缺失的定向处理已纳入。微博、豆瓣、哔哩哔哩、中国广电、拼多多、QQ 音乐、优酷、雪球及知乎的已有修复保留在高优先级。**包含规则不等于该 App 已通过实机验收。**

原文固定为 [fmz 4b7830670baf235ed945085cb926dc499cf619e0](https://github.com/fmz200/wool_scripts/blob/4b7830670baf235ed945085cb926dc499cf619e0/QuantumultX/rewrite/rewrite.snippet)，文件标注更新时间为 2026-10-31。其“约730款App/小程序”是上游覆盖声明，不是本项目测试成功数。固定版本不会自动跟随上游 `main` 更新。

## 看真实效果

[App 效果表](docs/APP-STATUS.md)将本轮结果与历史成功分开：开屏／占位再次复现就明确写未通过，短时间没看到广告只记采样结果，不沿用旧成功结论。本文已记录13款App的16轮限时观察；QQ音乐按此前要求不继续复测。完整过程和范围见[测试报告](docs/REPORT.md)。

部分 App 会保留旧开屏素材或本地状态。先确认规则生效，再按[缓存与重装指南](docs/CACHE-AND-REINSTALL.md)排查；**部分 App 可能需要彻底删除后从官方商店重装，但不能保证有效，也不能把所有问题都归因缓存。**删除会丢失本地内容，请先同步或备份。iOS“卸载 App”保留文稿数据，不等于干净重装。

## 文档与反馈

- [安装与更新](docs/INSTALL.md) · [缓存与重装](docs/CACHE-AND-REINSTALL.md)
- [本轮 App 效果](docs/APP-STATUS.md) · [测试报告](docs/REPORT.md) · [旧版历史](docs/HISTORY-2026-11-04.md)
- [覆盖、排除与适配](docs/COVERAGE.md) · [逐条转换记录](rules/conversion-ledger.json)
- [故障排查](docs/TROUBLESHOOTING.md) · [来源许可](THIRD_PARTY.md) · [维护与重建](docs/MAINTENANCE.md)

功能异常时，先关闭本覆写对照，再到 [Issues](https://github.com/moneychen003/stash-adblock/issues)反馈 App 版本、广告位置和遮盖个人信息的截图。不要上传完整个人应用清单、原始抓包、账号、设备标识、证书、控制密钥或私人网络配置。
