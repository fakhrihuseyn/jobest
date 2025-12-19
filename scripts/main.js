const STORAGE_KEY = 'jobest:state:v1';

const els = {
  addHeader: () => document.getElementById('add-header'),
  addExperience: () => document.getElementById('add-experience'),
  addSkills: () => document.getElementById('add-skills'),
  addEducation: () => document.getElementById('add-education'),
  addHobbies: () => document.getElementById('add-hobbies'),
  addPage: () => document.getElementById('add-page'),
  exportJson: () => document.getElementById('export-json'),
  importJson: () => document.getElementById('import-json'),
  fileInput: () => document.getElementById('file-input'),
  preview: () => document.getElementById('preview'),
  forms: () => document.getElementById('forms'),
  printBtn: () => document.getElementById('print'),
};

/* ---- Utilities & State ---- */
function id(){ return 'id_'+Math.random().toString(36).slice(2,11); }

function defaultState(){
  return {
    pages: [ { sections: [ { id: id(), type: 'header', data: { name: 'Your Name', title: 'Your Title', email: 'you@example.com', photo: null } } ] } ],
    settings: { zoom: null }
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    return JSON.parse(raw);
  }catch(err){ return defaultState(); }
}

let state = loadState();

function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('Save failed', e) } }

const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];

function pushHistory(){ try{ undoStack.push(JSON.stringify(state)); if(undoStack.length>MAX_HISTORY) undoStack.shift(); redoStack = []; updateUndoRedoButtons(); }catch(e){} }

function undo(){ if(!undoStack.length) return; try{ redoStack.push(JSON.stringify(state)); state = JSON.parse(undoStack.pop()); save(); renderForms(); renderPreview(); updateUndoRedoButtons(); announce('Undone'); }catch(e){ console.error(e) } }

function redo(){ if(!redoStack.length) return; try{ undoStack.push(JSON.stringify(state)); state = JSON.parse(redoStack.pop()); save(); renderForms(); renderPreview(); updateUndoRedoButtons(); announce('Redone'); }catch(e){ console.error(e) } }

function updateUndoRedoButtons(){ const u = document.getElementById('undo'); const r = document.getElementById('redo'); if(u) u.disabled = undoStack.length===0; if(r) r.disabled = redoStack.length===0; }

function announce(msg){ const el = document.getElementById('announcer'); if(el) el.textContent = msg; else console.log(msg); }

function inputField(labelText, value, oninput){ const wrap = document.createElement('div'); wrap.style.marginTop='6px'; const label = document.createElement('label'); label.textContent = labelText; label.style.display='block'; label.style.fontSize='12px'; const inp = document.createElement('input'); inp.type='text'; inp.value = value || ''; inp.addEventListener('focus', ()=>{ inp.dataset._snap = '0' }); inp.addEventListener('input', (e)=>{ if(inp.dataset._snap === '0'){ pushHistory(); inp.dataset._snap = '1' } ; oninput(e.target.value) }); wrap.appendChild(label); wrap.appendChild(inp); return wrap; }

