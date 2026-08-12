#!/bin/bash
set -e
mkdir -p public
if [ -f index.html ]; then
  cp index.html public/index.html
else
  curl -fsSL 'https://raw.githubusercontent.com/laurimoyle/lusory/main/index%20(2).html' -o public/index.html
fi
python3 - <<'PYEOF'
import io
p='public/index.html'
s=io.open(p,encoding='utf-8').read()
s=s.replace('padding:.85rem 0 .95rem;border-bottom','padding-top:.85rem;padding-right:0;padding-bottom:.95rem;border-bottom')
io.open(p,'w',encoding='utf-8').write(s)
print('bytes',len(s.encode()))
PYEOF
ls -la public
