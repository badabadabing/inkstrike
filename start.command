#!/bin/bash
# 双击启动 INK STRIKE 本地服务并打开浏览器
cd "$(dirname "$0")"
IP=$(ipconfig getifaddr en0 2>/dev/null)
echo "电脑: http://localhost:8765"
[ -n "$IP" ] && echo "手机(同一 Wi-Fi): http://$IP:8765"
(sleep 1; open "http://localhost:8765") &
python3 -m http.server 8765
