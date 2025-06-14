module.exports = async function handler(req, res) {
  try {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');

    const LINKEDIN_JWKS_URL = 'https://www.linkedin.com/oauth/openid/jwks';
    const { code, error, error_description } = req.query;

    if (error) {
      console.error('❌ LinkedIn OAuth Error:', error_description);
      return res.status(400).send(`LinkedIn Error: ${error_description}`);
    }

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    // 🔐 Exchange authorization code for tokens
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://linkedin-o-auth-bridge.vercel.app/api/linkedin-callback',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('❌ Token error:', tokenData);
      return res.status(500).send('Failed to get access token');
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

    const redirectUrl = `arivaloyalty://linkedin?token=${encodeURIComponent(idToken)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('🔴 LinkedIn Callback Verification Error:', err);
    return res.status(500).send('LinkedIn login failed');
  }
};
