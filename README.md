# 亚马逊辅助工具

一个静态网页工具，用于亚马逊运营辅助，包含美国/加拿大/英国站利润计算、美国/加拿大/英国站 FBA 费用估算、批量 SP 广告表生成、否定词筛选、提示词整理和任务看板。英国站利润计算会扣除 VAT，利润模块可展开查看计算过程。视频广告已从操作界面和导出中移除；历史视频记录保留在账号数据中，不参与校验、统计和导出。

## 单关键词建活动

在批量广告全局设置下方使用“单关键词建活动”：每行粘贴一个普通关键词，选择 Exact、Phrase、Broad 匹配方式；也可单独或同时选择“与您的商品相关的关键词”“与您的商品类别相关的关键词”两个亚马逊动态关键词组。推广商品必须填写卖家后台中的 SKU，不接受仅填写 ASIN。普通关键词按“每个词 × 每种匹配方式”创建活动，所选关键词组合并到一个活动和广告组，并可分别调整竞价；名称自动包含投放方式并避免重名。生成结果追加到现有活动表，可继续调整广告位加价后统一导出。每个活动单独使用填写的日预算，面板显示预算合计。站点与竞价方案使用当前全局设置。验证命令：`node tests/single-keyword.cjs`。

## 广告规划表导入（2026-10-13）

批量广告页面新增「从广告规划表生成全部活动」：下载模板、填写后上传 `.xlsx` / `.xls`，校验及预览通过后添加到现有活动表，再下载 Amazon Bulk XLSX。追加不覆盖已有活动；同名冲突会阻止重复添加，可撤销最近一批。

- 输入：`SKU信息`（主推SKU、全部变体SKU）、`ASIN分类`（高流量ASIN、优势ASIN、完全一致ASIN）、`关键词分类`（大词和自定义词根列）、`否定关键词库`（精准否定、词组否定）、`广告规划`（兼容表名“广告规则”）。
- 规则：广告类型、投放对象、匹配方式、默认竞价、竞价方案；可选日预算、三个位置调整、广告状态、SKU范围、Campaign名称、广告组后缀。各词根长尾词展开除大词外的所有分类，多个匹配方式分别创建活动。每行 SKU 信息代表一个产品，共用该工作簿的规则及分类。
- 自动：紧密、宽泛、同类、互补；“关联商品”启用同类和互补，其余分组明确暂停。三种 ASIN 分类分别按精准商品投放生成，不默认扩展 ASIN。
- 状态：`关闭`/`暂停`导出为 Campaign `paused`，仍创建广告组、商品、投放及否定词。表格的“生成”勾选框决定是否包含在文件中，与投放状态独立。缺省状态为暂停；日预算缺省使用网页配置，币种与所选站点一致。
- 校验：重复名称、未知策略、无效竞价/ASIN/百分比、空分类或缺失引用会阻止整批导入；未被规则覆盖的分类会提示。原表公式须有 Excel 已保存的计算结果。模板竞价留空，须按实际规划填写。
- 导出沿用项目 Bulk 字段和 Create 关联逻辑，工作表为 `Sponsored Products Campaigns`；这是新建文件，不是后台既有活动更新文件。未登录亚马逊执行真实上传，最终接受情况以账号后台处理报告为准。参考 [Amazon 官方批量操作指南](https://m.media-amazon.com/images/G/01/api/guides/Bulk_operations_user_guide.pdf)（旧版指南仅作流程参考，不代表当前逐列验证）。
- 本地解析采用 vendored SheetJS CE 0.20.3，[官方安装说明](https://docs.sheetjs.com/docs/getting-started/installation/standalone/)，许可证见 `vendor/SheetJS-LICENSE.txt`。部署时需包含 `plan-import.js`、`plan-ui.js` 和 `vendor/`。导入文件本身不上传；添加后的活动沿用原有账号保存/同步逻辑。

运行 `npm run check` 和 `npm test`。新增回归覆盖读取百分比/货币格式、各广告类型、状态保留、重复/错误拦截、纯数字 SKU、父子关联、否定词及 XLSX 读回。

## 原有广告位与否定词功能

批量广告每个活动的“竞价方案 / 广告位调整”支持搜索结果顶部、搜索结果其余位置、商品页面三个广告位，填写 0–900 的整数百分比，留空及历史未设置数据按 0%。随活动保存和复制，CSV/XLSX 的 Bidding adjustment 行输出对应 Placement 和数值 Percentage。无效百分比会阻止复制和下载。验证：`node tests/placement-bids.cjs`。规则参考 [Amazon Ads 官方说明](https://advertising.amazon.com/library/guides/sponsored-products-best-practices)。

通过侧栏“否定词筛选”进入，粘贴关键词（每行一个）并填写需要保留的词根（每行一个或逗号分隔）。只输出所有词根均未命中的关键词，支持复制和下载 TXT。默认按完整单词/短语匹配，也可选择字符包含；忽略大小写，自动去空行和重复关键词。修改输入后需重新筛选。此模块仅生成文本清单，不会自动提交否定词；内容仅保留在当前页面，刷新或退出登录后清空。

## 本地启动

利润计算器支持 FBA / FBM：FBM 的买家运费计入收入及佣金基数，实际发货成本单独填写人民币；FBA 不使用这两项。ACOAS 按商品售价（不含买家运费）计算广告费，利润率按订单总收入计算。建议底价按当前配送费、广告占比及固定买家运费反推，跨配送费价格档位时需重新核算。

2026-09-10 费率核对：英国依据 [2026-04-17 官方费率卡](https://m.media-amazon.com/images/G/02/sell/images/260410-FBA-Rate-Card-EN.pdf) 修正标准包裹/大件分层、服装鞋靴包裹费和 1.5% 附加费。美国和加拿大已核实 [3.5% 附加费](https://sellercentral.amazon.com/seller-forums/discussions/t/7cbc0233-ee5b-4359-978a-dee7cad5c6f4)，但官方完整基础费率表未能读取，仍沿用原估算表，不能视为完整最新费率。计算器不包含低价英国FBA、SIPP优惠、仓储、入库配置及旺季费。网页提供官方链接并注明适用范围。

计算逻辑验证：`node tests/profit-calculator.cjs`。

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
