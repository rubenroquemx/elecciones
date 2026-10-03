import { createWorker } from 'tesseract.js';

export interface ExtractedINEData {
  rawText: string;
  name?: string;
  claveElector?: string;
  curp?: string;
  electoralSection?: string;
  address?: string;
  colonia?: string;
  municipio?: string;
  vigencia?: string;
  confidenceScore: number;
  detectedSide?: 'anverso' | 'reverso' | 'desconocido';
}

/**
 * Pre-processes an image on an offscreen canvas to optimize OCR contrast and reduce noise:
 * - Resizes image to optimal OCR dimensions (1200x760 px approx for ID-1 cards)
 * - Converts to grayscale with high contrast filter
 * - Enhances dark text against holographic and colored backgrounds
 */
export function preprocessINEImage(imageSource: CanvasImageSource, sourceWidth: number, sourceHeight: number): string {
  const canvas = document.createElement('canvas');
  // Optimal resolution for mobile OCR without exhausting RAM
  const targetWidth = 1280;
  const targetHeight = Math.round((sourceHeight / sourceWidth) * 1280);
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  // Grayscale & dynamic contrast stretching
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // Perceptual luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // High contrast thresholding to suppress holographic pattern noise
    const val = gray < 125 ? Math.max(0, gray - 35) : Math.min(255, gray + 45);

    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Parses raw OCR text using official Mexican INE formats (Modelos C, D, E, F, G, H)
 */
export function parseINETemplate(rawText: string): ExtractedINEData {
  const clean = rawText
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .replace(/[{}]/g, '')
    .replace(/\r/g, '\n');

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  let confidenceScore = 0;
  let detectedSide: 'anverso' | 'reverso' | 'desconocido' = 'desconocido';

  const result: ExtractedINEData = {
    rawText,
    confidenceScore: 0,
    detectedSide: 'desconocido',
  };

  // 1. Clave de Elector (18 alfanuméricos: 6 letras, 6 fecha, 2 entidad, H/M, 3 dígitos)
  // Ejemplos: ROQRRU85061427H101, MEEC78031227H001, GADM82051927M002
  const claveMatch = clean.match(/\b([A-Z]{6}\d{8}[HM]\d{3})\b/);
  if (claveMatch) {
    result.claveElector = claveMatch[1];
    confidenceScore += 35;
  } else {
    // Tolerant regex in case of minor OCR space or digit noise
    const tolerantMatch = clean.match(/CLAVE\s*DE\s*ELECTOR[\s.:]*([A-Z0-9\s]{17,21})/i);
    if (tolerantMatch) {
      const sanitized = tolerantMatch[1].replace(/\s+/g, '');
      if (sanitized.length === 18) {
        result.claveElector = sanitized;
        confidenceScore += 25;
      }
    }
  }

  // 2. CURP (18 caracteres oficiales mexicanos)
  const curpMatch = clean.match(/\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)\b/);
  if (curpMatch) {
    result.curp = curpMatch[1];
    confidenceScore += 25;
  }

  // 3. Sección Electoral (3 o 4 dígitos precedidos por SECCION, SECCIÓN o SEC)
  const seccionMatch = clean.match(/(?:SECCI[OÓ0]N|SEC)[\s.:#]*0*(\d{3,4})\b/i);
  if (seccionMatch) {
    result.electoralSection = seccionMatch[1].padStart(4, '0');
    confidenceScore += 20;
  } else {
    // Try looking for 4 digits standing alone near "MUNICIPIO" or "DISTRITO"
    const standaloneMatch = clean.match(/\b(?:0[1-9]\d{2}|1\d{3})\b/);
    if (standaloneMatch) {
      result.electoralSection = standaloneMatch[0].padStart(4, '0');
      confidenceScore += 10;
    }
  }

  // 4. Vigencia
  const vigenciaMatch = clean.match(/(?:VIGENCIA|HASTA|A[NÑ]O\s*DE\s*REGISTRO)[\s.:]*(\d{4})/i);
  if (vigenciaMatch) {
    result.vigencia = vigenciaMatch[1];
  }

  // 5. Nombre Completo
  // En las credenciales INE el bloque del nombre aparece después de la palabra "NOMBRE"
  const nombreIndex = lines.findIndex(l => /NOMBRE/i.test(l));
  if (nombreIndex !== -1 && lines[nombreIndex + 1]) {
    detectedSide = 'anverso';
    const candidateLines = lines.slice(nombreIndex + 1, nombreIndex + 4)
      .filter(l => !/DOMICILIO|EDAD|SEXO|NACIONALIDAD|CLAVE|FOLIO|CURP/i.test(l))
      .map(l => l.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim())
      .filter(l => l.length > 2);

    if (candidateLines.length > 0) {
      result.name = candidateLines.join(' ').replace(/\s+/g, ' ').trim();
      confidenceScore += 20;
    }
  }

  // 6. Domicilio y Colonia
  const domicilioIndex = lines.findIndex(l => /DOMICILIO/i.test(l));
  if (domicilioIndex !== -1 && lines[domicilioIndex + 1]) {
    detectedSide = 'anverso';
    const domLines = lines.slice(domicilioIndex + 1, domicilioIndex + 3)
      .filter(l => !/CLAVE|CURP|FOLIO|SECCI[OÓ]N|A[NÑ]O|REGISTRO/i.test(l))
      .map(l => l.trim())
      .filter(Boolean);

    if (domLines.length > 0) {
      result.address = domLines[0];
      if (domLines[1]) {
        result.colonia = domLines[1].replace(/COL\.?|FRACC\.?/i, '').trim();
      }
    }
  }

  // 7. Check for MRZ lines (Reverso de la credencial)
  // Formato TD1: 3 líneas de 30 caracteres con '<<' y prefijo 'IDMEX'
  const mrzLines = lines.filter(l => l.includes('<<') || l.startsWith('IDMEX'));
  if (mrzLines.length >= 2 || clean.includes('IDMEX')) {
    detectedSide = 'reverso';
    confidenceScore += 20;

    // In MRZ, line 1 contains IDMEX, line 2 has birth date, and line 3 has names/elector key
    const rawClaveMrz = clean.match(/([A-Z]{6}\d{8}[HM]\d{3})/);
    if (rawClaveMrz && !result.claveElector) {
      result.claveElector = rawClaveMrz[1];
      confidenceScore += 30;
    }
  }

  result.confidenceScore = Math.min(100, confidenceScore);
  result.detectedSide = detectedSide;

  return result;
}

// Singleton worker promise to reuse Tesseract instance
let cachedWorkerPromise: Promise<any> | null = null;

async function getOrCreateTesseractWorker(onProgress?: (progress: number, status: string) => void) {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      // Create local worker with Spanish + English numbers support
      const worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100), 'Reconociendo datos del INE...');
          } else if (onProgress && m.status) {
            onProgress(20, 'Preparando motor OCR local...');
          }
        },
      });
      return worker;
    })();
  }
  return cachedWorkerPromise;
}

