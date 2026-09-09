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

## The Stars — the rewards programme

Section **No. 08** (`#stars`) is the star tracker. **One star for every
1.000 KD spent**, and the line at the top of the member card grows as the
balance does. Four tiers, each a segment of that line:

| Tier      | At          | Back in stars |
|-----------|-------------|---------------|
| Bronze    | 1 star      | 0.5%          |
| Silver    | 800 stars   | 1%            |
| Gold      | 3,500 stars | 2%            |
| Platinum  | 7,500 stars | 5%            |

Every eighth matcha is free at any tier — the pink pill in the card header
is that count (`3/8`, then `Free matcha ready`).

All of it lives in the **STARS** block near the bottom of `js/app.js`:

- `STAR_PER_KD` — stars earned per dinar.
- `TIERS` — the four tiers, their thresholds (`at`) and their reward lines.
  Edit this array and both the card and the ladder rebuild themselves.
- `DEMO_BALANCE` / `DEMO_STAMPS` — the example member's starting balance and
  matcha count, so the section has something to show on a first visit.

Anything added to the bag shows up instantly as *pending* stars; **Collect**
moves them into the balance, **Back to zero** empties the card so you can
watch the line fill from nothing. Below the first star the card sits at
**Start** — Bronze only begins at 1 star. Joining the Pink Club sets the card
to that member's name and starts them at zero. It is front-end only, held in
memory — to make it real, persist `starBalance` and `stampSeed` per member on
your own backend.

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
