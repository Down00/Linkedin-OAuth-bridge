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
    client_secret: 'WPL_AP1.QEjUmq4Hu1qwF6cG.eQt6Iw==', // Keep only in backend
  });

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    // Fetch email address
    const emailRes = await fetch(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const emailData = await emailRes.json();

    const fullName = `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || 'LinkedIn User';
    const email = emailData?.elements?.[0]?.['handle~']?.emailAddress || 'unknown@example.com';

    // Build redirect with token and user info
    const query = new URLSearchParams({
      name: fullName,
      email,
      token: accessToken, // ✅ Pass the token to the deep link
    }).toString();

    return res.redirect(`arivaloyalty://linkedin?${query}`);
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).send('OAuth error occurred');
  }
};
