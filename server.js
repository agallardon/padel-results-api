const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());

const TOKEN = process.env.PADEL_TOKEN;

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
    if (!miami) return res.json({ error: 'Miami not found', available: tours.data?.map(t => t.name) });

    const matchRes = await fetch(`https://padelapi.org/api/tournaments/${miami.id}/matches?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    res.json({
      tournament_name: miami.name,
      tournament_id: miami.id,
      matches: matchRes.data || [],
      last_page: 1
    });
  } catch (e) {
    console.error('Error:', e.message);
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
    // Get player data from padelapi which should include a photo URL
    const player = await fetch(`https://padelapi.org/api/players/${req.params.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    console.log('Player data for', req.params.id, ':', JSON.stringify(player).substring(0, 400));

    // Try common photo field names
    const photoUrl = player.photo || player.image || player.avatar || 
                     player.picture || player.data?.photo || player.data?.image ||
                     player.data?.avatar || player.data?.picture;

    if (!photoUrl) return res.status(404).json({ error: 'No photo found', fields: Object.keys(player.data || player) });

    // Proxy the image
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return res.status(404).send('Photo not found');
    const buffer = await imgRes.buffer();
    res.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
```

Once deployed, open this in your browser and paste what you see:
```
https://padel-results-api-production.up.railway.app/player/79
