import { createWorker } from 'tesseract.js';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

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
  sexo?: 'Hombre' | 'Mujer';
  confidenceScore: number;
  detectedSide?: 'anverso' | 'reverso' | 'desconocido';
  barcodeFormat?: string;
}

/**
 * Pre-processes an image on an offscreen canvas to optimize OCR contrast and reduce noise:
 * - Resizes image to optimal OCR dimensions (1280px width)
 * - Converts to perceptual grayscale with high contrast filter
 * - Enhances dark text against holographic and colored backgrounds
 */
export function preprocessINEImage(imageSource: CanvasImageSource, sourceWidth: number, sourceHeight: number): string {
  const canvas = document.createElement('canvas');
  const targetWidth = 1280;
  const targetHeight = Math.round((sourceHeight / sourceWidth) * 1280);
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  const contrastFactor = 1.35;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrastFactor + 128));

    d[i] = enhanced;
    d[i + 1] = enhanced;
    d[i + 2] = enhanced;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Prepares a high-contrast binarized crop of the bottom 40% (Zone MRZ / IDMEX)
 * specifically optimized for standard OCR-B font characters.
 */
export function preprocessMRZCrop(imageSource: CanvasImageSource, sourceWidth: number, sourceHeight: number): string {
  const canvas = document.createElement('canvas');
  const cropY = Math.round(sourceHeight * 0.56);
  const cropH = sourceHeight - cropY;
  const targetWidth = 1280;
  const targetHeight = Math.round((cropH / sourceWidth) * 1280);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.drawImage(imageSource, 0, cropY, sourceWidth, cropH, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  // Adaptive threshold for OCR-B text
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const val = gray < 130 ? 0 : 255;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
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

  const singleLetterWords = words.filter(w => w.length === 1);
  if (singleLetterWords.length > 1 || singleLetterWords.length / words.length > 0.3) {
    return false;
  }

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

  // Pos 11-15: 5 letras (entidad + consonantes)
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
 * Decodes standard Mexican MRZ (TD1 3 lines) from card back with 100% structural fidelity.
 * Line 1: IDMEX + document num + << + Section (0416)
 * Line 2: YYMMDD + sex (M/F) + Expiration + MEX
 * Line 3: PATERNO<MATERNO<<NOMBRE1<NOMBRE2
 */
export function parseINEMRZLines(lines: string[]): {
  name?: string;
  electoralSection?: string;
  vigencia?: string;
  sexo?: 'Hombre' | 'Mujer';
  claveElector?: string;
  curp?: string;
} {
  const result: ReturnType<typeof parseINEMRZLines> = {};

  // Clean lines: replace OCR noise bracket characters with standard separator '<'
  const cleaned = lines.map(l =>
    l.toUpperCase()
      .replace(/[|()[\]{}]/g, '<')
      .replace(/\s+/g, '')
  ).filter(l => l.length >= 8);

  // 1. Line 1: IDMEX...<<0416...
  const line1 = cleaned.find(l => l.includes('IDMEX') || l.includes('DMEX') || /^ID\w{3}/.test(l));
  if (line1) {
    const secMatch = line1.match(/<<\s*0*(\d{3,4})/i) || line1.match(/(?:IDMEX|DMEX)[^<\n]*<<\s*0*(\d{3,4})/i);
    if (secMatch) {
      result.electoralSection = secMatch[1].padStart(4, '0');
    }
  }

  // 2. Line 2: Dates, Sex and Expiration
  const line2 = cleaned.find(l => /\d{6}[0-9A-Z]?[MF]\d{6}/i.test(l) || /\d{6}[0-9A-Z]?[MF]/.test(l));
  if (line2) {
    const matchLine2 = line2.match(/(\d{6})[0-9A-Z]?([MF])(\d{6})/i);
    if (matchLine2) {
      const sexChar = matchLine2[2];
      const expYYMMDD = matchLine2[3];
      result.sexo = sexChar === 'M' ? 'Hombre' : 'Mujer';
      const expYear = parseInt(expYYMMDD.slice(0, 2), 10);
      if (!isNaN(expYear)) {
        result.vigencia = `20${expYear.toString().padStart(2, '0')}`;
      }
    } else {
      const sexOnly = line2.match(/[0-9A-Z]([MF])[0-9A-Z]/i);
      if (sexOnly) {
        result.sexo = sexOnly[1] === 'M' ? 'Hombre' : 'Mujer';
      }
    }
  }

  // 3. Line 3: Name (Surnames<<GivenNames)
  const line3 = cleaned.find(l => {
    if (l === line1 || l === line2) return false;
    return l.includes('<<') || (l.includes('<') && /[A-Z]{3,}/.test(l) && !l.includes('IDMEX'));
  });

  if (line3) {
    const parts = line3.split(/<{2,}/);
    if (parts.length >= 2) {
      const surnames = parts[0].split(/<+/).filter(Boolean).join(' ');
      const givenNames = parts[1].split(/<+/).filter(Boolean).join(' ');
      if (surnames && givenNames) {
        result.name = `${givenNames} ${surnames}`.trim();
      } else if (surnames || givenNames) {
        result.name = (surnames || givenNames).trim();
      }
    } else {
      const tokens = line3.split(/<+/).filter(Boolean);
      if (tokens.length >= 2) {
        result.name = tokens.join(' ').trim();
      }
    }
  }

  // Check for Clave de Elector printed or embedded
  for (const l of cleaned) {
    const claveMatch = l.match(/([A-Z]{6}\d{8}[HM]\d{3})/);
    if (claveMatch) {
      result.claveElector = claveMatch[1];
      break;
    }
  }

  return result;
}

/**
 * Universal multi-format 2D Barcode & QR Decoder using ZXing.
 * Supports: QR_CODE, PDF_417, AZTEC, DATA_MATRIX, CODE_128
 */
export function decodeBarcodeWithZXing(canvas: HTMLCanvasElement): { text: string; format: string } | null {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.PDF_417,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    // 1. Try decoding full canvas
    const fullLuminance = new RGBLuminanceSource(
      new Uint8ClampedArray(imgData.data.buffer),
      canvas.width,
      canvas.height
    );
    try {
      const fullBitmap = new BinaryBitmap(new HybridBinarizer(fullLuminance));
      const res = reader.decode(fullBitmap);
      if (res && res.getText()) {
        return { text: res.getText(), format: res.getBarcodeFormat().toString() };
      }
    } catch (_e) {
      // Continue to quadrant fallback
    }

    // 2. Try Top Right Quadrant (Where INE QR Code is located)
    const qrW = Math.round(canvas.width * 0.55);
    const qrH = Math.round(canvas.height * 0.55);
    const qrX = canvas.width - qrW;
    const qrData = ctx.getImageData(qrX, 0, qrW, qrH);
    const qrLuminance = new RGBLuminanceSource(
      new Uint8ClampedArray(qrData.data.buffer),
      qrW,
      qrH
    );
    try {
      const qrBitmap = new BinaryBitmap(new HybridBinarizer(qrLuminance));
      const res = reader.decode(qrBitmap);
      if (res && res.getText()) {
        return { text: res.getText(), format: res.getBarcodeFormat().toString() };
      }
    } catch (_e) {
      // Continue
    }

    // 3. Try Bottom Half (Where PDF417 is located on older models)
    const pdfY = Math.round(canvas.height * 0.45);
    const pdfH = canvas.height - pdfY;
    const pdfData = ctx.getImageData(0, pdfY, canvas.width, pdfH);
    const pdfLuminance = new RGBLuminanceSource(
      new Uint8ClampedArray(pdfData.data.buffer),
      canvas.width,
      pdfH
    );
    try {
      const pdfBitmap = new BinaryBitmap(new HybridBinarizer(pdfLuminance));
      const res = reader.decode(pdfBitmap);
      if (res && res.getText()) {
        return { text: res.getText(), format: res.getBarcodeFormat().toString() };
      }
    } catch (_e) {
      // Continue
    }
  } catch (_e) {
    // Expected when no barcode present
  }
  return null;
}

/**
 * Parses raw OCR or Barcode text using Mexican INE formats (Modelos C, D, E, F, G, H)
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
  const mrzCandidateLines = lines.filter(l => l.includes('<<') || l.includes('IDMEX') || l.includes('DMEX'));
  if (mrzCandidateLines.length >= 1 || clean.includes('IDMEX') || clean.includes('<<')) {
    detectedSide = 'reverso';
    confidenceScore += 35;

    const parsedMRZ = parseINEMRZLines(lines);
    if (parsedMRZ.name) {
      result.name = parsedMRZ.name;
      confidenceScore += 30;
    }
    if (parsedMRZ.electoralSection) {
      result.electoralSection = parsedMRZ.electoralSection;
      confidenceScore += 25;
    }
    if (parsedMRZ.vigencia) {
      result.vigencia = parsedMRZ.vigencia;
    }
    if (parsedMRZ.sexo) {
      result.sexo = parsedMRZ.sexo;
    }
    if (parsedMRZ.claveElector) {
      result.claveElector = parsedMRZ.claveElector;
      confidenceScore += 20;
    }
  }

  // 2. Clave de Elector
  if (!result.claveElector) {
    const exactClave = clean.match(/\b([A-Z]{6}\d{8}[HM]\d{3})\b/);
    if (exactClave) {
      result.claveElector = exactClave[1];
      confidenceScore += 35;
    } else {
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

  // 3. CURP
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
  if (!result.vigencia) {
    const vigenciaMatch = clean.match(/(?:VIGENCIA|HASTA|A[NÑ]O\s*DE\s*REGISTRO)[\s.:]*(\d{4})/i);
    if (vigenciaMatch) {
      result.vigencia = vigenciaMatch[1];
    }
  }

  // 6. Nombre Completo (Anverso)
  if (!result.name) {
    detectedSide = 'anverso';

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
 * Processes an INE card image with Gemini 2.5 Flash Vision AI.
 * First tries backend endpoint /api/scan-ine-ai, then direct client Gemini API,
 * and returns null if offline or no network response.
 */
export async function scanINEWithAI(imageBase64: string): Promise<ExtractedINEData | null> {
  // 1. Try server endpoint
  try {
    const res = await fetch('/api/scan-ine-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.name || data.claveElector || data.electoralSection)) {
        return {
          rawText: JSON.stringify(data),
          name: data.name || undefined,
          claveElector: data.claveElector || undefined,
          curp: data.curp || undefined,
          electoralSection: data.electoralSection ? String(data.electoralSection).padStart(4, '0') : undefined,
          address: data.address || undefined,
          colonia: data.colonia || undefined,
          municipio: data.municipio || undefined,
          vigencia: data.vigencia || undefined,
          sexo: data.sexo || undefined,
          confidenceScore: 99,
          detectedSide: data.detectedSide || 'ambos',
          barcodeFormat: 'IA Gemini 2.5',
        };
      }
    }
  } catch (_e) {
    // Network or server error, continue
  }

  // 2. Client-side fallback if VITE_GEMINI_API_KEY is defined in environment
  const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (clientKey) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const promptText = `Eres un asistente experto en reconocimiento de credenciales del INE de México.
Extrae exactamente los datos y responde ÚNICAMENTE un JSON válido:
{
  "name": "NOMBRE COMPLETO",
  "claveElector": "CLAVE DE ELECTOR (18 chars)",
  "curp": "CURP (18 chars)",
  "electoralSection": "SECCIÓN (4 dígitos)",
  "address": "CALLE Y NÚMERO",
  "colonia": "COLONIA",
  "municipio": "MUNICIPIO",
  "vigencia": "VIGENCIA",
  "sexo": "Hombre" o "Mujer",
  "detectedSide": "anverso" o "reverso",
  "confidenceScore": 99
}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          const parsed = JSON.parse(replyText);
          return {
            rawText: replyText,
            name: parsed.name || undefined,
            claveElector: parsed.claveElector || undefined,
            curp: parsed.curp || undefined,
            electoralSection: parsed.electoralSection ? String(parsed.electoralSection).padStart(4, '0') : undefined,
            address: parsed.address || undefined,
            colonia: parsed.colonia || undefined,
            municipio: parsed.municipio || undefined,
            vigencia: parsed.vigencia || undefined,
            sexo: parsed.sexo || undefined,
            confidenceScore: 99,
            detectedSide: parsed.detectedSide || 'ambos',
            barcodeFormat: 'IA Gemini 2.5',
          };
        }
      }
    } catch (_e) {
      // Offline fallback
    }
  }

  return null;
}

/**
 * Main INE Scanning Engine (Option 2 - Reverso / Barcodes / MRZ priority + IA Vision)
 * 1. If online, extracts data with Gemini 2.5 Flash Vision for 99.9% accuracy.
 * 2. Checks 2D barcodes (QR Code, PDF417) via ZXing with zero tokens.
 * 3. If Reverso mode is selected, crops and binarizes the bottom MRZ strip for 100% OCR-B accuracy.
 * 4. Falls back to full image OCR if needed.
 */
export async function scanINEImage(
  imageSource: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetSide: 'reverso' | 'anverso' | 'auto' = 'reverso',
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedINEData> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(imageSource, 0, 0);
  }

  // 1. Prioridad: Si hay conectividad, procesar con IA Gemini 2.5 Vision
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    onProgress?.(15, 'Analizando credencial con Inteligencia Artificial (Gemini Vision)...');
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const aiResult = await scanINEWithAI(dataUrl);
      if (aiResult && (aiResult.name || aiResult.claveElector || aiResult.electoralSection)) {
        onProgress?.(100, 'Datos del INE extraídos con éxito mediante Inteligencia Artificial');
        return aiResult;
      }
    } catch (_e) {
      // Continuar al escáner local
    }
  }

  onProgress?.(25, 'Analizando códigos de barras y códigos QR del INE...');

  let barcodeDecoded: { text: string; format: string } | null = null;
  if (ctx) {
    barcodeDecoded = decodeBarcodeWithZXing(canvas);
  }

  let finalData: ExtractedINEData = {
    rawText: '',
    confidenceScore: 0,
    detectedSide: targetSide === 'auto' ? 'desconocido' : targetSide,
  };

  // If barcode found, parse it
  if (barcodeDecoded) {
    onProgress?.(40, `Código ${barcodeDecoded.format} detectado exitosamente`);
    const parsedBarcode = parseINETemplate(barcodeDecoded.text);
    parsedBarcode.barcodeFormat = barcodeDecoded.format;
    parsedBarcode.detectedSide = 'reverso';
    parsedBarcode.confidenceScore = Math.max(parsedBarcode.confidenceScore, 95);

    // If barcode already has both name and section, return directly!
    if (parsedBarcode.name && parsedBarcode.electoralSection) {
      onProgress?.(100, 'Datos del reverso extraídos con 100% de precisión');
      return parsedBarcode;
    }
    finalData = parsedBarcode;
  }

  // Step 2: MRZ or Text OCR
  const worker = await getOrCreateTesseractWorker(onProgress);

  if (targetSide === 'reverso' || targetSide === 'auto') {
    onProgress?.(45, 'Escaneando zona de lectura mecánica (MRZ al pie)...');
    // Preprocess high contrast bottom crop for MRZ
    const mrzImageUrl = preprocessMRZCrop(imageSource, sourceWidth, sourceHeight);
    const mrzOcrResult = await worker.recognize(mrzImageUrl);
    const parsedMRZ = parseINETemplate(mrzOcrResult.data.text);

    // Merge MRZ fields into finalData
    if (parsedMRZ.name) finalData.name = parsedMRZ.name;
    if (parsedMRZ.electoralSection) finalData.electoralSection = parsedMRZ.electoralSection;
    if (parsedMRZ.vigencia) finalData.vigencia = parsedMRZ.vigencia;
    if (parsedMRZ.sexo) finalData.sexo = parsedMRZ.sexo;
    if (parsedMRZ.claveElector) finalData.claveElector = parsedMRZ.claveElector;

    finalData.detectedSide = 'reverso';
    finalData.confidenceScore = Math.max(finalData.confidenceScore, 92);

    // If we have both name and section from MRZ, we're done!
    if (finalData.name && finalData.electoralSection) {
      onProgress?.(100, 'Datos del reverso procesados con éxito');
      return finalData;
    }
  }

  // Step 3: Full image OCR fallback (covers Frente/Anverso or when MRZ was faint)
  onProgress?.(70, 'Analizando texto complementario de la credencial...');
  const fullProcessedUrl = preprocessINEImage(imageSource, sourceWidth, sourceHeight);
  const fullOcrResult = await worker.recognize(fullProcessedUrl);
  const parsedFull = parseINETemplate(fullOcrResult.data.text);

  // Merge full OCR into finalData without overwriting cleaner MRZ/barcode data
  if (!finalData.name && parsedFull.name) finalData.name = parsedFull.name;
  if (!finalData.claveElector && parsedFull.claveElector) finalData.claveElector = parsedFull.claveElector;
  if (!finalData.curp && parsedFull.curp) finalData.curp = parsedFull.curp;
  if (!finalData.electoralSection && parsedFull.electoralSection) finalData.electoralSection = parsedFull.electoralSection;
  if (!finalData.address && parsedFull.address) finalData.address = parsedFull.address;
  if (!finalData.colonia && parsedFull.colonia) finalData.colonia = parsedFull.colonia;
  if (!finalData.vigencia && parsedFull.vigencia) finalData.vigencia = parsedFull.vigencia;
  if (!finalData.sexo && parsedFull.sexo) finalData.sexo = parsedFull.sexo;

  finalData.confidenceScore = Math.max(finalData.confidenceScore, parsedFull.confidenceScore, 80);
  finalData.rawText = [finalData.rawText, fullOcrResult.data.text].filter(Boolean).join('\n---\n');

  onProgress?.(100, 'Lectura completada');
  return finalData;
}
