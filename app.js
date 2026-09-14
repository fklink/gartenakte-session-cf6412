'use strict';
const APP_VERSION = '0.5.0', KEY = 'gartenakte_data', OLD_KEYS = ['gartenakte_1_0_0_data'];
let db = load();
function fresh() { return { schema: 2, appVersion: APP_VERSION, people: [], addresses: [], personAddresses: [], ways: [], plots: [], landParcels: [], plotLandParcels: [], lessors: [], landContracts: [], contractParcels: [], leases: [], cases: [], events: [], attachments: [] }; }
function migrate(x) {
    if (!x)
        return fresh();
    if (x.schema === 2)
        return Object.assign(fresh(), x, { schema: 2, appVersion: APP_VERSION });
    if (x.schema === 1) {
        const n = fresh();
        ['people', 'plots', 'leases', 'cases', 'events', 'attachments'].forEach(k => n[k] = Array.isArray(x[k]) ? x[k] : []);
        n.people.forEach(p => {
            if (p.street || p.zip || p.city) {
                const aid = uid();
                n.addresses.push({ id: aid, street: p.street || '', zip: p.zip || '', city: p.city || '', country: 'Deutschland', note: 'Aus Version 0.2.0 übernommen' });
                n.personAddresses.push({ id: uid(), personId: p.id, addressId: aid, validFrom: '', validTo: '', type: 'Postanschrift', note: '' });
            }
            delete p.street;
            delete p.zip;
            delete p.city;
        });
        n.plots.forEach(p => { p.wayId = p.wayId || ''; p.latitude = p.latitude || ''; p.longitude = p.longitude || ''; });
        return n;
    }
    return fresh();
}
function load() {
    try {
        const current = localStorage.getItem(KEY);
        if (current)
            return migrate(JSON.parse(current));
        for (const k of OLD_KEYS) {
            const s = localStorage.getItem(k);
            if (s) {
                const n = migrate(JSON.parse(s));
                localStorage.setItem(KEY, JSON.stringify(n));
                return n;
            }
        }
    }
    catch (e) { }
    return fresh();
}
function save() { db.appVersion = APP_VERSION; db.schema = 2; localStorage.setItem(KEY, JSON.stringify(db)); render(); }
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
function lessorName(id) { const l = byId(db.lessors, id); return l ? l.name : '–'; }
function contractName(id) { const c = byId(db.landContracts, id); return c ? [c.contractNo, lessorName(c.lessorId)].filter(Boolean).join(' · ') : '–'; }
function activeLeaseForPlot(plotId, date = today()) { return db.leases.find(l => l.plotId === plotId && (!l.start || l.start <= date) && (!l.end || l.end >= date)); }
function activeAddressForPerson(personId, date = today()) { const rel = db.personAddresses.find(r => r.personId === personId && (!r.validFrom || r.validFrom <= date) && (!r.validTo || r.validTo >= date)); return rel ? addressText(rel.addressId) : '–'; }
function addEvent(caseId, type, text, fromPersonId = '', toPersonId = '') { db.events.unshift({ id: uid(), caseId, at: now(), type, text, fromPersonId, toPersonId }); }
function isOpen(c) { return c.status !== 'Abgeschlossen'; }
function isOverdue(c) { return isOpen(c) && c.deadline && c.deadline < today(); }
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
function opts(items, sel, label) { return '<option value="">– keine –</option>' + items.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(label(x))}</option>`).join(''); }
function personOptions(sel = '') { return opts(db.people, sel, p => personName(p.id)); }
function plotOptions(sel = '') { return opts(db.plots, sel, p => plotName(p.id)); }
function wayOptions(sel = '') { return opts(db.ways, sel, w => w.name); }
function addressOptions(sel = '') { return opts(db.addresses, sel, a => addressText(a.id)); }
function landParcelOptions(sel = '') { return opts(db.landParcels, sel, f => landParcelName(f.id)); }
function lessorOptions(sel = '') { return opts(db.lessors, sel, l => l.name); }
function render() { renderDashboard(); renderPeople(); renderAddresses(); renderPlots(); renderLand(); renderLeases(); renderCases(); renderBackup(); }
function renderDashboard() { const open = db.cases.filter(isOpen), overdue = open.filter(isOverdue); document.querySelector('#dashboard').innerHTML = `<div class="grid"><div class="card"><div class="muted">Personen</div><div class="metric">${db.people.length}</div></div><div class="card"><div class="muted">Parzellen</div><div class="metric">${db.plots.length}</div></div><div class="card"><div class="muted">Flurstücke</div><div class="metric">${db.landParcels.length}</div></div><div class="card"><div class="muted">Offene Vorgänge</div><div class="metric">${open.length}</div></div><div class="card"><div class="muted">Frist überschritten</div><div class="metric ${overdue.length ? 'overdue' : ''}">${overdue.length}</div></div></div><div class="card" style="margin-top:14px"><h2>Fällige Vorgänge</h2>${caseTable(open.filter(c => isOverdue(c) || (c.followup && c.followup <= today())), false)}</div>`; }
function renderPeople() { document.querySelector('#people').innerHTML = `<div class="actions"><button class="primary" onclick="editPerson()">+ Person</button></div><div class="card wide"><table><thead><tr><th>Name</th><th>Mitglieds-Nr.</th><th>Aktuelle Anschrift</th><th>Kontakt</th><th>Aktive Pacht</th><th></th></tr></thead><tbody>${db.people.map(p => { const ls = db.leases.filter(l => l.personId === p.id && (!l.end || l.end >= today())); return `<tr><td><b>${esc(personName(p.id))}</b></td><td>${esc(p.memberNo)}</td><td>${esc(activeAddressForPerson(p.id))}</td><td>${esc(p.email || p.phone || '–')}</td><td>${ls.map(l => esc(plotName(l.plotId))).join(', ') || '–'}</td><td><button onclick="editPerson('${p.id}')">Bearbeiten</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Noch keine Personen.</td></tr>'}</tbody></table></div>`; }
function renderAddresses() { document.querySelector('#addresses').innerHTML = `<div class="actions"><button class="primary" onclick="editAddress()">+ Adresse</button><button onclick="editPersonAddress()">+ Person ↔ Adresse</button></div><div class="card wide"><h2>Adressstamm</h2><table><thead><tr><th>Adresse</th><th>Verknüpft mit</th><th></th></tr></thead><tbody>${db.addresses.map(a => `<tr><td><b>${esc(addressText(a.id))}</b><br><span class="subtle">${esc(a.note || '')}</span></td><td>${db.personAddresses.filter(r => r.addressId === a.id).map(r => `${esc(personName(r.personId))} <span class="subtle">(${esc(r.validFrom || '…')}–${esc(r.validTo || '…')})</span>`).join('<br>') || '–'}</td><td><button onclick="editAddress('${a.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Noch keine Adressen.</td></tr>'}</tbody></table></div><div class="card wide" style="margin-top:14px"><h2>Adresszuordnungen</h2><table><thead><tr><th>Person</th><th>Adresse</th><th>Art</th><th>Gültig von</th><th>Gültig bis</th><th></th></tr></thead><tbody>${db.personAddresses.map(r => `<tr><td>${esc(personName(r.personId))}</td><td>${esc(addressText(r.addressId))}</td><td>${esc(r.type || '')}</td><td>${esc(r.validFrom || '–')}</td><td>${esc(r.validTo || '–')}</td><td><button onclick="editPersonAddress('${r.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Zuordnungen.</td></tr>'}</tbody></table></div>`; }
function renderPlots() { document.querySelector('#plots').innerHTML = `<div class="actions"><button class="primary" onclick="editPlot()">+ Parzelle</button><button onclick="editWay()">+ Weg</button><button onclick="editPlotLandParcel()">+ Flurstück zuordnen</button></div><div class="card wide"><table><thead><tr><th>Garten</th><th>Weg</th><th>Größe</th><th>Koordinate</th><th>Flurstücke</th><th>Aktuell verpachtet an</th><th></th></tr></thead><tbody>${[...db.plots].sort((a, b) => String(a.number).localeCompare(String(b.number), 'de', { numeric: true })).map(p => { const l = activeLeaseForPlot(p.id); const fs = db.plotLandParcels.filter(r => r.plotId === p.id).map(r => landParcelName(r.landParcelId)); return `<tr><td><b>${esc(p.number)}</b></td><td>${esc(wayName(p.wayId))}</td><td>${esc(p.size ? p.size + ' m²' : '–')}</td><td>${p.latitude && p.longitude ? `<span class="nowrap">${esc(p.latitude)}, ${esc(p.longitude)}</span>` : '–'}</td><td>${fs.map(esc).join('<br>') || '–'}</td><td>${l ? esc(personName(l.personId)) : '–'}</td><td><button onclick="editPlot('${p.id}')">Bearbeiten</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Noch keine Parzellen.</td></tr>'}</tbody></table></div><div class="card wide" style="margin-top:14px"><h2>Wege</h2><table><thead><tr><th>Name</th><th>Notiz</th><th></th></tr></thead><tbody>${db.ways.map(w => `<tr><td><b>${esc(w.name)}</b></td><td>${esc(w.note || '')}</td><td><button onclick="editWay('${w.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Noch keine Wege.</td></tr>'}</tbody></table></div>`; }
function renderLand() { document.querySelector('#land').innerHTML = `<div class="actions"><button class="primary" onclick="editLandParcel()">+ Flurstück</button><button onclick="editLessor()">+ Verpächter</button><button onclick="editLandContract()">+ Pachtvertrag</button><button onclick="editContractParcel()">+ Vertrag ↔ Flurstück</button></div><div class="card wide"><h2>Flurstücke</h2><table><thead><tr><th>Bezeichnung</th><th>Größe</th><th>Parzellen</th><th></th></tr></thead><tbody>${db.landParcels.map(f => `<tr><td><b>${esc(landParcelName(f.id))}</b></td><td>${esc(f.area ? f.area + ' m²' : '–')}</td><td>${db.plotLandParcels.filter(r => r.landParcelId === f.id).map(r => esc(plotName(r.plotId))).join(', ') || '–'}</td><td><button onclick="editLandParcel('${f.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Noch keine Flurstücke.</td></tr>'}</tbody></table></div><div class="grid" style="margin-top:14px"><div class="card wide"><h2>Verpächter</h2><table><thead><tr><th>Name</th><th>Kontakt/Notiz</th><th></th></tr></thead><tbody>${db.lessors.map(l => `<tr><td><b>${esc(l.name)}</b></td><td>${esc(l.contact || l.note || '')}</td><td><button onclick="editLessor('${l.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Noch keine Verpächter.</td></tr>'}</tbody></table></div><div class="card wide"><h2>Flächen-Pachtverträge</h2><table><thead><tr><th>Vertrag</th><th>Laufzeit</th><th>Flurstücke</th><th>Anhang</th><th></th></tr></thead><tbody>${db.landContracts.map(c => `<tr><td><b>${esc(contractName(c.id))}</b></td><td>${esc(c.start || '–')} – ${esc(c.end || 'offen')}</td><td>${db.contractParcels.filter(r => r.contractId === c.id).map(r => esc(landParcelName(r.landParcelId))).join('<br>') || '–'}</td><td>${c.documentName ? '<span class="badge">' + esc(c.documentName) + '</span>' : '–'}</td><td><button onclick="editLandContract('${c.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Noch keine Verträge.</td></tr>'}</tbody></table></div></div>`; }
function renderLeases() { document.querySelector('#leases').innerHTML = `<div class="actions"><button class="primary" onclick="editLease()">+ Pachtverhältnis</button></div><div class="card wide"><table><thead><tr><th>Parzelle</th><th>Person</th><th>Beginn</th><th>Ende</th><th>Status</th><th></th></tr></thead><tbody>${db.leases.map(l => `<tr><td>${esc(plotName(l.plotId))}</td><td>${esc(personName(l.personId))}</td><td>${esc(l.start || '–')}</td><td>${esc(l.end || '–')}</td><td><span class="badge">${!l.end || l.end >= today() ? 'aktiv' : 'beendet'}</span></td><td><button onclick="editLease('${l.id}')">Bearbeiten</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Pachtverhältnisse.</td></tr>'}</tbody></table></div>`; }
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
function editPerson(id) { const p = byId(db.people, id) || { id: '', firstName: '', lastName: '', memberNo: '', email: '', phone: '', note: '' }; showDialog(p.id ? 'Person bearbeiten' : 'Person anlegen', `<form id="fp" class="formgrid"><label>Vorname<input name="firstName" value="${esc(p.firstName)}"></label><label>Nachname<input name="lastName" required value="${esc(p.lastName)}"></label><label>Mitgliedsnummer<input name="memberNo" value="${esc(p.memberNo)}"></label><label>Telefon<input name="phone" value="${esc(p.phone)}"></label><label class="full">E-Mail<input type="email" name="email" value="${esc(p.email)}"></label><label class="full">Interne Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fp.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), firstName: f.get('firstName').trim(), lastName: f.get('lastName').trim(), memberNo: f.get('memberNo').trim(), phone: f.get('phone').trim(), email: f.get('email').trim(), note: f.get('note').trim() }; p.id ? Object.assign(p, o) : db.people.push(o); save(); dlg.close(); }; }
function editAddress(id) { const a = byId(db.addresses, id) || { id: '', street: '', zip: '', city: '', country: 'Deutschland', note: '' }; showDialog(a.id ? 'Adresse bearbeiten' : 'Adresse anlegen', `<form id="fa" class="formgrid"><label class="full">Straße / Hausnummer<input name="street" required value="${esc(a.street)}"></label><label>PLZ<input name="zip" value="${esc(a.zip)}"></label><label>Ort<input name="city" required value="${esc(a.city)}"></label><label>Land<input name="country" value="${esc(a.country)}"></label><label class="full">Notiz<textarea name="note">${esc(a.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fa.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: a.id || uid(), street: f.get('street').trim(), zip: f.get('zip').trim(), city: f.get('city').trim(), country: f.get('country').trim(), note: f.get('note').trim() }; a.id ? Object.assign(a, o) : db.addresses.push(o); save(); dlg.close(); }; }
function editPersonAddress(id) { if (!db.people.length || !db.addresses.length) {
    alert('Bitte zuerst Person und Adresse anlegen.');
    return;
} const r = byId(db.personAddresses, id) || { id: '', personId: db.people[0].id, addressId: db.addresses[0].id, type: 'Postanschrift', validFrom: '', validTo: '', note: '' }; showDialog(r.id ? 'Adresszuordnung bearbeiten' : 'Adresse zu Person zuordnen', `<form id="fpa" class="formgrid"><label>Person<select name="personId">${personOptions(r.personId)}</select></label><label>Adresse<select name="addressId">${addressOptions(r.addressId)}</select></label><label>Art<input name="type" value="${esc(r.type)}"></label><label>Gültig von<input type="date" name="validFrom" value="${esc(r.validFrom)}"></label><label>Gültig bis<input type="date" name="validTo" value="${esc(r.validTo)}"></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fpa.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), personId: f.get('personId'), addressId: f.get('addressId'), type: f.get('type').trim(), validFrom: f.get('validFrom'), validTo: f.get('validTo'), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.personAddresses.push(o); save(); dlg.close(); }; }
function editWay(id) { const w = byId(db.ways, id) || { id: '', name: '', note: '' }; showDialog(w.id ? 'Weg bearbeiten' : 'Weg anlegen', `<form id="fw" class="formgrid"><label class="full">Bezeichnung<input name="name" required value="${esc(w.name)}" placeholder="z. B. Rosenweg"></label><label class="full">Notiz<textarea name="note">${esc(w.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fw.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: w.id || uid(), name: f.get('name').trim(), note: f.get('note').trim() }; w.id ? Object.assign(w, o) : db.ways.push(o); save(); dlg.close(); }; }
function editPlot(id) { const p = byId(db.plots, id) || { id: '', number: '', wayId: '', size: '', latitude: '', longitude: '', location: '', note: '' }; showDialog(p.id ? 'Parzelle bearbeiten' : 'Parzelle anlegen', `<form id="fplot" class="formgrid"><label>Gartennummer<input name="number" required value="${esc(p.number)}"></label><label>Weg<select name="wayId">${wayOptions(p.wayId)}</select></label><label>Größe m²<input type="number" step="0.01" name="size" value="${esc(p.size)}"></label><label>Lage / Zusatzbezeichnung<input name="location" value="${esc(p.location)}"></label><label>Breitengrad<input type="number" step="any" name="latitude" value="${esc(p.latitude)}" placeholder="51.123456"></label><label>Längengrad<input type="number" step="any" name="longitude" value="${esc(p.longitude)}" placeholder="9.123456"></label><label class="full">Notiz<textarea name="note">${esc(p.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fplot.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: p.id || uid(), number: f.get('number').trim(), wayId: f.get('wayId'), size: f.get('size'), location: f.get('location').trim(), latitude: f.get('latitude'), longitude: f.get('longitude'), note: f.get('note').trim() }; p.id ? Object.assign(p, o) : db.plots.push(o); save(); dlg.close(); }; }
function editLandParcel(id) { const f = byId(db.landParcels, id) || { id: '', gemarkung: '', flur: '', number: '', area: '', note: '' }; showDialog(f.id ? 'Flurstück bearbeiten' : 'Flurstück anlegen', `<form id="flp" class="formgrid"><label>Gemarkung<input name="gemarkung" value="${esc(f.gemarkung)}"></label><label>Flur<input name="flur" value="${esc(f.flur)}"></label><label>Flurstücksnummer<input name="number" required value="${esc(f.number)}"></label><label>Fläche m²<input type="number" step="0.01" name="area" value="${esc(f.area)}"></label><label class="full">Notiz<textarea name="note">${esc(f.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); flp.onsubmit = e => { e.preventDefault(); const d = new FormData(e.target), o = { id: f.id || uid(), gemarkung: d.get('gemarkung').trim(), flur: d.get('flur').trim(), number: d.get('number').trim(), area: d.get('area'), note: d.get('note').trim() }; f.id ? Object.assign(f, o) : db.landParcels.push(o); save(); dlg.close(); }; }
function editPlotLandParcel(id) { if (!db.plots.length || !db.landParcels.length) {
    alert('Bitte zuerst Parzelle und Flurstück anlegen.');
    return;
} const r = byId(db.plotLandParcels, id) || { id: '', plotId: db.plots[0].id, landParcelId: db.landParcels[0].id, share: '', note: '' }; showDialog(r.id ? 'Flurstückszuordnung bearbeiten' : 'Flurstück zuordnen', `<form id="fpl" class="formgrid"><label>Parzelle<select name="plotId">${plotOptions(r.plotId)}</select></label><label>Flurstück<select name="landParcelId">${landParcelOptions(r.landParcelId)}</select></label><label>Anteil / Teilfläche<input name="share" value="${esc(r.share)}" placeholder="z. B. vollständig oder 120 m²"></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fpl.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), plotId: f.get('plotId'), landParcelId: f.get('landParcelId'), share: f.get('share').trim(), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.plotLandParcels.push(o); save(); dlg.close(); }; }
function editLessor(id) { const l = byId(db.lessors, id) || { id: '', name: '', contact: '', note: '' }; showDialog(l.id ? 'Verpächter bearbeiten' : 'Verpächter anlegen', `<form id="fles" class="formgrid"><label class="full">Name / Organisation<input name="name" required value="${esc(l.name)}"></label><label class="full">Kontakt / Anschrift<textarea name="contact">${esc(l.contact)}</textarea></label><label class="full">Notiz<textarea name="note">${esc(l.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fles.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: l.id || uid(), name: f.get('name').trim(), contact: f.get('contact').trim(), note: f.get('note').trim() }; l.id ? Object.assign(l, o) : db.lessors.push(o); save(); dlg.close(); }; }
function editLandContract(id) { if (!db.lessors.length) {
    alert('Bitte zuerst einen Verpächter anlegen.');
    return;
} const c = byId(db.landContracts, id) || { id: '', lessorId: db.lessors[0].id, contractNo: '', start: '', end: '', noticePeriod: '', note: '', documentName: '', documentType: '', documentData: '' }; showDialog(c.id ? 'Flächen-Pachtvertrag bearbeiten' : 'Flächen-Pachtvertrag anlegen', `<form id="flc" class="formgrid"><label>Verpächter<select name="lessorId">${lessorOptions(c.lessorId)}</select></label><label>Vertragsnummer<input name="contractNo" value="${esc(c.contractNo)}"></label><label>Beginn<input type="date" name="start" value="${esc(c.start)}"></label><label>Ende<input type="date" name="end" value="${esc(c.end)}"></label><label class="full">Kündigungsfrist / Regelung<input name="noticePeriod" value="${esc(c.noticePeriod)}"></label><label class="full">Vertragsdokument (PDF/Bild)<input type="file" id="contractFile" accept="image/*,.pdf"></label>${c.documentName ? `<div class="full"><span class="badge">Vorhanden: ${esc(c.documentName)}</span></div>` : ''}<label class="full">Notiz<textarea name="note">${esc(c.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); flc.onsubmit = async (e) => { e.preventDefault(); const f = new FormData(e.target), o = { id: c.id || uid(), lessorId: f.get('lessorId'), contractNo: f.get('contractNo').trim(), start: f.get('start'), end: f.get('end'), noticePeriod: f.get('noticePeriod').trim(), note: f.get('note').trim(), documentName: c.documentName || '', documentType: c.documentType || '', documentData: c.documentData || '' }; const file = document.querySelector('#contractFile').files[0]; if (file) {
    o.documentName = file.name;
    o.documentType = file.type || 'application/octet-stream';
    o.documentData = await fileToDataURL(file);
} c.id ? Object.assign(c, o) : db.landContracts.push(o); save(); dlg.close(); }; }
function editContractParcel(id) { if (!db.landContracts.length || !db.landParcels.length) {
    alert('Bitte zuerst Vertrag und Flurstück anlegen.');
    return;
} const r = byId(db.contractParcels, id) || { id: '', contractId: db.landContracts[0].id, landParcelId: db.landParcels[0].id, note: '' }; showDialog(r.id ? 'Vertragszuordnung bearbeiten' : 'Flurstück dem Vertrag zuordnen', `<form id="fcp" class="formgrid"><label>Vertrag<select name="contractId">${opts(db.landContracts, r.contractId, c => contractName(c.id))}</select></label><label>Flurstück<select name="landParcelId">${landParcelOptions(r.landParcelId)}</select></label><label class="full">Notiz<textarea name="note">${esc(r.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fcp.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: r.id || uid(), contractId: f.get('contractId'), landParcelId: f.get('landParcelId'), note: f.get('note').trim() }; r.id ? Object.assign(r, o) : db.contractParcels.push(o); save(); dlg.close(); }; }
function editLease(id) { if (!db.people.length || !db.plots.length) {
    alert('Bitte zuerst mindestens eine Person und eine Parzelle anlegen.');
    return;
} const l = byId(db.leases, id) || { id: '', personId: db.people[0].id, plotId: db.plots[0].id, start: today(), end: '', note: '' }; showDialog(l.id ? 'Pachtverhältnis bearbeiten' : 'Pachtverhältnis anlegen', `<form id="fl" class="formgrid"><label>Parzelle<select name="plotId">${plotOptions(l.plotId)}</select></label><label>Person<select name="personId">${personOptions(l.personId)}</select></label><label>Beginn<input type="date" name="start" value="${esc(l.start)}"></label><label>Ende<input type="date" name="end" value="${esc(l.end)}"></label><label class="full">Notiz<textarea name="note">${esc(l.note)}</textarea></label><div class="full actions"><button class="primary">Speichern</button><button type="button" onclick="dlg.close()">Abbrechen</button></div></form>`); fl.onsubmit = e => { e.preventDefault(); const f = new FormData(e.target), o = { id: l.id || uid(), plotId: f.get('plotId'), personId: f.get('personId'), start: f.get('start'), end: f.get('end'), note: f.get('note').trim() }; l.id ? Object.assign(l, o) : db.leases.push(o); save(); dlg.close(); }; }
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
function renderBackup() { const bytes = new Blob([JSON.stringify(db)]).size; document.querySelector('#backup').innerHTML = `<div class="grid"><div class="card"><h2>Vollsicherung</h2><p>Enthält alle Stammdaten, Zuordnungen, Verträge, Vorgänge, Historie sowie <b>alle Fotos und Dokumente</b>.</p><button class="primary" onclick="exportBackup()">Vollsicherung herunterladen</button></div><div class="card"><h2>Wiederherstellen</h2><p>0.2.0- und 0.3.0-Sicherungen werden beim Import migriert.</p><input type="file" accept="application/json,.json" onchange="importBackup(this)"></div><div class="card"><h2>CSV</h2><p>Tabellarischer Zusatzexport der Vorgänge.</p><button onclick="exportCasesCSV()">Vorgänge als CSV</button></div><div class="card"><h2>Speicher</h2><p>Aktueller Datenbestand ca. <b>${(bytes / 1024 / 1024).toFixed(2)} MB</b>.</p></div></div><div class="card" style="margin-top:14px"><h2>Version</h2><p><b>${APP_VERSION}</b> · Schema ${db.schema}. Neu: responsive Navigation mit Hamburger-Menü auf Smartphones und schmalen Tablets; Desktop-Navigation bleibt direkt sichtbar.</p><button class="danger" onclick="clearAll()">Alle lokalen Daten löschen</button></div>`; }
render();
save();
