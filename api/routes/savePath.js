const express = require('express');
const path = require('path');
const router = express.Router();

let savePath = path.join(__dirname, '../structured_messages.xlsx');

router.post('/', (req, res) => {
  const { path: newPath } = req.body;
  if (newPath) {
    savePath = newPath;
    res.json({ message: 'Path updated successfully', path: savePath });
  } else {
    res.status(400).json({ error: 'Path is required' });
  }
});

module.exports = router;
