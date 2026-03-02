const PDFDocument = require('pdfkit');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

class InventoryGenerator {
    constructor() {}
    
    getCurrentDateTime() {
        const now = new Date();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const day = String(now.getDate()).padStart(2, '0');
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();
        const formattedDate = `${day} ${month.substring(0,3)} ${year}`;
        return { date: formattedDate };
    }

    async addHeader(doc) {
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/Screenshot-2024-10-15-112239.jpg";

        try {
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);
            const { width, height } = await sharp(imageBuffer).metadata();

            const leftMargin = 2.54 * 28.35;
            const rightMargin = 15.93;
            const imageWidth = doc.page.width - leftMargin - rightMargin;
            const imageHeight = (height / width) * imageWidth;

            doc.image(imageBuffer, leftMargin, doc.y, {
                width: imageWidth,
                height: imageHeight,
                align: 'center',
                valign: 'top'
            });

            doc.moveDown(10);
        } catch (error) {
            console.error('Error fetching the image:', error);
        }
    }

    async addFooter(doc) {
        const imagePath = "https://ecss.org.sg/wp-content/uploads/2024/10/ok.png";

        try {
            const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);
            const { width, height } = await sharp(imageBuffer).metadata();

            const leftMargin = 0.00;
            const imageWidth = doc.page.width - leftMargin;
            const imageHeight = (height / width) * imageWidth;
            const footerYPosition = doc.page.height - 50;

            doc.image(imageBuffer, leftMargin, footerYPosition, {
                width: imageWidth,
                height: imageHeight,
                align: 'center',
                valign: 'top'
            });
        } catch (error) {
            console.error('Error adding footer:', error);
        }
    }

    // Generate inventory receipt
    // Expected orderData structure:
    // {
    //   receiptNumber: string,
    //   customerName: string,
    //   paymentMethod: string,
    //   orderDate: string (DD/MM/YYYY),
    //   orderTime: string (HH:MM),
    //   staffName: string,
    //   items: [ {
    //      product: string,
    //      location: string,
    //      quantity: number,
    //      unitPrice: number,
    //      totalPrice: number|string
    //   }, ... ]
    // }
    // if "items" is not provided, it will fall back to the older single-item fields
    async generateInventoryReceipt(orderData) {
        try {
            console.log('Inventory Generator - Generating receipt with data:', orderData);
            
            const doc = new PDFDocument();
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            
            await this.addInventoryContent(doc, orderData);
            
            doc.end();
            
            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    console.log(`Inventory PDF generated successfully. Size: ${pdfBuffer.length} bytes`);
                    resolve(pdfBuffer);
                });
                
                doc.on('error', (err) => {
                    console.error('Error generating inventory PDF:', err);
                    reject(err);
                });
            });
            
        } catch (error) {
            console.error('Error in generateInventoryReceipt:', error);
            throw error;
        }
    }

    async addInventoryContent(doc, orderData) {
        try {
            await this.addHeader(doc);
            await this.addInventoryBody(doc, orderData);
            await this.addFooter(doc);
        } catch (error) {
            console.error('Error adding inventory content:', error);
            throw error;
        }
    }

    async addInventoryBody(doc, orderData) {
        const leftMargin = 2.54 * 28.35;
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathTimesRegular = path.join(__dirname, '../../fonts/timesNewRoman.ttf');

        // Add title
        doc.font(fontPathBold).fontSize(16).text('RECEIPT', { align: 'center' });
        doc.moveDown(2);

        // Receipt Number
        const receiptText = `Receipt No  : ${orderData.receiptNumber || 'N/A'}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(receiptText, leftMargin);
        doc.moveDown(0.3);

        // Date - use orderDate if provided, otherwise current date
        const dateText = `Date        : ${orderData.orderDate || this.getCurrentDateTime().date}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(dateText, leftMargin);
        doc.moveDown(0.3);

        // Customer Name
        const customerName = `Name        : ${orderData.customerName || ''}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(customerName, leftMargin);
        doc.moveDown(0.3);

        // Payment Method
        const paymentMethod = `Payment Method  : ${orderData.paymentMethod || ''}`;
        doc.font(fontPathTimesRegular).fontSize(12).text(paymentMethod, leftMargin);
        doc.moveDown(1.2);

        // Create items table
        await this.createInventoryTable(doc, orderData);

        doc.moveDown(1);

        // Footer text
        doc.font(fontPathTimesRegular).fontSize(12).text("This is a computer generated receipt and requires no signature.", leftMargin);
        //doc.moveDown(0.5);
        //doc.font(fontPathTimesRegular).fontSize(12).text("Please provide this receipt upon self collection.", leftMargin);
    }

    async createInventoryTable(doc, orderData) {
        const fontPathBold = path.join(__dirname, '../../fonts/ARIALBD.TTF');
        const fontPathRegular = path.join(__dirname, '../../fonts/ARIAL.TTF');

        const leftMargin = 2.54 * 28.35;
        const tableTop = doc.y;

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

        const rowHeight = 50;
        const borderThickness = 1;
        const headerHeight = 40;

        const tableWidth = columnWidths.serial + columnWidths.description + columnWidths.amount;
        
        // Draw header background
        doc.rect(leftMargin, tableTop, tableWidth, headerHeight).fill('#FBFBFB');

        // Add header text
        doc.fontSize(12).fillColor('black').font(fontPathBold);
        doc.text('S/NO', columnPositions.serial + 15, tableTop + 12);
        doc.text('DESCRIPTION', columnPositions.description + 130, tableTop + 12);
        doc.text('AMOUNT', columnPositions.amount + 10, tableTop + 5);
        doc.text('(S$)', columnPositions.amount + 20, tableTop + 20);

        // Draw header borders
        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, tableTop)
            .lineTo(columnPositions.serial + columnWidths.serial, tableTop + headerHeight)
            .stroke('black');

        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.description + columnWidths.description, tableTop)
            .lineTo(columnPositions.description + columnWidths.description, tableTop + headerHeight)
            .stroke('black');

        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, tableTop + headerHeight)
            .lineTo(leftMargin + tableWidth, tableTop + headerHeight)
            .stroke('black');

        let currentY = tableTop + headerHeight;
        doc.font(fontPathRegular).fontSize(11);

        // Support multiple items if provided
        const items = Array.isArray(orderData.items) && orderData.items.length > 0
            ? orderData.items
            : [{
                product: orderData.product || '',
                // prefer explicit location field, then locationFrom (inventory data uses that),
                // default to empty string if neither exists
                location: orderData.location || orderData.locationFrom || '',
                quantity: orderData.quantity || 1,
                unitPrice: orderData.unitPrice || 0,
                totalPrice: orderData.totalPrice || (orderData.quantity * orderData.unitPrice)
            }];

        let grandTotal = 0;
        let serial = 1;

        for (const itm of items) {
            const quantity = parseFloat(itm.quantity) || 0;
            const unitPrice = parseFloat(itm.unitPrice) || 0;
            const totalPrice = parseFloat(itm.totalPrice) || (quantity * unitPrice);
            grandTotal += totalPrice;

            let descriptionText = itm.product || 'Product';
            descriptionText += `\nLocation: ${itm.location || 'N/A'}`;
            descriptionText += `\nQty: ${quantity} x $${unitPrice.toFixed(2)}`;

            // Add row content
            doc.text(`${serial}`, columnPositions.serial + 20, currentY + 15);
            doc.text(descriptionText, columnPositions.description + 10, currentY + 10, {
                width: columnWidths.description - 20,
                align: 'left'
            });
            doc.text(`$${totalPrice.toFixed(2)}`, columnPositions.amount + 15, currentY + 15);

            // Draw vertical borders for item row
            doc.lineWidth(borderThickness)
                .moveTo(columnPositions.serial + columnWidths.serial, currentY)
                .lineTo(columnPositions.serial + columnWidths.serial, currentY + rowHeight)
                .stroke('black');

            doc.lineWidth(borderThickness)
                .moveTo(columnPositions.description + columnWidths.description, currentY)
                .lineTo(columnPositions.description + columnWidths.description, currentY + rowHeight)
                .stroke('black');

            currentY += rowHeight;
            serial += 1;
        }

        // Add total row
        const totalRowHeight = 40;
        doc.font(fontPathBold).fontSize(12);
        doc.text('Total:', columnPositions.description + 10, currentY + 12);
        doc.text(`$${grandTotal.toFixed(2)}`, columnPositions.amount + 15, currentY + 12);

        // Draw borders for total row
        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.serial + columnWidths.serial, currentY)
            .lineTo(columnPositions.serial + columnWidths.serial, currentY + totalRowHeight)
            .stroke('black');

        doc.lineWidth(borderThickness)
            .moveTo(columnPositions.description + columnWidths.description, currentY)
            .lineTo(columnPositions.description + columnWidths.description, currentY + totalRowHeight)
            .stroke('black');

        // Top line for total row
        doc.lineWidth(borderThickness)
            .moveTo(leftMargin, currentY)
            .lineTo(leftMargin + tableWidth, currentY)
            .stroke('black');

        // External border
        doc.lineWidth(2)
            .rect(leftMargin, tableTop, tableWidth, currentY - tableTop + totalRowHeight)
            .stroke('black');

        doc.moveDown(3);
    }
}

module.exports = InventoryGenerator;
