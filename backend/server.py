"""21天 · 快乐一家人 — Backend API Server
Data encrypted with AES-256-GCM at rest.
Password hashed with bcrypt. API keys for session management.
"""

import os, json, hashlib, secrets, sqlite3
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import bcrypt

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "harmony.db"
os.makedirs(DATA_DIR, exist_ok=True)

# --- FastAPI App ---
app = FastAPI(title="21天快乐一家人")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory cache: api_key_hash -> aes_key
KEY_CACHE: dict[str, bytes] = {}

# ========================
# Database (auto-init)
# ========================
def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            api_key_hash TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS state_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            encrypted_data BLOB NOT NULL,
            nonce BLOB NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()

def get_conn():
    """Get a DB connection; auto-initialize tables if they don't exist."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("SELECT 1 FROM auth LIMIT 1").close()
        return conn
    except sqlite3.OperationalError:
        conn.close()
        init_db()
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

# ========================
# Crypto
# ========================
PBKDF2_ITERATIONS = 600000

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=PBKDF2_ITERATIONS)
    return kdf.derive(password.encode("utf-8"))

def encrypt_data(key: bytes, state: dict) -> tuple[bytes, bytes]:
    aesgcm = AESGCM(key)
    plaintext = json.dumps(state, ensure_ascii=False).encode("utf-8")
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext, None)
    return ct, nonce

def decrypt_data(key: bytes, ct: bytes, nonce: bytes) -> dict:
    aesgcm = AESGCM(key)
    try:
        plaintext = aesgcm.decrypt(nonce, ct, None)
        return json.loads(plaintext.decode("utf-8"))
    except Exception:
        raise HTTPException(500, "数据解密失败，密码可能已变更")

# ========================
# Models
# ========================
class AuthReq(BaseModel):
    password: str

class StateUpdate(BaseModel):
    state: dict

# ========================
# Helpers
# ========================
def _default_state():
    return {
        "players": ["", ""], "emojis": ["😊", "🥰"],
        "startDate": None, "currentDay": 1,
        "completedDays": {}, "moods": {}, "ratings": {}, "journals": {}
    }

def _ensure_state_row(conn, key: bytes):
    """Create a state_data row if none exists."""
    row = conn.execute("SELECT id FROM state_data WHERE id = 1").fetchone()
    if row:
        return
    ct, nonce = encrypt_data(key, _default_state())
    conn.execute("INSERT INTO state_data (id, encrypted_data, nonce) VALUES (1, ?, ?)", (ct, nonce))

# ========================
# API: Auth
# ========================
@app.post("/api/register")
def register(req: AuthReq):
    pw = req.password
    if len(pw) < 4:
        raise HTTPException(400, "密码至少4位")
    conn = get_conn()
    existing = conn.execute("SELECT COUNT(*) FROM auth").fetchone()[0]
    if existing > 0:
        conn.close()
        raise HTTPException(400, "已注册过，请登录")
    salt = os.urandom(16)
    pw_hash = bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    api_key = secrets.token_hex(32)
    api_key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    key = derive_key(pw, salt)
    conn.execute("INSERT INTO auth (password_hash, salt, api_key_hash) VALUES (?, ?, ?)",
                 (pw_hash, salt.hex(), api_key_hash))
    state = _default_state()
    _ensure_state_row(conn, key)
    conn.commit()
    conn.close()
    KEY_CACHE[api_key_hash] = key
    return {"api_key": api_key, "state": state}

@app.post("/api/login")
def login(req: AuthReq):
    conn = get_conn()
    row = conn.execute("SELECT * FROM auth LIMIT 1").fetchone()
    if not row:
        conn.close()
        raise HTTPException(400, "还未设置密码，请先注册")
    if not bcrypt.checkpw(req.password.encode("utf-8"), row["password_hash"].encode("utf-8")):
        conn.close()
        raise HTTPException(401, "密码错误")
    salt = bytes.fromhex(row["salt"])
    key = derive_key(req.password, salt)
    state_row = conn.execute("SELECT * FROM state_data WHERE id = 1").fetchone()
    state = decrypt_data(key, state_row["encrypted_data"], state_row["nonce"]) if state_row else _default_state()
    api_key = secrets.token_hex(32)
    api_key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    conn.execute("UPDATE auth SET api_key_hash = ?", (api_key_hash,))
    conn.commit()
    conn.close()
    KEY_CACHE[api_key_hash] = key
    return {"api_key": api_key, "state": state}

# ========================
# API: State
# ========================
def _resolve_key(request: Request) -> bytes:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "缺少认证")
    api_key = auth[7:]
    hash_val = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    key = KEY_CACHE.get(hash_val)
    if key:
        return key
    conn = get_conn()
    row = conn.execute("SELECT * FROM auth WHERE api_key_hash = ?", (hash_val,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(401, "无效的API密钥，请重新登录")
    raise HTTPException(401, "需要重新登录（服务已重启）")

@app.get("/api/state")
def get_state(request: Request):
    key = _resolve_key(request)
    conn = get_conn()
    row = conn.execute("SELECT * FROM state_data WHERE id = 1").fetchone()
    conn.close()
    if not row:
        return {"state": _default_state()}
    state = decrypt_data(key, row["encrypted_data"], row["nonce"])
    return {"state": state}

@app.put("/api/state")
def put_state(body: StateUpdate, request: Request):
    key = _resolve_key(request)
    ct, nonce = encrypt_data(key, body.state)
    conn = get_conn()
    _ensure_state_row(conn, key)
    conn.execute(
        "UPDATE state_data SET encrypted_data = ?, nonce = ?, updated_at = ? WHERE id = 1",
        (ct, nonce, datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/api/ping")
def ping():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}

# ========================
# Static files
# ========================
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")

# ========================
# Startup
# ========================
@app.on_event("startup")
def startup():
    init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host="0.0.0.0", port=8765, reload=True)
