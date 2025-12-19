import { state, save } from './state.js';
import { renderPreview, updatePreviewScale } from './preview.js';
import { announce } from './state.js';

export function exportJSON(){ const data = JSON.stringify(state, null, 2); const blob = new Blob([data], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'resume.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

export async function exportPDF(){
  // ensure pages are balanced and rendered before export
  renderPreview();
  announce('Opening print dialog — use Save as PDF to export');
  const inner = document.getElementById('preview-inner'); if(!inner){ alert('Nothing to print'); return }
  const prevTransform = inner.style.transform; inner.style.transform = 'scale(1)'; await new Promise(r=>setTimeout(r,60)); window.print(); inner.style.transform = prevTransform; updatePreviewScale();
}

import { setState } from './state.js';
export function importJSONFromFile(file){ const reader = new FileReader(); reader.onload = e=>{ try{ setState(JSON.parse(e.target.result)); renderPreview(); }catch(err){ alert('Invalid JSON file') } }; reader.readAsText(file); }
