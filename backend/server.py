"""
Siddhnath Doodh Sankalan Kendra — Dairy Management Backend
FastAPI + MongoDB (motor) + Gemini 3 Flash (via emergentintegrations) image OCR
"""

import base64
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Siddhnath Dairy API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("siddhnath")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Models ────────────────────────────────────────────────────────────────
class Farmer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    farmer_code: str
    name: str
    phone: str
    village: Optional[str] = ""
    created_at: str = Field(default_factory=now_iso)


class FarmerCreate(BaseModel):
    name: str
    phone: str
    village: Optional[str] = ""
    farmer_code: Optional[str] = None


class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None


Shift = Literal["morning", "evening"]


class MilkEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    farmer_id: str
    farmer_code: str
    farmer_name: str
    date: str
    shift: Shift
    liters: float
    fat: float
    snf: float
    density: Optional[float] = None
    rate: float
    amount: float
    created_at: str = Field(default_factory=now_iso)


class MilkEntryCreate(BaseModel):
    farmer_id: str
    date: Optional[str] = None
    shift: Shift
    liters: float
    fat: float
    snf: float
    density: Optional[float] = None


class Advance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    farmer_id: str
    farmer_code: str
    farmer_name: str
    amount: float
    note: Optional[str] = ""
    date: str
    settled: bool = False
    created_at: str = Field(default_factory=now_iso)


class AdvanceCreate(BaseModel):
    farmer_id: str
    amount: float
    note: Optional[str] = ""
    date: Optional[str] = None


class Settings(BaseModel):
    id: str = "global"
    dairy_name: str = "Siddhnath Doodh Sankalan Kendra"
    dairy_phone: str = ""
    base_fat: float = 3.5
    base_snf: float = 8.5
    base_rate: float = 35.0
    fat_increment: float = 0.40
    snf_increment: float = 0.30
    admin_password: str = "admin123"
    updated_at: str = Field(default_factory=now_iso)


class SettingsUpdate(BaseModel):
    dairy_name: Optional[str] = None
    dairy_phone: Optional[str] = None
    base_fat: Optional[float] = None
    base_snf: Optional[float] = None
    base_rate: Optional[float] = None
    fat_increment: Optional[float] = None
    snf_increment: Optional[float] = None
    admin_password: Optional[str] = None


class AdminLogin(BaseModel):
    password: str


class FarmerLogin(BaseModel):
    farmer_code: str
    phone: str


class ScanRequest(BaseModel):
    image_base64: str


class RatePreviewRequest(BaseModel):
    fat: float
    snf: float
    liters: float


# ─── Helpers ───────────────────────────────────────────────────────────────
PROJECTION = {"_id": 0}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"id": "global"}, PROJECTION)
    if not doc:
        s = Settings().model_dump()
        await db.settings.insert_one(s)
        doc = await db.settings.find_one({"id": "global"}, PROJECTION)
    return dict(doc) if doc else {}


def calc_rate(fat: float, snf: float, settings: dict) -> float:
    base_rate = settings["base_rate"]
    bf, bs = settings["base_fat"], settings["base_snf"]
    fi, si = settings["fat_increment"], settings["snf_increment"]
    rate = base_rate + ((fat - bf) / 0.1) * fi + ((snf - bs) / 0.1) * si
    return round(max(rate, 0.0), 2)


async def next_farmer_code() -> str:
    count = await db.farmers.count_documents({})
    return f"F{count + 1:03d}"


# ─── Auth ──────────────────────────────────────────────────────────────────
@api.post("/auth/admin-login")
async def admin_login(body: AdminLogin):
    s = await get_settings_doc()
    if body.password != s["admin_password"]:
        raise HTTPException(401, "चुकीचा पासवर्ड / Wrong password")
    return {"ok": True, "role": "admin", "dairy_name": s["dairy_name"]}


@api.post("/auth/farmer-login")
async def farmer_login(body: FarmerLogin):
    code = body.farmer_code.strip().upper()
    farmer = await db.farmers.find_one(
        {"farmer_code": code, "phone": body.phone.strip()}, PROJECTION
    )
    if not farmer:
        raise HTTPException(401, "Farmer ID किंवा फोन चुकीचा / Wrong ID or phone")
    return {"ok": True, "role": "farmer", "farmer": farmer}


# ─── Farmers ───────────────────────────────────────────────────────────────
@api.get("/farmers", response_model=List[Farmer])
async def list_farmers():
    rows = await db.farmers.find({}, PROJECTION).sort("farmer_code", 1).to_list(2000)
    return rows


@api.post("/farmers", response_model=Farmer)
async def create_farmer(body: FarmerCreate):
    code = (body.farmer_code or "").strip().upper() or await next_farmer_code()
    exists = await db.farmers.find_one({"farmer_code": code})
    if exists:
        raise HTTPException(400, f"Farmer code {code} आधीच आहे / already exists")
    f = Farmer(
        farmer_code=code,
        name=body.name.strip(),
        phone=body.phone.strip(),
        village=(body.village or "").strip(),
    )
    await db.farmers.insert_one(f.model_dump())
    return f


