import { state, save, pushHistory } from './state.js';
import { els } from './ui.js';

// deterministic alternating layer colors: even -> light gray, odd -> white
const LAYER_GRAY = '#f3f4f6';
const LAYER_WHITE = '#ffffff';

// Floating font-size toolbar (singleton)
const _fontToolbar = (()=>{
  const el = document.createElement('div'); el.className = 'font-size-toolbar'; el.style.position='fixed'; el.style.zIndex='2200'; el.style.display='none'; el.style.gap='8px'; el.style.padding='6px'; el.style.background='#fff'; el.style.border='1px solid rgba(16,24,40,0.06)'; el.style.borderRadius='6px'; el.style.boxShadow='0 8px 20px rgba(16,24,40,0.06)';
  const btnDec = document.createElement('button'); btnDec.textContent='−'; btnDec.title='Decrease font size'; btnDec.style.padding='6px';
  const lbl = document.createElement('span'); lbl.textContent=''; lbl.style.minWidth='44px'; lbl.style.textAlign='center';
  const btnInc = document.createElement('button'); btnInc.textContent='+'; btnInc.title='Increase font size'; btnInc.style.padding='6px';
  el.appendChild(btnDec); el.appendChild(lbl); el.appendChild(btnInc);
  document.body.appendChild(el);
  return { el, btnDec, btnInc, lbl };
})();
let _toolbarTarget = null;
function hideFontToolbar(){ _fontToolbar.el.style.display='none'; _toolbarTarget = null; }
function showFontToolbarFor(targetEl, key, section){
  _toolbarTarget = { el: targetEl, key, section };
  const rect = targetEl.getBoundingClientRect();
  const top = Math.max(8, rect.top - 42 + window.scrollY);
  const left = Math.min(window.innerWidth - 160, rect.left + window.scrollX);
  _fontToolbar.el.style.top = (top) + 'px';
  _fontToolbar.el.style.left = (left) + 'px';
  // compute current size in pt
  const cs = window.getComputedStyle(targetEl);
  let px = parseFloat(cs.fontSize) || 11;
  let pt = Math.round((px * 0.75)*10)/10; // px -> pt (1px = 0.75pt)
  _fontToolbar.lbl.textContent = pt + 'pt';
  _fontToolbar.el.style.display = 'flex';
}
_fontToolbar.btnInc.addEventListener('click', ()=>{
  if(!_toolbarTarget) return; const t = _toolbarTarget.el; const key = _toolbarTarget.key; const section = _toolbarTarget.section;
  const cs = window.getComputedStyle(t); let px = parseFloat(cs.fontSize) || 11; let pt = px*0.75; pt = Math.round((pt+1)*10)/10; t.style.fontSize = pt + 'pt';
  if(!section.data) section.data = {};
  section.data._fontSizes = section.data._fontSizes || {};
  if(key) section.data._fontSizes[key] = t.style.fontSize;
  pushHistory(); save(); _fontToolbar.lbl.textContent = pt + 'pt';
});
_fontToolbar.btnDec.addEventListener('click', ()=>{
  if(!_toolbarTarget) return; const t = _toolbarTarget.el; const key = _toolbarTarget.key; const section = _toolbarTarget.section;
  const cs = window.getComputedStyle(t); let px = parseFloat(cs.fontSize) || 11; let pt = px*0.75; pt = Math.round((pt-1)*10)/10; if(pt < 6) pt = 6; t.style.fontSize = pt + 'pt';
  if(!section.data) section.data = {};
  section.data._fontSizes = section.data._fontSizes || {};
  if(key) section.data._fontSizes[key] = t.style.fontSize;
  pushHistory(); save(); _fontToolbar.lbl.textContent = pt + 'pt';
});


