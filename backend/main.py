from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from PIL import Image
import io
import os
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
import logging

# NEW: Import for Hugging Face model download
from huggingface_hub import snapshot_download

app = FastAPI(title="Medical Report Generator", version="1.0.0")

# basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medical-report")

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

# NEW: Function to download model from Hugging Face if not present
def download_model_if_needed():
    """Download model from Hugging Face if not present locally"""
    if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
        logger.info("Model not found locally. Downloading from Hugging Face...")
        
        try:
            # Create directory if it doesn't exist
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            
            # Download entire model directory
            # REPLACE 'your-username/medical-report-generator' with your actual Hugging Face repo
            snapshot_download(
                repo_id="mtechaisouvik/medical-report-generator",  # ← REPLACE THIS
                local_dir=str(MODEL_DIR),
                local_dir_use_symlinks=False
            )
            logger.info("Model downloaded successfully!")
            
        except Exception as e:
            logger.error(f"Error downloading model: {e}")
            raise RuntimeError(f"Failed to download model from Hugging Face: {e}")
    else:
        logger.info("Model found locally.")

def load_model_and_processor():
    # NEW: Ensure model is downloaded before loading
    download_model_if_needed()
    
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

    # Quick sanity checks for NaN/Inf in model params (rare but possible with bad checkpoints)
    try:
        for name, p in model.named_parameters():
            if p.dtype.is_floating_point:
                if torch.isnan(p).any().item():
                    logger.error("Model parameter contains NaN: %s", name)
                    raise RuntimeError(f"Model contains NaN in parameter {name}")
                if torch.isinf(p).any().item():
                    logger.error("Model parameter contains Inf: %s", name)
                    raise RuntimeError(f"Model contains Inf in parameter {name}")
    except Exception:
        # If model parameters are not simple Tensors or check fails, skip checks gracefully
        logger.debug("Skipping detailed model parameter checks")
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

    # Check inputs for NaN/Inf which can break generation
    for k, v in inputs.items():
        try:
            if v.dtype.is_floating_point:
                if not torch.isfinite(v).all().item():
                    # log a compact summary and raise
                    has_nan = torch.isnan(v).any().item()
                    has_inf = torch.isinf(v).any().item()
                    logger.error("Input tensor %s contains NaN=%s Inf=%s", k, has_nan, has_inf)
                    raise RuntimeError(f"Preprocessor produced invalid values (NaN/Inf) in '{k}'")
        except Exception:
            # If the tensor doesn't support the checks, ignore safely
            logger.debug("Could not run NaN/Inf checks on input %s", k)

    with torch.no_grad():
        output_ids = MODEL.generate(
            **inputs,
            max_length=max_length,
            num_beams=num_beams,          # smaller = faster on CPU
            early_stopping=True,
            repetition_penalty=repetition_penalty
        )
    if output_ids is None or len(output_ids) == 0:
        logger.error("Model.generate returned empty output_ids: %s", output_ids)
        raise RuntimeError("Model.generate returned no tokens")
    # Primary decode via processor
    text = PROCESSOR.decode(output_ids[0], skip_special_tokens=True)

    # If processor decode produced something invalid, attempt a safer tokenizer-based decode
    def try_sanitized_tokenizer_decode(out_ids):
        tokenizer = getattr(PROCESSOR, "tokenizer", None)
        if tokenizer is None:
            return None
        try:
            vocab_size = getattr(tokenizer, "vocab_size", None)
            unk_id = getattr(tokenizer, "unk_token_id", None)
            # fallback to last token index if unk_id not available but vocab_size is
            if unk_id is None and isinstance(vocab_size, int) and vocab_size > 0:
                unk_id = vocab_size - 1

            ids = list(out_ids.tolist()) if hasattr(out_ids, "tolist") else list(out_ids)
            sanitized = []
            for i in ids:
                if isinstance(vocab_size, int) and i >= vocab_size:
                    # map out-of-range id to unk or last token
                    if unk_id is not None:
                        sanitized.append(unk_id)
                    else:
                        # if we truly can't map, clamp to vocab_size-1
                        sanitized.append(max(0, (vocab_size - 1) if isinstance(vocab_size, int) else i))
                else:
                    sanitized.append(i)

            # decode sanitized ids
            return tokenizer.decode(sanitized, skip_special_tokens=True)
        except Exception as e:
            logger.debug("Sanitized tokenizer decode failed: %s", e)
            return None

    # Defensive: if decode yields a lone numeric 'nan' or an empty string, gather debug info and raise
    if isinstance(text, str) and text.strip().lower() == "nan":
        logger.error("Decoded text is literal 'nan' (possible tokenizer/model mismatch)")

        # gather compact debug info
        try:
            output_tokens = output_ids[0].tolist()
        except Exception:
            output_tokens = None

            tokenizer = getattr(PROCESSOR, "tokenizer", None)
            alt_decoded = None
            try:
                # prefer sanitized decode which handles out-of-range ids
                alt_decoded = try_sanitized_tokenizer_decode(output_ids[0]) if output_tokens is not None else None
                if alt_decoded is None and tokenizer is not None and output_tokens is not None:
                    alt_decoded = tokenizer.decode(output_tokens, skip_special_tokens=True)
            except Exception as e:
                alt_decoded = f"<tokenizer.decode error: {e}>"

        model_info = {
            "model_type": getattr(MODEL.config, "model_type", None),
            "vocab_size": getattr(MODEL.config, "vocab_size", None),
            "eos_token_id": getattr(MODEL.config, "eos_token_id", None),
            "bos_token_id": getattr(MODEL.config, "bos_token_id", None),
            "pad_token_id": getattr(MODEL.config, "pad_token_id", None),
        }

        tokenizer_info = None
        try:
            if tokenizer is not None:
                tokenizer_info = {
                    "vocab_size": getattr(tokenizer, "vocab_size", None) or len(getattr(tokenizer, "get_vocab", lambda: {})()),
                    "special_tokens_map": getattr(tokenizer, "special_tokens_map", None),
                }
        except Exception:
            tokenizer_info = None

        logger.info("Decoded 'nan' debug: tokens=%s model=%s tokenizer_alt=%s tokenizer_info=%s",
                    (output_tokens[:50] if isinstance(output_tokens, list) else output_tokens),
                    model_info,
                    (alt_decoded if alt_decoded is not None else "<no alt decode>"),
                    tokenizer_info)
        # If sanitized alt decode gives a usable string, return it instead of erroring
        if isinstance(alt_decoded, str) and alt_decoded.strip() and alt_decoded.strip().lower() != "nan":
            logger.info("Recovered alt_decoded from tokens: %r", alt_decoded)
            return alt_decoded

        # otherwise raise with diagnostic info
        raise RuntimeError(
            "Decoded output is 'nan' — possible tokenizer/model mismatch or corrupted checkpoint; "
            f"tokens={output_tokens[:50] if isinstance(output_tokens, list) else output_tokens} "
            f"alt_decoded={alt_decoded!r} model={model_info} tokenizer={tokenizer_info}"
        )
    if not text or not text.strip():
        logger.error("Decoded text is empty or whitespace: %r", text)
        raise RuntimeError("Decoded output is empty")
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