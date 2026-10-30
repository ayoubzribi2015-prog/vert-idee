import mammoth from 'mammoth';

type Context = { request: Request };
type Upload = { filename?: string; mimeType?: string; base64Data?: string; localText?: string };
const respond = (data: unknown, status = 200) => Response.json(data, { status });
const textExtensions = /\.(txt|md|csv|tsv|json|log)$/i;

function decodeBase64(value: string): Uint8Array {
  const encoded = value.replace(/^data:[^,]*;base64,/, '').replace(/\s/g, '');
  const binary = atob(encoded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export const onRequestPost = async ({ request }: Context): Promise<Response> => {
  try {
    const body = await request.json() as { files?: Upload[]; filename?: string; mimeType?: string; base64Data?: string; localText?: string };
    const files = Array.isArray(body.files) ? body.files : [body];
    if (!files.length) return respond({ success: false, error: 'Aucun document fourni.' }, 400);
    const extracted: { filename: string; text: string }[] = [];
    for (const file of files) {
      const filename = file.filename || 'Document';
      let content = typeof file.localText === 'string' ? file.localText : '';
      if (!content.trim() && file.base64Data) {
        let bytes: Uint8Array;
        try {
          bytes = decodeBase64(file.base64Data);
        } catch {
          return respond({ success: false, error: `Encodage base64 invalide pour « ${filename} ».`, code: 'INVALID_FILE_ENCODING' }, 400);
        }
        if (textExtensions.test(filename)) {
          content = new TextDecoder().decode(bytes);
        } else if (/\.docx$/i.test(filename)) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
            content = result.value;
          } catch {
            return respond({ success: false, error: `Impossible de lire « ${filename} » : fichier Word invalide ou endommagé.`, code: 'DOCUMENT_EXTRACTION_FAILED' }, 422);
          }
        }
      }
      if (!content.trim()) return respond({
        success: false,
        error: `Le format de « ${filename} » ne contient aucun texte exploitable ou nécessite un extracteur compatible Cloudflare.`,
        code: 'UNSUPPORTED_DOCUMENT_FORMAT',
      }, 422);
      extracted.push({ filename, text: content.trim() });
    }
    const rawFullText = extracted.map(f => f.text).join('\n\n');
    return respond({
      success: true,
      filename: extracted.map(f => f.filename).join(', '),
      extractedText: rawFullText,
      rawFullText,
      suggestedTitle: extracted[0].filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
      suggestedLocation: '',
      isAIEnhanced: false,
      processedFilesCount: extracted.length,
      charCount: rawFullText.length,
    });
  } catch {
    return respond({ success: false, error: 'Requête JSON invalide ou document trop volumineux.' }, 400);
  }
};
