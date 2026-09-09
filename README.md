# Pinklicious — Matcha & Green Tea House

Project website for Pinklicious, a matcha and green tea coffee shop in Kuwait.
Hand-built HTML, CSS and vanilla JavaScript — no framework, no build step — on top
of a real **Supabase** backend: accounts, orders and the star rewards programme
all live in Postgres.

## Run it

Open `index.html` in a browser. That's it — it talks to the live Supabase
project, so the Pink Club and the stars work from a local file too.
(For a local server: `python3 -m http.server` then visit http://localhost:8000)

## Files

    index.html            the shop
    staff.html            the counter — staff view of members and orders
    css/style.css         design system + every component
    js/app.js             menu data, filters, iced/hot toggles, order bag, the stars
    js/db.js              every call to Supabase lives here
    js/staff.js           the counter screen
    js/supabase.js        supabase-js, self-hosted like the fonts
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

## Pink Club — real accounts

The **Pink Club** button in the header opens a full-screen log in / sign up
panel (`#club` in the markup), and it is wired to **Supabase Auth**. Signing up
creates a real account; a `members` row is created for it by a database trigger,
and the session is restored on every visit, on any device. The header button
turns into your star count once you are in.

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

Below the first star the card sits at **Start** — Bronze begins at 1 star.
Every eighth matcha is free at any tier; the pink pill in the card header is
that count (`3/8`, then `Free matcha ready`), and staff tick it off from the
counter screen.

**Stars are never added by hand.** There is no button for it anywhere. Put
things in the bag, press **Place the order**, and the database prices the order,
writes it, and appends the stars — in one transaction. The bag shows what an
order is worth before you place it, and the card lists the last few entries in
the ledger so you can see where the balance came from.

## The backend (Supabase)

Everything is in `schema.sql`, which is the same SQL that was applied
to the live project — run it on a fresh project and you have this backend.

    products        the menu, and the only place a price is true
    members         one row per account (name, phone, staff flag, drink count)
    orders          one row per order, with the total worked out server-side
    order_items     the lines of an order, priced from products
    star_ledger     append-only. A balance is sum(stars)
    member_stats    the view the member card and the counter both read
    staff_invites   emails allowed onto the counter, set before they sign up

Two functions do the work:

- **`place_order(items)`** — the only way an order is ever created. The browser
  sends product ids and quantities; prices come from `products`, the total is
  worked out in the database, and the stars are written in the same transaction.
  Nothing typed in a browser console can change how many stars you get.
- **`redeem_free_matcha(member)`** — staff only, ticks off one free matcha.

**Row level security** is on for every table, default deny:

- A member reads their own row, their own orders, their own ledger. Nothing else.
- `insert`, `update` and `delete` are revoked outright on `orders`,
  `order_items`, `star_ledger` and `products`.
- On `members`, a member may update `name` and `phone` and nothing else — the
  staff flag and the drink count are column-level revoked, so you cannot promote
  yourself or hand yourself free matchas.
- Signed out, you can read the menu and nothing more.

These were all checked by trying them, not assumed. Faking a price in the
`place_order` payload is ignored; the order is still priced from `products`.

## The counter (`staff.html`)

Staff sign in with the same form and get a board: members with their stars,
tier, matcha card and lifetime spend, the day's takings, and the recent orders
with their lines. A **Give free matcha** button appears next to anyone with one
waiting. A member who is not staff sees a polite refusal — and because the rules
live in the database, not in the page, they could not read the data even if they
edited the JavaScript.

Staff access is granted by putting the email in `staff_invites` **before** that
person signs up. `retajmtalkandie@gmail.com` and `t052882@coded.edu.kw` are on it.

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
