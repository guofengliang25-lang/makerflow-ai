# MakerFlow Vercel 部署说明

MakerFlow 当前使用同一仓库同时发布静态 Prototype 与 Node Functions。部署适配不改变本地 `server.mjs`、产品状态规则、Prompt 或 Provider 行为。

## Architecture

```text
Browser
  → same-origin /api/*
  → Vercel Node Function
  → existing MakerFlow executor
  → Provider Adapter
  → DeepSeek Experimental Provider
```

Vercel函数复用仓库现有的三个executor：

- `providers/brief-extract-executor.mjs`
- `providers/brief-ask-missing-executor.mjs`
- `providers/plan-generate-executor.mjs`

浏览器继续使用相对同源URL，不直接访问DeepSeek。

## Vercel Routes

| Public route | Implementation |
|---|---|
| `/` | `prototype/index.html`（`prototype`是静态输出目录） |
| `/api/skills/brief.extract` | `api/skills/[skill].mjs` |
| `/api/skills/brief.ask_missing` | `api/skills/[skill].mjs` |
| `/api/skills/plan.generate` | `api/skills/[skill].mjs` |
| `/health` | rewrite到`/api/health` |

## Import GitHub Project

1. 登录Vercel Dashboard。
2. 选择 **Add New → Project**。
3. 导入GitHub仓库 `guofengliang25-lang/makerflow-ai`。
4. 保持 **Root Directory** 为仓库根目录 `.`。
5. Framework Preset选择 **Other**（若Vercel已自动识别为Other则不改）。
6. 不需要填写自定义Build Command；静态目录由`vercel.json`中的`outputDirectory: prototype`指定。
7. 在 **Environment Variables** 中添加变量名 `DEEPSEEK_API_KEY`，由Human在Vercel Dashboard填写真实值。
8. 将变量至少应用到Production；若要测试Preview Deployment，也需要显式应用到Preview。
9. 点击 **Deploy**。

不要把API Key填入`vercel.json`、源码、GitHub文件、Build Command或公开日志。

## Deployment Verification

部署完成后检查：

1. 打开 `https://<project>.vercel.app/`，应显示MakerFlow Demo。
2. 打开 `https://<project>.vercel.app/health`，应返回：

   ```json
   {"ok":true}
   ```

3. 在普通Demo完成一次非敏感的`brief.extract`请求。
4. 确认Provider失败时UI停留在当前步骤且不载入fixture。
5. 在浏览器Network响应中确认不存在API Key、Authorization header或内部stack trace。

## Local Compatibility

本地运行方式保持不变：

```powershell
node --env-file=.env server.mjs
```

或在环境变量已经由当前Shell提供时运行：

```powershell
npm start
```

默认地址：

- Demo：`http://localhost:8000/`
- QA：`http://localhost:8000/?qa=1`
- Health：`http://localhost:8000/health`

## Optional Local Vercel Verification

若本机已经安装Vercel CLI，可运行：

```powershell
vercel dev
```

当前仓库不把Vercel CLI加入产品依赖，也不要求全局安装后才能使用本地MakerFlow Demo。
