import { unzipSync, strFromU8 } from 'fflate';
// Native Cloudflare document extraction for plain text and DOCX (OOXML).
type Context = { request: Request };
type Upload = { filename?: string; mimeType?: string; base64Data?: string; localText?: string };
const respond = (data: unknown, status = 200) => Response.json(data, { status });
const decodeEntities = (s: string): string => s.replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#[0-9]+);/gi, entity => {
  const names: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
  const named = names[entity.toLowerCase()];
  if (named !== undefined) return named;
  const hex = entity.startsWith('&#x');
  const code = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
});
const extractDocx = (base64: string): string => {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const zip = unzipSync(bytes);
  const xmlBytes = zip['word/document.xml'];
  if (!xmlBytes) throw new Error('Document Word invalide : word/document.xml introuvable.');
  const xml = strFromU8(xmlBytes);
  return decodeEntities(xml
    .replace(/<w:tab\b[^>]*\/?\s*>/g, '\\t')
    .replace(/<w:br\b[^>]*\/?\s*>/g, '\\n')
    .replace(/<\/w:p>/g, '\\n')
    .replace(/<\/w:tr>/g, '\\n')
    .replace(/<\/w:tc>/g, '\\t')
    .replace(/<[^>]+>/g, ''))
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim();
};
const textExtensions = /\.(txt|md|csv|tsv|json|log)$/i;
export const onRequestPost = async ({ request }: Context): Promise<Response> => {
  try {
    const body = await request.json() as { files?: Upload[]; filename?: string; mimeType?: string; base64Data?: string; localText?: string };
    const files = Array.isArray(body.files) ? body.files : [body];
    if (!files.length) return respond({ success: false, error: 'Aucun document fourni.' }, 400);
    const extracted: { filename: string; text: string }[] = [];
    for (const file of files) {
      const filename = file.filename || 'Document';
      let content = typeof file.localText === 'string' ? file.localText : '';
      if (!content && /\.docx$/i.test(filename) && file.base64Data) {
        content = extractDocx(file.base64Data);
      }
      if (!content && textExtensions.test(filename) && file.base64Data) {
        const binary = atob(file.base64Data);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        content = new TextDecoder().decode(bytes);
      }
      if (!content.trim()) return respond({
        success: false,
        error: `Le format de « ${filename} » nécessite encore un extracteur compatible Cloudflare. Aucun contenu n'a été inventé.`,
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
