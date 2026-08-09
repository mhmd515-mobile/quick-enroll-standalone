// js/db.js - Standalone Supabase client connector

const SUPABASE_URL = 'http://10.15.30.241:8001';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiZXhwIjoyMDk5OTk5OTk5fQ.jUHvY4idV2KczdL5qLA4eX_unuyiv7rxW_8hHfnBF0I';

// ─── Storage Helper ──────────
const _memStore = {};
const store = {
  get(key) {
    try { return localStorage.getItem(key); }
    catch(e) { return _memStore[key] ?? null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, val); }
    catch(e) { _memStore[key] = val; }
  },
  remove(key) {
    try { localStorage.removeItem(key); }
    catch(e) { delete _memStore[key]; }
  }
};

// Initialize Supabase Client lazily
function getSupabaseClient() {
  if (window._supabaseClientInstance) return window._supabaseClientInstance;
  if (window.supabase) {
    window._supabaseClientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window._supabaseClientInstance;
  }
  return null;
}

// Proxy object so window.db.supabaseClient always returns the current instance
const supabaseClientProxy = new Proxy({}, {
  get(_, prop) {
    const client = getSupabaseClient();
    if (!client) { console.error('Supabase SDK not loaded yet.'); return undefined; }
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

function showCustomAlert(options) {
  let modal = document.getElementById('custom-alert-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'custom-alert-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"></div>
      <div class="relative w-[90%] max-w-sm bg-[#12121a]/95 border-2 border-[#8b5cf6] shadow-up flex flex-col overflow-hidden backdrop-blur-md" style="border-radius: var(--radius-lg);">
        <div class="p-6 text-center">
          <div id="custom-alert-icon-container" class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-bad-dim text-bad">
            <span id="custom-alert-icon" class="material-symbols-rounded" style="font-size:28px">warning</span>
          </div>
          <h3 id="custom-alert-title" class="text-base font-bold text-ink-100 mb-2"></h3>
          <p id="custom-alert-message" class="text-xs text-ink-300 leading-relaxed"></p>
        </div>
        <div class="px-6 py-4 border-t border-edge bg-layer-2/50 flex justify-center gap-3">
          <button id="custom-alert-btn" class="btn-gradient text-xs flex-1" style="height: 36px;">موافق</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const titleEl = document.getElementById('custom-alert-title');
  const msgEl = document.getElementById('custom-alert-message');
  const btnEl = document.getElementById('custom-alert-btn');
  const iconContainer = document.getElementById('custom-alert-icon-container');
  const iconEl = document.getElementById('custom-alert-icon');

  if (titleEl) titleEl.textContent = options.title || 'تنبيه';
  if (msgEl) msgEl.textContent = options.message || '';

  if (options.type === 'success') {
    if (iconContainer) iconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-ok-dim text-ok';
    if (iconEl) iconEl.textContent = 'check_circle';
  } else {
    if (iconContainer) iconContainer.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-bad-dim text-bad';
    if (iconEl) iconEl.textContent = 'warning';
  }

  modal.classList.remove('hidden');

  btnEl.onclick = () => {
    modal.classList.add('hidden');
    if (typeof options.onConfirm === 'function') {
      options.onConfirm();
    }
  };
}

window.db = {
  get supabaseClient() { return supabaseClientProxy; },
  store,
  showAlert: showCustomAlert
};