/* ---- Render Forms (editor) ---- */
function renderForms(){
    const container = els.forms();
    container.innerHTML = '';
    state.pages.forEach((page, pIndex)=>{
      const pageWrap = document.createElement('div');
      pageWrap.className = 'page-editor';
      pageWrap.style.border = '1px solid var(--surface-1)';
      pageWrap.style.padding = '10px';
      pageWrap.style.marginBottom = '12px';

      const headerRow = document.createElement('div');
      headerRow.style.display='flex'; headerRow.style.justifyContent='space-between'; headerRow.style.alignItems='center'; headerRow.style.marginBottom='8px';
      const title = document.createElement('div');
      title.textContent = `Page ${pIndex+1}`; title.style.fontWeight = '700'; title.style.fontSize = '13px';
      const removePageBtn = document.createElement('button'); removePageBtn.textContent='Remove Page'; removePageBtn.title = 'Remove this page'; removePageBtn.style.background='transparent'; removePageBtn.style.border='1px solid var(--surface-2)'; removePageBtn.style.padding='6px';
      removePageBtn.addEventListener('click', ()=>{ removePage(pIndex); });
      headerRow.appendChild(title); headerRow.appendChild(removePageBtn);
      pageWrap.appendChild(headerRow);

      // allow dropping onto empty page area (append to end)
      pageWrap.addEventListener('dragover', (e)=>{ e.preventDefault(); });
      pageWrap.addEventListener('drop', (e)=>{
        e.preventDefault();
        try{ const payload = JSON.parse(e.dataTransfer.getData('text/plain')); moveSectionBetweenPages(payload.fromP, payload.fromS, pIndex, state.pages[pIndex].sections.length); }catch(_){ }
      });

      page.sections.forEach((section, sIndex)=>{
        const s = document.createElement('section'); s.className = 'editor-section'; s.draggable = true; s.dataset.p = pIndex; s.dataset.s = sIndex; s.tabIndex = 0;

        // drag handle
        const handle = document.createElement('div'); handle.className='drag-handle'; handle.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 6h4v2h-4zM10 11h4v2h-4zM10 16h4v2h-4z"/></svg>';
        s.prepend(handle); handle.draggable = true;
        handle.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', JSON.stringify({ fromP: pIndex, fromS: sIndex })); s.classList.add('dragging'); if(e.dataTransfer.setDragImage){ const crt = handle.cloneNode(true); crt.style.position='absolute'; crt.style.top='-9999px'; document.body.appendChild(crt); e.dataTransfer.setDragImage(crt,16,16); setTimeout(()=>crt.remove(),100); } });
        handle.addEventListener('dragend', ()=> s.classList.remove('dragging'));
        s.addEventListener('dragover', (e)=>{ e.preventDefault(); s.classList.add('drag-over') });
        s.addEventListener('dragleave', ()=> s.classList.remove('drag-over'));
        s.addEventListener('drop', (e)=>{ e.preventDefault(); s.classList.remove('drag-over'); try{ const payload = JSON.parse(e.dataTransfer.getData('text/plain')); const targetS = Array.from(s.parentElement.querySelectorAll('.editor-section')).indexOf(s); pushHistory(); moveSectionBetweenPages(payload.fromP, payload.fromS, pIndex, targetS); }catch(_){ } });

        const h = document.createElement('div'); h.style.display='flex'; h.style.justifyContent='space-between'; h.style.alignItems='center';
        const label = document.createElement('div'); label.textContent = `${section.type.toUpperCase()} (${sIndex+1})`; label.style.fontWeight='600'; h.appendChild(label);
        const controls = document.createElement('div'); controls.className='editor-controls';
        const up = document.createElement('button'); up.textContent='↑'; up.title='Move up'; up.onclick = ()=>{ moveSection(pIndex, sIndex, -1) };
        const down = document.createElement('button'); down.textContent='↓'; down.title='Move down'; down.onclick = ()=>{ moveSection(pIndex, sIndex, 1) };
        const nextPage = document.createElement('button'); nextPage.textContent='⇢'; nextPage.title='Move to next page'; nextPage.onclick = ()=>{ moveToNextPage(pIndex, sIndex) };
        const remove = document.createElement('button'); remove.textContent='Remove'; remove.title='Remove section'; remove.onclick = ()=>{ removeSection(pIndex, sIndex) };
        controls.appendChild(up); controls.appendChild(down); controls.appendChild(nextPage); controls.appendChild(remove); h.appendChild(controls);
        s.appendChild(h);

        // Fields per type
        if(section.type === 'header'){
          const photoRow = document.createElement('div'); photoRow.style.display='flex'; photoRow.style.alignItems='center'; photoRow.style.gap='8px';
          const img = document.createElement('img'); img.className='photo-preview'; if(section.data.photo) img.src = section.data.photo; else img.src = '';
          const file = document.createElement('input'); file.type='file'; file.accept='image/*'; file.onchange = e=>{ const f = e.target.files[0]; if(!f) return; pushHistory(); const r = new FileReader(); r.onload = ev=>{ section.data.photo = ev.target.result; save(); renderForms(); renderPreview(); updateUndoRedoButtons(); }; r.readAsDataURL(f); };
          photoRow.appendChild(img); photoRow.appendChild(file); s.appendChild(photoRow);
          const name = inputField('Name', section.data.name, v=>{ section.data.name = v; save(); renderPreview(); });
          const titleF = inputField('Title', section.data.title, v=>{ section.data.title = v; save(); renderPreview(); });
          const email = inputField('Email', section.data.email, v=>{ section.data.email = v; save(); renderPreview(); });
          s.appendChild(name); s.appendChild(titleF); s.appendChild(email);
        } else if(section.type === 'experience'){
          section.data.items = section.data.items || [ { company:'Company', role:'Role', from:'2020', to:'2022', summary:'Achievements...' } ];
          section.data.items.forEach((it, i)=>{
            const wrap = document.createElement('div'); wrap.style.borderTop='1px dashed var(--surface-2)'; wrap.style.paddingTop='8px';
            wrap.appendChild(inputField('Company', it.company, v=>{ it.company=v; save(); renderPreview() }));
            wrap.appendChild(inputField('Role', it.role, v=>{ it.role=v; save(); renderPreview() }));
            wrap.appendChild(inputField('From', it.from, v=>{ it.from=v; save(); renderPreview() }));
            wrap.appendChild(inputField('To', it.to, v=>{ it.to=v; save(); renderPreview() }));
            wrap.appendChild(textareaField('Summary', it.summary, v=>{ it.summary=v; save(); renderPreview() }));
            s.appendChild(wrap);
          })
          const addExp = document.createElement('button'); addExp.textContent='Add Experience Item'; addExp.onclick=()=>{ section.data.items.push({company:'Company',role:'Role',from:'',to:'',summary:''}); save(); renderForms(); renderPreview(); };
          s.appendChild(addExp);
        } else if(section.type === 'skills'){
          section.data.items = section.data.items || ['Skill A','Skill B'];
          s.appendChild(textareaField('Skills (comma separated)', section.data.items.join(', '), v=>{ section.data.items = v.split(',').map(x=>x.trim()).filter(Boolean); save(); renderPreview() }));
        } else if(section.type === 'education'){
          section.data.items = section.data.items || [{ school:'School', degree:'Degree', year:'2020' }];
          section.data.items.forEach((it,i)=>{
            const wrap = document.createElement('div'); wrap.style.paddingTop='6px';
            wrap.appendChild(inputField('School', it.school, v=>{ it.school=v; save(); renderPreview() }));
            wrap.appendChild(inputField('Degree', it.degree, v=>{ it.degree=v; save(); renderPreview() }));
            wrap.appendChild(inputField('Year', it.year, v=>{ it.year=v; save(); renderPreview() }));
            s.appendChild(wrap);
          })
          const addEd = document.createElement('button'); addEd.textContent='Add Education Item'; addEd.onclick=()=>{ section.data.items.push({school:'School',degree:'Degree',year:''}); save(); renderForms(); renderPreview(); };
          s.appendChild(addEd);
        } else if(section.type === 'hobbies'){
          section.data.text = section.data.text || 'Hobbies and interests...';
          s.appendChild(textareaField('Hobbies', section.data.text, v=>{ section.data.text=v; save(); renderPreview() }));
        }

        pageWrap.appendChild(s);
      })

      container.appendChild(pageWrap);
    })
  }
