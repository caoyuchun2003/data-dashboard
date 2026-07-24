"""开源热度看板数据抓取:GitHub Trending(HTML)+ Hacker News(官方 API)。

零第三方依赖(仅标准库),系统 python3 或 GitHub Actions 直接运行:
    python3 crawler/fetch_data.py
输出 site/data/trending.json 与 site/data/hn.json,供静态大屏 fetch 渲染。
"""
import json
import os
import re
import time
import urllib.request
from datetime import datetime, timezone

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "site", "data")
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    " (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
LANGUAGES = ["all", "python", "javascript", "go"]


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def http_get(url: str, retries: int = 3) -> str:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"请求失败 {url}: {last}")


def strip_tags(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def parse_int(text: str) -> int:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else 0


def parse_trending(html: str) -> list:
    """按 Box-row 分块解析 Trending 页面,输出与大屏一致的字段。"""
    repos = []
    blocks = re.split(r'<article class="Box-row"', html)[1:]
    for rank, block in enumerate(blocks, 1):
        m = re.search(r'<h2[^>]*>.*?href="/([^"]+)"', block, re.S)
        if not m:
            continue
        full_name = m.group(1).strip()
        desc_m = re.search(r"<p[^>]*>(.*?)</p>", block, re.S)
        lang_m = re.search(
            r'<span itemprop="programmingLanguage">([^<]+)</span>', block
        )
        stars_m = re.search(
            r'href="/%s/stargazers"[^>]*>(.*?)</a>' % re.escape(full_name), block, re.S
        )
        forks_m = re.search(
            r'href="/%s/forks"[^>]*>(.*?)</a>' % re.escape(full_name), block, re.S
        )
        today_m = re.search(r"([\d,]+)\s+stars?\s+(today|this week)", block)
        repos.append(
            {
                "rank": rank,
                "name": full_name,
                "url": f"https://github.com/{full_name}",
                "description": strip_tags(desc_m.group(1))[:200] if desc_m else "",
                "language": lang_m.group(1).strip() if lang_m else "其他",
                "stars": parse_int(strip_tags(stars_m.group(1))) if stars_m else 0,
                "forks": parse_int(strip_tags(forks_m.group(1))) if forks_m else 0,
                "stars_today": parse_int(today_m.group(1)) if today_m else 0,
            }
        )
    return repos


def fetch_trending() -> dict:
    languages = {}
    for lang in LANGUAGES:
        url = "https://github.com/trending"
        if lang != "all":
            url += f"/{lang}"
        url += "?since=daily"
        parsed = parse_trending(http_get(url))
        print(f"trending[{lang}]: {len(parsed)} repos")
        languages[lang] = parsed
        time.sleep(1)
    return {"updated_at": now_iso(), "since": "daily", "languages": languages}


def fetch_hn(top_n: int = 30) -> dict:
    ids = json.loads(
        http_get("https://hacker-news.firebaseio.com/v0/topstories.json")
    )[:top_n]
    items = []
    for i, sid in enumerate(ids):
        try:
            item = json.loads(
                http_get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
            )
        except RuntimeError as e:
            print(f"hn item {sid} 失败,跳过: {e}")
            continue
        if not item or item.get("type") != "story":
            continue
        items.append(
            {
                "id": sid,
                "title": item.get("title", ""),
                "url": item.get("url")
                or f"https://news.ycombinator.com/item?id={sid}",
                "comments_url": f"https://news.ycombinator.com/item?id={sid}",
                "score": item.get("score", 0),
                "by": item.get("by", ""),
                "comments": item.get("descendants", 0),
                "time": item.get("time", 0),
                "rank": i + 1,
            }
        )
    print(f"hn: {len(items)} stories")
    return {"updated_at": now_iso(), "stories": items}


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    trending = fetch_trending()
    with open(os.path.join(OUT_DIR, "trending.json"), "w", encoding="utf-8") as f:
        json.dump(trending, f, ensure_ascii=False, indent=1)
    hn = fetch_hn()
    with open(os.path.join(OUT_DIR, "hn.json"), "w", encoding="utf-8") as f:
        json.dump(hn, f, ensure_ascii=False, indent=1)
    print("done:", OUT_DIR)


if __name__ == "__main__":
    main()
