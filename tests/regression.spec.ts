/**
 * Visual regression tests for the OSINT Platform.
 *
 * Uses Playwright to capture screenshots of the Deck.gl globe and compare
 * them against baseline images. This prevents CSS regressions that could
 * collapse the WebGL canvas to zero height (the "black void" bug).
 *
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080';

test.describe('OSINT Platform Visual Regression', () => {
  test('globe canvas renders with non-zero dimensions', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for the deck.gl canvas to appear
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Verify the canvas has a non-zero bounding box
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('control panel is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const panel = page.locator('text=OSINT Command');
    await expect(panel).toBeVisible({ timeout: 10_000 });
  });

  test('full-page screenshot matches baseline', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Give the map tiles a moment to load
    await page.waitForTimeout(3_000);

    await expect(page).toHaveScreenshot('globe-baseline.png', {
      maxDiffPixelRatio: 0.05,
      timeout: 20_000,
    });
  });
});
