# V5.3 公司 Logo 自动检索交付说明

日期：2026-09-14。范围：用户明确要求取消本地公司映射，并选择「仅用免密钥公开来源，接受部分公司没有 Logo」。

## 最终行为

公司卡片使用市场和证券代码请求同源接口 `/api/securities/{market}/{symbol}/logo`。后端从 Wikidata 查询对应交易所的上市代码，再从同一公司条目的 Logo 属性取得 Wikimedia Commons 图片。新增公司无需添加代码映射、公司域名或本地图片。

查询支持沪、深、北、港及 Nasdaq、NYSE 的公开上市记录；港股查询兼容不补零、四位、五位代码。美股保留股类标点，不猜测另一个代码。只有唯一公司匹配才选图，多公司匹配、结果截断、无图、来源不可用均显示通用公司图标。查询排除明确已结束、尚未开始和废弃的上市声明。

同一公司的多张 Logo 按文件名排序，最多尝试两个候选。仅嵌入来源元数据明确标记为 Public domain / CC0 且不要求署名的图片；许可不明确时保留缺图。Logo 仅用于当前界面识别，不能作为公司身份认证、财务证据或历史时点的品牌证明。

## 维护与架构

- 前端不包含公司级映射表，后端也不包含公司代码、公司域名和图片文件名对应表。
- 后端仅保留交易所的 Wikidata 协议标识。它是通用市场识别规则，不是公司名单。
- 图片只进入可丢弃的内存缓存，不写本地文件、MongoDB、Knowledge、研究任务或报告。
- 成功缓存 24 小时，未找到缓存 1 小时，上游异常缓存 60 秒。浏览器成功缓存 1 小时，缺图响应缓存 60 秒。
- 缓存最多 256 条，每个上游响应最多 256 KiB；最多 3 个并行查询、16 个待处理证券。同一证券并发请求合并，整体查询超时 12 秒。上游 429/503 触发 60 秒冷却。
- 公共来源请求由服务器发起，只包含交易所、证券代码或公开文件名，不发送研究问题、账户信息或模型配置。
- 外部图片只从固定 Wikimedia HTTPS 域名读取，不跟随重定向；校验图片 MIME 和 PNG/JPEG 文件头，不向浏览器提供原始 SVG/HTML。响应使用 `nosniff` 和 CSP，并通过 `Link` 响应头保留文件来源页。

## 改动文件

修改：

- `src/lib/security-display.ts`：移除本地映射，生成通用证券 Logo 接口地址，校验市场与代码。
- `src/components/CompanyLogo.tsx`：标注公开来源，懒加载、异步解码，保留缺图回退。
- `python_backend/api/factory.py`：接入 Logo 服务生命周期和只读图片接口。
- `docs/architecture/current-implementation-map.md`：登记当前模块归属。
- `MANIFEST.json`：仅更新本次相关文件的清单与摘要。

新增：

- `python_backend/infrastructure/company_logos.py`
- `python_tests/test_company_logos.py`
- `tests/company-logo.test.ts`
- `tests/company-logo.browser.ts`
- 本交付说明。

移除整个 `public/company-logos/`：`apple.ico`、`byd.ico`、`gwm.ico`、`microsoft.ico`、`moutai.ico`、`nvidia.ico`、`pingan.png`、`seres.ico`、`tencent.png`、`tesla.ico` 和旧 `README.md`。重新构建后的 `dist` 也不再包含该目录。

工作区同时包含其他任务的 TypeScript/FastAPI 迁移。本次在现有迁移结果上修改上述文件，没有撤销或重新提交其他任务的改动。

## 验证证据

| 检查 | 结果 |
|---|---|
| Python Logo、市场解析与 FastAPI 入口定向测试 | 29 / 29 通过 |
| 前端 Logo 地址与证券显示定向测试 | 4 / 4 通过 |
| Chrome 组件定向验证 | 正常加载、404 回退、切换公司、非法证券、同源请求均通过 |
| Python Ruff（本次涉及模块和测试） | 通过 |
| Python Mypy（Logo 模块与入口） | 通过 |
| TypeScript 工程检查 | 通过；沿用仓库现有 `noCheck` 配置，不代表完成严格类型校验 |
| Vite 生产构建 | 通过；现有 UI 依赖的 `use client` / sourcemap 提示仍存在 |
| 真实公开来源查询 | US:AAPL、CN:002594、HK:00700 均取得 PNG，分别为 2017、2986、2973 字节 |

公开来源验证未调用任何模型。Python 测试有一次缓存目录权限提示，不影响断言；最初超大测试参数生成过长测试名称，已改为短名称，随后全部通过。浏览器测试使用已安装的 Chrome，无需下载浏览器；缺图样例的 404 属预期行为。

可复查命令：

```text
.venv/Scripts/python.exe -m pytest python_tests/test_company_logos.py python_tests/test_market.py python_tests/test_fastapi_entrypoint.py -q
node --experimental-strip-types --test tests/company-logo.test.ts tests/security-display.test.ts
node --experimental-strip-types tests/company-logo.browser.ts
.venv/Scripts/python.exe -m ruff check python_backend/infrastructure/company_logos.py python_backend/api/factory.py python_tests/test_company_logos.py
.venv/Scripts/python.exe -m mypy python_backend/infrastructure/company_logos.py python_backend/api/factory.py
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
```

## 兼容、部署和回滚

平台仍为 V5.3，Knowledge 仍为 K1.0.0。没有持久化 Schema 变化、数据迁移、执行兼容编号变化、研究恢复变更、功能开关、新依赖或密钥环境变量。FastAPI 增加一个只读接口，不改变行情和研究接口。

部署需同时更新后端和前端构建。旧前端引用的 `/company-logos/*` 静态路径退出服务，不承诺继续可用；浏览器刷新新版即可。后端部署环境需可访问 Wikidata/Wikimedia，否则正常显示通用图标。

回滚时只恢复本次列出的修改及旧静态图片，移除本次新增运行模块并重新构建；不要整体回滚工作区，以免影响其他任务的迁移成果。无需回滚数据库或历史任务。

本次未执行完整基准、全量界面回归、发布门禁、Docker 部署回滚和真实模型验收；未推送远程或部署。仅执行与 Logo 改动直接相关的测试。

已知限制：公共资料可能不完整或更新滞后；明确支持的交易所以外、无适用图片许可、匹配不明确或网络不可用时均可缺图。Logo 展示依赖第三方公开内容，不能保证每家公司都有图片或总是最新图案。图片文件的商标限制仍适用。

延期范围：收费数据源、API 密钥服务、公司域名兜底、人工公司映射、历史品牌时点档案均未引入，也不属于本次后续待办。

## 来源文档

- [Wikidata 查询服务官方说明](https://www.mediawiki.org/wiki/Wikidata_query_service/User_Manual)
- [MediaWiki Imageinfo 接口](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Wikimedia Commons 内容复用说明](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- 实际样例来源：[Apple](https://commons.wikimedia.org/wiki/File:Apple_logo_black.svg)、[BYD](https://commons.wikimedia.org/wiki/File:BYD_Company%2C_Ltd._-_Logo.svg)、[Tencent](https://commons.wikimedia.org/wiki/File:Tencent_logo_2017.svg)。
