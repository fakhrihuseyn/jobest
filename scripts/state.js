export const STORAGE_KEY = 'jobest:state:v1';

export function id(){ return 'id_'+Math.random().toString(36).slice(2,11); }

function defaultState(){
  return {
    pages: [ { sections: [ { id: id(), type: 'header', data: { name: 'Your Name', title: 'Your Title', email: 'you@example.com', photo: null } } ] } ],
    settings: { zoom: null }
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    return JSON.parse(raw);
  }catch(err){ return defaultState(); }
}

export let state = loadState();

export function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('Save failed', e) } }

export function setState(newState){ state = newState; save(); }

/* History */
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];

export function pushHistory(){ try{ undoStack.push(JSON.stringify(state)); if(undoStack.length>MAX_HISTORY) undoStack.shift(); redoStack = []; updateUndoRedoButtons && updateUndoRedoButtons(); }catch(e){} }

export function setHistoryHandlers(h){
  // allow app to set update buttons callback
  updateUndoRedoButtons = h;
}

export function undo(){ if(!undoStack.length) return; try{ redoStack.push(JSON.stringify(state)); state = JSON.parse(undoStack.pop()); save(); return true; }catch(e){ console.error(e); return false } }

export function redo(){ if(!redoStack.length) return; try{ undoStack.push(JSON.stringify(state)); state = JSON.parse(redoStack.pop()); save(); return true; }catch(e){ console.error(e); return false } }

export function canUndo(){ return undoStack.length>0 }
export function canRedo(){ return redoStack.length>0 }

let updateUndoRedoButtons = null;

export function setUndoRedoUIUpdater(fn){ updateUndoRedoButtons = fn; }

export function announce(msg){ const el = document.getElementById('announcer'); if(el) el.textContent = msg; else console.log(msg); }
