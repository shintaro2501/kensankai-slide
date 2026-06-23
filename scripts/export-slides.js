const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  console.error('Playwright is not installed. Run: npm install');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const OUTPUT_DIR = path.join(ROOT, 'exports', 'slides');
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;
const EXPORT_MOTION_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}

section[data-deck-active] .sb > * {
  animation: none !important;
  opacity: 1 !important;
}
`;

function parseArgs(argv) {
  const options = { only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--only') {
      options.only = Number(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--only=')) {
      options.only = Number(arg.slice('--only='.length));
    }
  }
  if (options.only !== null && (!Number.isInteger(options.only) || options.only < 1)) {
    throw new Error('--only must be a positive slide number.');
  }
  return options;
}

async function waitForDeck(page) {
  await page.waitForSelector('deck-stage');
  await page.waitForFunction(() => customElements.get('deck-stage'));
  await page.waitForFunction(() => {
    const deck = document.querySelector('deck-stage');
    return deck && typeof deck.goTo === 'function' && deck.querySelectorAll('section').length > 0;
  });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function prepareDeck(page) {
  await page.addStyleTag({ content: EXPORT_MOTION_CSS });
  await page.evaluate(() => {
    const deck = document.querySelector('deck-stage');
    deck.setAttribute('no-rail', '');
    deck.setAttribute('noscale', '');
    deck.style.setProperty('--deck-rail-w', '0px');
    const shadow = deck.shadowRoot;
    if (shadow && !shadow.getElementById('export-cleanup-style')) {
      const style = document.createElement('style');
      style.id = 'export-cleanup-style';
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        .overlay,
        .rail,
        .rail-resize,
        .ctxmenu,
        .confirm-backdrop {
          display: none !important;
        }
        .stage {
          left: 0 !important;
        }
        .canvas {
          transform: none !important;
        }
      `;
      shadow.appendChild(style);
    }
  });
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
          return;
        } catch (error) {}
      }
      await new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

async function captureSlide(page, slideNumber, outputPath) {
  await page.evaluate((index) => {
    const deck = document.querySelector('deck-stage');
    deck.goTo(index);
  }, slideNumber - 1);

  await page.waitForFunction((index) => {
    const slides = Array.from(document.querySelectorAll('deck-stage > section'));
    return slides[index] && slides[index].hasAttribute('data-deck-active');
  }, slideNumber - 1);

  await waitForAssets(page);
  await page.waitForTimeout(200);
  const slide = await page.$(`deck-stage > section:nth-of-type(${slideNumber})`);
  if (!slide) throw new Error(`Slide ${slideNumber} was not found.`);
  await slide.screenshot({ path: outputPath });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });

  await page.goto(`file://${INDEX_PATH.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await waitForDeck(page);
  await prepareDeck(page);

  const totalSlides = await page.$$eval('deck-stage > section', (slides) => slides.length);
  const slideNumbers = options.only
    ? [options.only]
    : Array.from({ length: totalSlides }, (_, index) => index + 1);

  for (const slideNumber of slideNumbers) {
    if (slideNumber > totalSlides) {
      throw new Error(`Slide ${slideNumber} does not exist. Total slides: ${totalSlides}.`);
    }
    const fileName = `slide-${String(slideNumber).padStart(2, '0')}.png`;
    const outputPath = path.join(OUTPUT_DIR, fileName);
    await captureSlide(page, slideNumber, outputPath);
    console.log(`Exported ${path.relative(ROOT, outputPath)}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
