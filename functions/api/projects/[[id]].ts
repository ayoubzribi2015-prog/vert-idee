export const onRequestPut = async (): Promise<Response> => {
  return Response.json({ success: true, message: 'Projet synchronisé avec succès.' });
};

export const onRequestDelete = async (): Promise<Response> => {
  return Response.json({ success: true, message: 'Projet supprimé.' });
};

export const onRequestGet = async (): Promise<Response> => {
  return Response.json({ success: true, projects: [] });
};
