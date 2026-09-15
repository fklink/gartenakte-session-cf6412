'use strict';
const APP_VERSION = '0.8.2', KEY = 'gartenakte_data', OLD_KEYS = ['gartenakte_1_0_0_data'];
let db = load();

const plotViewState = {
  search: '',
  wayId: '',
  supply: '',
  sort: 'number-asc'
};

function fresh() {
  return {
    schema: 4,
    appVersion: APP_VERSION,
    people: [],
    addresses: [],
    personAddresses: [],
    memberships: [],
    ways: [],
    plots: [],
    landParcels: [],
    plotLandParcels: [],
    leases: [],
    contractPartners: [],
    contracts: [],
    contractLinks: [],
    cases: [],
    events: [],
    attachments: [],
    inventory: [],
    lessors: [],
    landContracts: [],
    contractParcels: []
  };
}

function migrate(x) {
  if (!x) return fresh();

  if (x.schema === 4) {
    const n = Object.assign(fresh(), x, { schema: 4, appVersion: APP_VERSION });
    n.memberships = Array.isArray(n.memberships) ? n.memberships : [];
    n.contractPartners = Array.isArray(n.contractPartners) ? n.contractPartners : [];
    n.contracts = Array.isArray(n.contracts) ? n.contracts : [];
    n.contractLinks = Array.isArray(n.contractLinks) ? n.contractLinks : [];
    return n;
  }

  if (x.schema === 3) {
    const n = Object.assign(fresh(), x, {
      schema: 4,
      appVersion: APP_VERSION,
      memberships: [],
      contractPartners: [],
      contracts: [],
      contractLinks: []
    });

    const partnerMap = new Map();
    (x.lessors || []).forEach(l => {
      const id = l.id || uid();
      partnerMap.set(l.id, id);
      n.contractPartners.push({
        id,
        name: l.name || '',
        contact: l.contact || '',
        note: l.note || '',
        source: 'Migration 0.6.0'
      });
    });

    (x.landContracts || []).forEach(c => {
      n.contracts.push({
        id: c.id || uid(),
        type: 'Pachtvertrag',
        partnerId: partnerMap.get(c.lessorId) || '',
        contractNo: c.contractNo || '',
        start: c.start || '',
        end: c.end || '',
        noticePeriod: c.noticePeriod || '',
        status: (!c.end || c.end >= today()) ? 'aktiv' : 'beendet',
        note: c.note || '',
        documentName: c.documentName || '',
        documentType: c.documentType || '',
        documentData: c.documentData || ''
      });
    });

    (x.contractParcels || []).forEach(r => {
      n.contractLinks.push({
        id: r.id || uid(),
        contractId: r.contractId,
        targetType: 'Flurstück',
        targetId: r.landParcelId,
        note: r.note || ''
      });
    });

    n.leases.forEach(l => {
      l.status = l.status || ((!l.end || l.end >= today()) ? 'aktiv' : 'beendet');
      l.contractNo = l.contractNo || '';
      l.documentName = l.documentName || '';
      l.documentType = l.documentType || '';
      l.documentData = l.documentData || '';
    });

    return n;
  }

  if (x.schema === 2 || x.schema === 1) {
    const legacy = Object.assign({}, x, { schema: 3 });
    const n = migrate(legacy);
    if (x.schema === 1) {
      n.people.forEach(person => {
        if (person.street || person.zip || person.city) {
          const aid = uid();
          n.addresses.push({ id: aid, street: person.street || '', zip: person.zip || '', city: person.city || '', country: 'Deutschland', note: 'Aus älterer Version übernommen' });
          n.personAddresses.push({ id: uid(), personId: person.id, addressId: aid, validFrom: '', validTo: '', type: 'Postanschrift', note: '' });
          delete person.street;
          delete person.zip;
          delete person.city;
        }
      });
    }
    return n;
  }

  return fresh();
}

function load() {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return migrate(JSON.parse(current));
    for (const k of OLD_KEYS) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const n = migrate(JSON.parse(raw));
        localStorage.setItem(KEY, JSON.stringify(n));
        return n;
      }
    }
  } catch (e) {}
  return fresh();
}

function save() {
  db.appVersion = APP_VERSION;
  db.schema = 4;
  localStorage.setItem(KEY, JSON.stringify(db));
  render();
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString(); }
function byId(a, id) { return a.find(x => x.id === id); }
function personName(id) { const p = byId(db.people, id); return p ? [p.lastName, p.firstName].filter(Boolean).join(', ') : '–'; }
function addressText(id) { const a = byId(db.addresses, id); return a ? [a.street, [a.zip, a.city].filter(Boolean).join(' '), a.country && a.country !== 'Deutschland' ? a.country : ''].filter(Boolean).join(', ') : '–'; }
function wayName(id) { const w = byId(db.ways, id); return w ? w.name : '–'; }
function plotName(id) { const p = byId(db.plots, id); return p ? `Garten ${p.number}` : '–'; }
function landParcelName(id) { const f = byId(db.landParcels, id); return f ? [f.gemarkung && `Gem. ${f.gemarkung}`, f.flur && `Flur ${f.flur}`, f.number && `Flst. ${f.number}`].filter(Boolean).join(' · ') : '–'; }
function contractPartnerName(id) {
  const p = byId(db.contractPartners, id);
  return p ? p.name : '–';
}
function contractName(id) {
  const c = byId(db.contracts, id);
  return c ? [c.type, c.contractNo, contractPartnerName(c.partnerId)].filter(Boolean).join(' · ') : '–';
}
function membershipLabel(m) {
  return [m.type, m.status && m.status !== 'aktiv' ? `(${m.status})` : ''].filter(Boolean).join(' ');
}
function activeMembershipsForPerson(personId, date = today()) {
  return db.memberships.filter(m => m.personId === personId && m.status !== 'beendet' && (!m.start || m.start <= date) && (!m.end || m.end >= date));
}
function inventoryName(id) { const i = byId(db.inventory, id); return i ? [i.bmk, i.name].filter(Boolean).join(' · ') || i.type : '–'; }
function inventoryOptions(sel = '', types = []) {
  const filtered = types.length ? db.inventory.filter(i => types.includes(i.type)) : db.inventory;
  return opts(filtered, sel, i => `${i.type} · ${inventoryName(i.id)}`);
}
function pathPointCount(path) {
  return String(path || '').split(/\n+/).map(x => x.trim()).filter(Boolean).length;
}
function pathHelp() { return 'Eine Koordinate pro Zeile: Breitengrad, Längengrad – z. B. 51.5321, 9.9342'; }

function activeLeaseForPlot(plotId, date = today()) { return db.leases.find(l => l.plotId === plotId && l.status !== 'beendet' && (!l.start || l.start <= date) && (!l.end || l.end >= date)); }
function activeAddressForPerson(personId, date = today()) { const rel = db.personAddresses.find(r => r.personId === personId && (!r.validFrom || r.validFrom <= date) && (!r.validTo || r.validTo >= date)); return rel ? addressText(rel.addressId) : '–'; }
function addEvent(caseId, type, text, fromPersonId = '', toPersonId = '') { db.events.unshift({ id: uid(), caseId, at: now(), type, text, fromPersonId, toPersonId }); }
function isOpen(c) { return c.status !== 'Abgeschlossen'; }
function isOverdue(c) { return isOpen(c) && c.deadline && c.deadline < today(); }


const NAVIGATION = {
  dashboard: { group: 'Übersicht', page: '' },
  cases: { group: 'Vorgänge', page: '' },
  people: { group: 'Mitglieder & Personen', page: 'Personen' },
  addresses: { group: 'Mitglieder & Personen', page: 'Adressen' },
  memberships: { group: 'Mitglieder & Personen', page: 'Mitgliedschaften' },
  leases: { group: 'Mitglieder & Personen', page: 'Unterpachtverhältnisse' },
  contracts: { group: 'Verträge', page: 'Verträge & Partner' },
  plots: { group: 'Anlage & Inventar', page: 'Parzellen' },
  landparcels: { group: 'Anlage & Inventar', page: 'Flurstücke' },
  ways: { group: 'Anlage & Inventar', page: 'Wege' },
  gates: { group: 'Anlage & Inventar', page: 'Außentore' },
  panels: { group: 'Anlage & Inventar', page: 'Unterverteilungen' },
  valves: { group: 'Anlage & Inventar', page: 'Wasserschieber' },
  meters: { group: 'Anlage & Inventar', page: 'Zähler' },
  powerlines: { group: 'Anlage & Inventar', page: 'Stromleitungen' },
  waterlines: { group: 'Anlage & Inventar', page: 'Wasserleitungen' },
  backup: { group: 'System', page: 'Import & Export' }
};

