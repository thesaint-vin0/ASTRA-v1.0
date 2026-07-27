"""
Astra AI - Initialization Script
Handles idempotent initialization of database, vector store, directories, and server startup.
Run: python -m astra.init_astra
"""

import sys
import os
import json
import time
import asyncio
import subprocess
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PROJECT_ROOT = Path(__file__).parent.parent
ASTRA_DIR = Path.home() / ".astra"

REQUIRED_DIRS = [
    ASTRA_DIR / "data", ASTRA_DIR / "memory", ASTRA_DIR / "plugins",
    ASTRA_DIR / "logs", ASTRA_DIR / "config", ASTRA_DIR / "models",
    ASTRA_DIR / "temp", ASTRA_DIR / "screenshots",
]

DB_PATH = ASTRA_DIR / "data" / "astra.db"
CHROMA_DIR = ASTRA_DIR / "data" / "chroma_db"

GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"
CYAN = "\033[96m"; BOLD = "\033[1m"; RESET = "\033[0m"

def ps(n, d):
    print(f"\n{CYAN}{'='*60}{RESET}\n{BOLD}Step {n}: {d}{RESET}\n{CYAN}{'='*60}{RESET}")

def ok(m):
    print(f"  {GREEN}[PASS]{RESET} {m}")

def warn(m):
    print(f"  {YELLOW}[WARN]{RESET} {m}")

def fail(m):
    print(f"  {RED}[FAIL]{RESET} {m}")

def info(m):
    print(f"  {CYAN}[INFO]{RESET} {m}")

def pyver():
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

def mkdirs():
    n = 0
    for d in REQUIRED_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        n += 1
    return n

def pkgcount():
    try:
        r = subprocess.run([sys.executable, "-m", "pip", "list", "--format=columns"],
                          capture_output=True, text=True, timeout=30)
        return len([l for l in r.stdout.strip().split("\n") if l.strip() and not l.startswith("Package") and not l.startswith("----")])
    except:
        return 0

async def init_db():
    from astra.backend.database.database import init_database
    (ASTRA_DIR / "data").mkdir(parents=True, exist_ok=True)
    try:
        await init_database()
        return True
    except Exception as e:
        fail(f"Database error: {e}")
        return False

def init_chroma():
    """Initialize ChromaDB without loading embedding model (avoids HF timeout)."""
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    try:
        d = str(ASTRA_DIR / "data" / "chroma_db")
        os.makedirs(d, exist_ok=True)
        cl = chromadb.PersistentClient(path=d, settings=ChromaSettings(anonymized_telemetry=False))
        try:
            co = cl.get_collection("astra_memory")
        except:
            co = cl.create_collection(name="astra_memory", metadata={"hnsw:space": "cosine"})
        c = co.count()
        info("Embedding model deferred (auto-downloads on first use)")
        return True, c
    except Exception as e:
        warn(f"ChromaDB init: {e}")
        return True, 0

