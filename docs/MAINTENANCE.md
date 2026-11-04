# 维护、升级与重建

公开构建不读取手机、个人目录或证书。输入均在仓库 `sources/`：

- `upstream/fmz-rewrite.snippet`：完整固定上游原文及原作者信息。
- `fmz-policy.json`：非广告排除、精确路径缩窄及拼写修正。
- `fmz-script-policy.json`：脚本分支审查、兼容模式及广告专用替代。
- `verified-repairs.json`：原有定向修复，优先于同用途上游规则。
- `dependencies.json`、`version.json`：固定提交、大小、哈希和发布版本。

## 本地检查

```sh
python -m pip install -r requirements.txt
python tools/build.py
python tools/validate.py
python tools/test_coverage.py
python tools/test_compiler.py
node tools/test_scripts.cjs
node tools/test_qx_transform.cjs
node tools/test_fmz_video.cjs
node tools/test_xiaohongshu.cjs
node tools/test_media_ad_only.cjs
```

Python 3.9+、Node 22+；有 `jq` 时会进一步检查原生表达式的语法与异常形状处理。GitHub Actions 运行同样的检查。生成文件不要手改：`sources/config.json`、主覆写、manifest、coverage、转换账本与依赖锁由编译器重建。

## 更新顺序

1. 固定上游提交，替换完整源文件并核对 SHA-256；不要按机主安装清单过滤。
2. 对源变化更新两份 policy。所有启用行必须有编译、拆窄、排除或实测补丁替代记录；未知语法会报错。
3. 复核保留脚本的具体分支与许可证，不把会员、认证、下载／后台播放、水印或普通内容删改混入广告过滤。混合模块尽量换广告专用实现，不整段照搬。
4. 修改本仓库脚本时，先在候选分支发布已检查的脚本提交，再将 `scripts_revision` 固定到该提交；更新固定依赖哈希。主订阅仍使用 `main`，读者不用换地址。
5. 构建并运行检查，再做相应 App 冷启动对照。记下有效窗口、广告残留及登录／协议受阻；补丁保留不等于当前效果通过。
6. 更新效果表与报告，推送主分支后用匿名请求核对主覆写和所有引用资源；等待 CI 通过。

手机自己的 CA、私网、DNS、原始抓包、截图及安装包不应成为公开构建输入。私人部署只在本机额外合并，保留回滚，不能把设备文件复制进仓库。第三方独立脚本以原项目许可为准，固定 URL 引用不等于获得任意再分发许可。
