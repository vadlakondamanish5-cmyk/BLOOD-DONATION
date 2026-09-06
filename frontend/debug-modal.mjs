import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:5178/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'NEW REQUEST', exact: true }).click();
console.log('Heading visible?', await page.getByRole('heading', { name: /create blood request/i }).isVisible().catch(() => false));
console.log('Hospital count', await page.locator('#hospital-select').count());
console.log('RequiredBy count', await page.locator('#required-by').count());
console.log(await page.locator('body').innerText());
await browser.close();
