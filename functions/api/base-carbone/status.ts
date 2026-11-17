import { getBaseCarboneIndexStatus } from '../../../src/utils/baseCarbone.ts';

export const onRequestGet = async (): Promise<Response> =>
  Response.json(
    { success: true, ...getBaseCarboneIndexStatus() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
