# 维护与发布双端规则

依赖 Python 3.9+、PyYAML、Node.js 22 与 jq 1.7+。只维护共同输入与补丁，目标文件由构建生成。

## 本地构建

```sh
python -m pip install -r requirements.txt
python tools/build.py
python tools/validate.py
python tools/test_dual.py
python tools/test_compiler.py
python tools/test_coverage.py
node tools/test_scripts.cjs
node tools/test_qx_transform.cjs
node tools/test_fmz_video.cjs
node tools/test_media_ad_only.cjs
node tools/test_xiaohongshu.cjs
```

编译器会检查上游快照哈希、政策中的原始行文本、兼容性说明、完整语句台账与旧版覆盖。新上游出现未支持语法或未锁定脚本时直接失败，不能静默丢弃。更新上游需要重新核对政策与依赖。

`tools/build.py` 输出 Stash 覆写、Shadowrocket 模块及各自哈希；`tools/test_dual.py` 验证完整映射。变更版本号后同步更新文档，不用规则数量推算支持／成功 App 数量。

## 发布顺序

1. 先检查差异、许可与隐私，得到对应发布授权。
2. 先公开包含自有脚本的提交，再把 `sources/version.json` 的 scripts_revision 固定到该提交。
3. 匿名下载这批脚本，核对本地 SHA-256；将已验证 URL 与哈希记入 `sources/published-scripts.json`，再重建最终产物。未公开脚本的锁记录 http_status 为 null，不能伪称 HTTP 下载通过。
4. 发布最终配置和文档，检查两个主文件及所有引用依赖能匿名下载且哈希一致，确认 CI 通过。
5. 做客户端加载与对应广告位的冷启动回归，注明版本、登录、缓存与实际观察。构建成功不能替代手机验收。

不发布证书、私钥、设备清单、账号、控制密钥、原始抓包、App 安装包或私人网络配置。需要回滚时使用 Git 历史发布版本，并同时恢复相应脚本引用。

固定的 fmz 原始快照保留作者的原始空白，不能为了格式化破坏哈希；`.gitattributes` 仅对该快照关闭空白提示，其他源码与生成文件仍检查差异。
