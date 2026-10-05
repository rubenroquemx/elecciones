from fastapi import FastAPI, UploadFile, File
from paddleocr import PaddleOCR
import uvicorn
import re
import io
from PIL import Image
import numpy as np

app = FastAPI(title="INE OCR Service")

# Initialize PaddleOCR with Spanish language support and angle classifier
ocr = PaddleOCR(use_angle_cls=True, lang="es", show_log=False)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Servicio Local de OCR para INE (PaddleOCR)",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "scan": "/scan-ine (POST)"
        }
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "paddleocr-ine"}

@app.post("/scan-ine")
async def scan_ine(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        img_np = np.array(image)
        
        result = ocr.ocr(img_np, cls=True)
        
        texts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) > 1 and line[1]:
                    texts.append(str(line[1][0]).strip())
                    
        full_text = " ".join(texts)
        
        # Regex extraction for Mexican Voter ID (INE / IFE)
        clave_match = re.search(r'\b([A-Z]{6}\d{8}[A-Z]\d{3})\b', full_text)
        clave = clave_match.group(1) if clave_match else ""
        
        curp_match = re.search(r'\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)\b', full_text)
        curp = curp_match.group(1) if curp_match else ""
        
        sec_match = re.search(r'(?:SECCI[OÓó]N|SEC)[\s.:#-]*(\d{4})\b', full_text, re.IGNORECASE)
        seccion = sec_match.group(1) if sec_match else ""
        
        # Heuristic for Full Name
        nombre = ""
        for i, t in enumerate(texts):
            if "NOMBRE" in t.upper() and i + 1 < len(texts):
                name_parts = []
                for j in range(i + 1, min(i + 4, len(texts))):
                    upper_line = texts[j].upper()
                    if any(k in upper_line for k in ["DOMICILIO", "EDAD", "SEXO", "CLAVE", "CURP", "FECHA", "FOLIO"]):
                        break
                    name_parts.append(texts[j])
                if name_parts:
                    nombre = " ".join(name_parts)
                break
                
        is_valid = bool(clave or curp or seccion or "INSTITUTO NACIONAL ELECTORAL" in full_text.upper() or "CREDENCIAL PARA VOTAR" in full_text.upper())
        
        return {
            "isValidINE": is_valid,
            "name": nombre,
            "fullName": nombre,
            "claveElector": clave,
            "curp": curp,
            "electoralSection": seccion,
            "rawTexts": texts
        }
    except Exception as e:
        return {
            "isValidINE": False,
            "error": str(e),
            "claveElector": "",
            "curp": "",
            "electoralSection": "",
            "rawTexts": []
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