function textareaField(labelText, value, oninput){
  const wrap = document.createElement('div'); wrap.style.marginTop='8px';
  const label = document.createElement('label'); label.textContent=labelText; label.style.display='block'; label.style.fontSize='12px';
  const ta = document.createElement('textarea'); ta.value = value || '';
  ta.addEventListener('focus', ()=>{ ta.dataset._snap = '0' });
  ta.oninput = e=>{ if(ta.dataset._snap === '0'){ pushHistory(); ta.dataset._snap = '1' }; oninput(e.target.value) };
  wrap.appendChild(label); wrap.appendChild(ta);
  return wrap;
}

/* ---- Actions ---- */
function addSection(type){
  pushHistory();
  const page = state.pages[state.pages.length-1];
  const sec = { id: id(), type, data: {} };
  if(type==='skills') sec.data.items = ['Skill A','Skill B'];
  if(type==='experience') sec.data.items = [{company:'Company',role:'Role',from:'',to:'',summary:''}];
  if(type==='education') sec.data.items = [{school:'School',degree:'Degree',year:''}];
  if(type==='header') sec.data = { name:'Your Name', title:'Your Title', email:'you@example.com', photo: null };
  if(type==='hobbies') sec.data = { text: 'Hobbies...' };
  page.sections.push(sec);
  save(); renderForms(); renderPreview();
}

