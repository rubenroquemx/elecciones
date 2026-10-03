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

  // Grayscale with contrast adjustment (preserves character strokes without harsh threshold clipping)
  const contrastFactor = 1.25;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // Perceptual grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Contrast enhancement around midtone
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrastFactor + 128));

    d[i] = enhanced;
    d[i + 1] = enhanced;
    d[i + 2] = enhanced;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Normalizes digit-like characters produced by OCR into actual numbers
 */
function cleanDigits(str: string): string {
  return str
    .replace(/[OOD]/g, '0')
    .replace(/[ILl|!]/g, '1')
    .replace(/[Zz]/g, '2')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');
}

export const INE_NON_NAME_PATTERN = /INSTITUTO|NACIONAL|ELECTORAL|CREDENCIAL|VOTAR|REGISTRO|FEDERAL|ELECTORES|ESTADOS|UNIDOS|MEXICANOS|DOMICILIO|CLAVE|FOLIO|CURP|SECCION|LOCALIDAD|MUNICIPIO|DISTRITO|FECHA|NACIMIENTO|SEXO|EDAD|VIGENCIA|EMISION|DESDE|HASTA|ANO|AÑO|FIRMA|HOMBRE|MUJER|ESTADO/i;

export function isValidPersonName(candidate: string): boolean {
  if (!candidate || candidate.trim().length < 4) return false;
  if (INE_NON_NAME_PATTERN.test(candidate)) return false;

  const words = candidate.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;

  // Reject candidates where words are single letters (e.g. 'METE E E LE E DE')
  const singleLetterWords = words.filter(w => w.length === 1);
  if (singleLetterWords.length > 1 || singleLetterWords.length / words.length > 0.3) {
    return false;
  }

  // Count valid word tokens (at least 2 letters each)
  const validWords = words.filter(w => w.length >= 2 && /^[A-ZÁÉÍÓÚÑ]+$/i.test(w));
  if (validWords.length < 2) return false;

  return true;
}

export function sanitizeCURP(raw: string): string {
  if (!raw) return raw;
  const sanitized = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (sanitized.length !== 18) return raw;

  const chars = sanitized.split('');

  // Pos 0-3: 4 letras del nombre
  for (let i = 0; i < 4; i++) {
    if (chars[i] === '0') chars[i] = 'O';
    else if (chars[i] === '1') chars[i] = 'I';
    else if (chars[i] === '2') chars[i] = 'Z';
    else if (chars[i] === '5') chars[i] = 'S';
    else if (chars[i] === '8') chars[i] = 'B';
  }

  // Pos 4-9: 6 dígitos de fecha (YYMMDD)
  for (let i = 4; i <= 9; i++) {
    if (chars[i] === 'O' || chars[i] === 'D') chars[i] = '0';
    else if (chars[i] === 'I' || chars[i] === 'L') chars[i] = '1';
    else if (chars[i] === 'Z') chars[i] = '2';
    else if (chars[i] === 'S') chars[i] = '5';
    else if (chars[i] === 'B') chars[i] = '8';
  }

  // Pos 10: Sexo (H / M)
  if (chars[10] !== 'H' && chars[10] !== 'M') {
    if (chars[10] === '1' || chars[10] === 'I') chars[10] = 'H';
    else if (chars[10] === '0' || chars[10] === 'O') chars[10] = 'M';
  }

  // Pos 11-15: 5 letras (2 de entidad federativa + 3 consonantes internas)
  for (let i = 11; i <= 15; i++) {
    if (chars[i] === '0') chars[i] = 'O';
    else if (chars[i] === '1') chars[i] = 'I';
    else if (chars[i] === '2') chars[i] = 'Z';
    else if (chars[i] === '5') chars[i] = 'S';
    else if (chars[i] === '8') chars[i] = 'B';
  }

  // Pos 17: Último dígito (0-9)
  if (chars[17] === 'O' || chars[17] === 'D') chars[17] = '0';
  else if (chars[17] === 'I' || chars[17] === 'L') chars[17] = '1';
  else if (chars[17] === 'Z') chars[17] = '2';
  else if (chars[17] === 'S') chars[17] = '5';
  else if (chars[17] === 'B') chars[17] = '8';

  return chars.join('');
}

/**
 * Parses raw OCR text using official Mexican INE formats (Modelos C, D, E, F, G, H)
 */
