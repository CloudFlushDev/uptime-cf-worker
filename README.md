# Uptime Status on Cloudflare Workers

这是一个基于 **Cloudflare Workers** 的轻量级在线状态监控面板。它作为 UptimeRobot API 的安全代理，并直接渲染一个美观的 Vue.js 前端页面。无需服务器，零成本部署。

## ✨ 特性

- **零成本**：完全运行在 Cloudflare Workers 免费额度内。
- **安全性**：作为中间件代理请求，向前端隐藏真实的 UptimeRobot API Key。
- **美观的数据展示**：包含最近 30 天的可用率状态条（类似 GitHub 贡献图）。
- **简单配置**：只需修改一个文件即可完成配置，无需复杂的环境变量设置。
- **响应式设计**：完美适配 PC 和移动端。

## 🔋 部署方法

### 1. 获取 API Key
1. 注册并登录 [UptimeRobot](https://uptimerobot.com/)。
2. 创建你的监控项（Monitor）。
3. 前往 `My Settings` -> `API Settings`。
4. 在 **Monitor-Specific API Keys** 或 **Read-Only API Key** 处生成密钥。
   > ⚠️ **注意**：为了安全起见，请务必使用 **Read-Only (只读)** 类型的 API Key。

### 2. 创建 Cloudflare Worker
1. 登录 Cloudflare Dashboard，进入 **Workers & Pages**。
2. 点击 **Create Application** -> **Create Worker**。
3. 命名你的 Worker（例如 `uptime-status`），然后点击 **Deploy**。

### 3. 部署代码
1. 点击 **Edit code** 进入在线编辑器。
2. 将本项目中的 `worker.js` 代码完整复制并覆盖编辑器中的默认代码。
3. **修改配置**（重要）：
   在代码顶部的 `API_KEYS` 数组中填入你在第 1 步获取的 Key：
   ```javascript
   const API_KEYS = [
     'ur12345678-your-read-only-key-here' 
   ];
   ```
4. 点击右上角的 **Deploy** 保存并发布。

## ⚙️ 个性化配置

在代码顶部的 `PUBLIC_CONFIG` 区域，你可以修改页面显示的文字和链接：

```javascript
const PUBLIC_CONFIG = {
  SiteName: '我的系统状态',  // 网站标题
  CountDays: 30,            // 默认显示最近 30 天的数据
  ShowLink: false,          // 是否直接显示站点链接 (true/false)
  Navi: [
    { text: 'GitHub', url: '[https://github.com/yourname](https://github.com/yourname)' },
    { text: '首页', url: '/' }
  ]
};
```

## 致谢 (Credits)

本项目的前端设计灵感与核心逻辑深受以下开源项目的启发，特此致谢：

* **[yb/uptime-status](https://github.com/yb/uptime-status)**: A pretty dashboard of uptime status based on UptimeRobot API. 
    * 本项目的 UI 风格和数据处理逻辑大量参考了该项目的优秀设计。

## License

MIT License
