#!/bin/zsh
# CyberCycho 每日内容更新 — 由 launchd (com.cybercycho.daily-update) 每天 07:00 调起
set -u

export PATH="$HOME/.hermes/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
# launchd 环境没有系统代理变量，外网请求走 Clash Verge
export https_proxy="http://127.0.0.1:7897" http_proxy="http://127.0.0.1:7897"

SITE_DIR="$HOME/ClaudeForMac/cybercychoWebsite"
LOG_DIR="$SITE_DIR/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/update-$(date +%Y%m%d).log"

cd "$SITE_DIR" || exit 1

claude -p "$(cat <<'PROMPT'
你在 CyberCycho 独立游戏新闻静态站的仓库根目录（GitHub Pages 站点 https://cybercychogames.github.io/CyberCycho/ ，远程 cybercychogames/CyberCycho，main 分支）。执行每日内容更新，今天日期用 date 命令确认：

1. 用 WebSearch 搜索最近 1-2 天的 itch.io 平台新闻（促销/bundle/知名 devlog）和独立游戏发售/产品新闻，挑 2-4 条真正有信息量的新条目。
2. 更新 index.html：ITCH.IO NEWS 和 INDIE GAME RELEASES 两个板块。新条目加在各板块顶部，过期条目（已结束的促销、上月发售表）移除或归档；保持现有 HTML 结构和 class 不变。严禁任何 placeholder / lorem / coming soon 内容；每条新闻必须带真实来源链接（target="_blank" rel="noopener"）。
3. 配图规则——抓图优先于生图：
   - 游戏图：Steam storesearch API 搜 appid，再用 appdetails API 拿 header_image 精确地址下载（不要直接拼 CDN 路径，新游戏会 404）。
   - 新闻图：抓媒体页面的 og:image（Shacknews 等可以 curl；itch.io 全域名被 Cloudflare 拦，403 就放弃抓取）。
   - 抓不到的用 codex 生图兜底：codex exec --full-auto，让它写 Pillow 脚本生成 920x430 复古像素横幅，配色必须是站点变量：bg #0a0a12、cyan #2effe0、pink #ff2e88、yellow #f4e04d，带扫描线。
   - 图片存 assets/img/，jpg 用 sips --resampleWidth 920 -s formatOptions 80 压缩。
4. git add -A && git commit（消息写清当天更新内容）&& git push origin main。
5. 轮询 gh api repos/cybercychogames/CyberCycho/pages/builds/latest 直到 status 为 built，再 curl 线上首页确认 200 且包含新条目关键词。
6. 如果当天没有值得更新的新闻，不要硬凑，直接退出不提交。
PROMPT
)" --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch" >> "$LOG" 2>&1

echo "=== exit $? at $(date) ===" >> "$LOG"
