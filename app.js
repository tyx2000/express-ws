const express = require('express');
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const app = express();

const port = 8080;

app.get('/', (req, res) => {
  res.json({ data: 'hello' });
});

app.get('/login', (req, res) => {
  const { uid } = req.query;
  redis.setex(uid, 3600, uid);
  res.json({ code: 200, success: true });
});

app.listen(port, () => {
  console.log('app running');
});
