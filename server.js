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

    const season = (seasons.data || []).find(s =>
      s.name && s.name.includes('Premier') && s.year === 2026
    );
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
