const PDFDocument = require('pdfkit');
const axios = require('axios');
const sharp = require('sharp'); // Import sharp for image processing
const path = require('path');

class fundRaisingGenerator {
    constructor() {}
    
    getCurrentDateTime() {
        const now = new Date();

        // Define an array of full month names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Get day, month, year, hours, and minutes
        const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
        const month = monthNames[now.getMonth()]; // Get full month name using the month index
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
        const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
        const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

        // Format date and time
        const formattedDate = `${day} ${month.substring(0,3)} ${year}`; // Full month name
        const formattedTime = `${hours}:${minutes}:${seconds}`;

        return {
            date: formattedDate,
            time: formattedTime,
        };
    }    getCurrentDateTime() {
        const now = new Date();

        // Define an array of full month names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Get day, month, year, hours, and minutes
        const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
        const month = monthNames[now.getMonth()]; // Get full month name using the month index
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
        const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
        const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

        // Format date and time
        const formattedDate = `${day} ${month.substring(0,3)} ${year}`; // Full month name
        const formattedTime = `${hours}:${minutes}:${seconds}`;

        return {
            date: formattedDate,
            time: formattedTime,
        };
    }

    getInvoiceCurrentDateTime() {
        const now = new Date();

        // Define an array of full month names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Get day, month, year, hours, and minutes
        const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
        const month = monthNames[now.getMonth()]; // Get full month name using the month index
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
        const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
        const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

        // Format date and time
        const formattedDate = `${day} ${month} ${year}`; // Full month name
        const formattedTime = `${hours}:${minutes}:${seconds}`;

        return {
            date: formattedDate,
            time: formattedTime,
        };
    }

