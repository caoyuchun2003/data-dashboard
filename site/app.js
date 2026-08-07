// 开源热度看板:读取 data/*.json 渲染统计卡片、图表与榜单
(function () {
  'use strict';

  var COLORS = ['#3fd0ff', '#8b7bff', '#3fe08f', '#ffc857', '#ff7eb6', '#6ee7d8', '#c3b0ff', '#93c5fd'];
  var AXIS = { color: '#7d8ab0', fontFamily: 'Menlo, monospace', fontSize: 11 };
  var SPLIT = { lineStyle: { color: 'rgba(80,120,220,0.12)' } };
  var LANG_LABEL = { all: '今日全语言榜', python: 'Python 榜', javascript: 'JavaScript 榜', go: 'Go 榜' };

  var charts = [];
  var byList = {};

  function el(id) { return document.getElementById(id); }

  function fmt(n) {
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function mapRepos(list, key) {
    return (list || []).map(function (r) {
      return {
        repo: r.name,
        url: r.url,
        desc: r.description,
        lang: r.language || '其他',
        stars: r.stars || 0,
        stars_today: r.stars_today || 0,
        list: key,
      };
    });
  }

  function formatUpdated(iso) {
    if (!iso) return '更新时间:—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '更新时间:' + iso;
    try {
      var local = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
      return '更新时间:' + local + ' (北京时间)';
    } catch (e) {
      return '更新时间:' + iso.replace('T', ' ').replace('Z', ' UTC');
    }
  }

  function setFreshness(iso) {
    var node = el('fresh');
    if (!iso) {
      node.textContent = '数据状态未知';
      node.className = 'fresh stale';
      return;
    }
    var ageH = (Date.now() - new Date(iso).getTime()) / 3600000;
    if (ageH < 8) {
      node.textContent = '数据新鲜';
      node.className = 'fresh ok';
    } else if (ageH < 24) {
      node.textContent = '约 ' + Math.round(ageH) + ' 小时前';
      node.className = 'fresh mid';
    } else {
      node.textContent = '已超过一天未更新';
      node.className = 'fresh stale';
    }
  }

  function statCard(label, value, sub) {
    return (
      '<div class="stat"><span class="label">' + label +
      '</span><span class="value">' + value +
      '</span><span class="sub">' + (sub || '') + '</span></div>'
    );
  }

  function renderStats(repos, stories) {
    var todayStars = repos.reduce(function (s, r) { return s + (r.stars_today || 0); }, 0);
    var langs = {};
    repos.forEach(function (r) { langs[r.lang] = 1; });
    var avgScore = stories.length
      ? Math.round(stories.reduce(function (s, x) { return s + x.score; }, 0) / stories.length)
      : 0;
    el('stats').innerHTML =
      statCard('TRENDING 仓库', fmt(repos.length), '全语言日榜') +
      statCard('今日新增 STAR', fmt(todayStars), '全语言榜合计(去重)') +
      statCard('上榜语言', fmt(Object.keys(langs).length), '含 ' + Object.keys(langs).slice(0, 3).join(' / ')) +
      statCard('HN 平均热度', fmt(avgScore), 'Top ' + stories.length + ' 平均分');
  }

  function renderTop(repos) {
    var seen = {};
    var top = repos
      .filter(function (r) { if (seen[r.repo]) return false; seen[r.repo] = 1; return true; })
      .sort(function (a, b) { return b.stars_today - a.stars_today; })
      .slice(0, 10)
      .reverse();
    var chart = echarts.init(el('chart-top'));
    chart.setOption({
      grid: { left: 8, right: 46, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#141c34',
        borderColor: 'rgba(80,120,220,0.4)',
        textStyle: { color: '#dfe7ff', fontSize: 12 },
      },
      xAxis: { type: 'value', axisLabel: AXIS, splitLine: SPLIT },
      yAxis: {
        type: 'category',
        data: top.map(function (r) { return r.repo.split('/')[1] || r.repo; }),
        axisLabel: AXIS,
        axisLine: { lineStyle: { color: 'rgba(80,120,220,0.3)' } },
      },
      series: [{
        type: 'bar',
        data: top.map(function (r) { return r.stars_today; }),
        barWidth: 14,
        label: {
          show: true, position: 'right', color: '#3fe08f',
          fontFamily: 'Menlo, monospace', fontSize: 11,
          formatter: '+{c}',
        },
        itemStyle: {
          borderRadius: [0, 7, 7, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#2b5cff' },
            { offset: 1, color: '#3fd0ff' },
          ]),
        },
      }],
    });
    return chart;
  }

  function renderLang(repos) {
    var count = {};
    repos.forEach(function (r) { count[r.lang] = (count[r.lang] || 0) + 1; });
    var data = Object.keys(count)
      .map(function (k) { return { name: k, value: count[k] }; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, 8);
    var chart = echarts.init(el('chart-lang'));
    chart.setOption({
      color: COLORS,
      tooltip: {
        backgroundColor: '#141c34',
        borderColor: 'rgba(80,120,220,0.4)',
        textStyle: { color: '#dfe7ff', fontSize: 12 },
      },
      series: [{
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '50%'],
        itemStyle: { borderColor: '#0a0f1e', borderWidth: 2 },
        label: { color: '#7d8ab0', fontSize: 11, formatter: '{b} {c}' },
        data: data,
      }],
    });
    return chart;
  }

  function renderHn(stories) {
    var buckets = [0, 0, 0, 0, 0];
    var names = ['<100', '100-200', '200-400', '400-800', '800+'];
    stories.forEach(function (s) {
      if (s.score < 100) buckets[0]++;
      else if (s.score < 200) buckets[1]++;
      else if (s.score < 400) buckets[2]++;
      else if (s.score < 800) buckets[3]++;
      else buckets[4]++;
    });
    var chart = echarts.init(el('chart-hn'));
    chart.setOption({
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#141c34',
        borderColor: 'rgba(80,120,220,0.4)',
        textStyle: { color: '#dfe7ff', fontSize: 12 },
      },
      xAxis: { type: 'category', data: names, axisLabel: AXIS },
      yAxis: { type: 'value', minInterval: 1, axisLabel: AXIS, splitLine: SPLIT },
      series: [{
        type: 'bar',
        data: buckets,
        barWidth: 22,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8b7bff' },
            { offset: 1, color: 'rgba(139,123,255,0.25)' },
          ]),
        },
      }],
    });
    return chart;
  }

  function renderTrendingTable(lang) {
    var repos = byList[lang] || byList.all || [];
    var label = el('tbl-trending-label');
    if (label) label.textContent = LANG_LABEL[lang] || lang;
    el('tbl-trending').innerHTML = repos
      .slice(0, 25)
      .map(function (r, i) {
        return (
          '<a class="row" href="' + esc(r.url) + '" target="_blank" rel="noopener">' +
          '<span class="rank">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="main"><span class="name">' + esc(r.repo) +
          '</span><span class="desc">' + esc(r.desc || r.lang) +
          (r.lang ? ' · ' + esc(r.lang) : '') + '</span></span>' +
          '<span class="num">★ ' + fmt(r.stars) + ' <em style="color:#ffc857;font-style:normal">+' +
          fmt(r.stars_today) + '</em></span></a>'
        );
      })
      .join('') || '<p class="empty">该语言暂无数据</p>';
  }

  function renderHnTable(stories) {
    el('tbl-hn').innerHTML = stories
      .slice(0, 25)
      .map(function (s) {
        var href = s.url || s.comments_url || '#';
        var cmt = s.comments_url
          ? '<a class="cmt" href="' + esc(s.comments_url) + '" target="_blank" rel="noopener">' +
            s.comments + ' 评论</a>'
          : (s.comments + ' 评论');
        return (
          '<div class="row hn-row">' +
          '<span class="rank">' + String(s.rank).padStart(2, '0') + '</span>' +
          '<span class="main">' +
          '<a class="name" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a>' +
          '<span class="desc">by ' + esc(s.by) + ' · ' + cmt + '</span></span>' +
          '<span class="num">▲ ' + s.score + '</span></div>'
        );
      })
      .join('');
  }

  function bindTabs() {
    var tabs = el('lang-tabs');
    if (!tabs) return;
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('on'); });
      btn.classList.add('on');
      renderTrendingTable(btn.getAttribute('data-lang'));
    });
  }

  Promise.all([
    fetch('./data/trending.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
    fetch('./data/hn.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
  ])
    .then(function (res) {
      var trending = res[0];
      var hn = res[1];
      var languages = trending.languages || {};
      byList = {};
      Object.keys(languages).forEach(function (key) {
        byList[key] = mapRepos(languages[key], key);
      });
      // 图表与统计只用 all,避免多语言榜重复累加
      var allRepos = byList.all || [];
      el('updated').textContent = formatUpdated(trending.updated_at);
      setFreshness(trending.updated_at);
      renderStats(allRepos, hn.stories || []);
      charts = [renderTop(allRepos), renderLang(allRepos), renderHn(hn.stories || [])];
      renderTrendingTable('all');
      renderHnTable(hn.stories || []);
      bindTabs();
      window.addEventListener('resize', function () {
        charts.forEach(function (c) { c.resize(); });
      });
    })
    .catch(function (err) {
      el('stats').innerHTML =
        '<div class="stat"><span class="label">数据加载失败</span><span class="sub">' +
        esc(err.message) + ' — 请先运行 python3 crawler/fetch_data.py</span></div>';
      el('fresh').textContent = '加载失败';
      el('fresh').className = 'fresh stale';
    });
})();
