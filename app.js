// ── APP.JS — main controller ──

// ── STATE ──
window.currentUser = null;
const users = JSON.parse(localStorage.getItem('void_users') || '{}');

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  buildCards();
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

// ── CARD BUILDER ──
function buildCards() {
  renderCardGrid('moviesGrid', movies,  'media');
  renderCardGrid('tvGrid',     tvShows, 'media');
  renderCardGrid('gamesGrid',  games,   'game');
}

function renderCardGrid(containerId, data, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = data.map(item => {
    const action = type === 'game'
      ? `openGame('${item.url}', '${item.title.replace(/'/g, "\\'")}')`
      : `openMedia('${item.title.replace(/'/g, "\\'")}')`;
    const btnLabel = type === 'game' ? '▶ PLAY' : '▶ WATCH';
    const meta     = item.year || item.desc || '';
    const tags     = item.genre
      ? item.genre.map(g => `<span class="tag">${g}</span>`).join('')
      : '';
    return `
      <div class="card" onclick="${action}">
        <div class="card-thumb">${item.emoji}
          <div class="card-thumb-overlay">
            <span class="play-btn">${btnLabel}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-meta">${meta}</div>
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── MEDIA / GAME ACTIONS ──
function openMedia(title) {
  // TODO: connect Vidsrc or similar
  // Example: window.open(`https://vidsrc.to/embed/movie/${tmdbId}`, '_blank');
  alert(`🎬 "${title}"\n\nConnect a streaming source (e.g. Vidsrc) to enable playback.`);
}

function openGame(url, title) {
  const w = window.open(url, '_blank');
  if (!w) alert(`Opening ${title}...`);
}

// ── NAVIGATION ──
const pageTitles = {
  home:   'Home',
  movies: 'Movies & TV',
  games:  'Games',
  proxy:  'Proxy',
  chat:   'Chat',
};

function navigate(panelId) {
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.panel === panelId)
  );
  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + panelId)
  );
  document.getElementById('pageTitle').textContent = pageTitles[panelId] || panelId;
  document.getElementById('searchInput').value = '';
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.panel));
  });
  document.querySelectorAll('.quick-card[data-goto]').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.goto));
  });
}

// ── PROXY ──
function buildProxyHints() {
  const wrap = document.getElementById('proxyHints');
  if (!wrap) return;
  wrap.innerHTML = proxyHints.map(h =>
    `<span class="proxy-hint" data-hint="${h}">${h}</span>`
  ).join('');
  wrap.querySelectorAll('.proxy-hint').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('proxyInput').value = btn.dataset.hint;
    });
  });
}

function bindProxy() {
  const input   = document.getElementById('proxyInput');
  const goBtn   = document.getElementById('proxyGoBtn');
  const frame   = document.getElementById('proxyFrame');
  const frameUrl= document.getElementById('proxyFrameUrl');

  function go() {
    let val = input.value.trim();
    if (!val) return;
    if (!val.startsWith('http')) val = 'https://' + val;

    frameUrl.textContent = val;

    // ── TO ADD YOUR PROXY ──
    // Replace the line below with your proxy URL, e.g.:
    //   frame.src = 'https://your-scramjet-server.onrender.com/?' + encodeURIComponent(val);
    // For now, the iframe src is set directly (will be blocked by most sites due to X-Frame-Options).
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
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.getElementById('loginSubmit').addEventListener('click', doLogin);
  document.getElementById('registerSubmit').addEventListener('click', doRegister);
}

function openAuth() {
  document.getElementById('authSuccess').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('authModal').classList.add('open');
}
function closeAuth() {
  document.getElementById('authModal').classList.remove('open');
}
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
  login(u);
  showSuccess(`Welcome back, ${u}!`, '// logged in successfully');
}

function doRegister() {
  const u = document.getElementById('regUser').value.trim();
  const e = document.getElementById('regEmail').value.trim();
  const p = document.getElementById('regPass').value;
  if (!u || !e || !p) return alert('Fill in all fields.');
  if (p.length < 6)   return alert('Password must be at least 6 characters.');
  if (users[u])        return alert('Username already taken.');
  users[u] = { email: e, pass: btoa(p) };
  localStorage.setItem('void_users', JSON.stringify(users));
  login(u);
  showSuccess(`Welcome, ${u}!`, '// account created');
}

function login(u) {
  window.currentUser = u;
  localStorage.setItem('void_current', u);
  document.getElementById('avatarEl').textContent   = u[0].toUpperCase();
  document.getElementById('userNameEl').textContent  = u;
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
  document.getElementById('authSuccessText').textContent = text;
  document.getElementById('authSuccessSubText').textContent = sub;
  setTimeout(closeAuth, 1400);
}

function restoreSession() {
  const saved = localStorage.getItem('void_current');
  if (saved && users[saved]) login(saved);
}

// ── OPEN IN ABOUT:BLANK ──
function bindBlank() {
  document.getElementById('blankBtn').addEventListener('click', () => {
    const w   = window.open('about:blank', '_blank');
    const doc = w.document;
    doc.open();
    doc.write(document.documentElement.outerHTML);
    doc.close();
  });
}

// ── SEARCH ──
function bindSearch() {
  document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.panel.active .card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      card.style.display = !q || title.includes(q) ? '' : 'none';
    });
  });
}
