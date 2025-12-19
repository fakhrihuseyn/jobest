export const els = {
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

export function inputField(labelText, value, oninput){ const wrap = document.createElement('div'); wrap.style.marginTop='6px'; const label = document.createElement('label'); label.textContent = labelText; label.style.display='block'; label.style.fontSize='12px'; const inp = document.createElement('input'); inp.type='text'; inp.value = value || ''; inp.addEventListener('focus', ()=>{ inp.dataset._snap = '0' }); inp.addEventListener('input', (e)=>{ if(inp.dataset._snap === '0'){ oninput.__pushHistory && oninput.__pushHistory(); inp.dataset._snap = '1' } ; oninput(e.target.value) }); wrap.appendChild(label); wrap.appendChild(inp); return wrap; }

export function textareaField(labelText, value, oninput){
  const wrap = document.createElement('div'); wrap.style.marginTop='8px';
  const label = document.createElement('label'); label.textContent=labelText; label.style.display='block'; label.style.fontSize='12px';
  const ta = document.createElement('textarea'); ta.value = value || '';
  ta.addEventListener('focus', ()=>{ ta.dataset._snap = '0' });
  ta.oninput = e=>{ if(ta.dataset._snap === '0'){ oninput.__pushHistory && oninput.__pushHistory(); ta.dataset._snap = '1' }; oninput(e.target.value) };
  wrap.appendChild(label); wrap.appendChild(ta);
  return wrap;
}

export function initZoomUI(setZoomFromSlider, state){
  const slider = document.getElementById('zoom-slider');
  const label = document.getElementById('zoom-value');
  if(!slider) return;
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