function addPage(){ pushHistory(); state.pages.push({ sections: [] }); save(); renderForms(); renderPreview(); }

function removePage(index){ pushHistory(); state.pages.splice(index,1); if(state.pages.length===0) state.pages.push({ sections: [] }); save(); renderForms(); renderPreview(); }

function removeSection(pIndex, sIndex){ pushHistory(); state.pages[pIndex].sections.splice(sIndex,1); save(); renderForms(); renderPreview(); }

function moveSection(pIndex, sIndex, dir){
  pushHistory();
  const arr = state.pages[pIndex].sections;
  const to = sIndex + dir;
  if(to<0 || to>=arr.length) return;
  const [item] = arr.splice(sIndex,1);
  arr.splice(to,0,item);
  save(); renderForms(); renderPreview();
}

function moveSectionBetweenPages(fromP, fromS, toP, toS){
  // bounds
  if(fromP===toP && fromS===toS) return;
  pushHistory();
  const item = state.pages[fromP].sections.splice(fromS,1)[0];
  // if moving forward and removing earlier index in same page affects target index
  if(fromP===toP && fromS<toS) toS = toS - 1;
  state.pages[toP].sections.splice(toS,0,item);
  save(); renderForms(); renderPreview();
}

function moveToNextPage(pIndex, sIndex){
  pushHistory();
  const next = pIndex+1;
  if(next >= state.pages.length) state.pages.push({ sections: [] });
  const item = state.pages[pIndex].sections.splice(sIndex,1)[0];
  state.pages[next].sections.push(item);
  save(); renderForms(); renderPreview();
}

/* ---- Page splitting heuristics ---- */
function getPageMaxHeightPx(){
  const tmp = document.createElement('div'); tmp.className='page'; tmp.style.visibility='hidden'; tmp.style.position='absolute'; tmp.style.left='-9999px'; document.body.appendChild(tmp);
  const h = tmp.clientHeight || tmp.getBoundingClientRect().height;
  tmp.remove();
  return h;
}

function createSectionPreviewElement(section){
  // Returns same DOM structure used by preview for measuring
  const wrapper = document.createElement('div');
  wrapper.className = 'layer';
  if(section.type==='header'){
    const header = document.createElement('div'); header.className='header';
    const photo = document.createElement('div'); photo.className='photo-box';
    if(section.data.photo){ const img = document.createElement('img'); img.src = section.data.photo; photo.appendChild(img); }
    else photo.textContent='Photo';
    const meta = document.createElement('div');
    const name = document.createElement('h1'); name.className='candidate-name'; name.textContent = section.data.name || '';
    const title = document.createElement('div'); title.className='candidate-title'; title.textContent = section.data.title || '';
    const email = document.createElement('div'); email.className='candidate-contacts'; email.textContent = section.data.email || '';
    meta.appendChild(name); meta.appendChild(title); meta.appendChild(email);
    header.appendChild(photo); header.appendChild(meta);
    wrapper.appendChild(header);
  } else if(section.type==='experience'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Experience'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach(it=>{
      const row = document.createElement('div'); row.style.marginBottom='6px';
      const left = document.createElement('div'); left.style.fontWeight='600'; left.textContent = `${it.role} — ${it.company}`;
      const right = document.createElement('div'); right.style.fontSize='10pt'; right.textContent = `${it.from || ''} ${it.to ? '— '+it.to : ''}`;
      row.appendChild(left); row.appendChild(right);
      const sum = document.createElement('div'); sum.textContent = it.summary || ''; sum.style.color='var(--text-body)'; sum.style.fontSize='10pt';
      body.appendChild(row); body.appendChild(sum);
    })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='skills'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Skills'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach(s=>{ const chip = document.createElement('span'); chip.className='skill-chip'; chip.textContent = s; body.appendChild(chip); })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='education'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Education'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach(it=>{ const row = document.createElement('div'); row.style.marginBottom='6px'; const left = document.createElement('div'); left.style.fontWeight='600'; left.textContent = `${it.degree} — ${it.school}`; const right = document.createElement('div'); right.textContent = it.year || ''; row.appendChild(left); row.appendChild(right); body.appendChild(row); })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='hobbies'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Hobbies'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body'; body.textContent = section.data.text || '';
    sec.appendChild(body); wrapper.appendChild(sec);
  }
  return wrapper;
}

