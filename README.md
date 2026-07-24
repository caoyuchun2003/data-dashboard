# data-dashboard · 开源热度看板

GitHub Trending + Hacker News 实时热度大屏。定时抓取、自动更新、**零服务器成本**。
作品集定位:展示 **爬虫 / 定时任务 / 数据可视化** 能力。

## 架构

```
GitHub Actions(cron 每 6 小时)
   → python3 crawler/fetch_data.py(纯标准库,零依赖)
      ├─ 抓 GitHub Trending(全语言 + Python/JS/Go,HTML 解析)
      └─ 抓 Hacker News Top 30(官方 API)
   → 提交 site/data/*.json 回仓库
   → 触发 GitHub Pages 重新发布
浏览器(data.yuchuntest.com)→ 静态大屏(ECharts 本地 vendored)fetch JSON 渲染
```

亮点:整条管线没有一台服务器——Actions 当定时器和爬虫机,Pages 当托管,数据即代码(JSON 进 Git,天然有历史版本)。

## 本地运行

```bash
python3 crawler/fetch_data.py        # 抓数据(约 30 秒)
cd site && python3 -m http.server 8899
# 打开 http://127.0.0.1:8899
```

## 部署

1. 推 GitHub 仓库,Settings → Pages → Source 选 GitHub Actions
2. Actions 页手动跑一次 `Update dashboard data` 生成首份数据
3. DNS:百度云解析加 `data` CNAME → `caoyuchun2003.github.io`
4. Pages → Custom domain 填 `data.yuchuntest.com` → Enforce HTTPS

## 待补清单

- `site/vendor/echarts.min.js` 若缺失:`curl -L https://registry.npmjs.org/echarts/-/echarts-5.5.1.tgz | tar xz package/dist/echarts.min.js -O > site/vendor/echarts.min.js`
- GitHub Trending 页面结构若改版,调整 `crawler/fetch_data.py::parse_trending` 的正则
