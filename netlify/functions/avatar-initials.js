// Netlify Function: dynamic initials-based avatar SVG
const crypto = require('crypto');

exports.handler = async event => {
  try {
    const params = event.queryStringParameters || {};
    const i = (params.i || '')
      .toString()
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 3);
    if (!i) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing initials' })
      };
    }
    const theme = params.t === 'light' || params.t === 'dark' ? params.t : 'dark';
    const style = params.s === 'outline' || params.s === 'solid' ? params.s : 'solid';

    // Derive colors from initials
    const seed = crypto.createHash('md5').update(i).digest('hex');
    const hue = parseInt(seed.slice(0, 2), 16) % 360;
    const hue2 = (hue + 40) % 360;

    const bg1 = `hsl(${hue} 80% ${theme === 'dark' ? 45 : 70}% / 1)`;
    const bg2 = `hsl(${hue2} 80% ${theme === 'dark' ? 40 : 65}% / 1)`;
    const textColor = theme === 'dark' ? '#ffffff' : '#111827';
    const strokeColor = theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(17,24,39,0.85)';

    const size = 128;
    const radius = 16;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  ${style === 'solid' ? `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>` : `<rect width="${size}" height="${size}" rx="${radius}" fill="none" stroke="${strokeColor}" stroke-width="4"/>`}
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="56" font-weight="700" letter-spacing="1">${i}</text>
</svg>`;

    const etag = 'W/"' + crypto.createHash('sha1').update(svg).digest('hex') + '"';

    // Conditional GET support
    if (event.headers && event.headers['if-none-match'] === etag) {
      return {
        statusCode: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
        'Access-Control-Allow-Origin': '*'
      },
      body: svg
    };
  } catch (err) {
    console.error('avatar-initials error', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
