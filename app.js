'use strict';
const APP_VERSION = '0.9.5', KEY = 'gartenakte_data', OLD_KEYS = ['gartenakte_1_0_0_data'];
let db = load();

const plotViewState = {
  search: '',
  wayId: '',
  supply: '',
  sort: 'number-asc'
};

function fresh() {
  return {
    schema: 6,
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
    meterReadings: [],
    leaseAreas: [],
    mapReferences: [],
    osmImports: [],
    lessors: [],
    landContracts: [],
    contractParcels: []
  };
}

function ensureInventoryGeoFields(item) {
  if (!item || typeof item !== 'object') return item;
  item.geometry = item.geometry || null;
  item.meterScope = item.meterScope || '';
  item.meterNumber = item.meterNumber || '';
  item.meteringPointNumber = item.meteringPointNumber || '';
  item.unit = item.unit || (item.type === 'Stromzähler' ? 'kWh' : (item.type === 'Wasserzähler' ? 'm³' : ''));
  item.installedAt = item.installedAt || '';
  item.removedAt = item.removedAt || '';
  return item;
}

function migrate(x) {
  if (!x) return fresh();

  if (x.schema === 6 || x.schema === 5) {
    const n = Object.assign(fresh(), x, { schema: 6, appVersion: APP_VERSION });
    n.memberships = Array.isArray(n.memberships) ? n.memberships : [];
    n.contractPartners = Array.isArray(n.contractPartners) ? n.contractPartners : [];
    n.contracts = Array.isArray(n.contracts) ? n.contracts : [];
    n.contractLinks = Array.isArray(n.contractLinks) ? n.contractLinks : [];
    n.meterReadings = Array.isArray(n.meterReadings) ? n.meterReadings : [];
    n.leaseAreas = Array.isArray(n.leaseAreas) ? n.leaseAreas : [];
    n.mapReferences = Array.isArray(n.mapReferences) ? n.mapReferences : [];
    n.osmImports = Array.isArray(n.osmImports) ? n.osmImports : [];
    n.inventory = Array.isArray(n.inventory) ? n.inventory : [];
    n.inventory.forEach(ensureInventoryGeoFields);
    return n;
  }

  if (x.schema === 4) {
    const n = Object.assign(fresh(), x, {
      schema: 6,
      appVersion: APP_VERSION,
      meterReadings: [],
      leaseAreas: [],
      mapReferences: [],
      osmImports: []
    });
    n.memberships = Array.isArray(n.memberships) ? n.memberships : [];
    n.contractPartners = Array.isArray(n.contractPartners) ? n.contractPartners : [];
    n.contracts = Array.isArray(n.contracts) ? n.contracts : [];
    n.contractLinks = Array.isArray(n.contractLinks) ? n.contractLinks : [];
    n.inventory = Array.isArray(n.inventory) ? n.inventory : [];
    n.inventory.forEach(ensureInventoryGeoFields);
    return n;
  }

  if (x.schema === 3) {
    const n = Object.assign(fresh(), x, {
      schema: 6,
      appVersion: APP_VERSION,
      memberships: [],
      contractPartners: [],
      contracts: [],
      contractLinks: [],
      meterReadings: [],
      leaseAreas: [],
      mapReferences: [],
      osmImports: []
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

    n.inventory = Array.isArray(n.inventory) ? n.inventory : [];
    n.inventory.forEach(ensureInventoryGeoFields);
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
  db.schema = 6;
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

function parsePath(path) {
  return String(path || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(',').map(part => Number(part.trim())))
    .filter(parts => parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]))
    .map(([lat, lng]) => [lng, lat]);
}
function pathFromCoordinates(coordinates) {
  return (coordinates || []).map(([lng, lat]) => `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`).join('\n');
}
function pointGeometry(lat, lng) {
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) ? { type: 'Point', coordinates: [b, a] } : null;
}
function legacyGeometry(obj, kind = '') {
  if (obj?.geometry?.type && Array.isArray(obj.geometry.coordinates)) return obj.geometry;
  if (kind === 'way' || kind === 'line') {
    const coords = parsePath(obj?.path);
    return coords.length >= 2 ? { type: 'LineString', coordinates: coords } : null;
  }
  if (kind === 'inventory' && obj?.path) {
    const coords = parsePath(obj.path);
    if (coords.length >= 2) return { type: 'LineString', coordinates: coords };
  }
  return pointGeometry(obj?.latitude, obj?.longitude);
}
function geometryPointCount(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Point') return 1;
  if (geometry.type === 'LineString') return geometry.coordinates?.length || 0;
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0]?.length || 0;
  return 0;
}
function isMeter(item) { return ['Wasserzähler', 'Stromzähler'].includes(item?.type); }
function meterLatestReading(meterId) {
  return [...db.meterReadings]
    .filter(r => r.meterId === meterId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}
function meterReadingUsage(meterId, readingId) {
  const readings = [...db.meterReadings]
    .filter(r => r.meterId === meterId && r.value !== '' && Number.isFinite(Number(r.value)))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const index = readings.findIndex(r => r.id === readingId);
  if (index <= 0) return null;
  const diff = Number(readings[index].value) - Number(readings[index - 1].value);
  return Number.isFinite(diff) ? diff : null;
}

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
  map: { group: 'Anlage & Inventar', page: 'Karte' },
  plots: { group: 'Anlage & Inventar', page: 'Parzellen' },
  landparcels: { group: 'Anlage & Inventar', page: 'Flurstücke' },
  ways: { group: 'Anlage & Inventar', page: 'Wege' },
  gates: { group: 'Anlage & Inventar', page: 'Außentore' },
  panels: { group: 'Anlage & Inventar', page: 'Unterverteilungen' },
  valves: { group: 'Anlage & Inventar', page: 'Absperrschieber' },
  watermeters: { group: 'Anlage & Inventar', page: 'Wasserzähler' },
  powermeters: { group: 'Anlage & Inventar', page: 'Stromzähler' },
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
  if (name === 'map') setTimeout(initGardenMap, 0);
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
  renderMap();
  renderInventoryCategory('gates', 'Außentore', ['Außentor']);
  renderInventoryCategory('waterlines', 'Wasserleitungen', ['Wasserleitung', 'Wasserstrang']);
  renderInventoryCategory('valves', 'Absperrschieber', ['Schieber']);
  renderInventoryCategory('watermeters', 'Wasserzähler', ['Wasserzähler']);
  renderInventoryCategory('powerlines', 'Stromleitungen', ['Stromleitung']);
  renderInventoryCategory('panels', 'Unterverteilungen', ['Unterverteilung']);
  renderInventoryCategory('powermeters', 'Stromzähler', ['Stromzähler']);
  renderBackup();
  enhanceResponsiveTables();
  if (!document.querySelector('#map')?.classList.contains('hidden')) setTimeout(initGardenMap, 0);
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

    <div class="plot-controls" aria-label="Parzellen suchen und filtern">
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


let gardenMap = null;
let gardenMapLayerGroup = null;
let gardenMapDraftLayer = null;
let gardenMapDraft = { mode: '', points: [] };

function renderMap() {
  const section = document.querySelector('#map');
  if (!section) return;
  section.innerHTML = `
    <div class="map-page">
      <div class="map-toolbar card map-toolbar--compact" aria-label="Kartenwerkzeuge">
        <div class="map-toolbar-row map-toolbar-row--layers">
          <div class="map-toolbar-label">Kartenebenen</div>
          <div class="map-layer-list map-layer-list--toolbar" aria-label="Fachdaten">
            <label><input type="checkbox" data-map-layer="plots" checked onchange="refreshGardenMapLayers()"> <span>Parzellen</span></label>
            <label><input type="checkbox" data-map-layer="landparcels" checked onchange="refreshGardenMapLayers()"> <span>Flurstücke</span></label>
            <label><input type="checkbox" data-map-layer="leaseareas" checked onchange="refreshGardenMapLayers()"> <span>Pachtflächen</span></label>
            <label><input type="checkbox" data-map-layer="ways" checked onchange="refreshGardenMapLayers()"> <span>Wege</span></label>
            <label><input type="checkbox" data-map-layer="water" checked onchange="refreshGardenMapLayers()"> <span>Wasser</span></label>
            <label><input type="checkbox" data-map-layer="power" checked onchange="refreshGardenMapLayers()"> <span>Strom</span></label>
            <label><input type="checkbox" data-map-layer="inventory" checked onchange="refreshGardenMapLayers()"> <span>Inventar</span></label>
          </div>
          <div class="map-layer-separator" aria-hidden="true"></div>
          <div class="map-layer-list map-layer-list--toolbar map-layer-list--reference" aria-label="Referenzdaten">
            <span class="map-inline-caption">Referenz</span>
            <label class="map-layer-nowrap"><input type="checkbox" data-map-layer="osmreference" checked onchange="refreshGardenMapLayers()"> <span>OSM-Referenz</span></label>
          </div>
        </div>

        <div class="map-toolbar-row map-toolbar-row--editor">
          <div class="map-toolbar-label">Geometrie</div>
          <div class="map-editor-targets map-editor-targets--toolbar">
            <label>Objektart
              <select id="mapTargetType" onchange="updateMapTargetOptions()">
                <option value="plot">Parzelle</option>
                <option value="landParcel">Flurstück</option>
                <option value="leaseArea">Pachtfläche</option>
                <option value="way">Weg</option>
                <option value="inventory">Inventarobjekt</option>
              </select>
            </label>
            <label class="map-target-select">Objekt
              <select id="mapTargetId"></select>
            </label>
          </div>
          <div class="map-draw-toggle" role="group" aria-label="Geometrietyp">
            <button type="button" data-map-draw-mode="Point" aria-pressed="false" onclick="startMapDraw('Point')">Punkt</button>
            <button type="button" data-map-draw-mode="LineString" aria-pressed="false" onclick="startMapDraw('LineString')">Linie</button>
            <button type="button" data-map-draw-mode="Polygon" aria-pressed="false" onclick="startMapDraw('Polygon')">Polygon</button>
          </div>
          <button type="button" class="map-tool-secondary" onclick="undoMapPoint()">Punkt zurück</button>
          <div class="map-toolbar-spacer" aria-hidden="true"></div>
          <div class="map-editor-actions">
            <button type="button" class="primary" onclick="saveMapDrawing()">Geometrie speichern</button>
            <button type="button" onclick="cancelMapDrawing()">Abbrechen</button>
          </div>
        </div>

        <div class="map-toolbar-row map-toolbar-row--actions">
          <div class="map-toolbar-label">Aktionen</div>
          <div class="map-action-list map-action-list--toolbar">
            <button type="button" onclick="fitGardenMapToData()">Auf vorhandene Daten zoomen</button>
            <button type="button" onclick="editLeaseArea()">+ Pachtfläche</button>
            <button type="button" onclick="loadBundledOsmImport()">OSM-Referenzdaten importieren</button>
            <label class="osm-file-button btn" title="OpenStreetMap-XML-Datei (.osm) auswählen">OSM-Datei auswählen<input id="osmFileInput" type="file" accept=".osm,.xml,text/xml,application/xml" onchange="handleOsmFileInput(this)" hidden></label>
          </div>
        </div>
      </div>

      <div class="map-meta" aria-live="polite">
        <span id="mapDrawStatus">Zum Erfassen Objekt wählen, dann Punkt/Linie/Polygon aktivieren.</span>
        <span id="osmImportSummary" class="osm-import-summary">${osmImportSummaryHtml()}</span>
      </div>

      <div class="map-card card">
        <div id="gardenMap" class="garden-map" role="application" aria-label="Karte der Gartenanlage"></div>
        <p class="subtle map-note">Die Basiskarte wird online von OpenStreetMap geladen. Vereinsdaten und erfasste Geometrien bleiben lokal in der Gartenakte.</p>
      </div>
      <div class="card wide lease-area-list">
        <h2>Pachtflächen</h2>
        <p class="subtle">Pachtflächen sind die tatsächlich vom Verein gepachteten Flächen. Sie können einem vollständigen oder nur einem Teil eines Flurstücks entsprechen.</p>
        <table><thead><tr><th>Name</th><th>Flurstück</th><th>Vertrag</th><th>Umfang</th><th>Fläche</th><th>Geometrie</th><th></th></tr></thead><tbody>
          ${db.leaseAreas.map(a => `<tr><td><b>${esc(a.name || 'Pachtfläche')}</b></td><td>${esc(landParcelName(a.landParcelId))}</td><td>${esc(contractName(a.contractId))}</td><td>${esc(a.coverage || 'teilweise')}</td><td>${esc(a.area ? a.area + ' m²' : '–')}</td><td>${a.geometry ? esc(`${a.geometry.type} · ${geometryPointCount(a.geometry)} Punkte`) : '–'}</td><td><button onclick="editLeaseArea('${a.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Noch keine Pachtflächen.</td></tr>'}
        </tbody></table>
      </div>
    </div>`;
}

function mapTargetItems(type) {
  if (type === 'plot') return db.plots.map(x => ({ id: x.id, label: plotName(x.id) }));
  if (type === 'landParcel') return db.landParcels.map(x => ({ id: x.id, label: landParcelName(x.id) }));
  if (type === 'leaseArea') return db.leaseAreas.map(x => ({ id: x.id, label: x.name || 'Pachtfläche' }));
  if (type === 'way') return db.ways.map(x => ({ id: x.id, label: x.name }));
  if (type === 'inventory') return db.inventory.map(x => ({ id: x.id, label: `${x.type} · ${inventoryName(x.id)}` }));
  return [];
}

function updateMapTargetOptions() {
  const type = document.querySelector('#mapTargetType')?.value || 'plot';
  const target = document.querySelector('#mapTargetId');
  if (!target) return;
  const items = mapTargetItems(type);
  target.innerHTML = items.map(x => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('') || '<option value="">– keine Objekte –</option>';
}

function geometryForTarget(type, id) {
  if (type === 'plot') return legacyGeometry(byId(db.plots, id), 'plot');
  if (type === 'landParcel') return byId(db.landParcels, id)?.geometry || null;
  if (type === 'leaseArea') return byId(db.leaseAreas, id)?.geometry || null;
  if (type === 'way') return legacyGeometry(byId(db.ways, id), 'way');
  if (type === 'inventory') return legacyGeometry(byId(db.inventory, id), 'inventory');
  return null;
}

function applyGeometryToTarget(type, id, geometry) {
  if (!id || !geometry) return false;
  if (type === 'plot') {
    const item = byId(db.plots, id);
    if (!item) return false;
    item.geometry = geometry;
    if (geometry.type === 'Point') {
      item.longitude = geometry.coordinates[0];
      item.latitude = geometry.coordinates[1];
    }
    return true;
  }
  if (type === 'landParcel') {
    const item = byId(db.landParcels, id);
    if (!item) return false;
    item.geometry = geometry;
    return true;
  }
  if (type === 'leaseArea') {
    const item = byId(db.leaseAreas, id);
    if (!item) return false;
    item.geometry = geometry;
    return true;
  }
  if (type === 'way') {
    const item = byId(db.ways, id);
    if (!item) return false;
    item.geometry = geometry;
    if (geometry.type === 'LineString') item.path = pathFromCoordinates(geometry.coordinates);
    return true;
  }
  if (type === 'inventory') {
    const item = byId(db.inventory, id);
    if (!item) return false;
    item.geometry = geometry;
    if (geometry.type === 'Point') {
      item.longitude = geometry.coordinates[0];
      item.latitude = geometry.coordinates[1];
      item.path = '';
    } else if (geometry.type === 'LineString') {
      item.path = pathFromCoordinates(geometry.coordinates);
    }
    return true;
  }
  return false;
}

function gardenMapStyle(category) {
  const styles = {
    plot: { color: '#2f6f44', fillColor: '#4f8d62', weight: 2, fillOpacity: 0.2 },
    landParcel: { color: '#5a6470', fillColor: '#9aa2aa', weight: 2, fillOpacity: 0.08, dashArray: '5 5' },
    leaseArea: { color: '#8b5e34', fillColor: '#c58c55', weight: 2, fillOpacity: 0.18 },
    way: { color: '#796d5f', weight: 4, opacity: 0.75 },
    water: { color: '#2f6f9f', weight: 4, opacity: 0.85 },
    power: { color: '#8a6d1e', weight: 4, opacity: 0.85 },
    inventory: { color: '#3f4842', fillColor: '#ffffff', weight: 2, fillOpacity: 1 },
    reference: { color: '#6b7280', fillColor: '#94a3b8', weight: 2, fillOpacity: 0.04, dashArray: '8 6' }
  };
  return styles[category] || styles.inventory;
}

function addGeometryToMap(geometry, category, label) {
  if (!gardenMapLayerGroup || !geometry || !window.L) return null;
  const style = gardenMapStyle(category);
  let layer = null;
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    layer = L.circleMarker([lat, lng], { ...style, radius: 6 });
  } else if (geometry.type === 'LineString') {
    layer = L.polyline(geometry.coordinates.map(([lng, lat]) => [lat, lng]), style);
  } else if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates?.[0] || [];
    layer = L.polygon(ring.map(([lng, lat]) => [lat, lng]), style);
  }
  if (layer) {
    if (label) layer.bindPopup(`<b>${esc(label)}</b>`);
    gardenMapLayerGroup.addLayer(layer);
  }
  return layer;
}

function mapLayerEnabled(name) {
  const input = document.querySelector(`[data-map-layer="${name}"]`);
  return !input || input.checked;
}

function refreshGardenMapLayers() {
  if (!gardenMap || !gardenMapLayerGroup) return;
  gardenMapLayerGroup.clearLayers();

  if (mapLayerEnabled('plots')) {
    db.plots.forEach(p => addGeometryToMap(legacyGeometry(p, 'plot'), 'plot', plotName(p.id)));
  }
  if (mapLayerEnabled('landparcels')) {
    db.landParcels.forEach(f => addGeometryToMap(f.geometry, 'landParcel', landParcelName(f.id)));
  }
  if (mapLayerEnabled('leaseareas')) {
    db.leaseAreas.forEach(a => addGeometryToMap(a.geometry, 'leaseArea', a.name || 'Pachtfläche'));
  }
  if (mapLayerEnabled('ways')) {
    db.ways.forEach(w => addGeometryToMap(legacyGeometry(w, 'way'), 'way', w.name));
  }
  if (mapLayerEnabled('osmreference')) {
    (db.mapReferences || []).forEach(r => addGeometryToMap(r.geometry, 'reference', r.name || 'OSM-Referenz'));
  }

  db.inventory.forEach(i => {
    const geom = legacyGeometry(i, 'inventory');
    if (!geom) return;
    if (['Wasserleitung', 'Wasserstrang'].includes(i.type) && mapLayerEnabled('water')) addGeometryToMap(geom, 'water', inventoryName(i.id));
    else if (i.type === 'Stromleitung' && mapLayerEnabled('power')) addGeometryToMap(geom, 'power', inventoryName(i.id));
    else if (!['Wasserleitung', 'Wasserstrang', 'Stromleitung'].includes(i.type) && mapLayerEnabled('inventory')) addGeometryToMap(geom, 'inventory', `${i.type} · ${inventoryName(i.id)}`);
  });
}

function zoomRelevantGardenGeometries() {
  return [
    ...db.plots.map(p => legacyGeometry(p, 'plot')),
    ...db.landParcels.map(f => f.geometry),
    ...db.leaseAreas.map(a => a.geometry),
    ...db.ways.map(w => legacyGeometry(w, 'way')),
    ...db.inventory.map(i => legacyGeometry(i, 'inventory')),
    ...(db.mapReferences || [])
      .filter(r => r.category === 'Koloniegrenze')
      .map(r => r.geometry)
  ].filter(Boolean);
}

function collectGeometryLatLngs(geometry, result = []) {
  if (!geometry) return result;

  if (geometry.type === 'Feature') {
    return collectGeometryLatLngs(geometry.geometry, result);
  }
  if (geometry.type === 'FeatureCollection') {
    (geometry.features || []).forEach(feature => collectGeometryLatLngs(feature, result));
    return result;
  }
  if (geometry.type === 'GeometryCollection') {
    (geometry.geometries || []).forEach(item => collectGeometryLatLngs(item, result));
    return result;
  }

  const pushPosition = position => {
    if (!Array.isArray(position) || position.length < 2) return;
    const lng = Number(position[0]);
    const lat = Number(position[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    result.push(L.latLng(lat, lng));
  };

  const walkPositions = value => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && !Array.isArray(value[0])) {
      pushPosition(value);
      return;
    }
    value.forEach(walkPositions);
  };

  switch (geometry.type) {
    case 'Point':
    case 'MultiPoint':
    case 'LineString':
    case 'MultiLineString':
    case 'Polygon':
    case 'MultiPolygon':
      walkPositions(geometry.coordinates);
      break;
    default:
      break;
  }

  return result;
}

function allGardenMapLatLngs() {
  if (!window.L) return [];
  const points = [];
  zoomRelevantGardenGeometries().forEach(geometry => collectGeometryLatLngs(geometry, points));

  const unique = new Map();
  points.forEach(point => {
    const key = `${point.lat.toFixed(8)},${point.lng.toFixed(8)}`;
    if (!unique.has(key)) unique.set(key, point);
  });
  return [...unique.values()];
}

function initGardenMap() {
  const el = document.getElementById('gardenMap');
  if (!el || document.querySelector('#map')?.classList.contains('hidden')) return;
  if (!window.L) {
    el.innerHTML = '<div class="map-unavailable"><b>Kartenbibliothek nicht geladen.</b><br>Für die Basiskarte wird beim ersten Öffnen eine Internetverbindung benötigt.</div>';
    return;
  }
  if (gardenMap) {
    gardenMap.remove();
    gardenMap = null;
  }
  gardenMap = L.map(el, { zoomControl: true }).setView([51.53, 9.94], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap-Mitwirkende'
  }).addTo(gardenMap);
  gardenMapLayerGroup = L.layerGroup().addTo(gardenMap);
  gardenMap.on('click', handleGardenMapClick);
  updateMapTargetOptions();
  refreshGardenMapLayers();
  if (allGardenMapLatLngs().length) fitGardenMapToData();
  setTimeout(() => gardenMap?.invalidateSize(), 60);
}

function fitGardenMapToData() {
  if (!gardenMap) initGardenMap();
  if (!gardenMap || !window.L) return;

  gardenMap.invalidateSize({ pan: false });
  const points = allGardenMapLatLngs();

  if (!points.length) {
    updateMapDrawStatus('Keine vorhandenen Geometriedaten zum Zoomen gefunden.');
    return;
  }

  gardenMap.stop();

  if (points.length === 1) {
    gardenMap.setView(points[0], 17, { animate: false });
    updateMapDrawStatus('Auf vorhandene Geometriedaten gezoomt.');
    return;
  }

  const bounds = L.latLngBounds(points);
  if (!bounds.isValid()) {
    updateMapDrawStatus('Keine vorhandenen Geometriedaten zum Zoomen gefunden.');
    return;
  }

  if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
    gardenMap.setView(bounds.getCenter(), 17, { animate: false });
    updateMapDrawStatus('Auf vorhandene Geometriedaten gezoomt.');
    return;
  }

  gardenMap.fitBounds(bounds, {
    padding: [30, 30],
    maxZoom: 18,
    animate: false
  });
  updateMapDrawStatus('Auf vorhandene Geometriedaten gezoomt.');
}

function startMapDraw(mode) {
  if (!gardenMap) initGardenMap();
  gardenMapDraft = { mode, points: [] };
  updateMapDrawStatus();
  refreshMapDraftLayer();
}

function handleGardenMapClick(event) {
  if (!gardenMapDraft.mode) return;
  const { lat, lng } = event.latlng;
  if (gardenMapDraft.mode === 'Point') gardenMapDraft.points = [[lng, lat]];
  else gardenMapDraft.points.push([lng, lat]);
  refreshMapDraftLayer();
  updateMapDrawStatus();
}

function refreshMapDraftLayer() {
  if (!gardenMap || !window.L) return;
  if (gardenMapDraftLayer) {
    gardenMap.removeLayer(gardenMapDraftLayer);
    gardenMapDraftLayer = null;
  }
  const pts = gardenMapDraft.points || [];
  if (!pts.length) return;
  if (gardenMapDraft.mode === 'Point') {
    gardenMapDraftLayer = L.circleMarker([pts[0][1], pts[0][0]], { radius: 7, color: '#1f6f43', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }).addTo(gardenMap);
  } else if (gardenMapDraft.mode === 'LineString') {
    gardenMapDraftLayer = L.polyline(pts.map(([lng, lat]) => [lat, lng]), { color: '#1f6f43', weight: 4, dashArray: '6 5' }).addTo(gardenMap);
  } else if (gardenMapDraft.mode === 'Polygon') {
    gardenMapDraftLayer = L.polygon(pts.map(([lng, lat]) => [lat, lng]), { color: '#1f6f43', weight: 3, fillColor: '#1f6f43', fillOpacity: 0.12, dashArray: '6 5' }).addTo(gardenMap);
  }
}

function updateMapDrawStatus(message = '') {
  document.querySelectorAll('[data-map-draw-mode]').forEach(button => {
    const active = button.dataset.mapDrawMode === gardenMapDraft.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const status = document.getElementById('mapDrawStatus');
  if (!status) return;
  if (message) {
    status.textContent = message;
    return;
  }
  if (!gardenMapDraft.mode) {
    status.textContent = 'Zum Erfassen Objekt wählen, dann Punkt/Linie/Polygon aktivieren.';
    return;
  }
  const names = { Point: 'Punkt', LineString: 'Linie', Polygon: 'Polygon' };
  status.textContent = `${names[gardenMapDraft.mode]} aktiv · ${gardenMapDraft.points.length} Punkt(e) gesetzt. In die Karte klicken.`;
}

function undoMapPoint() {
  gardenMapDraft.points.pop();
  refreshMapDraftLayer();
  updateMapDrawStatus();
}

function cancelMapDrawing() {
  gardenMapDraft = { mode: '', points: [] };
  if (gardenMapDraftLayer && gardenMap) gardenMap.removeLayer(gardenMapDraftLayer);
  gardenMapDraftLayer = null;
  updateMapDrawStatus();
}

function saveMapDrawing() {
  const type = document.getElementById('mapTargetType')?.value;
  const id = document.getElementById('mapTargetId')?.value;
  const mode = gardenMapDraft.mode;
  const points = gardenMapDraft.points || [];
  if (!type || !id) return alert('Bitte zuerst ein Zielobjekt auswählen.');
  if (!mode) return alert('Bitte Punkt, Linie oder Polygon auswählen und in der Karte erfassen.');
  if (['landParcel', 'leaseArea'].includes(type) && mode !== 'Polygon') return alert('Flurstücke und Pachtflächen werden als Polygon erfasst.');
  if (type === 'way' && mode !== 'LineString') return alert('Wege werden als Linie erfasst.');
  if (type === 'inventory') {
    const item = byId(db.inventory, id);
    const isLineObject = ['Wasserleitung', 'Wasserstrang', 'Stromleitung'].includes(item?.type);
    if (isLineObject && mode !== 'LineString') return alert('Leitungen werden als Linie erfasst.');
    if (!isLineObject && mode !== 'Point') return alert('Dieses Inventarobjekt wird als Punkt erfasst.');
  }
  if (mode === 'Point' && points.length !== 1) return alert('Für einen Punkt genau eine Position setzen.');
  if (mode === 'LineString' && points.length < 2) return alert('Eine Linie benötigt mindestens zwei Punkte.');
  if (mode === 'Polygon' && points.length < 3) return alert('Ein Polygon benötigt mindestens drei Punkte.');
  const geometry = mode === 'Point'
    ? { type: 'Point', coordinates: points[0] }
    : mode === 'LineString'
      ? { type: 'LineString', coordinates: [...points] }
      : { type: 'Polygon', coordinates: [[...points, points[0]]] };
  if (!applyGeometryToTarget(type, id, geometry)) return alert('Geometrie konnte dem Objekt nicht zugeordnet werden.');
  cancelMapDrawing();
  save();
  setTimeout(() => {
    initGardenMap();
    updateMapDrawStatus('Geometrie gespeichert.');
  }, 0);
}


let pendingOsmImport = null;

function osmImportSummaryHtml() {
  const items = db.osmImports || [];
  if (!items.length) return 'Noch kein OSM-Datensatz importiert. Der mitgelieferte Export enthält die Anlage Rosengarten als Vektordaten.';
  const last = items[items.length - 1];
  return `Letzter OSM-Import: <b>${esc(last.sourceName || 'OSM')}</b> · ${esc(last.importedAt ? new Date(last.importedAt).toLocaleString('de-DE') : '')} · ${Number(last.matchedPlots || 0)} Parzellen, ${Number(last.ways || 0)} Wege, ${Number(last.gates || 0)} Außentore.`;
}

function osmTags(element) {
  const tags = {};
  element.querySelectorAll(':scope > tag').forEach(tag => { tags[tag.getAttribute('k')] = tag.getAttribute('v') || ''; });
  return tags;
}

function pointInsideRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryCentroid(geometry) {
  const ring = geometry?.type === 'Polygon' ? (geometry.coordinates?.[0] || []) : [];
  if (!ring.length) return null;
  const usable = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
  if (!usable.length) return null;
  return [usable.reduce((s, p) => s + p[0], 0) / usable.length, usable.reduce((s, p) => s + p[1], 0) / usable.length];
}

function normalizeGardenWayName(name) {
  const value = String(name || '').trim().toLocaleLowerCase('de-DE');
  const aliases = {
    'niemannweg': 'otto-niemann-weg',
    'otto-niemann-weg': 'otto-niemann-weg',
    'schlieperweg': 'walter-schlieper-weg',
    'walter-schlieper-weg': 'walter-schlieper-weg',
    'gehrkeweg': 'bernhard-gehrke-weg',
    'bernhard-gehrke-weg': 'bernhard-gehrke-weg',
    'rosenweg': 'rosenweg',
    'reinhäuser landstraße': 'reinhäuser landstraße'
  };
  return aliases[value] || value;
}

function parseOsmXml(text, sourceName = 'OSM-Datei') {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Die OSM-Datei ist kein gültiges XML-Dokument.');
  const root = xml.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'osm') throw new Error('Die Datei enthält keinen OSM-Export.');

  const nodes = new Map();
  root.querySelectorAll(':scope > node').forEach(node => {
    nodes.set(node.getAttribute('id'), {
      coordinates: [Number(node.getAttribute('lon')), Number(node.getAttribute('lat'))],
      tags: osmTags(node)
    });
  });

  const ways = new Map();
  root.querySelectorAll(':scope > way').forEach(way => {
    const refs = [...way.querySelectorAll(':scope > nd')].map(nd => nd.getAttribute('ref'));
    ways.set(way.getAttribute('id'), { refs, tags: osmTags(way) });
  });

  const wayCoordinates = id => (ways.get(id)?.refs || []).map(ref => nodes.get(ref)?.coordinates).filter(p => p && p.every(Number.isFinite));
  const boundaryParts = [];
  const boundaryNodeIds = new Set();
  let relationId = '';
  root.querySelectorAll(':scope > relation').forEach(rel => {
    const tags = osmTags(rel);
    if (relationId || tags.type !== 'multipolygon' || tags.landuse !== 'allotments' || tags.name !== 'Gartenkolonie Rosengarten') return;
    relationId = `relation/${rel.getAttribute('id')}`;
    rel.querySelectorAll(':scope > member[type="way"][role="outer"]').forEach(member => {
      const wayId = member.getAttribute('ref');
      (ways.get(wayId)?.refs || []).forEach(ref => boundaryNodeIds.add(ref));
      const coords = wayCoordinates(wayId);
      if (coords.length < 3) return;
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) coords.push([...coords[0]]);
      boundaryParts.push({ osmId: `way/${wayId}`, name: 'Gartenkolonie Rosengarten', geometry: { type: 'Polygon', coordinates: [coords] }, tags: ways.get(wayId)?.tags || {} });
    });
  });

  const insideColony = point => !boundaryParts.length || boundaryParts.some(part => pointInsideRing(point, part.geometry.coordinates[0]));
  const plots = [];
  ways.forEach((way, id) => {
    if (way.tags.allotments !== 'plot' || !way.tags.ref) return;
    const coords = wayCoordinates(id);
    if (coords.length < 3) return;
    if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) coords.push([...coords[0]]);
    const geometry = { type: 'Polygon', coordinates: [coords] };
    const center = geometryCentroid(geometry);
    if (center && insideColony(center)) plots.push({ osmId: `way/${id}`, ref: way.tags.ref, geometry, tags: way.tags });
  });

  const wantedWays = new Set(['rosenweg', 'otto-niemann-weg', 'walter-schlieper-weg', 'bernhard-gehrke-weg', 'reinhäuser landstraße']);
  const groupedWays = new Map();
  ways.forEach((way, id) => {
    const name = way.tags.name || '';
    const key = normalizeGardenWayName(name);
    if (!wantedWays.has(key)) return;
    const coords = wayCoordinates(id);
    if (coords.length < 2) return;
    if (!groupedWays.has(key)) groupedWays.set(key, { name, segments: [], osmIds: [], tags: way.tags });
    const group = groupedWays.get(key);
    group.segments.push(coords);
    group.osmIds.push(id);
  });
  const samePoint = (a, b) => a && b && Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12;
  const mergeLineSegments = segments => {
    const remaining = segments.map(line => line.map(point => [...point]));
    if (!remaining.length) return [];
    let result = remaining.shift();
    while (remaining.length) {
      let merged = false;
      for (let i = 0; i < remaining.length; i += 1) {
        const line = remaining[i];
        if (samePoint(result[result.length - 1], line[0])) result.push(...line.slice(1));
        else if (samePoint(result[result.length - 1], line[line.length - 1])) result.push(...line.slice(0, -1).reverse());
        else if (samePoint(result[0], line[line.length - 1])) result = [...line.slice(0, -1), ...result];
        else if (samePoint(result[0], line[0])) result = [...line.slice(1).reverse(), ...result];
        else continue;
        remaining.splice(i, 1);
        merged = true;
        break;
      }
      if (!merged) result.push(...remaining.shift());
    }
    return result;
  };
  const gardenWays = [...groupedWays.values()].map(group => ({
    osmId: `ways/${group.osmIds.join(',')}`,
    name: group.name,
    geometry: { type: 'LineString', coordinates: mergeLineSegments(group.segments) },
    tags: group.tags
  }));

  const gates = [];
  nodes.forEach((node, id) => {
    if (node.tags.barrier !== 'gate' || !(insideColony(node.coordinates) || boundaryNodeIds.has(id))) return;
    gates.push({ osmId: `node/${id}`, name: node.tags.name || (node.tags.ref ? `Außentor ${node.tags.ref}` : 'Außentor'), geometry: { type: 'Point', coordinates: node.coordinates }, tags: node.tags });
  });

  const boundsEl = root.querySelector(':scope > bounds');
  const bounds = boundsEl ? {
    minlat: Number(boundsEl.getAttribute('minlat')),
    minlon: Number(boundsEl.getAttribute('minlon')),
    maxlat: Number(boundsEl.getAttribute('maxlat')),
    maxlon: Number(boundsEl.getAttribute('maxlon'))
  } : null;

  const knownRefs = new Set(plots.map(p => String(p.ref)));
  const missingPlotRefs = db.plots.map(p => String(p.number)).filter(number => number && !knownRefs.has(number)).sort((a, b) => Number(a) - Number(b));
  return {
    format: 'Gartenakte-OSM-Referenz',
    source: 'OpenStreetMap',
    sourceName,
    attribution: '© OpenStreetMap-Mitwirkende',
    license: 'ODbL 1.0',
    bounds,
    colony: { name: 'Gartenkolonie Rosengarten', relationId, boundaries: boundaryParts },
    plots,
    ways: gardenWays,
    gates,
    summary: { plots: plots.length, ways: gardenWays.length, gates: gates.length, boundaryParts: boundaryParts.length, missingPlotRefs }
  };
}

async function loadBundledOsmImport() {
  try {
    const response = await fetch('data/rosengarten-osm.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    data.sourceName = 'Mitgelieferter OSM-Export map.osm';
    prepareOsmImport(data);
  } catch (error) {
    alert(`OSM-Referenzdaten konnten nicht geladen werden: ${error.message}`);
  }
}

async function handleOsmFileInput(input) {
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    prepareOsmImport(parseOsmXml(text, file.name));
  } catch (error) {
    alert(`OSM-Datei konnte nicht verarbeitet werden: ${error.message}`);
  } finally {
    input.value = '';
  }
}

function prepareOsmImport(data) {
  pendingOsmImport = data;
  const plotMatches = (data.plots || []).filter(feature => db.plots.some(plot => String(plot.number) === String(feature.ref))).length;
  const wayMatches = (data.ways || []).filter(feature => db.ways.some(way => normalizeGardenWayName(way.name) === normalizeGardenWayName(feature.name))).length;
  const missing = (data.summary?.missingPlotRefs || []).join(', ') || 'keine';
  showDialog('OSM-Daten prüfen und importieren', `
    <div class="osm-preview">
      <div class="osm-preview-source"><b>${esc(data.sourceName || 'OSM-Datensatz')}</b></div>

      <div class="osm-preview-metrics" aria-label="Zusammenfassung des OSM-Imports">
        <div class="osm-preview-metric">
          <span class="osm-preview-metric-label">Parzellen</span>
          <strong class="osm-preview-metric-value">${Number(data.plots?.length || 0)}</strong>
          <small>${plotMatches} vorhandenen Gartenakten zuordenbar</small>
        </div>
        <div class="osm-preview-metric">
          <span class="osm-preview-metric-label">Wege</span>
          <strong class="osm-preview-metric-value">${Number(data.ways?.length || 0)}</strong>
          <small>${wayMatches} vorhandenen Wegen zuordenbar</small>
        </div>
        <div class="osm-preview-metric">
          <span class="osm-preview-metric-label">Außentore</span>
          <strong class="osm-preview-metric-value">${Number(data.gates?.length || 0)}</strong>
          <small>innerhalb oder auf der Koloniegrenze</small>
        </div>
        <div class="osm-preview-metric">
          <span class="osm-preview-metric-label">Koloniegrenze</span>
          <strong class="osm-preview-metric-value">${Number(data.colony?.boundaries?.length || 0)}</strong>
          <small>Polygonteil(e)</small>
        </div>
      </div>

      <div class="osm-import-hint" role="note">
        <b>Ohne OSM-Referenz innerhalb des Exports:</b> ${esc(missing)}
        <span>Bestehende Fachdatensätze werden nicht gelöscht; erkannte Geometrien werden ergänzt bzw. aktualisiert.</span>
      </div>

      <fieldset class="osm-import-options">
        <legend>Importieren</legend>
        <label><input id="osmImportPlots" type="checkbox" checked><span>Parzellengeometrien anhand der OSM-ref-Nummer zuordnen</span></label>
        <label><input id="osmImportWays" type="checkbox" checked><span>Wege zuordnen bzw. fehlende Wege anlegen</span></label>
        <label><input id="osmImportGates" type="checkbox" checked><span>Außentore innerhalb oder auf der Koloniegrenze übernehmen</span></label>
        <label><input id="osmImportBoundary" type="checkbox" checked><span>Koloniegrenze als OSM-Referenzebene speichern</span></label>
      </fieldset>

      <div class="osm-import-source"><b>Quelle:</b> OpenStreetMap · ODbL 1.0 · © OpenStreetMap-Mitwirkende</div>
      <div class="actions osm-import-actions"><button class="primary" type="button" onclick="applyPendingOsmImport()">Ausgewählte Daten importieren</button><button type="button" onclick="dlg.close()">Abbrechen</button></div>
    </div>`);
}

function upsertOsmReference(feature, index = 0) {
  db.mapReferences = db.mapReferences || [];
  const sourceId = feature.osmId || `boundary/${index + 1}`;
  let item = db.mapReferences.find(x => x.source === 'OSM' && x.sourceId === sourceId);
  const value = { id: item?.id || uid(), source: 'OSM', sourceId, category: 'Koloniegrenze', name: feature.name || `Gartenkolonie Rosengarten ${index + 1}`, geometry: feature.geometry, tags: feature.tags || {}, importedAt: now() };
  if (item) Object.assign(item, value); else db.mapReferences.push(value);
}

function applyPendingOsmImport() {
  const data = pendingOsmImport;
  if (!data) return;
  let matchedPlots = 0, waysChanged = 0, gatesChanged = 0;

  if (document.getElementById('osmImportPlots')?.checked) {
    (data.plots || []).forEach(feature => {
      const plot = db.plots.find(item => String(item.number) === String(feature.ref));
      if (!plot) return;
      plot.geometry = feature.geometry;
      plot.osmId = feature.osmId;
      plot.osmImportedAt = now();
      matchedPlots += 1;
    });
  }

  if (document.getElementById('osmImportWays')?.checked) {
    (data.ways || []).forEach(feature => {
      let way = db.ways.find(item => normalizeGardenWayName(item.name) === normalizeGardenWayName(feature.name));
      if (!way) {
        way = { id: uid(), name: feature.name, path: '', geometry: null, note: 'Aus OpenStreetMap übernommen.' };
        db.ways.push(way);
      }
      way.geometry = feature.geometry;
      way.path = pathFromCoordinates(feature.geometry?.coordinates || []);
      way.osmId = feature.osmId;
      way.osmName = feature.name;
      way.osmImportedAt = now();
      waysChanged += 1;
    });
  }

  if (document.getElementById('osmImportGates')?.checked) {
    (data.gates || []).forEach((feature, index) => {
      let gate = db.inventory.find(item => item.type === 'Außentor' && item.osmId === feature.osmId);
      const [lng, lat] = feature.geometry.coordinates;
      if (!gate) {
        gate = ensureInventoryGeoFields({ id: uid(), type: 'Außentor', bmk: '', name: feature.name || `Außentor ${index + 1}`, parentId: '', status: 'aktiv', latitude: lat, longitude: lng, path: '', geometry: feature.geometry, note: 'Aus OpenStreetMap übernommen.', osmId: feature.osmId, osmImportedAt: now() });
        db.inventory.push(gate);
      } else {
        Object.assign(gate, { geometry: feature.geometry, latitude: lat, longitude: lng, osmImportedAt: now() });
      }
      gatesChanged += 1;
    });
  }

  if (document.getElementById('osmImportBoundary')?.checked) {
    (data.colony?.boundaries || []).forEach(upsertOsmReference);
  }

  db.osmImports = db.osmImports || [];
  db.osmImports.push({
    id: uid(),
    sourceName: data.sourceName || data.sourceFile || 'OSM-Datensatz',
    importedAt: now(),
    attribution: data.attribution || '© OpenStreetMap-Mitwirkende',
    license: data.license || 'ODbL 1.0',
    bounds: data.bounds || null,
    matchedPlots,
    ways: waysChanged,
    gates: gatesChanged,
    boundaryParts: Number(data.colony?.boundaries?.length || 0),
    missingPlotRefs: data.summary?.missingPlotRefs || []
  });

  pendingOsmImport = null;
  save();
  dlg.close();
  tab('map');
  setTimeout(() => {
    initGardenMap();
    fitGardenMapToData();
    alert(`OSM-Import abgeschlossen: ${matchedPlots} Parzellen, ${waysChanged} Wege und ${gatesChanged} Außentore verarbeitet.`);
  }, 0);
}

function editLeaseArea(id) {
  const a = byId(db.leaseAreas, id) || { id: '', name: '', landParcelId: '', contractId: '', coverage: 'teilweise', area: '', geometry: null, note: '' };
  showDialog(a.id ? 'Pachtfläche bearbeiten' : 'Pachtfläche anlegen', `<form id="fleasearea" class="formgrid"><label class="full">Bezeichnung<input name="name" required value="${esc(a.name)}" placeholder="z. B. Vereinsfläche auf Flurstück 11/5"></label><label>Flurstück<select name="landParcelId">${landParcelOptions(a.landParcelId)}</select></label><label>Vertrag<select name="contractId">${opts(db.contracts, a.contractId, c => contractName(c.id))}</select></label><label>Umfang<select name="coverage"><option ${a.coverage === 'vollständig' ? 'selected' : ''}>vollständig</option><option ${a.coverage === 'teilweise' ? 'selected' : ''}>teilweise</option></select></label><label>Vertragliche Fläche m²<input type="number" step="0.01" name="area" value="${esc(a.area)}"></label><label class="full">Notiz<textarea name="note">${esc(a.note)}</textarea></label><div class="full subtle">Geometrie: ${a.geometry ? esc(`${a.geometry.type} · ${geometryPointCount(a.geometry)} Punkte`) : 'noch nicht erfasst'} – kann anschließend im Karteneditor gezeichnet werden.</div><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fleasearea.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const o = { id: a.id || uid(), name: f.get('name').trim(), landParcelId: f.get('landParcelId'), contractId: f.get('contractId'), coverage: f.get('coverage'), area: f.get('area'), geometry: a.geometry || null, note: f.get('note').trim() };
    a.id ? Object.assign(a, o) : db.leaseAreas.push(o);
    save();
    dlg.close();
  };
}