function updateBreadcrumb(name) {
  const location = NAVIGATION[name] || { group: name, page: '' };
  const group = document.getElementById('breadcrumbGroup');
  const separator = document.getElementById('breadcrumbSeparator');
  const page = document.getElementById('breadcrumbPage');

  if (group) group.textContent = location.group;

  const hasPage = Boolean(location.page);
  if (separator) separator.hidden = !hasPage;
  if (page) {
    page.hidden = !hasPage;
    page.textContent = location.page;
  }
}
function closeMenu() {
  const drawer = document.getElementById('appDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const menuButton = document.getElementById('menuBtn');
  drawer?.classList.remove('open');
  backdrop?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
  backdrop?.setAttribute('aria-hidden', 'true');
  menuButton?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
}

function openMenu() {
  const drawer = document.getElementById('appDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const menuButton = document.getElementById('menuBtn');
  drawer?.classList.add('open');
  backdrop?.classList.add('open');
  drawer?.setAttribute('aria-hidden', 'false');
  backdrop?.setAttribute('aria-hidden', 'false');
  menuButton?.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
}

function tab(name) {
  document.querySelectorAll('main section').forEach(section => {
    section.classList.toggle('hidden', section.id !== name);
  });

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === name);
  });

  document.querySelectorAll('.desktop-menu').forEach(menu => {
    menu.classList.toggle('has-active', Boolean(menu.querySelector('[data-tab].active')));
    menu.removeAttribute('open');
  });

  updateBreadcrumb(name);
  closeMenu();
}

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => tab(button.dataset.tab));
});

document.getElementById('menuBtn')?.addEventListener('click', openMenu);
document.getElementById('drawerCloseBtn')?.addEventListener('click', closeMenu);
document.getElementById('drawerBackdrop')?.addEventListener('click', closeMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeMenu();
  }
});