/**
 * Native Barcode / PDF417 detector if supported by user browser (Android Chrome, Chromium)
 */
async function tryDetectNativeBarcode(canvas: HTMLCanvasElement): Promise<{ clave?: string; curp?: string } | null> {
  try {
    if ('BarcodeDetector' in window) {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const formats = await BarcodeDetectorClass.getSupportedFormats();
      if (formats.includes('pdf417') || formats.includes('qr_code')) {
        const detector = new BarcodeDetectorClass({ formats: ['pdf417', 'qr_code'] });
        const barcodes = await detector.detect(canvas);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue;
          const parsed = parseINETemplate(raw);
          if (parsed.claveElector || parsed.curp) {
            return { clave: parsed.claveElector, curp: parsed.curp };
          }
        }
      }
    }
  } catch (e) {
    // Graceful fallback to OCR
  }
  return null;
}

/**
 * Main OCR scanning entry point:
 * - Runs 100% on device via WebAssembly
 * - 0 tokens spent, $0 cost, unlimited scans
 * - Caches models in IndexedDB for complete offline use
 */
export async function scanINEImage(
  imageSource: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedINEData> {
  onProgress?.(10, 'Preprocesando imagen en alta fidelidad...');

  // 1. Preprocess in canvas
  const processedDataUrl = preprocessINEImage(imageSource, sourceWidth, sourceHeight);

  // 2. Try fast native barcode / PDF417 if present on back
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(imageSource, 0, 0);
    const barcodeResult = await tryDetectNativeBarcode(canvas);
    if (barcodeResult?.clave) {
      onProgress?.(100, 'Código de barras detectado con éxito');
      return {
        rawText: barcodeResult.clave,
        claveElector: barcodeResult.clave,
        curp: barcodeResult.curp,
        confidenceScore: 98,
        detectedSide: 'reverso',
      };
    }
  }

  // 3. Run Tesseract.js WebAssembly OCR
  onProgress?.(25, 'Iniciando motor de visión local...');
  const worker = await getOrCreateTesseractWorker(onProgress);

  onProgress?.(45, 'Analizando caracteres y campos oficiales...');
  const ret = await worker.recognize(processedDataUrl);
  const rawText = ret.data.text;

  onProgress?.(90, 'Extrayendo campos y validando formato INE...');
  const parsed = parseINETemplate(rawText);

  onProgress?.(100, 'Captura completada');
  return parsed;
}
