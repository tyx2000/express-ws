const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');

const http = require('http');
const socketIO = require('socket.io');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

const verifyUid = (req, res, next) => {
  const token = req.headers.authorization;
  console.log(token);
  next();
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
  socket.on('chat', (msg) => {
    console.log(msg);
  });
});

io.on('message', ({ targetSocketId, message }) => {
  io.to(targetSocketId).emit('message', message);
});

app.use(cors());
app.use(verifyUid);

const port = 8080;

app.get('/', (req, res) => {
  res.json({ data: 'hello' });
});

app.get('/login', (req, res) => {
  const { uid } = req.query;
  redis.setex('token-' + uid, 3600, uid);
  res.json({ code: 200, success: true });
});
app.get('/logout', (req, res) => {
  const { uid } = req.query;
  redis.delete('token-' + uid);
  res.json({ data: 'logout' });
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
