const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Messages');
worksheet.columns = [
  { header: 'Chat Type', key: 'chatType', width: 15 },
  { header: 'Sender/Group', key: 'senderOrGroup', width: 30 },
  { header: 'Member Name', key: 'memberName', width: 20 },
  { header: 'Message', key: 'message', width: 50 },
  { header: 'Timestamp', key: 'timestamp', width: 25 },
];

// Function to save message data to Excel
const saveMessageToExcel = async (messageData, savePath) => {
  const isDuplicate = worksheet.getColumn('message').values.includes(messageData.text);
  if (!isDuplicate && messageData.text.trim()) {
    worksheet.addRow({
      chatType: messageData.chatType,
      senderOrGroup: messageData.senderOrGroup,
      memberName: messageData.memberName || 'N/A',
      message: messageData.text,
      timestamp: new Date().toLocaleString(),
    });

    if (!fs.existsSync(path.dirname(savePath))) {
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
    }

    await workbook.xlsx.writeFile(savePath);
  }
};

module.exports = { saveMessageToExcel, worksheet };
