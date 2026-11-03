# Stash 去广告覆写 · 完整版

**版本：2026.11.04.2**

给已经在使用 **Stash 3.6+** 的朋友准备的去广告订阅。保留工作配置中的通用广告拦截、App／小程序广告处理，以及已验证的定向修复；只清理个人信息、个人网络设置和与广告无关的功能改写。**包含自营营销与推广展示清理，不等于所有 App 的每个广告位都已实测成功。**

## 直接使用

复制主订阅地址，在 Stash 的「覆写」中添加**远程覆写**，启用并更新应用：

```text
https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride
```

也可在 iPhone 上打开[一键安装链接](https://link.stash.ws/install-override/raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride)。一键服务若返回 403 或跳转失败，使用上面的地址手动导入即可。**原有订阅地址不变，已安装首版的用户更新这一个覆写即可。**

本项目不提供代理节点，无需替换节点配置。广告域名拦截以外的 HTTPS 改写需要按[安装说明](docs/INSTALL.md)启用相关功能，并在自己的设备上生成、安装和信任自己的 Stash CA。不要导入别人分享的证书。

## 这版保留了什么

| 类型 | 当前数量／内容 |
| --- | --- |
| 分流规则 | 2559 条，另引用 AWA 通用广告域名规则集 |
| URL／响应正文改写 | 419 条 URL 改写、3 条正文改写 |
| 脚本绑定 | 143 条，53 个 provider；上游脚本使用固定版本引用 |
| 本仓库脚本 | 8 个：原有七个处理器及剔除无关功能的优酷广告处理器 |
| HTTPS 主机范围 | 329 个主机条目；含指定域名下的通配条目，无全局 `*` |

微博、哔哩哔哩、豆瓣、中国广电、拼多多、QQ 音乐、优酷及雪球的定向广告修复均保留。京东、酷安及其他 App／小程序的广告规则也保留，具体成功证据与观察边界见[逐项效果](docs/APP-STATUS.md)。**规则数量不等于已验证 App 数量。**

首版曾因过度裁剪而缺失不少广告规则，这版已改为从工作配置逐项保留。与原组合仍有差异的原因，以及每条删除的规则及理由，见[覆盖范围与差异](docs/COVERAGE.md)和[机器可读清单](rules/coverage.json)。

## 为什么装完还有旧开屏

有些 App 会保留已经下载的广告素材或旧状态。更新覆写后，先完全退出 App 再启动；仍有旧广告时，按[缓存与重装指南](docs/CACHE-AND-REINSTALL.md)排查。**部分 App 可能需要彻底删除后从官方商店重装；iOS「卸载 App」保留数据，不能当作干净重装。**

QQ 音乐 20.9.6 干净重装后，四次启动观察未见此前的商业开屏；优酷 11.2.19 则由使用者确认手动重装后去广告成功。重装会删除本地数据，需要先同步或备份下载、设置及未同步内容；这些结果也不能证明缓存是唯一原因。

## 文档与反馈

- [安装与更新](docs/INSTALL.md)
- [缓存、删除与重新安装](docs/CACHE-AND-REINSTALL.md)
- [测试报告](docs/REPORT.md) · [逐项效果](docs/APP-STATUS.md)
- [覆盖范围及与原配置的差异](docs/COVERAGE.md)
- [故障排查与反馈格式](docs/TROUBLESHOOTING.md)
- [来源与许可](THIRD_PARTY.md) · [维护方法](docs/MAINTENANCE.md)

功能异常时先关闭本覆写做对照，并到 [GitHub Issues](https://github.com/moneychen003/stash-adblock/issues) 提交 App 版本、广告位置及遮盖个人信息的截图。不要上传原始抓包、账号、证书、控制密钥、IPA 或完整个人 App 清单。

本仓库原创内容和已注明的 GPL 衍生补丁按 GPL-3.0-or-later 发布；第三方独立代码仍遵循各自声明。第三方脚本仅引用上游 URL 的，不因本仓库许可而获得再分发许可。
