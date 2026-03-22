// ── APP.JS ──

window.currentUser = null;
const users = JSON.parse(localStorage.getItem('void_users') || '{}');

// ── PROXY URL — swap this out any time ──
const PROXY_BASE = 'https://8021688600113732413547102395624276084104729385610293875616.estoniaeducation.info/';

document.addEventListener('DOMContentLoaded', () => {
  buildMovieCards();
  buildUGSGames();
  buildProxyHints();
  ensureOverlay();
  renderMessages();
  bindNav();
  bindAuth();
  bindProxy();
  bindChat();
  bindBlank();
  bindSearch();
  restoreSession();
});

// ════════════════════════════════
// OVERLAY (shared for games + movies)
// ════════════════════════════════
function ensureOverlay() {
  if (document.getElementById('voidOverlay')) return;

  const el = document.createElement('div');
  el.id = 'voidOverlay';
  el.innerHTML = `
    <div class="vo-box">
      <div class="vo-bar">
        <span class="vo-title" id="voTitle">Loading...</span>
        <div class="vo-actions">
          <button class="vo-btn" id="voFullscreen" title="Fullscreen">⛶</button>
          <button class="vo-btn vo-close" id="voClose">✕</button>
        </div>
      </div>
      <div class="vo-body">
        <div class="vo-loading" id="voLoading">
          <div class="vo-spinner"></div>
          <div class="vo-loading-text">Loading...</div>
        </div>
        <div class="vo-error" id="voError" style="display:none">
          <div class="vo-error-icon">⚠</div>
          <div class="vo-error-text">This game couldn't be loaded.<br>It may not exist on the server.</div>
          <button class="vo-btn-retry" onclick="closeOverlay()">Close</button>
        </div>
        <iframe id="voFrame" class="vo-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock" allowfullscreen></iframe>
      </div>
    </div>`;
  document.body.appendChild(el);

  document.getElementById('voClose').addEventListener('click', closeOverlay);
  document.getElementById('voFullscreen').addEventListener('click', () => {
    const frame = document.getElementById('voFrame');
    if (frame.requestFullscreen) frame.requestFullscreen();
  });
  el.addEventListener('click', e => { if (e.target === el) closeOverlay(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });
}

function openOverlay(title, src) {
  const overlay  = document.getElementById('voidOverlay');
  const frame    = document.getElementById('voFrame');
  const loading  = document.getElementById('voLoading');
  const errorDiv = document.getElementById('voError');
  const titleEl  = document.getElementById('voTitle');

  titleEl.textContent = title;
  frame.src = '';
  loading.style.display = 'flex';
  errorDiv.style.display = 'none';
  frame.style.display = 'none';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  frame.onload = () => {
    loading.style.display = 'none';
    frame.style.display = 'block';
  };
  frame.onerror = () => {
    loading.style.display = 'none';
    errorDiv.style.display = 'flex';
  };

  frame.src = src;
}

function closeOverlay() {
  const overlay = document.getElementById('voidOverlay');
  overlay.classList.remove('open');
  document.getElementById('voFrame').src = '';
  document.body.style.overflow = '';
}

// ════════════════════════════════
// MOVIES & TV
// ════════════════════════════════
function buildMovieCards() {
  renderCardGrid('moviesGrid', movies);
  renderCardGrid('tvGrid', tvShows);
}

function renderCardGrid(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = data.map(item => {
    const safe = item.title.replace(/'/g, "\\'");
    const tags = item.genre.map(g => `<span class="tag">${g}</span>`).join('');
    return `
      <div class="card" onclick="openMedia('${safe}','${item.tmdb}','${item.type}')">
        <div class="card-thumb">
          <img src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.style.opacity='0'">
          <div class="card-thumb-overlay"><span class="play-btn">▶ WATCH</span></div>
        </div>
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-meta">${item.year}</div>
          <div class="card-tags">${tags}</div>
        </div>
      </div>`;
  }).join('');
}

function openMedia(title, tmdb, type) {
  const src = type === 'tv'
    ? `https://vidsrc.cc/v2/embed/tv/${tmdb}`
    : `https://vidsrc.cc/v2/embed/movie/${tmdb}`;
  openOverlay(title, src);
}

// ════════════════════════════════
// UGS GAMES
// ════════════════════════════════
// Track which files are known-bad so we hide them after one failure
const badGames = new Set(JSON.parse(localStorage.getItem('void_bad_games') || '[]'));

function buildUGSGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  const goodFiles = ugsFiles.filter(f => !badGames.has(f));

  // A–Z filter bar
  const letters = [...new Set(
    goodFiles.map(f => ugsDisplayName(f)[0].toUpperCase()).filter(c => /[A-Z0-9]/.test(c))
  )].sort();

  const filterBar = document.createElement('div');
  filterBar.className = 'games-filter-bar';
  filterBar.innerHTML =
    `<span class="filter-btn active" data-letter="ALL">ALL</span>` +
    letters.map(l => `<span class="filter-btn" data-letter="${l}">${l}</span>`).join('');

  const gameSearch = document.createElement('input');
  gameSearch.className = 'games-search';
  gameSearch.placeholder = 'Search games...';

  grid.before(filterBar);
  filterBar.after(gameSearch);

  renderUGS(goodFiles, grid);

  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
  gameSearch.addEventListener('input', applyFilters);

  function applyFilters() {
    const q = gameSearch.value.toLowerCase();
    const letter = filterBar.querySelector('.filter-btn.active')?.dataset.letter || 'ALL';
    const filtered = ugsFiles.filter(f => {
      if (badGames.has(f)) return false;
      const name = ugsDisplayName(f);
      return (letter === 'ALL' || name[0].toUpperCase() === letter)
          && (!q || name.toLowerCase().includes(q));
    });
    renderUGS(filtered, grid);
  }
}

function renderUGS(list, grid) {
  if (!list.length) {
    grid.innerHTML = `<div class="games-empty">No games found</div>`;
    return;
  }
  grid.innerHTML = list.map(file => {
    const name = ugsDisplayName(file);
    const safe = name.replace(/'/g, "\\'");
    const fileSafe = file.replace(/'/g, "\\'");
    return `<div class="game-row" id="gr-${file}" onclick="launchUGS('${fileSafe}','${safe}')">
      <span class="game-row-name">${name}</span>
      <span class="game-row-play">▶</span>
    </div>`;
  }).join('');
}

function launchUGS(file, name) {
  const normalized = file.includes('.') ? file : file + '.html';
  const encoded = encodeURIComponent(normalized);
  const url = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile@main/${encoded}`;

  // Show overlay with loading state first
  openOverlay(name, url);

  // After a timeout, if it still seems broken, show an error & mark as bad
  // (iframe load events are unreliable for cross-origin, so we use a timeout heuristic)
  const frame = document.getElementById('voFrame');
  const checkTimer = setTimeout(() => {
    // If the frame is tiny / blank, it probably 404'd — we can't truly detect it
    // but we at least mark it after user closes if they report it
  }, 8000);

  frame.onload = () => {
    clearTimeout(checkTimer);
    document.getElementById('voLoading').style.display = 'none';
    frame.style.display = 'block';
  };
}

function markGameBad(file) {
  badGames.add(file);
  localStorage.setItem('void_bad_games', JSON.stringify([...badGames]));
  const row = document.getElementById(`gr-${file}`);
  if (row) row.remove();
}

// ════════════════════════════════
// NAVIGATION
// ════════════════════════════════
const pageTitles = { home:'Home', movies:'Movies & TV', games:'Games', proxy:'Proxy', chat:'Chat' };

function navigate(panelId) {
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.panel === panelId));
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + panelId));
  document.getElementById('pageTitle').textContent = pageTitles[panelId] || panelId;
  document.getElementById('searchInput').value = '';
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item =>
    item.addEventListener('click', () => navigate(item.dataset.panel)));
  document.querySelectorAll('.quick-card[data-goto]').forEach(card =>
    card.addEventListener('click', () => navigate(card.dataset.goto)));
}

// ════════════════════════════════
// PROXY
// ════════════════════════════════
function buildProxyHints() {
  const wrap = document.getElementById('proxyHints');
  if (!wrap) return;
  wrap.innerHTML = proxyHints.map(h =>
    `<span class="proxy-hint" data-hint="${h}">${h}</span>`).join('');
  wrap.querySelectorAll('.proxy-hint').forEach(btn =>
    btn.addEventListener('click', () => {
      document.getElementById('proxyInput').value = btn.dataset.hint;
    }));
}

function bindProxy() {
  const input    = document.getElementById('proxyInput');
  const goBtn    = document.getElementById('proxyGoBtn');
  const frame    = document.getElementById('proxyFrame');
  const frameUrl = document.getElementById('proxyFrameUrl');

  function go() {
    let val = input.value.trim();
    if (!val) return;
    if (!val.startsWith('http')) val = 'https://' + val;
    frameUrl.textContent = val;
    // Route through the proxy
    frame.src = PROXY_BASE + encodeURIComponent(val);
  }

  goBtn.addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// ════════════════════════════════
// CHAT
// ════════════════════════════════
function bindChat() {
  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
}

// ════════════════════════════════
// AUTH
// ════════════════════════════════
function bindAuth() {
  document.getElementById('userPill').addEventListener('click', () => {
    if (window.currentUser) { if (confirm('Log out?')) logout(); }
    else openAuth();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeAuth);
  document.getElementById('authModal').addEventListener('click', e => {
    if (e.target === document.getElementById('authModal')) closeAuth();
  });
  document.querySelectorAll('.modal-tab').forEach(tab =>
    tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  document.getElementById('loginSubmit').addEventListener('click', doLogin);
  document.getElementById('registerSubmit').addEventListener('click', doRegister);
}

function openAuth() {
  document.getElementById('authSuccess').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authModal').classList.add('open');
}
function closeAuth() { document.getElementById('authModal').classList.remove('open'); }
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authSuccess').style.display  = 'none';
}
function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  if (!u || !p) return alert('Fill in all fields.');
  if (!users[u] || users[u].pass !== btoa(p)) return alert('Incorrect username or password.');
  login(u); showSuccess(`Welcome back, ${u}!`, '// logged in');
}
function doRegister() {
  const u = document.getElementById('regUser').value.trim();
  const e = document.getElementById('regEmail').value.trim();
  const p = document.getElementById('regPass').value;
  if (!u || !e || !p) return alert('Fill in all fields.');
  if (p.length < 6) return alert('Password must be at least 6 characters.');
  if (users[u])     return alert('Username already taken.');
  users[u] = { email: e, pass: btoa(p) };
  localStorage.setItem('void_users', JSON.stringify(users));
  login(u); showSuccess(`Welcome, ${u}!`, '// account created');
}
function login(u) {
  window.currentUser = u;
  localStorage.setItem('void_current', u);
  document.getElementById('avatarEl').textContent    = u[0].toUpperCase();
  document.getElementById('userNameEl').textContent   = u;
  document.getElementById('userStatusEl').textContent = 'online';
}
function logout() {
  window.currentUser = null;
  localStorage.removeItem('void_current');
  document.getElementById('avatarEl').textContent    = '?';
  document.getElementById('userNameEl').textContent   = 'Sign in';
  document.getElementById('userStatusEl').textContent = 'not logged in';
}
function showSuccess(text, sub) {
  document.getElementById('loginForm').style.display    = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authSuccess').style.display  = 'block';
  document.getElementById('authSuccessText').textContent    = text;
  document.getElementById('authSuccessSubText').textContent = sub;
  setTimeout(closeAuth, 1400);
}
function restoreSession() {
  const saved = localStorage.getItem('void_current');
  if (saved && users[saved]) login(saved);
}

// ════════════════════════════════
// ABOUT:BLANK
// ════════════════════════════════
function bindBlank() {
  document.getElementById('blankBtn').addEventListener('click', () => {
    const w = window.open('about:blank', '_blank');
    w.document.open();
    w.document.write(document.documentElement.outerHTML);
    w.document.close();
  });
}

// ════════════════════════════════
// TOPBAR SEARCH
// ════════════════════════════════
function bindSearch() {
  document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#panel-movies .card, #panel-tv .card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      card.style.display = !q || title.includes(q) ? '' : 'none';
    });
  });
}
