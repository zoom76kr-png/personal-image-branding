import { chromium } from 'playwright-core'

const imagePath = process.argv[2]
if (!imagePath) {
  console.error('Usage: node scripts/smoke.mjs <local-portrait-image>')
  process.exit(2)
}

const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(process.env.LOCALAPP_URL || 'http://127.0.0.1:5173/')
  await page.getByRole('button', { name: '내 컬러 발견하기' }).click()
  await page.locator('input[type=file]').setInputFiles(imagePath)
  await page.getByRole('button', { name: '이 사진 분석하기' }).click()
  await page.getByText('당신을 닮은').waitFor({ timeout: 60000 })
  await page.getByRole('tab', { name: '메이크업' }).click()
  await page.getByText('립 컬러').waitFor()
  await page.getByRole('tab', { name: '헤어 컬러' }).click()
  await page.getByText('머리카락에 어울리는 색').waitFor()
  await page.getByRole('tab', { name: '컬러 팔레트' }).click()
  const swatches = await page.locator('.color-chip').count()
  if (swatches !== 9) throw new Error(`Expected 9 palette colors, got ${swatches}`)
  if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true })
  await page.getByRole('button', { name: '처음부터' }).click()
  await page.getByRole('button', { name: '내 컬러 발견하기' }).click()
  await page.getByRole('button', { name: '직접 선택하기' }).click()
  await page.getByLabel('피부 색 직접 선택').fill('#d6aa8d')
  await page.getByRole('tab', { name: '컬러 팔레트' }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (mobileOverflow) throw new Error('Mobile layout overflows horizontally')
  const cameraPage = await browser.newPage({ permissions: ['camera'] })
  await cameraPage.goto(process.env.LOCALAPP_URL || 'http://127.0.0.1:5173/')
  await cameraPage.getByRole('button', { name: '내 컬러 발견하기' }).click()
  await cameraPage.getByRole('button', { name: '웹캠 촬영' }).click()
  await cameraPage.getByRole('button', { name: '이 모습으로 촬영하기' }).waitFor({ timeout: 15000 })
  await cameraPage.waitForFunction(() => (document.querySelector('video')?.videoWidth ?? 0) > 0, undefined, { timeout: 15000 })
  await cameraPage.getByRole('button', { name: '이 모습으로 촬영하기' }).click()
  await cameraPage.getByRole('button', { name: '이 사진 분석하기' }).waitFor()
  await cameraPage.close()
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`)
  console.log('Smoke test passed: photo analysis, manual mode, webcam capture, mobile layout, recommendation tabs and 9 swatches')
} finally {
  await browser.close()
}
