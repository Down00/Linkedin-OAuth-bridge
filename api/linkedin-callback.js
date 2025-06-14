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
    // 🔐 Get Access Token
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

    // 👤 Get Profile Info
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    console.log('👤 LinkedIn raw profile response:', profile);

    const fullName = `${profile.localizedFirstName || ''} ${profile.localizedLastName || ''}`.trim() || 'LinkedIn User';
    console.log('✅ Parsed Name:', fullName);

    // 📧 Get Email Info
    const emailRes = await fetch(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const emailData = await emailRes.json();
    console.log('📧 LinkedIn raw email response:', emailData);

    const email = emailData?.elements?.[0]?.['handle~']?.emailAddress || 'unknown@example.com';
    console.log('✅ Parsed Email:', email);

    // 🚀 Redirect to app with data
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
