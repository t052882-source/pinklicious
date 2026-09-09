/* ==========================================================================
   PINKLICIOUS — Supabase layer
   Everything that talks to the database lives here, so app.js stays about
   the page. Exposes one global: window.PINK.

   The two values below are meant to be public — the publishable key only
   ever gets you the permissions that row level security allows, which is
   "read the menu, and read your own rows". Prices, totals and stars are all
   worked out inside the database by place_order(), so nothing typed in a
   browser console can mint a star.
   ========================================================================== */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://xswxysomdpngfbyqonda.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_MmmJdyZuuez-vxzNYAGu7A_2jj8f_b-';

  var lib = window.supabase;                 /* the CDN script, if it loaded */
  var db  = lib && lib.createClient
    ? lib.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    : null;

  /* Turn a Postgres/PostgREST error into something a person can read. */
  function human(err) {
    if (!err) return 'Something went wrong.';
    var m = err.message || String(err);
    if (/Invalid login credentials/i.test(m))      return 'That email and password do not match.';
    if (/User already registered/i.test(m))        return 'That email is already in the club — log in instead.';
    if (/Password should be at least/i.test(m))    return 'Make the password 8 characters or more.';
    if (/Email not confirmed/i.test(m))           return 'Check your email and confirm the address first.';
    if (/rate limit|too many/i.test(m))           return 'Too many tries. Give it a minute.';
    if (/Failed to fetch|NetworkError/i.test(m))  return 'No connection to the club right now.';
    return m.replace(/^.*?:\s*/, '');
  }

  var PINK = {
    ready: !!db,
    online: null,          /* null until the first call answers */
    db: db,

    /* Can we actually reach the database from wherever this page is being
       viewed? Sandboxed previews block outside requests, so ask once and
       let the page say so plainly instead of failing on every click. */
    check: function () {
      if (!db) { PINK.online = false; return Promise.resolve(false); }
      return db.from('products').select('id').limit(1).then(function (r) {
        PINK.online = !r.error;
        return PINK.online;
      }, function () { PINK.online = false; return false; });
    },

    /* The menu with its authoritative prices, straight from the database. */
    menu: function () {
      if (!db) return Promise.resolve([]);
      return db.from('products').select('id, name, category, price_kd, is_drink')
        .then(function (r) { return r.error ? [] : r.data; });
    },

    /* ---------------------------------------------------------- auth ---- */
    /* Returns { user } or { error } with a readable message. */
    signUp: function (name, phone, email, password) {
      if (!db) return Promise.resolve({ error: 'offline' });
      return db.auth.signUp({
        email: email,
        password: password,
        options: { data: { name: name, phone: phone } }
      }).then(function (r) {
        if (r.error) return { error: human(r.error) };
        /* No session means the project asks for email confirmation. */
        return { user: r.data.user, needsEmail: !r.data.session };
      });
    },

    signIn: function (email, password) {
      if (!db) return Promise.resolve({ error: 'offline' });
      return db.auth.signInWithPassword({ email: email, password: password })
        .then(function (r) {
          return r.error ? { error: human(r.error) } : { user: r.data.user };
        });
    },

    signOut: function () {
      return db ? db.auth.signOut() : Promise.resolve();
    },

    /* Fires once on load with the restored session, then on every change. */
    onAuth: function (cb) {
      if (!db) { cb(null); return; }
      db.auth.getSession().then(function (r) {
        cb(r.data.session ? r.data.session.user : null);
        db.auth.onAuthStateChange(function (_evt, session) {
          cb(session ? session.user : null);
        });
      });
    },

    /* ------------------------------------------------- the member card --- */
    /* One row: stars, tier, stamps, free matchas ready, lifetime spend. */
    stats: function () {
      if (!db) return Promise.resolve(null);
      return db.from('member_stats').select('*').maybeSingle()
        .then(function (r) { return r.error ? null : r.data; });
    },

    /* The star ledger, newest first — how the balance was actually earned. */
    history: function (limit) {
      if (!db) return Promise.resolve([]);
      return db.from('star_ledger')
        .select('stars, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(limit || 6)
        .then(function (r) { return r.error ? [] : r.data; });
    },

    /* --------------------------------------------------------- orders --- */
    /* items: [{ product_id, qty, option }]. The database prices it. */
    placeOrder: function (items) {
      if (!db) return Promise.resolve({ error: 'offline' });
      return db.rpc('place_order', { items: items }).then(function (r) {
        return r.error ? { error: human(r.error) } : { result: r.data };
      });
    },

    orders: function (limit) {
      if (!db) return Promise.resolve([]);
      return db.from('orders')
        .select('id, total_kd, drink_count, placed_at, order_items(item_name, item_option, qty, unit_price_kd)')
        .order('placed_at', { ascending: false })
        .limit(limit || 10)
        .then(function (r) { return r.error ? [] : r.data; });
    },

    /* ---------------------------------------------------------- staff --- */
    allMembers: function () {
      if (!db) return Promise.resolve([]);
      return db.from('member_stats')
        .select('id, name, phone, stars, tier, stamps, free_matchas_ready, order_count, spent_kd, last_order_at, joined_at, is_staff')
        .order('stars', { ascending: false })
        .then(function (r) { return r.error ? [] : r.data; });
    },

    allOrders: function (limit) {
      if (!db) return Promise.resolve([]);
      return db.from('orders')
        .select('id, member_id, total_kd, drink_count, placed_at, members(name), order_items(item_name, item_option, qty)')
        .order('placed_at', { ascending: false })
        .limit(limit || 40)
        .then(function (r) { return r.error ? [] : r.data; });
    },

    redeemFree: function (memberId) {
      if (!db) return Promise.resolve({ error: 'offline' });
      return db.rpc('redeem_free_matcha', { member: memberId }).then(function (r) {
        return r.error ? { error: human(r.error) } : { result: r.data };
      });
    },

    human: human
  };

  window.PINK = PINK;
})();
