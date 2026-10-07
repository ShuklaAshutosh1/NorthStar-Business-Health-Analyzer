const toast = document.querySelector('#toast');
const modal = document.querySelector('#infoModal');
const pageView = document.querySelector('#pageView');
const STORAGE_KEY = 'northstar-business-health-v1';
const CLIENTS_KEY = 'northstar-clients-v1';
const ACTIVE_CLIENT_KEY = 'northstar-active-client-v1';
const PROFILE_KEY = 'northstar-admin-profile-v1';
let toastTimer;
let insightIndex = 0;
let currentView = 'clients';
let transactionFilter = 'all';
let searchQuery = '';
const coachConversations = {};
let adminProfile = loadProfile();

const starterTransactions = [
  { id: 't1', date: '2026-10-07', description: 'Website redesign — final payment', category: 'Services', type: 'income', amount: 145000 },
  { id: 't2', date: '2026-10-06', description: 'Monthly retainer — Maple & Co.', category: 'Retainers', type: 'income', amount: 125000 },
  { id: 't3', date: '2026-10-05', description: 'Brand strategy project', category: 'Services', type: 'income', amount: 108500 },
  { id: 't4', date: '2026-10-03', description: 'Product subscription sales', category: 'Products', type: 'income', amount: 104400 },
  { id: 't5', date: '2026-10-07', description: 'Team salaries', category: 'Payroll', type: 'expense', amount: 112000 },
  { id: 't6', date: '2026-10-06', description: 'Workspace and utilities', category: 'Operations', type: 'expense', amount: 75000 },
  { id: 't7', date: '2026-10-04', description: 'Software subscriptions', category: 'Software', type: 'expense', amount: 48000 },
  { id: 't8', date: '2026-10-03', description: 'Marketing campaign', category: 'Marketing', type: 'expense', amount: 39970 },
  { id: 't9', date: '2026-10-02', description: 'Contractor — illustration', category: 'Contractors', type: 'expense', amount: 36000 },
  { id: 't10', date: '2026-10-01', description: 'GST and professional fees', category: 'Taxes & fees', type: 'expense', amount: 83030 },
  { id: 't11', date: '2026-09-25', description: 'Monthly retainer — Maple & Co.', category: 'Retainers', type: 'income', amount: 118000 },
  { id: 't12', date: '2026-09-18', description: 'E-commerce launch project', category: 'Services', type: 'income', amount: 95000 },
  { id: 't13', date: '2026-09-08', description: 'Team salaries', category: 'Payroll', type: 'expense', amount: 108000 },
  { id: 't14', date: '2026-08-25', description: 'Monthly retainer — Maple & Co.', category: 'Retainers', type: 'income', amount: 112000 },
  { id: 't15', date: '2026-08-10', description: 'Brand identity project', category: 'Services', type: 'income', amount: 89000 },
];

let clients = loadClients();
let activeClientID = loadActiveClientID();
let transactions = loadClientTransactions(activeClientID);
function loadClients() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLIENTS_KEY));
    if (Array.isArray(saved) && saved.length) return saved.map((client) => ({ ...client, companyName: client.companyName || client.name || '', contactName: client.contactName || '', email: client.email || '', phone: client.phone || '' }));
  } catch {}
  const defaults = [{ id: 'acme-studio', name: 'Acme Studio', companyName: 'Acme Studio', industry: 'Creative studio', openingCash: 650000, archived: false, createdAt: '2026-10-01' }];
  try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(defaults)); } catch {}
  return defaults;
}
function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved.name === 'string') return saved;
  } catch {}
  return { name: 'Admin User', role: 'Administrator', email: '' };
}
function saveProfile() { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(adminProfile)); } catch { notify('Profile could not be saved in browser storage.'); } }
function profileInitials() {
  return (adminProfile.name || 'Admin User').trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}
