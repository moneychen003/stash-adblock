# 维护与更新

本仓库只维护 Stash 去广告覆写，不维护节点订阅和 App 安装包。

1. 修改 `sources/config.json` 或 `scripts/`；不要直接编辑生成的覆写。
2. `python -m pip install -r requirements.txt`。
3. 执行 `python tools/build.py`，再执行 `python tools/validate.py` 和 `node tools/test_scripts.cjs`。
4. 核对上游固定提交及许可；修改上游依赖时更新 `rules/upstream-lock.json` 的可用性、大小和 SHA-256。
5. 至少做对应 App 的冷启动对照，注明版本、登录状态、缓存/重装步骤和实际观察窗口。一次没出现广告不代表所有页面和长期使用都无广告。
6. 更新版本号、报告与变更记录，发布后用匿名请求检查主订阅和引用脚本能访问。

公开内容只放规则、补丁、必要的复现说明和去个人信息的结果。设备清单、账号、证书、控制密钥、完整抓包、App 安装包及未遮盖个人信息的截图不应入库。

## 本地验证范围

静态检查覆盖 YAML 结构、脚本引用、JavaScript 语法、配置重建一致性、无关响应放行、广告字段替换和大整数文本保留。它们不能替代 Stash 内核加载、证书信任或用户设备上的实际验收。
