# 安装 Stash 覆写

**更新：2026-11-04**

目标适用版本为 **Stash 3.6+**，适合已经安装并能正常连接 Stash 的设备。本项目只提供去广告**覆写**，不提供代理节点、账号或完整代理配置；**无需替换原有节点配置**。

## 最快安装方法

1. 在装有 Stash 的设备上打开[一键安装链接](https://link.stash.ws/install-override/raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride)。预览页确认是覆写，选择安装并启用。
2. 如果一键页面返回 403 或跳转失败，复制下面的地址，在 Stash 的「覆写」中添加**远程覆写**，并启用它。不同版本的菜单文字可能略有不同。

   ```text
   https://raw.githubusercontent.com/moneychen003/stash-adblock/main/rules/stash-adblock.stoverride
   ```

3. 确认 Stash 已连接、该覆写已启用。按覆写实际用到的功能，检查「改写」「脚本」；需要处理指定 HTTPS 请求时，检查「MitM」。更新远程覆写后重新应用，再完全退出目标 App 重开。

一键安装格式依据 [Stash 官方 URL Schema 文档](https://stash.wiki/faq/url-schema)，覆写的启用与合并方式见 [官方覆写文档](https://stash.wiki/configuration/override)。

公开版按 AWA 通用广告域名规则和少数 App 核心规则裁剪；已通过静态检查。历史实机测试不能替代对当前公开文件及每台设备的安装验收。

## MitM 与证书

只有覆写所需的 HTTPS 改写或脚本需要 MitM 时，才在**自己的设备**上用 Stash 生成并安装自己的 CA，并在系统设置中完成信任。按 Stash 内提示检查证书和相关开关；不导入别人分享的 CA，也不把自己的 CA、私钥或密码分享出去。不要自行添加全局 `*` MitM 主机名；使用覆写声明的有限匹配范围。参见 [Stash 官方 MitM 说明](https://stash.wiki/http-engine/mitm)。

## 安装后怎么确认

选一个你实际遇到广告的 App，记下版本和广告位置。完全退出后启动，约在第 2、5、8 秒观察，最多等 10 秒；超时无结果记为「未取得结果」，不要猜测成功或失败。看清是商业广告、App 自身品牌启动页，还是广告倒计时结束后的正常首页。首次安装有协议页时，先按自己的意愿完成协议流程，再做有效复测。

如无效果，先查 [故障排查](TROUBLESHOOTING.md)，再看 [缓存与重装](CACHE-AND-REINSTALL.md)。
