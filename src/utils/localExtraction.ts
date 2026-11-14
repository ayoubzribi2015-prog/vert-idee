export function extractClientSide(files: File[], rawTexts: string[]): {
  extractedText: string;
  suggestedTitle: string;
  suggestedLocation: string;
  rawFullText: string;
} {
  const combinedText = rawTexts.filter(Boolean).join('\n\n') || files.map(f => `Document : ${f.name}`).join('\n\n');
  const filename = files[0]?.name || 'Projet';
  
  let suggestedTitle = filename
    .replace(/\.[^.]+$/, '')
    .replace(/^[0-9]+[_-]*/, '')
    .replace(/[_-]/g, ' ')
    .trim();
  if (!suggestedTitle) suggestedTitle = 'Projet d’Entrepreneuriat Vert';

  let suggestedLocation = 'Tunisie';
  const locMatch = combinedText.match(/\b(Tunisie|Tunis|Sfax|Sousse|Bizerte|Nabeul|Monastir|Kairouan|Gabès|Médenine|Gafsa|Jendouba|Béja|Kasserine|Sidi Bouzid|Mahdia|Siliana|Zaghouan|Tozeur|Kébili|Tataouine|France|Paris|Lyon|Marseille)\b/i);
  if (locMatch) {
    suggestedLocation = locMatch[1];
  }

  const overview = combinedText.length > 30
    ? combinedText.slice(0, 1500)
    : `Projet issu des documents importés (${files.map(f => f.name).join(', ')}). Étude de faisabilité et d'impact environnemental.`;

  const technicalSolution = `Analyse des procédés et intrants pour ${suggestedTitle}. Intégration de technologies sobres en énergie et gestion optimisée des ressources selon les normes ISO 14040/14001.`;

  const circularValue = `Proposition de valeur circulaire axée sur la valorisation des flux, l'optimisation des coûts opérationnels et l'ancrage territorial durable.`;

  const extractedText = [
    `■ 1. Vue d'ensemble du projet & Problématique adressée\n${overview}`,
    `■ 2. Solution technique, intrants & Procédés sobres\n${technicalSolution}`,
    `■ 3. Proposition de valeur & Modèle circulaire\n${circularValue}`,
  ].join('\n\n');

  return {
    extractedText,
    suggestedTitle,
    suggestedLocation,
    rawFullText: combinedText,
  };
}
