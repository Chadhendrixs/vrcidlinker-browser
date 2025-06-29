from fastapi import FastAPI, HTTPException, Request
from database import SessionLocal, engine, Base
from fastapi.middleware.cors import CORSMiddleware
from models import Server
from dotenv import load_dotenv
from database import Base
import requests
import os
from tasks import update_all_servers, build_discord_image_url
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()

API_KEY = os.getenv("PUBLISH_API_KEY")

def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key")
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

scheduler = BackgroundScheduler()
scheduler.add_job(update_all_servers, 'interval', hours=1)#seconds=10
scheduler.start()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://vrcidlinker-browser-frontend.onrender.com"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/servers")
def get_servers():
    db = SessionLocal()
    return db.query(Server).all()

@app.get("/invite/{code}")
def get_invite(code: str):
    db = SessionLocal()
    server = db.query(Server).filter(Server.invite_code == code).first()
    if server:
        tags = server.tags.split(",")
        return {
            "name": server.name,
            "description": server.description,
            "member_count": server.member_count,
            "custom_tag": server.custom_tag,
            "boost_tier": server.boost_tier,
            "icon_url": server.icon_url,
            "banner_url": server.banner_url,
            "custom_tags": tags,
        }

    # Fallback to Discord API if not found in DB
    try:
        discord_data = requests.get(
            f"https://discord.com/api/invites/{code}?with_counts=true"
        )
        if discord_data.status_code != 200:
            raise HTTPException(status_code=404, detail="Server not found")

        return discord_data.json()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch invite: {e}")
    finally:
        db.close()

@app.post("/publish")
def publish_server(invite_code: str, tags: str, request: Request):
    verify_api_key(request)
    db = SessionLocal()

    existing = db.query(Server).filter(Server.invite_code == invite_code).first()
    server = existing or Server(invite_code=invite_code)
    server.tags = tags

    try:
        res = requests.get(
            f"https://discord.com/api/invites/{invite_code}?with_counts=true"
        )
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid invite code")

        json = res.json()
        guild = json.get("guild", {})
        profile = json.get("profile", {})
        guild_id = guild.get("id")

        server.name = guild.get("name")
        server.description = guild.get("description")
        server.member_count = json.get("approximate_member_count")
        server.custom_tag = profile.get("tag")
        server.boost_tier = guild.get("premium_tier")
        server.icon_url = build_discord_image_url(guild.get("icon"), guild_id, "icon")
        server.banner_url = build_discord_image_url(guild.get("banner"), guild_id, "banner")

        if not existing:
            db.add(server)
        db.commit()
        return {"status": "ok"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error fetching metadata: {str(e)}")

    finally:
        db.close()
