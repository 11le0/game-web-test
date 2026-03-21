// ── CHAT MODULE ──

const chatData = [
  { user: 'Zara',     text: "anyone tried Slope yet? it's addicting",  time: '2:14 PM', self: false },
  { user: 'dev_null', text: 'been on here all day lol',                 time: '2:16 PM', self: false },
  { user: 'ghost_x',  text: 'the proxy actually works great',           time: '2:18 PM', self: false },
];

const botUsers  = ['Zara', 'dev_null', 'ghost_x'];
const botReplies = ['lol yeah', 'fr fr', 'same tbh', '💀', 'no way', "that's wild", 'real', 'facts'];

function renderMessages() {
  const el = document.getElementById('chatMessages');
  el.innerHTML = chatData.map(m => `
    <div class="chat-msg ${m.self ? 'self' : ''}">
      <div class="chat-avatar">${m.user[0].toUpperCase()}</div>
      <div class="chat-bubble-wrap">
        <div class="chat-sender">${m.user}</div>
        <div class="chat-bubble">${escapeHtml(m.text)}</div>
        <div class="chat-time">${m.time}</div>
      </div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function sendChat() {
  const inp  = document.getElementById('chatInput');
  const text = inp.value.trim();
  if (!text) return;

  const name = window.currentUser || 'guest';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  chatData.push({ user: name, text, time, self: true });
  renderMessages();
  inp.value = '';

  // simulated reply
  setTimeout(() => {
    chatData.push({
      user:  botUsers[Math.floor(Math.random() * botUsers.length)],
      text:  botReplies[Math.floor(Math.random() * botReplies.length)],
      time:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      self:  false,
    });
    renderMessages();
  }, 900 + Math.random() * 700);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
