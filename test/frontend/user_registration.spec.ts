import { test, expect } from '@playwright/test';

test('User can register', async ({ page }) => {
  page.on('request', request => {
    console.log('Request URL:', request.url());
  });
  await page.route('http://localhost:3000/api/signup/', async route => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 1, username: 'test123', email: 'test@gmail.com' },
        message: 'User registered successfully',
      }),
    });
  });

  await page.route('http://localhost:3000/api/login/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'fake-jwt-token',
        user: { id: 1, username: 'test123', email: 'test@gmail.com' },
      }),
    });
  });
  await page.goto("http://localhost:3000/login");
  await page.getByText('Sign up').click();
  
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('test@gmail.com');
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');

  await page.getByRole('textbox', { name: 'Username' }).fill('test123');
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('test123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  
  await page.getByRole('textbox', { name: 'Username or Email' }).click();
  await page.getByRole('textbox', { name: 'Username or Email' }).fill('test@gmail.com');
  await page.getByRole('textbox', { name: 'Username or Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('test123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});