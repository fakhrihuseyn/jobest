import { state, save, setUndoRedoUIUpdater, pushHistory, undo, redo, canUndo, canRedo, announce } from './state.js';
import { els } from './ui.js';
import { renderForms, attachDragHandlers, addSection, addPage, removePage } from './editor.js';
import { renderPreview, updatePreviewScale, balancePages } from './preview.js';
import { exportJSON, exportPDF, importJSONFromFile } from './io.js';
import { initZoomUI } from './ui.js';

function updateUndoRedoButtons(){ const u = document.getElementById('undo'); const r = document.getElementById('redo'); if(u) u.disabled = !canUndo(); if(r) r.disabled = !canRedo(); }
setUndoRedoUIUpdater(updateUndoRedoButtons);

function wire(){
  console.log('wire: attaching UI handlers');
  console.log('wire: available els keys', Object.keys(els));
  els.addHeader()?.addEventListener('click', ()=>{ console.log('clicked add-header'); addSection('header'); });
  els.addExperience()?.addEventListener('click', ()=>{ console.log('clicked add-experience'); addSection('experience'); });
  els.addSkills()?.addEventListener('click', ()=>{ console.log('clicked add-skills'); addSection('skills'); });
  els.addEducation()?.addEventListener('click', ()=>{ console.log('clicked add-education'); addSection('education'); });
  els.addHobbies()?.addEventListener('click', ()=>{ console.log('clicked add-hobbies'); addSection('hobbies'); });
  els.addObjectives()?.addEventListener('click', ()=>{ console.log('clicked add-objectives'); addSection('objectives'); });
  document.getElementById('add-page')?.addEventListener('click', ()=>{ addPage(); renderForms(); renderPreview(); });
  document.getElementById('export-json')?.addEventListener('click', exportJSON);
  document.getElementById('import-json')?.addEventListener('click', ()=> els.fileInput().click());
  document.getElementById('export-pdf')?.addEventListener('click', exportPDF);
  document.getElementById('file-input')?.addEventListener('change', e=>{ const f = e.target.files[0]; if(f) importJSONFromFile(f); e.target.value=''; });
  document.getElementById('print')?.addEventListener('click', ()=>{ renderPreview(); announce('Preparing pages for print'); setTimeout(()=> window.print(), 120); });
  document.getElementById('remove-page-global')?.addEventListener('click', ()=>{ removePage(state.pages.length-1); });
  document.getElementById('undo')?.addEventListener('click', ()=>{ undo(); renderForms(); renderPreview(); updateUndoRedoButtons(); });
  document.getElementById('redo')?.addEventListener('click', ()=>{ redo(); renderForms(); renderPreview(); updateUndoRedoButtons(); });
  // listen for state updates dispatched by preview layer actions
  window.addEventListener('jobest:state-updated', ()=>{ try{ renderForms(); updatePreviewScale(); updateUndoRedoButtons(); }catch(e){ console.error(e) } });

  // Font selector wiring: persist choice and apply via CSS var
  const fs = els.fontSelect?.();
  // saved selection range when interacting with UI controls (to avoid losing selection on dropdown click)
  let __jobest_saved_range = null;
  if(fs){
    // apply saved font
    if(state.settings && state.settings.font) {
      try{ fs.value = state.settings.font }catch(e){}
    }
    // helper: normalize simple inline font spans inside an editable area
    function normalizeEditableFonts(editable){
      if(!editable) return;
      try{
        // unwrap empty/unnecessary spans
        // Remove empty spans and keep only fontFamily/fontSize inline styles
        const spans = Array.from(editable.querySelectorAll('span'));
        spans.forEach(s=>{
          // collect intended style values
          const fontFamily = s.style && s.style.fontFamily ? s.style.fontFamily.trim() : '';
          const fontSize = s.style && s.style.fontSize ? s.style.fontSize.trim() : '';
          // if span has no meaningful style and no attributes, unwrap it
          const hasMeaning = fontFamily || fontSize || s.attributes.length > 0;
          if(!hasMeaning){
            const parent = s.parentNode;
            while(s.firstChild) parent.insertBefore(s.firstChild, s);
            parent.removeChild(s);
            return;
          }
          // sanitize: remove all attributes except style, and within style keep only font-family and font-size
          for(let i = s.attributes.length - 1; i >= 0; i--){ const name = s.attributes[i].name; if(name !== 'style') s.removeAttribute(name); }
          // rebuild style string with only allowed declarations
          const allowed = [];
          if(fontFamily) allowed.push('font-family: '+fontFamily+';');
          if(fontSize) allowed.push('font-size: '+fontSize+';');
          s.setAttribute('style', allowed.join(' '));
        });
        // merge adjacent spans with identical font styles
        let node = editable.firstChild;
        while(node){
          if(node.nodeType===1 && node.tagName && node.tagName.toLowerCase()==='span'){
            let nxt = node.nextSibling;
            while(nxt && nxt.nodeType===1 && nxt.tagName && nxt.tagName.toLowerCase()==='span'){
              const nodeStyle = (node.getAttribute('style')||'').trim();
              const nxtStyle = (nxt.getAttribute('style')||'').trim();
              if(nodeStyle !== nxtStyle) break;
              // move children from nxt into node
              while(nxt.firstChild) node.appendChild(nxt.firstChild);
              const toRemove = nxt;
              nxt = nxt.nextSibling;
              toRemove.parentNode.removeChild(toRemove);
            }
          }
          node = node.nextSibling;
        }
      }catch(e){/* best-effort normalization */}
    }

    // capture selection before the control receives focus (mousedown happens before blur on editable)
    fs.addEventListener('mousedown', (ev)=>{
      try{
        const sel = window.getSelection();
        if(sel && sel.rangeCount && !sel.isCollapsed){
          __jobest_saved_range = sel.getRangeAt(0).cloneRange();
        } else __jobest_saved_range = null;
      }catch(e){ __jobest_saved_range = null }
    });

    fs.addEventListener('change', (e)=>{
      const val = e.target.value;

      // restore a saved selection (if user selected text then opened the dropdown)
      try{
        if(__jobest_saved_range){ const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(__jobest_saved_range); }
      }catch(_){ /* ignore */ }

      const sel = window.getSelection();
      const persistEditable = (editable) => {
        if(!editable) return;
        try{ normalizeEditableFonts(editable); }catch(_){}
        const sid = editable.dataset && editable.dataset.sectionId; const key = editable.dataset && editable.dataset.fieldKey;
        if(sid){ const sec = state.pages.flatMap(p=>p.sections).find(s=>s.id===sid); if(sec){ if(key){ if(key.indexOf('items.')===0){ const parts = key.split('.'); const idx = Number(parts[1]); const prop = parts.length>2 ? parts.slice(2).join('.') : null; if(!isNaN(idx)){ if(prop){ sec.data.items[idx] = sec.data.items[idx] || {}; sec.data.items[idx][prop] = editable.innerHTML; } else { sec.data.items[idx] = editable.innerHTML; } } } else { sec.data[key] = editable.innerHTML; } } else { sec.data = sec.data || {}; sec.data._lastEditedHTML = editable.innerHTML; } save(); pushHistory(); renderPreview(); window.dispatchEvent(new CustomEvent('jobest:state-updated')); }}
      };

      if(sel && sel.rangeCount && !sel.isCollapsed){
        // Prefer execCommand when available (better at handling complex ranges)
        let usedExec = false;
        try{
          if(document.queryCommandSupported && document.queryCommandSupported('fontName')){ document.execCommand('fontName', false, val); usedExec = true; }
        }catch(_){ usedExec = false }

        if(usedExec){
          const activeEditable = document.activeElement && document.activeElement.isContentEditable ? document.activeElement : document.querySelector('[contenteditable="true"]');
          persistEditable(activeEditable);
        } else {
          // fallback: wrap the selected range in a span
          try{
            const range = sel.getRangeAt(0);
            const contents = range.extractContents();
            const span = document.createElement('span'); span.style.fontFamily = val; span.appendChild(contents); range.insertNode(span);
            const editable = span.closest('[contenteditable="true"]');
            try{ normalizeEditableFonts(editable); }catch(_){}
            persistEditable(editable);
          }catch(err){ console.error('apply font to selection failed', err); }
        }
      } else {
        // no selection: apply to focused editable or save preference
        const active = document.activeElement;
        if(active && active.isContentEditable){
          try{ active.style.fontFamily = val; persistEditable(active); }catch(err){ console.error('apply font to focused editable failed', err); }
        }
        if(!state.settings) state.settings = {}; state.settings.font = val; save();
      }

      __jobest_saved_range = null;
    });
  }

  // Orientation selector
  const orient = document.getElementById('orientation-select');
  if(orient){
    if(!state.settings) state.settings = {};
    if(!state.settings.orientation) state.settings.orientation = 'portrait';
    try{ orient.value = state.settings.orientation }catch(e){}
    orient.addEventListener('change', (e)=>{
      state.settings.orientation = e.target.value;
      save(); balancePages(); renderPreview(); updatePreviewScale();
    });
  }

  // Font size controls
  const baseIn = document.getElementById('base-font-size');
  const titleIn = document.getElementById('title-font-size');
  const sectionIn = document.getElementById('section-font-size');
  const baseVal = document.getElementById('base-font-value');
  const titleVal = document.getElementById('title-font-value');
  const sectionVal = document.getElementById('section-font-value');
  // ensure defaults
  if(!state.settings) state.settings = {};
  if(typeof state.settings.baseFontSize === 'undefined') state.settings.baseFontSize = 11;
  if(typeof state.settings.titleFontSize === 'undefined') state.settings.titleFontSize = 48;
  if(typeof state.settings.sectionTitleSize === 'undefined') state.settings.sectionTitleSize = 13;
  // apply to UI and CSS variables
  function applyFontSizes(){
    document.documentElement.style.setProperty('--base-font-size', state.settings.baseFontSize + 'pt');
    document.documentElement.style.setProperty('--title-font-size', state.settings.titleFontSize + 'pt');
    document.documentElement.style.setProperty('--section-title-size', state.settings.sectionTitleSize + 'pt');
    if(baseVal) baseVal.textContent = state.settings.baseFontSize + 'pt';
    if(titleVal) titleVal.textContent = state.settings.titleFontSize + 'pt';
    if(sectionVal) sectionVal.textContent = state.settings.sectionTitleSize + 'pt';
  }
  applyFontSizes();
  if(baseIn) { baseIn.value = state.settings.baseFontSize; baseIn.addEventListener('input', (e)=>{ state.settings.baseFontSize = Number(e.target.value); applyFontSizes(); save(); balancePages(); renderPreview(); updatePreviewScale(); }); }
  if(titleIn){ titleIn.value = state.settings.titleFontSize; titleIn.addEventListener('input', (e)=>{ state.settings.titleFontSize = Number(e.target.value); applyFontSizes(); save(); balancePages(); renderPreview(); updatePreviewScale(); }); }
  if(sectionIn){ sectionIn.value = state.settings.sectionTitleSize; sectionIn.addEventListener('input', (e)=>{ state.settings.sectionTitleSize = Number(e.target.value); applyFontSizes(); save(); balancePages(); renderPreview(); updatePreviewScale(); }); }

  // Selected-field font-size control (applies to focused/editable element in preview)
  const selIn = document.getElementById('selected-field-size');
  const selVal = document.getElementById('selected-field-value');
  let _lastFocusedEditable = null;
  let _selDebounceTimer = null;
  if(selIn){
    // enforce a sensible max from UI and prevent heavy work on every tiny input event
    try{ selIn.max = 30 }catch(e){}
    selIn.addEventListener('input', (e)=>{
      let v = Math.min(Number(e.target.value), 30);
      if(selVal) selVal.textContent = v + 'pt';
      const el = window._jobest_focused_editable || document.activeElement;
      if(el && el.isContentEditable){
        el.style.fontSize = v + 'pt';
        const sid = el.dataset.sectionId; const key = el.dataset.fieldKey;
        if(sid && key){ const sec = state.pages.flatMap(p=>p.sections).find(s=>s.id===sid); if(sec){ if(!sec.data) sec.data = {}; sec.data._fontSizes = sec.data._fontSizes || {}; sec.data._fontSizes[key] = el.style.fontSize; }
        }
        // debounce heavier persistence and layout passes to avoid UI freeze while dragging
        if(_selDebounceTimer) clearTimeout(_selDebounceTimer);
        _selDebounceTimer = setTimeout(()=>{
          pushHistory(); save(); try{ balancePages(); renderPreview(); updatePreviewScale(); }catch(e){}
          _selDebounceTimer = null;
        }, 240);
      }
    });
    // on change (slider release) ensure final commit immediately
    selIn.addEventListener('change', (e)=>{
      let v = Math.min(Number(e.target.value), 30);
      const el = window._jobest_focused_editable || document.activeElement;
      if(el && el.isContentEditable){
        el.style.fontSize = v + 'pt';
        const sid = el.dataset.sectionId; const key = el.dataset.fieldKey;
        if(sid && key){ const sec = state.pages.flatMap(p=>p.sections).find(s=>s.id===sid); if(sec){ if(!sec.data) sec.data = {}; sec.data._fontSizes = sec.data._fontSizes || {}; sec.data._fontSizes[key] = el.style.fontSize; }
        }
      }
      if(_selDebounceTimer) clearTimeout(_selDebounceTimer);
      pushHistory(); save(); try{ balancePages(); renderPreview(); updatePreviewScale(); }catch(e){}
      _selDebounceTimer = null;
    });
  }

  // listen for edit focus events from preview elements
  document.addEventListener('jobest:editable-focus', (ev)=>{
    try{
      const detail = ev.detail || {};
      const sid = detail.sectionId; const key = detail.key;
      // find focused element in DOM
      const el = document.activeElement && document.activeElement.isContentEditable ? document.activeElement : document.querySelector(`[data-section-id="${sid}"][data-field-key="${key}"]`);
      window._jobest_focused_editable = el;
      if(!el) return;
      // compute font-size in pt
      const cs = window.getComputedStyle(el); let px = parseFloat(cs.fontSize) || 11; let pt = Math.round((px * 0.75)*10)/10;
      if(selIn) selIn.value = pt; if(selVal) selVal.textContent = pt + 'pt';
    }catch(e){/*ignore*/}
  });
}

// init app
window.addEventListener('DOMContentLoaded', ()=>{
  try{
    console.log('app init');
    // global runtime error surface to DOM for easier debugging
    window.addEventListener('error', (ev)=>{
      console.error('Global error caught', ev.error || ev.message || ev);
      const ann = document.getElementById('announcer'); if(ann) ann.textContent = 'Error: '+(ev.error && ev.error.message ? ev.error.message : (ev.message || 'Unknown error'));
    });
    window.addEventListener('unhandledrejection', (ev)=>{
      console.error('Unhandled rejection', ev.reason);
      const ann = document.getElementById('announcer'); if(ann) ann.textContent = 'Rejection: '+(ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason));
    });
    wire(); renderForms(); renderPreview(); attachDragHandlers(); updatePreviewScale(); initZoomUI(val=>{ if(!state.settings) state.settings = {}; state.settings.zoom = Number(val)/100; save(); updatePreviewScale(); }, state);
    window.addEventListener('resize', ()=> setTimeout(()=> updatePreviewScale(), 120));
    announce('App ready');
  }catch(err){ console.error('Initialization error', err); announce('Initialization failed') }
});
