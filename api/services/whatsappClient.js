const { Client } = require('whatsapp-web.js');

const client = new Client();
client.initialize();

client.on('ready', () => {
  console.log('WhatsApp is ready!');
});

module.exports = { client };
