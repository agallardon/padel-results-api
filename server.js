const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());

const TOKEN = process.env.PADEL_TOKEN;

app.get('/matches', async (req, res) => {
  try {
    const page = req.query.page || 1;

    // Step 1 - seasons
    const seasonsRaw = await fetch('https://padelapi.org/api/seasons', {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const seasons = await seasonsRaw.json();
    console.log('Seasons response:', JSON.stringify(seasons).substring(0, 300));

    const season = (seasons.data || []).find(s =>
      s.name && s.name.includes('Premier') && s.year === 2026
    );
    if (!season) return res.json({ error: 'Season not found', seasons_received: seasons });

    // Step 2 - tournaments
    const toursRaw = await fetch(`https://padelapi.org/api/seasons/${season.id}/tournaments?per_page=50`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const tours = await toursRaw.json();
    console.log('Tournaments response:', JSON.stringify(tours).substring(0, 300));

    const miami = (tours.data || []).find(t =>
      t.name?.toLowerCase().includes('miami') ||
      t.location?.toLowerCase().includes('miami') ||
      t.city?.toLowerCase().includes('miami')
    );
    if (!miami) return res.json({ error: 'Miami not found', tournaments_received: tours.data?.map(t => t.name) });

    // Step 3 - matches
    const matchRaw = await fetch(`https://padelapi.org/api/tournaments/${miami.id}/matches?per_page=50&page=${page}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const matchRes = await matchRaw.json();
    console.log('Matches meta:', JSON.stringify(matchRes.meta));

    res.json({
      tournament_name: miami.name,
      tournament_id: miami.id,
      matches: matchRes.data || [],
      last_page: matchRes.meta?.last_page || 1
    });

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