function renderLandParcels() {
  document.querySelector('#landparcels').innerHTML = `
    <div class="actions"><button class="primary" onclick="editLandParcel()">+ Flurstück</button><button onclick="editPlotLandParcel()">+ Parzelle ↔ Flurstück</button></div>
    <div class="card wide"><table><thead><tr><th>Flurstück</th><th>Amtliche Fläche</th><th>Parzellen</th><th>Pachtflächen</th><th>Geometrie</th><th></th></tr></thead><tbody>
    ${db.landParcels.map(f => `<tr><td><b>${esc(landParcelName(f.id))}</b></td><td>${esc(f.area ? f.area + ' m²' : '–')}</td><td>${db.plotLandParcels.filter(r=>r.landParcelId===f.id).map(r=>esc(plotName(r.plotId))).join(', ') || '–'}</td><td>${db.leaseAreas.filter(a=>a.landParcelId===f.id).map(a=>esc(a.name || 'Pachtfläche')).join(', ') || '–'}</td><td>${f.geometry ? esc(`${f.geometry.type} · ${geometryPointCount(f.geometry)} Punkte`) : '–'}</td><td><button onclick="editLandParcel('${f.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Flurstücke.</td></tr>'}
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
  const meterView = types.length === 1 && ['Wasserzähler', 'Stromzähler'].includes(types[0]);
  const meterHeaders = meterView ? '<th>Zählernummer</th><th>Zählstellennummer</th><th>Letzte Ablesung</th>' : '';
  const addLabel = ({ 'Außentore': 'Außentor', 'Wasserleitungen': 'Wasserleitung', 'Absperrschieber': 'Absperrschieber', 'Wasserzähler': 'Wasserzähler', 'Stromleitungen': 'Stromleitung', 'Unterverteilungen': 'Unterverteilung', 'Stromzähler': 'Stromzähler' })[title] || 'Inventarobjekt';
  section.innerHTML = `
    <div class="actions"><button class="primary" onclick="editInventory(null, '${esc(types[0])}')">+ ${esc(addLabel)}</button></div>
    <div class="card wide"><table><thead><tr><th>Typ</th><th>BMK / Bezeichnung</th>${meterHeaders}<th>Übergeordnet</th><th>Ort / Geometrie</th><th>Status</th><th>Parzellen</th><th></th></tr></thead><tbody>
    ${items.map(i => {
      ensureInventoryGeoFields(i);
      const plots = db.plots.filter(p => [p.waterLineId,p.waterValveId,p.waterMeterId,p.electricPanelId,p.electricMeterId].includes(i.id)).map(p=>plotName(p.id));
      const geomObj = legacyGeometry(i, 'inventory');
      const geom = geomObj ? `${geomObj.type} · ${geometryPointCount(geomObj)} Punkt(e)` : '–';
      const latest = meterView ? meterLatestReading(i.id) : null;
      const meterCells = meterView ? `<td>${esc(i.meterNumber || '–')}</td><td>${esc(i.meteringPointNumber || '–')}</td><td>${latest ? `${esc(latest.date || '–')} · <b>${esc(latest.value)}</b> ${esc(i.unit || '')}` : '–'}</td>` : '';
      const meterAction = meterView ? `<button onclick="showMeterReadings('${i.id}')">Ablesungen</button> ` : '';
      return `<tr><td>${esc(i.type)}</td><td><b>${esc(i.bmk || '–')}</b><br>${esc(i.name || '')}</td>${meterCells}<td>${esc(inventoryName(i.parentId))}</td><td>${esc(geom)}</td><td>${esc(i.status || '–')}</td><td>${plots.map(esc).join(', ') || '–'}</td><td>${meterAction}<button onclick="editInventory('${i.id}')">Bearbeiten</button></td></tr>`;
    }).join('') || `<tr><td colspan="${meterView ? 10 : 7}" class="muted">Noch keine ${esc(title)}.</td></tr>`}
    </tbody></table></div>`;
}

