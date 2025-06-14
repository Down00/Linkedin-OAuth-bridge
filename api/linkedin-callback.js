// /api/linkedin-callback.js
export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('❌ LinkedIn Auth Error:', error_description);
    return res.redirect(`arivaloyalty://linkedin?error=${encodeURIComponent(error_description)}`);
  }

  if (!code) {
    return res.redirect(`arivaloyalty://linkedin?error=Missing authorization code`);
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = 'https://linkedin-o-auth-bridge.vercel.app/api/linkedin-callback';

    // 🔐 Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    const accessToken = tokenData.access_token;

    // 🧑‍💼 Get user info using OpenID Connect endpoint
    const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userInfo = await userInfoRes.json();

    console.log('👤 OpenID LinkedIn Profile:', userInfo);

    const name = userInfo.name || 'LinkedIn User';
    const email = userInfo.email || 'unknown@example.com';

    const query = new URLSearchParams({
      token: accessToken,
      name,
      email,
    }).toString();

    res.redirect(`arivaloyalty://linkedin?${query}`);
  } catch (err) {
    console.error('🔴 Callback Processing Error:', err);
    res.redirect(`arivaloyalty://linkedin?error=${encodeURIComponent(err.message)}`);
  }
}
