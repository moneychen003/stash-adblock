# 两个客户端，共用一份规则

**版本：2026.11.04.4，发布候选。**两端共用同一份编译后的 `sources/config.json`。这份中间结果由固定上游、已审核旧版及实测补丁重新构建；旧版也接受最新非广告审查，不重新启用已发现的混合功能，不能手动只改其中一个目标文件。

## 输入与优先级

1. `sources/upstream/fmz-rewrite.snippet`：fmz200 固定提交及 SHA-256 锁定的原始快照。
2. `sources/fmz-policy.json`、`sources/fmz-script-policy.json`：每条拆窄、非广告排除及兼容性处理理由；源行与文本不一致时构建直接失败。
3. `sources/verified-repairs.json`：实测修复的条件与处理器，优先于宽泛的上游处理。
4. `sources/legacy-reviewed.json`：2026.11.04.2 已审核公开规则，取并集以保留既有覆盖。
5. `sources/upstream/awa-ads.yaml`：固定 AWA 广告规则；两端使用相同内联条目，不混用不同格式的远程规则文件。

脚本处理顺序为：实测响应修复、已审核旧处理器、补充上游处理器。只合并语义相同的脚本绑定，保留更宽的既有正文大小限制；来源台账指向最终保留的处理器。三个微博广告接口的 DIRECT 例外保留，以便进入本机响应改写。

## 格式适配

| 共同能力 | Stash | Shadowrocket |
| --- | --- | --- |
| 广告分流 | `rules` | `[Rule]`；TCP／UDP 的 NETWORK 映射为 PROTOCOL |
| URL 改写 | `http.url-rewrite` | `[URL Rewrite]` |
| JQ 正文改写 | `response-jq` | `[Body Rewrite]` 的 `http-response-jq` |
| 脚本 | provider 与触发器分离 | 每条绑定独立命名，直接引用相同脚本 URL |
| 正文／二进制 | require-body、binary-mode 等 | requires-body、binary-body-mode 等；不丢标志 |
| JSON 脚本参数 | 原始 JSON 字符串 | 自有 QX 适配器用 URI 编码参数，脚本解码后行为相同；既有远程参数保持原样 |
| 静态响应 | 原生 mock | 原生 Map Local、base64 内容，保留相同字节与响应头 |
| HTTPS 主机 | 主机数组 | `%APPEND%` 主机列表，不包含证书与私钥 |

这不是把扩展名从 YAML 改成 module。`tools/test_dual.py` 会逐条解码对比顺序、脚本选项与参数、静态响应字节／头部及主机列表，并检查来源台账未指向丢失项。关键广告接口和普通接口另有覆盖测试，脚本样例另验。

## 证据边界

这些检查属于构建、格式和样例验证。之前 Stash 工作组合的实机记录继续保留，但不自动变成双端合并候选的实机验收；之前小火箭原版合集的知乎／贴吧启动与刷新采样也不等于本合并版的验收。发布后还需按目标 App、版本和广告位逐个回归。

候选没有个人证书、设备／账号清单、家庭路由、认证密钥或代理节点。两个客户端仍需各自在本机配置证书与相关开关。
