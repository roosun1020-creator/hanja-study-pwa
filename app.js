// PWA starter: 150-character flashcards with automatic IndexedDB storage.
'use strict';
const byId = (id) => document.getElementById(id);
const GRADE = ['8급','7급Ⅱ','7급'];
const SCOPE_LIST = [
  { id:'eight', title:'🏅 8급 · 50자' },
  { id:'seven1', title:'🌿 7급Ⅰ · 50자' },
  { id:'seven2', title:'🌱 7급Ⅱ · 50자' },
  { id:'new100', title:'⭐ 신규 7급 · 100자' },
  { id:'all150', title:'🏰 7급 전체 · 150자' },
];
const DB_NAME='hanja-pwa-db';
const STORAGE_KEY='hanja-pwa-state';
let records=[];
let state=null;
let busy=false;
let dbPromise=null;
function openDB(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv')};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
async function loadSaved(){const db=await openDB();return new Promise((resolve,reject)=>{
  const t=db.transaction('kv','readonly'); const req=t.objectStore('kv').get(STORAGE_KEY);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
});}
async function persist(){const db=await openDB();return new Promise((resolve,reject)=>{
  const t=db.transaction('kv','readwrite');t.objectStore('kv').put(state,STORAGE_KEY);
  t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
});}
function pool(scope){return records.filter(row => scope==='eight'?row.grade==='8급':scope==='seven1'?row.grade==='7급':scope==='seven2'?row.grade==='7급Ⅱ':scope==='new100'?row.grade!=='8급':true).map(x=>x.char);}
function shuffle(arr){const x=arr.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function newDeck(scope,round=1){return {scope,deck:shuffle(pool(scope)),idx:0,revealed:false,round,seen:state?.seen||[],savedAt:null};}
function verifyState(st){
  if(!st||!SCOPE_LIST.some(x=>x.id===st.scope)||!Array.isArray(st.deck)||!Array.isArray(st.seen)||!Number.isInteger(st.idx))return false;
  const correct=new Set(pool(st.scope));return st.deck.length===correct.size&&new Set(st.deck).size===correct.size&&st.deck.every(c=>correct.has(c))&&st.idx>=0&&st.idx<st.deck.length&&typeof st.revealed==='boolean';
}
const rowFor = ch => records.find(x=>x.char===ch);
function showStatus(message){byId('save-status').textContent=message;}
function render(){
  byId('scope-list').replaceChildren(...SCOPE_LIST.map(sc=>{
    const b=document.createElement('button');b.type='button';b.textContent=sc.title;b.className=sc.id===state.scope?'active':''; b.setAttribute('aria-pressed',String(sc.id===state.scope));
    b.onclick=()=>act(()=>{if(state.scope!==sc.id)state=newDeck(sc.id)});return b;
  }));
  const total=state.deck.length;
  const row=rowFor(state.deck[state.idx]);
  byId('card-counter').textContent=`${state.idx+1} / ${total}`;
  byId('meter-fill').style.width=`${((state.idx+(state.revealed?1:0))/total*100).toFixed(1)}%`;
  byId('seen-count').textContent=`확인한 한자 ${new Set(state.seen).size}/150`;
  byId('card-hanja').textContent=row.char;
  byId('card-answer').textContent=`${row.meaning} ${row.reading}`;
  byId('card-answer').hidden=!state.revealed;
  byId('tap-hint').textContent=state.revealed?'다시 누르면 한자로 돌아가요':'터치해서 정답 보기';
  byId('card-instruction').textContent=state.revealed?'✨ 정답을 확인했어요! 다음 한자를 만나 보세요.':'👆 카드를 눌러 뜻과 음을 확인해 보세요.';
  byId('next-card').disabled=!state.revealed||busy;
  byId('next-card').textContent=state.idx===total-1?'🎉 모두 봤어요! 다시 섞기':'다음 한자 →';
  byId('flashcard').disabled=busy;
}
async function act(callback){if(busy)return;busy=true;try{callback();state.savedAt=new Date().toISOString();await persist();showStatus('✓ 자동 저장됨');}catch(e){console.error(e);alert('기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');showStatus('⚠ 저장 오류');}finally{busy=false;render();}}
byId('flashcard').addEventListener('click',()=>act(()=>{
  state.revealed=!state.revealed;
  if(state.revealed&&!state.seen.includes(state.deck[state.idx]))state.seen.push(state.deck[state.idx]);
}));
byId('next-card').addEventListener('click',()=>act(()=>{
  if(!state.revealed)return;
  if(state.idx===state.deck.length-1)state=newDeck(state.scope,state.round+1);
  else {state.idx++;state.revealed=false;}
}));
byId('reshuffle').addEventListener('click',()=>act(()=>{state=newDeck(state.scope,state.round+1)}));
byId('export-json').addEventListener('click',()=>{
  if(!state)return;const doc={kind:'hanja-pwa-backup',format:1,exportedAt:new Date().toISOString(),state};
  const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`hanja_pwa_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
byId('import-json').addEventListener('click',()=>byId('import-file').click());
byId('import-file').addEventListener('change',async(event)=>{
  const file=event.target.files?.[0];if(!file)return;
  try{const doc=JSON.parse(await file.text());
    if(doc.kind!=='hanja-pwa-backup'||doc.format!==1||!verifyState(doc.state))throw new Error('이 PWA에서 만든 백업 파일이 아닙니다.');
    const allowed=new Set(records.map(x=>x.char));
    if(!doc.state.seen.every(x=>allowed.has(x)))throw new Error('한자 기록을 확인할 수 없습니다.');
    if(!confirm('현재 PWA 기록을 선택한 백업 기록으로 교체할까요?'))return;
    await act(()=>{state=doc.state;});
    alert('PWA 백업을 복원했습니다.');
  }catch(e){alert('백업 복원 실패: '+e.message);}finally{event.target.value='';}
});
async function boot(){try{
  const res=await fetch('./data/hanja.json');if(!res.ok)throw new Error('한자 데이터 로딩 실패');
  records=await res.json();if(records.length!==150||new Set(records.map(x=>x.char)).size!==150)throw new Error('한자 데이터 150자 확인 실패');
  const saved=await loadSaved();state=verifyState(saved)?saved:newDeck('eight');
  if(!saved||!verifyState(saved)){state.savedAt=new Date().toISOString();await persist();}
  render();showStatus('✓ 자동 저장 준비됨');
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('Service worker registration failed',err));
}catch(e){console.error(e);showStatus('⚠ 시작 오류');byId('card-instruction').textContent=e.message;}}
boot();
