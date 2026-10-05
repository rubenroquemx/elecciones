FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    "numpy<2.0.0" \
    paddlepaddle==2.6.2 \
    paddleocr==2.7.3 \
    fastapi \
    uvicorn \
    python-multipart \
    pillow

COPY main.py .

EXPOSE 8000

CMD ["python", "main.py"]
