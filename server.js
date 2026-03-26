const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());

const TOKEN = process.env.PADEL_TOKEN;

async function getPlayerPhoto(id) {
  try {
    const p = await fetch(`https://padelapi.org/api/players/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());
    return p.photo_url || null;
  } catch (e) { return null; }
}

app.get('/matches', async (req, res) => {
  try {
    const seasons = await fetch('https://padelapi.org/api/seasons', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    const season = (seasons.data || []).find(s => s.name.includes('Premier') && s.year === 2026);
    if (!season) return res.json({ error: 'Season not found' });

    const tours = await fetch(`https://padelapi.org/api/seasons/${season.id}/tournaments?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    const miami = (tours.data || []).find(t =>
      t.name?.toLowerCase().includes('miami') ||
      t.location?.toLowerCase().includes('miami') ||
      t.city?.toLowerCase().includes('miami')
    );
    if (!miami) return res.json({ error: 'Miami not found' });

    const matchRes = await fetch(`https://padelapi.org/api/tournaments/${miami.id}/matches?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    // Enrich finished matches with player photos
    const matches = matchRes.data || [];
    const finishedMatches = matches.filter(m => m.status === 'finished' || m.status === 'closed');
    
    // Collect unique player IDs from finished matches only
    const playerIds = new Set();
    finishedMatches.forEach(m => {
      (m.players?.team_1 || []).forEach(p => playerIds.add(p.id));
      (m.players?.team_2 || []).forEach(p => playerIds.add(p.id));
    });

    // Fetch all photos in parallel
    const photoMap = {};
    await Promise.all([...playerIds].map(async id => {
      photoMap[id] = await getPlayerPhoto(id);
    }));

    // Inject photo_url into each player
    matches.forEach(m => {
      (m.players?.team_1 || []).forEach(p => { p.photo_url = photoMap[p.id] || null; });
      (m.players?.team_2 || []).forEach(p => { p.photo_url = photoMap[p.id] || null; });
    });

    res.json({
      tournament_name: miami.name,
      tournament_id: miami.id,
      matches,
      last_page: 1
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/player/:id', async (req, res) => {
  try {
    const player = await fetch(`https://padelapi.org/api/players/${req.params.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());
    res.json(player);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/photo/:id', async (req, res) => {
  try {
    const player = await fetch(`https://padelapi.org/api/players/${req.params.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    const photoUrl = player.photo_url;
    if (!photoUrl) return res.status(404).json({ error: 'No photo found' });

    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return res.status(404).send('Photo fetch failed');
    const buffer = await imgRes.buffer();
    res.set('Content-Type', imgRes.headers.get('content-type') || 'image/webp');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
