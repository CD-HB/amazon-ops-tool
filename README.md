# 亚马逊辅助工具

一个静态网页工具，用于亚马逊运营辅助，包含批量广告表生成、提示词整理和任务看板。

## 本地运行

在本目录打开终端后运行：

```bash
python -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173
```

## 部署到 GitHub Pages

上传这些文件到仓库根目录：

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`

然后在 GitHub 仓库 `Settings -> Pages` 里选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## 数据说明

提示词库和任务看板数据保存在浏览器本地 `localStorage`，不同用户不会自动共享同一份数据。
