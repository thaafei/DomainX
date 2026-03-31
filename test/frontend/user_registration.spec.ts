import { test, expect } from '@playwright/test';

test('User can log in', async ({ page }) => {
  // See all the requested URLs for mocking backend
  // page.on('request', request => {
  //   console.log('Request URL:', request.url());
  // });

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

  await page.route('http://localhost:3000/api/domain/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          domain_ID: '1',
          domain_name: 'Test Domain',
          description: 'Test domain description',
          creators: [],
        },
      ]),
    });
  });

  await page.route('http://localhost:3000/api/metrics/categories/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        Categories: ['Quality', 'Popularity'],
      }),
    });
  });

  await page.route('http://localhost:3000/api/users/?role=admin,superadmin', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('http://localhost:3000/api/library_metric_values/ahp/1/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        global_ranking: {
          LibraryA: 0.82,
          LibraryB: 0.64,
        },
        category_details: {
          Quality: {
            LibraryA: 0.9,
            LibraryB: 0.7,
          },
          Popularity: {
            LibraryA: 0.74,
            LibraryB: 0.58,
          },
        },
      }),
    });
  });

  await page.route('http://localhost:3000/api/domain/1/category-weights/', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          Quality: 0.5,
          Popularity: 0.5,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Weights updated successfully',
      }),
    });
  });

  await page.goto('http://localhost:3000/login');

  await page.getByLabel('Username or Email').fill('test@gmail.com');
  await page.getByLabel('Password').fill('test123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('button', { name: 'GRAPH VIEW' })).toBeVisible();
});
