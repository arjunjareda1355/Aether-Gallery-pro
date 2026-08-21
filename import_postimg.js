
const https = require('https');

function getHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrape() {
  const url = 'https://postimg.cc/gallery/Hx2kdY4';
  try {
    const html = await getHtml(url);
    // PostImg gallery thumbnails usually contain links like /i/[ID]
    const matches = html.matchAll(/href="([^"]*\/i\/[^"]*)"/g);
    const links = [...new Set([...matches].map(m => m[1]))];
    
    // Resolve relative links
    const absoluteLinks = links.map(l => l.startsWith('http') ? l : 'https://postimg.cc' + l);
    
    console.log(JSON.stringify(absoluteLinks));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

scrape();