@api.get("/farmers/{farmer_id}", response_model=Farmer)
async def get_farmer(farmer_id: str):
    f = await db.farmers.find_one({"id": farmer_id}, PROJECTION)
    if not f:
        raise HTTPException(404, "Farmer not found")
    return Farmer(**f)


@api.put("/farmers/{farmer_id}", response_model=Farmer)
async def update_farmer(farmer_id: str, body: FarmerUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Nothing to update")
    await db.farmers.update_one({"id": farmer_id}, {"$set": update})
    f = await db.farmers.find_one({"id": farmer_id}, PROJECTION)
    if not f:
        raise HTTPException(404, "Farmer not found")
    return Farmer(**f)


@api.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: str):
    await db.farmers.delete_one({"id": farmer_id})
    await db.milk_entries.delete_many({"farmer_id": farmer_id})
    await db.advances.delete_many({"farmer_id": farmer_id})
    return {"ok": True}


# ─── Milk entries ──────────────────────────────────────────────────────────
@api.post("/milk-entries", response_model=MilkEntry)
async def create_milk_entry(body: MilkEntryCreate):
    farmer = await db.farmers.find_one({"id": body.farmer_id}, PROJECTION)
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    s = await get_settings_doc()
    rate = calc_rate(body.fat, body.snf, s)
    amount = round(rate * body.liters, 2)
    date = body.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = MilkEntry(
        farmer_id=farmer["id"],
        farmer_code=farmer["farmer_code"],
        farmer_name=farmer["name"],
        date=date,
        shift=body.shift,
        liters=body.liters,
        fat=body.fat,
        snf=body.snf,
        density=body.density,
        rate=rate,
        amount=amount,
    )
    await db.milk_entries.insert_one(entry.model_dump())
    return entry


@api.get("/milk-entries", response_model=List[MilkEntry])
async def list_milk_entries(
    farmer_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 500,
):
    q: dict = {}
    if farmer_id:
        q["farmer_id"] = farmer_id
    if date_from or date_to:
        q["date"] = {}
        if date_from:
            q["date"]["$gte"] = date_from
        if date_to:
            q["date"]["$lte"] = date_to
    rows = (
        await db.milk_entries.find(q, PROJECTION)
        .sort([("date", -1), ("created_at", -1)])
        .to_list(limit)
    )
    return rows


@api.delete("/milk-entries/{entry_id}")
async def delete_milk_entry(entry_id: str):
    await db.milk_entries.delete_one({"id": entry_id})
    return {"ok": True}


@api.get("/today-summary")
async def today_summary():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = await db.milk_entries.find({"date": today}, PROJECTION).to_list(2000)
    liters = sum(r["liters"] for r in rows)
    amount = sum(r["amount"] for r in rows)
    farmers = len({r["farmer_id"] for r in rows})
    avg_fat = round(sum(r["fat"] for r in rows) / len(rows), 2) if rows else 0
    avg_snf = round(sum(r["snf"] for r in rows) / len(rows), 2) if rows else 0
    return {
        "date": today,
        "entries": len(rows),
        "liters": round(liters, 2),
        "amount": round(amount, 2),
        "farmers": farmers,
        "avg_fat": avg_fat,
        "avg_snf": avg_snf,
    }


# ─── Advances ──────────────────────────────────────────────────────────────
@api.post("/advances", response_model=Advance)
async def create_advance(body: AdvanceCreate):
    farmer = await db.farmers.find_one({"id": body.farmer_id}, PROJECTION)
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    a = Advance(
        farmer_id=farmer["id"],
        farmer_code=farmer["farmer_code"],
        farmer_name=farmer["name"],
        amount=body.amount,
        note=body.note or "",
        date=body.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    )
    await db.advances.insert_one(a.model_dump())
    return a


@api.get("/advances", response_model=List[Advance])
async def list_advances(farmer_id: Optional[str] = None, unsettled: bool = False):
    q: dict = {}
    if farmer_id:
        q["farmer_id"] = farmer_id
    if unsettled:
        q["settled"] = False
    rows = await db.advances.find(q, PROJECTION).sort("date", -1).to_list(1000)
    return rows


@api.delete("/advances/{advance_id}")
async def delete_advance(advance_id: str):
    await db.advances.delete_one({"id": advance_id})
    return {"ok": True}


