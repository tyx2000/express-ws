const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const jwtSecretKey = '23434985894';

const verifyToken = (req, res, next) => {
  // Skip verification for login route
  if (req.path === '/login') {
    return next();
  }

  const token = req.headers.authorization.split(' ')[1];

  console.log('middle', token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  } else {
    jwt.verify(token, jwtSecretKey, (err, user) => {
      if (err) {
        return res.json({ data: 'invalid token' });
      } else {
        console.log('uuuuuuuuu', user);
        next();
      }
    });
  }
};

const app = express();

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('connection', socket.id, socket.handshake.query.userId);
  const connectionUserId = socket.handshake.query.userId;
  redis.set('ws-' + connectionUserId, socket.id);
  socket.on('disconnect', () => {
    console.log('disconnect');
  });
  socket.on('transferCenter', ({ targetSocketId, message }) => {
    console.log('ttttttt', targetSocketId, message);
    io.to(targetSocketId).emit('receiveMessage', message);
  });
});

app.use(cors());
app.use(verifyToken);

const port = 8080;

app.get('/login', async (req, res) => {
  const { username } = req.query;
  console.log(req.ip, username);

  const token = jwt.sign(
    {
      username,
      loginAt: Date.now(),
    },
    jwtSecretKey,
    {
      expiresIn: '30d',
    },
  );

  console.log('login', token);

  redis.setex(`token:${username}`, 60 * 60 * 24 * 30, token);

  res.json({ code: 200, success: true, data: { token } });
});

app.get('/logout', (req, res) => {
  const { username } = req.query;
  redis.delete('token:' + username);
  res.json({ success: true });
});

app.get('/search', async (req, res) => {
  const { username } = req.query;
  const user = await redis.get('token:' + username);
  res.json({ success: !!res });
});

app.get('/chat', (req, res) => {
  const { uid } = req.query;
  redis.get('ws-' + uid).then((line) => {
    console.log(line);
    res.json({ targetSocketId: line });
  });
});

server.listen(port, () => {
  console.log('app running');
});