export function createSectionPreviewElement(section, pageIndex, sIndex){
  const wrapper = document.createElement('div');
  wrapper.className = 'layer';
  // enable dragging on preview layers
  wrapper.setAttribute('draggable', 'true');
  wrapper.addEventListener('dragstart', (e)=>{
    try{
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: section.id, fromP: pageIndex, fromS: sIndex }));
      e.dataTransfer.effectAllowed = 'move';
      wrapper.classList.add('dragging');
    }catch(err){ /* ignore */ }
  });
  wrapper.addEventListener('dragend', ()=>{
    wrapper.classList.remove('dragging');
    document.querySelectorAll('.layer.drag-over').forEach(el=>el.classList.remove('drag-over'));
  });
  wrapper.addEventListener('dragover', (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; wrapper.classList.add('drag-over'); });
  wrapper.addEventListener('dragleave', ()=>{ wrapper.classList.remove('drag-over'); });
  wrapper.addEventListener('drop', (e)=>{
    e.preventDefault(); wrapper.classList.remove('drag-over');
    try{
      const raw = e.dataTransfer.getData('text/plain');
      if(!raw) return;
      const d = JSON.parse(raw);
      if(!d || !d.id) return;
      // locate source section (robust search)
      let srcP = typeof d.fromP === 'number' ? d.fromP : -1;
      let srcIdx = -1;
      if(srcP >= 0 && state.pages[srcP]) srcIdx = state.pages[srcP].sections.findIndex(s=>s.id === d.id);
      if(srcIdx === -1){
        for(let pi=0;pi<state.pages.length;pi++){ const p = state.pages[pi]; const si = p.sections.findIndex(s=>s.id === d.id); if(si !== -1){ srcP = pi; srcIdx = si; break; } }
      }
      if(srcIdx === -1) return;
      const targetP = pageIndex;
      let targetIdx = sIndex;
      if(srcP === targetP){ if(srcIdx < targetIdx) targetIdx = targetIdx - 1; }
      const item = state.pages[srcP].sections.splice(srcIdx,1)[0];
      state.pages[targetP].sections.splice(targetIdx,0,item);
      pushHistory(); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated'));
    }catch(err){ console.error(err); }
  });
  if(typeof pageIndex !== 'undefined') wrapper.dataset.p = pageIndex;
  if(typeof sIndex !== 'undefined') wrapper.dataset.s = sIndex;
  // helper for attaching inline editable behavior and per-field font-size persistence
  function attachEditable(el, setter, key){
    // apply saved font-size if present on section
    try{ if(section.data && section.data._fontSizes && key && section.data._fontSizes[key]) el.style.fontSize = section.data._fontSizes[key]; }catch(e){}
    // store identifiers for external controls
    try{ if(section && section.id) el.dataset.sectionId = section.id; if(key) el.dataset.fieldKey = key; }catch(e){}
    el.addEventListener('focus', ()=>{ showFontToolbarFor(el, key, section); document.dispatchEvent(new CustomEvent('jobest:editable-focus',{ detail:{ sectionId: section && section.id, key } })); });
    // Allow Enter to insert a line break and not exit the editable
    el.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter'){
        ev.preventDefault();
        const sel = window.getSelection();
        if(!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        range.setStartAfter(br);
        range.setEndAfter(br);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
    el.addEventListener('blur', ()=>{
      // persist content and font-size (use innerHTML to preserve inline formatting)
      pushHistory();
      setter(el.innerHTML.trim());
      if(!section.data) section.data = {};
      section.data._fontSizes = section.data._fontSizes || {};
      if(key){ if(el.style.fontSize) section.data._fontSizes[key] = el.style.fontSize; }
      save();
      // hide toolbar shortly after blur
      setTimeout(()=>{ if(document.activeElement !== _fontToolbar.btnInc && document.activeElement !== _fontToolbar.btnDec) hideFontToolbar(); }, 120);
    });
  }
  if(section.type==='header'){
    const header = document.createElement('div'); header.className='header';
    const photo = document.createElement('div'); photo.className='photo-box';
    if(section.data.photo){ const img = document.createElement('img'); img.src = section.data.photo; photo.appendChild(img); }
    else photo.textContent='Photo';
    const meta = document.createElement('div');
    const name = document.createElement('h1'); name.className='candidate-name'; name.innerHTML = section.data.name || '';
    const title = document.createElement('div'); title.className='candidate-title'; title.innerHTML = section.data.title || '';
    const email = document.createElement('div'); email.className='candidate-contacts'; email.innerHTML = section.data.email || '';
    const location = document.createElement('div'); location.className='candidate-location'; location.innerHTML = section.data.location || '';
    const phone = document.createElement('div'); phone.className='candidate-phone'; phone.innerHTML = section.data.phone || '';
    const linkedin = document.createElement('div'); linkedin.className='candidate-linkedin';
    if(section.data.linkedin){ const a = document.createElement('a'); a.href = section.data.linkedin; a.target = '_blank'; a.rel='noopener noreferrer'; a.textContent = 'Linkedin'; linkedin.appendChild(a); } else { linkedin.innerHTML = '' }
    // inline editing
    name.contentEditable = true; name.spellcheck = false;
    title.contentEditable = true; title.spellcheck = false;
    email.contentEditable = true; email.spellcheck = false;
    attachEditable(name, v=>{ section.data.name = v }, 'name');
    attachEditable(title, v=>{ section.data.title = v }, 'title');
    attachEditable(email, v=>{ section.data.email = v }, 'email');
    attachEditable(location, v=>{ section.data.location = v }, 'location');
    attachEditable(phone, v=>{ section.data.phone = v }, 'phone');
    meta.appendChild(name); meta.appendChild(title); meta.appendChild(email);
    meta.appendChild(location); meta.appendChild(phone); meta.appendChild(linkedin);
    header.appendChild(photo); header.appendChild(meta);
    wrapper.appendChild(header);
    // add remove button overlay
    const rem = document.createElement('button'); rem.className = 'layer-remove'; rem.title = 'Remove section'; rem.textContent = '✕';
    rem.addEventListener('click', (e)=>{
      e.stopPropagation();
      pushHistory();
      // remove by id to be robust against index shifts
      const p = state.pages[pageIndex];
      if(!p) return;
      const idx = p.sections.findIndex(s=>s.id === section.id);
      if(idx !== -1){ p.sections.splice(idx,1); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); }
    });
    wrapper.appendChild(rem);
  } else if(section.type==='experience'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Experience'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((it, idx)=>{
      const row = document.createElement('div'); row.style.marginBottom='6px';
      const left = document.createElement('div'); left.style.fontWeight='600';
      const roleSpan = document.createElement('span'); roleSpan.innerHTML = it.role || '';
      roleSpan.contentEditable = true; roleSpan.spellcheck = false; roleSpan.style.fontWeight='700';
      const sep = document.createElement('span'); sep.textContent = ' — ';
      const companySpan = document.createElement('span'); companySpan.innerHTML = it.company || '';
      companySpan.contentEditable = true; companySpan.spellcheck = false;
      left.appendChild(roleSpan); left.appendChild(sep); left.appendChild(companySpan);
      const right = document.createElement('div'); right.style.fontSize='var(--editbox-font-size)';
      const dates = document.createElement('span'); dates.textContent = `${it.from || ''} ${it.to ? '— '+it.to : ''}`;
      right.appendChild(dates);
      row.appendChild(left); row.appendChild(right);
      const sum = document.createElement('div'); sum.innerHTML = it.summary || ''; sum.style.color='var(--text-body)'; sum.style.fontSize='var(--editbox-font-size)'; sum.contentEditable = true; sum.spellcheck = false;
      // attach editors with keys for font-size persistence
      attachEditable(roleSpan, v=>{ section.data.items[idx].role = v }, `items.${idx}.role`);
      attachEditable(companySpan, v=>{ section.data.items[idx].company = v }, `items.${idx}.company`);
      attachEditable(sum, v=>{ section.data.items[idx].summary = v }, `items.${idx}.summary`);
      body.appendChild(row); body.appendChild(sum);
    })
    sec.appendChild(body); wrapper.appendChild(sec);
    const rem2 = document.createElement('button'); rem2.className = 'layer-remove'; rem2.title = 'Remove section'; rem2.textContent = '✕';
    rem2.addEventListener('click', (e)=>{ e.stopPropagation(); pushHistory(); const p = state.pages[pageIndex]; if(!p) return; const idx = p.sections.findIndex(s=>s.id === section.id); if(idx !== -1){ p.sections.splice(idx,1); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); } });
    wrapper.appendChild(rem2);
  } else if(section.type==='skills'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Skills'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((s, idx)=>{ const chip = document.createElement('span'); chip.className='skill-chip'; chip.innerHTML = s; chip.contentEditable = true; chip.spellcheck = false; attachEditable(chip, v=>{ section.data.items[idx] = v }, `items.${idx}`); body.appendChild(chip); })
    sec.appendChild(body); wrapper.appendChild(sec);
    const rem3 = document.createElement('button'); rem3.className = 'layer-remove'; rem3.title = 'Remove section'; rem3.textContent = '✕';
    rem3.addEventListener('click', (e)=>{ e.stopPropagation(); pushHistory(); const p = state.pages[pageIndex]; if(!p) return; const idx = p.sections.findIndex(s=>s.id === section.id); if(idx !== -1){ p.sections.splice(idx,1); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); } });
    wrapper.appendChild(rem3);
  } else if(section.type==='education'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Education'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((it, idx)=>{ const row = document.createElement('div'); row.style.marginBottom='6px'; const left = document.createElement('div'); left.style.fontWeight='600'; const degreeSpan = document.createElement('span'); degreeSpan.innerHTML = it.degree || ''; degreeSpan.contentEditable = true; degreeSpan.spellcheck = false; const sep2 = document.createElement('span'); sep2.textContent = ' — '; const schoolSpan = document.createElement('span'); schoolSpan.innerHTML = it.school || ''; schoolSpan.contentEditable = true; schoolSpan.spellcheck = false; left.appendChild(degreeSpan); left.appendChild(sep2); left.appendChild(schoolSpan); const right = document.createElement('div'); right.textContent = it.year || ''; const yearSpan = document.createElement('span'); yearSpan.innerHTML = it.year || ''; yearSpan.contentEditable = true; yearSpan.spellcheck = false; right.innerHTML=''; right.appendChild(yearSpan); attachEditable(degreeSpan, v=>{ section.data.items[idx].degree = v }, `items.${idx}.degree`); attachEditable(schoolSpan, v=>{ section.data.items[idx].school = v }, `items.${idx}.school`); attachEditable(yearSpan, v=>{ section.data.items[idx].year = v }, `items.${idx}.year`); row.appendChild(left); row.appendChild(right); body.appendChild(row); })
    sec.appendChild(body); wrapper.appendChild(sec);
    const rem4 = document.createElement('button'); rem4.className = 'layer-remove'; rem4.title = 'Remove section'; rem4.textContent = '✕';
    rem4.addEventListener('click', (e)=>{ e.stopPropagation(); pushHistory(); const p = state.pages[pageIndex]; if(!p) return; const idx = p.sections.findIndex(s=>s.id === section.id); if(idx !== -1){ p.sections.splice(idx,1); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); } });
    wrapper.appendChild(rem4);
  } else if(section.type==='hobbies'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Hobbies'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body'; body.textContent = section.data.text || '';
    body.contentEditable = true; body.spellcheck = false;
      attachEditable(body, v=>{ section.data.text = v }, 'text');
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type === 'objectives'){
    const sec = document.createElement('div'); sec.className = 'section';
    const t = document.createElement('div'); t.className = 'section-title'; t.textContent = 'Objective'; sec.appendChild(t);
    const body = document.createElement('div'); body.className = 'section-body';
    body.style.textAlign = 'center'; body.style.fontStyle = 'italic'; body.style.fontSize = 'var(--editbox-font-size)';
    body.innerHTML = section.data.text || '';
    body.contentEditable = true; body.spellcheck = false;
    attachEditable(body, v=>{ section.data.text = v }, 'text');
    sec.appendChild(body); wrapper.appendChild(sec);
    const rem5 = document.createElement('button'); rem5.className = 'layer-remove'; rem5.title = 'Remove section'; rem5.textContent = '✕';
    rem5.addEventListener('click', (e)=>{ e.stopPropagation(); pushHistory(); const p = state.pages[pageIndex]; if(!p) return; const idx = p.sections.findIndex(s=>s.id === section.id); if(idx !== -1){ p.sections.splice(idx,1); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); } });
    wrapper.appendChild(rem5);
  }
  return wrapper;
}