function refreshProfile() {
  const displayName = document.querySelector('#profileButton .profile-copy strong');
  const role = document.querySelector('#profileButton .profile-copy small');
  const sideAvatar = document.querySelector('#profileButton .profile-avatar');
  const topAvatar = document.querySelector('#profileAvatarTop');
  if (displayName) displayName.textContent = adminProfile.name || 'Admin User';
  if (role) role.textContent = adminProfile.role || 'Administrator';
  if (sideAvatar) sideAvatar.textContent = profileInitials();
  if (topAvatar) topAvatar.textContent = profileInitials();
}
function cloneStarterTransactions() { return JSON.parse(JSON.stringify(starterTransactions)); }
function clientStorageKey(clientID) { return `northstar-transactions-${clientID}`; }
function loadActiveClientID() {
  try {
    const saved = localStorage.getItem(ACTIVE_CLIENT_KEY);
    if (saved && clients.some((client) => client.id === saved && !client.archived)) return saved;
  } catch {}
  return clients.find((client) => !client.archived)?.id || clients[0]?.id || 'acme-studio';
}
function loadClientTransactions(clientID) {
  try {
    const saved = localStorage.getItem(clientStorageKey(clientID));
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (clientID === 'acme-studio') {
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(legacy)) return legacy;
      return cloneStarterTransactions();
    }
  } catch {}
  return [];
}
function saveTransactions() {
  try { localStorage.setItem(clientStorageKey(activeClientID), JSON.stringify(transactions)); }
  catch { notify('Saved for this session, but browser storage is unavailable.'); }
}
function saveClients() { try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients)); } catch { notify('Client list could not be saved in browser storage.'); } }
function activeClient() { return clients.find((client) => client.id === activeClientID) || clients[0]; }
function switchClient(clientID) {
  const client = clients.find((item) => item.id === clientID && !item.archived);
  if (!client) return;
  activeClientID = client.id;
  transactions = loadClientTransactions(client.id);
  try { localStorage.setItem(ACTIVE_CLIENT_KEY, activeClientID); } catch {}
  refreshWorkspace();
  modal.close();
  setView('overview');
  notify(`Now viewing ${client.name}.`);
}
function refreshWorkspace() {
  const client = activeClient();
  if (!client) return;
  const name = document.querySelector('.workspace-copy strong');
  const industry = document.querySelector('.workspace-copy small');
  const avatar = document.querySelector('.workspace-avatar');
  if (name) name.textContent = client.name;
  if (industry) industry.textContent = client.companyName || client.industry || 'Client dashboard';
  if (avatar) avatar.textContent = client.name.slice(0, 1).toUpperCase();
}
function makeID() { return globalThis.crypto?.randomUUID?.() || `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayISO() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function rupees(value, compact = false) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: compact ? 'compact' : 'standard' }).format(value || 0);
}
function getRange(period = document.querySelector('#periodSelect')?.value || 'month') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let start;
  let end;
  if (period === 'year') { start = new Date(year, 0, 1); end = new Date(year, 11, 31, 23, 59, 59, 999); }
  else if (period === 'quarter') { const quarterStart = Math.floor(month / 3) * 3; start = new Date(year, quarterStart, 1); end = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999); }
  else { start = new Date(year, month, 1); end = new Date(year, month + 1, 0, 23, 59, 59, 999); }
  return { start, end };
}
function inRange(transaction, range = getRange()) {
  const date = new Date(`${transaction.date}T12:00:00`);
  return date >= range.start && date <= range.end;
}
function sum(items, type) { return items.filter((t) => t.type === type).reduce((total, t) => total + Number(t.amount || 0), 0); }
function currentTransactions() { return transactions.filter((t) => inRange(t)); }
function businessStats(items = currentTransactions(), sourceTransactions = transactions, openingCash = activeClient()?.openingCash || 0) {
  const revenue = sum(items, 'income');
  const expenses = sum(items, 'expense');
  const margin = revenue ? ((revenue - expenses) / revenue) * 100 : 0;
  const previous = sourceTransactions.filter((t) => {
    const range = getRange();
    const span = range.end.getTime() - range.start.getTime();
    const date = new Date(`${t.date}T12:00:00`);
    return date >= new Date(range.start.getTime() - span - 1) && date < range.start;
  });
  const previousRevenue = sum(previous, 'income');
  const growth = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : null;
  const cash = openingCash + sum(sourceTransactions, 'income') - sum(sourceTransactions, 'expense');
  const growthScore = growth === null ? 0 : Math.min(18, growth / 2);
  const score = revenue || expenses ? Math.max(0, Math.min(100, Math.round(55 + Math.min(20, margin) * 0.8 + growthScore + 5))) : 0;
  const periodMonths = ({ month: 1, quarter: 3, year: 12 })[document.querySelector('#periodSelect')?.value || 'month'] || 1;
  const monthlyBurn = expenses / periodMonths;
  const runway = monthlyBurn > 0 ? Math.max(0, cash / monthlyBurn) : 0;
  return { revenue, expenses, profit: revenue - expenses, margin, growth, cash, runway, score };
}
function showModal(title, content, className = '') {
  document.querySelector('#modalContent').innerHTML = `<h2>${title}</h2>${content}`;
  modal.className = `modal ${className}`;
  modal.showModal();
}
document.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });

function setView(view) {
  currentView = view;
  document.querySelector('.app-shell').classList.toggle('presentation-mode', view === 'intro' || view === 'clientreport');
  document.querySelectorAll('.nav-item[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view));
  const title = ({ intro: 'Welcome', clientreport: 'Client report', overview: activeClient()?.name || 'Client overview', clients: 'Client portfolio', accounts: 'Accounts', sales: 'Sales dashboard', cashflow: 'Cash flow', transactions: 'Transactions', customers: 'Customers', expenses: 'Expenses', insights: 'AI growth plan', benchmarks: 'Benchmarks', settings: 'Settings' })[view] || 'Overview';
  document.querySelector('.breadcrumbs strong').textContent = title;
  pageView.innerHTML = renderView(view);
  bindViewActions();
  document.querySelector('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function heading(title, description, action = '') {
  return `<section class="page-heading"><div><div class="eyebrow">${escapeHTML(activeClient()?.name || 'NORTHSTAR')} · BUSINESS HEALTH</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions"><label class="select-wrap"><span class="sr-only">Reporting period</span><select id="periodSelect"><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select></label>${action}</div></section>`;
}
function metric(label, value, change, icon, color = 'revenue') {
  return `<article class="metric-card"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-symbol ${color}">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot"><span class="trend ${change.startsWith('-') ? 'down' : 'up'}">${change}</span><span>vs. previous period</span></div></article>`;
}
function panel(title, subtitle, body, extra = '') {
  return `<article class="panel"><div class="panel-heading"><div><h3>${title}</h3><p>${subtitle}</p></div>${extra}</div>${body}</article>`;
}
function renderIntro() {
  const stats = businessStats();
  const client = activeClient();
  const status = stats.score >= 75 ? 'Healthy momentum' : stats.score >= 50 ? 'Room to strengthen' : 'Ready for a fresh start';
  return `<div class="intro-page"><header class="intro-nav"><a href="#welcome" class="intro-brand"><span>✳</span> northstar</a><span class="intro-nav-note">A clearer view of business health</span><button class="intro-admin-link" id="introAdminTop">Open workspace <span>→</span></button></header><main><section class="intro-hero"><div class="intro-copy"><span class="intro-eyebrow"><i></i> YOUR ADMIN + CLIENT WORKSPACE</span><h1>Make business health <em>easy to understand.</em></h1><p class="intro-lede">One calm place to manage every client, track the numbers that matter, and share progress in a way everyone can understand.</p><div class="intro-actions"><button class="intro-primary" id="introAdmin">Open admin workspace <span>→</span></button><button class="intro-secondary" id="introClient">Preview client report <span>↗</span></button></div><div class="intro-assurances"><span><i>✓</i> Separate client records</span><span><i>₹</i> Built for INR</span><span><i>✦</i> Clear, human insights</span></div></div><div class="intro-art"><div class="intro-glow"></div><div class="intro-orbit intro-orbit-a"></div><div class="intro-orbit intro-orbit-b"></div><div class="intro-mini-tag">NORTHSTAR · BUSINESS HEALTH</div><article class="intro-preview-card"><div class="preview-card-head"><div><span class="preview-overline">CLIENT SNAPSHOT</span><strong>${escapeHTML(client.companyName || client.name)}</strong></div><span class="preview-avatar">${escapeHTML(client.name.slice(0, 1).toUpperCase())}</span></div><div class="preview-health"><div class="preview-score-ring"><strong>${stats.score}</strong><small>HEALTH SCORE</small></div><div><span class="preview-status"><i></i>${status}</span><p>${stats.profit >= 0 ? 'Revenue is ahead of expenses this period.' : 'Review expenses alongside incoming revenue.'}</p></div></div><div class="preview-metrics"><div><span>Revenue</span><strong>${rupees(stats.revenue, true)}</strong></div><div><span>Net profit</span><strong>${rupees(stats.profit, true)}</strong></div><div><span>Margin</span><strong>${stats.margin.toFixed(1)}%</strong></div></div><div class="preview-foot"><span>Updated from your latest records</span><span>↗</span></div></article><div class="intro-floating intro-float-one"><span>↗</span><div><strong>Client-ready</strong><small>Clear progress updates</small></div></div><div class="intro-floating intro-float-two"><span>₹</span><div><strong>All in one place</strong><small>Every client, one view</small></div></div></div></section><section class="intro-paths"><div class="intro-section-heading"><span>BUILT FOR THE WAY YOU WORK</span><h2>Better visibility for both sides.</h2><p>Keep the full picture as an administrator. Give each client a focused, polished update.</p></div><div class="intro-path-grid"><article class="intro-path-card"><span class="path-icon admin-icon">▦</span><span class="path-label">FOR YOU · ADMIN</span><h3>Run your client portfolio</h3><p>Switch between client workspaces, keep transactions separate, and see the portfolio at a glance.</p><button id="introAdminBottom">Go to client portfolio <span>→</span></button></article><article class="intro-path-card"><span class="path-icon client-icon">✧</span><span class="path-label">FOR YOUR CLIENTS</span><h3>Share the story behind the numbers</h3><p>Preview a clean health summary with key metrics and plain-language signals—without admin navigation.</p><button id="introClientBottom">Preview a client report <span>→</span></button></article></div></section></main><footer class="intro-footer"><span>northstar <i>✳</i> Business clarity, thoughtfully presented.</span><span>Private to this browser · Informational, not financial advice</span></footer></div>`;
}

function renderClientReport() {
  const stats = businessStats();
  const client = activeClient();
  const status = stats.score >= 75 ? 'Healthy momentum' : stats.score >= 50 ? 'Room to strengthen' : 'Early-stage snapshot';
  return `<div class="client-report-page"><header class="client-report-header"><a class="intro-brand" href="#welcome" id="reportBrand"><span>✳</span> northstar</a><span class="report-preview-label">CLIENT REPORT PREVIEW</span><button class="button-secondary" id="returnToAdmin">← Admin workspace</button></header><main class="client-report-main"><div class="report-client-label">BUSINESS HEALTH SUMMARY · ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'}).toUpperCase()}</div><h1>${escapeHTML(client.companyName || client.name)}</h1><p class="report-lede">A clear snapshot of ${escapeHTML(client.name)}’s business performance, prepared with care by your advisory team.</p><section class="report-score-card"><div class="report-score-ring"><strong>${stats.score}</strong><span>OUT OF 100</span></div><div><span class="report-status"><i></i>${status}</span><h2>${stats.profit >= 0 ? 'Your business is moving in a positive direction.' : 'There are a few areas to review together.'}</h2><p>This score reflects recent revenue, expenses, and profit signals. It is a conversation starter, not a rating or judgement.</p></div></section><section class="report-metric-grid"><article><span>Revenue</span><strong>${rupees(stats.revenue)}</strong><small>Income recorded this period</small></article><article><span>Operating expenses</span><strong>${rupees(stats.expenses)}</strong><small>Costs recorded this period</small></article><article><span>Net profit</span><strong>${rupees(stats.profit)}</strong><small>${stats.margin.toFixed(1)}% profit margin</small></article><article><span>Cash balance estimate</span><strong>${rupees(stats.cash)}</strong><small>Based on opening balance and records</small></article></section><section class="report-insight"><span class="report-insight-icon">✦</span><div><span class="path-label">A HELPFUL OBSERVATION</span><h3>${stats.profit >= 0 ? 'A steady base to build from' : 'A good moment to review costs'}</h3><p>${stats.profit >= 0 ? `After recorded expenses, ${escapeHTML(client.name)} retained ${rupees(stats.profit)} this period. Keeping an eye on recurring costs can help protect that progress.` : `Recorded expenses exceeded revenue by ${rupees(Math.abs(stats.profit))}. Reviewing recurring costs and expected incoming payments together may help clarify the next step.`}</p></div></section><div class="report-note">Prepared as a discussion aid using the information currently recorded. This summary is informational and is not financial, tax, or accounting advice.</div><button class="report-back-link" id="returnToAdminBottom">← Return to admin workspace</button></main><footer class="intro-footer"><span>northstar <i>✳</i> Business clarity, thoughtfully presented.</span><span>Client report preview · ${escapeHTML(client.name)}</span></footer></div>`;
}

