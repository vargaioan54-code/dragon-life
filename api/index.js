const APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise(resolve => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

async function osFetch(path, opts = {}) {
  const r = await fetch('https://api.onesignal.com' + path, {
    ...opts,
    headers: {
      'Authorization': 'Basic ' + REST_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  let body; try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { status: r.status, body };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  if (!APP_ID || !REST_KEY) {
    return res.status(500).json({ error: 'Missing OneSignal env vars', app_id_set: !!APP_ID, key_set: !!REST_KEY });
  }

  try {
    if (action === 'config') {
      return res.status(200).json({ appId: APP_ID });
    }

    if (action === 'schedule' && req.method === 'POST') {
      const { externalId, title, body, sendAt } = await readBody(req);
      if (!externalId || !title || !sendAt) return res.status(400).json({ error: 'missing fields' });
      const payload = {
        app_id: APP_ID,
        include_aliases: { external_id: [externalId] },
        target_channel: 'push',
        headings: { en: title, ro: title },
        contents: { en: body || '', ro: body || '' },
        send_after: sendAt,
        priority: 10,
        ttl: 3600,
        web_url: 'https://dragon-life.vercel.app/',
        chrome_web_icon: 'https://dragon-life.vercel.app/icon.svg',
        chrome_web_badge: 'https://dragon-life.vercel.app/icon.svg',
      };
      const r = await osFetch('/notifications?c=push', { method: 'POST', body: JSON.stringify(payload) });
      if (r.status >= 400) return res.status(r.status).json(r.body);
      return res.status(200).json({ id: r.body.id, ok: true });
    }

    if (action === 'cancel' && req.method === 'POST') {
      const { id } = await readBody(req);
      if (!id) return res.status(400).json({ error: 'missing id' });
      const r = await osFetch(`/notifications/${id}?app_id=${APP_ID}`, { method: 'DELETE' });
      return res.status(200).json({ ok: r.status < 400, response: r.body });
    }

    if (action === 'test' && req.method === 'POST') {
      const { externalId } = await readBody(req);
      if (!externalId) return res.status(400).json({ error: 'missing externalId' });
      const payload = {
        app_id: APP_ID,
        include_aliases: { external_id: [externalId] },
        target_channel: 'push',
        headings: { en: '🐉 Test Dragon Life', ro: '🐉 Test Dragon Life' },
        contents: { en: 'Push server merge perfect!', ro: 'Push server merge perfect!' },
        priority: 10,
        web_url: 'https://dragon-life.vercel.app/',
        chrome_web_icon: 'https://dragon-life.vercel.app/icon.svg',
      };
      const r = await osFetch('/notifications?c=push', { method: 'POST', body: JSON.stringify(payload) });
      return res.status(r.status).json(r.body);
    }

    return res.status(404).json({ error: 'unknown action', available: ['config', 'schedule', 'cancel', 'test'] });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
