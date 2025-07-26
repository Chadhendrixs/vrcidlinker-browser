from fastapi import FastAPI, HTTPException, Request, APIRouter, Query
from database import SessionLocal, engine, Base
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import Server
from dotenv import load_dotenv
from database import Base
import requests
import os
from tasks import update_all_servers, build_discord_image_url, ensure_flags_exist, save_stats, load_stats
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import json

load_dotenv()

API_KEY = os.getenv("PUBLISH_API_KEY")

def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key")
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

server_stats = load_stats()

class StatsPayload(BaseModel):
    server_count: int
    verified_users: int

class PromotePayload(BaseModel):
    invite_code: str

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
            "crossverify": server.crossverify,
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
def publish_server(invite_code: str, tags: str, crossverify: bool, request: Request):
    verify_api_key(request)
    db = SessionLocal()

    existing = db.query(Server).filter(Server.invite_code == invite_code).first()
    server = existing or Server(invite_code=invite_code)
    server.tags = tags
    server.crossverify = crossverify

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

@app.post("/promoted")
def toggle_promoted(payload: PromotePayload, request: Request):
    invite_code = payload.invite_code
    verify_api_key(request)
    db = SessionLocal()
    print(invite_code)
    try:
        server = db.query(Server).filter(Server.invite_code == invite_code).first()
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")

        server.promoted = not server.promoted
        db.commit()
        return {"status": "ok", "new_state": server.promoted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.api_route("/stats", methods=["GET", "POST"])
async def stats(request: Request, payload: StatsPayload = None):
    if request.method == "POST":
        verify_api_key(request)
        if not payload:
            raise HTTPException(status_code=400, detail="Invalid payload")
        data = payload.dict()
        server_stats.update(data)
        save_stats(server_stats)
        return {"status": "ok"}
    else:
        return server_stats

@app.on_event("startup")
def startup_event():
    #ensure_flags_exist()
    #print("Flags ran!")
    print("Updating servers on launch...")
    update_all_servers()

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)