    async addHeader(doc) {
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/Screenshot-2024-10-15-112239.jpg";

        try {
            // Fetch the image as a buffer
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);

            // Use sharp to get the image dimensions
            const { width, height } = await sharp(imageBuffer).metadata();

            // Set the left and right margins in points
            const leftMargin = 2.54 * 28.35; // 2.54 cm to points
            const rightMargin = 15.93; // Right margin in points

            // Calculate the effective image width
            const imageWidth = doc.page.width - leftMargin - rightMargin; // Full width minus margins
            const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio

            // Add the image to the document with the left margin
            doc.image(imageBuffer, leftMargin, doc.y, {
                width: imageWidth, // Set the image width to the page width minus margins
                height: imageHeight, // Set the height to maintain the aspect ratio
                align: 'center', // Center the image horizontally
                valign: 'top' // Align the image to the top
            });

            // Move down for spacing below the image
            doc.moveDown(10); // Adjust this for more or less spacing

        } catch (error) {
            console.error('Error fetching the image:', error);
            // Optionally add a placeholder image or handle the error gracefully
        }
    }

    addFooter = async(doc, currentPage, totalPages) =>
    {
        console.log("Add Footer");
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/ok.png";

        const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // Use sharp to get the image dimensions
        const { width, height } = await sharp(imageBuffer).metadata();

        // Set the left and right margins in points
        const leftMargin = 0.00 // 2.54 cm to points

        const imageWidth = doc.page.width - leftMargin; // Full width minus margins
        const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio

        const footerYPosition = doc.page.height-50; 

        // Add the image to the document with the left margin
        doc.image(imageBuffer, leftMargin, footerYPosition , {
                width: imageWidth, // Set the image width to the page width minus margins
                height: imageHeight, // Set the height to maintain the aspect ratio
                align: 'center', // Center the image horizontally
                valign: 'top' // Align the image to the top
            });

    }
    
    addInvoiceFooter = async(doc) =>
    {
            console.log("Add Footer");
            const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/ok.png";
    
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);
    
            // Use sharp to get the image dimensions
            const { width, height } = await sharp(imageBuffer).metadata();
    
            // Set the left and right margins in points
            const leftMargin = 0.00 // 2.54 cm to points
    
            const imageWidth = doc.page.width - leftMargin; // Full width minus margins
            const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio
    
            const footerYPosition = doc.page.height-50; 
    
            // Add the image to the document with the left margin
            doc.image(imageBuffer, leftMargin, footerYPosition , {
                    width: imageWidth, // Set the image width to the page width minus margins
                    height: imageHeight, // Set the height to maintain the aspect ratio
                    align: 'center', // Center the image horizontally
                    valign: 'top' // Align the image to the top
                });
    
        }
        
    

    async addBody(doc, array, currentPage, totalPages, name, receiptNo) 
    {
        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const rightMargin = 15.93; // Right margin in points

        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to yourbold font file
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file

        // Set the font to Arial Bold and add the title "RECEIPT"
        doc.font(fontPathBold).fontSize(16).text('RECEIPT', {
            align: 'center' // Center the text
        });

        // Move down for spacing after the title
        doc.moveDown(2); // Adjust the space after the title

        var receiptText = "";

        if(array[0].course.payment === "Cash" || array[0].course.payment === "PayNow")
        {
            receiptText = `Receipt No   : ${receiptNo}`;
        }
        else
        {
            receiptText = `Invoice No   : ${receiptNo}`;
        }

        // Store the current y position
        let currentY = doc.y;



        // Add the receipt number on the left side and keep the cursor position
        doc.font(fontPathTimesRegular).fontSize(12).text(receiptText, leftMargin, currentY, {
            continued: true // Keep the position to allow text on the same line
        });

        // Now add the page parts on the same line on the right
        const rightX = doc.page.width - rightMargin - 300; // Adjust this value to align the page number properly

        // Finish the line without continued option
        doc.text('', rightX, currentY, {
            continued: false // End the line here
        });

        // Move down for spacing after the receipt number and current page
        doc.moveDown(1); // Adjust this to ensure the spacing before the date

        // Add a new line before adding the date text
        var getCurrentDateTime = this.getCurrentDateTime();
        const dateText = `Date              : ${getCurrentDateTime.date}`;

        // Add the date on a new line
        doc.font(fontPathTimesRegular).fontSize(12).text(dateText, leftMargin, doc.y, {
            align: 'left' // Align the date to the left
        });
        
        doc.moveDown(1);
         // Add a new line before adding the date text
         const participantName = `Name            : ${array[0].participant.name}`;
 
         // Add the date on a new line
         doc.font(fontPathTimesRegular).fontSize(12).text(participantName, leftMargin, doc.y, {
             align: 'left' // Align the date to the left
         });

         doc.moveDown(1);

        //console.log(array[0]);

        // Add a new line before adding the date text
        const paymentMethod = `Payment Method   : ${array[0].course.payment}`;
 
        // Add the date on a new line
        doc.font(fontPathTimesRegular).fontSize(12).text(paymentMethod, leftMargin, doc.y, {
              align: 'left' // Align the date to the left
        });
 
          doc.moveDown(1);

         this.createTable(doc, array);

        doc.moveDown(1);

        // Add the date on a new line
        doc.font(fontPathTimesRegular).fontSize(12).text("This is a computer generated receipt and requires no signature.", leftMargin, doc.y, {
            align: 'left' // Align the date to the left
        });

        doc.moveDown(5);
    }

    /*async createTable(doc, array) 
    {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file

        const leftMargin = 2.54 * 28.35; // Left margin (2.54 cm in points)
        const tableTop = doc.y; // Get the current Y position to place the table

        const columnWidths = {
            serial: 40,          // Width for S/NO column
            description: 340,    // Width for Description column
            amount: 100          // Width for Amount column
        };

        const columnPositions = {
            serial: leftMargin,                                     // First column at left margin
            description: leftMargin + columnWidths.serial,         // Second column next to first
            amount: leftMargin + columnWidths.serial + columnWidths.description  // Third column next to second
        };

        const rowHeight = 40; // Height for the table header
        const borderExternalThickness = 2; // Set the thickness of the external border
        const borderInternalThickness = 1; // Set the thickness of the internal borders
        const headerHeight = rowHeight; // Adjusted header height

        // Draw the header background and external border for the entire table
        doc.rect(leftMargin, tableTop, 
            columnWidths.serial + columnWidths.description + columnWidths.amount, 
            headerHeight)
            .fill('#FBFBFB'); // Set header background color

        // Set font and text size for the header
        doc.fontSize(12).fillColor('black').font(fontPathBold);

        // Add header column titles centered
        doc.text('S/NO', columnPositions.serial + columnWidths.serial / 8, tableTop + 12);
        doc.text('DESCRIPTION', columnPositions.description + columnWidths.description / 3 + 15, tableTop + 12);
        doc.text('AMOUNT', columnPositions.amount + columnWidths.amount / 5 + 5, tableTop + 5);
        doc.text('(S$)', columnPositions.amount + columnWidths.amount / 4 + 10, tableTop + 19);

        // Draw inner vertical borders between columns
        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, tableTop)
            .lineTo(columnPositions.serial + columnWidths.serial, tableTop + headerHeight)
            .stroke('black');

        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.description + columnWidths.description, tableTop)
            .lineTo(columnPositions.description + columnWidths.description, tableTop + headerHeight)
            .stroke('black');

        // Optional: Draw a horizontal line separating the header from the body
        doc.lineWidth(borderExternalThickness)
            .moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, tableTop + headerHeight)
            .stroke('black');

        let currentY = tableTop + headerHeight; // Start position for rows immediately after the header
        doc.font(fontPathRegular).fontSize(12); // Set font for table rows

        let totalAmount = 0; 

        array.forEach((item, index) => {
            // Add row content for each entry
            doc.text(index + 1, columnPositions.serial+15, currentY+12); // Serial number
            doc.text(`${item.course.courseEngName}\n${item.course.courseLocation}\n${item.course.courseDuration}`, columnPositions.description + 15, currentY+6); // Description
            doc.text(item.course.coursePrice, columnPositions.amount + 30, currentY+12); // Amount

            totalAmount += parseFloat(item.course.coursePrice.substring(1));

            // Draw vertical borders dynamically between columns
            doc.lineWidth(borderInternalThickness)
                .moveTo(columnPositions.serial + columnWidths.serial, currentY)
                .lineTo(columnPositions.serial + columnWidths.serial, currentY + rowHeight)
                .stroke('black');

            doc.lineWidth(borderInternalThickness)
                .moveTo(columnPositions.description + columnWidths.description, currentY)
                .lineTo(columnPositions.description + columnWidths.description, currentY + rowHeight)
                .stroke('black');

            // Move Y position for the next row
            currentY += rowHeight;
        });

        const totalRowY = currentY; 
        doc.font(fontPathRegular).fontSize(12).text('Total:', columnPositions.description + 15, currentY + 12); // Total label
        doc.font(fontPathBold).fontSize(12).text(`$${totalAmount.toFixed(2)}`, columnPositions.amount + 30, currentY + 12); // Total amount

        // Draw vertical borders for the total row
        doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.serial + columnWidths.serial, totalRowY) // Vertical line after S/NO
        .lineTo(columnPositions.serial + columnWidths.serial, totalRowY + rowHeight) // Extend line down
        .stroke('black');

        doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.description + columnWidths.description, totalRowY) // Vertical line after DESCRIPTION
        .lineTo(columnPositions.description + columnWidths.description, totalRowY + rowHeight) // Extend line down
        .stroke('black');

        // Define the Y position for the top of the line (current row Y position)
        const topLineY = currentY; // Adjust as necessary based on your layout

        // Define the Y position for the bottom of the line (current row height)
        const bottomLineY = currentY + rowHeight; // This assumes rowHeight is set correctly

        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin + columnWidths.serial + columnWidths.description, topLineY) // Starting point at the left margin
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, topLineY) // Draw to the right
            .stroke('black'); // Draw the top line
            
        // Optional: Uncomment to draw the external border around the entire table
        doc.lineWidth(borderExternalThickness)
        .rect(leftMargin, tableTop, 
            columnWidths.serial + columnWidths.description + columnWidths.amount, 
            currentY - tableTop + rowHeight) // Adjust height for total row
        .stroke('black');


        doc.moveDown(3);
    }*/

    async createTable(doc, array) 
    {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file

        const leftMargin = 2.54 * 28.35; // Left margin (2.54 cm in points)
        const tableTop = doc.y; // Get the current Y position to place the table

        const columnWidths = {
            serial: 40,          // Width for S/NO column
            description: 340,    // Width for Description column
            amount: 100          // Width for Amount column
        };

        const columnPositions = {
            serial: leftMargin,                                     // First column at left margin
            description: leftMargin + columnWidths.serial,         // Second column next to first
            amount: leftMargin + columnWidths.serial + columnWidths.description  // Third column next to second
        };

        const rowHeight = 60; // Increased height for better text wrapping
        const borderExternalThickness = 2; // Set the thickness of the external border
        const borderInternalThickness = 1; // Set the thickness of the internal borders
        const headerHeight = rowHeight; // Adjusted header height

        // Draw the header background and external border for the entire table
        doc.rect(leftMargin, tableTop, 
            columnWidths.serial + columnWidths.description + columnWidths.amount, 
            headerHeight)
            .fill('#FBFBFB'); // Set header background color

        // Set font and text size for the header
        doc.fontSize(12).fillColor('black').font(fontPathBold);

        // Add header column titles centered
        doc.text('S/NO', columnPositions.serial + columnWidths.serial / 8, tableTop + 12);
        doc.text('DESCRIPTION', columnPositions.description + columnWidths.description / 3 + 15, tableTop + 12);
        doc.text('AMOUNT', columnPositions.amount + columnWidths.amount / 5 + 5, tableTop + 5);
        doc.text('(S$)', columnPositions.amount + columnWidths.amount / 4 + 10, tableTop + 19);

        // Draw inner vertical borders between columns
        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, tableTop)
            .lineTo(columnPositions.serial + columnWidths.serial, tableTop + headerHeight)
            .stroke('black');

        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.description + columnWidths.description, tableTop)
            .lineTo(columnPositions.description + columnWidths.description, tableTop + headerHeight)
            .stroke('black');

        // Optional: Draw a horizontal line separating the header from the body
        doc.lineWidth(borderExternalThickness)
            .moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, tableTop + headerHeight)
            .stroke('black');

        let currentY = tableTop + headerHeight; // Start position for rows immediately after the header
        doc.font(fontPathRegular).fontSize(11); // Slightly smaller font for better fit

        let totalAmount = 0; 

        array.forEach((item, index) => {
            // Add row content for each entry with proper text wrapping
            doc.text(index + 1, columnPositions.serial + 15, currentY + 20); // Serial number - centered vertically
            
            // Use text wrapping for the description column to ensure it stays within bounds
            const descriptionX = columnPositions.description + 10; // Left padding
            const descriptionWidth = columnWidths.description - 20; // Account for padding on both sides
            
            // Create the description text with line breaks
            const descriptionText = `${item.course.courseEngName}\n${item.course.courseLocation}\n${item.course.courseDuration}`;
            
            doc.text(descriptionText, descriptionX, currentY + 8, {
                width: descriptionWidth,
                align: 'left',
                lineGap: 2
            });
            
            doc.text(item.course.coursePrice, columnPositions.amount + 30, currentY + 20); // Amount - centered vertically

            totalAmount += parseFloat(item.course.coursePrice.substring(1));

            // Draw vertical borders dynamically between columns
            doc.lineWidth(borderInternalThickness)
                .moveTo(columnPositions.serial + columnWidths.serial, currentY)
                .lineTo(columnPositions.serial + columnWidths.serial, currentY + rowHeight)
                .stroke('black');

            doc.lineWidth(borderInternalThickness)
                .moveTo(columnPositions.description + columnWidths.description, currentY)
                .lineTo(columnPositions.description + columnWidths.description, currentY + rowHeight)
                .stroke('black');

            // Move Y position for the next row
            currentY += rowHeight;
        });

        const totalRowY = currentY; 
        doc.font(fontPathRegular).fontSize(12).text('Total:', columnPositions.description + 15, currentY + 12); // Total label
        doc.font(fontPathBold).fontSize(12).text(`$${totalAmount.toFixed(2)}`, columnPositions.amount + 30, currentY + 12); // Total amount

        // Draw vertical borders for the total row
        doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.serial + columnWidths.serial, totalRowY) // Vertical line after S/NO
        .lineTo(columnPositions.serial + columnWidths.serial, totalRowY + rowHeight) // Extend line down
        .stroke('black');

        doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.description + columnWidths.description, totalRowY) // Vertical line after DESCRIPTION
        .lineTo(columnPositions.description + columnWidths.description, totalRowY + rowHeight) // Extend line down
        .stroke('black');

        // Define the Y position for the top of the line (current row Y position)
        const topLineY = currentY; // Adjust as necessary based on your layout

        // Define the Y position for the bottom of the line (current row height)
        const bottomLineY = currentY + rowHeight; // This assumes rowHeight is set correctly

        doc.lineWidth(borderInternalThickness)
            .moveTo(leftMargin + columnWidths.serial + columnWidths.description, topLineY) // Starting point at the left margin
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, topLineY) // Draw to the right
            .stroke('black'); // Draw the top line
            
        // Optional: Uncomment to draw the external border around the entire table
        doc.lineWidth(borderExternalThickness)
        .rect(leftMargin, tableTop, 
            columnWidths.serial + columnWidths.description + columnWidths.amount, 
            currentY - tableTop + rowHeight) // Adjust height for total row
        .stroke('black');

        doc.moveDown(3);
    }
        
    drawRowBorders(doc, leftMargin, columnWidths, currentY, borderThickness, color)
    {
        // Draw left border for the row
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, currentY) // Start at the left margin
            .lineTo(leftMargin, currentY + 40) // Draw line from top to bottom of the row
            .stroke(color);

        // Draw right border for the row
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, currentY) // Start at the right edge
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, currentY + 40) // Draw line down
            .stroke(color);

        // Draw top border for the row (optional)
        if (currentY === leftMargin + 40) { // Draw only for the first row
            doc.lineWidth(borderThickness)
                .moveTo(leftMargin, currentY) // Start at the left margin
                .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, currentY) // Draw a line across the top of the row
                .stroke(color);
        }

        // Draw bottom border for the row
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, currentY + 40) // Start at the bottom left
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, currentY + 40) // Draw a line across the bottom of the row
            .stroke(color);
        
        // Draw internal vertical borders between columns dynamically
        // Between Serial and Description columns
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin + columnWidths.serial, currentY) // Start at the current row position
            .lineTo(leftMargin + columnWidths.serial, currentY + 40) // Extend to the next row position
            .stroke(color);

        // Between Description and Amount columns
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin + columnWidths.serial + columnWidths.description, currentY) // Start at the current row position
            .lineTo(leftMargin + columnWidths.serial + columnWidths.description, currentY + 40) // Extend to the next row position
            .stroke(color);
    }

    async addContent(doc, array, name, receiptNo) {

        
        // Initial header addition for the first page
        await this.addHeader(doc, receiptNo); // Add header to the first page
    
        let currentPage = 1; // Initialize current page
        let totalPages = 1; // Initialize total pages
    
        // Add body content for the first page
        await this.addBody(doc, array, currentPage, totalPages, name, receiptNo);
    
        // Example of adding content that might create new pages
        for (let i = 0; i < 5; i++) { // Simulate adding content that spans multiple pages
            // Check if the current content will overflow and create a new page
            if (doc.y > doc.page.height - 100) { // Assuming 50 points is a safe margin for new page
                doc.addPage(); // Add a new page
                currentPage++; // Increment current page count
                totalPages++; // Increment total pages count
                
                // Add header to the new page
                await this.addHeader(doc); 
    
                // Add body content to the new page
                await this.addBody(doc, array, currentPage, totalPages, name, receiptNo);
            }
            
            // Optionally add footer if needed (after body content)
            await this.addFooter(doc, currentPage, totalPages);
        }
    
        // Finalize the total pages if necessary
        // e.g. doc.text(`Total Pages: ${totalPages}`, ...);
        await this.addFooter(doc, currentPage, totalPages);
    }

    async addInvoiceHeader(doc) {
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/Screenshot-2024-10-15-112239.jpg";

        try {
            // Fetch the image as a buffer
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);

            // Use sharp to get the image dimensions
            const { width, height } = await sharp(imageBuffer).metadata();

            // Set the left and right margins in points
            const leftMargin = 2.54 * 28.35; // 2.54 cm to points
            const rightMargin = 15.93; // Right margin in points

            // Calculate the effective image width
            const imageWidth = doc.page.width - leftMargin - rightMargin; // Full width minus margins
            const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio

            // Add the image to the document with the left margin
            doc.image(imageBuffer, leftMargin, doc.y, {
                width: imageWidth, // Set the image width to the page width minus margins
                height: imageHeight, // Set the height to maintain the aspect ratio
                align: 'center', // Center the image horizontally
                valign: 'top' // Align the image to the top
            });

            // Move down for spacing below the image
            doc.moveDown(10); // Adjust this for more or less spacing

        } catch (error) {
            console.error('Error fetching the image:', error);
            // Optionally add a placeholder image or handle the error gracefully
        }
    }

    
    async addInvoiceContent(doc, details, totalPrice, totalPriceInWords, invoiceNumber) 
    {
        // Initialize page counters
    
        // Add the initial header to the first page
        await this.addInvoiceHeader(doc);
    
        // Add the initial invoice body and check for overflow
        let contentHeight = await this.addInvoiceBody(doc, details, totalPrice, totalPriceInWords, invoiceNumber);
    
        // Check if content overflowed and we need more pages
        while (contentHeight > doc.page.height - 100) { // 100 for footer margin
            // Add the invoice body for the new page, recalculate content height
            contentHeight = await this.addInvoiceBody(doc, details, totalPrice, totalPriceInWords, invoiceNumber);
        }
        // Now add the footer to every page to ensure consistency across pages
    }
    
    async addInvoiceBody(doc, details, totalPrice, totalPriceInWords, invoiceNumber) {
        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const rightMargin = 15.93; // Right margin in points
    
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file
    
        // Initialize page numbers
        let currentPage = 1;
        let totalPages = 1;
    
        // Function to check page space and add a new page if necessary
        const checkPageSpaceAndAddNewPage = async (doc, contentHeight, currentPage, totalPages, leftMargin, rightMargin) => {
            const remainingSpace = doc.page.height - doc.y - 100; // Calculate remaining space on the current page
            const rightX = rightMargin+450;
    
            // Always add page numbers and other content if it's the first page
            if (doc.y === 0) {
                await updatePageNumbers(doc, currentPage, totalPages, rightX);
                doc.moveDown(1); // Adds space below page numbers
    
                // Add header if it's the first page
                await this.addInvoiceHeader(doc); // Add header once at the beginning
            }
    
            // If there is not enough space, only add a new page if the content is too big for the current one
            if (remainingSpace < contentHeight) {
                doc.addPage(); // Add a new page if content exceeds remaining space
                currentPage++; // Increment page number when a new page is added
                totalPages++; // Increment total pages count
    
                // Add header and page numbers on the new page
                await this.addInvoiceHeader(doc);
                await updatePageNumbers(doc, currentPage, totalPages, rightX);
                doc.text('', leftMargin, currentY, { continued: false });
                doc.moveDown(1); // Adjust space after the page number
            }
            await this.addInvoiceFooter(doc);
        };
    
        // Add invoice title
        doc.font(fontPathBold).fontSize(16).text('INVOICE', { align: 'center' });
        doc.moveDown(1); // Add space below the title
    
        // Check space and add page if necessary
        await checkPageSpaceAndAddNewPage(doc, 20, currentPage, totalPages, leftMargin, rightMargin);
    
        // Add Invoice Number Section
        var invoiceText = `Invoice No   : ${invoiceNumber}`;
        let currentY = doc.y;
        doc.font(fontPathTimesRegular).fontSize(12).text(invoiceText, leftMargin, currentY, { continued: true });
    
    
        // Check space and add page if necessary
        await checkPageSpaceAndAddNewPage(doc, 30, currentPage, totalPages, leftMargin, rightMargin);
    
        // Page Number Section - Right-aligned
        const rightX = doc.page.width - rightMargin - 300;
        await updatePageNumbers(doc, currentPage, totalPages, rightX);
        doc.text('', leftMargin, currentY, { continued: false });
        // Add 
        doc.moveDown(1); // Adjust spacing
        var getCurrentDateTime = this.getInvoiceCurrentDateTime();
        const dateText = `Date              : ${getCurrentDateTime.date}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(dateText, leftMargin, doc.y);
        doc.moveDown(1); // Adjust spacing
    
        // Check space and add page if necessary
        await checkPageSpaceAndAddNewPage(doc, 100, currentPage, totalPages, leftMargin, rightMargin);
    
        // Add Recipient Section
        const recipientText = [
            "Council for Third Age (C3A)",
            "9 Bishan Place #10-01",
            "Junction 8 (Office Tower)",
            "Singapore 579837",
            "Attention: Ms Tsang Wing Lam/Mr Lim Yang De"
        ];
    
        recipientText.forEach(line => {
            doc.font(fontPathTimesRegular).fontSize(13).text(line, leftMargin, doc.y);
            doc.moveDown(0.1);
        });
    
        doc.moveDown(1);
    
        const reText = 'RE: CLAIM FOR NATIONAL SILVER ACADEMY COURSE FEE SUBSIDIES';
        doc.font(fontPathBold).fontSize(12).text(reText, leftMargin, doc.y);
    
        doc.moveDown(1);
    
        // Add Invoice Table
        this.createInvoiceTable(doc, details, totalPrice, totalPriceInWords);
    
        // Add Terms and Conditions
        var termsAndConditionLines = [
            "Terms and Conditions",
            "1) All prices are quoted in Singapore Dollars.",
            "2) Payment is due 30 days from the date of the invoice.",
            "3) You can arrange payment to OCBC Bank A/C 667-834113-001."
        ];
    
        termsAndConditionLines.forEach((line, index) => {
            doc.font(fontPathTimesRegular).text(line, leftMargin, doc.y + index);
        });
    
        doc.moveDown(2);
    
        // Signature Section: Dynamically calculate content height
        const signatureHeight = this.calculateSignatureHeight(doc, fontPathTimesRegular, 20);

    
        // If there is no space left for signature block, add a new page
        await checkPageSpaceAndAddNewPage(doc, 250 - signatureHeight, currentPage, totalPages, leftMargin, rightMargin);
    
        // Create a separate block for the signature
        this.addSignatureBlock(doc, fontPathTimesRegular);
    
        // Return the current Y position after the content (for content overflow checking)
        return doc.y;
    }
    
    calculateSignatureHeight(doc, fontPath, fontSize) {
        const lineHeight = fontSize * 3; // Approximate line height based on font size
        const signatureLineHeight = 30; // Space for the signature line
        const nameHeight = lineHeight; // Height for the name
        const titleHeight = lineHeight; // Height for the title
        const spacing = 5; // Extra spacing between elements
        
        // Total height is the sum of signature line height, name, title, and spacing
        return signatureLineHeight + nameHeight + titleHeight + spacing+50;
    }
    addSignatureBlock(doc, fontPathTimesRegular) {
        const lineWidth = 200; // Length of the signature line
        const pageWidth = doc.page.width;
        const rightMargin = 50; // Right margin in points

        doc.moveDown(1); 
    
        // Start position for the line (right-aligned)
        const lineStartX = pageWidth - rightMargin - lineWidth; 
        const lineY = doc.y + 20; // Y position for the line, slightly adjusted for more space
    
        // Draw the signature line (aligned to the right)
        doc.lineWidth(1)
            .moveTo(lineStartX, lineY)
            .lineTo(pageWidth - rightMargin, lineY)
            .stroke('black'); // Draw the line
    
        // Move down to add more space after the signature line
        doc.moveDown(2); // Increase space below the line
    
        // Name and title text
        const nameText = 'Chan Chui Han';
        const titleText = 'Executive Director';
        
        // Calculate the width of the name and title individually
        const nameTextWidth = doc.widthOfString(nameText); 
        const titleTextWidth = doc.widthOfString(titleText); 
    
        // Calculate the X positions to center each text individually
        const nameTextX = lineStartX + (lineWidth - nameTextWidth) / 2;
        const titleTextX = lineStartX + 13.1 + (lineWidth - titleTextWidth) / 3;
    
        // Add the name and title text, centered
        doc.font(fontPathTimesRegular).fontSize(12).text(nameText, nameTextX, doc.y);
        doc.font(fontPathTimesRegular).fontSize(12).text(titleText, titleTextX, doc.y);
    
        // Move down further to increase height if necessary
        doc.moveDown(2); // Add more space after the name and title for increased height
    }

    async createInvoiceTable(doc, details, totalPrice, totalPriceInWords) {
    const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF'); // Path to your bold font file
    const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF'); // Path to your regular font file
    const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf'); // Path to your Times New Roman font file

    const leftMargin = 2.54 * 28.35; // Left margin (2.54 cm in points)
    const tableTop = doc.y; // Get the current Y position to place the table

    const columnWidths = {
        serial: 40,          // Width for S/NO column
        description: 340,    // Width for Description column
        amount: 100          // Width for Amount column
    };

    const columnPositions = {
        serial: leftMargin,                                     // First column at left margin
        description: leftMargin + columnWidths.serial,         // Second column next to first
        amount: leftMargin + columnWidths.serial + columnWidths.description  // Third column next to second
    };

    const rowHeight = 40; // Height for the table header
    const borderExternalThickness = 2; // Set the thickness of the external border
    const borderInternalThickness = 1; // Set the thickness of the internal borders
    const headerHeight = rowHeight; // Adjusted header height

    // Draw the header background and external border for the entire table
    doc.rect(leftMargin, tableTop, 
        columnWidths.serial + columnWidths.description + columnWidths.amount, 
        headerHeight)
        .fill('#FBFBFB'); // Set header background color

    // Set font and text size for the header
    doc.fontSize(12).fillColor('black').font(fontPathBold);

    // Add header column titles centered
    doc.text('S/NO', columnPositions.serial + columnWidths.serial / 8, tableTop + 12);
    doc.text('DESCRIPTION', columnPositions.description + columnWidths.description / 3 + 15, tableTop + 12);
    doc.text('AMOUNT', columnPositions.amount + columnWidths.amount / 5 + 5, tableTop + 5);
    doc.text('(S$)', columnPositions.amount + columnWidths.amount / 4 + 10, tableTop + 19);

    // Draw inner vertical borders between columns
    doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.serial + columnWidths.serial, tableTop)
        .lineTo(columnPositions.serial + columnWidths.serial, tableTop + headerHeight)
        .stroke('black');

    doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.description + columnWidths.description, tableTop)
        .lineTo(columnPositions.description + columnWidths.description, tableTop + headerHeight)
        .stroke('black');

    // Optional: Draw a horizontal line separating the header from the body
    doc.lineWidth(borderExternalThickness)
        .moveTo(leftMargin, tableTop + headerHeight)
        .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, tableTop + headerHeight)
        .stroke('black');

    let currentY = tableTop + headerHeight + 10; // Start position for rows immediately after the header with an additional gap
    doc.font(fontPathRegular).fontSize(12); // Set font for table rows

    details.forEach((item, index) => {
        // Define text details for the description column
        var detailsText = [
            `Course Title: ${item.course}`,
            `Start Date: ${item.details.startDate} End Date: ${item.details.endDate}`,
            `${item.details.count} participants @${item.details.price}/participant`
        ];

        // Calculate the row height dynamically
        const lineSpacing = 14; // Spacing between lines
        const contentHeight = detailsText.length * lineSpacing; // Height based on number of lines
        const rowGap = 10; // Gap between rows
        const totalRowHeight = contentHeight + rowGap; // Total height including the gap

        // Draw text in columns
        doc.text(index + 1, columnPositions.serial + 15, currentY + 12); // Serial number
        detailsText.forEach((line, lineIndex) => {
            const currentLineY = currentY + lineIndex * lineSpacing; // Adjust Y for each line
            doc.text(line, columnPositions.description + 15, currentLineY, { align: 'left' });
        });
        doc.text(item.details.total_price, columnPositions.amount + 30, currentY + 12); // Amount

        // Draw vertical borders for seamless column separation
        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, currentY-10) // Serial column border
            .lineTo(columnPositions.serial + columnWidths.serial, currentY + totalRowHeight) // Include content + gap
            .stroke('black');

        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.description + columnWidths.description, currentY-10) // Description column border
            .lineTo(columnPositions.description + columnWidths.description, currentY + totalRowHeight) // Include content + gap
            .stroke('black');

        doc.lineWidth(borderInternalThickness)
            .moveTo(columnPositions.amount + columnWidths.amount, currentY) // Amount column border
            .lineTo(columnPositions.amount + columnWidths.amount, currentY + totalRowHeight) // Include content + gap
            .stroke('black');

        // Move Y position for the next row (content + gap)
        currentY += totalRowHeight;
    });

    const totalRowY = currentY; 
    doc.font(fontPathRegular).fontSize(12).text(`Total: ${totalPriceInWords}`, columnPositions.description + 15, currentY + 12); // Total label
    doc.font(fontPathBold).fontSize(12).text(`${totalPrice}`, columnPositions.amount + 30, currentY + 12); // Total amount

    // Draw vertical borders for the total row
    doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.serial + columnWidths.serial, totalRowY) // Vertical line after S/NO
        .lineTo(columnPositions.serial + columnWidths.serial, totalRowY + rowHeight) // Extend line down
        .stroke('black');

    doc.lineWidth(borderInternalThickness)
        .moveTo(columnPositions.description + columnWidths.description, totalRowY) // Vertical line after DESCRIPTION
        .lineTo(columnPositions.description + columnWidths.description, totalRowY + rowHeight) // Extend line down
        .stroke('black');

    // Define the Y position for the top of the line (current row Y position)
    const topLineY = currentY; // Adjust as necessary based on your layout

    // Define the Y position for the bottom of the line (current row height)
    const bottomLineY = currentY + rowHeight; // This assumes rowHeight is set correctly

    doc.lineWidth(borderInternalThickness)
        .moveTo(leftMargin + columnWidths.serial + columnWidths.description, topLineY) // Starting point at the left margin
        .lineTo(leftMargin + columnWidths.serial + columnWidths.description + columnWidths.amount, topLineY) // Draw to the right
        .stroke('black'); // Draw the top line

    // Optional: Uncomment to draw the external border around the entire table
    doc.lineWidth(borderExternalThickness)
        .rect(leftMargin, tableTop, 
            columnWidths.serial + columnWidths.description + columnWidths.amount, 
            currentY - tableTop + rowHeight) // Adjust height for total row
        .stroke('black');

    doc.moveDown(3);
}
    
    async generateReceipt(res, array, name, receiptNo) {

        return new Promise((resolve, reject) => {
            try {

                // Set headers for PDF
                const filename = `Moses.pdf`; 
    
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
                // Set cache headers to allow permanent access
                res.setHeader('Cache-Control', 'public, max-age=315360000'); // Cache for 10 years (in seconds)
                res.setHeader('Expires', new Date(Date.now() + 315360000 * 1000).toUTCString()); // Expires in 10 years
    
                // Log headers just before sending the response
                console.log('Sending headers:', {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${filename}"`,
                    'Cache-Control': 'public, max-age=315360000',
                    'Expires': new Date(Date.now() + 315360000 * 1000).toUTCString()
                });
    
                const doc = new PDFDocument();
    
                // Add error listener
                doc.on('error', (err) => {
                    console.error('Error while generating PDF:', err);
                    res.status(500).json({ error: 'Error generating PDF' });
                });
    
                doc.pipe(res);
                
                // Ensure addContent is called correctly with await
                this.addContent(doc, array, name, receiptNo)
                    .then(() => {
                        // Finalize the document
                        doc.end();
    
                        // Listen for the finish event to resolve the promise
                        res.on('finish', () => {
                            console.log('PDF response sent successfully.');
                            resolve('PDF response sent successfully.');
                        });
                    })
                    .catch(err => {
                        console.error('Error adding content to PDF:', err);
                        reject('Error adding content to PDF');
                    });
            } catch (error) {
                console.error('Error in PDF generation:', error);
                reject('An unexpected error occurred'); 
            }
        });
    }

    async generateInvoice(res, details, totalPrice, totalPriceInWords, invoiceNumber) 
    {
        return new Promise((resolve, reject) => 
        {
            try 
            {
                const filename = `Moses.pdf`; 
    
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
                // Set cache headers to allow permanent access
                res.setHeader('Cache-Control', 'public, max-age=315360000'); // Cache for 10 years (in seconds)
                res.setHeader('Expires', new Date(Date.now() + 315360000 * 1000).toUTCString()); // Expires in 10 years
    
                // Log headers just before sending the response
                console.log('Sending headers:', {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `inline; filename="${filename}"`,
                    'Cache-Control': 'public, max-age=315360000',
                    'Expires': new Date(Date.now() + 315360000 * 1000).toUTCString()
                });
    
                const doc = new PDFDocument();
    
                // Add error listener
                doc.on('error', (err) => {
                    console.error('Error while generating PDF:', err);
                    res.status(500).json({ error: 'Error generating PDF' });
                });
    
                doc.pipe(res);
                
                // Ensure addContent is called correctly with await
                this.addInvoiceContent(doc, details, totalPrice, totalPriceInWords, invoiceNumber)
                    .then(() => {
                        // Finalize the document
                        doc.end();
    
                        // Listen for the finish event to resolve the promise
                        res.on('finish', () => {
                            console.log('PDF response sent successfully.');
                            resolve('PDF response sent successfully.');
                        });
                    })
                    .catch(err => {
                        console.error('Error adding content to PDF:', err);
                        reject('Error adding content to PDF');
                    });
            } catch (error) {
                console.error('Error in PDF generation:', error);
                reject('An unexpected error occurred'); 
            }
        });
    }

    // New method for fundraising receipts
    // Expected orderData structure:
    // {
    //   receiptNumber: string,
    //   personalInfo: { firstName: string, lastName: string },
    //   paymentMethod: string,
    //   collectionMode: string (optional),
    //   collectionDeliveryLocation: string (optional), // Can also be CollectionDeliveryLocation
    //   collectionDate: string (optional),
    //   collectionTime: string (optional),
    //   collectionDetails: { // Optional nested object containing collection info
    //     collectionMode: string,
    //     CollectionDeliveryLocation: string,
    //     collectionDate: string,
    //     collectionTime: string
    //   },
    //   items: array,
    //   totalPrice: number,
    //   subtotalInfo: object (optional)
    // }
    async generateFundraisingReceipt(orderData) {
        try {

            
            // Create a PDF document in memory (no response object needed)
            const doc = new PDFDocument();
            const buffers = [];
            
            // Collect PDF data in buffers
            doc.on('data', buffers.push.bind(buffers));
            
            // Create the PDF content
            await this.addFundraisingContent(doc, orderData);
            
            // Finalize the document
            doc.end();
            
            // Return promise that resolves when PDF is complete
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    console.log(`Fundraising PDF generated successfully. Size: ${pdfBuffer.length} bytes`);
                    resolve(pdfBuffer);
                });
                
                doc.on('error', (err) => {
                    console.error('Error generating fundraising PDF:', err);
                    reject(err);
                });
            });
            
        } catch (error) {
            console.error('Error in generateFundraisingReceipt:', error);
            throw error;
        }
    }

    // Add fundraising content to PDF
    async addFundraisingContent(doc, orderData) {
        try {
            // Add header
            await this.addHeader(doc);
            
            // Add fundraising body
            await this.addFundraisingBody(doc, orderData);
            
            // Add footer
            await this.addFooter(doc, 1, 1);
            
        } catch (error) {
            console.error('Error adding fundraising content:', error);
            throw error;
        }
    }

    // Add fundraising body content
    async addFundraisingBody(doc, orderData) {
        console.log('PDF Generator - Order data structure:', {
            hasPaymentMethod: !!orderData.paymentMethod,
            hasPaymentDetails: !!orderData.paymentDetails,
            paymentMethod: orderData.paymentMethod,
            paymentDetails: orderData.paymentDetails,
            hasItems: !!orderData.items,
            itemsLength: orderData.items ? orderData.items.length : 0,
            hasSubtotalInfo: !!orderData.subtotalInfo,
            subtotalInfo: orderData.subtotalInfo
        });
        
        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const rightMargin = 15.93; // Right margin in points

        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf');

        // Add title
        doc.font(fontPathBold).fontSize(16).text('RECEIPT', {
            align: 'center'
        });
        doc.moveDown(2);

        // Add fundraising key (receipt number) - reduced gap
        const receiptText = `Receipt No  : ${orderData.receiptNumber || 'N/A'}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(receiptText, leftMargin);
        doc.moveDown(0.3);

        // Add date - reduced gap
        const getCurrentDateTime = this.getCurrentDateTime();
        const dateText = `Date        : ${getCurrentDateTime.date}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(dateText, leftMargin);
        doc.moveDown(0.3);

        // Add customer information - reduced gap
        const customerName = `Name        : ${orderData.personalInfo?.firstName || ''} ${orderData.personalInfo?.lastName || ''}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(customerName, leftMargin);
        doc.moveDown(0.3);

        // Add payment method - reduced gap with better fallback logic
        const paymentMethodValue = orderData.paymentMethod || orderData.paymentDetails?.paymentMethod || '';
        const paymentMethod = `Payment Method  : ${paymentMethodValue}`;
        console.log('PDF Generator - Payment method value:', paymentMethodValue);
        doc.font(fontPathTimesRegular).fontSize(12).text(paymentMethod, leftMargin);
        doc.moveDown(0.3);

        // Add collection information if available - check both direct properties and nested collectionDetails
        const collectionMode = orderData.collectionMode || orderData.collectionDetails?.collectionMode;
        const collectionLocation = orderData.collectionDeliveryLocation || 
                                 orderData.CollectionDeliveryLocation || 
                                 orderData.collectionDetails?.CollectionDeliveryLocation ||
                                 orderData.collectionDetails?.collectionDeliveryLocation;
        const collectionDate = orderData.collectionDate || orderData.collectionDetails?.collectionDate;
        const collectionTime = orderData.collectionTime || orderData.collectionDetails?.collectionTime;

        console.log('PDF Generator - Collection data:', {
            collectionMode,
            collectionLocation,
            collectionDate,
            collectionTime,
            orderDataCollectionDetails: orderData.collectionDetails
        });

        if (collectionMode) {
            const collectionModeText = `Collection Mode : ${collectionMode}`;
            doc.font(fontPathTimesRegular).fontSize(12).text(collectionModeText, leftMargin);
            doc.moveDown(0.3);
        }

        if (collectionLocation) {
            const collectionLocationText = `Collection Location : ${collectionLocation}`;
            doc.font(fontPathTimesRegular).fontSize(12).text(collectionLocationText, leftMargin);
            doc.moveDown(0.3);
        }

        // Combine Collection Date and Time into Collection Details with formatting
        if (collectionDate || collectionTime) {
            let collectionDetails = 'Collection Details : ';
            
            // Format date from yyyy-mm-dd to dd/mm/yyyy
            if (collectionDate) {
                try {
                    const dateObj = new Date(collectionDate);
                    if (!isNaN(dateObj.getTime())) {
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = dateObj.getFullYear();
                        collectionDetails += `${day}/${month}/${year}`;
                    } else {
                        // Fallback if date parsing fails
                        collectionDetails += collectionDate;
                    }
                } catch (error) {
                    console.error('Error formatting collection date:', error);
                    collectionDetails += collectionDate;
                }
            }
            
            // Format time to 12-hour format
            if (collectionTime) {
                if (collectionDate) collectionDetails += ' ';
                
                try {
                    // Handle different time formats
                    if (collectionTime.includes('-')) {
                        // Handle range format like "10:00-16:00"
                        const [startTime, endTime] = collectionTime.split('-');
                        const formatTime = (time) => {
                            const [hours, minutes] = time.trim().split(':');
                            const hour24 = parseInt(hours);
                            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                            const ampm = hour24 >= 12 ? 'PM' : 'AM';
                            return `${hour12}:${minutes} ${ampm}`;
                        };
                        collectionDetails += `${formatTime(startTime)} - ${formatTime(endTime)}`;
                    } else if (collectionTime.includes(':')) {
                        // Handle single time format like "10:00"
                        const [hours, minutes] = collectionTime.split(':');
                        const hour24 = parseInt(hours);
                        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                        const ampm = hour24 >= 12 ? 'PM' : 'AM';
                        collectionDetails += `${hour12}:${minutes} ${ampm}`;
                    } else {
                        // Fallback for other formats
                        collectionDetails += collectionTime;
                    }
                } catch (error) {
                    console.error('Error formatting collection time:', error);
                    collectionDetails += collectionTime;
                }
            }
            
            doc.font(fontPathTimesRegular).fontSize(12).text(collectionDetails, leftMargin);
            doc.moveDown(0.3);
        }

        doc.moveDown(1.2);

        // Create fundraising items table with subtotal information
        const itemsToUse = orderData.items || orderData.orderDetails?.items || [];
        const totalPriceToUse = orderData.totalPrice || orderData.donationAmount || 0;
        console.log('PDF Generator - Items and pricing:', {
            itemsCount: itemsToUse.length,
            totalPrice: totalPriceToUse,
            hasSubtotalInfo: !!orderData.subtotalInfo
        });
        await this.createFundraisingTable(doc, itemsToUse, totalPriceToUse, orderData.subtotalInfo);

        doc.moveDown(1);

        // Add signature line - match the image format
        doc.font(fontPathTimesRegular).fontSize(12).text("This is a computer generated receipt and requires no signature.", leftMargin);
        doc.moveDown(0.5);
        
        // Add additional instruction for self collection
        doc.font(fontPathTimesRegular).fontSize(12).text("Please provide this receipt upon self collection.", leftMargin);
    }

    // Create table for fundraising items
    async createFundraisingTable(doc, items, totalPrice, subtotalInfo) {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');

        const leftMargin = 2.54 * 28.35;
        const tableTop = doc.y;

        // Adjust column widths to match the image layout
        const columnWidths = {
            serial: 50,
            description: 350,
            amount: 80
        };

        const columnPositions = {
            serial: leftMargin,
            description: leftMargin + columnWidths.serial,
            amount: leftMargin + columnWidths.serial + columnWidths.description
        };

        const rowHeight = 40;
        const borderThickness = 1;
        const headerHeight = rowHeight;

        // Draw header background
        const tableWidth = columnWidths.serial + columnWidths.description + columnWidths.amount;
        doc.rect(leftMargin, tableTop, tableWidth, headerHeight).fill('#FBFBFB');

        // Add header text - match the image format
        doc.fontSize(12).fillColor('black').font(fontPathBold);
        doc.text('S/NO', columnPositions.serial + 15, tableTop + 12);
        doc.text('DESCRIPTION', columnPositions.description + 130, tableTop + 12);
        doc.text('AMOUNT', columnPositions.amount + 15, tableTop + 12);
        doc.text('(S$)', columnPositions.amount + 20, tableTop + 25);

        // Draw header borders
        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, tableTop)
            .lineTo(columnPositions.serial + columnWidths.serial, tableTop + headerHeight)
            .stroke('black');

        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.description + columnWidths.description, tableTop)
            .lineTo(columnPositions.description + columnWidths.description, tableTop + headerHeight)
            .stroke('black');

        // Header bottom line
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + tableWidth, tableTop + headerHeight)
            .stroke('black');

        let currentY = tableTop + headerHeight;
        doc.font(fontPathRegular).fontSize(11);

        console.log("PDF Generator - Using subtotal info:", subtotalInfo);
        console.log("PDF Generator - Items to process:", items);

        // Create a map of subtotal information for quick lookup
        const subtotalMap = {};
        if (subtotalInfo && subtotalInfo.items) {
            subtotalInfo.items.forEach(item => {
                subtotalMap[item.productName] = item;
                console.log(`PDF Generator - Added to subtotal map: ${item.productName} -> ${item.subtotal}`);
            });
        }
        
        console.log("PDF Generator - Subtotal map:", subtotalMap);

        let calculatedTotal = 0;

        // Add item rows
        items.forEach((item, index) => {
            const quantity = item.quantity || 1;
            const itemName = item.productName || item.name || 'Unknown Item';
            
            console.log(`PDF Generator - Processing item ${index + 1}:`, {
                itemName,
                quantity,
                fullItem: item,
                hasSubtotalMapEntry: !!subtotalMap[itemName]
            });
            
            // Get subtotal information from subtotalInfo if available
            let subtotal = 0;
            let unitPrice = 0;
            
            if (subtotalMap[itemName]) {
                subtotal = subtotalMap[itemName].subtotal || 0;
                unitPrice = subtotalMap[itemName].unitPrice || 0;
                console.log(`Using subtotal info for ${itemName}: quantity=${quantity}, unitPrice=${unitPrice}, subtotal=${subtotal}`);
            } else {
                // Fallback to basic calculation
                unitPrice = item.price || item.unitPrice || 0;
                subtotal = unitPrice * quantity;
                console.log(`Using fallback pricing for ${itemName}: quantity=${quantity}, unitPrice=${unitPrice}, subtotal=${subtotal}`);
            }
            
            calculatedTotal += subtotal;

            // Create structured description text with cleaner quantity display
            let descriptionText = itemName;
            descriptionText += `\nQuantity: ${quantity}`;
            
            // Check if item has date information (like in the image example)
            if (item.startDate && item.endDate) {
                descriptionText += `\n${item.startDate} - ${item.endDate}`;
            }

            // Add row content
            doc.text(index + 1, columnPositions.serial + 20, currentY + 12);
            doc.text(descriptionText, columnPositions.description + 10, currentY + 12, {
                width: columnWidths.description - 20,
                align: 'left'
            });
            
            // Always show amount, even if $0.00
            const amountText = `$${subtotal.toFixed(2)}`;
            doc.text(amountText, columnPositions.amount + 15, currentY + 12);

            // Draw vertical borders
            doc.lineWidth(borderThickness)
                .moveTo(columnPositions.serial + columnWidths.serial, currentY)
                .lineTo(columnPositions.serial + columnWidths.serial, currentY + rowHeight)
                .stroke('black');

            doc.lineWidth(borderThickness)
                .moveTo(columnPositions.description + columnWidths.description, currentY)
                .lineTo(columnPositions.description + columnWidths.description, currentY + rowHeight)
                .stroke('black');

            currentY += rowHeight;
        });

        // Add total row
        const totalRowY = currentY;
        doc.font(fontPathBold).fontSize(12);
        doc.text('Total:', columnPositions.description + 10, currentY + 12);
        
        // Use subtotal info total if available, otherwise use provided total price or calculated total
        let finalTotal = totalPrice;
        if (subtotalInfo && subtotalInfo.totalSubtotal >= 0) {
            finalTotal = subtotalInfo.totalSubtotal;
            console.log(`Using subtotal info total: $${finalTotal.toFixed(2)}`);
        } else if (calculatedTotal >= 0) {
            finalTotal = calculatedTotal;
            console.log(`Using calculated total: $${finalTotal.toFixed(2)}`);
        }
        
        // Always show total amount, even if $0.00
        doc.text(`$${finalTotal.toFixed(2)}`, columnPositions.amount + 15, currentY + 12);

        // Draw borders for total row
        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, totalRowY)
            .lineTo(columnPositions.serial + columnWidths.serial, totalRowY + rowHeight)
            .stroke('black');

        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.description + columnWidths.description, totalRowY)
            .lineTo(columnPositions.description + columnWidths.description, totalRowY + rowHeight)
            .stroke('black');

        // Top line for total row
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, totalRowY)
            .lineTo(leftMargin + tableWidth, totalRowY)
            .stroke('black');

        // External border
        doc.lineWidth(2)
            .rect(leftMargin, tableTop, tableWidth, currentY - tableTop + rowHeight)
            .stroke('black');

        doc.moveDown(3);
    }
}    

module.exports = fundRaisingGenerator;
