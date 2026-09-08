import { test, expect } from '@playwright/test';

test.describe('Role-Based User Interface System E2E', () => {
  const timestamp = Date.now();
  const donorPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const donorEmail = `donor_${timestamp}@example.com`;
  const hospitalEmail = `hospital_${timestamp}@example.com`;

  test('Test 1 & 3 & 6: 5-step Donor registration wizard, auto-redirect, refresh, security isolation, logout', async ({ page }) => {
    // 1. Navigate to Register Page
    await page.goto('http://localhost:5174/register', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Create Account/i)).toBeVisible();

    // Ensure DONOR is selected
    await page.locator('#role-btn-donor').click();

    // Verify 5-Step Progress Indicator is displayed
    await expect(page.locator('#donor-step-indicator-1')).toBeVisible();
    await expect(page.locator('#donor-step-indicator-2')).toBeVisible();
    await expect(page.locator('#donor-step-indicator-3')).toBeVisible();
    await expect(page.locator('#donor-step-indicator-4')).toBeVisible();
    await expect(page.locator('#donor-step-indicator-5')).toBeVisible();

    // STEP 1 – PERSONAL DETAILS
    await expect(page.getByRole('heading', { name: /Step 1: Personal Details/i })).toBeVisible();

    // Test Step 1 Validation: Click Next without entering name
    await page.locator('#btn-donor-next').click();
    await expect(page.getByText(/Please enter your full legal name/i)).toBeVisible();

    // Fill Step 1 valid data
    await page.locator('input[placeholder="e.g. Rahul Varma"]').fill('Pooja Sharma');
    await page.locator('#btn-donor-next').click();

    // STEP 2 – CONTACT & LOCATION
    await expect(page.getByRole('heading', { name: /Step 2: Contact & Location/i })).toBeVisible();

    // Test Step 2 Validation: Invalid phone number
    await page.locator('input[placeholder="9876543210"]').fill('12345');
    await page.locator('#btn-donor-next').click();
    await expect(page.getByText(/Mobile phone number must be exactly 10 digits/i)).toBeVisible();

    // Test BACK button preserves entered Step 1 data
    await page.locator('#btn-donor-back').click();
    await expect(page.getByRole('heading', { name: /Step 1: Personal Details/i })).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. Rahul Varma"]')).toHaveValue('Pooja Sharma');

    // Return to Step 2
    await page.locator('#btn-donor-next').click();
    await expect(page.getByRole('heading', { name: /Step 2: Contact & Location/i })).toBeVisible();

    // Fill Step 2 valid data
    await page.locator('input[placeholder="9876543210"]').fill(donorPhone);
    await page.locator('input[placeholder="rahul@example.com"]').fill(donorEmail);
    await page.locator('input[placeholder="e.g. Hyderabad"]').fill('Hyderabad');
    await page.locator('input[placeholder="e.g. Banjara Hills / Hitec City"]').fill('Banjara Hills');
    await page.locator('#btn-donor-next').click();

    // STEP 3 – BLOOD & DONATION DETAILS
    await expect(page.getByRole('heading', { name: /Step 3: Blood & Donation Details/i })).toBeVisible();
    // Select Blood Group O+
    await page.getByRole('button', { name: 'O+', exact: true }).click();
    await page.locator('#btn-donor-next').click();

    // STEP 4 – CONSENT & HEALTH DECLARATION
    await expect(page.getByRole('heading', { name: /Step 4: Consent & Health Declaration/i })).toBeVisible();
    await expect(page.getByText(/Consent to receive emergency SOS transfusion requests/i)).toBeVisible();
    await expect(page.getByText(/I declare I am feeling healthy, well, and free of recent acute infections/i)).toBeVisible();
    await page.locator('#btn-donor-next').click();

    // STEP 5 – ACCOUNT & REVIEW
    await expect(page.getByRole('heading', { name: /Step 5: Account & Review/i })).toBeVisible();
    // Check Summary Review details
    await expect(page.getByText('Pooja Sharma')).toBeVisible();
    await expect(page.getByText(donorPhone)).toBeVisible();
    await expect(page.getByText(/Banjara Hills, Hyderabad/i)).toBeVisible();

    // Test Step 5 Validation: Passwords mismatch
    await page.locator('input[placeholder="Min. 6 characters"]').fill('Password123');
    await page.locator('input[placeholder="Re-enter password"]').fill('PasswordMismatch');
    await page.locator('#btn-register-submit').click();
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();

    // Fix password
    await page.locator('input[placeholder="Re-enter password"]').fill('Password123');

    // Submit registration as Donor
    await page.locator('#btn-register-submit').click();

    // Verify automatic redirect to Donor Dashboard (no user choice prompt)
    await page.waitForURL('**/donor/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/donor/dashboard');

    // Verify Donor Portal elements
    await expect(page.getByText(/DONOR PORTAL/i)).toBeVisible();
    await expect(page.getByText(/Pooja Sharma/i).first()).toBeVisible();

    // Refresh page - verify still on Donor Dashboard
    await page.reload({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/donor/dashboard');
    await expect(page.getByText(/DONOR PORTAL/i)).toBeVisible();

    // Test 3: Donor Security Isolation - Try accessing /hospital/dashboard
    await page.goto('http://localhost:5174/hospital/dashboard');
    // Guard redirects back to /donor/dashboard
    await page.waitForURL('**/donor/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/donor/dashboard');
    await expect(page.getByText(/DONOR PORTAL/i)).toBeVisible();

    // Test 6: Logout
    const donorHeaderLogout = page.locator('#btn-donor-header-logout');
    if (await donorHeaderLogout.isVisible()) {
      await donorHeaderLogout.click();
    } else {
      await page.locator('#btn-donor-logout').click({ force: true });
    }
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Verify protected pages inaccessible while logged out
    await page.goto('http://localhost:5174/donor/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('Test 2 & 4: Hospital registration, auto-redirect, refresh, security isolation', async ({ page }) => {
    // 2. Register as Hospital
    await page.goto('http://localhost:5174/register', { waitUntil: 'networkidle' });
    await expect(page.getByText(/Create Account/i)).toBeVisible();

    // Select HOSPITAL
    await page.locator('#role-btn-hospital').click();
    await page.locator('input[placeholder="e.g. Apollo Hospitals - Bannerghatta"]').fill('Apex Multi-Speciality Trauma Center');
    await page.locator('input[placeholder="Dr. Blood Bank Chief"]').fill('Dr. Ramesh Patel');
    await page.locator('input[placeholder="+91 80 2630 4050"]').fill('+91 80 4400 5500');
    await page.locator('input[placeholder="bloodbank@hospital.org"]').fill(hospitalEmail);
    await page.locator('input[placeholder="Min. 6 characters"]').fill('Password123');
    await page.locator('input[placeholder="Re-enter password"]').fill('Password123');

    // Submit registration
    await page.locator('#btn-register-submit').click();

    // Verify automatic redirect to Hospital Dashboard
    await page.waitForURL('**/hospital/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/hospital/dashboard');

    // Verify Hospital Portal elements
    await expect(page.getByText(/HOSPITAL PORTAL/i)).toBeVisible();
    await expect(page.getByText(/Apex Multi-Speciality/i).first()).toBeVisible();

    // Refresh page - verify still on Hospital Dashboard
    await page.reload({ waitUntil: 'networkidle' });
    expect(page.url()).toContain('/hospital/dashboard');
    await expect(page.getByText(/HOSPITAL PORTAL/i)).toBeVisible();

    // Test 4: Hospital Security Isolation - Try accessing /donor/dashboard
    await page.goto('http://localhost:5174/donor/dashboard');
    // Guard redirects back to /hospital/dashboard
    await page.waitForURL('**/hospital/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/hospital/dashboard');
    await expect(page.getByText(/HOSPITAL PORTAL/i)).toBeVisible();

    // Logout
    const headerLogout = page.locator('#btn-hospital-header-logout');
    if (await headerLogout.isVisible()) {
      await headerLogout.click();
    } else {
      await page.locator('#btn-hospital-logout').click({ force: true });
    }
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('Test 5: Admin Login and Existing Command Center', async ({ page }) => {
    test.setTimeout(60000);
    // 5. Admin Login via Quick Demo pill
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Sign In/i })).toBeVisible();

    // Click Admin Demo pill
    await page.locator('#demo-pill-admin').click();
    await page.locator('#btn-login-submit').click();

    // Verify redirect to Admin Dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/admin/dashboard');

    // Verify Existing Command Center elements
    await expect(page.getByText(/Command Board/i).first()).toBeVisible();
    await expect(page.getByText(/5-STEP EMERGENCY BLOOD COORDINATION PIPELINE/i)).toBeVisible();

    // Verify all 5 steps are visible
    const step1 = page.locator('#admin-step-1-donor-registration');
    const step2 = page.locator('#admin-step-2-hospital-registration');
    const step3 = page.locator('#admin-step-3-blood-request');
    const step4 = page.locator('#admin-step-4-donor-matching');
    const step5 = page.locator('#admin-step-5-emergency-tracking');

    await expect(step1).toBeVisible();
    await expect(step2).toBeVisible();
    await expect(step3).toBeVisible();
    await expect(step4).toBeVisible();
    await expect(step5).toBeVisible();

    // STEP 1: Click and verify opens Donor Network
    await step1.click();
    await expect(page.getByText(/Donor Network/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Command Board/i }).click();

    // STEP 2: Click and verify opens Facility Directory
    await step2.click();
    await expect(page.getByText(/Facility Directory/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Command Board/i }).click();

    // STEP 3: Click and verify opens Emergency Requests
    await step3.click();
    await expect(page.getByText(/Emergency Requests/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Command Board/i }).click();

    // STEP 4: Click and verify opens Donor Matching
    await step4.click();
    await expect(page.getByText(/Match Inspector/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Command Board/i }).click();

    // STEP 5: Click and verify opens Emergency Response / Tracking
    await step5.click();
    await expect(page.getByText(/Blood Tracking/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Command Board/i }).click();
    await expect(page.getByText(/5-STEP EMERGENCY BLOOD COORDINATION PIPELINE/i)).toBeVisible();
  });
});
