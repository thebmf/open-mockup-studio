#!/usr/bin/env python3
"""Локальный сервер для Mockup Studio.

Штатный http.server не умеет HTTP Range, а без него браузер не может
перематывать видео: перемотка и сборка полосы кадров ломаются. Поэтому
Range обрабатывается здесь вручную.

Плюс маршруты /render/* — офлайн-сборка mp4 из кадров, присланных
покадрово с фронта (см. renderOffline() в app.js): рисование кадра идёт
не в реальном времени, поэтому обычная запись через MediaRecorder на
медленной машине не роняет кадры, а тут их некому ронять вообще — кадры
просто копятся, пока ffmpeg их не съест.
"""
import atexit
import signal
import http.server
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import uuid
import webbrowser

PORT = 8787
NO_OPEN = '--no-open' in sys.argv
for a in sys.argv[1:]:
    if a.isdigit():
        PORT = int(a)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
RANGE_RE = re.compile(r'bytes=(\d*)-(\d*)')


# ===================================================== /render/* =========
# Реестр job'ов офлайн-рендера. Каждый job — временная папка
# (audio.wav, stderr.log, out.mp4) плюс запущенный процесс ffmpeg, в чей
# stdin по одному пишутся JPEG-кадры (image2pipe). Простой dict вместо
# базы: студия локальная, одновременных рендеров у одного человека почти
# никогда не бывает больше одного-двух.
RENDER_JOBS = {}
RENDER_REGISTRY_LOCK = threading.Lock()
JOB_TTL_SEC = 30 * 60   # старые папки подчищаем лениво, см. cleanup_old_jobs


def ffmpeg_path():
    # MOCKUP_NO_FFMPEG=1 — для проверок «а что если ffmpeg не стоит»,
    # без необходимости реально его удалять из системы.
    if os.environ.get('MOCKUP_NO_FFMPEG') == '1':
        return None
    return shutil.which('ffmpeg')


def ffmpeg_version():
    exe = ffmpeg_path()
    if not exe:
        return None
    try:
        out = subprocess.run([exe, '-version'], capture_output=True, text=True, timeout=5)
        first = (out.stdout or '').splitlines()[0] if out.stdout else ''
        return first.strip() or None
    except Exception:
        return None


def _get_job(jid):
    with RENDER_REGISTRY_LOCK:
        return RENDER_JOBS.get(jid)


def _drop_job(jid):
    with RENDER_REGISTRY_LOCK:
        job = RENDER_JOBS.pop(jid, None)
    if not job:
        return
    proc = job.get('proc')
    if proc is not None and proc.poll() is None:
        try:
            proc.kill()
        except Exception:
            pass
    sf = job.get('stderr_file')
    if sf:
        try:
            sf.close()
        except Exception:
            pass
    try:
        shutil.rmtree(job['dir'], ignore_errors=True)
    except Exception:
        pass


def cleanup_old_jobs():
    now = time.time()
    with RENDER_REGISTRY_LOCK:
        stale = [jid for jid, j in RENDER_JOBS.items() if now - j['created'] > JOB_TTL_SEC]
    for jid in stale:
        _drop_job(jid)
    # Готовый файл сознательно НЕ удаляется сразу после отдачи по /render/file:
    # если фронт ретраит GET (обрыв соединения, повторный клик) — файл всё ещё
    # на месте. Он просто доживает как все job'ы до общей чистки по TTL —
    # так меньше состояния и нечего гонять таймерами.


def _stderr_tail(job, n=4000):
    path = job.get('stderr_path')
    if not path or not os.path.exists(path):
        return ''
    try:
        with open(path, 'rb') as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - n))
            return f.read().decode('utf-8', 'replace')
    except Exception:
        return ''



def _shutdown_jobs():
    """При остановке сервера убиваем незавершённые ffmpeg и сносим папки
    job'ов: иначе они переживают процесс и копятся в TMPDIR (ленивая
    чистка по TTL работает только внутри живого сервера)."""
    try:
        for job in list(RENDER_JOBS.values()):
            proc = job.get('proc')
            try:
                if proc and proc.poll() is None:
                    proc.kill()
            except Exception:
                pass
            try:
                shutil.rmtree(job.get('dir', ''), ignore_errors=True)
            except Exception:
                pass
    except Exception:
        pass


