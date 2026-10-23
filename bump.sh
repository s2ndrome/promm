#!/bin/sh
# 사이트 파일을 고친 뒤 실행: 휴대폰/브라우저가 예전 CSS·JS 를 쓰지 않도록 버전 번호를 바꿈
V=$(date +%Y%m%d%H%M)
sed -i -E "s/(style\.css|world-default\.js|agent-cards\.js|app\.js|world\.js|aegis3d\.js|admin\.js|bgm\.js|auth\.js)(\?v=[0-9]+)?\"/\1?v=$V\"/g" index.html
echo "version $V"
