# 亚马逊辅助工具

一个静态网页工具，用于亚马逊运营辅助，包含利润/FBA 计算、批量广告表生成、主图/A+ 指令生成、站内 OpenAI 生图、提示词整理和任务看板。

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
- `api/openai-image.js`（可选，用于 Vercel 后端中转）
- `api/account-sync.js`（可选，用于跨电脑账号数据同步）
- `vercel.json`（可选，用于 Vercel 函数超时配置）
- `cloudflare-worker-openai-image.js`（可选，用于 Cloudflare Worker 部署）

然后在 GitHub 仓库 `Settings -> Pages` 里选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## 站内 OpenAI 生图

GitHub Pages 不能安全保存 API Key，因此站内生图需要单独部署一个后端中转接口。不要把 `OPENAI_API_KEY` 写进 `index.html`、`app.js` 或任何前端文件。

### Vercel 部署方式

1. 把仓库导入 Vercel。
2. 在 Vercel 项目中进入 `Settings -> Environment Variables`。
3. 添加：

```text
OPENAI_API_KEY=你的 OpenAI API Key
```

4. 可选添加：

```text
OPENAI_IMAGE_MODEL=gpt-image-2
ALLOWED_ORIGIN=https://cd-hb.github.io
```

5. 部署完成后，工具会默认使用这个接口地址：

```text
https://amazon-ops-tool-eight.vercel.app/api/openai-image
```

如果你换了 Vercel 项目域名，再到工具的“主图/A+ -> 站内 OpenAI 生图 -> 后端接口地址”里改成新的接口地址。

## 跨电脑账号同步

同一手机号账号要在不同电脑保持一致，需要在 Vercel 里添加 Redis 存储。

1. 在 Vercel 项目中进入 `Storage`。
2. 新建 Redis/Upstash Redis 存储，并连接到当前项目。
3. 确认项目环境变量里出现：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

4. 重新部署项目。

部署完成后，前端会默认使用：

```text
https://amazon-ops-tool-eight.vercel.app/api/account-sync
```

登录同一手机号和密码时，会自动从云端恢复广告、提示词、任务、SKU 和生图设置；保存后也会自动同步到云端。本地 `localStorage` 只作为离线缓存。

### Cloudflare Worker 备用方式

1. 新建 Cloudflare Worker。
2. 将 `cloudflare-worker-openai-image.js` 内容粘贴到 Worker。
3. 在 Worker 的 Variables/Secrets 中添加 `OPENAI_API_KEY`。
4. 将 Worker URL 填到工具里的“后端接口地址”。

## 数据说明

账号、批量广告、提示词库和任务看板数据保存在浏览器本地 `localStorage`。同一手机号登录会恢复该账号保存的记录。产品素材图默认只在本机浏览器预览；点击站内生图时，素材图会发送到你配置的 OpenAI 后端中转接口用于生成图片。
