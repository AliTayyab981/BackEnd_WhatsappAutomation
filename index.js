const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://front-end-whatsapp-automation.vercel.app/", // Allow your frontend origin
        methods: ['GET', 'POST'],        // Allow these methods
        credentials: true                // Allow cookies and credentials if needed
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "https://front-end-whatsapp-automation.vercel.app/", // Frontend URL
    methods: ['GET', 'POST'],        // Allowed methods
    credentials: true                // Allow credentials
}));

app.use(express.json());

const client = new Client();

// Define allowed groups and numbers
const allowedGroups = ["Working"];
const allowedNumbers = ["923214271981"];

// Excel Workbook
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Messages');
worksheet.columns = [
    { header: 'Chat Type', key: 'chatType', width: 15 },
    { header: 'Sender/Group', key: 'senderOrGroup', width: 30 },
    { header: 'Member Name', key: 'memberName', width: 20 },
    { header: 'Message', key: 'message', width: 50 },
    { header: 'Timestamp', key: 'timestamp', width: 25 },
];

// Function to check if the message already exists in the worksheet
const isMessageDuplicate = async (messageText) => {
    const existingMessages = worksheet.getColumn('message').values;
    return existingMessages.includes(messageText);
};

// Endpoint to send QR code to the frontend
app.get('/api/qrcode', (req, res) => {
    client.on('qr', (qr) => {
        io.emit('qrUpdated', qr); // Emit the QR code to all connected clients
        qrcode.generate(qr, { small: true });
        console.log('Scan this QR code with WhatsApp to connect.');
    });
    res.status(200).json({ message: 'QR code emitted' });
});

// Initialize the client
client.initialize();

// Endpoint to set save path for the Excel file
let savePath = path.join(__dirname, 'structured_messages.xlsx'); // Default path

app.post('/api/save-path', (req, res) => {
    const { path: newPath } = req.body;
    if (newPath) {
        savePath = newPath;
        res.json({ message: 'Path updated successfully', path: savePath });
    } else {
        res.status(400).json({ error: 'Path is required' });
    }
});

// Save messages to Excel file
const saveMessageToExcel = async (messageData) => {
    // Only save if the message is not empty and not a duplicate
    if (messageData.text.trim() === '') return; // Skip empty messages

    const isDuplicate = await isMessageDuplicate(messageData.text);
    if (isDuplicate) {
        console.log(`Message already exists: ${messageData.text}`);
        return; // Skip duplicate messages
    }

    worksheet.addRow({
        chatType: messageData.chatType,
        senderOrGroup: messageData.senderOrGroup,
        memberName: messageData.memberName || 'N/A',
        message: messageData.text,
        timestamp: new Date().toLocaleString(),
    });

    // Ensure the directory exists before writing the file
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    await workbook.xlsx.writeFile(savePath);
};
client.on('ready', () => {
    console.log('WhatsApp is ready!');
    io.emit('whatsappConnected'); // Emit the event when WhatsApp is connected
});

client.on('message', async (message) => {
    if (message.hasMedia) return;

    const chat = await message.getChat();
    const contact = await message.getContact();
    const messageData = {
        chatType: chat.isGroup ? 'Group' : 'Personal',
        senderOrGroup: chat.isGroup ? chat.name : (contact.pushname || contact.name || 'Unknown'),
        memberName: chat.isGroup ? (contact.pushname || contact.name || 'Unknown Member') : '',
        text: message.body,
    };

    // Check if the message is from an allowed group or an allowed number
    const isFromAllowedGroup = chat.isGroup && allowedGroups.includes(chat.name);
    const isFromAllowedNumber = !chat.isGroup && allowedNumbers.includes(contact.number);

    if (isFromAllowedGroup || isFromAllowedNumber) {
        // Save message to Excel file
        await saveMessageToExcel(messageData);
        console.log(`Message saved from ${messageData.senderOrGroup}: ${messageData.text}`);
    } else {
        console.log(`Message not saved: ${messageData.senderOrGroup}: ${messageData.text}`);
    }
});

// Endpoint to download the Excel file
app.get('/download-excel', (req, res) => {
    res.download(savePath, 'structured_messages.xlsx', (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).send('Failed to download file');
        }
    });
});

// Start server and socket.io
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
