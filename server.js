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

    const season = seasons.data.find(s => s.name.includes('Premier') && s.year === 2026);
    if (!season) return res.json({ error: 'Season not found' });

    const tours = await fetch(`https://padelapi.org/api/seasons/${season.id}/tournaments?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    const miami = tours.data.find(t =>
      t.name?.toLowerCase().includes('miami') ||
      t.location?.toLowerCase().includes('miami') ||
      t.city?.toLowerCase().includes('miami')
    );
    if (!miami) return res.json({ error: 'Miami tournament not found' });

    const matches = await fetch(`https://padelapi.org/api/tournaments/${miami.id}/matches?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    }).then(r => r.json());

    res.json({ tournament_name: miami.name, tournament_id: miami.id, matches: matches.data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
```

Commit it the same way.

---

**Third file — one more time "Add file" → "Create new file"**

Name it `Procfile` (no extension) and paste:
```
web: node server.js
