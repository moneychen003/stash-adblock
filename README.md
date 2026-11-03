# Stash 去广告覆写

**更新：2026-11-04**

给已经在使用 **Stash 3.6+** 的朋友准备的一份去广告覆写。它针对部分 App 的开屏、推荐位和请求做处理；效果随 App 版本、地区、账号状态及规则更新而变化。**有些 App 可能需要重新安装，才能排除旧素材或旧状态的干扰；但重装是最后的可选步骤，不保证有效。**

## 一键安装

在装有 Stash 的设备上打开：[安装 Stash 去广告覆写](https://link.stash.ws/install-override/raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride)。若一键页面返回 403 或跳转失败，请复制下面的主订阅地址，在 Stash 中作为**远程覆写**导入：

```text
https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride
```

安装后确认覆写已启用、Stash 已连接，并按 [安装说明](docs/INSTALL.md)检查需要的开关。这个链接是**覆写订阅**，不需要替换原有节点配置；本项目不提供代理节点。

## 先看效果，再决定是否清缓存

更新覆写后，完全退出目标 App 再启动，观察开屏和首页。若旧开屏仍出现，先确认规则生效、更新订阅并复测；之后可按 [缓存与重装](docs/CACHE-AND-REINSTALL.md)逐步处理。不要一上来删除 App：删除可能清掉未同步的歌曲、下载、设置及其他本地内容。

## 公开版范围与已知效果

公开版收敛到 AWA 通用广告域名拦截，以及微博、哔哩哔哩、豆瓣、QQ 音乐、优酷、酷安、中国广电相关的核心规则。金融、DNS、网易会员接口改写和其他个人化模块不纳入公开版。公开规则已裁剪并通过静态检查；此前的实机记录**不是公开文件逐字节、全 App 的验收**。

截至 2026-11-04：QQ 音乐 20.9.6 同版干净重装后，自动化代理实测四次启动未见此前的商业开屏，其中两次使用原正式规则，首页正常。优酷 11.2.19 则由用户于 2026-11-04 **明确反馈手动重装后去广告成功**；这项结论来自用户反馈，未做同等次数的自动化复测。详见 [测试报告](docs/REPORT.md)。这些结果不保证所有广告位或长期登录使用都有效。

## 使用与反馈

- [安装说明](docs/INSTALL.md)
- [缓存与重装](docs/CACHE-AND-REINSTALL.md)
- [测试报告](docs/REPORT.md)
- [故障排查与反馈格式](docs/TROUBLESHOOTING.md)

可在 [GitHub Issues](https://github.com/moneychen003/stash-adblock/issues) 报告失效或功能异常；请附 App 版本、页面和可公开的复测结果，勿提交个人资料。维护者会根据可复现证据更新规则，不承诺每个 App 或每个广告位都能处理。

覆写可能引用第三方维护的远程脚本。是否使用、上游更新与许可应分别查看对应原项目；本仓库不替所有上游作统一的 MIT 许可声明。请勿在公开反馈中上传证书、账号信息或原始抓包日志。

## 来源与维护

公开版从最小范围重新整理，覆盖少于此前个人大聚合配置；不提供全应用无广告承诺。上游来源与固定版本见 [THIRD_PARTY.md](THIRD_PARTY.md)，构建和维护步骤见 [维护说明](docs/MAINTENANCE.md)。本仓库原创内容按 GPL-3.0-or-later 发布，第三方独立代码遵循各自声明。
