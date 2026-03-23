# 全站弹窗广告图

随机弹窗使用（二选一随机，优先 `.jpg`，失败则试 `.png`）：

- `nyan-ad-01.jpg` / `nyan-ad-01.png`
- `nyan-ad-02.jpg` / `nyan-ad-02.png`

放在本目录即可；在 **NYANhub 页面不会弹出**（避免重复）。

---

# NYAN-HUB 封面图（`nyan-cover-01.jpg` … `09.jpg`）

`nyan-hub` 页面读取本目录下的 **`nyan-cover-01.jpg` … `nyan-cover-09.jpg`**。

当前 9 张图已按**原哈希文件名字母顺序**对应到 01–09。若某张封面和卡片标题对不上，只需在 `assets` 里**互换两个 `nyan-cover-XX.jpg` 的文件名**即可。

## 可选：从 Cursor 长文件名 PNG 导入

若你仍有 `c__Users*.png`，可在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\copy-nyan-covers.ps1
```

脚本会生成 `nyan-cover-01.png` … `09.png`。若页面已改为 `.jpg`，需把 HTML 里的扩展名改回 `.png`，或把生成的 PNG 转成/重命名为 `.jpg` 并统一引用。
