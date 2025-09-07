from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from PIL import Image
import io
import os
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration

app = FastAPI(title="Medical Report Generator", version="1.0.0")

# CORS (open for dev; restrict to your frontend origin in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # e.g. ["https://your-frontend.onrender.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", ROOT / "models" / "best"))

# Force CPU to work everywhere; change to auto if desired:
DEVICE = "cpu"
# DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Keep CPU usage reasonable on small machines
try:
    torch.set_num_threads(max(1, torch.get_num_threads() // 2))
except Exception:
    pass

def load_model_and_processor():
    if not MODEL_DIR.exists():
        raise RuntimeError(
            f"Model folder not found: {MODEL_DIR}\n"
            "Put your save_pretrained export here (pytorch_model.bin, config.json, tokenizer files, etc.)."
        )
    processor = BlipProcessor.from_pretrained(str(MODEL_DIR))
    model = BlipForConditionalGeneration.from_pretrained(
        str(MODEL_DIR),
        torch_dtype=torch.float32,        # CPU-friendly
        low_cpu_mem_usage=True
    )
    model.to(DEVICE)
    model.eval()
    return processor, model

PROCESSOR, MODEL = load_model_and_processor()

def generate_report_from_bytes(
    image_bytes: bytes,
    max_length: int = 64,
    num_beams: int = 3,
    repetition_penalty: float = 1.05
) -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = PROCESSOR(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        output_ids = MODEL.generate(
            **inputs,
            max_length=max_length,
            num_beams=num_beams,          # smaller = faster on CPU
            early_stopping=True,
            repetition_penalty=repetition_penalty
        )
    text = PROCESSOR.decode(output_ids[0], skip_special_tokens=True)
    return text

@app.get("/")
def health():
    return {"ok": True, "device": DEVICE, "model_dir": str(MODEL_DIR)}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        report = generate_report_from_bytes(content)
        return {"report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")


# Optional root route so / isn't 404 in Render:
@app.get("/ping")
def ping():
    return {"pong": True}
