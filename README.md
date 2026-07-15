# 亚马逊辅助工具

一个静态网页工具，用于亚马逊运营辅助，包含美国/加拿大/英国站利润计算、美国站 FBA 费用估算、批量广告表生成、提示词整理和任务看板。

## 本地运行

在本目录打开终端后运行：

```bash
python -m http.server 4186
```

然后访问：

```text
http://127.0.0.1:4186
```

## 部署到 GitHub Pages

上传这些文件到仓库根目录：

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`
- `api/account-sync.js`（可选，用于跨电脑账号数据同步）

然后在 GitHub 仓库 `Settings -> Pages` 里选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## 跨电脑账号同步

同一手机号账号要在不同电脑保持一致，需要在 Vercel 里添加 Redis 存储。

1. 在 Vercel 项目中进入 `Storage`。
2. 新建 Redis/Upstash Redis 存储，并连接到当前项目。
3. 确认项目环境变量里出现：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

如果 Vercel/Upstash 自动生成的是下面这种名字，也可以直接使用，后端已兼容：

```text
UPSTASH_REDIS_REST_KV_REST_API_URL
UPSTASH_REDIS_REST_KV_REST_API_TOKEN
```

如果连接项目时使用了默认 `STORAGE` 前缀，下面这种名字也已兼容：

```text
STORAGE_KV_REST_API_URL
STORAGE_KV_REST_API_TOKEN
```

4. 重新部署项目。

部署完成后，前端会默认使用：

```text
https://amazon-ops-tool-eight.vercel.app/api/account-sync
```

登录同一手机号和密码时，会自动从云端恢复广告、提示词、任务和 SKU；保存后也会自动同步到云端。本地 `localStorage` 只作为离线缓存。

## 数据说明

账号、批量广告、提示词库和任务看板数据会优先通过 Vercel Redis 同步；本地 `localStorage` 作为离线缓存。
