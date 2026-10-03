import { errorResponse } from './response';

export const withApi = (fn: (req: Request, ctx?: any) => Promise<Response>) => {
  return async (req: Request, ctx?: any) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
};
