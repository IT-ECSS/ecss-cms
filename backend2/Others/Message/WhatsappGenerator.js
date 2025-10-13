const puppeteer = require('puppeteer');
const fs = require('fs'); // To read cookies from a file (optional)

class WhatsappGenerator {
    sendAutomatedMessage = async (phoneNumber, message) => {
        try {
            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();

            // Load cookies from file (if stored in a file)
            const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));

            // Set cookies to the page to bypass the QR code
            await page.setCookie(...cookies);

            // Go to WhatsApp Web (will be logged in automatically)
            await page.goto('https://web.whatsapp.com');

            // Wait for the chat input field to be available (this indicates login is complete)
            await page.waitForSelector('div[contenteditable="true"]');

            // Search for the contact by typing the phone number
            await page.type('div[contenteditable="true"]', phoneNumber);
            await page.waitForSelector(`span[title="${phoneNumber}"]`);
            await page.click(`span[title="${phoneNumber}"]`);

            // Wait until the chat input field is ready
            await page.waitForSelector('div[contenteditable="true"]');
            await page.type('div[contenteditable="true"]', message); // Type the message
            await page.keyboard.press('Enter'); // Press Enter to send the message

            console.log(`Message sent to ${phoneNumber}`);
            
            // Close the browser
            await browser.close();
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
}

module.exports = WhatsappGenerator;
