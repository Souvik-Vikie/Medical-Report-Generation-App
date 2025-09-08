import gradio as gr
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from PIL import Image
import io
import os
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
import logging
from huggingface_hub import snapshot_download

# Create FastAPI app
app = FastAPI(title="Medical Report Generator", version="1.0.0")

# Basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medical-report")

# CORS - Allow your frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for Hugging Face Spaces
ROOT = Path(__file__).parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", ROOT / "models" / "best"))
DEVICE = "cpu"

# CPU optimization for Spaces
try:
    torch.set_num_threads(max(1, torch.get_num_threads() // 2))
except Exception:
    pass

def download_model_if_needed():
    """Download model from Hugging Face if not present locally"""
    if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
        logger.info("Model not found locally. Downloading from Hugging Face...")
        
        try:
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            
            # Download from your model repository
            snapshot_download(
                repo_id="mtechaisouvik/medical-report-generator",
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
    """Load model and processor"""
    download_model_if_needed()
    
    if not MODEL_DIR.exists():
        raise RuntimeError(f"Model folder not found: {MODEL_DIR}")
    
    processor = BlipProcessor.from_pretrained(str(MODEL_DIR))
    model = BlipForConditionalGeneration.from_pretrained(
        str(MODEL_DIR),
        torch_dtype=torch.float32,
        low_cpu_mem_usage=True
    )
    model.to(DEVICE)
    model.eval()

    # Sanity checks
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
        logger.debug("Skipping detailed model parameter checks")
    
    return processor, model

# Load model globally
try:
    PROCESSOR, MODEL = load_model_and_processor()
    logger.info("Model loaded successfully on startup!")
except Exception as e:
    logger.error(f"Failed to load model on startup: {e}")
    PROCESSOR, MODEL = None, None

def generate_report_from_bytes(
    image_bytes: bytes,
    max_length: int = 64,
    num_beams: int = 3,
    repetition_penalty: float = 1.05
) -> str:
    """Generate report from image bytes - your original function"""
    if PROCESSOR is None or MODEL is None:
        raise RuntimeError("Model not loaded")
    
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = PROCESSOR(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    # Check inputs for NaN/Inf
    for k, v in inputs.items():
        try:
            if v.dtype.is_floating_point:
                if not torch.isfinite(v).all().item():
                    has_nan = torch.isnan(v).any().item()
                    has_inf = torch.isinf(v).any().item()
                    logger.error("Input tensor %s contains NaN=%s Inf=%s", k, has_nan, has_inf)
                    raise RuntimeError(f"Preprocessor produced invalid values (NaN/Inf) in '{k}'")
        except Exception:
            logger.debug("Could not run NaN/Inf checks on input %s", k)

    with torch.no_grad():
        output_ids = MODEL.generate(
            **inputs,
            max_length=max_length,
            num_beams=num_beams,
            early_stopping=True,
            repetition_penalty=repetition_penalty
        )
    
    if output_ids is None or len(output_ids) == 0:
        logger.error("Model.generate returned empty output_ids: %s", output_ids)
        raise RuntimeError("Model.generate returned no tokens")
    
    text = PROCESSOR.decode(output_ids[0], skip_special_tokens=True)

    # Your original complex error handling logic
    def try_sanitized_tokenizer_decode(out_ids):
        tokenizer = getattr(PROCESSOR, "tokenizer", None)
        if tokenizer is None:
            return None
        try:
            vocab_size = getattr(tokenizer, "vocab_size", None)
            unk_id = getattr(tokenizer, "unk_token_id", None)
            if unk_id is None and isinstance(vocab_size, int) and vocab_size > 0:
                unk_id = vocab_size - 1

            ids = list(out_ids.tolist()) if hasattr(out_ids, "tolist") else list(out_ids)
            sanitized = []
            for i in ids:
                if isinstance(vocab_size, int) and i >= vocab_size:
                    if unk_id is not None:
                        sanitized.append(unk_id)
                    else:
                        sanitized.append(max(0, (vocab_size - 1) if isinstance(vocab_size, int) else i))
                else:
                    sanitized.append(i)

            return tokenizer.decode(sanitized, skip_special_tokens=True)
        except Exception as e:
            logger.debug("Sanitized tokenizer decode failed: %s", e)
            return None

    if isinstance(text, str) and text.strip().lower() == "nan":
        logger.error("Decoded text is literal 'nan'")
        try:
            output_tokens = output_ids[0].tolist()
        except Exception:
            output_tokens = None

        tokenizer = getattr(PROCESSOR, "tokenizer", None)
        alt_decoded = None
        try:
            alt_decoded = try_sanitized_tokenizer_decode(output_ids[0]) if output_tokens is not None else None
            if alt_decoded is None and tokenizer is not None and output_tokens is not None:
                alt_decoded = tokenizer.decode(output_tokens, skip_special_tokens=True)
        except Exception as e:
            alt_decoded = f"<tokenizer.decode error: {e}>"

        if isinstance(alt_decoded, str) and alt_decoded.strip() and alt_decoded.strip().lower() != "nan":
            logger.info("Recovered alt_decoded from tokens: %r", alt_decoded)
            return alt_decoded

        raise RuntimeError("Decoded output is 'nan' — possible tokenizer/model mismatch")
    
    if not text or not text.strip():
        logger.error("Decoded text is empty or whitespace: %r", text)
        raise RuntimeError("Decoded output is empty")
    
    return text

# FastAPI endpoints (for API access)
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

@app.get("/ping")
def ping():
    return {"pong": True}

# Gradio interface functions
def generate_report_gradio(image):
    """Gradio wrapper for the report generation"""
    if image is None:
        return "Please upload an image first."
    
    try:
        # Convert PIL image to bytes
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG')
        img_bytes = img_buffer.getvalue()
        
        # Generate report using your existing function
        report = generate_report_from_bytes(img_bytes)
        return report
        
    except Exception as e:
        logger.error(f"Error in Gradio interface: {e}")
        return f"Error generating report: {str(e)}"

def check_model_status():
    """Check if model is loaded"""
    if PROCESSOR is not None and MODEL is not None:
        return "✅ Model loaded successfully!"
    else:
        return "❌ Model not loaded"

# Create Gradio interface
with gr.Blocks(
    title="Medical Report Generator",
    theme=gr.themes.Soft(),
    css=".gradio-container {max-width: 1200px; margin: auto;}"
) as gradio_app:
    
    gr.Markdown("# 🏥 Medical Report Generator")
    gr.Markdown("Upload a medical image to generate an automated report using AI.")
    
    with gr.Tab("Generate Report"):
        with gr.Row():
            with gr.Column(scale=1):
                image_input = gr.Image(
                    label="Upload Medical Image",
                    type="pil",
                    height=400
                )
                generate_btn = gr.Button(
                    "Generate Report", 
                    variant="primary",
                    size="lg"
                )
            
            with gr.Column(scale=1):
                report_output = gr.Textbox(
                    label="Generated Medical Report",
                    lines=12,
                    max_lines=15,
                    placeholder="Your medical report will appear here after uploading an image and clicking 'Generate Report'..."
                )
        
        # Connect the generate button
        generate_btn.click(
            fn=generate_report_gradio,
            inputs=image_input,
            outputs=report_output
        )
    
    with gr.Tab("API Information"):
        gr.Markdown("""
        ## API Endpoints
        
        This Space also provides API endpoints for integration:
        
        - **Health Check**: `GET /`
        - **Generate Report**: `POST /predict` (upload image file)
        - **Ping**: `GET /ping`
        
        ### Example API Usage:
        ```python
        import requests
        
        # Replace with your Space URL
        url = "https://your-username-medical-report-backend.hf.space/predict"
        
        with open("medical_image.jpg", "rb") as f:
            files = {"file": f}
            response = requests.post(url, files=files)
            result = response.json()
            print(result["report"])
        ```
        """)
        
        status_output = gr.Textbox(label="Model Status", lines=2)
        status_btn = gr.Button("Check Model Status")
        status_btn.click(check_model_status, outputs=status_output)

# Mount Gradio app with FastAPI
app = gr.mount_gradio_app(app, gradio_app, path="/")

# For Hugging Face Spaces
if __name__ == "__main__":
    gradio_app.launch(
        server_name="0.0.0.0",
        server_port=7860,
        show_error=True
    )