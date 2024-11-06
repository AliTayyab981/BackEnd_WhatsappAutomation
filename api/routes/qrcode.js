const express = require('express');
const router = express.Router();
const { client } = require('../services/whatsappClient');

module.exports = (io) => {
  router.get('/', (req, res) => {
    client.on('qr', (qr) => {
      io.emit('qrUpdated', qr);
      console.log('QR code sent to frontend.');
    });
    res.status(200).json({ message: 'QR code emission initialized' });
  });

  return router;
};
