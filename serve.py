#!/usr/bin/env python3
"""Локальный сервер для Mockup Studio.

Штатный http.server не умеет HTTP Range, а без него браузер не может
перематывать видео: перемотка и сборка полосы кадров ломаются. Поэтому
Range обрабатывается здесь вручную.
"""
import http.server
import os
import re
import socketserver
import sys
import threading
import webbrowser

PORT = 8787
NO_OPEN = '--no-open' in sys.argv
for a in sys.argv[1:]:
    if a.isdigit():
        PORT = int(a)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
RANGE_RE = re.compile(r'bytes=(\d*)-(\d*)')


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        rng = self.headers.get('Range')
        if not rng:
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()

        m = RANGE_RE.match(rng.strip())
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        first, last = m.group(1), m.group(2)
        if first == '':                      # суффиксный диапазон: bytes=-500
            length = int(last or 0)
            start = max(0, size - length)
            end = size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None

        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, src, dst):
        remaining = getattr(self, '_remaining', None)
        if remaining is None:
            return super().copyfile(src, dst)
        self._remaining = None
        while remaining > 0:
            chunk = src.read(min(64 * 1024, remaining))
            if not chunk:
                break
            dst.write(chunk)
            remaining -= len(chunk)

    def log_message(self, *a):
        pass


# Потоковый сервер: страница держит несколько запросов к видео одновременно
# (основной проигрыватель плюс извлечение кадров для полосы).
class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


for p in range(PORT, PORT + 20):
    try:
        httpd = S(('127.0.0.1', p), H)
        break
    except OSError:
        continue
else:
    sys.exit('Не нашёл свободный порт')

url = f'http://127.0.0.1:{p}/'
print(f'\n  Mockup Studio → {url}\n  Останов: Ctrl+C\n')
if not NO_OPEN:
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print('\nПока!')