atexit.register(_shutdown_jobs)
# kill (SIGTERM) не запускает atexit — переводим сигнал в штатный выход.
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

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

    # -------------------------------------------- /render/* — общее -----
    def _json(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except Exception:
            pass

    def _read_body(self):
        length = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(length) if length else b''

    def do_GET(self):
        if self.path.split('?', 1)[0].startswith('/render/'):
            return self.handle_render_get()
        return super().do_GET()

    def do_POST(self):
        if self.path.split('?', 1)[0].startswith('/render/'):
            return self.handle_render_post()
        self._json(404, {'error': 'not found'})

    # -------------------------------------------- /render/* — GET -------
    def handle_render_get(self):
        cleanup_old_jobs()
        parts = [p for p in self.path.split('?', 1)[0].split('/') if p]  # ['render', 'ping'] и т.п.
        try:
            if len(parts) == 2 and parts[1] == 'ping':
                exe = ffmpeg_path()
                return self._json(200, {'ok': True, 'ffmpeg': bool(exe), 'version': ffmpeg_version()})
            if len(parts) == 3 and parts[1] == 'file':
                return self._render_file(parts[2])
        except Exception as err:
            return self._json(500, {'error': str(err)})
        self._json(404, {'error': 'unknown render route'})

    def _render_file(self, jid):
        job = _get_job(jid)
        if not job:
            return self._json(404, {'error': 'job not found'})
        out_path = os.path.join(job['dir'], 'out.mp4')
        if not os.path.exists(out_path):
            return self._json(404, {'error': 'file not ready'})
        size = os.path.getsize(out_path)
        name = job.get('name') or 'mockup.mp4'
        # Имя может быть целиком не-ASCII (кириллица) — тогда «выкидывание
        # недопустимых байт» оставило бы только точку с расширением.
        # ascii-фолбэк для Content-Disposition тогда — просто «render.mp4»,
        # а настоящее имя браузер возьмёт из filename*=UTF-8''... ниже.
        base, ext = os.path.splitext(name)
        ascii_base = base.encode('ascii', 'ignore').decode('ascii').strip()
        ascii_name = (ascii_base or 'render') + (ext if ext else '.mp4')
        quoted = urllib.parse.quote(name)
        self.send_response(200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Content-Length', str(size))
        self.send_header(
            'Content-Disposition',
            f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quoted}")
        self.end_headers()
        try:
            with open(out_path, 'rb') as f:
                shutil.copyfileobj(f, self.wfile)
        except Exception:
            pass

    # -------------------------------------------- /render/* — POST ------
    def handle_render_post(self):
        cleanup_old_jobs()
        parts = [p for p in self.path.split('?', 1)[0].split('/') if p]  # ['render','new'] и т.п.
        try:
            if len(parts) == 2 and parts[1] == 'new':
                return self._render_new()
            if len(parts) == 3 and parts[1] == 'audio':
                return self._render_audio(parts[2])
            if len(parts) == 3 and parts[1] == 'start':
                return self._render_start(parts[2])
            if len(parts) == 3 and parts[1] == 'frame':
                return self._render_frame(parts[2])
            if len(parts) == 3 and parts[1] == 'finish':
                return self._render_finish(parts[2])
            if len(parts) == 3 and parts[1] == 'cancel':
                return self._render_cancel(parts[2])
        except Exception as err:
            return self._json(500, {'error': str(err)})
        self._json(404, {'error': 'unknown render route'})

    def _render_new(self):
        jid = uuid.uuid4().hex
        d = tempfile.mkdtemp(prefix='mockup-render-')
        job = {
            'dir': d,
            'created': time.time(),
            'proc': None,
            'stderr_file': None,
            'stderr_path': os.path.join(d, 'stderr.log'),
            'lock': threading.Lock(),
            'frames': 0,
            'name': None,
            'fps': None,
        }
        with RENDER_REGISTRY_LOCK:
            RENDER_JOBS[jid] = job
        self._json(200, {'job': jid})

    def _render_audio(self, jid):
        job = _get_job(jid)
        if not job:
            return self._json(404, {'error': 'job not found'})
        data = self._read_body()
        with open(os.path.join(job['dir'], 'audio.wav'), 'wb') as f:
            f.write(data)
        self._json(200, {'ok': True, 'bytes': len(data)})

    def _render_start(self, jid):
        job = _get_job(jid)
        if not job:
            return self._json(404, {'error': 'job not found'})
        raw = self._read_body()
        try:
            cfg = json.loads(raw.decode('utf-8')) if raw else {}
        except Exception:
            return self._json(400, {'error': 'bad json'})

        exe = ffmpeg_path()
        if not exe:
            return self._json(503, {'error': 'ffmpeg not found', 'hint': 'brew install ffmpeg'})

        fps = cfg.get('fps') or 30
        name = cfg.get('name') or 'mockup.mp4'
        crf = cfg.get('crf') or 18
        audio_path = os.path.join(job['dir'], 'audio.wav')
        has_audio = bool(cfg.get('hasAudio')) and os.path.exists(audio_path)
        out_path = os.path.join(job['dir'], 'out.mp4')

        cmd = [
            exe, '-y', '-hide_banner', '-loglevel', 'error',
            '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-',
        ]
        if has_audio:
            cmd += ['-i', audio_path]
        cmd += [
            '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
            # JPEG-кадры полнодиапазонные (yuvj420p); без явного перевода в
            # tv-диапазон ffmpeg так и тегирует mp4, и часть плееров задирает
            # контраст. scale с out_range=tv + format=yuv420p дают обычный
            # limited-range yuv420p, как у любого камерного видео.
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:in_range=jpeg:out_range=tv,format=yuv420p',
            '-pix_fmt', 'yuv420p', '-color_range', 'tv',
            '-r', str(fps), '-movflags', '+faststart',
        ]
        if has_audio:
            cmd += ['-c:a', 'aac', '-b:a', '192k', '-shortest']
        cmd += [out_path]

        try:
            stderr_f = open(job['stderr_path'], 'wb')
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=stderr_f)
        except Exception as err:
            return self._json(500, {'error': f'не удалось запустить ffmpeg: {err}'})

        job['proc'] = proc
        job['stderr_file'] = stderr_f
        job['name'] = name
        job['fps'] = fps
        job['w'] = cfg.get('w')
        job['h'] = cfg.get('h')
        self._json(200, {'ok': True})

    def _render_frame(self, jid):
        job = _get_job(jid)
        if not job:
            return self._json(404, {'error': 'job not found'})
        data = self._read_body()
        proc = job.get('proc')
        if proc is None or proc.poll() is not None:
            return self._json(500, {'error': 'ffmpeg уже завершился', 'stderr': _stderr_tail(job)})
        with job['lock']:
            try:
                proc.stdin.write(data)
            except (BrokenPipeError, OSError, ValueError) as err:
                return self._json(500, {'error': f'канал в ffmpeg закрыт: {err}', 'stderr': _stderr_tail(job)})
            job['frames'] += 1
            frames = job['frames']
        self._json(200, {'ok': True, 'frames': frames})

    def _render_finish(self, jid):
        job = _get_job(jid)
        if not job:
            return self._json(404, {'error': 'job not found'})
        proc = job.get('proc')
        if proc is None:
            return self._json(400, {'error': 'рендер не был начат'})

        with job['lock']:
            try:
                if proc.stdin and not proc.stdin.closed:
                    proc.stdin.close()
            except Exception:
                pass

        try:
            proc.wait(timeout=120)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass
            return self._json(500, {'error': 'ffmpeg не уложился в 120с', 'stderr': _stderr_tail(job)})
        finally:
            sf = job.get('stderr_file')
            if sf:
                try:
                    sf.close()
                except Exception:
                    pass

        out_path = os.path.join(job['dir'], 'out.mp4')
        if proc.returncode != 0 or not os.path.exists(out_path):
            return self._json(500, {'error': f'ffmpeg завершился с кодом {proc.returncode}', 'stderr': _stderr_tail(job)})

        size = os.path.getsize(out_path)
        self._json(200, {
            'ok': True,
            'frames': job['frames'],
            'bytes': size,
            'path': os.path.abspath(out_path),
            'stderr': _stderr_tail(job),
        })

    def _render_cancel(self, jid):
        job = _get_job(jid)
        if job:
            _drop_job(jid)
        self._json(200, {'ok': True})


# Потоковый сервер: страница держит несколько запросов к видео одновременно
# (основной проигрыватель плюс извлечение кадров для полосы), а офлайн-рендер
# ещё и шлёт кадры один за другим — каждый в своём запросе.
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
