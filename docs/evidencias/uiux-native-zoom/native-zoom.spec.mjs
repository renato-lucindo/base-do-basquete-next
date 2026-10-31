import { execFileSync } from 'node:child_process';
import { test, expect, chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { desktopSheetFixture, openDesktopSheet, chooseFive } from '../../../tests/fixtures/sheet-desktop.ts';
const extension = path.resolve('.preview-artifacts/native-zoom-extension');
mkdirSync(extension, { recursive: true });
writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Local native zoom validation', version: '1.0', permissions: ['tabs'], background: { service_worker: 'background.js' } }));
writeFileSync(path.join(extension, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
for (const [width, height] of [[1366,768],[1920,1080]]) {
  test(`native browser zoom 200% ${width}x${height}`, async () => {
    const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: null, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, `--window-size=${width},${height}`] });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const page = context.pages()[0] ?? await context.newPage();
      await desktopSheetFixture(page);
      await openDesktopSheet(page);
      await chooseFive(page);
      const before = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
      const zoom = await worker.evaluate(async () => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find(tab => tab.url?.startsWith('http://127.0.0.1:5174/'));
        if (!tab?.id) throw new Error('Isolated fixture tab not found');
        await chrome.tabs.setZoom(tab.id, 2);
        return chrome.tabs.getZoom(tab.id);
      });
      expect(zoom).toBe(2);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBeLessThan(before.width * .51);
      const after = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
      expect(after.dpr).toBeCloseTo(before.dpr * 2);
      const checkTeams = async (stage) => {
        const grid = page.locator('.sheet-desktop-teams:visible');
        await expect(grid).toHaveCount(1);
        const geometry = await grid.evaluate(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth, cards: [...node.querySelectorAll('.sheet-team-card')].map(card => { const r=card.getBoundingClientRect(); return {top:r.top,bottom:r.bottom}; }) }));
        expect(geometry.cards).toHaveLength(2);
        expect(geometry.cards[0].bottom).toBeGreaterThan(geometry.cards[0].top);
        expect(geometry.cards[1].top).toBeGreaterThanOrEqual(geometry.cards[0].bottom - 1);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
        await grid.evaluate(node => node.scrollIntoView({block: "start"})); const cdp = await context.newCDPSession(page); const screenshot = await cdp.send("Page.captureScreenshot", {fromSurface: true, captureBeyondViewport: false}); writeFileSync(`.preview-artifacts/native-zoom200-${stage}-${width}x${height}.png`, Buffer.from(screenshot.data,"base64")); await cdp.detach();
        return geometry;
      };
      const preparation = await checkTeams('preparation');
      await page.getByRole('button', {name:'Concluir preparação e lançar ações',exact:true}).click();
      await page.getByLabel('Camisa ou alvo',{exact:true}).fill('1');
      await page.keyboard.press('Enter');
      await page.getByLabel('Ação',{exact:true}).fill('1');
      await page.keyboard.press('Enter');
      const live = await checkTeams('live');
      const scroller=page.getByRole('region',{name:'Súmula da equipe A com rolagem horizontal',exact:true});
      await scroller.focus();
      await expect(scroller).toBeFocused();
      if (after.width < 820) {
        await page.keyboard.press('ArrowRight');
        await expect.poll(()=>scroller.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
      }
      const edit=page.getByRole('button',{name:'Editar ação 1',exact:true});
      await edit.focus();
      await page.keyboard.press('Enter');
      const dialog=page.getByRole('dialog',{name:'Editar ação da súmula',exact:true});
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Tab');
      await expect.poll(()=>dialog.evaluate(node=>node.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(edit).toBeFocused();
      writeFileSync(`.preview-artifacts/native-zoom200-${width}x${height}.json`, JSON.stringify({ source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), method:'chrome.tabs.setZoom/getZoom in isolated bundled Chromium', zoom, before, after, preparation, live, keyboard:true, modalFocusReturn:true, syntheticFixtures:true },null,2));
    } finally { await context.close(); }
  });
}
