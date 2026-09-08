/* ==========================================================================
   PINKLICIOUS — front-end behaviour
   Vanilla JS. No dependencies, no build step.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ------------------------------------------------------------------ DATA */
  var DRINK_PRICE = 3.8;
  var COOKIE_PRICE = 2.0;

  var MATCHA = [
    { id:'matcha-latte', name:'Matcha Latte', img:'img/matcha-latte.webp', tag:'classic',
      badge:'House', note:'The one to judge us on. Two grams of Uji, cold milk, nothing hiding it.', temps:['iced','hot'] },
    { id:'daydream-matcha', name:'Daydream Matcha', img:'img/daydream-matcha.webp', tag:'classic',
      badge:'Bestseller', note:'Vanilla cream, a little salt, extra foam. Tastes like the good kind of afternoon.', temps:['iced','hot'] },
    { id:'strawberry-shortcake-matcha', name:'Strawberry Shortcake Matcha', img:'img/strawberry-shortcake-matcha.webp', tag:'fruity',
      badge:'Pinkest', pink:true, note:'Crushed strawberry, shortcake crumb, matcha poured over the top.', temps:['iced'] },
    { id:'blueberry-matcha', name:'Blueberry Matcha', img:'img/blueberry-matcha.webp', tag:'fruity',
      badge:'Purple hour', note:'Wild blueberry compote at the bottom, green on top. Made for the photo.', temps:['iced'] },
    { id:'white-chocolate-matcha', name:'White Chocolate Matcha', img:'img/white-chocolate-matcha.webp', tag:'sweet',
      badge:'Sweet tooth', note:'Melted white chocolate stirred through the milk before the matcha lands.', temps:['iced','hot'] },
    { id:'cinnamon-bun-matcha', name:'Cinnamon Bun Matcha', img:'img/cinnamon-bun-matcha.webp', tag:'spiced',
      badge:'Winter', note:'Cinnamon sugar, brown butter syrup and a dusted rim.', temps:['iced','hot'] },
    { id:'harvest-chai-matcha', name:'Harvest Chai Matcha', img:'img/harvest-chai-matcha.webp', tag:'spiced',
      badge:'Spiced', note:'House chai concentrate under the matcha — cardamom, clove, black pepper.', temps:['iced','hot'] },
    { id:'shaken-vanilla-bean-matcha', name:'Shaken Vanilla Bean Matcha', img:'img/shaken-vanilla-bean-matcha.webp', tag:'classic',
      badge:'Shaken', note:'Hand-shaken with real vanilla bean seeds until the top goes velvet.', temps:['iced'] },
    { id:'blondie-matcha', name:'Blondie Matcha', img:'img/blondie-matcha.webp', tag:'sweet',
      badge:'Dessert', note:'Salted blondie syrup striped down the cup, matcha floated on milk.', temps:['iced','hot'] }
  ];

  var COFFEE = [
    { id:'daydream-latte', name:'Daydream Latte', img:'img/daydream-latte.webp', tag:'classic',
      badge:'Bestseller', note:'Our Daydream syrup on a double shot. Small cup, big opinion.', temps:['iced','hot'] },
    { id:'cinnamon-bun-latte', name:'Cinnamon Bun Latte', img:'img/cinnamon-bun-latte.webp', tag:'spiced',
      badge:'Winter', note:'Brown butter, cinnamon sugar, espresso poured last.', temps:['iced','hot'] },
    { id:'harvest-chai-latte', name:'Harvest Chai Latte', img:'img/harvest-chai-latte.webp', tag:'spiced',
      badge:'Spiced', note:'House chai, steamed milk, a shot on top if you ask for dirty.', temps:['iced','hot'] },
    { id:'blondie-latte', name:'Blondie Latte', img:'img/blondie-latte.webp', tag:'sweet',
      badge:'Dessert', note:'Salted blondie syrup, milk, espresso. Basically pudding you can carry.', temps:['iced','hot'] },
    { id:'shaken-vanilla-cold-brew', name:'Shaken Vanilla Bean Cold Brew', img:'img/shaken-vanilla-cold-brew.webp', tag:'classic',
      badge:'Shaken', note:'Twenty-hour cold brew shaken with vanilla bean and a splash of cream.', temps:['iced'] }
  ];

  var SWEETS = [
    { id:'cookie-choco-coco', name:'Choco Coco', img:'img/cookie-choco-coco.webp',
      note:'Deep cocoa dough under a poured dark chocolate glaze, scattered with brownie rubble and flaky salt.' },
    { id:'cookie-choc-chip', name:'Chocolate Chip Cookie', img:'img/cookie-chocolate-chip.webp',
      note:'Brown-butter dough packed with chocolate chunks and chips. Pulled out of the oven while the middle is still molten.' }
  ];

  var SHOP = {
    grippy:{ id:'grippy', name:'My Grippy Matcha', price:8.0, img:'img/grippy-matcha.webp' },
    tin:{ id:'tin', name:'Ceremonial Matcha Tin 30g', price:5.0, img:null, mini:'P' }
  };

  /* ------------------------------------------------------------- HELPERS */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var kd = function (n) { return n.toFixed(3) + ' KD'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };

  /* --------------------------------------------------------- DRINK CARDS */
  function drinkCard(d) {
    var iced = d.temps.indexOf('iced') > -1;
    var hot  = d.temps.indexOf('hot') > -1;
    var first = iced ? 'iced' : 'hot';
    return '' +
    '<article class="card" data-tag="' + d.tag + '" data-id="' + d.id + '" data-temp="' + first + '">' +
      '<div class="card__media">' +
        '<span class="card__wm">' + esc(d.name.split(' ')[0]) + '</span>' +
        '<span class="card__badge' + (d.pink ? ' card__badge--pink' : '') + '">' + esc(d.badge) + '</span>' +
        '<img src="' + d.img + '" alt="' + esc(d.name) + ' in a tall glass" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="card__body">' +
        '<h3 class="card__name">' + esc(d.name) + '</h3>' +
        '<p class="card__note">' + esc(d.note) + '</p>' +
        '<div class="card__row">' +
          '<p class="price">' + DRINK_PRICE.toFixed(3) + '<small>KD</small></p>' +
          '<div class="toggle" role="group" aria-label="Serve temperature">' +
            '<button type="button" data-temp="iced"' + (first === 'iced' ? ' class="is-on"' : '') +
              (iced ? '' : ' disabled') + '>Iced</button>' +
            '<button type="button" data-temp="hot"' + (first === 'hot' ? ' class="is-on"' : '') +
              (hot ? '' : ' disabled') + '>Hot</button>' +
          '</div>' +
        '</div>' +
        '<button class="add" type="button" data-add-drink="' + d.id + '">Add to bag</button>' +
      '</div>' +
    '</article>';
  }

  function sweetCard(s) {
    var stage = s.img
      ? '<img src="' + s.img + '" alt="' + esc(s.name) + '" loading="lazy" decoding="async">'
      : '<span class="ph">' + esc(s.name.split(' ')[0]) + '<small>photo coming</small></span>';
    return '' +
    '<article class="sweetcard" data-id="' + s.id + '">' +
      '<div class="sweetcard__stage">' + stage + '</div>' +
      '<h3 class="sweetcard__name">' + esc(s.name) + '</h3>' +
      '<p class="card__note">' + esc(s.note) + '</p>' +
      '<div class="card__row">' +
        '<p class="price">' + COOKIE_PRICE.toFixed(3) + '<small>KD</small></p>' +
        '<span class="kicker">Baked all day</span>' +
      '</div>' +
      '<button class="add" type="button" data-add-sweet="' + s.id + '">Add to bag</button>' +
    '</article>';
  }

  /* an editorial tile so an odd row never ends in an empty cell */
  var MILK_TILE = '' +
    '<div class="tile">' +
      '<p class="tile__script">The milk bar</p>' +
      '<p>Every swap is included in the 3.800 KD — no upcharge, no asterisk. Tell us the number of pumps and we will pour it exactly there.</p>' +
      '<ul>' +
        '<li><span>Whole</span><span>House</span></li>' +
        '<li><span>Oat</span><span>Free</span></li>' +
        '<li><span>Almond</span><span>Free</span></li>' +
        '<li><span>Pistachio</span><span>Free</span></li>' +
        '<li><span>Sweetness</span><span>0 — 3 pumps</span></li>' +
      '</ul>' +
    '</div>';

  var matchaGrid = $('#matchaGrid'), coffeeGrid = $('#coffeeGrid'), sweetGrid = $('#sweetGrid');
  if (matchaGrid) matchaGrid.innerHTML = MATCHA.map(drinkCard).join('');
  if (coffeeGrid) coffeeGrid.innerHTML = COFFEE.map(drinkCard).join('') + MILK_TILE;
  if (sweetGrid)  sweetGrid.innerHTML  = SWEETS.map(sweetCard).join('');

  /* --------------------------------------------------------- TEMP TOGGLE */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.toggle button');
    if (!btn || btn.disabled) return;
    var card = btn.closest('.card');
    $$('.toggle button', card).forEach(function (b) { b.classList.remove('is-on'); });
    btn.classList.add('is-on');
    card.dataset.temp = btn.dataset.temp;
  });

  /* -------------------------------------------------------------- FILTER */
  var filters = $('#matchaFilters');
  if (filters) {
    filters.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', filters).forEach(function (c) { c.classList.remove('is-on'); });
      chip.classList.add('is-on');
      var f = chip.dataset.filter;
      $$('.card', matchaGrid).forEach(function (card) {
        card.classList.toggle('is-hidden', f !== 'all' && card.dataset.tag !== f);
      });
    });
  }

  /* ---------------------------------------------------------------- CART */
  var bag = [];  /* in-memory only */

  function findLine(key) {
    for (var i = 0; i < bag.length; i++) if (bag[i].key === key) return bag[i];
    return null;
  }

  function addLine(item) {
    var line = findLine(item.key);
    if (line) { line.qty += 1; }
    else { item.qty = 1; bag.push(item); }
    renderCart();
    popCart();
  }

  function renderCart() {
    var body = $('#cartBody');
    var count = bag.reduce(function (n, l) { return n + l.qty; }, 0);
    var total = bag.reduce(function (n, l) { return n + l.qty * l.price; }, 0);

    $('#cartCount').textContent = count;
    $('#cartItems').textContent = count;
    $('#cartTotal').textContent = kd(total);

    if (!bag.length) {
      body.innerHTML = '<div class="cart__empty"><p class="script">Nothing yet</p>' +
        '<p>Your bag is waiting on a matcha.</p></div>';
      return;
    }

    body.innerHTML = bag.map(function (l) {
      var thumb = l.img
        ? '<img src="' + l.img + '" alt="">'
        : '<span class="mini">' + esc(l.mini || '✿') + '</span>';
      return '' +
      '<div class="li">' +
        '<div class="li__thumb">' + thumb + '</div>' +
        '<div>' +
          '<p class="li__name">' + esc(l.name) + '</p>' +
          (l.opt ? '<p class="li__opt">' + esc(l.opt) + '</p>' : '') +
          '<p class="li__price">' + kd(l.price * l.qty) + '</p>' +
        '</div>' +
        '<div class="qty">' +
          '<button type="button" data-dec="' + l.key + '" aria-label="One less">−</button>' +
          '<span>' + l.qty + '</span>' +
          '<button type="button" data-inc="' + l.key + '" aria-label="One more">+</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) { var a = findLine(inc.dataset.inc); if (a) { a.qty++; renderCart(); } return; }
    if (dec) {
      var b = findLine(dec.dataset.dec);
      if (b) { b.qty--; if (b.qty < 1) bag.splice(bag.indexOf(b), 1); renderCart(); }
    }
  });

  /* -------------------------------------------------------- ADD BUTTONS */
  function flash(btn, label) {
    var old = btn.textContent;
    btn.textContent = label;
    btn.classList.add('is-done');
    setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1400);
  }

  document.addEventListener('click', function (e) {
    var b;

    if ((b = e.target.closest('[data-add-drink]'))) {
      var id = b.dataset.addDrink;
      var d = MATCHA.concat(COFFEE).filter(function (x) { return x.id === id; })[0];
      var temp = b.closest('.card').dataset.temp;
      addLine({ key:id + '|' + temp, name:d.name, opt:temp === 'hot' ? 'Hot' : 'Iced',
                price:DRINK_PRICE, img:d.img });
      toast(d.name + ' added');
      flash(b, 'In your bag ✿');
      return;
    }

    if ((b = e.target.closest('[data-add-sweet]'))) {
      var s = SWEETS.filter(function (x) { return x.id === b.dataset.addSweet; })[0];
      addLine({ key:s.id, name:s.name, opt:'Warm', price:COOKIE_PRICE, img:s.img, mini:'✿' });
      toast(s.name + ' added');
      flash(b, 'In your bag ✿');
      return;
    }

    if ((b = e.target.closest('[data-add]'))) {
      var p = SHOP[b.dataset.add];
      addLine({ key:p.id, name:p.name, price:p.price, img:p.img, mini:p.mini });
      toast(p.name + ' added');
      flash(b, 'In your bag ✿');
    }
  });

  /* ------------------------------------------------------- CART DRAWER */
  var cart = $('#cart'), scrim = $('#scrim'), cartBtn = $('#cartOpen');

  function openCart() {
    cart.classList.add('is-open'); scrim.classList.add('is-open');
    cart.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    cart.classList.remove('is-open'); scrim.classList.remove('is-open');
    cart.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function popCart() {
    cartBtn.classList.remove('is-pop');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('is-pop');
  }

  cartBtn.addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });

  /* Build a readable order and hand it to Instagram DMs */
  $('#checkout').addEventListener('click', function () {
    if (!bag.length) return;
    var lines = bag.map(function (l) {
      return l.qty + ' × ' + l.name + (l.opt ? ' (' + l.opt + ')' : '');
    }).join('\n');
    var total = bag.reduce(function (n, l) { return n + l.qty * l.price; }, 0);
    try { navigator.clipboard.writeText('Pinklicious order\n' + lines + '\nTotal ' + kd(total)); } catch (err) {}
    toast('Order copied — paste it in our DMs');
  });

  /* --------------------------------------------------------------- TOAST */
  var toastEl = $('#toast'), toastMsg = $('#toastMsg'), toastTimer;
  function toast(msg) {
    toastMsg.textContent = msg;
    toastEl.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-up'); }, 2300);
  }

  /* ------------------------------------------------------------ MARQUEES */
  function marquee(el, items) {
    if (!el) return;
    var run = items.map(function (t) {
      return t.charAt(0) === '~'
        ? '<span><b>' + t.slice(1) + '</b><i>✿</i></span>'
        : '<span>' + t + '<i>✿</i></span>';
    }).join('');
    el.innerHTML = run + run;
  }
  marquee($('#mq1'), ['~Pinklicious', 'Ceremonial grade Uji matcha', 'Whisked to order',
                      'Every drink 3.800 KD', '~Drink it pink', 'Warm cookies 2.000 KD',
                      'Salmiya, Kuwait', '@pinklicious']);
  marquee($('#mq2'), ['~Take it home', 'Matcha tin 30g — 5.000 KD', 'My Grippy Matcha — 8.000 KD',
                      '~Pinklicious', 'Free milk swaps', 'Sweetness 0 to 3', '@pinklicious']);

  /* ------------------------------------------------------------ NAV / UI */
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  var burger = $('#burger');
  burger.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('#msheet a').forEach(function (a) {
    a.addEventListener('click', function () {
      document.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ------------------------------------------------------------- REVEAL */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.06 });
    $$('.rv').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('is-in'); });
  }


  /* ------------------------------------------------------------ PINK CLUB */
  var club = $('#club');
  var forms = { login:$('#loginForm'), join:$('#joinForm') };
  var COPY = {
    login:{ title:'Welcome back', blurb:'Log in to see your matcha count and your saved order.' },
    join: { title:'Join the club', blurb:'Free to join, and your eighth matcha is on us. We only ever text about drinks.' }
  };
  var lastFocus = null;

  function showTab(name) {
    $$('.tabs button', club).forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    forms.login.hidden = name !== 'login';
    forms.join.hidden  = name !== 'join';
    $('#clubTitle').textContent = COPY[name].title;
    $('#clubBlurb').textContent = COPY[name].blurb;
    var first = $('input', forms[name]);
    if (first) first.focus();
  }

  function openClub(tab) {
    lastFocus = document.activeElement;
    closeCart();
    club.dataset.done = '';
    $('#clubDone').classList.remove('is-on');
    club.classList.add('is-open');
    club.setAttribute('aria-hidden', 'false');
    document.body.classList.add('club-open');
    showTab(tab || 'login');
  }
  function closeClub() {
    club.classList.remove('is-open');
    club.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('club-open');
    if (lastFocus) lastFocus.focus();
  }

  ['#clubOpen', '#clubOpenM', '#clubOpenF'].forEach(function (sel) {
    var el = $(sel);
    if (el) el.addEventListener('click', function (e) { e.preventDefault(); openClub('login'); });
  });
  $('#clubClose').addEventListener('click', closeClub);
  $('#clubDoneClose').addEventListener('click', closeClub);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && club.classList.contains('is-open')) closeClub();
  });
  club.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'), g = e.target.closest('[data-goto]');
    if (t) showTab(t.dataset.tab);
    if (g) showTab(g.dataset.goto);
    var peek = e.target.closest('[data-peek]');
    if (peek) {
      var inp = document.getElementById(peek.dataset.peek);
      var hidden = inp.type === 'password';
      inp.type = hidden ? 'text' : 'password';
      peek.textContent = hidden ? 'Hide' : 'Show';
    }
  });

  /* -------- validation -------- */
  function fail(id, msg) {
    var inp = document.getElementById(id);
    inp.closest('.fld').classList.add('is-bad');
    $('[data-err="' + id + '"]', club).textContent = msg;
    return false;
  }
  function pass(id) {
    var inp = document.getElementById(id);
    inp.closest('.fld').classList.remove('is-bad');
    $('[data-err="' + id + '"]', club).textContent = '';
    return true;
  }
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v); };
  var digits  = function (v) { return (v.match(/\d/g) || []).length; };

  club.addEventListener('input', function (e) {
    var f = e.target.closest('.fld');
    if (f && f.classList.contains('is-bad')) pass(e.target.id);
  });

  function done(title, msg) {
    club.dataset.done = '1';
    $('#clubDoneTitle').textContent = title;
    $('#clubDoneMsg').textContent = msg;
    $('#clubDone').classList.add('is-on');
    $('#clubDoneClose').focus();
  }

  forms.login.addEventListener('submit', function (e) {
    e.preventDefault();
    var who = $('#li-email').value.trim(), pw = $('#li-pw').value;
    var ok = true;
    if (!who) ok = fail('li-email', 'Add your email or phone number.');
    else if (!isEmail(who) && digits(who) < 8) ok = fail('li-email', 'That does not look like an email or a phone number.');
    else pass('li-email');
    if (pw.length < 6) ok = fail('li-pw', 'Passwords are at least 6 characters.');
    else pass('li-pw');
    if (!ok) return;
    done('Welcome back.', 'Signed in as ' + who + '. Your matcha count and your saved order are waiting at the till — just give us the name.');
    toast('Logged in to the Pink Club');
  });

  forms.join.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#jn-name').value.trim(), phone = $('#jn-phone').value.trim();
    var mail = $('#jn-email').value.trim(), pw = $('#jn-pw').value, pw2 = $('#jn-pw2').value;
    var ok = true;
    if (name.length < 2) ok = fail('jn-name', 'What should we call you?'); else pass('jn-name');
    if (digits(phone) < 8) ok = fail('jn-phone', 'Eight digits or more, please.'); else pass('jn-phone');
    if (!isEmail(mail)) ok = fail('jn-email', 'Check the email address.'); else pass('jn-email');
    if (pw.length < 8) ok = fail('jn-pw', 'Make it 8 characters or more.'); else pass('jn-pw');
    if (pw2 !== pw || !pw2) ok = fail('jn-pw2', 'The two passwords do not match.'); else pass('jn-pw2');
    if (!ok) return;
    done("You're in, " + name + '.',
         'Your Pink Club card is live. Give ' + phone + ' at the till and we will start counting — the eighth matcha is on us, and there is a cookie waiting on your birthday.');
    toast('Welcome to the Pink Club');
  });

  renderCart();
})();
