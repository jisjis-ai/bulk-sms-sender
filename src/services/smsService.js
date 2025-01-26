import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://fluffy-begonia-c64229.netlify.app',
  credentials: true
}));
app.use(express.json());

let browser = null;
let page = null;
let isConnected = false;

async function initBrowser() {
  try {
    console.log('Initializing browser...');
    browser = await puppeteer.launch({
      headless: false,
      executablePath: process.env.CHROME_BIN || null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    console.log('Browser launched, opening page...');
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to Google Messages...');
    await page.goto('https://messages.google.com/web/authentication', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    console.log('Waiting for QR code...');
    await page.waitForSelector('qr-code', { timeout: 30000 });
    
    // Wait for successful connection
    const navigationPromise = page.waitForNavigation({ timeout: 300000 }); // 5 minute timeout
    await navigationPromise;
    
    isConnected = true;
    console.log('Successfully connected to Google Messages');
  } catch (error) {
    console.error('Error during browser initialization:', error);
    isConnected = false;
    throw error;
  }
}

app.post('/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!isConnected) {
      return res.status(400).json({ error: 'Not connected to Google Messages' });
    }

    console.log(`Sending message to ${phone}`);

    // Click new conversation button
    await page.click('button[aria-label="Start chat"]');
    await page.waitForTimeout(1000);
    
    // Type phone number
    await page.type('input[aria-label="Type a phone number"]', phone);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Type and send message
    await page.type('textarea[aria-label="Text message"]', message);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    
    // Wait for message to send
    await page.waitForTimeout(2000);
    
    console.log(`Message sent to ${phone}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/status', (req, res) => {
  res.json({ connected: isConnected });
});

app.post('/connect', async (req, res) => {
  try {
    if (!browser) {
      await initBrowser();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to connect:', error);
    res.status(500).json({ error: 'Failed to connect to browser' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`SMS service running on port ${port}`);
});
