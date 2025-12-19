import { state, save, pushHistory } from './state.js';
import { els } from './ui.js';

// deterministic alternating layer colors: even -> light gray, odd -> white
const LAYER_GRAY = '#f3f4f6';
const LAYER_WHITE = '#ffffff';

export function createSectionPreviewElement(section, pageIndex, sIndex){
  const wrapper = document.createElement('div');
  wrapper.className = 'layer';
  if(typeof pageIndex !== 'undefined') wrapper.dataset.p = pageIndex;
  if(typeof sIndex !== 'undefined') wrapper.dataset.s = sIndex;
  // helper for attaching inline editable behavior
  function attachEditable(el, setter){
    el.addEventListener('blur', ()=>{
      pushHistory();
      setter(el.textContent.trim());
      save();
    });
    el.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ ev.preventDefault(); el.blur(); } });
  }
  if(section.type==='header'){
    const header = document.createElement('div'); header.className='header';
    const photo = document.createElement('div'); photo.className='photo-box';
    if(section.data.photo){ const img = document.createElement('img'); img.src = section.data.photo; photo.appendChild(img); }
    else photo.textContent='Photo';
    const meta = document.createElement('div');
    const name = document.createElement('h1'); name.className='candidate-name'; name.textContent = section.data.name || '';
    const title = document.createElement('div'); title.className='candidate-title'; title.textContent = section.data.title || '';
    const email = document.createElement('div'); email.className='candidate-contacts'; email.textContent = section.data.email || '';
    // inline editing
    name.contentEditable = true; name.spellcheck = false;
    title.contentEditable = true; title.spellcheck = false;
    email.contentEditable = true; email.spellcheck = false;
    attachEditable(name, v=>{ section.data.name = v });
    attachEditable(title, v=>{ section.data.title = v });
    attachEditable(email, v=>{ section.data.email = v });
    meta.appendChild(name); meta.appendChild(title); meta.appendChild(email);
    header.appendChild(photo); header.appendChild(meta);
    wrapper.appendChild(header);
  } else if(section.type==='experience'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Experience'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((it, idx)=>{
      const row = document.createElement('div'); row.style.marginBottom='6px';
      const left = document.createElement('div'); left.style.fontWeight='600';
      const roleSpan = document.createElement('span'); roleSpan.textContent = it.role || '';
      roleSpan.contentEditable = true; roleSpan.spellcheck = false; roleSpan.style.fontWeight='700';
      const sep = document.createElement('span'); sep.textContent = ' — ';
      const companySpan = document.createElement('span'); companySpan.textContent = it.company || '';
      companySpan.contentEditable = true; companySpan.spellcheck = false;
      left.appendChild(roleSpan); left.appendChild(sep); left.appendChild(companySpan);
      const right = document.createElement('div'); right.style.fontSize='10pt';
      const dates = document.createElement('span'); dates.textContent = `${it.from || ''} ${it.to ? '— '+it.to : ''}`;
      right.appendChild(dates);
      row.appendChild(left); row.appendChild(right);
      const sum = document.createElement('div'); sum.textContent = it.summary || ''; sum.style.color='var(--text-body)'; sum.style.fontSize='10pt'; sum.contentEditable = true; sum.spellcheck = false;
      // attach editors
      attachEditable(roleSpan, v=>{ section.data.items[idx].role = v });
      attachEditable(companySpan, v=>{ section.data.items[idx].company = v });
      attachEditable(sum, v=>{ section.data.items[idx].summary = v });
      body.appendChild(row); body.appendChild(sum);
    })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='skills'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Skills'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((s, idx)=>{ const chip = document.createElement('span'); chip.className='skill-chip'; chip.textContent = s; chip.contentEditable = true; chip.spellcheck = false; attachEditable(chip, v=>{ section.data.items[idx] = v }); body.appendChild(chip); })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='education'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Education'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body';
    (section.data.items||[]).forEach((it, idx)=>{ const row = document.createElement('div'); row.style.marginBottom='6px'; const left = document.createElement('div'); left.style.fontWeight='600'; const degreeSpan = document.createElement('span'); degreeSpan.textContent = it.degree || ''; degreeSpan.contentEditable = true; degreeSpan.spellcheck = false; const sep2 = document.createElement('span'); sep2.textContent = ' — '; const schoolSpan = document.createElement('span'); schoolSpan.textContent = it.school || ''; schoolSpan.contentEditable = true; schoolSpan.spellcheck = false; left.appendChild(degreeSpan); left.appendChild(sep2); left.appendChild(schoolSpan); const right = document.createElement('div'); right.textContent = it.year || ''; const yearSpan = document.createElement('span'); yearSpan.textContent = it.year || ''; yearSpan.contentEditable = true; yearSpan.spellcheck = false; right.innerHTML=''; right.appendChild(yearSpan); attachEditable(degreeSpan, v=>{ section.data.items[idx].degree = v }); attachEditable(schoolSpan, v=>{ section.data.items[idx].school = v }); attachEditable(yearSpan, v=>{ section.data.items[idx].year = v }); row.appendChild(left); row.appendChild(right); body.appendChild(row); })
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type==='hobbies'){
    const sec = document.createElement('div'); sec.className='section';
    const t = document.createElement('div'); t.className='section-title'; t.textContent='Hobbies'; sec.appendChild(t);
    const body = document.createElement('div'); body.className='section-body'; body.textContent = section.data.text || '';
    body.contentEditable = true; body.spellcheck = false;
    attachEditable(body, v=>{ section.data.text = v });
    sec.appendChild(body); wrapper.appendChild(sec);
  } else if(section.type === 'objectives'){
    const sec = document.createElement('div'); sec.className = 'section';
    const t = document.createElement('div'); t.className = 'section-title'; t.textContent = 'Objective'; sec.appendChild(t);
    const body = document.createElement('div'); body.className = 'section-body';
    body.style.textAlign = 'center'; body.style.fontStyle = 'italic'; body.style.fontSize = '11.5pt';
    body.textContent = section.data.text || '';
    body.contentEditable = true; body.spellcheck = false;
    attachEditable(body, v=>{ section.data.text = v });
    sec.appendChild(body); wrapper.appendChild(sec);
  }
  return wrapper;
}

export function getPageMaxHeightPx(){
  const tmp = document.createElement('div'); tmp.className='page'; tmp.style.visibility='hidden'; tmp.style.position='absolute'; tmp.style.left='-9999px'; document.body.appendChild(tmp);
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
      document.body.appendChild(meas);
      for(let k=0;k<=j;k++){ const secEl = createSectionPreviewElement(page.sections[k], i, k); meas.appendChild(secEl); }
      const h = meas.scrollHeight; meas.remove();
      if(h > pageMax){ const item = page.sections.splice(j,1)[0]; if(i+1 >= state.pages.length) state.pages.push({ sections: [] }); state.pages[i+1].sections.unshift(item); moved++; }
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
