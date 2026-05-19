const PDFDocument = require('pdfkit');
const axios = require('axios');
const sharp = require('sharp'); // Import sharp for image processing
const path = require('path');
const getCourseReferenceCode = require('../../constants/courseCodeMapping');

class invoiceGenerator {
    constructor() {}

    sanitizeStaffName(value) {
        return String(value ?? '').replace(/\s*\(Approved\)\s*$/i, '').trim();
    }
    
    getCurrentDateTime() {
        const now = new Date();
        const singaporeOffset = 8 * 60;
        const localOffset = now.getTimezoneOffset();
        const sgNow = new Date(now.getTime() + (singaporeOffset - localOffset) * 60000);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const day = String(sgNow.getDate()).padStart(2, '0');
        const month = monthNames[sgNow.getMonth()];
        const year = sgNow.getFullYear();
        const hours = String(sgNow.getHours()).padStart(2, '0');
        const minutes = String(sgNow.getMinutes()).padStart(2, '0');
        const seconds = String(sgNow.getSeconds()).padStart(2, '0');

        return {
            date: `${day} ${month.substring(0,3)} ${year}`,
            time: `${hours}:${minutes}:${seconds}`,
        };
    }

    getInvoiceCurrentDateTime() {
        const now = new Date();
        const singaporeOffset = 8 * 60;
        const localOffset = now.getTimezoneOffset();
        const sgNow = new Date(now.getTime() + (singaporeOffset - localOffset) * 60000);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const day = String(sgNow.getDate()).padStart(2, '0');
        const month = monthNames[sgNow.getMonth()];
        const year = sgNow.getFullYear();
        const hours = String(sgNow.getHours()).padStart(2, '0');
        const minutes = String(sgNow.getMinutes()).padStart(2, '0');
        const seconds = String(sgNow.getSeconds()).padStart(2, '0');

        return {
            date: `${day} ${month} ${year}`,
            time: `${hours}:${minutes}:${seconds}`,
        };
    }

