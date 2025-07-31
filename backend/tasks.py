import requests
from database import SessionLocal
from models import Server
import time
from sqlalchemy import text
from database import engine
import json
from pathlib import Path

STATS_PATH = Path("server_stats.json")

def ensure_flags_exist():
    # crossverify
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE servers ADD COLUMN crossverify BOOLEAN DEFAULT true"))
    except Exception as e:
        if 'already exists' not in str(e):
            print("Error adding crossverify:", e)

    # promoted
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE servers ADD COLUMN promoted BOOLEAN DEFAULT false"))
    except Exception as e:
        if 'already exists' not in str(e):
            print("Error adding promoted:", e)

def build_discord_image_url(hash_str, guild_id, type_):
    if not hash_str or not guild_id:
        return None
    ext = 'gif' if hash_str.startswith('a_') else 'webp'
    if type_ == 'icon':
        return f"https://cdn.discordapp.com/icons/{guild_id}/{hash_str}.{ext}"
    elif type_ == 'banner':
        return f"https://cdn.discordapp.com/banners/{guild_id}/{hash_str}.{ext}?size=512"
    return None

def enrich_server_metadata(server, max_retries=3):
    url = f"https://discord.com/api/invites/{server.invite_code}?with_counts=true"
    for attempt in range(max_retries):
        try:
            res = requests.get(url)

            if res.status_code == 429:
                retry_after = res.headers.get("Retry-After")
                if retry_after:
                    sleep_time = float(retry_after)
                    print(f"Rate limited. Sleeping {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    continue
                else:
                    print("Rate limited, no Retry-After header. Sleeping 2s...")
                    time.sleep(2)
                    continue

            elif res.status_code != 200:
                print(f"[{server.invite_code}] failed (status {res.status_code})")
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
            print(f"[{server.invite_code}] error: {e}")
            time.sleep(2)

def update_all_servers():
    db = SessionLocal()
    servers = db.query(Server).all()

    for i, server in enumerate(servers):
        enrich_server_metadata(server)

        # Rate limit: sleep every 1/20 sec (20/sec = 50ms)
        time.sleep(0.05)

        #print("Updated server:", server.banner_url)
        # Optional: log every 25
        if i % 25 == 0:
            print(f"Updated {i}/{len(servers)} servers", flush=True)
    
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