function showMeterReadings(meterId) {
  const meter = byId(db.inventory, meterId);
  if (!meter || !isMeter(meter)) return;
  const readings = [...db.meterReadings].filter(r => r.meterId === meterId).sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  showDialog(`Ablesungen · ${inventoryName(meterId)}`, `<div class="actions"><button class="primary" type="button" onclick="editMeterReading('${meterId}')">+ Zählerstand erfassen</button><button type="button" onclick="editInventory('${meterId}')">Zähler bearbeiten</button></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Datum</th><th>Stand</th><th>Verbrauch</th><th>Art</th><th>Bemerkung</th><th>Foto</th><th></th></tr></thead><tbody>${readings.map(r => { const usage = meterReadingUsage(meterId, r.id); return `<tr><td>${esc(r.date || '–')}</td><td><b>${esc(r.value)}</b> ${esc(meter.unit || '')}</td><td>${usage === null ? '–' : `${esc(usage.toLocaleString('de-DE'))} ${esc(meter.unit || '')}`}</td><td>${esc(r.readingType || 'manuell')}</td><td>${esc(r.note || '–')}</td><td>${r.photoData ? `<a href="${r.photoData}" target="_blank" rel="noopener">Foto</a>` : '–'}</td><td><button type="button" onclick="editMeterReading('${meterId}','${r.id}')">Bearbeiten</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Noch keine Ablesungen.</td></tr>'}</tbody></table></div>`);
}

function editMeterReading(meterId, readingId) {
  const meter = byId(db.inventory, meterId);
  if (!meter || !isMeter(meter)) return;
  const r = byId(db.meterReadings, readingId) || { id: '', meterId, date: today(), value: '', readingType: 'manuell', note: '', photoName: '', photoType: '', photoData: '', createdAt: now() };
  showDialog(r.id ? 'Zählerstand bearbeiten' : 'Zählerstand erfassen', `<form id="fmeterreading" class="formgrid"><div class="full"><b>${esc(inventoryName(meterId))}</b><br><span class="subtle">${esc(meter.meterNumber ? `Zählernummer ${meter.meterNumber}` : '')}${meter.meteringPointNumber ? ` · Zählstelle ${esc(meter.meteringPointNumber)}` : ''}</span></div><label>Ablesedatum<input type="date" name="date" required value="${esc(r.date)}"></label><label>Zählerstand (${esc(meter.unit || 'Einheit')})<input type="number" step="any" name="value" required value="${esc(r.value)}"></label><label>Ableseart<select name="readingType">${['manuell','Jahresablesung','Übergabe','Kontrolle','Einbau','Ausbau'].map(x=>`<option ${x===r.readingType?'selected':''}>${x}</option>`).join('')}</select></label><label class="full">Foto<input type="file" id="meterReadingPhoto" accept="image/*" capture="environment"></label>${r.photoName ? `<div class="full"><span class="badge">Foto vorhanden: ${esc(r.photoName)}</span></div>` : ''}<label class="full">Bemerkung<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="showMeterReadings('${meterId}')">Abbrechen</button></div></form>`);
  fmeterreading.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const o = { id: r.id || uid(), meterId, date: f.get('date'), value: f.get('value'), readingType: f.get('readingType'), note: f.get('note').trim(), photoName: r.photoName || '', photoType: r.photoType || '', photoData: r.photoData || '', createdAt: r.createdAt || now(), updatedAt: now() };
    const file = document.getElementById('meterReadingPhoto').files[0];
    if (file) { o.photoName = file.name; o.photoType = file.type; o.photoData = await fileToDataURL(file); }
    r.id ? Object.assign(r, o) : db.meterReadings.push(o);
    save();
    showMeterReadings(meterId);
  };
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
  if (r.targetType === 'Pachtfläche') { const a = byId(db.leaseAreas, r.targetId); return `Pachtfläche: ${esc(a?.name || '–')}`; }
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
  const w = byId(db.ways, id) || { id: '', name: '', path: '', geometry: null, note: '' };
  showDialog(w.id ? 'Weg bearbeiten' : 'Weg anlegen', `<form id="fw" class="formgrid"><label class="full">Bezeichnung<input name="name" required value="${esc(w.name)}" placeholder="z. B. Rosenweg"></label><label class="full">Koordinatenpfad<textarea name="path" placeholder="51.5321, 9.9342
51.5323, 9.9346">${esc(w.path || '')}</textarea><span class="subtle">${esc(pathHelp())}</span></label><label class="full">Notiz<textarea name="note">${esc(w.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fw.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: w.id || uid(), name: f.get('name').trim(), path: f.get('path').trim(), geometry: w.geometry || null, note: f.get('note').trim() }; w.id ? Object.assign(w, o) : db.ways.push(o); save(); dlg.close(); };
}
function editPlot(id) {
  const p = byId(db.plots, id) || { id: '', number: '', wayId: '', size: '', latitude: '', longitude: '', location: '', note: '', waterAvailable: false, electricityAvailable: false, waterLineId: '', waterValveId: '', waterMeterId: '', electricPanelId: '', electricMeterId: '', geometry: null };
  showDialog(p.id ? 'Parzelle bearbeiten' : 'Parzelle anlegen', `<form id="fplot" class="formgrid"><label>Gartennummer<input name="number" required value="${esc(p.number)}"></label><label>Weg<select name="wayId">${wayOptions(p.wayId)}</select></label><label>Größe m²<input type="number" step="0.01" name="size" value="${esc(p.size)}"></label><label>Lage / Zusatzbezeichnung<input name="location" value="${esc(p.location)}"></label><label>Breitengrad<input type="number" step="any" name="latitude" value="${esc(p.latitude)}" placeholder="51.123456"></label><label>Längengrad<input type="number" step="any" name="longitude" value="${esc(p.longitude)}" placeholder="9.123456"></label><fieldset class="full"><legend>Technische Versorgung</legend><div class="formgrid"><label class="checkline"><input type="checkbox" name="waterAvailable" ${p.waterAvailable ? 'checked' : ''}> Wasser vorhanden</label><label class="checkline"><input type="checkbox" name="electricityAvailable" ${p.electricityAvailable ? 'checked' : ''}> Strom vorhanden</label><label>Wasserleitung / Strang<select name="waterLineId">${inventoryOptions(p.waterLineId, ['Wasserleitung', 'Wasserstrang'])}</select></label><label>Schieber<select name="waterValveId">${inventoryOptions(p.waterValveId, ['Schieber'])}</select></label><label>Wasserzähler<select name="waterMeterId">${inventoryOptions(p.waterMeterId, ['Wasserzähler'])}</select></label><label>Unterverteilung<select name="electricPanelId">${inventoryOptions(p.electricPanelId, ['Unterverteilung'])}</select></label><label>Stromzähler<select name="electricMeterId">${inventoryOptions(p.electricMeterId, ['Stromzähler'])}</select></label></div></fieldset><label class="full">Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  fplot.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), number: f.get('number').trim(), wayId: f.get('wayId'), size: f.get('size'), location: f.get('location').trim(), latitude: f.get('latitude'), longitude: f.get('longitude'), waterAvailable: f.get('waterAvailable') === 'on', electricityAvailable: f.get('electricityAvailable') === 'on', waterLineId: f.get('waterLineId'), waterValveId: f.get('waterValveId'), waterMeterId: f.get('waterMeterId'), electricPanelId: f.get('electricPanelId'), electricMeterId: f.get('electricMeterId'), geometry: p.geometry || null, note: f.get('note').trim() }; p.id ? Object.assign(p, o) : db.plots.push(o); save(); dlg.close(); };
}
function editLandParcel(id) { const f = byId(db.landParcels, id) || { id: '', gemarkung: '', flur: '', number: '', area: '', geometry: null, note: '' }; showDialog(f.id ? 'Flurstück bearbeiten' : 'Flurstück anlegen', `<form id="flp" class="formgrid"><label>Gemarkung<input name="gemarkung" value="${esc(f.gemarkung)}"></label><label>Flur<input name="flur" value="${esc(f.flur)}"></label><label>Flurstücksnummer<input name="number" required value="${esc(f.number)}"></label><label>Fläche m²<input type="number" step="0.01" name="area" value="${esc(f.area)}"></label><label class="full">Notiz<textarea name="note">${esc(f.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); flp.onsubmit = e => { e.preventDefault(); const d = new FormData(e.target), o = { id: f.id || uid(), gemarkung: d.get('gemarkung').trim(), flur: d.get('flur').trim(), number: d.get('number').trim(), area: d.get('area'), geometry: f.geometry || null, note: d.get('note').trim() }; f.id ? Object.assign(f, o) : db.landParcels.push(o); save(); dlg.close(); }; }
function editPlotLandParcel(id) { if (!db.plots.length || !db.landParcels.length) {
    alert('Bitte zuerst Parzelle und Flurstück anlegen.');
    return;
} const r = byId(db.plotLandParcels, id) || { id: '', plotId: db.plots[0].id, landParcelId: db.landParcels[0].id, share: '', note: '' }; showDialog(r.id ? 'Flurstückszuordnung bearbeiten' : 'Flurstück zuordnen', `<form id="fpl" class="formgrid"><label>Parzelle<select name="plotId">${plotOptions(r.plotId)}</select></label><label>Flurstück<select name="landParcelId">${landParcelOptions(r.landParcelId)}</select></label><label>Anteil / Teilfläche<input name="share" value="${esc(r.share)}" placeholder="z. B. vollständig oder 120 m²"></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fpl.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), plotId: f.get('plotId'), landParcelId: f.get('landParcelId'), share: f.get('share').trim(), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.plotLandParcels.push(o); save(); dlg.close(); }; }
function toggleMeterFields(type) {
  const fieldset = document.getElementById('meterFields');
  if (fieldset) fieldset.hidden = !['Wasserzähler', 'Stromzähler'].includes(type);
}

