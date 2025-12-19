import { state, save } from './state.js';
import { els, inputField, textareaField } from './ui.js';
import { renderPreview, assignLayerColor, balancePages } from './preview.js';
import { pushHistory as ph } from './state.js';

export function addSection(type){
  console.log('editor.addSection', type);
  ph();
  const page = state.pages[state.pages.length-1];
  const sec = { id: ('id_'+Math.random().toString(36).slice(2,9)), type, data: {} };
  if(type==='skills') sec.data.items = ['Skill A','Skill B'];
  if(type==='experience') sec.data.items = [{company:'Company',role:'Role',from:'',to:'',summary:''}];
  if(type==='education') sec.data.items = [{school:'School',degree:'Degree',year:''}];
  if(type==='header') sec.data = { name:'Your Name', title:'Your Title', email:'you@example.com', photo: null };
  if(type==='objectives') sec.data = { text: 'A short objective or summary statement' };
  if(type==='hobbies') sec.data = { text: 'Hobbies...' };
  // assign a layer color for the preview layer
  assignLayerColor(sec);
  // append to the last page, then rebalance pages and navigate to the page containing the new section
  page.sections.push(sec);
  save();
  renderPreview();
  // ensure pages are balanced (move overflow sections to next pages)
  balancePages();
  save();
  // re-render forms and preview after balancing
  renderForms();
  renderPreview();
  // find where the new section landed and scroll preview to that page
  let foundPage = -1;
  for(let i=0;i<state.pages.length;i++){
    if(state.pages[i].sections.findIndex(s=>s.id===sec.id) !== -1){ foundPage = i; break }
  }
  if(foundPage !== -1){
    requestAnimationFrame(()=>{
      const inner = document.getElementById('preview-inner'); if(!inner) return;
      const pages = inner.querySelectorAll('.page'); if(pages[foundPage]) pages[foundPage].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

export function addPage(){ ph(); state.pages.push({ sections: [] }); save(); renderPreview(); }

export function removePage(index){ ph(); state.pages.splice(index,1); if(state.pages.length===0) state.pages.push({ sections: [] }); save(); renderPreview(); }

export function removeSection(pIndex, sIndex){ ph(); state.pages[pIndex].sections.splice(sIndex,1); save(); renderPreview(); }

export function moveSection(pIndex, sIndex, dir){ ph(); const arr = state.pages[pIndex].sections; const to = sIndex + dir; if(to<0 || to>=arr.length) return; const [item] = arr.splice(sIndex,1); arr.splice(to,0,item); save(); renderPreview(); }

export function moveSectionBetweenPages(fromP, fromS, toP, toS){ if(fromP===toP && fromS===toS) return; ph(); const item = state.pages[fromP].sections.splice(fromS,1)[0]; if(fromP===toP && fromS<toS) toS = toS - 1; state.pages[toP].sections.splice(toS,0,item); save(); renderPreview(); }

export function moveToNextPage(pIndex, sIndex){ ph(); const next = pIndex+1; if(next >= state.pages.length) state.pages.push({ sections: [] }); const item = state.pages[pIndex].sections.splice(sIndex,1)[0]; state.pages[next].sections.push(item); save(); renderPreview(); }

export function renderForms(){
  const container = els.forms();
  container.innerHTML = '';
  state.pages.forEach((page, pIndex)=>{
    const pageWrap = document.createElement('div'); pageWrap.className = 'page-editor';
    const headerRow = document.createElement('div'); headerRow.style.display='flex'; headerRow.style.justifyContent='space-between'; headerRow.style.alignItems='center'; headerRow.style.marginBottom='8px';
    const title = document.createElement('div'); title.textContent = `Page ${pIndex+1}`; title.style.fontWeight = '700'; title.style.fontSize = '13px';
    const removePageBtn = document.createElement('button'); removePageBtn.textContent='Remove Page'; removePageBtn.addEventListener('click', ()=>{ removePage(pIndex); });
    headerRow.appendChild(title); headerRow.appendChild(removePageBtn); pageWrap.appendChild(headerRow);

    page.sections.forEach((section, sIndex)=>{
      const s = document.createElement('section'); s.className = 'editor-section'; s.dataset.p = pIndex; s.dataset.s = sIndex;
      const handle = document.createElement('div'); handle.className='drag-handle'; handle.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 6h4v2h-4zM10 11h4v2h-4zM10 16h4v2h-4z"/></svg>';
      s.appendChild(handle);

      const h = document.createElement('div'); h.style.display='flex'; h.style.justifyContent='space-between'; h.style.alignItems='center';
      const label = document.createElement('div'); label.className = 'editor-section-title'; label.textContent = `${section.type.toUpperCase()} (${sIndex+1})`; h.appendChild(label);
      const controls = document.createElement('div'); controls.className='editor-controls';

      const up = document.createElement('button'); up.textContent='↑'; up.title='Move up'; up.onclick = ()=>{ moveSection(pIndex, sIndex, -1) };
      const down = document.createElement('button'); down.textContent='↓'; down.title='Move down'; down.onclick = ()=>{ moveSection(pIndex, sIndex, 1) };
      const nextPage = document.createElement('button'); nextPage.textContent='⇢'; nextPage.title='Move to next page'; nextPage.onclick = ()=>{ moveToNextPage(pIndex, sIndex) };
      const remove = document.createElement('button'); remove.textContent='Remove'; remove.title='Remove section'; remove.onclick = ()=>{ removeSection(pIndex, sIndex) };
      controls.appendChild(up); controls.appendChild(down); controls.appendChild(nextPage); controls.appendChild(remove); h.appendChild(controls);
      s.appendChild(h);

      // simple fields
      if(section.type === 'header'){
        const photoRow = document.createElement('div'); photoRow.style.display='flex'; photoRow.style.alignItems='center'; photoRow.style.gap='8px';
        const img = document.createElement('img'); img.className='photo-preview'; if(section.data.photo) img.src = section.data.photo;
        const file = document.createElement('input'); file.type='file'; file.accept='image/*'; file.onchange = e=>{ const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = ev=>{ section.data.photo = ev.target.result; save(); renderForms(); renderPreview(); }; r.readAsDataURL(f); };
        photoRow.appendChild(img); photoRow.appendChild(file); s.appendChild(photoRow);
        s.appendChild(inputField('Name', section.data.name, v=>{ section.data.name = v; save(); renderPreview(); }));
        s.appendChild(inputField('Title', section.data.title, v=>{ section.data.title = v; save(); renderPreview(); }));
        s.appendChild(inputField('Email', section.data.email, v=>{ section.data.email = v; save(); renderPreview(); }));
      } else if(section.type === 'experience'){
        section.data.items = section.data.items || [];
        section.data.items.forEach((it,i)=>{
          const wrap = document.createElement('div'); wrap.style.paddingTop='8px';
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
        s.appendChild(textareaField('Skills (comma separated)', (section.data.items||[]).join(', '), v=>{ section.data.items = v.split(',').map(x=>x.trim()).filter(Boolean); save(); renderPreview() }));
      } else if(section.type === 'education'){
        section.data.items = section.data.items || [];
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
        s.appendChild(textareaField('Hobbies', section.data.text || '', v=>{ section.data.text=v; save(); renderPreview() }));
      }

      else if(section.type === 'objectives'){
        s.appendChild(textareaField('Objective', section.data.text || '', v=>{ section.data.text = v; save(); renderPreview(); }));
      }

      pageWrap.appendChild(s);
    })

    container.appendChild(pageWrap);
  });
}

// expose helpers for wire-up drag events (lightweight)
export function attachDragHandlers(){
  document.addEventListener('dragstart', (e)=>{
    const s = e.target.closest('.editor-section'); if(!s) return;
    const p = Number(s.dataset.p); const si = Number(s.dataset.s);
    e.dataTransfer.setData('text/plain', JSON.stringify({ fromP: p, fromS: si }));
  });
  // drop handlers on page editor
  document.addEventListener('dragover', (e)=>{ if(e.target.closest('.page-editor')) e.preventDefault(); });
  document.addEventListener('drop', (e)=>{
    const pageWrap = e.target.closest('.page-editor'); if(!pageWrap) return; e.preventDefault(); try{ const payload = JSON.parse(e.dataTransfer.getData('text/plain')); const pageIndex = Array.from(document.querySelectorAll('.page-editor')).indexOf(pageWrap); moveSectionBetweenPages(payload.fromP, payload.fromS, pageIndex, state.pages[pageIndex].sections.length); }catch(_){ }
  });
}
