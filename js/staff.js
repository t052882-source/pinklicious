/* ==========================================================================
   PINKLICIOUS — the counter (staff screen)
   Reads the same database as the shop. Everything here is still behind row
   level security: if the signed-in person is not staff, these queries come
   back with their own row and nothing else, and the board stays hidden.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  var nfmt = function (n) { return Number(n || 0).toLocaleString('en-US'); };
  var kd   = function (n) {
    return Number(n || 0).toLocaleString('en-US',
      { minimumFractionDigits:3, maximumFractionDigits:3 }) + ' KD';
  };

  var TIER_NAME = { start:'Start', bronze:'Bronze', silver:'Silver',
                    gold:'Gold', platinum:'Platinum' };

  var toastEl = $('#toast'), toastMsg = $('#toastMsg'), toastTimer;
  function toast(msg) {
    toastMsg.textContent = msg;
    toastEl.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-up'); }, 2400);
  }

  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso), now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    try {
      return sameDay
        ? 'Today ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
        : d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }) + ' ' +
          d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    } catch (e) { return iso.slice(0, 16).replace('T', ' '); }
  }

  /* -------------------------------------------------------------- gate --- */
  var gateWrap = $('#gateWrap'), board = $('#board'), gateErr = $('#gateErr');

  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#st-email').value.trim(), pw = $('#st-pw').value;
    gateErr.textContent = '';
    if (!email || !pw) { gateErr.textContent = 'Both fields, please.'; return; }
    if (!PINK.ready) { gateErr.textContent = 'No connection to the database.'; return; }

    var btn = $('#gateForm button');
    btn.disabled = true; btn.textContent = 'Signing in…';
    PINK.signIn(email, pw).then(function (r) {
      btn.disabled = false; btn.textContent = 'Sign in';
      if (r.error) { gateErr.textContent = r.error; return; }
      $('#st-pw').value = '';
    });
  });

  $('#out').addEventListener('click', function () { PINK.signOut(); });
  $('#refresh').addEventListener('click', function () { load(true); });

  function showGate(message) {
    gateWrap.hidden = false;
    board.hidden = true;
    $('#out').hidden = !message;
    $('#whoami').textContent = '';
    gateErr.textContent = message || '';
  }

  /* ------------------------------------------------------------- board --- */
  function tiles(rows, orders) {
    var members = rows.length;
    var stars   = rows.reduce(function (n, r) { return n + (r.stars || 0); }, 0);
    var spent   = rows.reduce(function (n, r) { return n + Number(r.spent_kd || 0); }, 0);
    var free    = rows.reduce(function (n, r) { return n + Math.max(0, r.free_matchas_ready || 0); }, 0);
    var today   = orders.filter(function (o) {
      return new Date(o.placed_at).toDateString() === new Date().toDateString();
    });
    var todayKd = today.reduce(function (n, o) { return n + Number(o.total_kd || 0); }, 0);

    $('#tiles').innerHTML = [
      ['Members',            nfmt(members)],
      ['Orders today',       nfmt(today.length)],
      ['Taken today',        kd(todayKd)],
      ['Stars given out',    nfmt(stars)],
      ['Free matchas due',   nfmt(free)],
      ['Lifetime takings',   kd(spent)]
    ].map(function (t) {
      var money = / KD$/.test(t[1]) ? ' class="money"' : '';
      return '<div class="tile2"><b' + money + '>' + t[1] + '</b>' +
             '<span>' + t[0] + '</span></div>';
    }).join('');
  }

  function memberRows(rows) {
    var body = $('#memberRows');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8" class="empty">No members yet. ' +
        'The first person to join the Pink Club shows up here.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (r) {
      var free = Math.max(0, r.free_matchas_ready || 0);
      return '<tr>' +
        '<td class="who"><b>' + esc(r.name || 'Member') + '</b>' +
          '<span>' + esc(r.phone || '—') +
          (r.is_staff ? ' · <i class="stafftag">staff</i>' : '') + '</span></td>' +
        '<td><span class="pillmini tier--' + esc(r.tier) + '">' +
          esc(TIER_NAME[r.tier] || r.tier) + '</span></td>' +
        '<td class="num">' + nfmt(r.stars) + '</td>' +
        '<td>' + (free
            ? '<span class="freetag">✿ ' + free + ' free ' + (free > 1 ? 'matchas' : 'matcha') + '</span>'
            : '<span class="q">' + (r.stamps || 0) + '/8</span>') + '</td>' +
        '<td class="num">' + nfmt(r.order_count) + '</td>' +
        '<td class="num">' + kd(r.spent_kd) + '</td>' +
        '<td class="q">' + esc(when(r.last_order_at)) + '</td>' +
        '<td>' + (free
            ? '<button class="rbtn" data-redeem="' + esc(r.id) + '">Give free matcha</button>'
            : '') + '</td>' +
      '</tr>';
    }).join('');
  }

  function orderRows(orders) {
    var body = $('#orderRows');
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty">No orders yet.</td></tr>';
      return;
    }
    body.innerHTML = orders.map(function (o) {
      var what = (o.order_items || []).map(function (i) {
        return i.qty + ' × ' + i.item_name + (i.item_option ? ' (' + i.item_option + ')' : '');
      }).join(', ');
      return '<tr>' +
        '<td class="q">' + esc(when(o.placed_at)) + '</td>' +
        '<td>' + esc((o.members && o.members.name) || 'Member') + '</td>' +
        '<td class="q">' + esc(what || '—') + '</td>' +
        '<td class="num">' + nfmt(o.drink_count) + '</td>' +
        '<td class="num">' + kd(o.total_kd) + '</td>' +
      '</tr>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-redeem]');
    if (!b) return;
    b.disabled = true;
    PINK.redeemFree(b.dataset.redeem).then(function (r) {
      if (r.error) { toast(r.error); b.disabled = false; return; }
      toast('Free matcha handed over');
      load(true);
    });
  });

  /* --------------------------------------------------------------- load -- */
  var loading = false;

  function load(announce) {
    if (loading) return;
    loading = true;
    Promise.all([PINK.allMembers(), PINK.allOrders(40)]).then(function (r) {
      loading = false;
      var rows = r[0], orders = r[1];
      tiles(rows, orders);
      memberRows(rows);
      orderRows(orders);
      if (announce) toast('Refreshed');
    });
  }

  /* ------------------------------------------------------------ session -- */
  if (!PINK.ready) {
    showGate('The database is not reachable from this page.');
    return;
  }

  PINK.onAuth(function (user) {
    if (!user) { showGate(''); return; }

    /* Staff or not? The database decides — ask it about ourselves. */
    PINK.stats().then(function (me) {
      if (!me || !me.is_staff) {
        showGate('That account is a Pink Club member, not staff. ' +
                 'Ask the shop to add you to the counter.');
        return;
      }
      gateWrap.hidden = true;
      board.hidden = false;
      $('#out').hidden = false;
      $('#whoami').textContent = (me.name || user.email) + ' · staff';
      load(false);
    });
  });
})();
