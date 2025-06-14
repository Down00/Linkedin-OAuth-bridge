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

    // 🔐 Exchange authorization code for OpenID token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const rawText = await tokenRes.text();
    console.log('📦 Raw token response:', rawText);

    let tokenData;
    try {
      tokenData = JSON.parse(rawText);
    } catch (err) {
      console.error('❌ Failed to parse LinkedIn token response:', rawText);
      return new Response('LinkedIn returned non-JSON data', { status: 500 });
    }

    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('❌ Token exchange failed:', tokenData);
      return new Response('Failed to get ID token from LinkedIn', { status: 500 });
    }

    const idToken = tokenData.id_token;

    // ✅ Verify LinkedIn OpenID token
    const { jwtVerify, createRemoteJWKSet } = await import('jose');
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

    // 🔁 Redirect back to mobile app via deep link
    const redirectUrl = `arivaloyalty://linkedin?token=${encodeURIComponent(idToken)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error('🔴 LinkedIn Callback Verification Error:', err);
    return new Response('LinkedIn login failed', { status: 500 });
  }
}
