/* 한자 탐험대 PWA v2.0.2 · writing module
 * Offline freehand mode always works for all 150 characters.
 * If bundled HanziWriter + data are installed, true stroke animation and
 * stroke-order quiz also work offline. Fallback online CDN is optional.
 * HanziWriter uses Chinese-source stroke order; Korean verification incomplete.
 */
'use strict';
const WRITING_GRADES=[['7급Ⅱ','🌱 7급Ⅱ'],['7급','🌿 7급Ⅰ'],['8급','🏅 8급']];
let writingRuntime=null, writingMountSerial=0, hanziLoadPromise=null;
function writingPool(){
  const u=state.ui;
  if(u.writingMode==='learned')return records.filter(r=>state.progress.learned.includes(r.char));
  if(u.writingMode==='all')return records;
  return records.filter(r=>r.grade===u.writingGrade).slice((u.writingUnit-1)*5,u.writingUnit*5);
}
function writingSelectedChar(){
  const chars=writingPool().map(x=>x.char);
  return chars.includes(state.ui.writingChar)?state.ui.writingChar:(chars[0]||null);
}
function renderWriting(){
  const u=state.ui,p=state.progress.writing||{practiced:[],attempts:{}};
  const views=`<div class="pills">${pickButton('write-mode','unit','📖 단원별 쓰기',u.writingMode==='unit')}${pickButton('write-mode','learned','⭐ 배운 한자',u.writingMode==='learned')}${pickButton('write-mode','all','🗺️ 전체 150자',u.writingMode==='all')}</div>`;
  const gradeBtns=WRITING_GRADES.map(([v,l])=>pickButton('write-grade',v,l,u.writingGrade===v)).join('');
  const grade=`<div class="small-label">연습할 급수를 골라요</div><div class="pills write-grade-grid">${gradeBtns}</div>`;
  const units=Array.from({length:10},(_,i)=>pickButton('write-unit',String(i+1),`${i+1}단원`,u.writingUnit===i+1)).join('');
  const unitPart=u.writingMode==='unit'?grade+`<div class="small-label">단원을 골라요</div><div class="unit-grid">${units}</div>`:'';
  const chars=writingPool();
  const total=chars.length,pageSize=u.writingMode==='unit'?5:15;
  const maxPage=Math.max(0,Math.ceil(total/pageSize)-1),page=Math.min(maxPage,u.writingPage||0);
  const sliced=chars.slice(page*pageSize,(page+1)*pageSize);
  const current=writingSelectedChar();
  const charCards=sliced.map(r=>pickButton('write-char',r.char,htmlEscape(r.char),current===r.char)).join('');
  const paging=(u.writingMode==='unit'||total<=pageSize)?'':`<div class="actions equal"><button class="secondary" data-action="write-page-prev" ${page===0?'disabled':''}>← 앞 카드</button><button class="secondary" data-action="write-page-next" ${page===maxPage?'disabled':''}>다음 카드 →</button></div><p class="note" style="text-align:center">${page+1}/${maxPage+1}쪽</p>`;
  const chooser=panel('✍️ 마법 한자 쓰기',`<p class="lead">글자를 골라 쓰면서 손끝으로 익혀요. 비행기 모드에서는 자유쓰기를 이용할 수 있습니다.</p>${views}${unitPart}
    <div class="small-label">한자를 하나 골라 보세요</div>${total?`<div class="write-char-grid">${charCards}</div>${paging}`:`<div class="empty">아직 배운 한자가 없어요. 📖 배우기에서 먼저 공부해 보세요.</div>`}`);
  if(!current)return chooser;
  const r=record(current),n=p.attempts?.[current]||0;
  return chooser+panel(`🌟 ${htmlEscape(current)} · ${htmlEscape(fullLabel(r))}`,`
    <div class="write-panel">
      <p class="lead">${htmlEscape(r.grade)} · 연습 ${n}회 · 스스로 쓰고 획순도 확인해 보세요.</p>
      <div id="writing-board" class="stroke-board" role="group" aria-label="한자 ${htmlEscape(current)} 쓰기 영역">
        <span class="stroke-font-guide" id="stroke-guide">${htmlEscape(current)}</span>
        <div id="stroke-target"></div>
        <canvas id="stroke-canvas" aria-label="손가락으로 직접 글자를 쓰는 공간"></canvas>
        <svg id="stroke-numbers" viewBox="0 0 360 360" aria-hidden="true"></svg>
      </div>
      <div class="stroke-options"><button data-action="write-tool-guide" class="active" id="write-guide-btn">🧩 밑그림 켜짐</button><button data-action="write-tool-numbers" id="write-numbers-btn">🔢 획 번호</button></div>
      <div class="stroke-toolbar">
        <button data-action="write-tool-animate" id="write-animate" aria-pressed="false">▶ 획순 보기</button>
        <button data-action="write-tool-quiz" id="write-quiz" aria-pressed="false">✏️ 순서대로 쓰기</button>
        <button data-action="write-tool-freehand" id="write-freehand" class="active" aria-pressed="true">🖍️ 자유쓰기</button>
        <button data-action="write-tool-clear" id="write-clear">🔄 다시 쓰기</button>
      </div>
      <div id="stroke-status" class="stroke-status" role="status">한자 쓰기판을 준비하고 있어요…</div>
      <button class="button primary full" data-action="write-complete" style="margin-top:12px">✅ 연습 완료 기록하기</button>
      <p class="note">※ 획순 애니메이션과 자동 판정은 HanziWriter의 중국식 자료를 사용하며, 한국식 획순과의 전체 대조는 아직 완료되지 않았습니다. 자유쓰기는 오프라인에서도 가능합니다.</p>
    </div>`);
}
function handleWritingAction(action,val){
  const u=state.ui;
  if(action==='write-mode'){u.writingMode=val;u.writingChar=null;u.writingPage=0;}
  else if(action==='write-grade'){u.writingGrade=val;u.writingUnit=1;u.writingChar=null;u.writingPage=0;}
  else if(action==='write-unit'){u.writingUnit=Math.max(1,Math.min(10,Number(val)||1));u.writingChar=null;}
  else if(action==='write-char'){if(writingPool().some(r=>r.char===val))u.writingChar=val;}
  else if(action==='write-page-prev'){u.writingPage=Math.max(0,u.writingPage-1);u.writingChar=null;}
  else if(action==='write-page-next'){u.writingPage=Math.min(9,u.writingPage+1);u.writingChar=null;}
  else if(action==='write-complete'){
    const ch=writingSelectedChar();if(!ch)return;
    if(!state.progress.writing)state.progress.writing={practiced:[],attempts:{}};
    const w=state.progress.writing;if(!w.practiced.includes(ch))w.practiced.push(ch);
    w.attempts[ch]=(w.attempts[ch]||0)+1;activity();
  }else throw new Error('Unknown writing action '+action);
}
function writingStatus(t){const el=$('stroke-status');if(el)el.textContent=t;}
function loadHanziWriter(){
  if(window.HanziWriter)return Promise.resolve(true);
  if(hanziLoadPromise)return hanziLoadPromise;
  hanziLoadPromise=new Promise(resolve=>{
    const script=document.createElement('script');
    script.src='./vendor/hanzi-writer.min.js';
    script.onload=()=>resolve(!!window.HanziWriter);
    script.onerror=()=>{
      if(!navigator.onLine){resolve(false);return;}
      const cdn=document.createElement('script');
      cdn.src='https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
      cdn.onload=()=>resolve(!!window.HanziWriter);cdn.onerror=()=>resolve(false);
      document.head.appendChild(cdn);
    };
    document.head.appendChild(script);
  });return hanziLoadPromise;
}
function initializeFreehand(board,char){
  const canvas=$('stroke-canvas'),guide=$('stroke-guide');
  if(!canvas||!board)return;
  let showGuide=true,drawing=false,hasInk=false;
  const ctx=canvas.getContext('2d');
  function size(){const n=board.clientWidth,ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(n*ratio);canvas.height=Math.round(n*ratio);ctx.scale(ratio,ratio);ctx.strokeStyle='#6943ad';ctx.lineWidth=Math.max(7,n*.026);ctx.lineCap='round';ctx.lineJoin='round';}
  size();
  function pos(ev){const r=canvas.getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top};}
  canvas.onpointerdown=ev=>{drawing=true;hasInk=true;canvas.setPointerCapture(ev.pointerId);const p=pos(ev);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();ev.preventDefault();};
  canvas.onpointermove=ev=>{if(!drawing)return;const p=pos(ev);ctx.lineTo(p.x,p.y);ctx.stroke();ev.preventDefault();};
  canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
  return {
    type:'freehand',mode:'freehand',showGuide:true,sequence:0,
    toggleGuide(){this.showGuide=!this.showGuide;updateWritingOutline(this);return this.showGuide;},
    clear(){ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false;},
    hasInk:()=>hasInk, char
  };
}
function updateWritingMode(rt, mode){
  if(!rt)return;
  rt.mode=mode;
  for(const [kind,id] of Object.entries({animate:'write-animate',quiz:'write-quiz',freehand:'write-freehand'})){
    const btn=$(id);if(!btn)continue;
    const active=kind===mode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  }
}
function updateWritingOutline(rt){
  // Never overlay two fonts: when HanziWriter is available, its SVG is the only guide.
  const guide=$('stroke-guide');
  const usingVector=!!rt?.vectorReady;
  if(guide)guide.style.display=usingVector?'none':rt?.showGuide===false?'none':'grid';
  if(usingVector&&rt.writer){
    const update=rt.showGuide?rt.writer.showOutline:rt.writer.hideOutline;
    if(typeof update==='function')Promise.resolve(update.call(rt.writer,{duration:0})).catch(()=>{});
  }
}
function positionStrokeNumbers(medians){
  const size=360,scale=HanziWriter.getScalingTransform(size,size,22);
  return medians.map((pts,i)=>{
    if(!pts||!pts.length)return null;
    return {x:Math.max(12,Math.min(348,scale.x+pts[0][0]*scale.scale-10)),y:Math.max(12,Math.min(348,size-scale.y-pts[0][1]*scale.scale+13)),n:i+1};
  }).filter(Boolean);
}
function showStrokeNumbers(positions,limit){
  const svg=$('stroke-numbers');if(!svg)return;
  svg.innerHTML=positions.slice(0,limit).map(p=>`<g><circle cx="${p.x}" cy="${p.y}" r="13" fill="#fff" stroke="#7d55bf" stroke-width="2"/><text x="${p.x}" y="${p.y+5}" fill="#523388" font-size="14" text-anchor="middle" font-weight="bold">${p.n}</text></g>`).join('');
}
async function mountWritingBoard(){
  const board=$('writing-board');if(!board)return;
  const char=writingSelectedChar();if(!char)return;
  const ticket=++writingMountSerial;
  const rt=initializeFreehand(board,char);writingRuntime=rt;
  writingStatus('🖍️ 자유쓰기를 할 수 있어요. 획순 데이터를 확인 중…');
  const available=await loadHanziWriter();
  if(ticket!==writingMountSerial||state.ui.page!=='writing'||writingSelectedChar()!==char)return;
  if(!available){updateWritingOutline(rt);writingStatus('🖍️ 오프라인 자유쓰기 준비 완료! 획순 기능은 추가 자료가 필요해요.');return;}
  // First use local data for offline; online fallback only if local file is missing.
  const strokeDataLoader=(ch,onComplete,onError)=>{
    fetch('./strokes/'+encodeURIComponent(ch)+'.json').then(x=>{if(!x.ok)throw Error('not bundled');return x.json();})
      .catch(()=>{if(!navigator.onLine)throw Error('오프라인 획순 파일 없음');return fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/'+encodeURIComponent(ch)+'.json').then(x=>{if(!x.ok)throw Error('획순 데이터를 찾을 수 없음');return x.json();});})
      .then(onComplete).catch(onError);
  };
  let strokeMedians=[];
  const dim=Math.round(board.clientWidth)-8;
  const writer=HanziWriter.create('stroke-target',char,{width:dim,height:dim,padding:18,showCharacter:false,showOutline:true,strokeAnimationSpeed:.55,delayBetweenStrokes:360,drawingWidth:36,
    charDataLoader:strokeDataLoader,
    onLoadCharDataSuccess(data){strokeMedians=data.medians||[]; if(ticket===writingMountSerial&&writingRuntime===rt){rt.positions=positionStrokeNumbers(strokeMedians);rt.vectorReady=true;updateWritingOutline(rt);$('stroke-canvas').style.pointerEvents=rt.mode==='freehand'?'auto':'none';writingStatus('✅ 획순 자료 준비 완료! 밑그림은 획순 원본과 동일한 모양으로 표시돼요.');}},
    onLoadCharDataError(){if(ticket===writingMountSerial&&writingRuntime===rt){rt.vectorReady=false;updateWritingOutline(rt);writingStatus('🖍️ 이 한자는 획순 자료가 없어 자유쓰기로 연습할 수 있어요.');}}
  });
  rt.writer=writer;
  rt.showNumbers=false;
  updateWritingOutline(rt);
}
async function onWritingToolClick(action){
  const rt=writingRuntime;
  if(!rt||rt.char!==writingSelectedChar())return;
  if(action==='write-tool-guide'){
    const visible=rt.toggleGuide();
    $('write-guide-btn')?.classList.toggle('active',visible);
    const b=$('write-guide-btn');if(b)b.textContent=visible?'🧩 밑그림 켜짐':'🧩 밑그림 꺼짐';
    return;
  }
  if(action==='write-tool-numbers'){
    rt.showNumbers=!rt.showNumbers;
    showStrokeNumbers(rt.showNumbers?(rt.positions||[]):[],rt.positions?.length||0);
    $('write-numbers-btn')?.classList.toggle('active',rt.showNumbers);
    return;
  }
  if(action==='write-tool-clear'){
    ++rt.sequence;
    rt.clear();
    if(rt.writer){rt.writer.cancelQuiz();await rt.writer.hideCharacter({duration:0});}
    showStrokeNumbers(rt.showNumbers?(rt.positions||[]):[],rt.positions?.length||0);
    writingStatus('다시 연습해 보세요!');return;
  }
  if(action==='write-tool-freehand'){
    ++rt.sequence;
    updateWritingMode(rt,'freehand');
    if(rt.writer){rt.writer.cancelQuiz();await rt.writer.hideCharacter({duration:0});}
    const canvas=$('stroke-canvas');if(canvas)canvas.style.pointerEvents='auto';
    writingStatus('🖍️ 자유쓰기 모드! 손가락으로 따라 써 보세요.');return;
  }
  if(!rt.writer||!rt.vectorReady){
    writingStatus('이 한자의 획순 자료가 아직 없습니다. 자유쓰기를 이용해 주세요.');return;
  }
  if(action==='write-tool-quiz'){
    ++rt.sequence;
    updateWritingMode(rt,'quiz');
    rt.clear();
    const canvas=$('stroke-canvas');if(canvas)canvas.style.pointerEvents='none';
    rt.writer.cancelQuiz();
    await rt.writer.hideCharacter({duration:0});
    writingStatus('✏️ 순서대로 쓰기 모드! 획을 순서대로 그려 보세요.');
    rt.writer.quiz({onComplete:()=>{if(writingRuntime===rt&&rt.mode==='quiz')writingStatus('🎉 획순 쓰기 성공! 아래 연습 완료 버튼도 눌러 기록하세요.');}});
    return;
  }
  if(action==='write-tool-animate'){
    const serial=++rt.sequence;
    updateWritingMode(rt,'animate');
    const canvas=$('stroke-canvas');if(canvas)canvas.style.pointerEvents='none';
    rt.clear();rt.writer.cancelQuiz();
    rt.showNumbers=true;
    $('write-numbers-btn')?.classList.add('active');
    showStrokeNumbers([],0);
    writingStatus('▶ 획순 재생 중… 번호를 보면서 따라가 보세요!');
    try{
      await rt.writer.hideCharacter({duration:0});
      if(serial!==rt.sequence||writingRuntime!==rt)return;
      if(rt.positions?.length){
        for(let i=0;i<rt.positions.length;i++){
          if(serial!==rt.sequence||writingRuntime!==rt)return;
          showStrokeNumbers(rt.positions,i+1);
          await rt.writer.animateStroke(i);
        }
      }else await rt.writer.animateCharacter();
      if(serial===rt.sequence&&writingRuntime===rt)writingStatus('✨ 획순과 번호를 확인했어요. 이제 직접 써 보세요!');
    }catch(err){if(serial===rt.sequence&&writingRuntime===rt)writingStatus('획순 재생을 다시 시도해 주세요.');}
  }
}
