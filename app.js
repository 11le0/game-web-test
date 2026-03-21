// ── APP.JS ──

window.currentUser = null;
const users = JSON.parse(localStorage.getItem('void_users') || '{}');

document.addEventListener('DOMContentLoaded', () => {
  buildMovieCards();
  buildUGSGames();
  buildProxyHints();
  renderMessages();
  bindNav();
  bindAuth();
  bindProxy();
  bindChat();
  bindBlank();
  bindSearch();
  restoreSession();
});

// ── MOVIES / TV CARDS ──
function buildMovieCards() {
  renderCardGrid('moviesGrid', movies, 'media');
  renderCardGrid('tvGrid', tvShows, 'media');
}

function renderCardGrid(containerId, data, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = data.map(item => {
    const safeName = item.title.replace(/'/g, "\\'");
    const tags = item.genre ? item.genre.map(g => `<span class="tag">${g}</span>`).join('') : '';
    return `
      <div class="card" onclick="openMedia('${safeName}')">
        <div class="card-thumb">${item.emoji}
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

function openMedia(title) {
  alert(`🎬 "${title}"\n\nConnect a streaming source (e.g. Vidsrc) to enable playback.`);
}

// ── UGS GAMES ──
function buildUGSGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  // A–Z filter bar
  const letters = [...new Set(
    ugsFiles.map(f => ugsDisplayName(f)[0].toUpperCase()).filter(c => /[A-Z0-9]/.test(c))
  )].sort();

  const filterBar = document.createElement('div');
  filterBar.className = 'games-filter-bar';
  filterBar.innerHTML =
    `<span class="filter-btn active" data-letter="ALL">ALL</span>` +
    letters.map(l => `<span class="filter-btn" data-letter="${l}">${l}</span>`).join('');

  // Search box
  const gameSearch = document.createElement('input');
  gameSearch.className = 'games-search';
  gameSearch.placeholder = 'Search games...';

  // Insert both before the grid
  grid.before(filterBar);
  filterBar.after(gameSearch);

  // Initial render
  renderUGS(ugsFiles, grid);

  // Letter filter
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });

  // Search filter
  gameSearch.addEventListener('input', applyFilters);

  function applyFilters() {
    const q = gameSearch.value.toLowerCase();
    const letter = filterBar.querySelector('.filter-btn.active')?.dataset.letter || 'ALL';
    const filtered = ugsFiles.filter(f => {
      const name = ugsDisplayName(f);
      const matchLetter = letter === 'ALL' || name[0].toUpperCase() === letter;
      const matchSearch = !q || name.toLowerCase().includes(q);
      return matchLetter && matchSearch;
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
    return `<div class="game-row" onclick="launchUGS('${fileSafe}','${safe}')">
      <span class="game-row-name">${name}</span>
      <span class="game-row-play">▶</span>
    </div>`;
  }).join('');
}

function launchUGS(file, name) {
  const normalized = file.includes('.') ? file : file + '.html';
  const encoded = encodeURIComponent(normalized);
  const url = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile@main/UGS-Files/${encoded}`;
  window.open(url, '_blank');
}

// ── NAVIGATION ──
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

// ── PROXY ──
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
    // Replace with your proxy URL when ready:
    // frame.src = 'https://your-scramjet.onrender.com/?' + encodeURIComponent(val);
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

// ── ABOUT:BLANK ──
function bindBlank() {
  document.getElementById('blankBtn').addEventListener('click', () => {
    const w = window.open('about:blank', '_blank');
    w.document.open();
    w.document.write(document.documentElement.outerHTML);
    w.document.close();
  });
}

// ── TOPBAR SEARCH (movies/tv only) ──
function bindSearch() {
  document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#panel-movies .card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      card.style.display = !q || title.includes(q) ? '' : 'none';
    });
  });
}
