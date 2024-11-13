require('dotenv').config();  // Load environment variables from .env file
const express = require("express");
const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

// Initialize Express app and Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Allow your frontend origin
    methods: ["GET", "POST"], // Allow these methods
    credentials: true, // Allow cookies and credentials if needed
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Frontend URL
    methods: ["GET", "POST"], // Allowed methods
    credentials: true, // Allow credentials
  })
);

app.use(express.json());

// DeepAI API key setup
// Fetch the API key securely from environment variables
const deepai = axios.create({
  baseURL: 'https://api.deepai.org/api/',
  headers: {
    'api-key': "71890ae2-afe7-4b5d-bc80-b1dfa84a1804", // Use environment variable for the API key
  },
});

const client = new Client();

// Define allowed groups and numbers
const allowedGroups = ["Working"];
const allowedNumbers = ["923214271981"];

// Excel Workbook
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Messages");
worksheet.columns = [
  { header: "Chat Type", key: "chatType", width: 15 },
  { header: "Sender/Group", key: "senderOrGroup", width: 30 },
  { header: "Member Name", key: "memberName", width: 20 },
  { header: "Message", key: "message", width: 50 },
  { header: "Timestamp", key: "timestamp", width: 25 },
  { header: "Society", key: "society", width: 15 },
  { header: "Phase", key: "phase", width: 10 },
  { header: "Plot", key: "plot", width: 10 },
  { header: "Block", key: "block", width: 10 },
  { header: "Demand", key: "demand", width: 10 },
  { header: "Size", key: "size", width: 10 },
  { header: "Commercial", key: "commercial", width: 15 },
  { header: "Date", key: "date", width: 15 },
  { header: "Corner", key: "corner", width: 10 },
  { header: "Facing", key: "facing", width: 10 },
  { header: "Park", key: "park", width: 10 },
  { header: "Road", key: "road", width: 10 },
  { header: "Client Number", key: "clientNumber", width: 15 },
  { header: "Dealer Number", key: "dealerNumber", width: 15 },
  { header: "Portion", key: "portion", width: 15 },
  { header: "FullHouse", key: "fullhouse", width: 15 },
  { header: "Sale", key: "sale", width: 15 },
];

// Function to check if the message already exists in the worksheet
const isMessageDuplicate = async (messageText) => {
  const existingMessages = worksheet.getColumn("message").values;
  return existingMessages.includes(messageText);
};

// Endpoint to send QR code to the frontend
client.on("qr", (qr) => {
  io.emit("qrUpdated", qr); // Emit the QR code to all connected clients
  qrcode.generate(qr, { small: true });
  console.log("Scan this QR code with WhatsApp to connect.");
});

// Initialize the client
client.initialize();

let savePath = path.join(__dirname, "structured_messages.xlsx"); // Default path

// Save messages to Excel file
const parseMessageUsingDeepAI = async (message) => {
  const prompt = `
  Extract structured details from the following message:

  Message: "${message}"

  The details should include:
  - Chat Type (e.g., Direct, Group)
  - Sender/Group Name
  - Member Name (if available)
  - Society
  - Phase
  - Plot
  - Block
  - Demand
  - Size (e.g., Marla, Kanal)
  - Commercial (Yes/No)
  - Date
  - Corner (Yes/No)
  - Facing (e.g., North, South, East, West)
  - Park (Yes/No)
  - Road (Yes/No)
  - Client Number
  - Dealer Number
  - Portion
  - FullHouse (Yes/No)
  - Sale (Yes/No)
  
  Please return the information in JSON format with the above keys.
  `;

  try {
    // Make request to DeepAI API
    const response = await deepai.post('text-generator', { text: prompt });

    // Assuming the response returns a JSON string, we parse it
    const parsedData = JSON.parse(response.data.output); 
    return parsedData;
  } catch (error) {
    console.error("Error parsing message using DeepAI:", error.response ? error.response.data : error.message);
    return null;
  }
};

// Listen for incoming WhatsApp messages
client.on("message", async (msg) => {
  const sender = msg.from;
  const message = msg.body;
  const timestamp = msg.timestamp;
  const chat = await msg.getChat();

  console.log(`Message received from ${sender}: ${message}`);

  // Parse message using DeepAI
  const messageData = await parseMessageUsingDeepAI(message);

  if (!messageData) {
    console.error("Failed to parse message with DeepAI");
    return;
  }

  // Check if message already exists to prevent duplicates
  const duplicate = await isMessageDuplicate(messageData.message);
  if (duplicate) {
    console.log("Duplicate message, not saving to Excel");
    return;
  }

  // Add message data to Excel
  messageData.timestamp = new Date(timestamp * 1000).toLocaleString(); // Convert timestamp to readable format
  worksheet.addRow(messageData);
  await workbook.xlsx.writeFile(savePath);

  console.log("Message saved to Excel!");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