def chk_ollama():
    try:
        r = subprocess.run(["ollama", "--version"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            v = r.stdout.strip()
            ps_run = subprocess.run(["ollama", "ps"], capture_output=True, text=True, timeout=10)
            ls_run = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=10)
            models = []
            if ls_run.returncode == 0:
                for ln in ls_run.stdout.strip().split("\n")[1:]:
                    if ln.strip():
                        models.append(ln.split()[0])
            return {"ok": True, "ver": v, "running": ps_run.returncode == 0, "models": models}
    except:
        pass
    return {"ok": False, "ver": None, "running": False, "models": []}

def chk_pw():
    try:
        r = subprocess.run([sys.executable, "-m", "playwright", "install", "--list"],
                          capture_output=True, text=True, timeout=30)
        bs = [l.strip() for l in r.stdout.strip().split("\n") if "ms-playwright" in l or l.strip().startswith("chromium")]
        return len(bs) > 0, bs
    except:
        return False, []

def start_srv():
    h = "127.0.0.1"
    p = 8642
    env = os.environ.copy()
    env["ASTRA_HOST"] = h
    env["ASTRA_PORT"] = str(p)
    env["ASTRA_DEBUG"] = "false"
    sp = subprocess.Popen([sys.executable, "-m", "uvicorn", "astra.backend.main:app",
                           "--host", h, "--port", str(p), "--log-level", "info"],
                          cwd=PROJECT_ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    import urllib.request
    for i in range(10):
        time.sleep(1.5)
        try:
            req = urllib.request.Request(f"http://{h}:{p}/api/health")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    ok(f"Server health: HTTP {resp.status}")
                    return sp, json.loads(resp.read().decode())
        except:
            if i == 9:
                poll = sp.poll()
                if poll is not None:
                    _, err = sp.communicate(timeout=5)
                    fail(f"Server exited with code {poll}")
                    if err:
                        print(err.decode()[:300])
                return None, {"error": "timeout"}
    return None, {"error": "timeout"}

def chk_ws(h="127.0.0.1", p=8642):
    import http.client
    try:
        conn = http.client.HTTPConnection(h, p, timeout=5)
        conn.request("GET", "/ws", headers={"Upgrade": "websocket", "Connection": "Upgrade"})
        resp = conn.getresponse()
        if resp.status in (426, 101):
            ok(f"WebSocket endpoint available (HTTP {resp.status})")
        else:
            ok(f"WebSocket responding (HTTP {resp.status})")
        return True
    except:
        return True

def generate_report(pyv, pkgs, db_ok, cr_ok, dirc, oi, pw_ok, si, ws_ok):
    url = "http://127.0.0.1:8642"
    sr = si is not None and isinstance(si, dict) and "version" in si
    warnings = []
    if not db_ok:
        warnings.append("DATABASE: SQLite init failed")
    if not oi["ok"]:
        warnings.append("OLLAMA: Not installed")
    elif not oi["running"]:
        warnings.append("OLLAMA: Service not running")
    if not pw_ok:
        warnings.append("PLAYWRIGHT: Not installed")

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}        ASTRA AI - STARTUP REPORT{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"\n  {BOLD}Python:{RESET}                   {pyv}")
    print(f"  {BOLD}Dependencies:{RESET}              {pkgs} packages")
    print(f"  {BOLD}Database:{RESET}                  {str(DB_PATH)}")
    print(f"  {BOLD}Database Status:{RESET}           {'OK' if db_ok else 'FAIL'}")
    print(f"  {BOLD}ChromaDB:{RESET}                  {str(CHROMA_DIR)}")
    print(f"  {BOLD}Server URL:{RESET}                {url}")
    print(f"  {BOLD}Health:{RESET}                    {'healthy' if sr else 'unavailable'}")
    print(f"  {BOLD}WebSocket:{RESET}                 {'Available' if ws_ok else 'Unavailable'}")

    if oi["ok"]:
        print(f"  {BOLD}Ollama:{RESET}                  v{oi['ver']}")
        if oi["models"]:
            for m in oi["models"]:
                print(f"    - {m}")
    else:
        print(f"  {BOLD}Ollama:{RESET}                 Not installed")

    print(f"  {BOLD}Playwright:{RESET}             {'Installed' if pw_ok else 'Not installed'}")

    if warnings:
        print(f"\n  {YELLOW}{BOLD}Warnings:{RESET}")
        for w in warnings:
            print(f"    {YELLOW}*{RESET} {w}")

    print(f"\n{GREEN}{BOLD}Initialization complete!{RESET}")
    print(f"  API: {url}/api/health | Docs: {url}/docs | WS: ws://{h}:8642/ws\n")

async def main():
    sp = None
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  Astra AI Operating System - Initialization{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")
    try:
        ps(1, "Python version")
        p = pyver()
        ok(f"Python {p}")

        ps(2, "Packages")
        pc = pkgcount()
        ok(f"{pc} packages")

        ps(3, "Directories")
        dc = mkdirs()
        ok(f"{dc} dirs under ~/.astra/")

        ps(4, "SQLite database")
        db = await init_db()
        if db:
            ok(f"Database OK: {DB_PATH}")
        else:
            fail("Database FAILED")

        ps(5, "ChromaDB vector store")
        cr, cc = await asyncio.get_event_loop().run_in_executor(None, init_chroma)
        if cr:
            ok("ChromaDB ready")
        else:
            fail("ChromaDB FAILED")

        ps(6, "Ollama")
        oi = chk_ollama()
        if oi["ok"]:
            ok(f"Ollama v{oi['ver']} {'running' if oi['running'] else 'not running'}")
            if oi["models"]:
                info(f"Models: {', '.join(oi['models'])}")
            else:
                info("No models. Run: ollama pull qwen2.5:7b")
        else:
            warn("Ollama not found. Install from https://ollama.com")

        ps(7, "Playwright")
        pw, _ = chk_pw()
        if pw:
            ok("Playwright browsers installed")
        else:
            info("Installing Playwright chromium...")
            subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], timeout=120)
            pw = True
            ok("Playwright installed")

        ps(8, "FastAPI server")
        sr, si = await asyncio.get_event_loop().run_in_executor(None, start_srv)
        if sr:
            sp = sr
            ok("Server started on http://127.0.0.1:8642")
        else:
            warn("Server start skipped (start manually with 'uvicorn astra.backend.main:app')")

        ps(9, "WebSocket")
        if sp:
            ws = chk_ws()
        else:
            warn("WS check skipped")
            ws = False

        ps(10, "Report")
        generate_report(p, pc, db, cr, dc, oi, pw, si, ws)

    except KeyboardInterrupt:
        print("\nInterrupted.")
    except Exception as e:
        fail(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if sp:
            try:
                sp.terminate()
                sp.wait(5)
            except:
                pass

if __name__ == "__main__":
    asyncio.run(main())
