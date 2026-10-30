
import { extractText, getDocumentProxy } from 'unpdf';
import { unzipSync, strFromU8 } from 'fflate';

type Context = { request: Request };

type Upload = {
  filename?: string;
  mimeType?: string;
  base64Data?: string;
  localText?: string;
};

const respond = (data: unknown, status = 200) =>
  Response.json(data, { status });

const textExtensions = /\.(txt|md|csv|tsv|json|log)$/i;

function decodeBase64(value: string): Uint8Array {
  const encoded = value
    .replace(/^data:[^,]*;base64,/i, '')
    .replace(/\s/g, '');

  const binary = atob(encoded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#[0-9]+);/gi,
    entity => {
      const names: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
      };

      const named = names[entity.toLowerCase()];
      if (named !== undefined) return named;

      const hex = /^&#x/i.test(entity);
      const code = Number.parseInt(
        entity.slice(hex ? 3 : 2, -1),
        hex ? 16 : 10
      );

      return Number.isFinite(code) &&
        code > 0 &&
        code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : entity;
    }
  );
}

function extractDocx(bytes: Uint8Array): string {
  const zip = unzipSync(bytes);
  const xmlBytes = zip['word/document.xml'];

  if (!xmlBytes) {
    throw new Error('Document Word invalide.');
  }

  const xml = strFromU8(xmlBytes);

  return decodeEntities(
    xml
      .replace(/<w:tab\b[^>]*\/?\s*>/g, '\t')
      .replace(/<w:br\b[^>]*\/?\s*>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<\/w:tc>/g, '\t')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);

  try {
    const result = await extractText(pdf, {
      mergePages: true,
    });

    return result.text.trim();
  } finally {
    await pdf.destroy();
  }
}

export const onRequestPost = async (
  { request }: Context
): Promise<Response> => {
  let body: {
    files?: Upload[];
    filename?: string;
    mimeType?: string;
    base64Data?: string;
    localText?: string;
  };

  try {
    body = await request.json();
  } catch {
    return respond({
      success: false,
      error: 'Requête JSON invalide.',
      code: 'INVALID_JSON',
    }, 400);
  }

  try {
    const files = Array.isArray(body.files)
      ? body.files
      : [body];

    if (!files.length) {
      return respond({
        success: false,
        error: 'Aucun document fourni.',
      }, 400);
    }

    const extracted: {
      filename: string;
      text: string;
    }[] = [];

    for (const file of files) {
      const filename = file.filename || 'Document';
      let content = typeof file.localText === 'string'
        ? file.localText
        : '';

      if (!content.trim() && file.base64Data) {
        let bytes: Uint8Array;

        try {
          bytes = decodeBase64(file.base64Data);
        } catch {
          return respond({
            success: false,
            error: `Encodage base64 invalide : ${filename}`,
            code: 'INVALID_FILE_ENCODING',
          }, 400);
        }

        try {
          if (/\.pdf$/i.test(filename)) {
            content = await extractPdf(bytes);

            if (!content.trim()) {
              return respond({
                success: false,
                error: `Le PDF « ${filename} » nécessite une reconnaissance OCR.`,
                code: 'PDF_OCR_REQUIRED',
              }, 422);
            }
          } else if (/\.docx$/i.test(filename)) {
            content = extractDocx(bytes);
          } else if (textExtensions.test(filename)) {
            content = new TextDecoder().decode(bytes);
          } else {
            return respond({
              success: false,
              error: `Format non pris en charge : ${filename}`,
              code: 'UNSUPPORTED_DOCUMENT_FORMAT',
            }, 422);
          }
        } catch (error) {
          console.error('Extraction failed:', filename, error);

          return respond({
            success: false,
            error: `Impossible de lire le document « ${filename} ».`,
            code: 'DOCUMENT_EXTRACTION_FAILED',
          }, 422);
        }
      }

      if (!content.trim()) {
        return respond({
          success: false,
          error: `Aucun texte exploitable dans « ${filename} ».`,
          code: 'EMPTY_DOCUMENT',
        }, 422);
      }

      extracted.push({
        filename,
        text: content.trim(),
      });
    }

    const rawFullText = extracted
      .map(file => file.text)
      .join('\n\n');

    return respond({
      success: true,
      filename: extracted.map(f => f.filename).join(', '),
      extractedText: rawFullText,
      rawFullText,
      suggestedTitle: extracted[0].filename
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' '),
      suggestedLocation: '',
      isAIEnhanced: false,
      processedFilesCount: extracted.length,
      charCount: rawFullText.length,
    });
  } catch (error) {
    console.error('Document processing error:', error);

    return respond({
      success: false,
      error: 'Erreur interne de traitement des documents.',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
};
