// Simple admin UI for testing: list/create/edit/delete resources via the dev API
const panel = document.getElementById('panel');
const tabs = { pacientes: document.getElementById('tab-pacientes'), estudios: document.getElementById('tab-estudios'), plantillas: document.getElementById('tab-plantillas'), ordenes: document.getElementById('tab-ordenes') };
let current = 'pacientes';

Object.keys(tabs).forEach(k => {
  tabs[k].addEventListener('click', () => { switchTab(k); });
});

function switchTab(name){
  current = name;
  Object.keys(tabs).forEach(k => tabs[k].classList.toggle('active', k === name));
  renderPanel();
}

async function fetchJson(path, opts){
  try { const r = await fetch(path, opts); const text = await r.text(); try { return JSON.parse(text); } catch(e){ return text; } } catch (e) { console.error('fetch error', e); alert('Error conectando al servidor'); return null; }
}

async function renderPanel(){
  panel.innerHTML = '<div>Cargando…</div>';
  if (current === 'pacientes') return renderPacientes();
  if (current === 'estudios') return renderEstudios();
  if (current === 'plantillas') return renderPlantillas();
  if (current === 'ordenes') return renderOrdenes();
}

async function renderPacientes(){
  const data = await fetchJson('/api/pacientes');
  if (!data) return panel.innerHTML = '<div>Error al cargar pacientes</div>';
  panel.innerHTML = `
    <h3>Pacientes <button id="new-paciente">Nuevo</button></h3>
    <div class="list" id="list"></div>
  `;
  document.getElementById('new-paciente').addEventListener('click', () => showPacienteForm({}));
  const list = document.getElementById('list');
  data.forEach(p => {
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `
      <div style="min-width:240px"><strong>${escapeHtml(p.nombre||'--')} ${escapeHtml(p.apellidoPaterno||'')}</strong><br><small>${escapeHtml(p.fechaNacimiento||'')}</small></div>
      <pre>${escapeHtml(JSON.stringify(p, null, 2))}</pre>
      <div class="controls">
        <button class="ghost" data-id="${p.id}" data-action="edit">Editar</button>
        <button class="ghost" data-id="${p.id}" data-action="del">Eliminar</button>
      </div>
    `;
    list.appendChild(el);
  });
  list.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button'); if (!btn) return;
    const id = btn.dataset.id; const action = btn.dataset.action;
    if (action === 'edit') {
      const item = data.find(x=>String(x.id)===String(id)); showPacienteForm(item);
    } else if (action === 'del') {
      if (!confirm('Eliminar paciente?')) return; const res = await fetchJson('/api/pacientes/'+id, { method: 'DELETE' }); alert('Eliminados: '+(res?.deleted||0)); renderPanel();
    }
  });
}

function showPacienteForm(p){
  panel.innerHTML = `
    <h3>Editar paciente</h3>
    <div>
      <div class="form-row"><label>Nombre</label><input id="e-nombre" type="text" value="${escapeHtml(p.nombre||'')}" /></div>
      <div class="form-row"><label>Apellido</label><input id="e-ap" type="text" value="${escapeHtml(p.apellidoPaterno||'')}" /></div>
      <div class="form-row"><label>Fecha Nac.</label><input id="e-fn" type="text" value="${escapeHtml(p.fechaNacimiento||'')}" placeholder="YYYY-MM-DD" /></div>
      <div style="margin-top:10px"><button id="save">Guardar</button> <button class="ghost" id="cancel">Cancelar</button></div>
    </div>
  `;
  document.getElementById('cancel').addEventListener('click', renderPanel);
  document.getElementById('save').addEventListener('click', async () => {
    const body = { nombre: document.getElementById('e-nombre').value.trim(), apellidoPaterno: document.getElementById('e-ap').value.trim(), fechaNacimiento: document.getElementById('e-fn').value.trim() };
    if (p && p.id) {
      const res = await fetchJson('/api/pacientes/'+p.id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      alert('Guardado'); renderPanel();
    } else {
      const res = await fetchJson('/api/pacientes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      alert('Creado'); renderPanel();
    }
  });
}

async function renderEstudios(){
  const data = await fetchJson('/api/estudios');
  panel.innerHTML = `
    <h3>Estudios <button id="new-estudio">Nuevo</button></h3>
    <div class="list" id="list"></div>
  `;
  document.getElementById('new-estudio').addEventListener('click', ()=>showEstudioForm({}));
  const list = document.getElementById('list');
  (data||[]).forEach(p => {
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `
      <div style="min-width:240px"><strong>${escapeHtml(p.nombre||'--')}</strong><br><small>${escapeHtml(p.muestra||'')}</small></div>
      <pre>${escapeHtml(JSON.stringify(p, null, 2))}</pre>
      <div class="controls">
        <button class="ghost" data-id="${p.id}" data-action="edit">Editar</button>
        <button class="ghost" data-id="${p.id}" data-action="del">Eliminar</button>
      </div>
    `; list.appendChild(el);
  });
  list.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button'); if (!btn) return; const id = btn.dataset.id; const action = btn.dataset.action;
    if (action==='edit'){ const item = (data||[]).find(x=>String(x.id)===String(id)); showEstudioForm(item); }
    if (action==='del'){ if(!confirm('Eliminar estudio?')) return; const res = await fetchJson('/api/estudios/'+id, { method: 'DELETE' }); alert('Eliminados: '+(res?.deleted||0)); renderPanel(); }
  });
}

