import { test, expect } from '@playwright/test';

test('User can register', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.getByLabel('Go to login page').click();
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