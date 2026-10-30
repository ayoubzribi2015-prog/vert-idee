import mammoth from 'mammoth';
import { extractText as extractPdfText } from 'unpdf';

type Context = { request: Request; env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } };
type Upload = { filename?: string; mimeType?: string; base64Data?: string; localText?: string };
const respond = (data: unknown, status = 200) => Response.json(data, { status });
const textExtensions = /\.(txt|md|csv|tsv|json|log)$/i;

function decodeBase64(value: string): Uint8Array {
  const encoded = value.replace(/^data:[^,]*;base64,/, '').replace(/\s/g, '');
  const binary = atob(encoded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function generate(prompt: string, env: Context['env'], json = false): Promise<string> {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, ...(json ? { responseMimeType: 'application/json' } : {}) },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text.trim()) throw new Error('Réponse IA vide');
  return text;
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
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
        try { bytes = decodeBase64(file.base64Data); }
        catch { return respond({ success: false, error: `Encodage base64 invalide pour « ${filename} ».` }, 400); }
        if (textExtensions.test(filename)) content = new TextDecoder().decode(bytes);
        else if (/\.docx$/i.test(filename)) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
            content = result.value;
          } catch { return respond({ success: false, error: `Fichier Word illisible : ${filename}` }, 422); }
        } else if (/\.pdf$/i.test(filename)) {
          try {
            const result = await extractPdfText(bytes);
            content = Array.isArray(result.text) ? result.text.join('\n\n') : String(result.text || '');
          } catch { return respond({ success: false, error: `Fichier PDF illisible : ${filename}` }, 422); }
        }
      }
      if (!content.trim()) return respond({
        success: false,
        error: `Aucun texte exploitable extrait de « ${filename} ». Aucun contenu n'a été inventé.`,
        code: 'UNSUPPORTED_DOCUMENT_FORMAT',
      }, 422);
      extracted.push({ filename, text: content.trim() });
    }
    const rawFullText = extracted.map(f => f.text).join('\n\n');
    let description = rawFullText;
    let suggestedTitle = extracted[0].filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    let suggestedLocation = '';
    let isAIEnhanced = false;
    if (env.GEMINI_API_KEY && rawFullText.length > 50) {
      try {
        const source = rawFullText.slice(0, 35000);
        const facts = await generate(`Tu es un assistant de retranscription factuelle. Extrais uniquement les informations utiles du projet depuis les documents ci-dessous. Ignore sommaires, en-têtes, pieds de page et numéros de pages. N'invente aucune donnée.\n\n${source}`, env);
        const result = await generate(`Tu es un éditeur expert en projets industriels et écologiques. À partir des faits ci-dessous, rédige une description fluide avec phrases complètes, fidèle aux documents et sans chiffres ni allégations inventés. Structure en trois rubriques : ■ 1. Vue d'ensemble du projet & Problématique adressée ; ■ 2. Solution technique, intrants & Procédés sobres ; ■ 3. Proposition de valeur & Modèle circulaire. Si une rubrique manque d'informations, indique-le. Réponds uniquement en JSON avec suggestedTitle, suggestedLocation (vide si absent), richDescription.\n\n${facts}`, env, true);
        const parsed = JSON.parse(result) as { richDescription?: string; suggestedTitle?: string; suggestedLocation?: string };
        if (!parsed.richDescription || parsed.richDescription.trim().length < 60) throw new Error('Synthèse IA invalide');
        description = parsed.richDescription.trim();
        suggestedTitle = parsed.suggestedTitle?.trim() || suggestedTitle;
        suggestedLocation = parsed.suggestedLocation?.trim() || '';
        isAIEnhanced = true;
      } catch (error) {
        console.error('[Document synthesis] AI unavailable:', error);
      }
    }
    return respond({
      success: true,
      filename: extracted.map(f => f.filename).join(', '),
      extractedText: description,
      rawFullText,
      suggestedTitle,
      suggestedLocation,
      isAIEnhanced,
      processedFilesCount: extracted.length,
      charCount: description.length,
    });
  } catch {
    return respond({ success: false, error: 'Requête JSON invalide ou document trop volumineux.' }, 400);
  }
};
