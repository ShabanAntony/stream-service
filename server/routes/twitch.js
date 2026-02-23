const express = require('express');

function createTwitchRouter({ twitchClient }) {
  const router = express.Router();

  router.get('/streams-by-game', async (req, res) => {
    try {
      const name = String(req.query.name || '').trim();
      if (!name) {
        res.status(400).json({ error: 'Missing query param: name' });
        return;
      }

      const first = Math.min(Math.max(Number(req.query.first || 10), 1), 100);
      const data = await twitchClient.getStreamsByGameName({ name, first });
      res.json({ data });
    } catch (err) {
      const status = err && err.statusCode ? err.statusCode : 500;
      res.status(status).json({ error: String(err.message || err) });
    }
  });

  router.get('/categories', async (req, res) => {
    try {
      const first = Math.min(Math.max(Number(req.query.first || 10), 3), 20);
      const data = await twitchClient.getTopCategoriesWithTags({ first });
      res.json({ data });
    } catch (err) {
      const status = err && err.statusCode ? err.statusCode : 500;
      res.status(status).json({ error: String(err.message || err) });
    }
  });

  return router;
}

module.exports = {
  createTwitchRouter,
};