export function parseINETemplate(rawText: string): ExtractedINEData {
  const clean = rawText
    .toUpperCase()
    .replace(/[|]/g, 'I')
    .replace(/[{}[\]]/g, '')
    .replace(/\r/g, '\n');

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  let confidenceScore = 0;
  let detectedSide: 'anverso' | 'reverso' | 'desconocido' = 'desconocido';

  const result: ExtractedINEData = {
    rawText,
    confidenceScore: 0,
    detectedSide: 'desconocido',
  };

  // 1. Check for MRZ lines (Reverso de la credencial INE / IFE)
  // Formato TD1: 3 líneas de 30 caracteres con '<<' y prefijo 'IDMEX'
  const mrzLines = lines.filter(l => l.includes('<<') || l.startsWith('IDMEX'));
  if (mrzLines.length >= 1 || clean.includes('IDMEX')) {
    detectedSide = 'reverso';
    confidenceScore += 30;

    // A. Clave de elector desde MRZ (Línea 1 o 2 con 18 caracteres de clave)
    const rawClaveMrz = clean.match(/([A-Z]{6}\d{8}[HM]\d{3})/);
    if (rawClaveMrz) {
      result.claveElector = rawClaveMrz[1];
      confidenceScore += 30;
    }

    // B. Sección electoral desde MRZ (En línea 1 tras IDMEX: ej. IDMEX...<<0416...)
    const seccionMrzMatch = clean.match(/IDMEX[0-9A-Z]*<<\s*0*(\d{3,4})/);
    if (seccionMrzMatch) {
      result.electoralSection = seccionMrzMatch[1].padStart(4, '0');
      confidenceScore += 25;
    }

    // C. Nombre Completo desde MRZ (Línea 3: APELLIDOS<<NOMBRES)
    const nameMrzLine = mrzLines.find(l => !l.startsWith('IDMEX') && !/^\d{6}/.test(l));
    if (nameMrzLine) {
      const parts = nameMrzLine.split('<<');
      const apellidos = (parts[0] || '').replace(/</g, ' ').trim();
      const nombres = (parts[1] || '').replace(/</g, ' ').trim();
      if (apellidos || nombres) {
        result.name = `${nombres} ${apellidos}`.replace(/\s+/g, ' ').trim();
        confidenceScore += 30;
      }
    }
  }

  // 2. Clave de Elector (Anverso o texto directo)
  // Formato oficial: 6 letras, 8 dígitos (YYMMDD + Entidad), H/M, 3 dígitos
  if (!result.claveElector) {
    const exactClave = clean.match(/\b([A-Z]{6}\d{8}[HM]\d{3})\b/);
    if (exactClave) {
      result.claveElector = exactClave[1];
      confidenceScore += 35;
    } else {
      // Regex tolerante a espacios y sustitución de caracteres (O por 0, I por 1, etc.)
      const relaxedClave = clean.match(/\b([A-Z]{6})[\s-]*([0-9OIZSBLD]{8})[\s-]*([HM])[\s-]*([0-9OIZSBLD]{3})\b/);
      if (relaxedClave) {
        const d1 = cleanDigits(relaxedClave[2]);
        const d2 = cleanDigits(relaxedClave[4]);
        result.claveElector = `${relaxedClave[1]}${d1}${relaxedClave[3]}${d2}`;
        confidenceScore += 30;
      } else {
        const labeledClave = clean.match(/(?:CLAVE|ELECTOR)[\s.:#]*([A-Z0-9\s]{16,22})/i);
        if (labeledClave) {
          const sanitized = labeledClave[1].replace(/[^A-Z0-9]/g, '');
          if (sanitized.length === 18) {
            result.claveElector = sanitized;
            confidenceScore += 25;
          }
        }
      }
    }
  }

  // 3. CURP (18 caracteres oficiales: 4 letras, 6 fecha, H/M, 5 letras, 1 letra/num, 1 num)
  if (!result.curp) {
    const curpMatch = clean.match(/\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)\b/);
    if (curpMatch) {
      result.curp = sanitizeCURP(curpMatch[1]);
      confidenceScore += 25;
    } else {
      const relaxedCurp = clean.match(/\b([A-Z0-9]{4})[\s-]*([0-9OIZSBLD]{6})[\s-]*([HM0-9])[\s-]*([A-Z0-9]{5}[A-Z0-9][0-9OIZSBLD])\b/);
      if (relaxedCurp) {
        const candidate = `${relaxedCurp[1]}${relaxedCurp[2]}${relaxedCurp[3]}${relaxedCurp[4]}`;
        const sanitized = sanitizeCURP(candidate);
        if (/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(sanitized)) {
          result.curp = sanitized;
          confidenceScore += 25;
        }
      } else {
        const labeledCurp = clean.match(/CURP[\s.:#]*([A-Z0-9\s]{17,22})/i);
        if (labeledCurp) {
          const rawCandidate = labeledCurp[1].replace(/[^A-Z0-9]/g, '');
          if (rawCandidate.length === 18) {
            result.curp = sanitizeCURP(rawCandidate);
            confidenceScore += 25;
          }
        }
      }
    }
  }

  // 4. Sección Electoral
  if (!result.electoralSection) {
    const seccionMatch = clean.match(/(?:SECCI[OÓ0]N|SEC|SECC)[\s.:#\n]*0*(\d{3,4})\b/i);
    if (seccionMatch) {
      result.electoralSection = seccionMatch[1].padStart(4, '0');
      confidenceScore += 20;
    } else {
      const contextMatch = clean.match(/(?:ESTADO|MUNICIPIO|LOCALIDAD)[\s\S]{1,40}\b0*(\d{3,4})\b/i);
      if (contextMatch) {
        result.electoralSection = contextMatch[1].padStart(4, '0');
        confidenceScore += 10;
      }
    }
  }

  // 5. Vigencia
  const vigenciaMatch = clean.match(/(?:VIGENCIA|HASTA|A[NÑ]O\s*DE\s*REGISTRO)[\s.:]*(\d{4})/i);
  if (vigenciaMatch) {
    result.vigencia = vigenciaMatch[1];
  }

  // 6. Nombre Completo (Anverso)
  if (!result.name) {
    detectedSide = 'anverso';

    // Modelo con etiquetas explícitas: APELLIDO PATERNO, APELLIDO MATERNO, NOMBRE
    const patIdx = lines.findIndex(l => /APELLIDO\s*PATERNO/i.test(l));
    const matIdx = lines.findIndex(l => /APELLIDO\s*MATERNO/i.test(l));
    const nomIdx = lines.findIndex(l => /^NOMBRE\b|NOMBRE\s*$/i.test(l.trim()));

    if (patIdx !== -1 && lines[patIdx + 1]) {
      const pat = lines[patIdx + 1].replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim();
      const mat = matIdx !== -1 && lines[matIdx + 1] ? lines[matIdx + 1].replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim() : '';
      const nom = nomIdx !== -1 && lines[nomIdx + 1] ? lines[nomIdx + 1].replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim() : '';
      const assembled = [nom, pat, mat].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (isValidPersonName(assembled)) {
        result.name = assembled;
        confidenceScore += 25;
      }
    } else if (nomIdx !== -1 && lines[nomIdx + 1]) {
      // Formato INE moderno: "NOMBRE" seguido de 2 o 3 líneas (Paterno, Materno, Nombres)
      const candidateLines = lines.slice(nomIdx + 1, nomIdx + 5)
        .filter(l => !INE_NON_NAME_PATTERN.test(l))
        .map(l => l.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim())
        .filter(l => l.length >= 2);

      const candidate = candidateLines.join(' ').replace(/\s+/g, ' ').trim();
      if (isValidPersonName(candidate)) {
        result.name = candidate;
        confidenceScore += 25;
      }
    } else {
      // Búsqueda heurística entre "CREDENCIAL PARA VOTAR" y "DOMICILIO"
      const credIdx = lines.findIndex(l => /CREDENCIAL|ELECTORAL|VOTAR/i.test(l));
      const domIdx = lines.findIndex(l => /DOMICILIO/i.test(l));
      if (credIdx !== -1 && domIdx !== -1 && domIdx > credIdx + 1) {
        const middleLines = lines.slice(credIdx + 1, domIdx)
          .filter(l => !INE_NON_NAME_PATTERN.test(l))
          .map(l => l.replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '').trim())
          .filter(l => l.length >= 3);
        const candidate = middleLines.join(' ').replace(/\s+/g, ' ').trim();
        if (isValidPersonName(candidate)) {
          result.name = candidate;
          confidenceScore += 15;
        }
      }
    }
  }

  // 7. Domicilio y Colonia
  const domicilioIndex = lines.findIndex(l => /DOMICILIO/i.test(l));
  if (domicilioIndex !== -1 && lines[domicilioIndex + 1]) {
    const domLines = lines.slice(domicilioIndex + 1, domicilioIndex + 4)
      .filter(l => !/CLAVE|CURP|FOLIO|SECCI[OÓ]N|A[NÑ]O|REGISTRO|ESTADO|MUNICIPIO/i.test(l))
      .map(l => l.trim())
      .filter(Boolean);

    if (domLines.length > 0) {
      result.address = domLines[0];
      if (domLines[1]) {
        result.colonia = domLines[1].replace(/^(?:COL\.?|FRACC\.?|C\.P\.?\s*\d{5})\s*/i, '').trim();
      }
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
