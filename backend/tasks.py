import requests
from database import SessionLocal
from models import Server
import time
from sqlalchemy import text
from database import engine
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, APIRouter, Query, Response
import nacl.signing
import nacl.exceptions
from email.utils import parsedate_to_datetime
import datetime as _dt

STATS_PATH = Path("server_stats.json")

def ensure_flags_exist():
    # crossverify
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE servers ADD COLUMN crossverify BOOLEAN DEFAULT true"))
    except Exception as e:
        if 'already exists' not in str(e):
            print("Error adding crossverify:", e, flush=True)

    # promoted
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE servers ADD COLUMN promoted BOOLEAN DEFAULT false"))
    except Exception as e:
        if 'already exists' not in str(e):
            print("Error adding promoted:", e, flush=True)

def build_discord_image_url(hash_str, guild_id, type_):
    if not hash_str or not guild_id:
        return None
    ext = 'gif' if hash_str.startswith('a_') else 'webp'
    if type_ == 'icon':
        return f"https://cdn.discordapp.com/icons/{guild_id}/{hash_str}.{ext}"
    elif type_ == 'banner':
        return f"https://cdn.discordapp.com/banners/{guild_id}/{hash_str}.{ext}?size=512"
    return None

def _parse_retry_after(value):
    """Return seconds to sleep from a Retry-After header value.
    Handles numeric seconds, comma-separated values like '3600, 300',
    and HTTP-date per RFC 7231. Returns None if unparsable."""
    if value is None:
        return None
    # If header library gives us a list, pick the first
    if isinstance(value, (list, tuple)) and value:
        value = value[0]
    # Already numeric?
    try:
        return float(value)
    except Exception:
        pass
    s = str(value)
    # Some proxies send comma-joined header values; take the first segment
    first = s.split(",")[0].strip()
    # Try seconds again
    try:
        return float(first)
    except Exception:
        pass
    # Try HTTP-date
    try:
        dt = parsedate_to_datetime(first)
        if dt is None:
            return None
        # Ensure aware UTC math
        now = _dt.datetime.utcnow().replace(tzinfo=dt.tzinfo)
        secs = (dt - now).total_seconds()
        return max(secs, 0.0)
    except Exception:
        return None

def enrich_server_metadata(server, max_retries=3):
    url = f"https://discord.com/api/invites/{server.invite_code}?with_counts=true"
    for attempt in range(max_retries):
        try:
            res = requests.get(url)

            if res.status_code == 429:
                retry_after = res.headers.get("Retry-After")
                if retry_after is not None:
                    sleep_time = _parse_retry_after(retry_after)
                    if sleep_time is None:
                        print(f"Rate limited. Unparsable Retry-After '{retry_after}'. Sleeping 2s as fallback...", flush=True)
                        sleep_time = 2.0
                    else:
                        print(f"Rate limited. Sleeping {sleep_time:.2f}s... (Retry-After: {retry_after})", flush=True)
                    time.sleep(sleep_time)
                    continue
                else:
                    print("Rate limited, no Retry-After header. Sleeping 2s...", flush=True)
                    time.sleep(2)
                    continue

            elif res.status_code != 200:
                print(f"[{server.invite_code}] failed (status {res.status_code})", flush=True)
                return

            data = res.json()
            guild = data.get("guild", {})
            profile = data.get("profile", {})
            guild_id = guild.get("id")

            server.name = guild.get("name")
            server.description = guild.get("description")
            server.member_count = data.get("approximate_member_count")
            server.custom_tag = profile.get("tag")
            server.boost_tier = guild.get("premium_tier")
            server.icon_url = build_discord_image_url(guild.get("icon"), guild_id, "icon")
            server.banner_url = build_discord_image_url(guild.get("banner"), guild_id, "banner")
            return

        except Exception as e:
            print(f"[{server.invite_code}] error: {e}", flush=True)
            time.sleep(2)

def update_all_servers():
    db = SessionLocal()
    servers = db.query(Server).all()

    for i, server in enumerate(servers):
        enrich_server_metadata(server)

        # Rate limit: sleep every 1/20 sec (20/sec = 50ms)
        time.sleep(0.05)

    print(f"Updated {len(servers)} servers", flush=True)
    db.commit()
    db.close()

def save_stats(stats):
    with STATS_PATH.open("w") as f:
        json.dump(stats, f)

def load_stats():
    if STATS_PATH.exists():
        with STATS_PATH.open("r") as f:
            return json.load(f)
    return {"server_count": 0, "verified_users": 0}

def verify_signature(request: Request, raw_body: bytes, PUBLIC_KEY: str):
    signature = request.headers.get("X-Signature-Ed25519")
    timestamp = request.headers.get("X-Signature-Timestamp")

    if not signature or not timestamp:
        return False

    try:
        verify_key = nacl.signing.VerifyKey(bytes.fromhex(PUBLIC_KEY))
        verify_key.verify(f"{timestamp}{raw_body.decode()}".encode(), bytes.fromhex(signature))
        return True
    except nacl.exceptions.BadSignatureError:
        return False