function showEstudioForm(p){
  panel.innerHTML = `
    <h3>Editar estudio</h3>
    <div>
      <div class="form-row"><label>Nombre</label><input id="e-nombre" type="text" value="${escapeHtml(p.nombre||'')}" /></div>
      <div class="form-row"><label>Muestra</label><input id="e-muestra" type="text" value="${escapeHtml(p.muestra||'')}" /></div>
      <div class="form-row"><label>Precio</label><input id="e-pre" type="number" value="${escapeHtml(p.precioSugerido||0)}" /></div>
      <div style="margin-top:10px"><button id="save">Guardar</button> <button class="ghost" id="cancel">Cancelar</button></div>
    </div>
  `;
  document.getElementById('cancel').addEventListener('click', renderPanel);
  document.getElementById('save').addEventListener('click', async ()=>{
    const body = { nombre: document.getElementById('e-nombre').value.trim(), muestra: document.getElementById('e-muestra').value.trim(), precioSugerido: Number(document.getElementById('e-pre').value||0) };
    if (p && p.id) { await fetchJson('/api/estudios/'+p.id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); alert('Guardado'); renderPanel(); }
    else { await fetchJson('/api/estudios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); alert('Creado'); renderPanel(); }
  });
}

async function renderPlantillas(){
  const data = await fetchJson('/api/plantillas');
  panel.innerHTML = `
    <h3>Plantillas</h3>
    <div class="list" id="list"></div>
    <div style="margin-top:10px">
      <h4>Crear/Importar plantilla (JSON)</h4>
      <div><label>ID</label><input id="new-id" type="text" /></div>
      <div><textarea id="new-json" class="json">{"grupos":[]}</textarea></div>
      <div style="margin-top:8px"><button id="create-plantilla">Crear</button></div>
    </div>
  `;
  const list = document.getElementById('list');
  Object.keys(data||{}).forEach(k => {
    const v = data[k];
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `<div style="min-width:200px"><strong>ID ${escapeHtml(k)}</strong></div><pre>${escapeHtml(JSON.stringify(v,null,2))}</pre><div class="controls"><button class="ghost" data-id="${escapeHtml(k)}" data-action="edit">Editar</button><button class="ghost" data-id="${escapeHtml(k)}" data-action="del">Eliminar</button></div>`;
    list.appendChild(el);
  });
  list.addEventListener('click', async (ev)=>{
    const btn = ev.target.closest('button'); if(!btn) return; const id = btn.dataset.id; const action = btn.dataset.action;
    if(action==='edit'){ const content = data[id]; showPlantillaEditor(id, content); }
    if(action==='del'){ if(!confirm('Eliminar plantilla?')) return; const res = await fetchJson('/api/plantillas/'+id, { method: 'DELETE' }); alert('Deleted: '+(res?.deleted||0)); renderPanel(); }
  });
  document.getElementById('create-plantilla').addEventListener('click', async ()=>{
    const id = document.getElementById('new-id').value.trim(); if(!id){ alert('ID requerido'); return; }
    try { const json = JSON.parse(document.getElementById('new-json').value); await fetchJson('/api/plantillas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ [id]: json }) }); alert('Creada'); renderPanel(); } catch(e){ alert('JSON inválido'); }
  });
}

function showPlantillaEditor(id, content){
  panel.innerHTML = `<h3>Editar plantilla ${escapeHtml(id)}</h3><div><textarea id="p-json" class="json">${escapeHtml(JSON.stringify(content||{},null,2))}</textarea><div style="margin-top:8px"><button id="save">Guardar</button> <button class="ghost" id="cancel">Cancelar</button></div></div>`;
  document.getElementById('cancel').addEventListener('click', renderPanel);
  document.getElementById('save').addEventListener('click', async ()=>{
    try { const j = JSON.parse(document.getElementById('p-json').value); await fetchJson('/api/plantillas/'+id, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(j) }); alert('Guardada'); renderPanel(); } catch(e){ alert('JSON inválido'); }
  });
}

async function renderOrdenes(){
  const data = await fetchJson('/api/ordenes');
  panel.innerHTML = `<h3>Órdenes</h3><div class="list" id="list"></div>`;
  const list = document.getElementById('list');
  (data||[]).forEach(o=>{ const el=document.createElement('div'); el.className='item'; el.innerHTML = `<div style="min-width:200px"><strong>${escapeHtml(o.folio||o.id||'--')}</strong><br><small>${escapeHtml(o.paciente?.nombre||'')}</small></div><pre>${escapeHtml(JSON.stringify(o,null,2))}</pre><div class="controls"><button class="ghost" data-id="${o.id}" data-action="edit">Editar</button><button class="ghost" data-id="${o.id}" data-action="del">Eliminar</button></div>`; list.appendChild(el); });
  list.addEventListener('click', async (ev)=>{ const btn=ev.target.closest('button'); if(!btn) return; const id=btn.dataset.id; const action=btn.dataset.action; if(action==='edit'){ const item=(data||[]).find(x=>String(x.id)===String(id)); showOrdenEditor(item); } if(action==='del'){ if(!confirm('Eliminar orden?')) return; const res=await fetchJson('/api/ordenes/'+id,{method:'DELETE'}); alert('Deleted: '+(res?.deleted||0)); renderPanel(); } });
}

function showOrdenEditor(o){
  panel.innerHTML = `<h3>Editar orden ${escapeHtml(o.folio||o.id)}</h3><div><textarea id="o-json" class="json">${escapeHtml(JSON.stringify(o,null,2))}</textarea><div style="margin-top:8px"><button id="save">Guardar</button> <button class="ghost" id="cancel">Cancelar</button></div></div>`;
  document.getElementById('cancel').addEventListener('click', renderPanel);
  document.getElementById('save').addEventListener('click', async ()=>{ try{ const j=JSON.parse(document.getElementById('o-json').value); await fetchJson('/api/ordenes/'+(o.id||o.folio), { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(j) }); alert('Guardada'); renderPanel(); }catch(e){ alert('JSON inválido'); } });
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Initial
renderPanel();