export function getPageMaxHeightPx(){
  const tmp = document.createElement('div'); tmp.className='page'; tmp.style.visibility='hidden'; tmp.style.position='absolute'; tmp.style.left='-9999px';
  if(state.settings && state.settings.orientation === 'landscape') tmp.classList.add('landscape');
  document.body.appendChild(tmp);
  const h = tmp.clientHeight || tmp.getBoundingClientRect().height;
  tmp.remove();
  return h;
}

export function balancePages(){
  const pageMax = getPageMaxHeightPx();
  let moved = 0;
  for(let i=0;i<state.pages.length;i++){
    const page = state.pages[i];
    let j=0;
    while(j < page.sections.length){
      const meas = document.createElement('div'); meas.className='page'; meas.style.visibility='hidden'; meas.style.position='absolute'; meas.style.left='-9999px';
      if(state.settings && state.settings.orientation === 'landscape') meas.classList.add('landscape');
      document.body.appendChild(meas);
      for(let k=0;k<=j;k++){ const secEl = createSectionPreviewElement(page.sections[k], i, k); meas.appendChild(secEl); }
      const h = meas.scrollHeight; meas.remove();
      if(h > pageMax){
        // try to split the overflowing section if it contains items (experience/education/skills)
        const current = page.sections[j];
        const canSplit = current && current.data && Array.isArray(current.data.items) && current.data.items.length > 1 && (current.type === 'experience' || current.type === 'education' || current.type === 'skills');
        let splitDone = false;
        if(canSplit){
          const items = current.data.items.slice();
          // try largest prefix that fits
          for(let n = items.length - 1; n >= 1; n--){
            const firstItems = items.slice(0,n);
            const secondItems = items.slice(n);
            // build temp measure page with same previous sections and the truncated current
            const temp = document.createElement('div'); temp.className = 'page'; if(state.settings && state.settings.orientation === 'landscape') temp.classList.add('landscape'); temp.style.visibility='hidden'; temp.style.position='absolute'; temp.style.left='-9999px'; document.body.appendChild(temp);
            // append previous sections
            for(let k=0;k<j;k++){ const secEl = createSectionPreviewElement(page.sections[k], i, k); temp.appendChild(secEl); }
            // append truncated current
            const clone = JSON.parse(JSON.stringify(current)); clone.data = clone.data || {}; clone.data.items = firstItems;
            const secEl = createSectionPreviewElement(clone, i, j); temp.appendChild(secEl);
            const th = temp.scrollHeight; temp.remove();
            if(th <= pageMax){
              // apply split
              current.data.items = firstItems;
              const newSection = JSON.parse(JSON.stringify(current)); newSection.data = newSection.data || {}; newSection.data.items = secondItems; newSection.id = newSection.id || ('id_'+Math.random().toString(36).slice(2,9));
              if(i+1 >= state.pages.length) state.pages.push({ sections: [] });
              state.pages[i+1].sections.unshift(newSection);
              moved++; splitDone = true; break;
            }
          }
        }
        if(!splitDone){ const item = page.sections.splice(j,1)[0]; if(i+1 >= state.pages.length) state.pages.push({ sections: [] }); state.pages[i+1].sections.unshift(item); moved++; }
      }
      else j++;
    }
  }
  if(moved) save();
}

