import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { JwtUtil } from './jwtUtil';
import * as winston from 'winston';

export async function expressAuthentication(request: HttpRequest, securityName: string, scopes?: string[]): Promise<any> {
  if (securityName === 'api_key') {
    try {
      if (request.headers && request.headers['api-key']) {
        return JwtUtil.parseToken(request.headers['api-key']);
      }
    } catch (e) {
      winston.warn(`Error parsing JWT token: ${JSON.stringify(e.stack || e)}`);
      throw HttpResponseError.createUnauthorized();
    }

    winston.info('No Api-Key in request!');
  }

  throw HttpResponseError.createUnauthorized();
};
