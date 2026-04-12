import env, { required } from 'shared/src/env.js';
import { AppError } from 'shared/src/errors.js';

const GOOGLE_CLIENT_ID = required(env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = required(env.GOOGLE_CLIENT_SECRET);
const GOOGLE_REDIRECT_URL = required(env.GOOGLE_REDIRECT_URL);

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

type GoogleUserInfo = {
  email: string;
  name: string;
};

export class GoogleProvider {
  getAuthUrl(): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<GoogleUserInfo> {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new AppError('Failed to exchange Google auth code for tokens', { code: 'GOOGLE_TOKEN_ERROR' });
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new AppError('Failed to fetch Google user info', { code: 'GOOGLE_USER_INFO_ERROR' });
    }

    return await userInfoResponse.json() as GoogleUserInfo;
  }
}

export const googleProvider = new GoogleProvider();
