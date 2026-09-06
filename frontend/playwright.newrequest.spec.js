import { test, expect } from '@playwright/test';

test('new request modal renders and submits', async ({ page }) => {
  await page.goto('http://localhost:5178/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /enter dashboard/i }).click();
  await page.getByRole('button', { name: 'NEW REQUEST', exact: true }).click();

  await expect(page.getByRole('heading', { name: /create blood request/i })).toBeVisible({ timeout: 15000 });

  await page.locator('#hospital-select').selectOption({ index: 1 });
  await page.locator('input[name="bloodGroup"][value="A+"]').check();
  await page.locator('input[name="bloodGroup"][value="O-"]').check();

  await page.locator('input[name="urgency"][value="CRITICAL"]').check();
  await expect(page.locator('input[name="urgency"][value="CRITICAL"]')).toBeChecked();

  await page.locator('#required-by').fill('2026-09-08T12:00');
  await page.locator('#request-notes').fill('Priority trauma patient');

  await page.getByRole('button', { name: /create request/i }).click();
  await expect(page.getByText(/request/i)).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 20000 });
});
