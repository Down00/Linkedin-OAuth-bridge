const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  console.log('📥 LinkedIn callback reached with query:', req.query);

  const { code } = req.query;

  if (!code) {
    console.error('❌ No code received. Full query:', req.query);
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
    // Get access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('❌ Failed to get LinkedIn token:', tokenData);
      return res.status(500).json({ error: 'Failed to get access token', details: tokenData });
    }

    const accessToken = tokenData.access_token;
    console.log('🔐 LinkedIn Access Token:', accessToken);

    // Fetch profile
    const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    console.log('👤 LinkedIn Profile:', profile);

    const fullName = `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || 'LinkedIn User';

    // Fetch email
    const emailRes = await fetch(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const emailData = await emailRes.json();
    console.log('📧 LinkedIn Email:', emailData);

    const email = emailData?.elements?.[0]?.['handle~']?.emailAddress || 'unknown@example.com';

    // Redirect to app with user info
    const query = new URLSearchParams({
      name: fullName,
      email,
      token: accessToken,
    }).toString();

    return res.redirect(`arivaloyalty://linkedin?${query}`);
  } catch (error) {
    console.error('🔥 OAuth error:', error);
    return res.status(500).send('OAuth error occurred');
  }
};