function renderClients() {
  const activeClients = clients.filter((client) => !client.archived);
  const portfolio = activeClients.map((client) => {
    const records = loadClientTransactions(client.id);
    const stats = businessStats(records.filter((t) => inRange(t)), records, client.openingCash || 0);
    return { client, records, stats };
  });
  const portfolioRevenue = portfolio.reduce((total, item) => total + item.stats.revenue, 0);
  const portfolioProfit = portfolio.reduce((total, item) => total + item.stats.profit, 0);
  const avgScore = portfolio.length ? Math.round(portfolio.reduce((total, item) => total + item.stats.score, 0) / portfolio.length) : 0;
  const cards = clients.map((client) => {
    const records = loadClientTransactions(client.id);
    const stats = businessStats(records.filter((t) => inRange(t)), records, client.openingCash || 0);
    const archived = Boolean(client.archived);
    return `<article class="client-card ${archived ? 'archived' : ''} ${client.id === activeClientID ? 'selected-client' : ''}"><div class="client-card-top"><span class="client-avatar">${escapeHTML(client.name.slice(0, 1).toUpperCase())}</span><span class="client-status ${archived ? 'archived-status' : 'active-status'}">${archived ? 'Archived' : client.id === activeClientID ? 'Currently viewing' : 'Active client'}</span><button class="client-menu" data-client-action="${archived ? 'restore' : 'archive'}" data-client-id="${escapeHTML(client.id)}">${archived ? 'Restore' : 'Archive'}</button></div><h3>${escapeHTML(client.name)}</h3><p class="client-industry">${escapeHTML(client.companyName || client.name)} · ${escapeHTML(client.industry || 'Business')}</p><div class="client-card-metrics"><div><span>Revenue this period</span><strong>${rupees(stats.revenue, true)}</strong></div><div><span>Health score</span><strong class="client-score">${stats.score}<small>/100</small></strong></div></div><div class="client-card-foot"><span>${records.length} transactions</span>${archived ? '<span class="archived-label">Archived record</span>' : `<button class="client-edit-link" data-edit-client="${escapeHTML(client.id)}">Edit details</button><button class="client-open" data-open-client="${escapeHTML(client.id)}">Open dashboard <span>→</span></button>`}</div></article>`;
  }).join('');
  return `${heading('Client portfolio', 'One admin workspace for every business you manage.', '<button class="button-primary" id="addClient"><span>＋</span> Add client</button>')}<section class="portfolio-hero"><div class="portfolio-copy"><div class="portfolio-kicker"><span>✦</span> ADMIN WORKSPACE</div><h2>Welcome, ${escapeHTML((adminProfile.name || 'Admin User').split(/\s+/)[0])}.</h2><p>Your client portfolio has <strong>${activeClients.length} active ${activeClients.length === 1 ? 'business' : 'businesses'}</strong>. Switch into any account to review its activity and health.</p></div><div class="portfolio-hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="orbit-star star-one">✦</span><span class="orbit-star star-two">✧</span><div class="orbit-core">N</div><span class="orbit-node node-one">₹</span><span class="orbit-node node-two">↗</span></div></section><section class="portfolio-summary"><div><span>Active clients</span><strong>${activeClients.length}</strong><small>managed by you</small></div><div><span>Portfolio revenue</span><strong>${rupees(portfolioRevenue, true)}</strong><small>this reporting period</small></div><div><span>Portfolio net profit</span><strong class="${portfolioProfit >= 0 ? 'positive' : 'negative'}">${rupees(portfolioProfit, true)}</strong><small>across active clients</small></div><div><span>Average health score</span><strong>${avgScore}<small>/100</small></strong><small>client average</small></div></section><section class="portfolio-section-head"><div><h2>Your clients <span>${clients.length}</span></h2><p>Each client has a separate dashboard and transaction ledger.</p></div><button class="text-button" id="addClientSecondary">＋ Add another client</button></section><section class="client-grid">${cards || '<div class="empty-state"><span>♙</span><strong>No client accounts yet</strong><p>Add your first client to begin tracking their business.</p></div>'}</section><div class="portfolio-note"><span>🔒</span> Each client has a separate ledger in this browser. This prototype has no sign-in or shared database.</div>${footer()}`;
}
function renderAccounts() {
  const active = clients.filter((client) => !client.archived);
  const archived = clients.filter((client) => client.archived);
  const rows = clients.map((client) => {
    const records = loadClientTransactions(client.id);
    const stats = businessStats(records.filter((t) => inRange(t)), records, client.openingCash || 0);
    const lastActivity = records.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
    return `<tr><td><div class="account-name-cell"><span class="account-avatar">${escapeHTML(client.name.slice(0,1).toUpperCase())}</span><div><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.industry || 'Business')}</small></div></div></td><td>${escapeHTML(client.companyName || client.name)}</td><td>${escapeHTML(client.contactName || '—')}</td><td>${escapeHTML(client.email || '—')}</td><td><span class="account-state ${client.archived ? 'is-archived' : 'is-active'}">${client.archived ? 'Archived' : 'Active'}</span></td><td class="align-right account-revenue">${rupees(stats.revenue, true)}</td><td>${lastActivity ? new Date(`${lastActivity}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'No activity'}</td><td><div class="account-row-actions">${client.archived ? '' : `<button data-open-client="${escapeHTML(client.id)}">Open</button>`}<button data-edit-client="${escapeHTML(client.id)}">Edit</button><button data-client-action="${client.archived ? 'restore' : 'archive'}" data-client-id="${escapeHTML(client.id)}">${client.archived ? 'Restore' : 'Archive'}</button></div></td></tr>`;
  }).join('');
  return `${heading('Accounts', 'Manage client account names, company details, and dashboard access.', '<button class="button-primary" id="addClient"><span>＋</span> Add account</button>')}<section class="account-summary-strip"><div><strong>${active.length}</strong><span>Active accounts</span></div><div><strong>${archived.length}</strong><span>Archived accounts</span></div><div><strong>${clients.filter((c) => c.email || c.contactName).length}</strong><span>With contact details</span></div></section><section class="account-table-panel panel"><div class="panel-heading"><div><h3>Client accounts</h3><p>Business profiles and account activity in one place.</p></div><span class="account-table-count">${clients.length} total</span></div><div class="table-scroll"><table class="data-table accounts-table"><thead><tr><th>ACCOUNT</th><th>COMPANY NAME</th><th>CONTACT</th><th>EMAIL</th><th>STATUS</th><th class="align-right">REVENUE</th><th>LAST ACTIVITY</th><th>ACTIONS</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No accounts yet.</td></tr>'}</tbody></table></div></section><section class="account-help"><span>✦</span><div><strong>Keep client records complete</strong><p>Add a primary contact and business email to make each account easier to identify and manage. Each account retains its own transaction ledger.</p></div></section>${footer()}`;
}

function transactionsTable(rows, controls = true) {
  if (!rows.length) return '<div class="empty-state"><span>⇄</span><strong>No transactions yet</strong><p>Add a transaction or import your CSV to see your business activity here.</p></div>';
  return `<div class="table-scroll"><table class="data-table"><thead><tr><th>TRANSACTION</th><th>DATE</th><th>CATEGORY</th><th>TYPE</th><th class="align-right">AMOUNT</th>${controls ? '<th></th>' : ''}</tr></thead><tbody>${rows.map((t) => `<tr><td><strong>${escapeHTML(t.description)}</strong></td><td>${new Date(`${t.date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span class="category-chip">${escapeHTML(t.category)}</span></td><td><span class="type-chip ${t.type}">${t.type === 'income' ? 'Income' : 'Expense'}</span></td><td class="align-right amount ${t.type}">${t.type === 'income' ? '+' : '−'}${rupees(t.amount)}</td>${controls ? `<td><button class="delete-transaction" data-delete="${escapeHTML(t.id)}" aria-label="Delete ${escapeHTML(t.description)}">×</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function renderOverview() {
  const stats = businessStats();
  const recent = [...currentTransactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const status = stats.score >= 75 ? 'Looking healthy' : stats.score >= 55 ? 'Some areas need attention' : 'Needs attention';
  const margin = stats.margin.toFixed(1);
  return `${heading('Your business at a glance', 'A live view of your business activity and financial health.', '<button class="button-primary" id="addTransaction"><span>＋</span> Add transaction</button>')}
    <section class="score-banner"><div class="score-orb"><svg viewBox="0 0 120 120"><circle class="score-track" cx="60" cy="60" r="49"/><circle class="score-progress" cx="60" cy="60" r="49" style="stroke-dashoffset:${307.9 * (1 - stats.score / 100)}"/></svg><div class="score-number"><strong>${stats.score}</strong><small>/ 100</small></div></div><div class="score-copy"><div class="score-title-row"><span class="status-pill"><i></i> ${status}</span><span class="score-change">${stats.growth === null ? 'No prior-period comparison' : `${stats.growth >= 0 ? '↑' : '↓'} ${Math.abs(stats.growth).toFixed(1)}% revenue change`}</span></div><h2>${stats.profit >= 0 ? 'You’re building on solid ground.' : 'Let’s take a closer look at expenses.'}</h2><p>Your numbers are calculated from ${currentTransactions().length} transactions saved in this browser. Add or import transactions to update your dashboard.</p></div><div class="score-details"><div><span>Net profit</span><strong class="positive">${rupees(stats.profit, true)}</strong></div><div><span>Profit margin</span><strong>${margin}<small>%</small></strong></div><button class="subtle-button" id="scoreDetails">How we score this <span>→</span></button></div></section>
    <section class="metrics-grid">${metric('Revenue', rupees(stats.revenue), `${stats.growth === null ? 'Add history to compare' : `${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`}`, '↗')}${metric('Operating expenses', rupees(stats.expenses), `${stats.expenses ? 'tracked' : 'add data'}`, '↘', 'cash')}${metric('Net profit margin', `${margin}%`, stats.margin >= 15 ? 'Healthy' : 'Needs focus', '◒', 'profit')}${metric('Cash balance¹', rupees(stats.cash, true), `${stats.runway.toFixed(1)} months est.`, '◷', 'retention')}</section>
    <section class="content-grid">${panel('Revenue and expenses', 'Current reporting period · INR', `<div class="chart-legend"><span><i class="legend-current"></i> Revenue</span><span><i class="legend-previous"></i> Expenses</span><strong>${rupees(stats.revenue, true)} <small>revenue</small></strong></div>${barChart(stats)}`)}${panel('Business health signals', 'Based on your saved transaction data', `<div class="signal-list"><div class="signal-row"><span class="signal-icon good">↗</span><div class="signal-copy"><strong>${stats.profit >= 0 ? 'You’re profitable this period' : 'Expenses exceed revenue'}</strong><span>${rupees(Math.abs(stats.profit))} ${stats.profit >= 0 ? 'left after expenses.' : 'more expenses than revenue.'}</span></div></div><div class="signal-row"><span class="signal-icon watch">◷</span><div class="signal-copy"><strong>${stats.runway >= 3 ? 'Cash buffer looks steady' : 'Cash buffer needs attention'}</strong><span>Estimated runway ${stats.runway.toFixed(1)} months, based on this period.</span></div></div><div class="signal-row"><span class="signal-icon good">▧</span><div class="signal-copy"><strong>Income sources</strong><span>${new Set(currentTransactions().filter((t) => t.type === 'income').map((t) => t.category)).size} categories recorded this period.</span></div></div></div>`)}</section>
    <section class="bottom-grid">${panel('Recent transactions', 'Your latest business activity', transactionsTable(recent, false), '<button class="link-button" data-go="transactions">View all <span>→</span></button>')}${panel('Quick actions', 'Keep your numbers up to date', '<div class="quick-actions"><button class="quick-action" id="addTransaction2"><span>＋</span><strong>Add transaction</strong><small>Record income or expense</small></button><button class="quick-action" id="uploadButtonQuick"><span>↑</span><strong>Import a CSV</strong><small>Bring in your spreadsheet</small></button><button class="quick-action" id="exportCsv"><span>↓</span><strong>Export data</strong><small>Download your transactions</small></button></div>')}</section>
    ${footer()}`;
}
function barChart(stats) {
  const rev = Math.max(10, stats.revenue);
  const exp = Math.max(0, stats.expenses);
  const cap = Math.max(rev, exp) * 1.15;
  const revHeight = Math.max(2, rev / cap * 100);
  const expHeight = Math.max(2, exp / cap * 100);
  return `<div class="comparison-bars"><div class="bar-col"><span>${rupees(stats.revenue, true)}</span><div class="bar-track"><i class="bar-revenue" style="height:${revHeight}%"></i></div><small>Revenue</small></div><div class="bar-col"><span>${rupees(stats.expenses, true)}</span><div class="bar-track"><i class="bar-expenses" style="height:${expHeight}%"></i></div><small>Expenses</small></div><div class="bar-col"><span>${rupees(stats.profit, true)}</span><div class="bar-track"><i class="bar-profit" style="height:${Math.max(2, Math.abs(stats.profit) / cap * 100)}%"></i></div><small>Net profit</small></div></div>`;
}
function renderSales() {
  const income = currentTransactions().filter((t) => t.type === 'income');
  const total = sum(income, 'income');
  const grouped = Object.entries(income.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {})).sort((a, b) => b[1] - a[1]);
  return `${heading('Sales dashboard', 'Understand what you sell, who pays, and how income is moving.', '<button class="button-primary" id="addTransaction"><span>＋</span> Add sale</button>')}<section class="metrics-grid">${metric('Sales this period', rupees(total), `${income.length} transactions`, '↗')}${metric('Average sale', rupees(income.length ? total / income.length : 0), 'per transaction', '◉', 'profit')}${metric('Income categories', String(grouped.length), 'active categories', '▤', 'cash')}${metric('Largest category', grouped[0]?.[0] || '—', grouped.length ? rupees(grouped[0][1], true) : 'no data', '✦', 'retention')}</section><section class="content-grid">${panel('Income by category', 'How revenue is distributed', `<div class="category-bars">${grouped.map(([name, value]) => `<div class="category-bar-row"><div><span>${escapeHTML(name)}</span><strong>${rupees(value)}</strong></div><div class="wide-track"><i style="width:${total ? value / total * 100 : 0}%"></i></div></div>`).join('') || '<p class="empty-note">Add income transactions to see your sales breakdown.</p>'}`)}${panel('Recent sales', 'Income recorded in this period', transactionsTable(income.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), false))}</section>${footer()}`;
}
function renderCashflow() {
  const stats = businessStats();
  const netCashFlow = stats.profit;
  return `${heading('Cash flow dashboard', 'Track money coming in, money going out, and what remains.', '<button class="button-primary" id="addTransaction"><span>＋</span> Record cash flow</button>')}<section class="metrics-grid">${metric('Cash in', rupees(stats.revenue), `${currentTransactions().filter((t) => t.type === 'income').length} deposits`, '↗')}${metric('Cash out', rupees(stats.expenses), `${currentTransactions().filter((t) => t.type === 'expense').length} payments`, '↘', 'cash')}${metric('Net cash flow', rupees(stats.profit), stats.profit >= 0 ? 'Positive' : 'Negative', '◒', 'profit')}${metric('Estimated runway', `${stats.runway.toFixed(1)} months`, 'based on current activity', '◷', 'retention')}</section><section class="content-grid">${panel('Cash movement', 'Current period · Indian Rupees', barChart(stats))}${panel('Cash flow check', 'A simple view of your buffer', `<div class="cash-note"><div class="cash-note-icon">◷</div><strong>${stats.runway >= 3 ? 'Your current buffer is holding up.' : 'Consider building a stronger cash buffer.'}</strong><p>Net cash flow is <b>${rupees(netCashFlow)}</b> for this period. Estimated runway uses the recorded cash balance divided by average monthly expenses for the selected period; treat it as directional.</p><button class="link-button" data-go="transactions">Review transactions →</button></div>`)}</section>${panel('Recent cash movements', 'Income and expenses in this period', transactionsTable([...currentTransactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), false))}${footer()}`;
}
function renderTransactions() {
  let list = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (transactionFilter !== 'all') list = list.filter((t) => t.type === transactionFilter);
  if (searchQuery) list = list.filter((t) => `${t.description} ${t.category}`.toLowerCase().includes(searchQuery.toLowerCase()));
  return `${heading('Transactions', 'Record and review every rupee moving through your business.', '<button class="button-primary" id="addTransaction"><span>＋</span> Add transaction</button>')}<div class="transaction-toolbar"><div class="filter-tabs"><button data-filter="all" class="${transactionFilter === 'all' ? 'selected' : ''}">All</button><button data-filter="income" class="${transactionFilter === 'income' ? 'selected' : ''}">Income</button><button data-filter="expense" class="${transactionFilter === 'expense' ? 'selected' : ''}">Expenses</button></div><div class="table-actions"><input class="search-input" id="transactionSearch" placeholder="Search transactions" value="${escapeHTML(searchQuery)}"/><button class="button-secondary" id="uploadCSV">↑ Import CSV</button><button class="button-secondary" id="exportCsv">↓ Export</button><button class="button-secondary" id="resetDemo">Reset demo</button></div></div>${panel('All transactions', `${transactions.length} records · saved on this device`, transactionsTable(list))}${footer()}`;
}
function renderExpenses() {
  const expenses = currentTransactions().filter((t) => t.type === 'expense');
  const total = sum(expenses, 'expense');
  const groups = Object.entries(expenses.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + t.amount }), {})).sort((a, b) => b[1] - a[1]);
  return `${heading('Expenses dashboard', 'See where business spending goes and keep an eye on costs.', '<button class="button-primary" id="addExpense"><span>＋</span> Add expense</button>')}<section class="metrics-grid">${metric('Total expenses', rupees(total), `${expenses.length} transactions`, '↘', 'cash')}${metric('Largest category', groups[0]?.[0] || '—', groups[0] ? rupees(groups[0][1], true) : 'no data', '▤', 'profit')}${metric('Average expense', rupees(expenses.length ? total / expenses.length : 0), 'per transaction', '◒', 'retention')}${metric('Revenue coverage', `${total ? (sum(currentTransactions(), 'income') / total).toFixed(1) : '0.0'}×`, 'revenue to expenses', '↗')}</section><section class="content-grid">${panel('Spending by category', 'Current period', `<div class="category-bars">${groups.map(([name, value]) => `<div class="category-bar-row"><div><span>${escapeHTML(name)}</span><strong>${rupees(value)}</strong></div><div class="wide-track expense-track"><i style="width:${total ? value / total * 100 : 0}%"></i></div></div>`).join('') || '<p class="empty-note">Add expense transactions to see your cost breakdown.</p>'}`)}${panel('Recent expenses', 'Latest outgoing transactions', transactionsTable(expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), true))}</section>${footer()}`;
}
function renderCustomers() {
  const revenue = currentTransactions().filter((t) => t.type === 'income');
  const total = sum(revenue, 'income');
  const names = [...new Set(revenue.map((t) => t.description.replace(/.*—\s*/, '').replace(/.*project/i, 'Project customer')))].filter(Boolean);
  return `${heading('Customers dashboard', 'A lightweight view of customer income and relationship signals.', '<button class="button-primary" id="addTransaction"><span>＋</span> Record customer income</button>')}<section class="metrics-grid">${metric('Customer income', rupees(total), `${revenue.length} income entries`, '↗')}${metric('Active income sources', String(names.length || new Set(revenue.map((t) => t.category)).size), 'this period', '♙', 'profit')}${metric('Average income entry', rupees(revenue.length ? total / revenue.length : 0), 'per sale or invoice', '◒', 'cash')}${metric('Repeat income', String(revenue.filter((t) => t.category === 'Retainers').length), 'retainer payments', '♡', 'retention')}</section>${panel('Income entries', 'Transaction descriptions are used as the customer list in this demo', transactionsTable(revenue.slice().sort((a, b) => b.date.localeCompare(a.date)), false))}<div class="note-card"><strong>Want a real customer list?</strong><p>Import transaction data with customer names in the Description column. This prototype groups by income entries and does not store customer contact information.</p></div>${footer()}`;
}
function growthCoachReply(question) {
  const query = question.toLowerCase();
  const stats = businessStats();
  const rows = currentTransactions();
  const company = activeClient()?.companyName || activeClient()?.name || 'This business';
  const byCategory = (type) => Object.entries(rows.filter((t) => t.type === type).reduce((groups, t) => { const key = t.category || 'Uncategorised'; groups[key] = (groups[key] || 0) + Number(t.amount || 0); return groups; }, {})).sort((a, b) => b[1] - a[1]);
  const topCost = byCategory('expense')[0];
  const topSale = byCategory('income')[0];
  if (/cash|runway|balance|collect|payment|invoice/.test(query)) return `${company} has an estimated cash balance of ${rupees(stats.cash)} and about ${stats.runway.toFixed(1)} months of runway based on this period’s recorded expenses. Review cash in and out weekly, confirm upcoming bills, and agree deposits or milestone payments on new work. This estimate excludes unpaid invoices and liabilities.`;
  if (/expense|cost|spend|profit|margin|price|profitab/.test(query)) return `${company} recorded ${rupees(stats.revenue)} in revenue and ${rupees(stats.expenses)} in expenses this period, leaving ${rupees(stats.profit)} net at a ${stats.margin.toFixed(1)}% margin.${topCost ? ` The largest expense category is ${topCost[0]} (${rupees(topCost[1])}).` : ''} Review that cost for a specific scope, supplier, or process change, and check the impact on margin before expanding.`;
  if (/sale|revenue|customer|client|market|marketing|growth|more business|increase/.test(query)) return `${company} recorded ${rupees(stats.revenue)} in revenue across ${rows.filter((t) => t.type === 'income').length} income entries this period.${topSale ? ` ${topSale[0]} is the largest category (${rupees(topSale[1])}).` : ''} A low-risk next step is to offer one relevant add-on or renewal to existing customers, track paid conversions and gross profit, and scale only if the test works.`;
  if (!rows.length) return `I don’t have transaction data for ${company} in this period yet. Add a few months of income and expense records with categories, then ask again for a more grounded review.`;
  return `For ${company}, this period shows ${rupees(stats.revenue)} revenue, ${rupees(stats.expenses)} expenses, ${rupees(stats.profit)} net profit, and ${stats.margin.toFixed(1)}% margin. Estimated cash runway is ${stats.runway.toFixed(1)} months. What to prioritize depends on your question: review costs if margin is tight, protect collections if runway is short, or test one measured sales offer if cash is steady.`;
}

function renderInsights() {
  const stats = businessStats();
  const rows = currentTransactions();
  const income = rows.filter((t) => t.type === 'income');
  const expenses = rows.filter((t) => t.type === 'expense');
  const groupByCategory = (items) => Object.entries(items.reduce((out, item) => { out[item.category || 'Uncategorised'] = (out[item.category || 'Uncategorised'] || 0) + Number(item.amount || 0); return out; }, {})).sort((a, b) => b[1] - a[1]);
  const costLeader = groupByCategory(expenses)[0];
  const incomeLeader = groupByCategory(income)[0];
  const costShare = costLeader && stats.expenses ? Math.round(costLeader[1] / stats.expenses * 100) : 0;
  const salesShare = incomeLeader && stats.revenue ? Math.round(incomeLeader[1] / stats.revenue * 100) : 0;
  const company = activeClient()?.companyName || activeClient()?.name || 'This business';
  const recommendations = [];
  if (!rows.length || !stats.revenue) recommendations.push({ priority: 'Start here', title: 'Build a reliable baseline', evidence: 'There is not enough income data in this period to identify a dependable growth opportunity.', action: 'Record income and expenses consistently for the next 4–8 weeks. Include the service or sales category and payment date so the next review can show what is actually working.' });
  if (stats.profit < 0) recommendations.push({ priority: 'High priority', title: 'Protect cash before scaling', evidence: `Recorded expenses are ${rupees(Math.abs(stats.profit))} higher than revenue this period.`, action: `Review ${costLeader ? `${costLeader[0]} (${rupees(costLeader[1])})` : 'recurring costs'} line by line. Pause only costs that cannot be linked to delivery, retention, or measurable sales; agree a weekly cash check before adding new commitments.` });
  else if (stats.margin < 20 && stats.revenue) recommendations.push({ priority: 'High priority', title: 'Improve the margin on current work', evidence: `Current period profit margin is ${stats.margin.toFixed(1)}%.${costLeader ? ` ${costLeader[0]} is ${costShare}% of recorded expenses.` : ''}`, action: `For the next month, price new work from delivery cost plus target margin, and review ${costLeader ? costLeader[0] : 'the largest cost category'} for a supplier, scope, or process improvement. Track the result before making broader changes.` });
  else if (stats.revenue) recommendations.push({ priority: 'Growth opportunity', title: 'Run one measured growth experiment', evidence: `The business retained ${rupees(stats.profit)} this period at a ${stats.margin.toFixed(1)}% margin.`, action: 'Choose one offer to test with existing customers—such as a renewal, add-on, or referral offer. Set a small budget and a success measure (paid conversions and gross profit), then continue only if the numbers improve.' });
  if (stats.runway < 3) recommendations.push({ priority: 'High priority', title: 'Shorten the cash conversion cycle', evidence: `Estimated runway is ${stats.runway.toFixed(1)} months using the recorded cash balance and current expenses.`, action: 'Review upcoming bills and expected collections every week. Send payment reminders promptly, agree deposits or milestone billing for new work, and update the opening cash balance so the estimate is useful.' });
  else recommendations.push({ priority: 'Steady progress', title: 'Keep a cash buffer while investing', evidence: `Estimated runway is ${stats.runway.toFixed(1)} months based on the saved ledger.`, action: 'Set a minimum cash reserve appropriate to payroll and fixed costs. Fund growth tests only from cash above that reserve, and compare their cost with the extra gross profit they generate.' });
  if (salesShare >= 65 && income.length > 1) recommendations.push({ priority: 'Medium priority', title: 'Reduce reliance on one income category', evidence: `${incomeLeader[0]} accounts for about ${salesShare}% of recorded income this period.`, action: 'Ask repeat customers what adjacent need they would pay for, then pilot one related service or package with a few customers before investing in a full launch.' });
  else if (income.length && incomeLeader) recommendations.push({ priority: 'Medium priority', title: 'Repeat the strongest sales pattern', evidence: `${incomeLeader[0]} is currently the largest income category at ${rupees(incomeLeader[1])}.`, action: 'Review the customers and offer behind this category. Document how leads arrived and what converted, then repeat that approach for a small, trackable batch of prospects.' });
  const plan = recommendations.slice(0, 3);
  const roadmap = [
    { period: 'Days 1–30', title: 'Set the baseline', body: 'Update transactions weekly, confirm the cash opening balance, and choose one outcome to improve (profit, cash collection, or qualified sales).' },
    { period: 'Days 31–60', title: 'Test one change', body: plan[0]?.action || 'Run one small offer or process experiment and record its cost, conversions, and gross profit.' },
    { period: 'Days 61–90', title: 'Keep what proves out', body: 'Compare the result with the baseline. Repeat or carefully expand only if extra gross profit and cash collection justify the effort.' },
  ];
  const messages = coachConversations[activeClientID] || [];
  return `${heading('AI growth plan', `A practical plan for ${escapeHTML(company)}, based on the transactions entered for this period.`, '<button class="button-secondary" id="exportCsv">↓ Export data</button>')}<section class="growth-plan-banner"><div><span class="growth-plan-kicker">NORTHSTAR GROWTH COACH · ${rows.length} TRANSACTIONS REVIEWED</span><h2>Make the next growth move measurable.</h2><p>Growth is not guaranteed. These suggestions focus on improving profit and sustainable sales before scaling spend.</p></div><div class="growth-plan-stat"><strong>${stats.margin.toFixed(1)}%</strong><span>current profit margin</span><small>${rupees(stats.profit)} net this period</small></div></section><section class="growth-recommendations"><div class="growth-section-title"><div><span class="growth-plan-kicker">PERSONALISED ACTIONS</span><h2>What ${escapeHTML(company)} can do next</h2></div><span class="growth-data-label">Based on current period data</span></div><div class="growth-card-grid">${plan.map((item, i) => `<article class="growth-action-card"><div class="growth-action-top"><span class="growth-action-number">0${i + 1}</span><span class="growth-priority">${escapeHTML(item.priority)}</span></div><h3>${escapeHTML(item.title)}</h3><p class="growth-evidence">${escapeHTML(item.evidence)}</p><div class="growth-action-step"><strong>Suggested next step</strong><p>${escapeHTML(item.action)}</p></div></article>`).join('')}</div></section><section class="roadmap-section"><div class="growth-section-title"><div><span class="growth-plan-kicker">90-DAY ROADMAP</span><h2>Turn insights into a simple plan</h2></div></div><div class="growth-roadmap">${roadmap.map((step, i) => `<article class="roadmap-step"><span class="roadmap-dot">0${i + 1}</span><div><span>${step.period}</span><h3>${step.title}</h3><p>${escapeHTML(step.body)}</p></div></article>`).join('')}</div></section><section class="coach-panel"><div class="coach-heading"><div><span class="growth-plan-kicker">NORTHSTAR GROWTH COACH</span><h2>Ask a question about ${escapeHTML(company)}</h2><p>Get a quick answer grounded in this client’s saved transactions.</p></div><button type="button" class="coach-clear" id="clearCoach" ${messages.length ? '' : 'disabled'}>Clear chat</button></div><div class="coach-messages" id="coachMessages" role="log" aria-live="polite">${messages.length ? messages.map((message) => `<div class="coach-message ${message.role}"><span>${message.role === 'assistant' ? 'Northstar coach' : 'You'}</span><p>${escapeHTML(message.text)}</p></div>`).join('') : `<div class="coach-welcome"><span>✦</span><div><strong>Hi! I can help you think through the numbers.</strong><p>Try asking about cash flow, costs, profit, or ways to grow sales.</p></div></div>`}</div><div class="coach-prompts"><button type="button" data-coach-prompt="How can I increase sales?">How can I increase sales?</button><button type="button" data-coach-prompt="How can I improve profit?">How can I improve profit?</button><button type="button" data-coach-prompt="How much cash runway do I have?">How much cash runway do I have?</button></div><form id="coachForm" class="coach-form"><label class="sr-only" for="coachQuestion">Ask the growth coach</label><input id="coachQuestion" name="question" maxlength="300" placeholder="Ask about sales, costs, cash flow…" required/><button class="button-primary" type="submit">Ask coach <span>→</span></button></form><p class="coach-disclosure">Local demo assistant · Answers use simple rules and transaction totals, not a connected AI model. Suggestions are informational.</p></section><div class="note-card"><strong>How this plan is generated</strong><p>These recommendations are produced by transparent rules in your browser using ${rows.length} recorded transactions. No external AI service is connected and your data is not sent elsewhere. Suggestions are directional, cannot guarantee business results, and are not financial, tax, or accounting advice.</p></div>${footer()}`;
}
function renderBenchmarks() {
  const stats = businessStats();
  const benchmarks = [{ label: 'Net profit margin', actual: `${stats.margin.toFixed(1)}%`, reference: '15%', score: Math.max(0, Math.min(100, stats.margin / 25 * 100)) }, { label: 'Revenue per expense rupee', actual: `${stats.expenses ? (stats.revenue / stats.expenses).toFixed(2) : '0.00'}×`, reference: '1.20×', score: Math.min(100, stats.expenses ? stats.revenue / stats.expenses / 1.8 * 100 : 0) }, { label: 'Income source diversity', actual: String(new Set(currentTransactions().filter((t) => t.type === 'income').map((t) => t.category)).size), reference: '3 categories', score: Math.min(100, new Set(currentTransactions().filter((t) => t.type === 'income').map((t) => t.category)).size / 3 * 100) }];
  return `${heading('Benchmarks', 'Compare your current signals with simple reference points.', '')}<div class="note-card"><strong>Benchmarks are directional</strong><p>These are general reference values for demonstration. Your industry, business model, location, and stage can change what “healthy” means.</p></div><section class="benchmark-list">${benchmarks.map((b) => `<article class="panel benchmark-row"><div><h3>${b.label}</h3><p>Your result <strong>${b.actual}</strong> <span>Reference ${b.reference}</span></p></div><div class="wide-track"><i style="width:${b.score}%"></i></div></article>`).join('')}</section>${footer()}`;
}
function renderSettings() {
  return `${heading('Settings', 'Manage your local admin workspace and client account.', '')}<section class="content-grid">${panel('Workspace', 'Current client account', `<div class="settings-list"><div><span>Client name</span><strong>${escapeHTML(activeClient().name)}</strong></div><div><span>Industry</span><strong>${escapeHTML(activeClient().industry || 'Business')}</strong></div><div><span>Currency</span><strong>Indian Rupee (₹ INR)</strong></div><div><span>Starting cash assumption</span><strong>${rupees(activeClient().openingCash || 0)}</strong></div><div><span>Client accounts</span><strong>${clients.filter((item) => !item.archived).length} active</strong></div></div>`)}${panel('Administrator profile', 'Your name and contact details', `<div class="settings-list"><div><span>Name</span><strong>${escapeHTML(adminProfile.name || 'Admin User')}</strong></div><div><span>Role</span><strong>${escapeHTML(adminProfile.role || 'Administrator')}</strong></div><div><span>Email</span><strong>${escapeHTML(adminProfile.email || 'Not added')}</strong></div></div><div class="profile-actions"><button class="button-secondary" id="editProfile">Edit profile</button><button class="logout-button" id="logoutButton">Log out</button></div>`)}${panel('Sample data', 'Restore this client’s starting transactions', '<p class="settings-copy">Changes you make are saved in this browser. Restore the original Acme sample data, or clear transactions for a client you added.</p><button class="button-secondary" id="resetDemo">Reset this client’s transactions</button>')}</section><div class="note-card"><strong>Privacy</strong><p>Each client’s transactions are stored separately in this browser and are not sent to a server. Clearing site data will remove saved transactions.</p></div>${footer()}`;
}
function footer() {
  const importAction = currentView === 'clients' ? '' : '<button id="uploadButton">↑ Upload a CSV</button><input type="file" id="csvInput" accept=".csv,text/csv" hidden />';
  return `<footer class="page-footer"><span>Northstar gives you a clearer picture, not financial advice.</span>${importAction}</footer>`;
}
function renderView(view) {
  const renderers = { intro: renderIntro, clientreport: renderClientReport, clients: renderClients, accounts: renderAccounts, overview: renderOverview, sales: renderSales, cashflow: renderCashflow, transactions: renderTransactions, expenses: renderExpenses, customers: renderCustomers, insights: renderInsights, benchmarks: renderBenchmarks, settings: renderSettings };
  return (renderers[view] || renderOverview)();
}

function bindViewActions() {
  const period = document.querySelector('#periodSelect');
  if (period) {
    try { period.value = sessionStorage.getItem('northstar-period') || 'month'; } catch { period.value = 'month'; }
    period.addEventListener('change', (e) => { try { sessionStorage.setItem('northstar-period', e.target.value); } catch {} setView(currentView); });
  }
  document.querySelectorAll('#addTransaction, #addTransaction2, #addExpense').forEach((button) => button.addEventListener('click', () => openTransactionForm(button.id === 'addExpense' ? 'expense' : 'income')));
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.go)));
  document.querySelectorAll('[data-open-client]').forEach((button) => button.addEventListener('click', () => switchClient(button.dataset.openClient)));
  document.querySelectorAll('[data-edit-client]').forEach((button) => button.addEventListener('click', () => openClientForm(button.dataset.editClient)));
  document.querySelectorAll('[data-client-action]').forEach((button) => button.addEventListener('click', () => updateClientArchive(button.dataset.clientId, button.dataset.clientAction === 'archive')));
  document.querySelectorAll('#addClient, #addClientSecondary').forEach((button) => button.addEventListener('click', openClientForm));
  document.querySelectorAll('#introAdmin, #introAdminTop, #introAdminBottom').forEach((button) => button.addEventListener('click', () => setView('clients')));
  document.querySelectorAll('#introClient, #introClientBottom').forEach((button) => button.addEventListener('click', () => setView('clientreport')));
  document.querySelectorAll('#returnToAdmin, #returnToAdminBottom').forEach((button) => button.addEventListener('click', () => setView('clients')));
  document.querySelector('#reportBrand')?.addEventListener('click', (event) => { event.preventDefault(); setView('intro'); });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { transactionFilter = button.dataset.filter; setView('transactions'); }));
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => {
    const item = transactions.find((t) => t.id === button.dataset.delete);
    if (!item) return;
    transactions = transactions.filter((t) => t.id !== item.id);
    saveTransactions();
    setView(currentView);
    notify('Transaction deleted.');
  }));
  const search = document.querySelector('#transactionSearch');
  if (search) search.addEventListener('input', (e) => { searchQuery = e.target.value; const cursor = e.target.selectionStart; setView('transactions'); const next = document.querySelector('#transactionSearch'); next.focus(); next.setSelectionRange(cursor, cursor); });
  document.querySelectorAll('#uploadButton, #uploadButtonQuick, #uploadCSV').forEach((button) => button.addEventListener('click', () => document.querySelector('#csvInput')?.click()));
  document.querySelectorAll('#exportCsv').forEach((button) => button.addEventListener('click', exportTransactions));
  document.querySelector('#resetDemo')?.addEventListener('click', () => {
    transactions = activeClientID === 'acme-studio' ? cloneStarterTransactions() : [];
    saveTransactions();
    transactionFilter = 'all'; searchQuery = '';
    setView(currentView);
    notify(activeClientID === 'acme-studio' ? 'Sample transactions restored.' : 'This client’s transactions were cleared.');
  });
  const input = document.querySelector('#csvInput');
  if (input) input.addEventListener('change', handleCSV);
  const score = document.querySelector('#scoreDetails');
  if (score) score.addEventListener('click', () => showModal('How your score works', '<p>The score uses the transactions recorded in this browser. It combines profitability, revenue movement, and whether you have recorded income and expenses.</p><p>It is a demo indicator, not a credit score, accounting assessment, or financial advice. Add complete and accurate data for a more useful snapshot.</p>'));
  document.querySelector('#editProfile')?.addEventListener('click', openProfileEditor);
  document.querySelector('#logoutButton')?.addEventListener('click', confirmLogout);
  document.querySelectorAll('[data-coach-prompt]').forEach((button) => button.addEventListener('click', () => {
    const input = document.querySelector('#coachQuestion');
    if (input) { input.value = button.dataset.coachPrompt; input.focus(); }
  }));
  document.querySelector('#coachForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#coachQuestion');
    const question = input?.value.trim();
    if (!question) return;
    const conversation = coachConversations[activeClientID] || (coachConversations[activeClientID] = []);
    conversation.push({ role: 'user', text: question }, { role: 'assistant', text: growthCoachReply(question) });
    setView('insights');
    document.querySelector('#coachMessages')?.scrollTo({ top: 99999, behavior: 'smooth' });
  });
  document.querySelector('#clearCoach')?.addEventListener('click', () => {
    coachConversations[activeClientID] = [];
    setView('insights');
  });
}

