# MakerFlow GitHub / Render 部署说明

本文仅说明当前Node服务与静态Prototype的发布方式。不要提交API Key、`.env`或真实Provider运行产物。

## 1. 安全初始化Git仓库

当前建议把`MakerFlow-AI`目录本身作为独立仓库根，不要在其父级学习计划目录运行`git init`。

进入MakerFlow项目目录后执行：

```powershell
git init
git rev-parse --show-toplevel
git status --ignored
```

确认`git rev-parse --show-toplevel`指向`MakerFlow-AI`，并确认以下内容显示为ignored：

- `.env`
- `.env.*`
- `evals/artifacts/deepseek/`

再执行：

```powershell
git add .
git status
git commit -m "Prepare MakerFlow demo for deployment"
```

提交前再次确认暂存区不包含上述敏感文件和运行产物。

## 2. 推送到GitHub

先在GitHub创建一个空仓库，不要让GitHub预先生成README或`.gitignore`，然后在本地执行：

```powershell
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

`<YOUR_GITHUB_REPOSITORY_URL>`需要替换为你创建的仓库地址。不要把API Key放入remote URL、提交记录或仓库文件。

## 3. Render配置

在Render创建Web Service并连接GitHub仓库：

| 配置项 | 值 |
|---|---|
| Runtime | Node |
| Node版本 | `>=24 <25`（由`package.json`声明） |
| Root Directory | 留空或`.`（MakerFlow-AI是独立仓库根时） |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

如果未来选择把整个学习计划目录作为一个仓库，Render的Root Directory才应填写`projects/MakerFlow-AI`。当前不建议这样初始化，因为会扩大提交范围。

## 4. 环境变量

在Render服务的Environment设置中新增：

```text
DEEPSEEK_API_KEY=<在Render控制台填写真实值>
```

不要把真实值写进：

- GitHub仓库；
- Render配置文件；
- `.env.example`；
- Browser代码；
- 日志、测试fixture或Eval报告。

服务端只通过`process.env.DEEPSEEK_API_KEY`读取密钥。缺少密钥时Model请求会Fail Closed；`GET /health`仍只返回公共健康状态。

Render会提供`PORT`。服务使用`process.env.PORT || 8000`并监听`0.0.0.0`；本地默认仍可通过`http://localhost:8000/`访问。

## 5. 部署后验证

部署完成后依次验证：

1. 访问`https://<render-service-domain>/health`，应返回：

   ```json
   {"ok":true}
   ```

2. 打开Render公开URL，确认静态Prototype正常加载。
3. 用一条非敏感测试输入验证`brief.extract`请求。
4. 检查浏览器Network与页面内容，确认没有API Key、Authorization header或内部错误栈被返回。
5. 检查Render日志，确认日志中没有凭据内容。

## 6. 发布前检查

每次Push前建议执行：

```powershell
npm test
git status --ignored
git diff --cached
```

任何真实DeepSeek raw artifact都应保留在本地ignored目录，不进入GitHub。
