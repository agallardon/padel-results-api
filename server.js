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
    if (!miami) return res.json({ error: 'Miami not found' });

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

    console.log('Player fields:', JSON.stringify(player).substring(0, 500));

    const data = player.data || player;
    const photoUrl = data.photo || data.image || data.avatar || data.picture || data.photo_url;

    if (!photoUrl) {
      return res.status(404).json({ error: 'No photo field found', fields: Object.keys(data) });
    }

    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return res.status(404).send('Photo fetch failed');
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

Make sure when you paste into GitHub that you can see `app.listen` at the very bottom — that's how you know the file is complete. Commit it and Railway will redeploy. Then open:
```
https://padel-results-api-production.up.railway.app/player/79