export function renderPreview(){
  const outer = els.preview();
  const inner = document.getElementById('preview-inner');
  if(!inner){ outer.innerHTML = '<div id="preview-inner" class="preview-inner"></div>'; }
  const target = document.getElementById('preview-inner');
  target.innerHTML = '';
  state.pages.forEach((page, idx)=>{
    const p = document.createElement('div'); p.className = 'page';
    if(state.settings && state.settings.orientation === 'landscape') p.classList.add('landscape'); else p.classList.remove('landscape');
    // allow dropping onto page background to append section
    p.addEventListener('dragover', (e)=>{ e.preventDefault(); });
    p.addEventListener('drop', (e)=>{
      e.preventDefault();
      try{
        const raw = e.dataTransfer.getData('text/plain'); if(!raw) return; const d = JSON.parse(raw); if(!d || !d.id) return;
        // find source
        let srcP = typeof d.fromP === 'number' ? d.fromP : -1; let srcIdx = -1;
        if(srcP >= 0 && state.pages[srcP]) srcIdx = state.pages[srcP].sections.findIndex(s=>s.id === d.id);
        if(srcIdx === -1){ for(let pi=0;pi<state.pages.length;pi++){ const p0 = state.pages[pi]; const si = p0.sections.findIndex(s=>s.id === d.id); if(si !== -1){ srcP = pi; srcIdx = si; break; } } }
        if(srcIdx === -1) return;
        const item = state.pages[srcP].sections.splice(srcIdx,1)[0];
        // append to end of target page
        state.pages[idx].sections.push(item);
        pushHistory(); save(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated'));
      }catch(err){ console.error(err) }
    });
    page.sections.forEach((section, sIndex)=>{
      const layer = createSectionPreviewElement(section, idx, sIndex);
      // apply deterministic alternating colors per-section (per page)
      layer.style.background = (sIndex % 2 === 0) ? LAYER_GRAY : LAYER_WHITE;
      p.appendChild(layer);
    })
    target.appendChild(p);
    if(idx < state.pages.length - 1){ target.appendChild(createPageBreakMarker(idx)); }
  })
  requestAnimationFrame(updatePreviewScale);
}

export function updatePreviewScale(){
  const outer = els.preview();
  const inner = document.getElementById('preview-inner'); if(!outer || !inner) return;
  const container = outer.parentElement; const containerWidth = Math.max(160, container.clientWidth - 24);
  const firstPage = inner.querySelector('.page');
  const userZoom = state.settings && state.settings.zoom;
  if(typeof userZoom === 'number' && !isNaN(userZoom)){ inner.style.transform = `scale(${userZoom})`; return; }
  if(!firstPage){ inner.style.transform = 'scale(1)'; return }
  const pageWidth = firstPage.getBoundingClientRect().width; if(!pageWidth || pageWidth === 0){ inner.style.transform = 'scale(1)'; return }
  const scale = Math.min(1, containerWidth / pageWidth); inner.style.transform = `scale(${scale})`;
}

function createPageBreakMarker(index){
  const marker = document.createElement('div'); marker.className='page-break-marker';
  const btn = document.createElement('button'); btn.textContent = 'Insert page break here';
  btn.addEventListener('click', ()=>{ state.pages.splice(index+1,0,{ sections: [] }); save(); renderPreview(); });
  marker.appendChild(btn);
  return marker;
}

// deprecated: layer color is assigned deterministically during renderPreview
export function assignLayerColor(section){
  // keep for backward-compat but no-op
  return;
}
