const express = require('express');
const path = require('path');
const router = express.Router();

const savePath = path.join(__dirname, '../structured_messages.xlsx');

router.get('/', (req, res) => {
  res.download(savePath, 'structured_messages.xlsx', (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      res.status(500).send('Failed to download file');
    }
  });
});

module.exports = router;
