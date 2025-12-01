/**
 * Uptime-Status Worker (Public Version)
 * * 使用说明:
 * 1. 替换下方 API_KEYS 数组中的内容为您自己的 UptimeRobot API Key。
 * 2. 部署到 Cloudflare Workers。
 */

// ================= 后端配置 (用户不可见) =================

const API_KEYS = [
  'ur_YOUR_API_KEY_HERE' // <--- 请在此处填入你的 UptimeRobot Read-Only API Key
];

// ================= 公开配置 (前端可见) =================

const PUBLIC_CONFIG = {
  SiteName: '系统状态监控', // 你的网站名称
  CountDays: 30,           // 监控天数
  ShowLink: false,         // 是否显示被检测站点的详细链接
  Navi: [
    { text: 'GitHub', url: 'https://github.com/your-username/repo' }, // 修改为你的链接
    { text: 'Home', url: '/' }
  ]
};

// ================= WORKER 逻辑 =================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/status') {
      return handleApiStatus();
    }

    return handleHtml();
  }
};

async function handleApiStatus() {
  const days = PUBLIC_CONFIG.CountDays;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dates = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    dates.push(date);
  }

  const ranges = dates.map(date => {
    const start = Math.floor(date.getTime() / 1000);
    const end = start + 86400;
    return `${start}_${end}`;
  });

  const logsStart = Math.floor(dates[dates.length - 1].getTime() / 1000);
  const logsEnd = Math.floor(dates[0].getTime() / 1000) + 86400;
  ranges.push(`${logsStart}_${logsEnd}`);

  const customUptimeRanges = ranges.join('-');

  const fetchMonitor = async (key) => {
    // 检查是否修改了默认的占位符
    if (key === 'ur_YOUR_API_KEY_HERE') {
        return { stat: 'fail', error: { message: '请在 Worker 代码中填入正确的 API Key' } };
    }

    const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        api_key: key,
        format: 'json',
        logs: 1,
        log_types: '1-2',
        logs_start_date: logsStart,
        logs_end_date: logsEnd,
        custom_uptime_ranges: customUptimeRanges
      })
    });
    return response.json();
  };

  try {
    const results = await Promise.all(API_KEYS.map(fetchMonitor));
    const allMonitors = [];
    
    for (const res of results) {
      if (res.stat === 'ok') {
        allMonitors.push(...res.monitors);
      } else {
        console.error('API Error:', res.error);
      }
    }

    return new Response(JSON.stringify(allMonitors), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

function handleHtml() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PUBLIC_CONFIG.SiteName}</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
  <script src="https://unpkg.com/dayjs@1.11.3/dayjs.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 0; color: #333; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .header h1 { font-size: 24px; font-weight: 400; margin: 0; }
    .nav a { margin-left: 15px; text-decoration: none; color: #666; font-size: 14px; }
    .monitor-card { background: #fff; border-radius: 6px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .monitor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .monitor-title { font-size: 18px; font-weight: 500; display: flex; align-items: center; }
    .monitor-url { font-size: 12px; color: #999; margin-left: 10px; text-decoration: none; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px; }
    .status-ok { background: #e6f7ff; color: #1890ff; }
    .status-down { background: #fff1f0; color: #f5222d; }
    .status-unknow { background: #f5f5f5; color: #d9d9d9; }
    .meta-info { font-size: 13px; color: #666; margin-bottom: 15px; display: flex; justify-content: space-between; }
    .meta-ok { color: #52c41a; }
    .uptime-bar { display: flex; height: 30px; gap: 2px; margin-top: 10px; }
    .bar-unit { flex: 1; border-radius: 2px; position: relative; cursor: pointer; transition: opacity 0.2s; }
    .bar-unit:hover { opacity: 0.8; }
    .bar-ok { background-color: #52c41a; }
    .bar-down { background-color: #f5222d; }
    .bar-none { background-color: #f0f0f0; }
    .tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 12px; white-space: nowrap; display: none; z-index: 10; margin-bottom: 5px; }
    .bar-unit:hover .tooltip { display: block; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 13px; }
    .loading { text-align: center; padding: 50px; color: #666; }
    @media (max-width: 600px) { .header { flex-direction: column; align-items: flex-start; gap: 10px; } .nav { margin-left: -15px; } .meta-info { flex-direction: column; gap: 5px; } }
  </style>
</head>
<body>
  <div id="app" class="container">
    <div class="header">
      <h1>${PUBLIC_CONFIG.SiteName}</h1>
      <div class="nav">
        <a v-for="item in navi" :href="item.url" target="_blank">{{ item.text }}</a>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else>
      <div v-for="monitor in monitors" :key="monitor.id" class="monitor-card">
        <div class="monitor-header">
          <div class="monitor-title">
            {{ monitor.name }}
            <a v-if="showLink" :href="monitor.url" target="_blank" class="monitor-url">{{ monitor.url }}</a>
            <span :class="['status-badge', 'status-' + monitor.statusClass]">
              {{ monitor.statusText }}
            </span>
          </div>
        </div>
        
        <div class="meta-info">
          <div>
            <span :class="{'meta-ok': monitor.average >= 90}">{{ monitor.average }}%</span> 可用率 (最近 ${PUBLIC_CONFIG.CountDays} 天)
          </div>
          <div>
            ${PUBLIC_CONFIG.CountDays}天内故障 {{ monitor.total.times }} 次，累计 {{ (monitor.total.duration / 3600).toFixed(2) }} 小时
          </div>
        </div>

        <div class="uptime-bar">
          <div v-for="(day, index) in monitor.daily" :key="index" 
               :class="['bar-unit', getDayStatus(day)]">
             <div class="tooltip">{{ getDayTitle(day) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Powered by Cloudflare Workers</p>
    </div>
  </div>

  <script>
    const { createApp, ref, onMounted } = Vue;
    const Config = ${JSON.stringify(PUBLIC_CONFIG)};

    createApp({
      setup() {
        const monitors = ref([]);
        const loading = ref(true);
        const navi = Config.Navi;
        const showLink = Config.ShowLink;

        const loadData = async () => {
          try {
            const response = await axios.get('/api/status');
            const data = response.data;
            
            monitors.value = data.map(processMonitor);
            loading.value = false;
          } catch (e) {
            console.error(e);
            loading.value = false;
          }
        };

        const processMonitor = (monitor) => {
          const rangesArr = monitor.custom_uptime_ranges.split('-');
          const average = parseFloat(rangesArr.pop()).toFixed(2);
          const daily = [];
          const map = {};
          
          const days = Config.CountDays;
          const today = dayjs(new Date().setHours(0, 0, 0, 0));
          
          for (let d = 0; d < days; d++) {
            const date = today.subtract(d, 'day');
            const dateStr = date.format('YYYYMMDD');
            map[dateStr] = d; 
            daily[d] = {
              date: date,
              uptime: parseFloat(rangesArr[d]),
              down: { times: 0, duration: 0 }
            };
          }

          const total = { times: 0, duration: 0 };

          if (monitor.logs) {
            monitor.logs.forEach(log => {
              if (log.type === 1) {
                const dateStr = dayjs.unix(log.datetime).format('YYYYMMDD');
                if (map[dateStr] !== undefined) {
                  const idx = map[dateStr];
                  daily[idx].down.duration += log.duration;
                  daily[idx].down.times += 1;
                }
                total.times += 1;
                total.duration += log.duration;
              }
            });
          }

          let statusClass = 'unknow';
          let statusText = '未知状态';
          if (monitor.status === 2) {
             statusClass = 'ok';
             statusText = '运行正常';
          }
          if (monitor.status === 9) {
             statusClass = 'down';
             statusText = '无法访问';
          }

          return {
            id: monitor.id,
            name: monitor.friendly_name,
            url: monitor.url,
            average: average,
            daily: daily.reverse(),
            total: total,
            statusClass: statusClass,
            statusText: statusText
          };
        };

        const getDayStatus = (day) => {
          if (day.uptime >= 100) return 'bar-ok';
          if (day.uptime <= 0 && day.down.times === 0) return 'bar-none';
          return 'bar-down';
        };

        const getDayTitle = (day) => {
          const date = dayjs(day.date).format('YYYY-MM-DD');
          if (day.down.times > 0) {
            return \`\${date}: 故障 \${day.down.times} 次, \${(day.down.duration / 60).toFixed(0)} 分钟\`;
          }
          return \`\${date}: 可用率 \${day.uptime}%\`;
        };

        onMounted(() => {
          loadData();
        });

        return { monitors, loading, navi, showLink, getDayStatus, getDayTitle };
      }
    }).mount('#app');
  </script>
</body>
</html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
