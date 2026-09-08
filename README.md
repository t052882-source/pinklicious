# Pinklicious — Matcha & Green Tea House

Front-end project website for Pinklicious, a matcha and green tea coffee shop in Kuwait.
Hand-built HTML, CSS and vanilla JavaScript — no framework, no build step.

## Run it

Open `index.html` in a browser. That's it.
(If you want a local server: `python3 -m http.server` then visit http://localhost:8000)

## Files

    index.html            all markup
    css/style.css         design system + every component
    js/app.js             menu data, filters, iced/hot toggles, order bag
    fonts/                Pinyon Script, Italianno, Anton, Archivo Black, Inter (self-hosted)
    img/                  drink cut-outs, cookies, editorial photos
    cookies_real.py       cuts the cookie photos out of their white studio background
    build_single.py       inlines everything into one shareable HTML file

## Prices

| Item                    | Price    |
|-------------------------|----------|
| Any matcha or coffee    | 3.800 KD |
| Choco Coco              | 2.000 KD |
| Chocolate Chip Cookie   | 2.000 KD |
| Ceremonial matcha tin   | 5.000 KD |
| My Grippy Matcha        | 8.000 KD |

## Pink Club

The **Pink Club** button in the header opens a full-screen log in / sign up
panel (`#club` in the markup). Two tabs, show/hide password, inline
validation, and a success state. It is front-end only — nothing is sent
anywhere, and the panel says so. To make it real you would post
`loginForm` / `joinForm` to your own endpoint in `js/app.js`.

## Editing the menu

Everything on the menu lives in the arrays at the top of `js/app.js` —
`MATCHA`, `COFFEE`, `SWEETS` and `SHOP`. Change a name, note, price or
image path there and the page rebuilds itself on reload.

To swap in a new photo: drop it in `img/` and point the matching
`img:` value at the new filename.

Cookies on the menu: **Choco Coco** and **Chocolate Chip Cookie**, both 2.000 KD.

## Design notes

- Display script: Pinyon Script. Giant translucent watermarks: Italianno.
- The matcha tin is drawn as inline SVG, so it stays sharp at any size
  and its colours come from the same palette as the rest of the site.
- Film grain is an SVG turbulence filter over the whole page.
- The two editorial photos hang as tilted framed prints on the coloured
  bands, so landscape crops sit properly instead of being cropped to fit.
- Single visual theme by design (the brand is pink), all colours painted
  explicitly so it holds on any host background.

Instagram: @pinklicious
