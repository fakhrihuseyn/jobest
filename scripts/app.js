import { state, save, setUndoRedoUIUpdater, pushHistory, undo, redo, canUndo, canRedo, announce } from './state.js';
import { els } from './ui.js';
import { renderForms, attachDragHandlers, addSection, addPage, removePage } from './editor.js';
import { renderPreview, updatePreviewScale } from './preview.js';
import { exportJSON, exportPDF, importJSONFromFile } from './io.js';
import { initZoomUI } from './ui.js';

function updateUndoRedoButtons(){ const u = document.getElementById('undo'); const r = document.getElementById('redo'); if(u) u.disabled = !canUndo(); if(r) r.disabled = !canRedo(); }
setUndoRedoUIUpdater(updateUndoRedoButtons);

function wire(){
  console.log('wire: attaching UI handlers');
  els.addHeader()?.addEventListener('click', ()=>{ console.log('clicked add-header'); addSection('header'); });
  els.addExperience()?.addEventListener('click', ()=>{ console.log('clicked add-experience'); addSection('experience'); });
  els.addSkills()?.addEventListener('click', ()=>{ console.log('clicked add-skills'); addSection('skills'); });
  els.addEducation()?.addEventListener('click', ()=>{ console.log('clicked add-education'); addSection('education'); });
  els.addHobbies()?.addEventListener('click', ()=>{ console.log('clicked add-hobbies'); addSection('hobbies'); });
  document.getElementById('add-page')?.addEventListener('click', ()=>{ addPage(); renderForms(); renderPreview(); });
  document.getElementById('export-json')?.addEventListener('click', exportJSON);
  document.getElementById('import-json')?.addEventListener('click', ()=> els.fileInput().click());
  document.getElementById('export-pdf')?.addEventListener('click', exportPDF);
  document.getElementById('file-input')?.addEventListener('change', e=>{ const f = e.target.files[0]; if(f) importJSONFromFile(f); e.target.value=''; });
  document.getElementById('print')?.addEventListener('click', ()=>{ renderPreview(); announce('Preparing pages for print'); setTimeout(()=> window.print(), 120); });
  document.getElementById('remove-page-global')?.addEventListener('click', ()=>{ removePage(state.pages.length-1); });
  document.getElementById('undo')?.addEventListener('click', ()=>{ undo(); renderForms(); renderPreview(); updateUndoRedoButtons(); });
  document.getElementById('redo')?.addEventListener('click', ()=>{ redo(); renderForms(); renderPreview(); updateUndoRedoButtons(); });
}

// init app
window.addEventListener('DOMContentLoaded', ()=>{
  try{
    console.log('app init');
    wire(); renderForms(); renderPreview(); attachDragHandlers(); updatePreviewScale(); initZoomUI(val=>{ if(!state.settings) state.settings = {}; state.settings.zoom = Number(val)/100; save(); updatePreviewScale(); }, state);
    window.addEventListener('resize', ()=> setTimeout(()=> updatePreviewScale(), 120));
    announce('App ready');
  }catch(err){ console.error('Initialization error', err); announce('Initialization failed') }
});
