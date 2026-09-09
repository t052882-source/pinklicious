/* Print the Pinklicious site to PDF at true desktop width, so the pages look
   exactly like the site does on a laptop. Page = 1440 x 900 CSS px = 15 x 9.375in. */
const { chromium } = require('playwright');
const OUT = '/home/claude/pinklicious/pdf';
const URL = 'http://localhost:8899/index.html';
const W = 1440, H = 900;
const PAGE = `@page { size: ${W / 96}in ${H / 96}in; margin: 0; }`;

const PRINT_CSS = `
  ${PAGE}
  html, body { overflow: visible !important; width: ${W}px !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .grain, .nav, .msheet, .cart, .scrim, .toast, .club, .burger { display: none !important; }
  .rv { opacity: 1 !important; transform: none !important; }

  /* pin the desktop composition regardless of the print layout width */
  .hero { height: ${H}px !important; min-height: 0 !important; padding-top: 0 !important;
          break-after: page; }
  .hero__split { grid-template-columns: 1.08fr .92fr !important; grid-template-rows: auto !important; }
  .hero__drink { max-height: 440px !important; max-width: 74% !important; }
  .split { grid-template-columns: 1fr 1fr !important; min-height: 0 !important; }
  .split__img { aspect-ratio: auto !important; }
  .split--flip .split__img { grid-row: auto !important; }

  /* flex paginates far more predictably than grid in Chromium's print engine */
  .grid { display: flex !important; flex-wrap: wrap !important; }
  .grid > * { width: 33.3333% !important; }
  .sweetgrid, .shopgrid { display: flex !important; flex-wrap: wrap !important; }
  .sweetgrid > *, .shopgrid > * { width: 50% !important; }
  .steps { display: flex !important; flex-wrap: wrap !important; gap: 1.75rem !important; }
  .steps > * { width: calc(25% - 1.4rem) !important; }
  .steps--three > * { width: calc(33.3333% - 1.2rem) !important; }
  .visit__grid { display: flex !important; flex-wrap: wrap !important; gap: 2rem !important; }
  .visit__col { width: calc(25% - 1.5rem) !important; }

  /* keep whole components together across page breaks */
  .card, .sweetcard, .shopcard, .tile, .print, .step, .visit__col,
  .sec-head, .iginvite, .foot, .starcard, .earn, .rung { break-inside: avoid; }
  .earn { display: flex !important; }
  .earn > * { width: 33.3333% !important; }
  .stardemo, .demolabel { display: none !important; }
  .ladder { margin-top: 2.5rem !important; }
  .railseg i { transition: none !important; }
  .section { padding-top: 2.6rem !important; padding-bottom: 2.6rem !important; }

  /* size components so a heading plus a full row lands on one page,
     and so no card is ever taller than a page and gets sliced */
  .sec-head { break-after: avoid; margin-bottom: 1.6rem !important; }
  .card__media { aspect-ratio: 1 / .8 !important; padding: 6% 13% 3% !important; }
  .card__body { padding: 0 1rem 1rem !important; gap: .5rem !important; }
  .shopcard__stage { aspect-ratio: 1 / .48 !important; }
  .shopcard { padding: 1.75rem !important; gap: 1rem !important; }
  .sweetcard__stage { max-width: 270px !important; }
  .sweetcard { padding: 1.75rem !important; gap: .85rem !important; }
  .split__txt { padding: 3rem 3.5rem !important; }
  .marquee__track { transform: none !important; }
`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--disable-background-networking', '--no-first-run', '--disable-sync', '--font-render-hinting=none'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });

  const settle = async () => {
    await p.evaluate(() => {
      document.querySelectorAll('.rv').forEach(e => e.classList.add('is-in'));
      document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; i.setAttribute('decoding', 'sync'); });
    });
    await p.waitForTimeout(2500);
    await p.evaluate(() => Promise.all(Array.from(document.images).map(i => i.decode ? i.decode().catch(() => {}) : null)));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1200);
  };

  /* ---- 1. the site ---- */
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: PRINT_CSS });
  await settle();
  console.log('broken images:', await p.evaluate(() => Array.from(document.images).filter(i => !i.naturalWidth).length));
  await p.pdf({ path: OUT + '/1-site.pdf', printBackground: true, preferCSSPageSize: true });

  /* ---- 2. the Pink Club panel ---- */
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1200);
  await p.addStyleTag({ content: PRINT_CSS });
  await settle();
  await p.evaluate(() => document.getElementById('clubOpen').click());
  await p.waitForTimeout(700);
  await p.addStyleTag({ content: `
    ${PAGE}
    body > *:not(.club) { display: none !important; }
    .club { display: grid !important; grid-template-columns: .92fr 1.08fr !important;
            position: static !important; opacity: 1 !important; visibility: visible !important;
            transform: none !important; height: ${H}px !important; overflow: hidden !important; }
    .club__close { display: none !important; }
    .club__form { padding-top: clamp(2rem,5vw,4.5rem) !important; }
  ` });
  await p.waitForTimeout(600);
  await p.pdf({ path: OUT + '/2-club.pdf', printBackground: true, preferCSSPageSize: true });

  /* ---- 3. colophon ---- */
  await p.goto('http://localhost:8899/pdf/colophon.html', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.pdf({ path: OUT + '/3-colophon.pdf', printBackground: true, preferCSSPageSize: true });

  await b.close();
})();