function openProfileEditor() {
  if (modal.open) modal.close();
  showModal('Edit administrator profile', `<form id="profileForm" class="transaction-form"><p class="form-intro">These details personalize your workspace. Your profile is saved in this browser.</p><label>Display name<input name="name" required maxlength="60" value="${escapeHTML(adminProfile.name || '')}" placeholder="Your name"/></label><label>Role<input name="role" required maxlength="50" value="${escapeHTML(adminProfile.role || 'Administrator')}" placeholder="Administrator"/></label><label>Email address (optional)<input name="email" type="email" maxlength="100" value="${escapeHTML(adminProfile.email || '')}" placeholder="you@company.com"/></label><div class="form-actions"><button type="button" class="logout-button" id="modalLogout">Log out</button><button type="button" class="button-secondary" id="cancelProfile">Cancel</button><button type="submit" class="button-primary">Save profile</button></div></form>`);
  document.querySelector('#cancelProfile').addEventListener('click', () => modal.close());
  document.querySelector('#modalLogout').addEventListener('click', confirmLogout);
  document.querySelector('#profileForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    adminProfile = { name: String(values.get('name')).trim(), role: String(values.get('role')).trim(), email: String(values.get('email')).trim() };
    saveProfile();
    refreshProfile();
    modal.close();
    if (currentView === 'settings') setView('settings');
    notify('Profile updated.');
  });
}

