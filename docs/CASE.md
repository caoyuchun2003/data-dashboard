# 开源热度看板 · 案例说明

| 项 | 内容 |
| --- | --- |
| 场景 | 公开数据源定时抓取 + 热度大屏，零常驻服务器 |
| 演示地址 | https://data.yuchuntest.com/ |
| 案例页 | https://yuchuntest.com/cases/data.html |
| 工期参考 | 爬虫 + 大屏约 3～5 天；定时管线与域名约再 1 天 |
| 技术栈 | Python 标准库爬虫 · GitHub Actions cron · ECharts · GitHub Pages |
| 成本说明 | Actions 当定时器与爬虫机，Pages 托管静态页；数据 JSON 进 Git 自带历史 |

## 功能清单

- GitHub Trending（全语言 + Python / JS / Go）定时抓取
- Hacker News Top 30（官方 API）
- ECharts 深色大屏：榜单 + 语言分布等图表
- 每 6 小时自动更新并重新发布

## 架构一句

`Actions cron → fetch_data.py → 提交 JSON → Pages 发布 → 浏览器拉 JSON 渲染`

## 明确未做

登录后台、付费数据源、实时 WebSocket 推送、复杂告警体系。

## 接单话术一句

「定时爬公开数据 + 可视化大屏，整条管线可以挂在 GitHub Actions / Pages 上，适合内部看板或公开热度页。」