function balancePages(){
  const pageMax = getPageMaxHeightPx();
  let moved = 0;
  for(let i=0;i<state.pages.length;i++){
    const page = state.pages[i];
    let j=0;
    while(j < page.sections.length){
      // build measurement container
      const meas = document.createElement('div'); meas.className='page'; meas.style.visibility='hidden'; meas.style.position='absolute'; meas.style.left='-9999px';
      document.body.appendChild(meas);
      for(let k=0;k<=j;k++){
        const secEl = createSectionPreviewElement(page.sections[k]);
        meas.appendChild(secEl);
      }
      const h = meas.scrollHeight;
      meas.remove();
      if(h > pageMax){
        // move section j to next page
        const item = page.sections.splice(j,1)[0];
        if(i+1 >= state.pages.length) state.pages.push({ sections: [] });
        state.pages[i+1].sections.unshift(item);
        moved++;
        announce('Adjusted pages to avoid overflow');
        // do not increment j; re-evaluate same index (new section at j)
      } else {
        j++;
      }
    }
  }
  if(moved) save();
}

/* ---- Preview ---- */
function createPageBreakMarker(index){
  const marker = document.createElement('div'); marker.className='page-break-marker';
  const btn = document.createElement('button'); btn.textContent = 'Insert page break here';
  btn.addEventListener('click', ()=>{
    pushHistory();
    state.pages.splice(index+1,0,{ sections: [] });
    save(); renderForms(); renderPreview(); updateUndoRedoButtons(); announce('Inserted page break');
  });
  marker.appendChild(btn);
  return marker;
}

function updatePreviewScale(){
  const outer = els.preview();
  const inner = document.getElementById('preview-inner');
  if(!outer || !inner) return;
  // use panel-right available width
  const container = outer.parentElement; // panel-right
  const containerWidth = Math.max(160, container.clientWidth - 24);
  const firstPage = inner.querySelector('.page');
  // respect user-set zoom if present
  const userZoom = state.settings && state.settings.zoom;
  if(typeof userZoom === 'number' && !isNaN(userZoom)){
    inner.style.transform = `scale(${userZoom})`;
    return;
  }
  if(!firstPage){ inner.style.transform = 'scale(1)'; return }
  const pageWidth = firstPage.getBoundingClientRect().width;
  if(!pageWidth || pageWidth === 0){ inner.style.transform = 'scale(1)'; return }
  const scale = Math.min(1, containerWidth / pageWidth);
  inner.style.transform = `scale(${scale})`;
}