function confirmLogout() {
  if (modal.open) modal.close();
  showModal('Log out of Northstar?', '<p>You’ll return to the welcome page. This prototype has no sign-in protection; your client accounts and profile remain saved in this browser.</p><div class="form-actions"><button class="button-secondary" id="cancelLogout">Stay here</button><button class="logout-button" id="confirmLogout">Log out</button></div>');
  document.querySelector('#cancelLogout').addEventListener('click', () => modal.close());
  document.querySelector('#confirmLogout').addEventListener('click', () => { modal.close(); setView('intro'); notify('You’re back at the welcome page. Your local data is still saved.'); });
}

function openClientForm(clientID = null) {
  if (modal.open) modal.close();
  const existing = clients.find((client) => client.id === clientID);
  const title = existing ? 'Edit client account' : 'Add a client account';
  showModal(title, `<form id="clientForm" class="transaction-form"><p class="form-intro">${existing ? 'Update the account name, company details, and primary contact.' : 'Create a separate account with its own dashboard and transaction records.'}</p><div class="form-row"><label>Account name<input name="name" required maxlength="60" value="${escapeHTML(existing?.name || '')}" placeholder="e.g. Bluebird Foods"/></label><label>Company name<input name="companyName" maxlength="80" value="${escapeHTML(existing?.companyName || existing?.name || '')}" placeholder="Registered company name"/></label></div><label>Industry or business type<input name="industry" maxlength="50" value="${escapeHTML(existing?.industry || '')}" placeholder="e.g. Food and beverage"/></label><div class="form-row"><label>Primary contact<input name="contactName" maxlength="60" value="${escapeHTML(existing?.contactName || '')}" placeholder="Contact name"/></label><label>Contact email<input name="email" type="email" maxlength="100" value="${escapeHTML(existing?.email || '')}" placeholder="name@business.com"/></label></div><label>Contact phone (optional)<input name="phone" type="tel" maxlength="30" value="${escapeHTML(existing?.phone || '')}" placeholder="Phone number"/></label><label>Opening cash balance (₹)<input name="openingCash" type="number" min="0" step="1" value="${Number(existing?.openingCash || 0)}"/></label><div class="form-actions"><button type="button" class="button-secondary" id="cancelClient">Cancel</button><button type="submit" class="button-primary">${existing ? 'Save account' : 'Create account'}</button></div></form>`);
  document.querySelector('#cancelClient').addEventListener('click', () => modal.close());
  document.querySelector('#clientForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    if (clients.some((client) => client.id !== clientID && client.name.toLowerCase() === name.toLowerCase() && !client.archived)) {
      notify('A client with that name already exists.');
      return;
    }
    const clientData = { name, companyName: String(form.get('companyName') || '').trim() || name, industry: String(form.get('industry') || '').trim() || 'Business', contactName: String(form.get('contactName') || '').trim(), email: String(form.get('email') || '').trim(), phone: String(form.get('phone') || '').trim(), openingCash: Number(form.get('openingCash') || 0) };
    if (existing) {
      Object.assign(existing, clientData);
      saveClients();
      modal.close();
      refreshWorkspace();
      setView(currentView === 'accounts' ? 'accounts' : 'clients');
      notify(`${existing.name} account updated.`);
      return;
    }
    const client = { id: makeID(), ...clientData, archived: false, createdAt: todayISO() };
    clients = [...clients, client];
    saveClients();
    activeClientID = client.id;
    transactions = [];
    saveTransactions();
    try { localStorage.setItem(ACTIVE_CLIENT_KEY, activeClientID); } catch {}
    modal.close();
    refreshWorkspace();
    setView('overview');
    notify(`${client.name} account created.`);
  });
}