// Sticky-Abstände werden in 0.7.9 bewusst statisch aus dem festen Desktop-Layout abgeleitet.
function opts(items, sel, label) { return '<option value="">– keine –</option>' + items.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(label(x))}</option>`).join(''); }
function personOptions(sel = '') { return opts(db.people, sel, p => personName(p.id)); }
function plotOptions(sel = '') { return opts(db.plots, sel, p => plotName(p.id)); }
function wayOptions(sel = '') { return opts(db.ways, sel, w => w.name); }
function addressOptions(sel = '') { return opts(db.addresses, sel, a => addressText(a.id)); }
function landParcelOptions(sel = '') { return opts(db.landParcels, sel, f => landParcelName(f.id)); }
function contractPartnerOptions(sel = '') { return opts(db.contractPartners, sel, p => p.name); }
function render() {
  renderDashboard();
  renderCases();
  renderPeople();
  renderAddresses();
  renderMemberships();
  renderLeases();
  renderContracts();
  renderPlots();
  renderLandParcels();
  renderWays();
  renderInventoryCategory('gates', 'Außentore', ['Außentor']);
  renderInventoryCategory('panels', 'Unterverteilungen', ['Unterverteilung']);
  renderInventoryCategory('valves', 'Wasserschieber', ['Schieber']);
  renderInventoryCategory('meters', 'Zähler', ['Wasserzähler', 'Stromzähler']);
  renderInventoryCategory('powerlines', 'Stromleitungen', ['Stromleitung']);
  renderInventoryCategory('waterlines', 'Wasserleitungen', ['Wasserleitung', 'Wasserstrang']);
  renderBackup();
  enhanceResponsiveTables();
}

function enhanceResponsiveTables() {
  document.querySelectorAll('table').forEach(table => {
    table.classList.add('data-table');

    if (!table.parentElement?.classList.contains('table-scroll')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }

    const headerCells = table.querySelectorAll('thead th');
    if (headerCells.length) {
      headerCells[headerCells.length - 1].classList.add('col-actions');
    }

    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length && !cells[cells.length - 1].hasAttribute('colspan')) {
        cells[cells.length - 1].classList.add('col-actions');
      }
    });
  });
}
function renderDashboard() {
  const open = db.cases.filter(isOpen);
  const overdue = open.filter(isOverdue);
  const activeMemberships = db.memberships.filter(m => m.status === 'aktiv' && (!m.end || m.end >= today()));
  const activeLeases = db.leases.filter(l => l.status !== 'beendet' && (!l.end || l.end >= today()));
  document.querySelector('#dashboard').innerHTML = `
    <div class="grid">
      <div class="card"><div class="muted">Personen</div><div class="metric">${db.people.length}</div></div>
      <div class="card"><div class="muted">Aktive Mitgliedschaften</div><div class="metric">${activeMemberships.length}</div></div>
      <div class="card"><div class="muted">Aktive Unterpachten</div><div class="metric">${activeLeases.length}</div></div>
      <div class="card"><div class="muted">Parzellen</div><div class="metric">${db.plots.length}</div></div>
      <div class="card"><div class="muted">Verträge</div><div class="metric">${db.contracts.length}</div></div>
      <div class="card"><div class="muted">Offene Vorgänge</div><div class="metric">${open.length}</div></div>
      <div class="card"><div class="muted">Frist überschritten</div><div class="metric ${overdue.length ? 'overdue' : ''}">${overdue.length}</div></div>
    </div>
    <div class="card" style="margin-top:14px"><h2>Fällige Vorgänge</h2>${caseTable(open.filter(c => isOverdue(c) || (c.followup && c.followup <= today())), false)}</div>`;
}
function renderPeople() {
  document.querySelector('#people').innerHTML = `
    <div class="actions"><button class="primary" onclick="editPerson()">+ Person</button></div>
    <div class="card wide"><table><thead><tr><th>Name</th><th>Mitglieds-Nr.</th><th>Mitgliedschaft</th><th>Aktuelle Anschrift</th><th>Unterpacht</th><th></th></tr></thead><tbody>
      ${db.people.map(p => {
        const ms = activeMembershipsForPerson(p.id);
        const ls = db.leases.filter(l => l.personId === p.id && l.status !== 'beendet' && (!l.end || l.end >= today()));
        return `<tr><td><b>${esc(personName(p.id))}</b></td><td>${esc(p.memberNo || '–')}</td><td>${ms.map(m => esc(membershipLabel(m))).join('<br>') || '–'}</td><td>${esc(activeAddressForPerson(p.id))}</td><td>${ls.map(l => esc(plotName(l.plotId))).join(', ') || '–'}</td><td><button onclick="editPerson('${p.id}')">Bearbeiten</button></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="muted">Noch keine Personen.</td></tr>'}
    </tbody></table></div>`;
}
function renderAddresses() { document.querySelector('#addresses').innerHTML = `<div class="actions"><button class="primary" onclick="editAddress()">+ Adresse</button><button onclick="editPersonAddress()">+ Person ↔ Adresse</button></div><div class="card wide"><h2>Adressstamm</h2><table><thead><tr><th>Adresse</th><th>Verknüpft mit</th><th></th></tr></thead><tbody>${db.addresses.map(a => `<tr><td><b>${esc(addressText(a.id))}</b><br><span class="subtle">${esc(a.note || '')}</span></td><td>${db.personAddresses.filter(r => r.addressId === a.id).map(r => `${esc(personName(r.personId))} <span class="subtle">(${esc(r.validFrom || '…')}–${esc(r.validTo || '…')})</span>`).join('<br>') || '–'}</td><td><button onclick="editAddress('${a.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Noch keine Adressen.</td></tr>'}</tbody></table></div><div class="card wide" style="margin-top:14px"><h2>Adresszuordnungen</h2><table><thead><tr><th>Person</th><th>Adresse</th><th>Art</th><th>Gültig von</th><th>Gültig bis</th><th></th></tr></thead><tbody>${db.personAddresses.map(r => `<tr><td>${esc(personName(r.personId))}</td><td>${esc(addressText(r.addressId))}</td><td>${esc(r.type || '')}</td><td>${esc(r.validFrom || '–')}</td><td>${esc(r.validTo || '–')}</td><td><button onclick="editPersonAddress('${r.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Zuordnungen.</td></tr>'}</tbody></table></div>`; }

function renderMemberships() {
  document.querySelector('#memberships').innerHTML = `
    <div class="actions"><button class="primary" onclick="editMembership()">+ Mitgliedschaft</button></div>
    <div class="card wide">
      <table><thead><tr><th>Person</th><th>Mitgliedsart</th><th>Beginn</th><th>Ende</th><th>Status</th><th></th></tr></thead><tbody>
      ${db.memberships.map(m => `<tr><td><b>${esc(personName(m.personId))}</b></td><td>${esc(m.type)}</td><td>${esc(m.start || '–')}</td><td>${esc(m.end || '–')}</td><td><span class="badge">${esc(m.status || 'aktiv')}</span></td><td><button onclick="editMembership('${m.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Mitgliedschaften.</td></tr>'}
      </tbody></table>
    </div>`;
}

function filteredPlots() {
  const search = plotViewState.search.trim().toLocaleLowerCase('de');
  let items = db.plots.filter(p => {
    const nameMatch = !search || [plotName(p.id), p.number, wayName(p.wayId), p.location]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase('de').includes(search));
    const wayMatch = !plotViewState.wayId || p.wayId === plotViewState.wayId;
    const supplyMatch = !plotViewState.supply
      || (plotViewState.supply === 'water' && p.waterAvailable && !p.electricityAvailable)
      || (plotViewState.supply === 'electricity' && !p.waterAvailable && p.electricityAvailable)
      || (plotViewState.supply === 'both' && p.waterAvailable && p.electricityAvailable)
      || (plotViewState.supply === 'none' && !p.waterAvailable && !p.electricityAvailable)
      || (plotViewState.supply === 'any-water' && p.waterAvailable)
      || (plotViewState.supply === 'any-electricity' && p.electricityAvailable);
    return nameMatch && wayMatch && supplyMatch;
  });

  items.sort((a, b) => {
    if (plotViewState.sort === 'number-desc') {
      return String(b.number).localeCompare(String(a.number), 'de', { numeric: true });
    }
    if (plotViewState.sort === 'way') {
      return wayName(a.wayId).localeCompare(wayName(b.wayId), 'de')
        || String(a.number).localeCompare(String(b.number), 'de', { numeric: true });
    }
    return String(a.number).localeCompare(String(b.number), 'de', { numeric: true });
  });

  return items;
}

function supplyIcon(type) {
  if (type === 'water') {
    return '<svg class="supply-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5c-2.5 3.4-6 7.1-6 11.1a6 6 0 0 0 12 0c0-4-3.5-7.7-6-11.1Zm0 15.4a4.3 4.3 0 0 1-4.3-4.3c0-2.7 2.2-5.5 4.3-8.3 2.1 2.8 4.3 5.6 4.3 8.3a4.3 4.3 0 0 1-4.3 4.3Z" fill="currentColor"/></svg>';
  }

  return '<svg class="supply-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.2 2 5.8 13h5.1L9.9 22 18.2 10.5h-5.3L13.2 2Z" fill="currentColor"/></svg>';
}

function plotSupplyHtml(p) {
  const items = [];

  if (p.waterAvailable) {
    items.push(`<span class="supply-item">${supplyIcon('water')}<span>Wasser</span></span>`);
  }

  if (p.electricityAvailable) {
    items.push(`<span class="supply-item">${supplyIcon('electricity')}<span>Strom</span></span>`);
  }

  return items.length ? `<span class="supply-list">${items.join('')}</span>` : '<span class="supply-empty">–</span>';
}

function plotTableRows(items) {
  if (!items.length) {
    return '<tr><td colspan="6" class="muted">Keine passenden Parzellen.</td></tr>';
  }

  return items.map(p => {
    const lease = activeLeaseForPlot(p.id);
    const coordinate = p.latitude && p.longitude ? `${esc(p.latitude)}, ${esc(p.longitude)}` : '–';
    return `<tr><td><b>${esc(plotName(p.id))}</b></td><td>${esc(wayName(p.wayId))}</td><td>${plotSupplyHtml(p)}</td><td>${coordinate}</td><td>${lease ? esc(personName(lease.personId)) : '–'}</td><td><button onclick="editPlot('${p.id}')">Bearbeiten</button></td></tr>`;
  }).join('');
}

function plotCards(items) {
  if (!items.length) {
    return '<div class="plot-empty muted">Keine passenden Parzellen.</div>';
  }

  return items.map(p => {
    const lease = activeLeaseForPlot(p.id);
    const coordinate = p.latitude && p.longitude ? `${esc(p.latitude)}, ${esc(p.longitude)}` : '';
    const way = wayName(p.wayId);
    return `
      <article class="plot-card">
        <div class="plot-card__head">
          <h3>${esc(plotName(p.id))}</h3>
          ${way && way !== '–' ? `<span class="plot-card__way">${esc(way)}</span>` : ''}
        </div>
        <dl class="plot-card__facts">
          <div><dt>Versorgung</dt><dd>${plotSupplyHtml(p)}</dd></div>
          ${coordinate ? `<div><dt>Koordinate</dt><dd>${coordinate}</dd></div>` : ''}
          ${lease ? `<div><dt>Unterpacht</dt><dd>${esc(personName(lease.personId))}</dd></div>` : ''}
        </dl>
        <div class="plot-card__actions">
          <button type="button" onclick="editPlot('${p.id}')">Bearbeiten</button>
        </div>
      </article>`;
  }).join('');
}

function updatePlotView() {
  const items = filteredPlots();
  const tbody = document.querySelector('#plotTableBody');
  const cards = document.querySelector('#plotCardList');
  const count = document.querySelector('#plotResultCount');
  if (tbody) tbody.innerHTML = plotTableRows(items);
  if (cards) cards.innerHTML = plotCards(items);
  if (count) count.textContent = `${items.length} von ${db.plots.length} Parzellen`;
  enhanceResponsiveTables();
}

function setPlotViewState(key, value) {
  plotViewState[key] = value;
  updatePlotView();
}

function renderPlots() {
  const items = filteredPlots();
  document.querySelector('#plots').innerHTML = `
    <div class="actions"><button class="primary" onclick="editPlot()">+ Parzelle</button><button onclick="editPlotLandParcel()">+ Flurstück zuordnen</button></div>

    <div class="plot-mobile-controls" aria-label="Parzellen suchen und filtern">
      <label class="plot-search">
        <span>Parzelle suchen</span>
        <input type="search" value="${esc(plotViewState.search)}" placeholder="z. B. Garten 82" oninput="setPlotViewState('search', this.value)">
      </label>
      <div class="plot-filter-grid">
        <label>
          <span>Weg</span>
          <select onchange="setPlotViewState('wayId', this.value)">
            <option value="">Alle Wege</option>
            ${[...db.ways].sort((a,b)=>a.name.localeCompare(b.name,'de')).map(w => `<option value="${w.id}" ${w.id === plotViewState.wayId ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Versorgung</span>
          <select onchange="setPlotViewState('supply', this.value)">
            <option value="" ${plotViewState.supply === '' ? 'selected' : ''}>Alle</option>
            <option value="both" ${plotViewState.supply === 'both' ? 'selected' : ''}>Strom + Wasser</option>
            <option value="any-water" ${plotViewState.supply === 'any-water' ? 'selected' : ''}>Mit Wasser</option>
            <option value="any-electricity" ${plotViewState.supply === 'any-electricity' ? 'selected' : ''}>Mit Strom</option>
            <option value="none" ${plotViewState.supply === 'none' ? 'selected' : ''}>Ohne Versorgung</option>
          </select>
        </label>
        <label>
          <span>Sortierung</span>
          <select onchange="setPlotViewState('sort', this.value)">
            <option value="number-asc" ${plotViewState.sort === 'number-asc' ? 'selected' : ''}>Nummer aufsteigend</option>
            <option value="number-desc" ${plotViewState.sort === 'number-desc' ? 'selected' : ''}>Nummer absteigend</option>
            <option value="way" ${plotViewState.sort === 'way' ? 'selected' : ''}>Weg, dann Nummer</option>
          </select>
        </label>
      </div>
      <div id="plotResultCount" class="plot-result-count">${items.length} von ${db.plots.length} Parzellen</div>
    </div>

    <div class="card wide plots-table-region">
      <table class="plot-table"><colgroup><col class="plot-col-parzelle"><col class="plot-col-weg"><col class="plot-col-versorgung"><col class="plot-col-koordinate"><col class="plot-col-unterpacht"><col class="plot-col-actions"></colgroup><thead><tr><th class="col-parzelle">Parzelle</th><th class="col-weg">Weg</th><th class="col-versorgung">Versorgung</th><th class="col-koordinate">Koordinate</th><th class="col-unterpacht">Unterpacht</th><th class="col-actions" aria-label="Aktion"></th></tr></thead><tbody id="plotTableBody">${plotTableRows(items)}</tbody></table>
    </div>

    <div id="plotCardList" class="plot-card-list">${plotCards(items)}</div>`;
}

function renderLandParcels() {
  document.querySelector('#landparcels').innerHTML = `
    <div class="actions"><button class="primary" onclick="editLandParcel()">+ Flurstück</button><button onclick="editPlotLandParcel()">+ Parzelle ↔ Flurstück</button></div>
    <div class="card wide"><table><thead><tr><th>Flurstück</th><th>Größe</th><th>Parzellen</th><th></th></tr></thead><tbody>
    ${db.landParcels.map(f => `<tr><td><b>${esc(landParcelName(f.id))}</b></td><td>${esc(f.area ? f.area + ' m²' : '–')}</td><td>${db.plotLandParcels.filter(r=>r.landParcelId===f.id).map(r=>esc(plotName(r.plotId))).join(', ') || '–'}</td><td><button onclick="editLandParcel('${f.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Noch keine Flurstücke.</td></tr>'}
    </tbody></table></div>`;
}

function renderWays() {
  document.querySelector('#ways').innerHTML = `
    <div class="actions"><button class="primary" onclick="editWay()">+ Weg</button></div>
    <div class="card wide"><table><thead><tr><th>Name</th><th>Koordinatenpfad</th><th>Parzellen</th><th>Notiz</th><th></th></tr></thead><tbody>
    ${db.ways.map(w => `<tr><td><b>${esc(w.name)}</b></td><td>${w.path ? `${pathPointCount(w.path)} Punkte` : '–'}</td><td>${db.plots.filter(p=>p.wayId===w.id).map(p=>esc(plotName(p.id))).join(', ') || '–'}</td><td>${esc(w.note || '')}</td><td><button onclick="editWay('${w.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Noch keine Wege.</td></tr>'}
    </tbody></table></div>`;
}

function renderInventory() {}

function renderInventoryCategory(sectionId, title, types) {
  const section = document.querySelector(`#${sectionId}`);
  if (!section) return;
  const items = db.inventory.filter(i => types.includes(i.type));
  section.innerHTML = `
    <div class="actions"><button class="primary" onclick="editInventory(null, '${esc(types[0])}')">+ ${esc(title.slice(0, -1) || 'Inventarobjekt')}</button></div>
    <div class="card wide"><table><thead><tr><th>Typ</th><th>BMK / Bezeichnung</th><th>Übergeordnet</th><th>Ort / Geometrie</th><th>Status</th><th>Parzellen</th><th></th></tr></thead><tbody>
    ${items.map(i => {
      const plots = db.plots.filter(p => [p.waterLineId,p.waterValveId,p.waterMeterId,p.electricPanelId,p.electricMeterId].includes(i.id)).map(p=>plotName(p.id));
      const geom = i.path ? `${pathPointCount(i.path)} Pfadpunkte` : (i.latitude && i.longitude ? `${i.latitude}, ${i.longitude}` : '–');
      return `<tr><td>${esc(i.type)}</td><td><b>${esc(i.bmk || '–')}</b><br>${esc(i.name || '')}</td><td>${esc(inventoryName(i.parentId))}</td><td>${esc(geom)}</td><td>${esc(i.status || '–')}</td><td>${plots.map(esc).join(', ') || '–'}</td><td><button onclick="editInventory('${i.id}')">Bearbeiten</button></td></tr>`;
    }).join('') || `<tr><td colspan="7" class="muted">Noch keine ${esc(title)}.</td></tr>`}
    </tbody></table></div>`;
}

function renderLeases() {
  document.querySelector('#leases').innerHTML = `
    <div class="actions"><button class="primary" onclick="editLease()">+ Unterpachtverhältnis</button></div>
    <div class="card wide"><table><thead><tr><th>Parzelle</th><th>Person</th><th>Vertragsnr.</th><th>Beginn</th><th>Ende</th><th>Status</th><th></th></tr></thead><tbody>
    ${db.leases.map(l => `<tr><td>${esc(plotName(l.plotId))}</td><td>${esc(personName(l.personId))}</td><td>${esc(l.contractNo || '–')}</td><td>${esc(l.start || '–')}</td><td>${esc(l.end || '–')}</td><td><span class="badge">${esc(l.status || ((!l.end || l.end >= today()) ? 'aktiv' : 'beendet'))}</span></td><td><button onclick="editLease('${l.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Noch keine Unterpachtverhältnisse.</td></tr>'}
    </tbody></table></div>`;
}

function renderContracts() {
  document.querySelector('#contracts').innerHTML = `
    <div class="actions"><button class="primary" onclick="editContract()">+ Vertrag</button><button onclick="editContractPartner()">+ Vertragspartner</button><button onclick="editContractLink()">+ Objekt zuordnen</button></div>
    <div class="card wide"><h2>Verträge</h2><table><thead><tr><th>Art</th><th>Vertrag</th><th>Partner</th><th>Laufzeit</th><th>Status</th><th>Zuordnung</th><th></th></tr></thead><tbody>
    ${db.contracts.map(c => {
      const links = db.contractLinks.filter(r=>r.contractId===c.id).map(r=>contractLinkLabel(r)).join('<br>') || '–';
      return `<tr><td>${esc(c.type)}</td><td><b>${esc(c.contractNo || 'ohne Nr.')}</b>${c.documentName ? `<br><span class="badge">${esc(c.documentName)}</span>` : ''}</td><td>${esc(contractPartnerName(c.partnerId))}</td><td>${esc(c.start || '–')} – ${esc(c.end || 'offen')}</td><td><span class="badge">${esc(c.status || 'aktiv')}</span></td><td>${links}</td><td><button onclick="editContract('${c.id}')">Bearbeiten</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="muted">Noch keine Verträge.</td></tr>'}
    </tbody></table></div>
    <div class="card wide" style="margin-top:14px"><h2>Vertragspartner</h2><table><thead><tr><th>Name</th><th>Kontakt</th><th></th></tr></thead><tbody>
    ${db.contractPartners.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.contact || p.note || '–')}</td><td><button onclick="editContractPartner('${p.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Noch keine Vertragspartner.</td></tr>'}
    </tbody></table></div>`;
}

function contractLinkLabel(r) {
  if (r.targetType === 'Flurstück') return `Flurstück: ${esc(landParcelName(r.targetId))}`;
  if (r.targetType === 'Parzelle') return `Parzelle: ${esc(plotName(r.targetId))}`;
  if (r.targetType === 'Inventar') return `Inventar: ${esc(inventoryName(r.targetId))}`;
  return esc(r.targetType || '–');
}

function renderCases() { document.querySelector('#cases').innerHTML = `<div class="actions"><button class="primary" onclick="editCase()">+ Vorgang</button></div><div class="card wide">${caseTable(db.cases, true)}</div>`; }
function caseTable(items, actions) {
  const sorted = [...items].sort((a, b) =>
    (isOverdue(b) - isOverdue(a)) ||
    String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'))
  );

  const rows = sorted.map(c => {
    const origin = [
      c.plotId && plotName(c.plotId),
      c.originPersonId && personName(c.originPersonId)
    ].filter(Boolean).join(' · ') || '–';

    const responsible = c.responsiblePersonId
      ? personName(c.responsiblePersonId)
      : (c.responsibleType === 'Verein' ? 'Verein' : '–');

    const attachmentCount = db.attachments.filter(a => a.caseId === c.id).length;

    return `
      <tr>
        <td data-label="Art">
          <b>${esc(c.category)}</b><br>
          ${esc(c.description)}
        </td>
        <td data-label="Ursprung">${esc(origin)}</td>
        <td data-label="Verantwortlich">${esc(responsible)}</td>
        <td data-label="Status"><span class="badge">${esc(c.status)}</span></td>
        <td data-label="Frist" class="${isOverdue(c) ? 'overdue' : ''}">${esc(c.deadline || '–')}</td>
        <td data-label="Anhänge">${attachmentCount}</td>
        ${actions ? `<td data-label="Aktion"><button onclick="editCase('${c.id}')">Öffnen</button></td>` : ''}
      </tr>
    `;
  }).join('');

  return `
    <table class="case-table">
      <thead>
        <tr>
          <th>Art</th>
          <th>Ursprung</th>
          <th>Aktuell verantwortlich</th>
          <th>Status</th>
          <th>Frist</th>
          <th>Anhänge</th>
          ${actions ? '<th></th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr class="empty-row"><td colspan="${actions ? 7 : 6}" class="muted">Keine Vorgänge.</td></tr>`}
      </tbody>
    </table>
  `;
}
function showDialog(title, html) { dlgTitle.textContent = title; dlgBody.innerHTML = html; dlg.showModal(); }

function editMembership(id) {
  if (!db.people.length) {
    alert('Bitte zuerst mindestens eine Person anlegen.');
    return;
  }
  const m = byId(db.memberships, id) || { id: '', personId: db.people[0].id, type: 'Mitglied', start: today(), end: '', status: 'aktiv', note: '' };
  const types = ['Vollmitglied', 'Mitglied', 'Mitglied auf Probe', 'Familien-/Ehegattenmitglied'];
  showDialog(m.id ? 'Mitgliedschaft bearbeiten' : 'Mitgliedschaft anlegen', `<form id="fmembership" class="formgrid"><label>Person<select name="personId">${personOptions(m.personId)}</select></label><label>Mitgliedsart<select name="type">${types.map(x=>`<option ${x===m.type?'selected':''}>${x}</option>`).join('')}</select></label><label>Beginn<input type="date" name="start" value="${esc(m.start)}"></label><label>Ende<input type="date" name="end" value="${esc(m.end)}"></label><label>Status<select name="status">${['aktiv','ruhend','beendet'].map(x=>`<option ${x===m.status?'selected':''}>${x}</option>`).join('')}</select></label><label class="full">Notiz<textarea name="note">${esc(m.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fmembership.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const o = { id: m.id || uid(), personId: f.get('personId'), type: f.get('type'), start: f.get('start'), end: f.get('end'), status: f.get('status'), note: f.get('note').trim() };
    m.id ? Object.assign(m, o) : db.memberships.push(o);
    save();
    dlg.close();
  };
}

function editPerson(id) { const p = byId(db.people, id) || { id: '', firstName: '', lastName: '', memberNo: '', email: '', phone: '', note: '' }; showDialog(p.id ? 'Person bearbeiten' : 'Person anlegen', `<form id="fp" class="formgrid"><label>Vorname<input name="firstName" value="${esc(p.firstName)}"></label><label>Nachname<input name="lastName" required value="${esc(p.lastName)}"></label><label>Mitgliedsnummer<input name="memberNo" value="${esc(p.memberNo)}"></label><label>Telefon<input name="phone" value="${esc(p.phone)}"></label><label class="full">E-Mail<input type="email" name="email" value="${esc(p.email)}"></label><label class="full">Interne Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fp.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), firstName: f.get('firstName').trim(), lastName: f.get('lastName').trim(), memberNo: f.get('memberNo').trim(), phone: f.get('phone').trim(), email: f.get('email').trim(), note: f.get('note').trim() }; p.id ? Object.assign(p, o) : db.people.push(o); save(); dlg.close(); }; }
function editAddress(id) { const a = byId(db.addresses, id) || { id: '', street: '', zip: '', city: '', country: 'Deutschland', note: '' }; showDialog(a.id ? 'Adresse bearbeiten' : 'Adresse anlegen', `<form id="fa" class="formgrid"><label class="full">Straße / Hausnummer<input name="street" required value="${esc(a.street)}"></label><label>PLZ<input name="zip" value="${esc(a.zip)}"></label><label>Ort<input name="city" required value="${esc(a.city)}"></label><label>Land<input name="country" value="${esc(a.country)}"></label><label class="full">Notiz<textarea name="note">${esc(a.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fa.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: a.id || uid(), street: f.get('street').trim(), zip: f.get('zip').trim(), city: f.get('city').trim(), country: f.get('country').trim(), note: f.get('note').trim() }; a.id ? Object.assign(a, o) : db.addresses.push(o); save(); dlg.close(); }; }
function editPersonAddress(id) { if (!db.people.length || !db.addresses.length) {
    alert('Bitte zuerst Person und Adresse anlegen.');
    return;
} const r = byId(db.personAddresses, id) || { id: '', personId: db.people[0].id, addressId: db.addresses[0].id, type: 'Postanschrift', validFrom: '', validTo: '', note: '' }; showDialog(r.id ? 'Adresszuordnung bearbeiten' : 'Adresse zu Person zuordnen', `<form id="fpa" class="formgrid"><label>Person<select name="personId">${personOptions(r.personId)}</select></label><label>Adresse<select name="addressId">${addressOptions(r.addressId)}</select></label><label>Art<input name="type" value="${esc(r.type)}"></label><label>Gültig von<input type="date" name="validFrom" value="${esc(r.validFrom)}"></label><label>Gültig bis<input type="date" name="validTo" value="${esc(r.validTo)}"></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fpa.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), personId: f.get('personId'), addressId: f.get('addressId'), type: f.get('type').trim(), validFrom: f.get('validFrom'), validTo: f.get('validTo'), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.personAddresses.push(o); save(); dlg.close(); }; }
function editWay(id) {
  const w = byId(db.ways, id) || { id: '', name: '', path: '', note: '' };
  showDialog(w.id ? 'Weg bearbeiten' : 'Weg anlegen', `<form id="fw" class="formgrid"><label class="full">Bezeichnung<input name="name" required value="${esc(w.name)}" placeholder="z. B. Rosenweg"></label><label class="full">Koordinatenpfad<textarea name="path" placeholder="51.5321, 9.9342
51.5323, 9.9346">${esc(w.path || '')}</textarea><span class="subtle">${esc(pathHelp())}</span></label><label class="full">Notiz<textarea name="note">${esc(w.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fw.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: w.id || uid(), name: f.get('name').trim(), path: f.get('path').trim(), note: f.get('note').trim() }; w.id ? Object.assign(w, o) : db.ways.push(o); save(); dlg.close(); };
}
function editPlot(id) {
  const p = byId(db.plots, id) || { id: '', number: '', wayId: '', size: '', latitude: '', longitude: '', location: '', note: '', waterAvailable: false, electricityAvailable: false, waterLineId: '', waterValveId: '', waterMeterId: '', electricPanelId: '', electricMeterId: '' };
  showDialog(p.id ? 'Parzelle bearbeiten' : 'Parzelle anlegen', `<form id="fplot" class="formgrid"><label>Gartennummer<input name="number" required value="${esc(p.number)}"></label><label>Weg<select name="wayId">${wayOptions(p.wayId)}</select></label><label>Größe m²<input type="number" step="0.01" name="size" value="${esc(p.size)}"></label><label>Lage / Zusatzbezeichnung<input name="location" value="${esc(p.location)}"></label><label>Breitengrad<input type="number" step="any" name="latitude" value="${esc(p.latitude)}" placeholder="51.123456"></label><label>Längengrad<input type="number" step="any" name="longitude" value="${esc(p.longitude)}" placeholder="9.123456"></label><fieldset class="full"><legend>Technische Versorgung</legend><div class="formgrid"><label class="checkline"><input type="checkbox" name="waterAvailable" ${p.waterAvailable ? 'checked' : ''}> Wasser vorhanden</label><label class="checkline"><input type="checkbox" name="electricityAvailable" ${p.electricityAvailable ? 'checked' : ''}> Strom vorhanden</label><label>Wasserleitung / Strang<select name="waterLineId">${inventoryOptions(p.waterLineId, ['Wasserleitung', 'Wasserstrang'])}</select></label><label>Schieber<select name="waterValveId">${inventoryOptions(p.waterValveId, ['Schieber'])}</select></label><label>Wasserzähler<select name="waterMeterId">${inventoryOptions(p.waterMeterId, ['Wasserzähler'])}</select></label><label>Unterverteilung<select name="electricPanelId">${inventoryOptions(p.electricPanelId, ['Unterverteilung'])}</select></label><label>Stromzähler<select name="electricMeterId">${inventoryOptions(p.electricMeterId, ['Stromzähler'])}</select></label></div></fieldset><label class="full">Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fplot.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), number: f.get('number').trim(), wayId: f.get('wayId'), size: f.get('size'), location: f.get('location').trim(), latitude: f.get('latitude'), longitude: f.get('longitude'), waterAvailable: f.get('waterAvailable') === 'on', electricityAvailable: f.get('electricityAvailable') === 'on', waterLineId: f.get('waterLineId'), waterValveId: f.get('waterValveId'), waterMeterId: f.get('waterMeterId'), electricPanelId: f.get('electricPanelId'), electricMeterId: f.get('electricMeterId'), note: f.get('note').trim() }; p.id ? Object.assign(p, o) : db.plots.push(o); save(); dlg.close(); };
}
function editLandParcel(id) { const f = byId(db.landParcels, id) || { id: '', gemarkung: '', flur: '', number: '', area: '', note: '' }; showDialog(f.id ? 'Flurstück bearbeiten' : 'Flurstück anlegen', `<form id="flp" class="formgrid"><label>Gemarkung<input name="gemarkung" value="${esc(f.gemarkung)}"></label><label>Flur<input name="flur" value="${esc(f.flur)}"></label><label>Flurstücksnummer<input name="number" required value="${esc(f.number)}"></label><label>Fläche m²<input type="number" step="0.01" name="area" value="${esc(f.area)}"></label><label class="full">Notiz<textarea name="note">${esc(f.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); flp.onsubmit = e => { e.preventDefault(); const d = new FormData(e.target), o = { id: f.id || uid(), gemarkung: d.get('gemarkung').trim(), flur: d.get('flur').trim(), number: d.get('number').trim(), area: d.get('area'), note: d.get('note').trim() }; f.id ? Object.assign(f, o) : db.landParcels.push(o); save(); dlg.close(); }; }
function editPlotLandParcel(id) { if (!db.plots.length || !db.landParcels.length) {
    alert('Bitte zuerst Parzelle und Flurstück anlegen.');
    return;
} const r = byId(db.plotLandParcels, id) || { id: '', plotId: db.plots[0].id, landParcelId: db.landParcels[0].id, share: '', note: '' }; showDialog(r.id ? 'Flurstückszuordnung bearbeiten' : 'Flurstück zuordnen', `<form id="fpl" class="formgrid"><label>Parzelle<select name="plotId">${plotOptions(r.plotId)}</select></label><label>Flurstück<select name="landParcelId">${landParcelOptions(r.landParcelId)}</select></label><label>Anteil / Teilfläche<input name="share" value="${esc(r.share)}" placeholder="z. B. vollständig oder 120 m²"></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fpl.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), plotId: f.get('plotId'), landParcelId: f.get('landParcelId'), share: f.get('share').trim(), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.plotLandParcels.push(o); save(); dlg.close(); }; }
function editInventory(id, defaultType = 'Schieber') {
  const types = ['Außentor', 'Wasserleitung', 'Wasserstrang', 'Schieber', 'Wasserzähler', 'Wasseranschluss', 'Stromleitung', 'Unterverteilung', 'Stromzähler', 'Sicherung/Abgang', 'Sonstiges'];
  const i = byId(db.inventory, id) || { id: '', type: defaultType, bmk: '', name: '', parentId: '', status: 'aktiv', latitude: '', longitude: '', path: '', note: '' };
  showDialog(i.id ? 'Inventarobjekt bearbeiten' : 'Inventarobjekt anlegen', `<form id="finv" class="formgrid"><label>Typ<select name="type">${types.map(t => `<option ${t === i.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>BMK / Kennzeichnung<input name="bmk" value="${esc(i.bmk)}" placeholder="z. B. UV-02 oder W-S3-2"></label><label class="full">Bezeichnung<input name="name" required value="${esc(i.name)}"></label><label>Übergeordnetes Objekt<select name="parentId">${inventoryOptions(i.parentId)}</select></label><label>Status<select name="status">${['aktiv', 'inaktiv', 'defekt', 'stillgelegt', 'geplant'].map(x => `<option ${x === i.status ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Breitengrad<input type="number" step="any" name="latitude" value="${esc(i.latitude)}"></label><label>Längengrad<input type="number" step="any" name="longitude" value="${esc(i.longitude)}"></label><label class="full">Koordinatenpfad (für Leitungen)<textarea name="path" placeholder="51.5321, 9.9342\n51.5323, 9.9346">${esc(i.path)}</textarea><span class="subtle">${esc(pathHelp())}</span></label><label class="full">Notiz<textarea name="note">${esc(i.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  finv.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: i.id || uid(), type: f.get('type'), bmk: f.get('bmk').trim(), name: f.get('name').trim(), parentId: f.get('parentId'), status: f.get('status'), latitude: f.get('latitude'), longitude: f.get('longitude'), path: f.get('path').trim(), note: f.get('note').trim() }; if (o.parentId === o.id) o.parentId = ''; i.id ? Object.assign(i, o) : db.inventory.push(o); save(); dlg.close(); };
}

function editLease(id) {
  if (!db.people.length || !db.plots.length) {
    alert('Bitte zuerst mindestens eine Person und eine Parzelle anlegen.');
    return;
  }
  const l = byId(db.leases, id) || { id: '', personId: db.people[0].id, plotId: db.plots[0].id, contractNo: '', start: today(), end: '', status: 'aktiv', note: '', documentName: '', documentType: '', documentData: '' };
  showDialog(l.id ? 'Unterpachtverhältnis bearbeiten' : 'Unterpachtverhältnis anlegen', `<form id="fl" class="formgrid"><label>Parzelle<select name="plotId">${plotOptions(l.plotId)}</select></label><label>Person<select name="personId">${personOptions(l.personId)}</select></label><label>Vertragsnummer<input name="contractNo" value="${esc(l.contractNo || '')}"></label><label>Status<select name="status">${['aktiv','ruhend','gekündigt','beendet'].map(x=>`<option ${x===l.status?'selected':''}>${x}</option>`).join('')}</select></label><label>Beginn<input type="date" name="start" value="${esc(l.start)}"></label><label>Ende<input type="date" name="end" value="${esc(l.end)}"></label><label class="full">Vertragsdokument<input type="file" id="leaseFile" accept="image/*,.pdf"></label>${l.documentName ? `<div class="full"><span class="badge">Vorhanden: ${esc(l.documentName)}</span></div>` : ''}<label class="full">Notiz<textarea name="note">${esc(l.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fl.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const o = { id: l.id || uid(), plotId: f.get('plotId'), personId: f.get('personId'), contractNo: f.get('contractNo').trim(), start: f.get('start'), end: f.get('end'), status: f.get('status'), note: f.get('note').trim(), documentName: l.documentName || '', documentType: l.documentType || '', documentData: l.documentData || '' };
    const file = document.querySelector('#leaseFile').files[0];
    if (file) { o.documentName = file.name; o.documentType = file.type; o.documentData = await fileToDataURL(file); }
    l.id ? Object.assign(l, o) : db.leases.push(o);
    save();
    dlg.close();
  };
}

function editContractPartner(id) {
  const p = byId(db.contractPartners, id) || { id: '', name: '', contact: '', note: '' };
  showDialog(p.id ? 'Vertragspartner bearbeiten' : 'Vertragspartner anlegen', `<form id="fpartner" class="formgrid"><label class="full">Name / Organisation<input name="name" required value="${esc(p.name)}"></label><label class="full">Kontakt / Anschrift<textarea name="contact">${esc(p.contact)}</textarea></label><label class="full">Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fpartner.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), name: f.get('name').trim(), contact: f.get('contact').trim(), note: f.get('note').trim() }; p.id ? Object.assign(p,o) : db.contractPartners.push(o); save(); dlg.close(); };
}

function editContract(id) {
  const c = byId(db.contracts, id) || { id: '', type: 'Pachtvertrag', partnerId: '', contractNo: '', start: '', end: '', noticePeriod: '', status: 'aktiv', note: '', documentName: '', documentType: '', documentData: '' };
  const types = ['Pachtvertrag','Stromvertrag','Wasservertrag','Versicherung','Wartungsvertrag','Dienstleistungsvertrag','Sonstiger Vertrag'];
  showDialog(c.id ? 'Vertrag bearbeiten' : 'Vertrag anlegen', `<form id="fcontract" class="formgrid"><label>Vertragsart<select name="type">${types.map(x=>`<option ${x===c.type?'selected':''}>${x}</option>`).join('')}</select></label><label>Vertragspartner<select name="partnerId">${contractPartnerOptions(c.partnerId)}</select></label><label>Vertragsnummer<input name="contractNo" value="${esc(c.contractNo)}"></label><label>Status<select name="status">${['aktiv','gekündigt','beendet','ruhend'].map(x=>`<option ${x===c.status?'selected':''}>${x}</option>`).join('')}</select></label><label>Beginn<input type="date" name="start" value="${esc(c.start)}"></label><label>Ende<input type="date" name="end" value="${esc(c.end)}"></label><label class="full">Kündigungsfrist / Regelung<input name="noticePeriod" value="${esc(c.noticePeriod)}"></label><label class="full">Vertragsdokument<input type="file" id="contractFileNew" accept="image/*,.pdf"></label>${c.documentName ? `<div class="full"><span class="badge">Vorhanden: ${esc(c.documentName)}</span></div>` : ''}<label class="full">Notiz<textarea name="note">${esc(c.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fcontract.onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), o = { id: c.id || uid(), type: f.get('type'), partnerId: f.get('partnerId'), contractNo: f.get('contractNo').trim(), start: f.get('start'), end: f.get('end'), noticePeriod: f.get('noticePeriod').trim(), status: f.get('status'), note: f.get('note').trim(), documentName: c.documentName || '', documentType: c.documentType || '', documentData: c.documentData || '' }; const file = document.querySelector('#contractFileNew').files[0]; if (file) { o.documentName=file.name; o.documentType=file.type; o.documentData=await fileToDataURL(file); } c.id ? Object.assign(c,o) : db.contracts.push(o); save(); dlg.close(); };
}

function editContractLink(id) {
  if (!db.contracts.length) {
    alert('Bitte zuerst mindestens einen Vertrag anlegen.');
    return;
  }
  const r = byId(db.contractLinks, id) || { id: '', contractId: db.contracts[0].id, targetType: 'Flurstück', targetId: '', note: '' };
  const current = r.targetType && r.targetId ? `${r.targetType}|${r.targetId}` : '';
  const targetOptions = [
    ...db.landParcels.map(x => ({ value: `Flurstück|${x.id}`, label: `Flurstück · ${landParcelName(x.id)}` })),
    ...db.plots.map(x => ({ value: `Parzelle|${x.id}`, label: `Parzelle · ${plotName(x.id)}` })),
    ...db.inventory.map(x => ({ value: `Inventar|${x.id}`, label: `Inventar · ${inventoryName(x.id)}` }))
  ];
  showDialog(r.id ? 'Vertragszuordnung bearbeiten' : 'Objekt dem Vertrag zuordnen', `<form id="fcl" class="formgrid"><label>Vertrag<select name="contractId">${opts(db.contracts,r.contractId,c=>contractName(c.id))}</select></label><label class="full">Zugeordnetes Objekt<select name="target"><option value="">– keine –</option>${targetOptions.map(x=>`<option value="${esc(x.value)}" ${x.value===current?'selected':''}>${esc(x.label)}</option>`).join('')}</select></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fcl.onsubmit=e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const [targetType='', targetId=''] = String(f.get('target') || '').split('|');
    const o={id:r.id||uid(),contractId:f.get('contractId'),targetType,targetId,note:f.get('note').trim()};
    r.id?Object.assign(r,o):db.contractLinks.push(o);
    save();
    dlg.close();
  };
}

function editCase(id) {
    const c = byId(db.cases, id) || { id: '', category: 'Gartenmangel', description: '', plotId: '', originPersonId: '', responsibleType: 'Person', responsiblePersonId: '', historicalPersonId: '', status: 'Offen', priority: 'Normal', opened: today(), deadline: '', followup: '', resolution: '', closed: '' };
    if (!c.id && db.plots.length) {
        c.plotId = db.plots[0].id;
        const l = activeLeaseForPlot(c.plotId);
        if (l) {
            c.originPersonId = l.personId;
            c.responsiblePersonId = l.personId;
        }
    }
    const ev = db.events.filter(e => e.caseId === c.id).sort((a, b) => b.at.localeCompare(a.at)), at = db.attachments.filter(a => a.caseId === c.id);
    showDialog(c.id ? 'Vorgang bearbeiten' : 'Vorgang anlegen', `<form id="fc" class="formgrid"><label>Vorgangsart<select name="category">${['Gartenmangel', 'Zahlungsverzug', 'Beschwerde', 'Verhalten/Verstoß', 'Kostenforderung', 'Schriftverkehr', 'Sonstiges'].map(x => `<option ${x === c.category ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Priorität<select name="priority">${['Niedrig', 'Normal', 'Hoch'].map(x => `<option ${x === c.priority ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Betroffene Parzelle<select name="plotId">${plotOptions(c.plotId)}</select></label><label>Person bei Entstehung<select name="originPersonId">${personOptions(c.originPersonId)}</select></label><label>Aktuell verantwortlich<select name="responsibleType"><option ${c.responsibleType === 'Person' ? 'selected' : ''}>Person</option><option ${c.responsibleType === 'Verein' ? 'selected' : ''}>Verein</option><option ${c.responsibleType === 'Niemand' ? 'selected' : ''}>Niemand</option></select></label><label>Verantwortliche Person<select name="responsiblePersonId">${personOptions(c.responsiblePersonId)}</select></label><label class="full">Beschreibung<textarea name="description" required>${esc(c.description)}</textarea></label><label>Status<select name="status">${['Offen', 'Frist gesetzt', 'In Bearbeitung', 'Nachkontrolle', 'Abgeschlossen'].map(x => `<option ${x === c.status ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Historisch zuzurechnen an<select name="historicalPersonId">${personOptions(c.historicalPersonId)}</select></label><label>Eröffnet am<input type="date" name="opened" value="${esc(c.opened)}"></label><label>Frist<input type="date" name="deadline" value="${esc(c.deadline)}"></label><label>Wiedervorlage/Nachkontrolle<input type="date" name="followup" value="${esc(c.followup)}"></label><label>Abgeschlossen am<input type="date" name="closed" value="${esc(c.closed)}"></label><label class="full">Abschluss / Ergebnis<textarea name="resolution">${esc(c.resolution)}</textarea></label><div class="full"><b>Fotos / Dokumente</b><input type="file" id="files" accept="image/*,.pdf" multiple capture="environment"><div>${at.map(a => a.type.startsWith('image/') ? `<img class="photo" src="${a.data}" title="${esc(a.name)}">` : `<span class="badge">${esc(a.name)}</span>`).join('') || '<span class="muted">Noch keine Anhänge</span>'}</div></div><div class="full actions"><button class="primary">Speichern</button>${c.id ? `<button type="button" onclick="transferResponsibility('${c.id}')">Verantwortung übertragen</button>` : ''}<button type="button" onclick="dlg.close()">Abbrechen</button></div>${c.id ? `<div class="full"><h3>Historie</h3><div class="timeline">${ev.map(e => `<div class="event"><small>${new Date(e.at).toLocaleString('de-DE')}</small><br><b>${esc(e.type)}</b> – ${esc(e.text)}</div>`).join('') || '<span class="muted">Noch keine Ereignisse.</span>'}</div></div>` : ''}</form>`);
    fc.onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), oldResp = c.responsiblePersonId, oldStatus = c.status, o = { id: c.id || uid(), category: f.get('category'), priority: f.get('priority'), plotId: f.get('plotId'), originPersonId: f.get('originPersonId'), responsibleType: f.get('responsibleType'), responsiblePersonId: f.get('responsiblePersonId'), historicalPersonId: f.get('historicalPersonId'), description: f.get('description').trim(), status: f.get('status'), opened: f.get('opened'), deadline: f.get('deadline'), followup: f.get('followup'), closed: f.get('closed'), resolution: f.get('resolution').trim(), updated: now() }; if (!c.id) {
        db.cases.push(o);
        addEvent(o.id, 'Angelegt', 'Vorgang angelegt.');
    }
    else {
        Object.assign(c, o);
        if (oldStatus !== o.status)
            addEvent(o.id, 'Status', `Status: ${oldStatus} → ${o.status}`);
        if (oldResp !== o.responsiblePersonId)
            addEvent(o.id, 'Verantwortung', `Verantwortung geändert: ${personName(oldResp)} → ${personName(o.responsiblePersonId)}`, oldResp, o.responsiblePersonId);
    } await addFiles(o.id, document.querySelector('#files').files); if (o.status === 'Abgeschlossen' && !o.historicalPersonId)
        o.historicalPersonId = o.responsiblePersonId || o.originPersonId; save(); dlg.close(); };
}
function transferResponsibility(id) { const c = byId(db.cases, id); showDialog('Verantwortung übertragen', `<form id="ft" class="formgrid"><label>Neue verantwortliche Person<select name="to">${personOptions(c.responsiblePersonId)}</select></label><label class="full">Grund / Vereinbarung<textarea name="reason" required></textarea></label><div class="full actions"><button class="primary">Übertragen</button><button type="button" onclick="editCase('${id}')">Abbrechen</button></div></form>`); ft.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), from = c.responsiblePersonId, to = f.get('to'); c.responsibleType = to ? 'Person' : 'Niemand'; c.responsiblePersonId = to; addEvent(id, 'Verantwortungsübergang', `${personName(from)} → ${personName(to)}. ${f.get('reason').trim()}`, from, to); save(); editCase(id); }; }
function fileToDataURL(file) { return new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); }); }
async function addFiles(caseId, files) { for (const file of [...files])
    db.attachments.push({ id: uid(), caseId, name: file.name, type: file.type || 'application/octet-stream', size: file.size, addedAt: now(), data: await fileToDataURL(file) }); }
function download(name, text, type = 'application/json') { const a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type })); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
function exportBackup() { const pack = { format: 'Gartenakte-Vollsicherung', appVersion: APP_VERSION, schema: db.schema, exportedAt: now(), data: db }; download(`Gartenakte_Vollsicherung_${today()}_v${APP_VERSION}.json`, JSON.stringify(pack)); }
function importBackup(inp) { const f = inp.files[0]; if (!f)
    return; const r = new FileReader(); r.onload = () => { try {
    const p = JSON.parse(r.result);
    if (p.format !== 'Gartenakte-Vollsicherung' || !p.data)
        throw 0;
    if (confirm('Aktuelle lokale Daten durch diese Vollsicherung ersetzen?')) {
        db = migrate(p.data);
        save();
        alert('Vollsicherung inklusive Anhängen wurde wiederhergestellt.');
    }
}
catch (e) {
    alert('Keine gültige Gartenakte-Vollsicherung.');
} }; r.readAsText(f); }
function exportCasesCSV() { const rows = [['Art', 'Parzelle', 'Person bei Entstehung', 'Aktuell verantwortlich', 'Historisch zugerechnet', 'Beschreibung', 'Status', 'Frist', 'Wiedervorlage']]; db.cases.forEach(c => rows.push([c.category, plotName(c.plotId), personName(c.originPersonId), c.responsibleType === 'Verein' ? 'Verein' : personName(c.responsiblePersonId), personName(c.historicalPersonId), c.description, c.status, c.deadline, c.followup])); const csv = '\ufeff' + rows.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(';')).join('\r\n'); download(`Gartenakte_Vorgaenge_${today()}.csv`, csv, 'text/csv;charset=utf-8'); }
function clearAll() { if (confirm('Wirklich ALLE lokalen Daten einschließlich Fotos/Dokumenten löschen?') && confirm('Ohne Vollsicherung gibt es kein Zurück.')) {
    db = fresh();
    save();
} }
function renderBackup() {
  const bytes = new Blob([JSON.stringify(db)]).size;
  document.querySelector('#backup').innerHTML = `<div class="grid"><div class="card"><h2>Vollsicherung</h2><p>Enthält alle Stammdaten, Mitgliedschaften, Unterpachtverhältnisse, Verträge, Inventar, Vorgänge sowie Fotos und Dokumente.</p><button class="primary" onclick="exportBackup()">Vollsicherung herunterladen</button></div><div class="card"><h2>Wiederherstellen</h2><p>Ältere Sicherungen werden beim Import automatisch auf das aktuelle Schema migriert.</p><input type="file" accept="application/json,.json" onchange="importBackup(this)"></div><div class="card"><h2>CSV</h2><p>Tabellarischer Zusatzexport der Vorgänge.</p><button onclick="exportCasesCSV()">Vorgänge als CSV</button></div><div class="card"><h2>Speicher</h2><p>Aktueller Datenbestand ca. <b>${(bytes / 1024 / 1024).toFixed(2)} MB</b>.</p></div></div><div class="card" style="margin-top:14px"><h2>Version</h2><p><b>${APP_VERSION}</b> · Schema ${db.schema}. Neu: gruppierte Fachnavigation, Mitgliedschaften, Unterpachtverhältnisse und allgemeine Verträge.</p><button class="danger" onclick="clearAll()">Alle lokalen Daten löschen</button></div>`;
}
render();
save();
save();


/* 0.8.1 – Sticky-Metriken aus dem realen Layout ableiten.
 * Die Variablen beeinflussen ausschließlich nachgelagerte Sticky-Offsets,
 * niemals die Höhe der gemessenen Elemente selbst. Dadurch entsteht keine
 * ResizeObserver-Rückkopplung. */
function syncStickyLayoutMetrics() {
  const root = document.documentElement;
  const desktop = window.matchMedia('(min-width: 861px)').matches;

  if (desktop) {
    const productRow = document.querySelector('.desktop-topbar');
    const mainNav = document.querySelector('.desktop-menu-bar');
    const breadcrumb = document.querySelector('.location-shell');

    root.style.setProperty('--app-header-height', `${Math.ceil(productRow?.getBoundingClientRect().height || 0)}px`);
    root.style.setProperty('--main-nav-height', `${Math.ceil(mainNav?.getBoundingClientRect().height || 0)}px`);
    root.style.setProperty('--breadcrumb-height', `${Math.ceil(breadcrumb?.getBoundingClientRect().height || 0)}px`);
  } else {
    const mobileBar = document.querySelector('.mobile-appbar');
    root.style.setProperty('--app-header-height', `${Math.ceil(mobileBar?.getBoundingClientRect().height || 0)}px`);
    root.style.setProperty('--main-nav-height', '0px');
    root.style.setProperty('--breadcrumb-height', '0px');
  }
}

let stickyMetricsFrame = 0;
function scheduleStickyLayoutMetrics() {
  cancelAnimationFrame(stickyMetricsFrame);
  stickyMetricsFrame = requestAnimationFrame(syncStickyLayoutMetrics);
}

window.addEventListener('resize', scheduleStickyLayoutMetrics, { passive: true });
window.addEventListener('orientationchange', scheduleStickyLayoutMetrics, { passive: true });
window.addEventListener('load', scheduleStickyLayoutMetrics, { once: true });

if ('ResizeObserver' in window) {
  const stickyMetricsObserver = new ResizeObserver(scheduleStickyLayoutMetrics);
  ['.desktop-topbar', '.desktop-menu-bar', '.location-shell', '.mobile-appbar'].forEach(selector => {
    const element = document.querySelector(selector);
    if (element) stickyMetricsObserver.observe(element);
  });
}

scheduleStickyLayoutMetrics();