function renderPreview(){
  const outer = els.preview();
  const inner = document.getElementById('preview-inner');
  if(!inner){ outer.innerHTML = '<div id="preview-inner" class="preview-inner"></div>'; }
  const target = document.getElementById('preview-inner');
  target.innerHTML = '';
  state.pages.forEach((page, idx)=>{
    const p = document.createElement('div'); p.className = 'page';
    page.sections.forEach(section=>{
      if(section.type==='header'){
        const header = document.createElement('div'); header.className='header';
        const photo = document.createElement('div'); photo.className='photo-box';
        if(section.data.photo){ const img = document.createElement('img'); img.src = section.data.photo; photo.innerHTML=''; photo.appendChild(img); }
        else { photo.textContent='Photo' }
        const meta = document.createElement('div');
        const name = document.createElement('h1'); name.className='candidate-name'; name.textContent = section.data.name || '';
        const title = document.createElement('div'); title.className='candidate-title'; title.textContent = section.data.title || '';
        const email = document.createElement('div'); email.className='candidate-contacts'; email.textContent = section.data.email || '';
        meta.appendChild(name); meta.appendChild(title); meta.appendChild(email);
        header.appendChild(photo); header.appendChild(meta);
        p.appendChild(header);
      } else if(section.type==='experience'){
        const sec = document.createElement('div'); sec.className='section';
        const t = document.createElement('div'); t.className='section-title'; t.textContent='Experience'; sec.appendChild(t);
        const body = document.createElement('div'); body.className='section-body';
        (section.data.items||[]).forEach(it=>{
          const row = document.createElement('div'); row.style.marginBottom='6px';
          const left = document.createElement('div'); left.style.fontWeight='600'; left.textContent = `${it.role} — ${it.company}`;
          const right = document.createElement('div'); right.style.fontSize='10pt'; right.textContent = `${it.from || ''} ${it.to ? '— '+it.to : ''}`;
          row.appendChild(left); row.appendChild(right);
          const sum = document.createElement('div'); sum.textContent = it.summary || ''; sum.style.color='var(--text-body)'; sum.style.fontSize='10pt';
          body.appendChild(row); body.appendChild(sum);
        })
        sec.appendChild(body); p.appendChild(sec);
      } else if(section.type==='skills'){
        const sec = document.createElement('div'); sec.className='section';
        const t = document.createElement('div'); t.className='section-title'; t.textContent='Skills'; sec.appendChild(t);
        const body = document.createElement('div'); body.className='section-body';
        (section.data.items||[]).forEach(s=>{ const chip = document.createElement('span'); chip.className='skill-chip'; chip.textContent = s; body.appendChild(chip); })
        sec.appendChild(body); p.appendChild(sec);
      } else if(section.type==='education'){
        const sec = document.createElement('div'); sec.className='section';
        const t = document.createElement('div'); t.className='section-title'; t.textContent='Education'; sec.appendChild(t);
        const body = document.createElement('div'); body.className='section-body';
        (section.data.items||[]).forEach(it=>{ const row = document.createElement('div'); row.style.marginBottom='6px'; const left = document.createElement('div'); left.style.fontWeight='600'; left.textContent = `${it.degree} — ${it.school}`; const right = document.createElement('div'); right.textContent = it.year || ''; row.appendChild(left); row.appendChild(right); body.appendChild(row); })
        sec.appendChild(body); p.appendChild(sec);
      } else if(section.type==='hobbies'){
        const sec = document.createElement('div'); sec.className='section';
        const t = document.createElement('div'); t.className='section-title'; t.textContent='Hobbies'; sec.appendChild(t);
        const body = document.createElement('div'); body.className='section-body'; body.textContent = section.data.text || '';
        sec.appendChild(body); p.appendChild(sec);
      }
    })
    target.appendChild(p);
    // after each page except the last, add an explicit page-break marker
    if(idx < state.pages.length - 1){
      target.appendChild(createPageBreakMarker(idx));
    }
  })
  // adjust scale to fit
  requestAnimationFrame(updatePreviewScale);
}

/* ---- IO handlers ---- */
function exportJSON(){
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'resume.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function exportPDF(){
  // ensure pages are balanced and rendered before export
  balancePages(); renderForms(); renderPreview();
  // Use browser print dialog to generate a PDF with selectable text and proper image sizing.
  announce('Opening print dialog — use Save as PDF to export');
  const inner = document.getElementById('preview-inner');
  if(!inner){ alert('Nothing to print'); return }
  // Clear any manual zoom so printed layout matches A4 CSS
  const prevTransform = inner.style.transform;
  inner.style.transform = 'scale(1)';
  // small delay to reflow
  await new Promise(r=>setTimeout(r,60));
  window.print();
  // restore zoom after print dialog
  inner.style.transform = prevTransform;
}