function openClientSwitcher() {
  const options = clients.filter((client) => !client.archived).map((client) => `<button class="client-switch-option ${client.id === activeClientID ? 'is-current' : ''}" data-switch-client="${escapeHTML(client.id)}"><span class="client-avatar">${escapeHTML(client.name.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHTML(client.name)}</strong><small>${escapeHTML(client.industry || 'Business')}</small></span><span class="switch-check">${client.id === activeClientID ? '✓' : '→'}</span></button>`).join('');
  showModal('Switch client dashboard', `<div class="client-switch-list">${options || '<p class="empty-note">No active clients. Add a client to continue.</p>'}</div><button class="button-secondary switch-manage" id="switchManage">Manage client portfolio</button><button class="text-button switch-add" id="switchAdd">＋ Add a client</button>`);
  document.querySelectorAll('[data-switch-client]').forEach((button) => button.addEventListener('click', () => switchClient(button.dataset.switchClient)));
  document.querySelector('#switchManage').addEventListener('click', () => { modal.close(); setView('clients'); });
  document.querySelector('#switchAdd').addEventListener('click', openClientForm);
}

function updateClientArchive(clientID, archived) {
  const client = clients.find((item) => item.id === clientID);
  if (!client) return;
  if (archived && !client.archived && clients.filter((item) => !item.archived).length <= 1) {
    notify('Keep at least one client active.');
    return;
  }
  client.archived = archived;
  saveClients();
  if (archived && activeClientID === clientID) {
    const next = clients.find((item) => !item.archived);
    activeClientID = next.id;
    transactions = loadClientTransactions(next.id);
    try { localStorage.setItem(ACTIVE_CLIENT_KEY, activeClientID); } catch {}
    refreshWorkspace();
  }
  setView('clients');
  notify(archived ? `${client.name} archived. Its records are preserved.` : `${client.name} restored.`);
}

