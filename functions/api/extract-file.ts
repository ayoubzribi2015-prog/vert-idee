// Initial native Cloudflare extraction route. Text-based documents are handled
// at the edge. Binary PDF/DOCX/images require a dedicated compatible parser.
type Context = { request: Request };
type Upload = { filename?: string; mimeType?: string; base64Data?: string; localText?: string };
const respond = (data: unknown, status = 200) => Response.json(data, { status });
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
