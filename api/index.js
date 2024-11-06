const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { client } = require('./services/whatsappClient');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://front-end-whatsapp-automation.vercel.app/",
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: "https://front-end-whatsapp-automation.vercel.app/",
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Define routes
app.use('/api/qrcode', require('./routes/qrcode')(io));
app.use('/api/save-path', require('./routes/savePath'));
app.use('/download-excel', require('./routes/downloadExcel'));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