function editInventory(id, defaultType = 'Schieber') {
  const types = ['Außentor', 'Wasserleitung', 'Wasserstrang', 'Schieber', 'Wasserzähler', 'Wasseranschluss', 'Stromleitung', 'Unterverteilung', 'Stromzähler', 'Sicherung/Abgang', 'Sonstiges'];
  const i = ensureInventoryGeoFields(byId(db.inventory, id) || { id: '', type: defaultType, bmk: '', name: '', parentId: '', status: 'aktiv', latitude: '', longitude: '', path: '', geometry: null, meterScope: '', meterNumber: '', meteringPointNumber: '', unit: '', installedAt: '', removedAt: '', note: '' });
  const meterFields = `<fieldset id="meterFields" class="full" ${isMeter(i) ? '' : 'hidden'}><legend>Zählerdaten</legend><div class="formgrid"><label>Zählerart<select name="meterScope"><option value="" ${!i.meterScope?'selected':''}>–</option><option value="intern" ${i.meterScope==='intern'?'selected':''}>Interner Vereinszähler</option><option value="Versorger" ${i.meterScope==='Versorger'?'selected':''}>Offizieller Versorger-Zähler</option></select></label><label>Einheit<input name="unit" value="${esc(i.unit)}" placeholder="kWh oder m³"></label><label>Zählernummer<input name="meterNumber" value="${esc(i.meterNumber)}"></label><label>Zählstellennummer<input name="meteringPointNumber" value="${esc(i.meteringPointNumber)}"><span class="subtle">Insbesondere für offizielle Versorger-Zählstellen.</span></label><label>Einbaudatum<input type="date" name="installedAt" value="${esc(i.installedAt)}"></label><label>Ausbaudatum<input type="date" name="removedAt" value="${esc(i.removedAt)}"></label></div></fieldset>`;
  showDialog(i.id ? 'Inventarobjekt bearbeiten' : 'Inventarobjekt anlegen', `<form id="finv" class="formgrid"><label>Typ<select name="type" onchange="toggleMeterFields(this.value)">${types.map(t => `<option ${t === i.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>BMK / Kennzeichnung<input name="bmk" value="${esc(i.bmk)}" placeholder="z. B. UV-02 oder W-S3-2"></label><label class="full">Bezeichnung<input name="name" required value="${esc(i.name)}"></label><label>Übergeordnetes Objekt<select name="parentId">${inventoryOptions(i.parentId)}</select></label><label>Status<select name="status">${['aktiv', 'inaktiv', 'defekt', 'stillgelegt', 'geplant'].map(x => `<option ${x === i.status ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Breitengrad<input type="number" step="any" name="latitude" value="${esc(i.latitude)}"></label><label>Längengrad<input type="number" step="any" name="longitude" value="${esc(i.longitude)}"></label><label class="full">Koordinatenpfad (für Leitungen)<textarea name="path" placeholder="51.5321, 9.9342\n51.5323, 9.9346">${esc(i.path)}</textarea><span class="subtle">${esc(pathHelp())}</span></label>${meterFields}<label class="full">Notiz<textarea name="note">${esc(i.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button>${isMeter(i) && i.id ? `<button type="button" onclick="showMeterReadings('${i.id}')">Ablesungen</button>` : ''}<button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`);
  finv.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const type = f.get('type');
    const o = {
      id: i.id || uid(), type, bmk: f.get('bmk').trim(), name: f.get('name').trim(), parentId: f.get('parentId'), status: f.get('status'),
      latitude: f.get('latitude'), longitude: f.get('longitude'), path: f.get('path').trim(), geometry: i.geometry || null,
      meterScope: f.get('meterScope'), meterNumber: f.get('meterNumber').trim(), meteringPointNumber: f.get('meteringPointNumber').trim(),
      unit: f.get('unit').trim() || (type === 'Stromzähler' ? 'kWh' : (type === 'Wasserzähler' ? 'm³' : '')),
      installedAt: f.get('installedAt'), removedAt: f.get('removedAt'), note: f.get('note').trim()
    };
    if (o.parentId === o.id) o.parentId = '';
    if (o.geometry?.type === 'Point' && (o.latitude || o.longitude)) o.geometry = pointGeometry(o.latitude, o.longitude);
    if (o.geometry?.type === 'LineString' && o.path) o.geometry = { type: 'LineString', coordinates: parsePath(o.path) };
    i.id ? Object.assign(i, o) : db.inventory.push(o);
    save();
    dlg.close();
  };
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
    ...db.inventory.map(x => ({ value: `Inventar|${x.id}`, label: `Inventar · ${inventoryName(x.id)}` })),
    ...db.leaseAreas.map(x => ({ value: `Pachtfläche|${x.id}`, label: `Pachtfläche · ${x.name || x.id}` }))
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
  document.querySelector('#backup').innerHTML = `<div class="grid"><div class="card"><h2>Vollsicherung</h2><p>Enthält alle Stammdaten, Mitgliedschaften, Unterpachtverhältnisse, Verträge, Inventar, Vorgänge sowie Fotos und Dokumente.</p><button class="primary" onclick="exportBackup()">Vollsicherung herunterladen</button></div><div class="card"><h2>Wiederherstellen</h2><p>Ältere Sicherungen werden beim Import automatisch auf das aktuelle Schema migriert.</p><input type="file" accept="application/json,.json" onchange="importBackup(this)"></div><div class="card"><h2>CSV</h2><p>Tabellarischer Zusatzexport der Vorgänge.</p><button onclick="exportCasesCSV()">Vorgänge als CSV</button></div><div class="card"><h2>Speicher</h2><p>Aktueller Datenbestand ca. <b>${(bytes / 1024 / 1024).toFixed(2)} MB</b>.</p></div></div><div class="card" style="margin-top:14px"><h2>Version</h2><p><b>${APP_VERSION}</b> · Schema ${db.schema}. Neu: Kartenansicht mit Geometrieeditor, Pachtflächen sowie Zählerstände und Zählstelleninformationen.</p><button class="danger" onclick="clearAll()">Alle lokalen Daten löschen</button></div>`;
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
