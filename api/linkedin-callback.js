// linkedin-callback.js

import { createRemoteJWKSet, jwtVerify } from 'jose';

export const config = {
  runtime: 'edge',
};

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/token';
const LINKEDIN_JWKS_URL = 'https://www.linkedin.com/oauth/openid/jwks';
const REDIRECT_URI = 'https://linkedin-o-auth-bridge.vercel.app/api/linkedin-callback';

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    if (error) {
      console.error('❌ LinkedIn OAuth Error:', error_description);
      return new Response(`LinkedIn Error: ${error_description}`, { status: 400 });
    }

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    // Prepare token request data
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    });

    console.log('🔐 Token request body:', Object.fromEntries(tokenRequestBody.entries()));

    // 🔐 Exchange code for token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenRequestBody,
    });

    const rawText = await tokenRes.text();
    console.log('📦 Raw LinkedIn token response:', rawText);
    console.log('🔗 Token request status:', tokenRes.status);

    let tokenData;
    try {
      tokenData = JSON.parse(rawText);
    } catch (err) {
      console.error('❌ JSON Parse Error:', err);
      return new Response('LinkedIn token response was not JSON.', { status: 500 });
    }

    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('❌ Failed to get access token or id_token:', tokenData);
      return new Response('Failed to get access token', { status: 500 });
    }

    const idToken = tokenData.id_token;

    // ✅ Verify JWT using LinkedIn's JWKS
    const JWKS = createRemoteJWKSet(new URL(LINKEDIN_JWKS_URL));
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: 'https://www.linkedin.com',
      audience: process.env.LINKEDIN_CLIENT_ID,
    });

    const name =
      payload.name ||
      `${payload.given_name || ''} ${payload.family_name || ''}`.trim() ||
      'LinkedIn User';
    const email = payload.email || 'unknown@example.com';

    console.log('✅ Verified LinkedIn User:', { name, email });

    // 📲 Redirect back to mobile app with token and user info
    const redirectUrl = `arivaloyalty://linkedin?token=${encodeURIComponent(
      idToken
    )}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;

    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error('🔴 LinkedIn Callback Verification Error:', err);
    return new Response('LinkedIn login failed', { status: 500 });
  }
}
