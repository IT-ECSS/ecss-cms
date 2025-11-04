const PDFDocument = require('pdfkit');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

class CheckoutInvoiceGenerator {
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
    }

    generateInvoiceNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `INV${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    async addHeader(doc, invoiceNumber) {
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
        }
    }

    async addBody(doc, orderData, invoiceNumber) {
        const leftMargin = 2.54 * 28.35; // 2.54 cm to points
        const rightMargin = 15.93; // Right margin in points

        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf');

        // Set the font to Arial Bold and add the title "INVOICE"
        doc.font(fontPathBold).fontSize(16).text('INVOICE', { align: 'center' });

        // Move down for spacing after the title
        doc.moveDown(2);

        var invoiceText = `Invoice No  : ${invoiceNumber}`;

        // Store the current y position
        let currentY = doc.y;

        // Add the invoice number on the left side and keep the cursor position
        doc.font(fontPathTimesRegular).fontSize(12).text(invoiceText, leftMargin, currentY, {
            continued: true
        });

        // Now add the page parts on the same line on the right
        const rightX = doc.page.width - rightMargin - 300; // Adjust this value to align the page number properly

        // Finish the line without continued option
        doc.text('', rightX, currentY, {
            continued: false
        });

        // Move down for spacing after the invoice number and current page
        doc.moveDown(1); // Adjust this to ensure the spacing before the date

        // Add a new line before adding the date text
        var getCurrentDateTime = this.getCurrentDateTime();
        const dateText = `Date        : ${getCurrentDateTime.date}`;

        // Add the date on a new line
        doc.font(fontPathTimesRegular).fontSize(12).text(dateText, leftMargin, doc.y, {
            align: 'left'
        });
        
        doc.moveDown(1);
        
        // Add customer name
        const customerName = `Name        : ${orderData.personalInfo.firstName} ${orderData.personalInfo.lastName}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(customerName, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add email
        const email = `Email       : ${orderData.personalInfo.email}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(email, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add phone
        const phone = `Phone       : ${orderData.personalInfo.phone}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(phone, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add address
        const address = `Address     : ${orderData.personalInfo.address}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(address, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add postal code
        const postalCode = `Postal Code : ${orderData.personalInfo.postalCode}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(postalCode, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add payment method
        const paymentMethod = `Payment Method  : ${orderData.paymentDetails.paymentMethod}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(paymentMethod, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add collection mode
        const collectionMode = `Collection Mode : ${orderData.collectionDetails.collectionMode}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(collectionMode, leftMargin, doc.y, {
            align: 'left'
        });

        doc.moveDown(1);

        // Add collection/delivery location
        if (orderData.collectionDetails.CollectionDeliveryLocation) {
            const locationText = orderData.collectionDetails.collectionMode === 'Self-Collection' 
                ? `Collection Location : ${orderData.collectionDetails.CollectionDeliveryLocation}`
                : `Delivery Address   : ${orderData.collectionDetails.CollectionDeliveryLocation}`;
            doc.font(fontPathTimesRegular).fontSize(12).text(locationText, leftMargin, doc.y, {
                align: 'left'
            });
            doc.moveDown(1);
        }

        // Add order date and time
        if (orderData.orderDetails.orderDate && orderData.orderDetails.orderTime) {
            const orderDateTime = `Order Date  : ${orderData.orderDetails.orderDate} at ${orderData.orderDetails.orderTime}`;
            doc.font(fontPathTimesRegular).fontSize(12).text(orderDateTime, leftMargin, doc.y, {
                align: 'left'
            });
            doc.moveDown(1);
        }

        doc.moveDown(1);

        this.createTable(doc, orderData.orderDetails.items, orderData.orderDetails.totalPrice);

        //doc.moveDown(1);

        // Add the date on a new line
        /*doc.font(fontPathTimesRegular).fontSize(12).text("This is a system-generated invoice issued prior to payment completion.", leftMargin, doc.y, {
            align: 'left'
        });*/

        doc.moveDown(5);
    }

    async createTable(doc, items, totalPrice) {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf');

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

        let calculatedTotal = 0; 

        items.forEach((item, index) => {
            // Calculate individual item price (assuming items have a price field, or derive from total)
            // If individual item prices aren't available, we'll need to calculate based on total/quantity
            let itemPrice = 0;
            if (item.price) {
                itemPrice = parseFloat(item.price) * parseInt(item.quantity);
            } else {
                // Fallback: divide total by total quantity if no individual prices
                const totalQuantity = items.reduce((sum, i) => sum + parseInt(i.quantity), 0);
                const pricePerUnit = parseFloat(totalPrice) / totalQuantity;
                itemPrice = pricePerUnit * parseInt(item.quantity);
            }

            // Add row content for each entry
            doc.text(index + 1, columnPositions.serial+15, currentY+12); // Serial number
            doc.text(`${item.productName}\nQty: ${item.quantity}`, columnPositions.description + 15, currentY+6); // Description
            doc.text(`$${itemPrice.toFixed(2)}`, columnPositions.amount + 30, currentY+12); // Amount

            calculatedTotal += itemPrice;

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
        doc.font(fontPathBold).fontSize(12).text(`$${parseFloat(totalPrice).toFixed(2)}`, columnPositions.amount + 30, currentY + 12); // Use the actual total price

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

    async addFooter(doc) {
        console.log("Add Footer");
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/ok.png";

        const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        // Use sharp to get the image dimensions
        const { width, height } = await sharp(imageBuffer).metadata();

        // Set the left and right margins in points
        const leftMargin = 0.00;

        const imageWidth = doc.page.width - leftMargin; // Full width minus margins
        const imageHeight = (height / width) * imageWidth; // Maintain aspect ratio

        const footerYPosition = doc.page.height - 50; 

        // Add the image to the document with the left margin
        doc.image(imageBuffer, leftMargin, footerYPosition, {
            width: imageWidth,
            height: imageHeight,
            align: 'center',
            valign: 'top'
        });
    }

    async addContent(doc, orderData, invoiceNumber) {
        // Initial header addition for the first page
        await this.addHeader(doc, invoiceNumber); // Add header to the first page

        // Add body content for the first page
        await this.addBody(doc, orderData, invoiceNumber);

        // Add footer
        await this.addFooter(doc);
    }

    async generateCheckoutInvoice(orderData, receiptNumber = null) {
        try {
            console.log("Generating checkout invoice...");
            console.log("Order data received:", JSON.stringify(orderData, null, 2));
            
            // Create a new PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            // Use provided receipt number or generate invoice number as fallback
            const invoiceNumber = receiptNumber || this.generateInvoiceNumber();
            console.log("Using invoice number:", invoiceNumber);

            // Add all content to the PDF
            await this.addContent(doc, orderData, invoiceNumber);

            // Finalize the PDF and return as buffer
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log("Checkout invoice generated successfully");
                    resolve({
                        buffer: pdfBuffer,
                        invoiceNumber: invoiceNumber,
                        filename: `Invoice_${orderData.personalInfo.firstName}_${orderData.personalInfo.lastName}_${invoiceNumber}.pdf`
                    });
                });
                
                doc.on('error', (error) => {
                    console.error("Error generating checkout invoice:", error);
                    reject(error);
                });
                
                doc.end();
            });

        } catch (error) {
            console.error("Error in generateCheckoutInvoice:", error);
            throw error;
        }
    }
}

module.exports = CheckoutInvoiceGenerator;