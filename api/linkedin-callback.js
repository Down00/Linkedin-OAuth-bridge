const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'https://linkedin-o-auth-bridge.vercel.app/api/linkedin-callback',
    client_id: '86hvgkwo797ev0',
    client_secret: 'WPL_AP1.QEjUmq4Hu1qwF6cG.eQt6Iw==',
  });

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
    }

    // ✅ Redirect back to your app (custom scheme)
    return res.redirect(`arivaloyalty://linkedin?token=${tokenData.access_token}`);
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).send('OAuth error occurred');
  }
};
