import { defineConfig } from '@playwright/test';
import base from '../../../playwright.config.ts';
export default defineConfig({ ...base, testDir: '.', testMatch: 'native-zoom.spec.mjs', fullyParallel: false, workers: 1, timeout: 45000, projects: [{ name: 'desktop-native-zoom' }] });
