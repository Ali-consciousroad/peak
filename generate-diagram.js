const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateDiagram() {
    console.log('🚀 Starting diagram generation...');
    
    // Read the HTML file
    const htmlPath = path.join(__dirname, 'use-case-diagram-simple.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport for high resolution
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2
    });
    
    // Load the HTML content
    await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
    });
    
    // Wait for Mermaid to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    const outputPath = path.join(__dirname, 'freelance-marketplace-use-case-diagram-simple.png');
    await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: 'png'
    });
    
    console.log(`✅ Simple Use Case Diagram saved to: ${outputPath}`);
    
    await browser.close();
}

// Check if Puppeteer is installed
try {
    require('puppeteer');
    generateDiagram().catch(console.error);
} catch (error) {
    console.log('📦 Installing Puppeteer...');
    const { execSync } = require('child_process');
    execSync('npm install puppeteer', { stdio: 'inherit' });
    generateDiagram().catch(console.error);
}
