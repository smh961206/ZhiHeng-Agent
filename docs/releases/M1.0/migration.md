# M1.0 迁移说明

## 新部署

复制 `config/models.example.json` 为当前环境的模型文件，在 `models` 中定义连接，在 `pipeline` 中分配环节，并将 `MODEL_CONFIG_FILE` 指向该文件。密钥值只填写在 `.env` 或 `.env.production`。

## 旧部署

schema v1 文件和旧环境变量仍可运行。迁移时先生成 schema v2 文件并执行离线配置检查，再重启服务。重启后只有新建任务写 modelState v4；已存在任务不迁移、不重绑模型，也不改变原始研究截止日。

旧配置概念映射如下：

| 旧角色 | 新环节 |
| --- | --- |
| router | input / Input |
| analysis、MAIN、PRO | researcher、writer、evidenceVerifier、auditor |
| vision / Vision challenger | vision |
| flagship review | criticalReviewer |
| flagship Judge | judge |

删除环境文件中的旧治理变量前，应先确认当前模型文件是 schema v2。历史任务状态会继续使用保存的身份；旧变量解析代码在兼容期内保留。

## 无数据迁移

M1.0 只增加私有任务状态版本，不增加数据库结构。禁止批量改写 modelState v1-v3、旗舰授权收据、模型调用记录或历史发布证据。
