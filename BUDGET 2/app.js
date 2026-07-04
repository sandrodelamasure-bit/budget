/* ============================================================
   BUDGET — appli de gestion de budget de vacances (PWA offline)
   Données stockées en localStorage. Aucune dépendance.
   ============================================================ */
(function () {
  'use strict';

  const STORE_KEY = 'budget_app_v1';

  /* ---------- État & persistance ---------- */
  let state = load();
  let currentProjectId = null;
  let editingExpenseId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { projects: [] };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { alert("Impossible d'enregistrer les données sur cet appareil."); }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Helpers ---------- */
  const $ = (sel) => document.querySelector(sel);
  const euro = (n) => {
    const v = Math.round((n + Number.EPSILON) * 100) / 100;
    return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }) + ' €';
  };
  // Parse "3,47" ou "3.47" -> number
  function parseAmount(str) {
    if (typeof str !== 'string') return NaN;
    const cleaned = str.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    if (cleaned === '' || cleaned === '.') return NaN;
    return parseFloat(cleaned);
  }
  const projById = (id) => state.projects.find(p => p.id === id);
  const totalSpent = (p) => p.expenses.reduce((s, e) => s + e.amount, 0);

  function daysInfo(p) {
    // Retourne {total, elapsed, remaining} en jours entiers
    const total = Math.max(1, parseInt(p.days, 10) || 1);
    if (!p.startDate) return { total, elapsed: null, remaining: total };
    const start = new Date(p.startDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    let elapsed = Math.floor((today - start) / dayMs) + 1; // jour 1 = jour de début
    elapsed = Math.min(Math.max(elapsed, 0), total);
    const remaining = Math.max(total - Math.max(elapsed - (elapsed < total ? 0 : 0), 0), 0);
    // jours restants (aujourd'hui compris) :
    let daysLeft = total - (elapsed - 1);
    if (elapsed <= 0) daysLeft = total;
    daysLeft = Math.max(daysLeft, 0);
    return { total, elapsed, remaining: daysLeft };
  }

  function formatShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  function formatExpenseDate(ts) {
    const d = new Date(ts);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((today - dd) / 86400000);
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return "Aujourd'hui " + time;
    if (diff === 1) return 'Hier ' + time;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + time;
  }

  /* ---------- Rendu : liste des projets ---------- */
  function renderProjects() {
    const list = $('#projects-list');
    const empty = $('#projects-empty');
    list.innerHTML = '';
    if (state.projects.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    state.projects.forEach(p => {
      const spent = totalSpent(p);
      const remaining = p.budget - spent;
      const pct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0;
      const over = remaining < 0;

      const dateStr = p.startDate
        ? formatShortDate(p.startDate) + ' · ' + p.days + ' j'
        : p.days + ' jours';

      const card = document.createElement('div');
      card.className = 'project-card';
      card.innerHTML = `
        <div class="pc-top">
          <div style="min-width:0">
            <p class="pc-name">${escapeHtml(p.name)}</p>
            <p class="pc-dates">${dateStr}</p>
          </div>
          <div class="pc-remaining" style="color:${over ? 'var(--red)' : 'var(--ink)'}">
            ${euro(remaining)}
            <small>${over ? 'dépassé' : 'restant'}</small>
          </div>
        </div>
        <div class="pc-bar">
          <div class="progress"><div class="progress-fill ${barClass(spent, p.budget)}" style="width:${pct}%"></div></div>
        </div>
        <div class="pc-foot">
          <span>${euro(spent)} dépensé</span>
          <span>sur ${euro(p.budget)}</span>
        </div>`;
      card.addEventListener('click', () => openDetail(p.id));
      list.appendChild(card);
    });
  }

  function barClass(spent, budget) {
    if (budget <= 0) return '';
    const r = spent / budget;
    if (r > 1) return 'over';
    if (r >= 0.8) return 'warn';
    return '';
  }

  /* ---------- Rendu : détail d'un projet ---------- */
  function openDetail(id) {
    currentProjectId = id;
    renderDetail();
    showView('view-detail');
    window.scrollTo(0, 0);
  }

  function renderDetail() {
    const p = projById(currentProjectId);
    if (!p) { backToProjects(); return; }
    const spent = totalSpent(p);
    const remaining = p.budget - spent;
    const over = remaining < 0;
    const pct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0;

    $('#detail-name').textContent = p.name;
    const remEl = $('#detail-remaining');
    remEl.textContent = euro(remaining);
    remEl.classList.toggle('over', over);
    $('#detail-spent').textContent = euro(spent);
    $('#detail-budget').textContent = euro(p.budget);
    const fill = $('#detail-progress');
    fill.style.width = pct + '%';
    fill.className = 'progress-fill ' + barClass(spent, p.budget);

    // Mini stats
    const di = daysInfo(p);
    const perDaySpent = di.total > 0 ? spent / di.total : spent;
    $('#stat-perday-spent').textContent = euro(perDaySpent);
    if (di.remaining > 0) {
      $('#stat-perday-left').textContent = euro(Math.max(remaining, 0) / di.remaining);
    } else {
      $('#stat-perday-left').textContent = '—';
    }
    $('#stat-days').textContent = di.remaining;

    // Liste dépenses (plus récentes en haut)
    const listEl = $('#expenses-list');
    const emptyEl = $('#expenses-empty');
    listEl.innerHTML = '';
    const sorted = [...p.expenses].sort((a, b) => b.ts - a.ts);
    $('#expenses-count').textContent = sorted.length ? sorted.length : '';

    if (sorted.length === 0) {
      emptyEl.classList.remove('hidden');
      listEl.classList.add('hidden');
    } else {
      emptyEl.classList.add('hidden');
      listEl.classList.remove('hidden');
      sorted.forEach(e => {
        const row = document.createElement('div');
        row.className = 'expense';
        row.innerHTML = `
          <div class="exp-main">
            <p class="exp-name">${escapeHtml(e.name || 'Dépense')}</p>
            ${e.comment ? `<p class="exp-comment">${escapeHtml(e.comment)}</p>` : ''}
          </div>
          <div class="exp-right">
            <div class="exp-amount">${euro(e.amount)}</div>
            <div class="exp-date">${formatExpenseDate(e.ts)}</div>
          </div>`;
        row.addEventListener('click', () => openExpenseSheet(e.id));
        listEl.appendChild(row);
      });
    }
  }

  /* ---------- Navigation entre vues ---------- */
  function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    $('#' + id).classList.remove('hidden');
  }
  function backToProjects() {
    currentProjectId = null;
    renderProjects();
    showView('view-projects');
    window.scrollTo(0, 0);
  }

  /* ---------- Feuilles (ouverture / fermeture) ---------- */
  function openSheet(id) {
    const b = $('#' + id);
    b.classList.remove('hidden');
    requestAnimationFrame(() => b.classList.add('show'));
  }
  function closeSheet(id) {
    const b = $('#' + id);
    b.classList.remove('show');
    setTimeout(() => b.classList.add('hidden'), 280);
  }

  /* ---------- Formulaire PROJET ---------- */
  let editingProjectId = null;
  function openProjectSheet(id) {
    editingProjectId = id || null;
    const title = $('#project-sheet-title');
    const del = $('#delete-project');
    if (id) {
      const p = projById(id);
      title.textContent = 'Modifier le projet';
      $('#project-name').value = p.name;
      $('#project-budget').value = String(p.budget).replace('.', ',');
      $('#project-start').value = p.startDate || '';
      $('#project-days').value = p.days;
      del.classList.remove('hidden');
    } else {
      title.textContent = 'Nouveau projet';
      $('#project-name').value = '';
      $('#project-budget').value = '';
      $('#project-start').value = new Date().toISOString().slice(0, 10);
      $('#project-days').value = '7';
      del.classList.add('hidden');
    }
    openSheet('sheet-project');
    setTimeout(() => $('#project-name').focus(), 300);
  }

  function saveProject() {
    const name = $('#project-name').value.trim();
    const budget = parseAmount($('#project-budget').value);
    const start = $('#project-start').value;
    const days = parseInt($('#project-days').value, 10);

    if (!name) { alert('Donne un nom à ton projet.'); return; }
    if (isNaN(budget) || budget <= 0) { alert('Indique un budget valide.'); return; }
    if (isNaN(days) || days <= 0) { alert('Indique une durée en jours.'); return; }

    if (editingProjectId) {
      const p = projById(editingProjectId);
      p.name = name; p.budget = budget; p.startDate = start; p.days = days;
    } else {
      state.projects.push({
        id: uid(), name, budget, startDate: start, days, expenses: []
      });
    }
    save();
    closeSheet('sheet-project');
    if (currentProjectId) renderDetail(); else renderProjects();
  }

  function deleteProject() {
    confirmAction('Supprimer ce projet et toutes ses dépenses ?', () => {
      state.projects = state.projects.filter(p => p.id !== editingProjectId);
      save();
      closeSheet('sheet-project');
      backToProjects();
    });
  }

  /* ---------- Formulaire DÉPENSE ---------- */
  function openExpenseSheet(id) {
    editingExpenseId = id || null;
    const title = $('#expense-sheet-title');
    const del = $('#delete-expense');
    if (id) {
      const p = projById(currentProjectId);
      const e = p.expenses.find(x => x.id === id);
      title.textContent = 'Modifier la dépense';
      $('#expense-amount').value = String(e.amount).replace('.', ',');
      $('#expense-name').value = e.name || '';
      $('#expense-comment').value = e.comment || '';
      del.classList.remove('hidden');
    } else {
      title.textContent = 'Nouvelle dépense';
      $('#expense-amount').value = '';
      $('#expense-name').value = '';
      $('#expense-comment').value = '';
      del.classList.add('hidden');
    }
    openSheet('sheet-expense');
    setTimeout(() => $('#expense-amount').focus(), 300);
  }

  function saveExpense() {
    const amount = parseAmount($('#expense-amount').value);
    const name = $('#expense-name').value.trim();
    const comment = $('#expense-comment').value.trim();

    if (isNaN(amount) || amount <= 0) { alert('Indique un montant valide.'); return; }

    const p = projById(currentProjectId);
    if (editingExpenseId) {
      const e = p.expenses.find(x => x.id === editingExpenseId);
      e.amount = amount; e.name = name || 'Dépense'; e.comment = comment;
    } else {
      p.expenses.push({
        id: uid(), amount, name: name || 'Dépense', comment, ts: Date.now()
      });
    }
    save();
    closeSheet('sheet-expense');
    renderDetail();
  }

  function deleteExpense() {
    confirmAction('Supprimer cette dépense ?', () => {
      const p = projById(currentProjectId);
      p.expenses = p.expenses.filter(x => x.id !== editingExpenseId);
      save();
      closeSheet('sheet-expense');
      renderDetail();
    });
  }

  /* ---------- Boîte de confirmation ---------- */
  let confirmCallback = null;
  function confirmAction(text, cb) {
    $('#confirm-text').textContent = text;
    confirmCallback = cb;
    openSheet('confirm');
  }

  /* ---------- Sécurité HTML ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ---------- Écouteurs ---------- */
  $('#btn-add-project').addEventListener('click', () => openProjectSheet());
  $('#btn-add-expense').addEventListener('click', () => openExpenseSheet());
  $('#btn-back').addEventListener('click', backToProjects);
  $('#btn-edit-project').addEventListener('click', () => openProjectSheet(currentProjectId));
  $('#save-project').addEventListener('click', saveProject);
  $('#delete-project').addEventListener('click', deleteProject);
  $('#save-expense').addEventListener('click', saveExpense);
  $('#delete-expense').addEventListener('click', deleteExpense);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeSheet(btn.getAttribute('data-close')));
  });
  // Fermer une feuille en tapant le fond
  document.querySelectorAll('.sheet-backdrop').forEach(bd => {
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd && bd.id !== 'confirm') closeSheet(bd.id);
    });
  });
  $('#confirm-cancel').addEventListener('click', () => closeSheet('confirm'));
  $('#confirm-ok').addEventListener('click', () => {
    closeSheet('confirm');
    if (confirmCallback) { const cb = confirmCallback; confirmCallback = null; setTimeout(cb, 150); }
  });

  // Validation au clavier (touche "OK/Suivant")
  $('#expense-amount').addEventListener('keydown', e => { if (e.key === 'Enter') $('#expense-name').focus(); });
  $('#expense-comment').addEventListener('keydown', e => { if (e.key === 'Enter') saveExpense(); });

  /* ---------- Démarrage ---------- */
  renderProjects();

  /* ---------- Service worker (offline) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
