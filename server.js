require('dotenv').config();

const express = require('express');

const { createTwitchClient } = require('./server/lib/twitchClient');
const { createTwitchRouter } = require('./server/routes/twitch');
const { createTrovoClient } = require('./server/lib/trovoClient');
const { createTrovoRouter } = require('./server/routes/trovo');

const app = express();
const port = Number(process.env.PORT || 3000);

const twitchClient = createTwitchClient({
  clientId: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
});

const trovoClient = createTrovoClient({
  clientId: process.env.TROVO_CLIENT_ID,
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/twitch', createTwitchRouter({ twitchClient }));
app.use('/api/trovo', createTrovoRouter({ trovoClient }));

app.use(express.static(process.cwd()));

app.listen(port, () => {
  console.log(`Stream Hub running on http://localhost:${port}`);
});