    async addHeader(doc, invoiceNumber) {
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2025/01/featured_image.png";
        
        try {
            // Set Title "Invoice"
            const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
            const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
            const pageWidth = doc.page.width; // Get page width
            const fontWidth = doc.widthOfString("INVOICE", { font: fontPathBold, fontSize: 24 }); // Get width of the text
            
            const centerX = (pageWidth - fontWidth) / 4; // Calculate the X position to center the text
            const currentY = 10; // Set the Y position (you can adjust this as needed)
            
            doc.font(fontPathBold)
                .fontSize(24) // Ensure you are using font size 24
                .text("INVOICE", centerX - 50, currentY, { align: 'center' }); // Align text to the center
            
            doc.moveDown(1); // Adjust this as needed to add space below
                
            // Fetch the image as a buffer
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);
    
            // Use sharp to get the image dimensions
            const { width, height } = await sharp(imageBuffer).metadata();
    
            // Set the left and right margins in points
            const leftMargin = (2.54 * 28.35) / 2; // 2.54 cm to points
            const rightMargin = 15.93; // Right margin in points
    
            // Calculate the effective image width
            const imageWidth = doc.page.width - leftMargin - rightMargin; // Full width minus margins
            const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio
    
            // Scale the image down to 25% of its original size
            const scale = 0.1; // 25% scale
            const scaledImageWidth = imageWidth * scale;
            const scaledImageHeight = imageHeight * scale;
    
            // Add the image to the document with the left margin
            doc.image(imageBuffer, leftMargin, doc.y, {
                width: scaledImageWidth, // Set the scaled image width
                height: scaledImageHeight, // Set the scaled image height
                align: 'left', // Align the image to the left
                valign: 'top' // Align the image to the top
            });
    
            // Set the starting X position for the text (to the right of the image)
            const textX = leftMargin + scaledImageWidth + 10; // Add a little space between the image and text
            let textY = doc.y; // This will ensure the text starts at the same Y position as the image
    
            // Add the text beside the logo (En Community Services Society)
            doc.font(fontPathBold).fontSize(12).text("En Community Services Society", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathRegular).fontSize(12).text("UEN - T03SS0051L", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathBold).fontSize(12).text("Mailing Address:", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathRegular).fontSize(12).text("2 Kallang Avenue, CT Hub #06-14", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathRegular).fontSize(12).text("Singapore 339407", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathRegular).fontSize(12).text("Tel - 67886625", textX, textY);
            textY += 15; // Add vertical offset for the next line
            doc.font(fontPathRegular).fontSize(12).text("Email : encom@ecss.org.sg", textX, textY);
    
            // Add the invoice details line by line
            const newTextX = textX + 410; // Adjust X position for the new set of text (beside the first block)
    
            // Set the starting Y position for the invoice details
            let currentYInvoice = textY-(15*6); // Start a bit lower than the last Y position
    
          // Add "INVOICE DATE:"
            if(invoiceNumber.includes("TP"))
            {
                doc.font(fontPathRegular).text("INVOICE DATE: " + this.getCurrentDateTime().date, newTextX-10, currentYInvoice);
            }
            else
            {
                doc.font(fontPathRegular).text("INVOICE DATE: " + this.getCurrentDateTime().date, newTextX, currentYInvoice);
            }
            currentYInvoice += 15; // Move down for the next line

            // Add gap after odd line (even line should have a gap)
            currentYInvoice += 15; // Increase Y to add space for the next line (even line gap)

            // Add "INVOICE NO."
            if(invoiceNumber.includes("TP"))
            {
                doc.font(fontPathRegular).text("INVOICE NO.: "+invoiceNumber, newTextX-10, currentYInvoice);
            }
            else
            {
                doc.font(fontPathRegular).text("INVOICE NO.: "+invoiceNumber, newTextX, currentYInvoice);
            }
            currentYInvoice += 15; // Move down for the next line

            // Add gap after odd line (even line should have a gap)
            currentYInvoice += 15; // Increase Y to add space for the next line (even line gap)


            // Move down after the image and text
            doc.moveDown(2); // Adjust this as needed to add space below
        } catch (error) {
            console.error('Error fetching the image:', error);
        }
    }
    
    addFooter = async (doc, y) => {
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
    
        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const textX = leftMargin-40; // Adjust 'leftMargin' to align the text properly
    
        // Set the font and size for the notes
        doc.font(fontPathRegular).fontSize(11);
    
        // Add each note line with consistent vertical spacing
        doc.text(
            "NOTES: 1. Participant is responsible to apply for SkillsFuture Credit claim before the start date of the course.",
            textX,
            y
        );
        y += 15; // Add vertical offset for the next line
    
        doc.text(
            "               2. Should the application for SFC claims be rejected by SkillsFuture Singapore, full subsidised fees will be payable by cash.",
            textX,
            y);
        y += 15; // Add vertical offset for the next line
    
        doc.text(
            "               3. Cash payment may be made by cash or cheque at our office, or PayNow to our UEN T03SS0051L.",
            textX,
            y
        );
        y += 15; // Add vertical offset for the next line
    
        doc.text(
            "               4. NSA subsidy is applicable to Singaporean or Singapore PR aged 50 and above.",
            textX,
            y
        );
        y += 15; // Add vertical offset for the next line
    
        doc.text(
            "               5. This is a computer generated invoice and requires no signature.",
            textX,
            y
        );
        y += 15; // Add vertical offset for the next lin
    };
    
    formatDate(dateStr) {
        const parts = dateStr.split(' ');
        const day = parts[0]; // '23'
        const month = parts[1]; // 'January'
        const year = parts[2]; // '2025'

        // Convert the full month name to a 3-letter abbreviation
        const monthAbbr = month.substring(0, 3); // 'Jan'

        // Return the formatted date as dd-mmm-yyyy
        return `${day}-${monthAbbr}-${year}`;
    }
        
    async addBody(doc, array, age) {
        const fontSize = 24;

        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const rightMargin = 15.93; // Right margin in points
    
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file
    
        // Store the current y position
        let currentY = doc.y;
    
        // First Text
        doc.font(fontPathBold).fontSize(12).text("REGISTRATION OF NSA COURSES ELIGIBLE FOR SKILLSFUTURE CREDIT", leftMargin + 100, currentY);
        currentY += 15; // Manually adjust the Y position after the first text
    
        doc.moveDown(0.5);
    
        // Create the course table
        await this.createCourseTable(doc, array, "Course Ref. No. ", "Course Title", "Start Date", "End Date", "Full Course Fee (S$)", "Subsidised Fee Payable (S$)", age);
        currentY = doc.y; // Update currentY to the bottom of the table
    
        doc.moveDown(15);
    
        // Second Text
        doc.font(fontPathBold).fontSize(12).text("PARTICIPANT'S PARTICULARS AND CLAIM", leftMargin + 200, currentY+30);
        currentY += 13; // Manually adjust the Y position after the second text
    
        doc.moveDown(0.5);
    
        // Create the participants table (uncomment if needed)
        this.createParticipantsTable(doc, array, "NRIC. No. ", "Name of Participant", "Full Course Fee (S$)", "Subsidised Fee Payable (S$)", "Cash", "SFC Claim", age);
        
    }
    

    async courseReferenceCode(course, coursePrice) {
        console.log(`[invoiceGenerator] courseReferenceCode called with course: "${course}", price: "${coursePrice}"`);
        // Uses centralized mapping from courseCodeMapping.js
        return await getCourseReferenceCode(course, coursePrice);
    }
      
    async createCourseTable(doc, array, header1, header2, header3, header4, header5, header6, age) {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); 
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); 
        const chineseFontPath = path.join(__dirname, '../../fonts/NotoSansSC-Regular.ttf');
    
        const leftMargin = 2.54 * 28.35 - 60; 
        const tableTop = doc.y; 
        const minRowHeight = 35; 
        const borderExternalThickness = 2; 
        const borderInternalThickness = 1; 
        const headerHeight = minRowHeight;
        const cellPadding = 5;
        const lineHeight = 12; 
    
        // Calculate 97% of paper width for table
        const paperWidth = doc.page.width;
        const totalTableWidth = paperWidth * 0.97;
        
        const headerWidths = [
            doc.widthOfString(header1),
            doc.widthOfString(header2),
            doc.widthOfString(header3),
            doc.widthOfString(header4),
            doc.widthOfString(header5),
            doc.widthOfString(header6),
        ];
    
        // Proportionally distribute column widths based on 97% paper width
        const columnWidths = {
            courseRef: totalTableWidth * 0.121, // ~12.1% of table width
            courseTitle: totalTableWidth * 0.303, // ~30.3% of table width  
            startDate: totalTableWidth * 0.097, // ~9.7% of table width
            endDate: totalTableWidth * 0.097, // ~9.7% of table width
            fullCourse: totalTableWidth * 0.176, // ~17.6% of table width
            subsidised: totalTableWidth * 0.206 // ~20.6% of table width
        };
    
        const columnPositions = {
            courseRef: leftMargin,
            courseTitle: leftMargin + columnWidths.courseRef,
            startDate: leftMargin + columnWidths.courseRef + columnWidths.courseTitle,
            endDate: leftMargin + columnWidths.courseRef + columnWidths.courseTitle + columnWidths.startDate,
            fullCourse: leftMargin + columnWidths.courseRef + columnWidths.courseTitle + columnWidths.startDate + columnWidths.endDate,
            subsidised: leftMargin + columnWidths.courseRef + columnWidths.courseTitle + columnWidths.startDate + columnWidths.endDate + columnWidths.fullCourse,
        };

        // Helper function to wrap text
        const wrapText = (text, maxWidth) => {
            const normalizedText = String(text ?? '');
            const words = normalizedText.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = doc.widthOfString(testLine);
                
                if (testWidth <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Word is too long, break it
                        lines.push(word);
                    }
                }
            });
            
            if (currentLine) {
                lines.push(currentLine);
            }
            
            return lines;
        };

        // Helper function to calculate row height based on wrapped text
        const calculateRowHeight = async (item) => {
            const courseRefCode = await this.courseReferenceCode(item.course.courseEngName, item.course.coursePrice);
            const courseName = item.course.courseEngName;
            
            const refLines = wrapText(courseRefCode, columnWidths.courseRef - cellPadding * 2);
            const nameLines = wrapText(courseName, columnWidths.courseTitle - cellPadding * 2);
            
            const durationParts = item.course.courseDuration.split('-');
            const startDate = durationParts[0].trim();
            const endDate = durationParts[1].trim();
            const formattedStartDate = this.formatDate(startDate);
            const formattedEndDate = this.formatDate(endDate);
            
            const startDateLines = wrapText(formattedStartDate, columnWidths.startDate - cellPadding * 2);
            const endDateLines = wrapText(formattedEndDate, columnWidths.endDate - cellPadding * 2);
            
            const maxLines = Math.max(refLines.length, nameLines.length, startDateLines.length, endDateLines.length, 1);
            const hasWrappedText = maxLines > 1;
            const extraGap = hasWrappedText ? 10 : 5; // More gap for wrapped text rows
            return Math.max(minRowHeight, maxLines * lineHeight + cellPadding * 2 + extraGap);
        };
    
        doc.rect(leftMargin, tableTop, totalTableWidth, headerHeight).fill('#FBFBFB');
    
        doc.fontSize(10).fillColor('black').font(fontPathBold);
        
        // Draw table headers starting from left within each cell boundary
        doc.text(header1, columnPositions.courseRef + cellPadding, tableTop + 12, { width: columnWidths.courseRef - cellPadding * 2, align: 'left' });
        doc.text(header2, columnPositions.courseTitle + cellPadding, tableTop + 12, { width: columnWidths.courseTitle - cellPadding * 2, align: 'left' });
        doc.text(header3, columnPositions.startDate + cellPadding, tableTop + 12, { width: columnWidths.startDate - cellPadding * 2, align: 'left' });
        doc.text(header4, columnPositions.endDate + cellPadding, tableTop + 12, { width: columnWidths.endDate - cellPadding * 2, align: 'left' });
        doc.text(header5, columnPositions.fullCourse + cellPadding, tableTop + 12, { width: columnWidths.fullCourse - cellPadding * 2, align: 'left' });
        doc.text(header6, columnPositions.subsidised + cellPadding, tableTop + 12, { width: columnWidths.subsidised - cellPadding * 2, align: 'left' });
    
        doc.lineWidth(borderExternalThickness)
            .moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + totalTableWidth, tableTop + headerHeight)
            .stroke('black');
    
        for (let column in columnPositions) {
            doc.lineWidth(borderInternalThickness)
                .moveTo(columnPositions[column], tableTop)
                .lineTo(columnPositions[column], tableTop + headerHeight)
                .stroke('black');
        }

    
        let currentY = tableTop + headerHeight; 
        doc.fontSize(9).fillColor('black').font(fontPathRegular);
        
        // Draw table rows with text wrapping
        for (const item of array) {
            const rowHeight = await calculateRowHeight(item);
            
            const courseRefCode = await this.courseReferenceCode(item.course.courseEngName, item.course.coursePrice);
            const courseName = item.course.courseEngName;
            console.log("Course Reference Code:", courseRefCode);
            
            const containsChinese = /[\u4e00-\u9fff]/.test(courseName);     
            if (containsChinese) {
                doc.font(chineseFontPath);  // Use Chinese font
            } else {
                doc.font(fontPathRegular);  // Use English font (Arial)
            }
            
            // Wrap text for each column
            const refLines = wrapText(courseRefCode, columnWidths.courseRef - cellPadding * 2);
            const nameLines = wrapText(courseName, columnWidths.courseTitle - cellPadding * 2);
            
            const durationParts = item.course.courseDuration.split('-');
            const startDate = durationParts[0].trim();
            const endDate = durationParts[1].trim();
            const formattedStartDate = this.formatDate(startDate);
            const formattedEndDate = this.formatDate(endDate);
            
            const startDateLines = wrapText(formattedStartDate, columnWidths.startDate - cellPadding * 2);
            const endDateLines = wrapText(formattedEndDate, columnWidths.endDate - cellPadding * 2);
            
            // Draw wrapped text in columns
            refLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.courseRef + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            nameLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.courseTitle + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            startDateLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.startDate + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            endDateLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.endDate + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            let coursePrice = 0;
            let subsidizedPrice = 0;
            let totalPrice = 0;
            if(age >= 50) {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim());
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = coursePrice;
            } else {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = totalPrice;
            }
            
            const fullCourseLines = wrapText(`$ ${totalPrice.toFixed(2)}`, columnWidths.fullCourse - cellPadding * 2);
            const subsidisedLines = wrapText(`$ ${coursePrice.toFixed(2)}`, columnWidths.subsidised - cellPadding * 2);
            
            fullCourseLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.fullCourse + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            subsidisedLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.subsidised + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            }); 
        
            // Draw row borders
            doc.lineWidth(borderInternalThickness)
                .moveTo(leftMargin, currentY)
                .lineTo(leftMargin + totalTableWidth, currentY)
                .stroke('black');

            // Draw vertical borders for each column
            Object.values(columnPositions).forEach((position) => {
                doc.moveTo(position, currentY)
                    .lineTo(position, currentY + rowHeight)
                    .stroke('black');
            });
        
            currentY += rowHeight; 
        }

        // Draw bottom border for the main table data
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, currentY)
            .lineTo(leftMargin + totalTableWidth, currentY)
            .stroke('black');
                  
        // Draw table borders
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, tableTop)
            .lineTo(leftMargin + totalTableWidth, tableTop)
            .stroke('black');    
        
        // Draw left border
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, tableTop)
            .lineTo(leftMargin, currentY)
            .stroke('black');
        
        // Draw right border
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin + totalTableWidth, tableTop)
            .lineTo(leftMargin + totalTableWidth, currentY)
            .stroke('black');
        
        // Add the invoice total row
        const invoiceRowHeight = minRowHeight;
        const invoiceText = 'Invoice Total';
        doc.font(fontPathBold).text(invoiceText, columnPositions.fullCourse + cellPadding, currentY + cellPadding); 
        
        const payablePrice = array.reduce((acc, item) => {
            let subsidizedPrice = 0;
            
            if(age >= 50) {
                subsidizedPrice = parseFloat(item.course.coursePrice.replace('$', '').trim());
            } else {
                subsidizedPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
            }
            
            return acc + subsidizedPrice;
        }, 0);

        doc.text(`$${payablePrice.toFixed(2)}`, columnPositions.subsidised + cellPadding, currentY + cellPadding);

        // Draw borders for the invoice total row (fullCourse, subsidised columns only)
        ['fullCourse', 'subsidised'].forEach((column) => {
            const position = columnPositions[column];
            doc.lineWidth(borderInternalThickness)
                .moveTo(position, currentY)
                .lineTo(position, currentY + invoiceRowHeight)
                .stroke('black');
        });
        
        // Draw the bottom border for the invoice total row (starting from fullCourse column)
        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.fullCourse, currentY + invoiceRowHeight)
            .lineTo(columnPositions.subsidised + columnWidths.subsidised, currentY + invoiceRowHeight)
            .stroke('black');

        // Extend the right border to include invoice total row
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin + totalTableWidth, currentY)
            .lineTo(leftMargin + totalTableWidth, currentY + invoiceRowHeight)
            .stroke('black');

        // Update currentY and add gap at the bottom
        currentY += invoiceRowHeight + 20;
    }

    async createParticipantsTable(doc, array, header1, header2, header3, header4, header5, header6, age) {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');
    
        const leftMargin = 2.54 * 28.35 - 60; // Same left margin as course table
        const tableTop = doc.y; // Top position of the table
        const minRowHeight = 35; // Match course table row height
        const borderInternalThickness = 1; // Border thickness
        const headerHeight = minRowHeight; // Header row height
        const cellPadding = 5; // Padding inside cells
        const lineHeight = 12; // Line height for wrapped text
    
        // Calculate 97% of paper width for table (same as course table)
        const paperWidth = doc.page.width;
        const totalTableWidth = paperWidth * 0.97;
        
        const headerWidths = [
            doc.widthOfString(header1),
            doc.widthOfString(header2),
            doc.widthOfString(header3),
            doc.widthOfString(header4),
            doc.widthOfString(header5),
            doc.widthOfString(header6),
        ];
        
        // Proportionally distribute column widths based on 97% paper width
        const columnWidths = {
            nric: totalTableWidth * 0.121, // ~12.1% of table width
            pName: totalTableWidth * 0.255, // ~25.5% of table width
            fullCourse: totalTableWidth * 0.151, // ~15.1% of table width
            subsidised: totalTableWidth * 0.151, // ~15.1% of table width
            cash: totalTableWidth * 0.109, // ~10.9% of table width
            sFCClaim: totalTableWidth * 0.213, // ~21.3% of table width
        };
    
        const columnPositions = {
            nric: leftMargin,
            pName: leftMargin + columnWidths.nric,
            fullCourse: leftMargin + columnWidths.nric + columnWidths.pName,
            subsidised: leftMargin + columnWidths.nric + columnWidths.pName + columnWidths.fullCourse,
            cash: leftMargin + columnWidths.nric + columnWidths.pName + columnWidths.fullCourse + columnWidths.subsidised,
            sFCClaim: leftMargin + columnWidths.nric + columnWidths.pName + columnWidths.fullCourse + columnWidths.subsidised + columnWidths.cash,
        };

        // Helper function to wrap text
        const wrapText = (text, maxWidth) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = doc.widthOfString(testLine);
                
                if (testWidth <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Word is too long, break it
                        lines.push(word);
                    }
                }
            });
            
            if (currentLine) {
                lines.push(currentLine);
            }
            
            return lines;
        };

        // Helper function to calculate row height based on wrapped text
        const calculateRowHeight = (item) => {
            const nricLines = wrapText(item.participant.nric, columnWidths.nric - cellPadding * 2);
            const nameLines = wrapText(item.participant.name, columnWidths.pName - cellPadding * 2);
            
            let coursePrice = 0;
            let subsidizedPrice = 0;
            let totalPrice = 0;
            if(age >= 50) {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim());
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = coursePrice;
            } else {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = totalPrice;
            }
            
            const fullCourseLines = wrapText(`$ ${totalPrice.toFixed(2)}`, columnWidths.fullCourse - cellPadding * 2);
            const subsidisedLines = wrapText(`$ ${subsidizedPrice.toFixed(2)}`, columnWidths.subsidised - cellPadding * 2);
            const cashLines = wrapText('-', columnWidths.cash - cellPadding * 2);
            const sfcClaimLines = wrapText(`$ ${coursePrice.toFixed(2)}`, columnWidths.sFCClaim - cellPadding * 2);
            
            const maxLines = Math.max(
                nricLines.length, 
                nameLines.length, 
                fullCourseLines.length, 
                subsidisedLines.length, 
                cashLines.length, 
                sfcClaimLines.length, 
                1
            );
            const hasWrappedText = maxLines > 1;
            const extraGap = hasWrappedText ? 10 : 5; // More gap for wrapped text rows
            return Math.max(minRowHeight, maxLines * lineHeight + cellPadding * 2 + extraGap);
        };
    
        // Draw header background
        doc.rect(leftMargin, tableTop, totalTableWidth, headerHeight).fill('#FBFBFB');
        
        doc.fontSize(10).fillColor('black').font(fontPathBold);
    
        // Draw table headers starting from left within each cell boundary
        doc.text(header1, columnPositions.nric + cellPadding, tableTop + 12, { width: columnWidths.nric - cellPadding * 2, align: 'left' });
        doc.text(header2, columnPositions.pName + cellPadding, tableTop + 12, { width: columnWidths.pName - cellPadding * 2, align: 'left' });
        doc.text(header3, columnPositions.fullCourse + cellPadding, tableTop + 12, { width: columnWidths.fullCourse - cellPadding * 2, align: 'left' });
        doc.text(header4, columnPositions.subsidised + cellPadding, tableTop + 12, { width: columnWidths.subsidised - cellPadding * 2, align: 'left' });
        doc.text(header5, columnPositions.cash + cellPadding, tableTop + 12, { width: columnWidths.cash - cellPadding * 2, align: 'left' });
        doc.text(header6, columnPositions.sFCClaim + cellPadding, tableTop + 12, { width: columnWidths.sFCClaim - cellPadding * 2, align: 'left' });
    
        // Draw header borders
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, tableTop)
            .lineTo(leftMargin + totalTableWidth, tableTop)
            .stroke('black');
    
        doc.moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + totalTableWidth, tableTop + headerHeight)
            .stroke('black');
    
        // Draw vertical column borders for header
        Object.values(columnPositions).forEach((position) => {
            doc.moveTo(position, tableTop)
                .lineTo(position, tableTop + headerHeight)
                .stroke('black');
        });
        
        // Draw right border for header
        doc.moveTo(leftMargin + totalTableWidth, tableTop)
            .lineTo(leftMargin + totalTableWidth, tableTop + headerHeight)
            .stroke('black');
    
        let currentY = tableTop + headerHeight;
        doc.fontSize(9).fillColor('black').font(fontPathRegular);
    
        // Draw table rows with text wrapping
        array.forEach((item, index) => {
            const rowHeight = calculateRowHeight(item);
            
            // Wrap text for each column
            const nricLines = wrapText(item.participant.nric, columnWidths.nric - cellPadding * 2);
            const nameLines = wrapText(item.participant.name, columnWidths.pName - cellPadding * 2);
    
            let coursePrice = 0;
            let subsidizedPrice = 0;
            let totalPrice = 0;
            if(age >= 50) {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim());
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = coursePrice;
            } else {
                coursePrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                totalPrice = parseFloat(item.course.coursePrice.replace('$', '').trim()) * 5;
                subsidizedPrice = totalPrice;
            }
            
            const fullCourseLines = wrapText(`$ ${totalPrice.toFixed(2)}`, columnWidths.fullCourse - cellPadding * 2);
            const subsidisedLines = wrapText(`$ ${subsidizedPrice.toFixed(2)}`, columnWidths.subsidised - cellPadding * 2);
            const cashLines = wrapText('-', columnWidths.cash - cellPadding * 2);
            const sfcClaimLines = wrapText(`$ ${coursePrice.toFixed(2)}`, columnWidths.sFCClaim - cellPadding * 2);

            // Draw wrapped text in all columns
            nricLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.nric + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            nameLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.pName + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            fullCourseLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.fullCourse + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            subsidisedLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.subsidised + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            cashLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.cash + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
            
            sfcClaimLines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions.sFCClaim + cellPadding, currentY + cellPadding + lineIndex * lineHeight);
            });
    
            // Draw row borders
            doc.lineWidth(borderInternalThickness)
                .moveTo(leftMargin, currentY)
                .lineTo(leftMargin + totalTableWidth, currentY)
                .stroke('black');
    
            // Draw vertical borders for each column
            Object.values(columnPositions).forEach((position) => {
                doc.moveTo(position, currentY)
                    .lineTo(position, currentY + rowHeight)
                    .stroke('black');
            });
    
            currentY += rowHeight;
        });
    
        // Draw final bottom border
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, currentY)
            .lineTo(leftMargin + totalTableWidth, currentY)
            .stroke('black');
    
        // Draw left border
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin, tableTop)
            .lineTo(leftMargin, currentY)
            .stroke('black');
    
        // Draw right border
        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin + totalTableWidth, tableTop)
            .lineTo(leftMargin + totalTableWidth, currentY)
            .stroke('black');

        // Add gap at the bottom
        doc.y = currentY + 20;
    }
    

    async addContent(doc, array, name, receiptNo, age) {
        console.log("Add Content:", name,age);
        
        // Initial header addition for the first page
        await this.addHeader(doc, receiptNo); // Add header to the first page
    
        doc.moveDown(3);
    
        // Add body content for the first page
        await this.addBody(doc, array, age);
    
        // Adjust the vertical position for the footer
        const footerY = doc.y+36; // Reduced gap by 20% (was 45, now 36)
    
        // Add footer content
        await this.addFooter(doc, footerY);
    }
    async generateInvoice(res, array, name, receiptNo, age) {
        console.log(array, name, receiptNo);
    
        try {
            name = this.sanitizeStaffName(name);
            console.log("Staff Name:", name);
            // Set headers for PDF
            const filename = `Moses.pdf`;
    
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
            // Disable browser/proxy caching so the invoice is always freshly generated.
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
    
            // Log headers just before sending the response
            console.log('Sending headers:', {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            });
    
            // Set paper orientation to landscape
            const doc = new PDFDocument({ layout: 'landscape' });
    
            // Add error listener
            doc.on('error', (err) => {
                console.error('Error while generating PDF:', err);
                if (!res.headersSent && !res.writableEnded) {
                    res.status(500).json({ error: 'Error generating PDF' });
                }
            });
    
            doc.pipe(res);
    
            // Ensure addContent is called correctly with await
            await this.addContent(doc, array, name, receiptNo, age);
    
            // Finalize the document
            doc.end();
    
            // Listen for the finish event
            res.on('finish', () => {
                console.log('PDF response sent successfully.');
            });
    
        } catch (error) {
            console.error('Error in PDF generation:', error);
            if (!res.headersSent && !res.writableEnded) {
                res.status(500).json({ error: 'An unexpected error occurred' });
            }
        }
    }
    
    async generateInvoiceBuffer(array, name, receiptNo, age) {
        console.log(array, name, receiptNo);
    
        try {
            name = this.sanitizeStaffName(name);
            console.log("Staff Name:", name);
    
            // Set paper orientation to landscape
            const doc = new PDFDocument({ layout: 'landscape' });
    
            // Collect PDF data into buffer
            const chunks = [];
            
            doc.on('data', (chunk) => {
                chunks.push(chunk);
            });
    
            // Ensure addContent is called correctly with await
            await this.addContent(doc, array, name, receiptNo, age);
    
            // Finalize the document
            doc.end();
    
            // Return a promise that resolves when the PDF is complete
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log('PDF buffer generated successfully, size:', buffer.length);
                    resolve(buffer);
                });
                doc.on('error', (err) => {
                    console.error('Error while generating PDF buffer:', err);
                    reject(err);
                });
            });
    
        } catch (error) {
            console.error('Error in PDF generation:', error);
            throw error;
        }
    }    
}    

module.exports = invoiceGenerator;
