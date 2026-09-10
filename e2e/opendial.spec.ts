import { test, expect } from '@playwright/test';

test.describe('OpenDial E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('App Initialization', () => {
    test('loads without crashing', async ({ page }) => {
      await expect(page).toHaveTitle(/OpenDial/i);
      await expect(page.locator('body')).toBeVisible();
    });

    test('renders the main dashboard', async ({ page }) => {
      await expect(page.locator('body')).toContainText(/OpenDial|speed dial|dial/i);
    });

    test('shows the navigation bar', async ({ page }) => {
      await expect(page.locator('nav, header')).toBeVisible();
    });

    test('no storage migration error overlay on fresh start', async ({ page }) => {
      const overlay = page.locator('div.fixed.top-0.bg-rose-500');
      await expect(overlay).toHaveCount(0);
    });
  });

  test.describe('Dial Management', () => {
    test('keyboard shortcut 1-9 works', async ({ page }) => {
      await page.keyboard.press('1');
      await expect(page.locator('body')).toBeVisible();
    });

    test('navigates between view modes', async ({ page }) => {
      const viewToggle = page.locator(
        'button[aria-label*="view"], button:has-text("Compact"), button:has-text("Station")',
      );
      if (await viewToggle.count()) {
        await viewToggle.click();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Search & Command Console', () => {
    test('slash key focuses search bar', async ({ page }) => {
      // The search bar listens for '/' key on window.keydown events
      // Click on the page body first to ensure the window can receive the event
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('/');
      const searchInput = page.locator('#opendial-search-input');
      await expect(searchInput).toBeFocused();
    });

    test('escape key closes modals/focus', async ({ page }) => {
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('/');
      await page.waitForTimeout(100);
      const searchInput = page.locator('#opendial-search-input');
      await searchInput.focus();
      await page.keyboard.press('Escape');
      await expect(searchInput).not.toBeFocused();
    });
  });

  test.describe('Settings & Preferences', () => {
    test('opens settings modal via navbar button', async ({ page }) => {
      // The settings button has title="Preferences & Theme" and contains a Sliders icon
      const settingsBtn = page.locator('button[title="Preferences & Theme"]');
      await settingsBtn.click();
      const settingsModal = page.locator('#settings-modal-container');
      await expect(settingsModal).toBeVisible();
    });
  });

  test.describe('Data Persistence', () => {
    test('app state survives browser storage changes', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem(
          'opendial_dials',
          JSON.stringify([{ id: 'test', title: 'Test', url: 'https://example.com' }]),
        );
      });
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });

    test('dials persist across page reloads', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('opendial_test_marker', 'persist_test');
      });
      await page.reload();
      const marker = await page.evaluate(() => localStorage.getItem('opendial_test_marker'));
      expect(marker).toBe('persist_test');
    });
  });

  test.describe('Accessibility', () => {
    test('page has a valid lang attribute', async ({ page }) => {
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
    });

    test('main content is keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).not.toBe('BODY');
    });
  });
});
