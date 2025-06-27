from fastapi import FastAPI, HTTPException
from database import SessionLocal, engine, Base
from fastapi.middleware.cors import CORSMiddleware
from models import Server
from dotenv import load_dotenv
import requests
import os

load_dotenv()

API_KEY = os.getenv("PUBLISH_API_KEY")

def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key")
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

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
    discord_data = requests.get(
        f"https://discord.com/api/invites/{code}?with_counts=true"
    ).json()

    db = SessionLocal()
    server = db.query(Server).filter(Server.invite_code == code).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    tags = server.tags.split(",")
    return {**discord_data, "custom_tags": tags}

@app.post("/publish")
def publish_server(invite_code: str, tags: str, request: Request = Depends(verify_api_key)):  # tags = comma-separated string
    db = SessionLocal()
    existing = db.query(Server).filter(Server.invite_code == invite_code).first()
    if existing:
        existing.tags = tags
    else:
        server = Server(invite_code=invite_code, tags=tags)
        db.add(server)
    db.commit()
    return {"status": "ok"}
