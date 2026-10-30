import { generateExpertAuditFallback } from '../../src/utils/fallbackExpertAudit.ts';

type Context = {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
  };
};

const respond = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return respond({ success: false, error: 'Format de requête JSON invalide.' }, 400);
  }

  const { title, description, location, sector, targetAudience, businessModel, lifeCycleDetails } = body || {};

  if (!title || !description) {
    return respond({ success: false, error: 'Le titre et la description du projet sont obligatoires.' }, 400);
  }

  const loc = (location || '').trim() || 'Tunisie';

  // Réalisation de l'audit expert normé (ACV ISO 14040, RSE, ODD, Carbone ISO 14067)
  const expertAudit = generateExpertAuditFallback(title, description, loc);

  const auditResult = {
    ...expertAudit,
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    sector: sector || expertAudit.sector,
    description,
    location: loc,
    targetAudience: targetAudience || expertAudit.targetAudience,
    businessModel: businessModel || expertAudit.businessModel,
    lifeCycleDetails: lifeCycleDetails || expertAudit.lifeCycleDetails,
    createdAt: new Date().toISOString(),
  };

  return respond({ success: true, data: auditResult });
};