function openTransactionForm(type = 'income') {
  showModal(type === 'income' ? 'Add income transaction' : 'Add expense transaction', `<form id="transactionForm" class="transaction-form"><label>Description<input name="description" required maxlength="100" placeholder="e.g. Client invoice payment"/></label><div class="form-row"><label>Amount (₹)<input name="amount" type="number" min="1" step="0.01" required placeholder="25000"/></label><label>Type<select name="type"><option value="income" ${type === 'income' ? 'selected' : ''}>Income</option><option value="expense" ${type === 'expense' ? 'selected' : ''}>Expense</option></select></label></div><div class="form-row"><label>Category<input name="category" required maxlength="40" placeholder="Services, Payroll…"/></label><label>Date<input name="date" type="date" required value="${todayISO()}"/></label></div><div class="form-actions"><button type="button" class="button-secondary" id="cancelTransaction">Cancel</button><button type="submit" class="button-primary">Save transaction</button></div></form>`);
  document.querySelector('#cancelTransaction').addEventListener('click', () => modal.close());
  document.querySelector('#transactionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    transactions.unshift({ id: makeID(), description: form.get('description').trim(), amount: Number(form.get('amount')), category: form.get('category').trim(), date: form.get('date'), type: form.get('type') });
    saveTransactions();
    modal.close();
    setView(currentView);
    notify('Transaction saved on this device.');
  });
}