function showPdfProgress(){
  const p = document.getElementById('pdf-progress'); if(!p) return; p.setAttribute('aria-hidden','false');
}

function hidePdfProgress(){
  const p = document.getElementById('pdf-progress'); if(!p) return; p.setAttribute('aria-hidden','true');
}

function importJSONFromFile(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try{ pushHistory(); state = JSON.parse(e.target.result); save(); renderForms(); renderPreview(); updateUndoRedoButtons(); }catch(err){ alert('Invalid JSON file') }
  };
  reader.readAsText(file);
}

function setZoomFromSlider(percent){
  const v = Number(percent) / 100;
  if(!state.settings) state.settings = {};
  state.settings.zoom = v;
  save();
  updatePreviewScale();
  const label = document.getElementById('zoom-value'); if(label) label.textContent = `${Math.round(v*100)}%`;
}

function initZoomUI(){
  const slider = document.getElementById('zoom-slider');
  const label = document.getElementById('zoom-value');
  if(!slider) return;
  // initialize slider value
  const z = state.settings && state.settings.zoom;
  if(typeof z === 'number' && !isNaN(z)){
    slider.value = Math.round(z*100);
    if(label) label.textContent = `${Math.round(z*100)}%`;
  } else {
    slider.value = 100;
    if(label) label.textContent = `Auto`;
  }
  slider.addEventListener('input', (e)=>{ setZoomFromSlider(e.target.value); });
}

/* ---- Wire UI ---- */
function wire(){
  els.addHeader()?.addEventListener('click', ()=> addSection('header'));
  els.addExperience()?.addEventListener('click', ()=> addSection('experience'));
  els.addSkills()?.addEventListener('click', ()=> addSection('skills'));
  els.addEducation()?.addEventListener('click', ()=> addSection('education'));
  els.addHobbies()?.addEventListener('click', ()=> addSection('hobbies'));
  els.addPage()?.addEventListener('click', addPage);
  els.exportJson()?.addEventListener('click', exportJSON);
  els.importJson()?.addEventListener('click', ()=> els.fileInput().click());
  const exportPdfBtn = document.getElementById('export-pdf');
  if(exportPdfBtn) exportPdfBtn.addEventListener('click', exportPDF);
  els.fileInput()?.addEventListener('change', e=>{ const f = e.target.files[0]; if(f) importJSONFromFile(f); e.target.value=''; });
  els.printBtn()?.addEventListener('click', ()=>{
    balancePages(); renderForms(); renderPreview();
    announce('Preparing pages for print');
    // small timeout to allow DOM updates before print
    setTimeout(()=> window.print(), 120);
  });
  const globalRemove = document.getElementById('remove-page-global');
  if(globalRemove){ globalRemove.addEventListener('click', ()=>{ removePage(state.pages.length-1); }); }
  const undoBtn = document.getElementById('undo'); if(undoBtn) undoBtn.addEventListener('click', undo);
  const redoBtn = document.getElementById('redo'); if(redoBtn) redoBtn.addEventListener('click', redo);
  updateUndoRedoButtons();
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    wire(); renderForms(); renderPreview();
    // ensure preview scale is initialized and kept updated on resize
    updatePreviewScale();
    initZoomUI();
    let rTimer = null;
    window.addEventListener('resize', ()=>{ clearTimeout(rTimer); rTimer = setTimeout(()=>{ updatePreviewScale() }, 120) });
    announce('App ready');
    // add small click feedback for template and io buttons
    ['add-header','add-experience','add-skills','add-education','add-hobbies','add-page','export-json','import-json','print','undo','redo','remove-page-global'].forEach(id=>{
      const b = document.getElementById(id);
      if(!b) return;
      b.addEventListener('click', ()=>{ b.classList.add('btn-click'); setTimeout(()=>b.classList.remove('btn-click'), 180); });
    });
  }catch(err){
    console.error('Initialization error', err);
    announce('Initialization failed — check browser console');
  }
});
