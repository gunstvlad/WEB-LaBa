/**
 * consent.js
 * Внешний скрипт: динамически вставляет consent modal и управляет логикой согласий.
 *
 * Подключение на странице:
 *   <link rel="stylesheet" href="/css/consent.css">
 *   <script src="/js/consent.js" defer></script>
 *
 * API:
 *   window.onRegistered()  — вызывай после успешной регистрации (или сохраняй профиль и onRegistered() автоматически)
 *   window.consent.getProfile() — вернёт профиль из storage
 *   window.consent.setProfile(obj) — сохранит профиль
 */

(function () {
  const STORAGE_KEY = 'demoUserProfile_v1'; // если надо — поменяй
  const modalId = 'consent-modal-global';

  // --- helper: create element from html ---
  function createNodeFromHTML(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  // --- template (разметка модала) ---
  const markup = `
  <div id="${modalId}" class="consent-modal" aria-hidden="true">
    <div class="consent-backdrop" data-close="false"></div>
    <div class="consent-panel" role="dialog" aria-modal="true" aria-labelledby="consentTitle">
      <h2 id="consentTitle">Подтвердите согласие на обработку персональных данных</h2>
      <p class="consent-intro">Для продолжения работы с сайтом, пожалуйста, подтвердите согласие на обработку и хранение ваших персональных данных.</p>

      <form id="consentForm" class="consent-form" onsubmit="return false;">
        <div class="consent-row">
          <input type="checkbox" id="consentProcess" />
          <label for="consentProcess">Я даю согласие на <strong>обработку</strong> моих персональных данных. (<a href="/privacy.html" target="_blank" rel="noopener">Политика конфиденциальности</a>)</label>
        </div>

        <div class="consent-row">
          <input type="checkbox" id="consentStore" />
          <label for="consentStore">Я согласен(на) на <strong>хранение</strong> моих персональных данных на этом сайте.</label>
        </div>

        <div class="consent-actions">
          <button id="consentSave" type="button" class="consent-btn primary">Сохранить</button>
          <button id="consentLater" type="button" class="consent-btn ghost">Отложить</button>
        </div>

        <div id="consentMsg" class="consent-msg" aria-live="polite"></div>
      </form>
    </div>
  </div>
  `;

  // --- minimal inline CSS fallback (если не подключён внешний файл) ---
  const minimalCss = `
  /* minimal consent.css fallback (will be appended only if no explicit stylesheet found) */
  .consent-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:1200}
  .consent-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.45)}
  .consent-panel{position:relative;z-index:2;width:min(720px,94%);background:#fff;border-radius:10px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.35);max-height:90vh;overflow:auto}
  .consent-panel h2{margin:0 0 8px;font-size:1.25rem}
  .consent-intro{color:#444;margin:6px 0 12px}
  .consent-row{display:flex;gap:12px;align-items:flex-start;margin:12px 0}
  .consent-row input[type="checkbox"]{width:18px;height:18px;margin-top:4px}
  .consent-actions{display:flex;gap:10px;margin-top:10px}
  .consent-btn{padding:8px 12px;border-radius:7px;border:1px solid #ddd;background:#f7f7f7;cursor:pointer}
  .consent-btn.primary{background:#f6c84c;border-color:#e0b93a;font-weight:700}
  .consent-btn.ghost{background:transparent;border-color:#e6e6e6}
  .consent-msg{margin-top:8px;min-height:18px}
  .consent-msg .error{color:#b91c1c;font-weight:700}
  .consent-msg .success{color:#0f8a2d;font-weight:700}
  `;

  // append minimal CSS only if there is no /css/consent.css loaded (optional heuristic)
  (function maybeAppendMinimalCss() {
    // if there is already a link or style that mentions "consent" — skip
    const links = Array.from(document.getElementsByTagName('link')).map(l => l.href || '');
    const styles = Array.from(document.getElementsByTagName('style')).map(s => s.innerText || '');
    const found = links.concat(styles).some(s => /consent|consent-modal/i.test(s));
    if (!found) {
      const st = document.createElement('style');
      st.setAttribute('data-consent-inline', '1');
      st.textContent = minimalCss;
      document.head.appendChild(st);
    }
  })();

  // --- insert modal into DOM once DOM ready (or immediately if DOM already ready) ---
  function insertModal() {
    if (document.getElementById(modalId)) return; // already inserted
    const node = createNodeFromHTML(markup);
    document.body.appendChild(node);
    attachLogic();
  }

  // utility: load profile from storage
  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('consent: parse error', e);
      return null;
    }
  }
  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('consent: save error', e);
    }
  }

  // check if we need to show modal: profile exists AND missing any consent
  function consentNeeded() {
    const p = loadProfile();
    if (!p) return false;
    return !(!!p.consentPd && !!p.consentStore);
  }

  // show/hide helpers
  function showModal() {
    const root = document.getElementById(modalId);
    if (!root) return;
    root.style.display = 'flex';
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // focus first checkbox
    const cb = root.querySelector('#consentProcess');
    if (cb) cb.focus();
  }
  function hideModal() {
    const root = document.getElementById(modalId);
    if (!root) return;
    root.style.display = 'none';
    root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // attach event handlers after modal is in DOM
  function attachLogic() {
    const root = document.getElementById(modalId);
    if (!root) return;
    const cbProcess = root.querySelector('#consentProcess');
    const cbStore = root.querySelector('#consentStore');
    const btnSave = root.querySelector('#consentSave');
    const btnLater = root.querySelector('#consentLater');
    const msg = root.querySelector('#consentMsg');
    const backdrop = root.querySelector('.consent-backdrop');

    // prefill checkboxes from profile
    const profile = loadProfile() || {};
    cbProcess.checked = !!profile.consentPd;
    cbStore.checked = !!profile.consentStore;

    btnSave.addEventListener('click', function () {
      msg.textContent = '';
      if (!cbProcess.checked || !cbStore.checked) {
        msg.innerHTML = '<span class="error">Пожалуйста, отметьте оба согласия.</span>';
        return;
      }
      // save into profile
      const p = loadProfile() || {};
      p.consentPd = true;
      p.consentStore = true;
      p.lastConsentAt = new Date().toISOString();
      saveProfile(p);
      msg.innerHTML = '<span class="success">Согласия сохранены.</span>';
      setTimeout(hideModal, 700);
    });

    // Отложить — просто скрывает модал, не меняя профиль
    btnLater.addEventListener('click', function () {
      hideModal();
    });

    // clicking on backdrop doesn't close (by design). If you want to allow, uncomment:
    // backdrop.addEventListener('click', hideModal);

    // keyboard: ESC closes (but doesn't save)
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hideModal();
    });
  }

  // expose API
  window.consent = {
    getProfile: loadProfile,
    setProfile: function (p) { saveProfile(p); },
    show: function () { insertModal(); showModal(); },
    hide: function () { hideModal(); }
  };

  // global function to be called after registration success
  window.onRegistered = function () {
    // ensure modal inserted
    insertModal();
    // give slight delay to let registration code finish writing profile
    setTimeout(function () {
      if (consentNeeded()) showModal();
    }, 120);
  };

  // insert + auto-show on load if needed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      insertModal();
      if (consentNeeded()) {
        // small delay to not interrupt initial paint
        setTimeout(showModal, 220);
      }
    });
  } else {
    insertModal();
    if (consentNeeded()) setTimeout(showModal, 120);
  }

})();