function exportTransactions() {
  const rows = [['Date', 'Description', 'Category', 'Type', 'Amount INR'], ...transactions.map((t) => [t.date, t.description, t.category, t.type, t.amount])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = 'northstar-transactions.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  notify('Your INR transactions were exported.');
}
async function handleCSV(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const rows = parseCSV(await file.text());
    const imported = rows.map((row) => {
      const amount = Number(String(row.amount || row.amountinr || row.revenue || row.expenses || '').replace(/[^0-9.-]/g, ''));
      if (!amount) return null;
      const typeText = String(row.type || '').toLowerCase();
      const expense = typeText.includes('expense') || (row.expenses && !row.revenue);
      return { id: makeID(), date: normalizeDate(row.date || row.transactiondate), description: row.description || row.transaction || 'Imported transaction', category: row.category || (expense ? 'Imported expense' : 'Imported income'), type: expense ? 'expense' : 'income', amount: Math.abs(amount) };
    }).filter(Boolean);
    if (!imported.length) throw new Error('No transactions found. Include Date, Description, Type, Category, and Amount columns.');
    transactions = [...imported, ...transactions];
    saveTransactions();
    setView(currentView);
    notify(`Imported ${imported.length} INR transactions.`);
  } catch (error) { notify(error.message || 'Could not read that CSV file.'); }
  finally { event.target.value = ''; }
}
function normalizeDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const splitLine = (line) => {
    const values = []; let value = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { values.push(value.trim()); value = ''; }
      else value += char;
    }
    values.push(value.trim()); return values;
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return lines.slice(1).map((line) => Object.fromEntries(splitLine(line).map((value, i) => [headers[i], value])));
}

document.querySelectorAll('.nav-item[data-view]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); setView(link.dataset.view); }));
document.querySelector('#brandHome').addEventListener('click', (event) => { event.preventDefault(); setView('intro'); });
document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#connectData').addEventListener('click', () => showModal('Import your transaction data', '<p>Use <strong>Upload a CSV</strong> to import transaction data. This version stores your transactions in this browser only and does not connect to a bank or accounting service.</p><p>For the importer, include <code>Date, Description, Type, Category, Amount</code>. Type should be Income or Expense and Amount is in Indian Rupees.</p>'));
document.querySelector('#workspaceSwitcher').addEventListener('click', openClientSwitcher);
document.querySelector('#profileButton').addEventListener('click', openProfileEditor);
document.querySelector('#profileAvatarTop').addEventListener('click', openProfileEditor);
document.querySelector('#shareSummary').addEventListener('click', () => {
  const stats = businessStats();
  const report = `${activeClient().companyName || activeClient().name} — Business Health\nRevenue: ${rupees(stats.revenue)}\nExpenses: ${rupees(stats.expenses)}\nNet profit: ${rupees(stats.profit)}\nProfit margin: ${stats.margin.toFixed(1)}%\nHealth score: ${stats.score}/100\n\nNorthstar gives you a clearer picture, not financial advice.`;
  if (navigator.share) navigator.share({ title: `${activeClient().companyName || activeClient().name} — Business Health`, text: report }).catch(() => {});
  else navigator.clipboard?.writeText(report).then(() => notify('Business summary copied.')).catch(() => notify('Summary ready to share.'));
});

refreshWorkspace();
refreshProfile();
setView('intro');
