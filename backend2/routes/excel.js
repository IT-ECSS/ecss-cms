const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const axios = require('axios');

// Direct Excel export (existing)
router.post('/export-excel-direct', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    console.log(`📊 Generating Excel for ${data.length} records`);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add formatting
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          maxWidth = Math.max(maxWidth, cell.v.toString().length);
        }
      }
      colWidths.push({ width: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });
    
    // Set headers for direct download
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `attendance_report_${timestamp}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log(`✅ Direct Excel download: ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
    
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

// Excel Online integration with Microsoft Graph
router.post('/export-excel-online', async (req, res) => {
  try {
    const { data, accessToken, fileName } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Microsoft access token required' });
    }
    
    console.log(`📊 Creating Excel Online file for ${data.length} records`);
    
    // Create Excel file
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add formatting
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          maxWidth = Math.max(maxWidth, cell.v.toString().length);
        }
      }
      colWidths.push({ width: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });
    
    // Upload to OneDrive
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const finalFileName = fileName || `attendance_report_${timestamp}.xlsx`;
    
    try {
      // Upload file to OneDrive
      const uploadResponse = await axios.put(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${finalFileName}:/content`,
        buffer,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          maxContentLength: 50 * 1024 * 1024, // 50MB limit
          timeout: 60000
        }
      );
      
      const uploadedFile = uploadResponse.data;
      console.log(`✅ File uploaded to OneDrive: ${finalFileName}`);
      
      // Create sharing link
      const sharingResponse = await axios.post(
        `https://graph.microsoft.com/v1.0/me/drive/items/${uploadedFile.id}/createLink`,
        {
          type: 'edit',
          scope: 'anonymous'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const sharingLink = sharingResponse.data;
      
      res.json({
        success: true,
        fileName: finalFileName,
        recordCount: data.length,
        size: `${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
        oneDriveUrl: uploadedFile.webUrl,
        editUrl: sharingLink.link.webUrl,
        downloadUrl: `https://graph.microsoft.com/v1.0/me/drive/items/${uploadedFile.id}/content`,
        fileId: uploadedFile.id
      });
      
    } catch (graphError) {
      console.error('❌ Microsoft Graph API error:', graphError.response?.data || graphError.message);
      
      // Fallback: provide file as download instead
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('❌ Error in Excel Online export:', error);
    res.status(500).json({ 
      error: 'Failed to create Excel Online file',
      details: error.message 
    });
  }
});

module.exports = router;