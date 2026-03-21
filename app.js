// ── APP.JS ──

window.currentUser = null;
const users = JSON.parse(localStorage.getItem('void_users') || '{}');

document.addEventListener('DOMContentLoaded', () => {
  buildMovieCards();
  buildTVCards();
  buildUGSGames();
  buildProxyHints();
  renderMessages();
  bindNav();
  bindAuth();
  bindProxy();
  bindChat();
  bindBlank();
  restoreSession();
});

// ── MOVIE CARDS (with real posters + vidsrc embed) ──
function buildMovieCards() { renderMediaGrid('moviesGrid', movies, 'movie'); }
function buildTVCards()    { renderMediaGrid('tvGrid',    tvShows, 'tv');    }

function renderMediaGrid(id, data, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.map(item => {
    const tags = (item.genre || []).map(g => `<span class="tag">${g}</span>`).join('');
    const safeName = item.title.replace(/'/g, "\\'");
    return `
      <div class="card" onclick="openMedia(${item.tmdb},'${safeName}','${type}')">
        <div class="card-thumb">
          <img src="${item.poster}" alt="${item.title}" onerror="this.style.display='none'">
          <div class="card-thumb-overlay"><span class="play-btn">▶ WATCH</span></div>
        </div>
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-meta">${item.year || ''}</div>
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// Open movie/show in an inline player overlay
function openMedia(tmdbId, title, type) {
  const src = type === 'tv'
    ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}`
    : `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
  openPlayer(title, src);
}

// ── GAME LAUNCHER (inline overlay, no new tab) ──
function buildUGSGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  // Search box
  const gameSearch = document.createElement('input');
  gameSearch.className = 'games-search';
  gameSearch.placeholder = 'Search games...';
  grid.before(gameSearch);

  renderUGS(ugsFiles, grid);

  gameSearch.addEventListener('input', () => {
    const q = gameSearch.value.toLowerCase();
    const filtered = q
      ? ugsFiles.filter(f => ugsDisplayName(f).toLowerCase().includes(q))
      : ugsFiles;
    renderUGS(filtered, grid);
  });
}

function renderUGS(list, grid) {
  if (!list.length) { grid.innerHTML = `<div class="games-empty">No games found</div>`; return; }
  grid.innerHTML = list.map(file => {
    const name = ugsDisplayName(file);
    const safe = name.replace(/'/g, "\\'");
    const fileSafe = file.replace(/'/g, "\\'");
    return `<div class="game-row" onclick="launchUGS('${fileSafe}','${safe}')">
      <span class="game-row-name">${name}</span>
      <span class="game-row-play">▶</span>
    </div>`;
  }).join('');
}

function launchUGS(file, name) {
  const normalized = file.includes('.') ? file : file + '.html';
  const encoded = encodeURIComponent(normalized);
  const url = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/${encoded}?t=${Date.now()}`;

  fetch(url)
    .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    .then(html => {
      // Write into the inline player iframe
      const frame = document.getElementById('playerFrame');
      openPlayer(name, null);
      // slight delay so overlay is open before we write
      setTimeout(() => {
        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open(); doc.write(html); doc.close();
      }, 50);
    })
    .catch(() => alert(`Could not load "${name}". The file may not be on the CDN.`));
}

// ── INLINE PLAYER OVERLAY ──
// This overlay is injected once into the page
function ensurePlayer() {
  if (document.getElementById('playerOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'playerOverlay';
  overlay.innerHTML = `
    <div class="player-box">
      <div class="player-topbar">
        <span class="player-title" id="playerTitle">—</span>
        <button class="player-close" onclick="closePlayer()">✕</button>
      </div>
      <iframe id="playerFrame" allowfullscreen allow="autoplay; fullscreen"></iframe>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePlayer(); });
}

function openPlayer(title, src) {
  ensurePlayer();
  document.getElementById('playerTitle').textContent = title;
  const frame = document.getElementById('playerFrame');
  if (src) frame.src = src;
  document.getElementById('playerOverlay').classList.add('open');
}

function closePlayer() {
  const overlay = document.getElementById('playerOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  const frame = document.getElementById('playerFrame');
  frame.src = '';
}

// ── NAVIGATION ──
const pageTitles = { home:'Home', movies:'Movies & TV', games:'Games', proxy:'Proxy', chat:'Chat' };
function navigate(panelId) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.panel === panelId));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + panelId));
  document.getElementById('pageTitle').textContent = pageTitles[panelId] || panelId;
}
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => navigate(item.dataset.panel)));
  document.querySelectorAll('.quick-card[data-goto]').forEach(card => card.addEventListener('click', () => navigate(card.dataset.goto)));
}

// ── PROXY ──
function buildProxyHints() {
  const wrap = document.getElementById('proxyHints');
  if (!wrap) return;
  wrap.innerHTML = proxyHints.map(h => `<span class="proxy-hint" data-hint="${h}">${h}</span>`).join('');
  wrap.querySelectorAll('.proxy-hint').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('proxyInput').value = btn.dataset.hint;
  }));
}
function bindProxy() {
  const input = document.getElementById('proxyInput');
  const goBtn = document.getElementById('proxyGoBtn');
  const frame = document.getElementById('proxyFrame');
  const frameUrl = document.getElementById('proxyFrameUrl');
  function go() {
    let val = input.value.trim();
    if (!val) return;
    if (!val.startsWith('http')) val = 'https://' + val;
    frameUrl.textContent = val;
    frame.src = val;
  }
  goBtn.addEventListener('click', go);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}

// ── CHAT ──
function bindChat() {
  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
}

// ── AUTH ──
function bindAuth() {
  document.getElementById('userPill').addEventListener('click', () => {
    if (window.currentUser) { if (confirm('Log out?')) logout(); } else openAuth();
  });
  document.getElementById('modalCloseBtn').addEventListener('click', closeAuth);
  document.getElementById('authModal').addEventListener('click', e => { if (e.target === document.getElementById('authModal')) closeAuth(); });
  document.querySelectorAll('.modal-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
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
  if (users[u]) return alert('Username already taken.');
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

// ── ABOUT:BLANK ──
function bindBlank() {
  document.getElementById('blankBtn').addEventListener('click', () => {
    const w = window.open('about:blank', '_blank');
    w.document.open(); w.document.write(document.documentElement.outerHTML); w.document.close();
  });
}