# ─── Payment summary ───────────────────────────────────────────────────────
@api.get("/payment-summary/{farmer_id}")
async def payment_summary(
    farmer_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    farmer = await db.farmers.find_one({"id": farmer_id}, PROJECTION)
    if not farmer:
        raise HTTPException(404, "Farmer not found")
    if not date_to:
        date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not date_from:
        d = datetime.strptime(date_to, "%Y-%m-%d") - timedelta(days=6)
        date_from = d.strftime("%Y-%m-%d")
    entries = await db.milk_entries.find(
        {"farmer_id": farmer_id, "date": {"$gte": date_from, "$lte": date_to}},
        PROJECTION,
    ).sort("date", 1).to_list(2000)
    total_liters = round(sum(e["liters"] for e in entries), 2)
    gross = round(sum(e["amount"] for e in entries), 2)
    advances = await db.advances.find(
        {"farmer_id": farmer_id, "settled": False}, PROJECTION
    ).to_list(500)
    total_advance = round(sum(a["amount"] for a in advances), 2)
    net = round(gross - total_advance, 2)
    avg_fat = round(sum(e["fat"] for e in entries) / len(entries), 2) if entries else 0
    avg_snf = round(sum(e["snf"] for e in entries) / len(entries), 2) if entries else 0
    return {
        "farmer": farmer,
        "date_from": date_from,
        "date_to": date_to,
        "entries": entries,
        "advances": advances,
        "total_liters": total_liters,
        "gross_amount": gross,
        "total_advance": total_advance,
        "net_payable": net,
        "avg_fat": avg_fat,
        "avg_snf": avg_snf,
    }


@api.post("/payment-summary/{farmer_id}/settle-advances")
async def settle_advances(farmer_id: str):
    res = await db.advances.update_many(
        {"farmer_id": farmer_id, "settled": False}, {"$set": {"settled": True}}
    )
    return {"ok": True, "settled": res.modified_count}


# ─── Settings ──────────────────────────────────────────────────────────────
@api.get("/settings", response_model=Settings)
async def get_settings():
    s = await get_settings_doc()
    return s


@api.put("/settings", response_model=Settings)
async def update_settings(body: SettingsUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    s = await get_settings_doc()
    return s


# ─── Rate preview ──────────────────────────────────────────────────────────
@api.post("/rate-preview")
async def rate_preview(body: RatePreviewRequest):
    s = await get_settings_doc()
    rate = calc_rate(body.fat, body.snf, s)
    amount = round(rate * body.liters, 2)
    return {"rate": rate, "amount": amount}


# ─── AI scan ───────────────────────────────────────────────────────────────
SCAN_SYSTEM = (
    "You are an OCR assistant for a milk-testing machine LCD display. "
    "The display shows three numeric values: FAT (typically 2.0 to 12.0), "
    "SNF (typically 7.0 to 12.0), and DENSITY/CLR (typically 20 to 35). "
    "Read the digits from the image and return ONLY a strict JSON object with keys "
    '"fat", "snf", "density" — all numbers (float). '
    'If a value is not readable, set it to null. '
    'Example: {"fat": 3.8, "snf": 8.6, "density": 27.5}. '
    "Do not include any other text, markdown, or explanation."
)


def _extract_json(text: str) -> dict:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return {}
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return {}


@api.post("/scan-image")
async def scan_image(body: ScanRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI key not configured")
    b64 = body.image_base64
    if "," in b64 and b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        base64.b64decode(b64[:200], validate=False)
    except Exception:
        raise HTTPException(400, "Invalid base64 image")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"scan-{uuid.uuid4()}",
        system_message=SCAN_SYSTEM,
    ).with_model("gemini", "gemini-3-flash-preview")

    msg = UserMessage(
        text='Read the LCD display and return JSON: {"fat":..,"snf":..,"density":..}.',
        file_contents=[ImageContent(image_base64=b64)],
    )

    try:
        response = await chat.send_message(msg)
        text = response if isinstance(response, str) else str(response)
    except Exception as e:
        log.exception("Gemini scan failed")
        raise HTTPException(502, f"AI scan failed: {e}")

    parsed = _extract_json(text)

    def _as_float(v: Any) -> Optional[float]:
        try:
            if v is None:
                return None
            return float(v)
        except (TypeError, ValueError):
            return None

    fat = _as_float(parsed.get("fat"))
    snf = _as_float(parsed.get("snf"))
    density = _as_float(parsed.get("density"))

    def clamp(v, lo, hi):
        return v if (v is not None and lo <= v <= hi) else None

    return {
        "fat": clamp(fat, 1.0, 15.0),
        "snf": clamp(snf, 5.0, 15.0),
        "density": clamp(density, 15.0, 40.0),
        "raw": text,
    }


# ─── Health / bootstrap ────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"ok": True, "app": "Siddhnath Dairy"}


@api.get("/health")
async def health():
    """Keep-alive ping endpoint — front-end pings this every 4 min to prevent
    free-tier hosts (Render/Railway/etc.) from sleeping the server."""
    return {"ok": True, "ts": now_iso()}


@app.on_event("startup")
async def on_startup():
    await get_settings_doc()
    log.info("Siddhnath Dairy API ready")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
