/* 한자 탐험대 PWA v2.0.2
 * Streamlit v1.2.3.8의 150자, 배우기(+2), 퀴즈(+10), 1·3·7일 복습 규칙을 포팅.
 * v2.0.0 IndexedDB 키와 기존 플래시카드 진행 상태를 그대로 사용합니다.
 * 온라인 서버 API, 외부 JS 라이브러리 및 개인정보 전송 없음.
 */
'use strict';
const $=id=>document.getElementById(id);
const DB_NAME='hanja-pwa-db', STORAGE_KEY='hanja-pwa-state';
const SCOPE_LIST=[
  {id:'eight',title:'🏅 8급 · 50자'},
  {id:'seven1',title:'🌿 7급Ⅰ · 50자'},
  {id:'seven2',title:'🌱 7급Ⅱ · 50자'},
  {id:'new100',title:'⭐ 신규 7급 · 100자'},
  {id:'all150',title:'🏰 7급 전체 · 150자'}
];
const QUIZ_SCOPE_LIST=[
  ...SCOPE_LIST.map(s=>({id:s.id,title:s.title})),
  {id:'learned',title:'📚 내가 배운 한자'}
];
const ALT={'金':'성 김','車':'수레 차','洞':'밝을 통','便':'똥오줌 변','食':'먹을 식','韓':'나라 한','漢':'한수 한'};
const PAGES=['home','learn','quiz','review','writing','dragons','cards','records'];
const PAGE_LABELS={home:'홈',learn:'배우기',quiz:'퀴즈',review:'복습',writing:'쓰기',dragons:'드래곤',cards:'한자 카드',records:'기록'};
const htmlEscape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let records=[],recordByChar=new Map(),state=null,dbPromise=null,busy=false;
function todayKST(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function plusDays(day,amount){let date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
function dateIsValid(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));}
function shuffle(a){const arr=a.slice();for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function pool(scope){return records.filter(r=>scope==='eight'?r.grade==='8급':scope==='seven1'?r.grade==='7급':scope==='seven2'?r.grade==='7급Ⅱ':scope==='new100'?r.grade!=='8급':true).map(r=>r.char);}
function quizPool(scope){return scope==='learned'?(state?.progress?.learned||[]).filter(c=>recordByChar.has(c)):pool(scope);}
const record=ch=>recordByChar.get(ch);
const fullLabel=row=>row.meaning+' '+row.reading;
function newDeck(scope,round=1){return {scope,deck:shuffle(pool(scope)),idx:0,revealed:false,round,seen:state?.seen||[]};}
function freshProgress(){return {learned:[],cards:{},xp:0,active_days:[],game:{starter:null,active:null,owned:[],xp:0,won_battles:[]},writing:{practiced:[],attempts:{}}};}
function defaultUI(){return {page:'home',learnSection:'new',learnUnitNew:1,learnGroupNew:0,learnUnitOld:1,learnGroupOld:0,learnIndex:0,quizScope:'all150',quiz:null,writingMode:'unit',writingGrade:'7급Ⅱ',writingUnit:1,writingPage:0,writingChar:null,dragonMode:'basic',dragonUnit:1,dragonScope:'8급 복습',battle:null,resetStep:false};}
function stateDeckOK(s){
  if(!s||!SCOPE_LIST.some(o=>o.id===s.scope)||!Array.isArray(s.deck)||!Array.isArray(s.seen)||!Number.isInteger(s.idx))return false;
  const allowed=new Set(pool(s.scope)),all=new Set(records.map(x=>x.char));
  return s.deck.length===allowed.size&&new Set(s.deck).size===allowed.size&&s.deck.every(ch=>allowed.has(ch))&&s.seen.every(ch=>all.has(ch))&&s.idx>=0&&s.idx<s.deck.length&&typeof s.revealed==='boolean';
}
function normalizeProgress(raw){
  const p=freshProgress();if(!raw||typeof raw!=='object'||Array.isArray(raw))return p;
  const valid=new Set(records.map(x=>x.char));
  if(Array.isArray(raw.learned))p.learned=[...new Set(raw.learned.filter(x=>typeof x==='string'&&valid.has(x)))];
  if(Number.isFinite(raw.xp))p.xp=Math.max(0,Math.floor(raw.xp));
  if(Array.isArray(raw.active_days))p.active_days=[...new Set(raw.active_days.filter(dateIsValid))].sort();
  if(raw.cards&&typeof raw.cards==='object'&&!Array.isArray(raw.cards)){
    for(const [ch,x] of Object.entries(raw.cards)){
      if(!valid.has(ch)||!x||typeof x!=='object'||Array.isArray(x))continue;
      const attempts=Math.max(0,Math.min(1000000,Math.floor(Number(x.attempts)||0)));
      const correct=Math.max(0,Math.min(attempts,Math.floor(Number(x.correct)||0)));
      const streak=Math.max(0,Math.min(correct,Math.floor(Number(x.streak)||0)));
      const correct_dates=Array.isArray(x.correct_dates)?[...new Set(x.correct_dates.filter(dateIsValid))].sort():[];
      p.cards[ch]={attempts,correct,streak,correct_dates,due:dateIsValid(x.due)?x.due:todayKST()};
    }
  }
  // Keep old dragon progress for later PWA dragon port; never execute or render its values.
  if(raw.game&&typeof raw.game==='object'&&!Array.isArray(raw.game)){
    const g=raw.game,allow=new Set(['fire','water','forest']);
    p.game={starter:allow.has(g.starter)?g.starter:null,active:allow.has(g.active)?g.active:null,
      owned:Array.isArray(g.owned)?[...new Set(g.owned.filter(x=>allow.has(x)))]:[],
      xp:Number.isFinite(g.xp)?Math.max(0,Math.floor(g.xp)):0,
      won_battles:Array.isArray(g.won_battles)?g.won_battles.filter(x=>typeof x==='string').slice(0,200):[]};
  }
  if(raw.writing&&typeof raw.writing==='object'&&!Array.isArray(raw.writing)){
    p.writing.practiced=Array.isArray(raw.writing.practiced)?[...new Set(raw.writing.practiced.filter(ch=>valid.has(ch)))]:[];
    if(raw.writing.attempts&&typeof raw.writing.attempts==='object'){
      for(const [ch,n] of Object.entries(raw.writing.attempts))if(valid.has(ch)&&Number.isFinite(Number(n)))p.writing.attempts[ch]=Math.min(10000,Math.max(0,Math.floor(Number(n))));
    }
  }
  return p;
}
function normalizeUI(raw,fromV200=false){
  const ui=defaultUI();if(fromV200)ui.page='cards';
  if(!raw||typeof raw!=='object')return ui;
  if(PAGES.includes(raw.page))ui.page=raw.page;
  if(['new','old'].includes(raw.learnSection))ui.learnSection=raw.learnSection;
  for(const [k,lo,hi] of [['learnUnitNew',1,20],['learnUnitOld',1,10],['learnGroupNew',0,3],['learnGroupOld',0,1],['learnIndex',0,4]]){
    if(Number.isInteger(raw[k])&&raw[k]>=lo&&raw[k]<=hi)ui[k]=raw[k];
  }
  if(QUIZ_SCOPE_LIST.some(x=>x.id===raw.quizScope))ui.quizScope=raw.quizScope;
  if(['unit','learned','all'].includes(raw.writingMode))ui.writingMode=raw.writingMode;
  if(['8급','7급Ⅱ','7급'].includes(raw.writingGrade))ui.writingGrade=raw.writingGrade;
  if(Number.isInteger(raw.writingUnit)&&raw.writingUnit>=1&&raw.writingUnit<=10)ui.writingUnit=raw.writingUnit;
  if(Number.isInteger(raw.writingPage)&&raw.writingPage>=0&&raw.writingPage<=20)ui.writingPage=raw.writingPage;
  if(typeof raw.writingChar==='string'&&recordByChar.has(raw.writingChar))ui.writingChar=raw.writingChar;
  if(['basic','unit'].includes(raw.dragonMode))ui.dragonMode=raw.dragonMode;
  if(Number.isInteger(raw.dragonUnit)&&raw.dragonUnit>=1&&raw.dragonUnit<=20)ui.dragonUnit=raw.dragonUnit;
  if(typeof raw.dragonScope==='string'&&['8급 복습','학습 완료 한자',...Array.from({length:20},(_,i)=>`신규 ${i+1}단원`)].includes(raw.dragonScope))ui.dragonScope=raw.dragonScope;
  if(typeof normalizeBattle==='function')ui.battle=normalizeBattle(raw.battle);
  if(raw.quiz&&typeof raw.quiz==='object'&&Array.isArray(raw.quiz.questions)&&raw.quiz.questions.length<=10&&
      raw.quiz.questions.length>0&&Number.isInteger(raw.quiz.idx)&&raw.quiz.idx>=0&&raw.quiz.idx<=raw.quiz.questions.length&&
      raw.quiz.questions.every(q=>q&&recordByChar.has(q.char)&&typeof q.prompt==='string'&&
          typeof q.answer==='string'&&Array.isArray(q.choices)&&q.choices.length===4&&q.choices.includes(q.answer))){
    ui.quiz=raw.quiz;
  }
  return ui;
}
function upgrade(saved){
  if(!stateDeckOK(saved)){state=null;return {...newDeck('eight'),progress:freshProgress(),ui:defaultUI()};}
  const legacy=!saved.progress;
  return {...saved,progress:normalizeProgress(saved.progress),ui:normalizeUI(saved.ui,legacy)};
}
function openDB(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });return dbPromise;
}
async function loadSaved(){const db=await openDB();return new Promise((resolve,reject)=>{
  const q=db.transaction('kv','readonly').objectStore('kv').get(STORAGE_KEY);
  q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);
});}
async function persist(){const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(state,STORAGE_KEY);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
});}
async function change(fn,{top=false}={}){
  if(busy||!state)return;busy=true;const backup=JSON.parse(JSON.stringify(state));
  try{fn();state.savedAt=new Date().toISOString();await persist();$('save-status').textContent='✓ 자동 저장됨';}
  catch(err){state=backup;console.error('save failed',err);$('save-status').textContent='⚠ 저장 실패';alert('기록을 저장하지 못했습니다. 기기의 저장 공간과 설정을 확인해 주세요.');}
  finally{busy=false;render();if(top)window.scrollTo({top:0,behavior:'instant'});}
}
function activity(){const date=todayKST();if(!state.progress.active_days.includes(date))state.progress.active_days.push(date);}
function markLearned(ch){if(!state.progress.learned.includes(ch)){state.progress.learned.push(ch);state.progress.xp+=2;activity();}}
function mastered(ch){const r=state.progress.cards[ch];return !!r&&r.streak>=3&&new Set(r.correct_dates||[]).size>=2;}
function dueCharacters(){const date=todayKST();return Object.entries(state.progress.cards).filter(([ch,r])=>recordByChar.has(ch)&&r.attempts>0&&(r.due||'9999-12-31')<=date).map(([ch])=>ch);}
function studyStreak(){const days=new Set(state.progress.active_days);let date=todayKST();if(!days.has(date))date=plusDays(date,-1);let n=0;while(days.has(date)){n++;date=plusDays(date,-1);}return n;}
function registerAnswer(ch,correct){
  const p=state.progress,date=todayKST();let r=p.cards[ch];
  if(!r)r=p.cards[ch]={attempts:0,correct:0,streak:0,correct_dates:[],due:date};
  r.attempts++;activity();
  if(correct){r.correct++;r.streak++;if(!r.correct_dates.includes(date))r.correct_dates.push(date);
    const interval=r.streak===1?1:r.streak===2?3:7;
    r.due=plusDays(date,interval);p.xp+=10;
  }else{r.streak=0;r.due=date;}
}
function stat(icon,value,label){return `<div class="stat"><span class="stat-icon">${icon}</span><strong class="stat-num">${htmlEscape(value)}</strong><span class="stat-label">${htmlEscape(label)}</span></div>`;}
function notice(text,kind=''){return `<div class="notice ${kind}">${htmlEscape(text)}</div>`;}
function panel(title,body,cls=''){return `<section class="panel ${cls}"><h2>${title}</h2>${body}</section>`;}
function progressBar(done,total){return `<div class="meter" aria-label="진행률 ${done}/${total}"><span style="width:${Math.min(100,Math.round(done/total*100))}%"></span></div>`;}
function pickButton(action,id,title,active=false,disabled=false,other=''){
  return `<button type="button" data-action="${action}" data-value="${htmlEscape(id)}" class="${active?'active':''}" aria-pressed="${active}" ${disabled?'disabled':''} ${other}>${title}${active?' ✓':''}</button>`;
}
function renderHome(){
  const learnedNew=state.progress.learned.filter(ch=>record(ch)?.grade!=='8급').length;
  const masteredNew=records.filter(r=>r.grade!=='8급'&&mastered(r.char)).length;
  const due=dueCharacters();const next=Array.from({length:20},(_,i)=>i+1).find(unit=>newUnitChars(unit).some(ch=>!state.progress.learned.includes(ch)));
  let mission=next?`<div class="progress-banner">✨ 오늘의 추천 모험 · ${next}단원</div>
     <div class="reading" style="font-family:serif">${newUnitChars(next).join('　')}</div>
     <button class="button primary full big" data-action="go-lesson" data-value="${next}">📖 ${next}단원 배우러 가기</button>`:
     notice('🎉 새 한자 100자를 모두 배웠어요! 이제 복습을 해보세요.','good');
  return panel('🏰 오늘의 한자 모험',`<div class="intro-row"><div class="copy"><p class="lead">다섯 글자씩 공부하며 한자 실력을 키워요!</p><strong>매일 조금씩, 꾸준히!</strong></div><img src="./assets/fire.webp" alt="화루 드래곤"></div>
    <div class="stats-grid">${stat('📖',learnedNew+'/100','배운 새 한자')}${stat('🏆',masteredNew+'/100','완전히 익힌 한자')}${stat('⭐',Math.floor(state.progress.xp/50)+'개','모은 별')}${stat('🔥',studyStreak()+'일','연속 공부')}</div>
    ${progressBar(learnedNew,100)}<p class="note">7급 새 한자 100자 기준이며, 8급 50자는 별도로 복습할 수 있어요.</p>
    ${due.length?notice('🔔 오늘 복습을 기다리는 한자가 '+due.length+'자 있어요!'):notice('🌈 오늘도 새로운 한자 친구들을 만나 볼까요?')}
    ${due.length?'<button class="button full" data-page="review">🧠 오늘의 복습 시작</button>':''}`, 'hero-panel')+
    panel('🌟 오늘의 추천 단원',mission)+
    panel('🐉 드래곤과 함께하는 모험',`<p class="lead">한자 쓰기 연습으로 손끝을 단련하고, 드래곤과 함께 한자 배틀에 도전해 보세요!</p>
      <div class="actions equal"><button class="primary" data-page="writing">✍️ 한자 쓰기</button><button class="primary" data-page="dragons">🐉 드래곤 배틀</button></div>`);
}
function newUnitChars(unit){return records.filter(r=>r.grade!=='8급').slice((unit-1)*5,unit*5).map(r=>r.char);}
function oldUnitChars(unit){return records.filter(r=>r.grade==='8급').slice((unit-1)*5,unit*5).map(r=>r.char);}
function lessonChars(){return state.ui.learnSection==='new'?newUnitChars(state.ui.learnUnitNew):oldUnitChars(state.ui.learnUnitOld);}
function renderLearning(){
  const u=state.ui,isNew=u.learnSection==='new',count=isNew?20:10,group=isNew?u.learnGroupNew:u.learnGroupOld,unit=isNew?u.learnUnitNew:u.learnUnitOld;
  const chars=lessonChars();const r=record(chars[u.learnIndex]);
  const sections=`<div class="pills">${pickButton('learn-section','new','⭐ 신규 7급 100자',isNew)}${pickButton('learn-section','old','🏅 8급 복습 50자',!isNew)}</div>`;
  const groups=Array.from({length:Math.ceil(count/5)},(_,g)=>pickButton('learn-group',String(g),`${g*5+1}~${Math.min(count,g*5+5)}`,g===group)).join('');
  const units=Array.from({length:5},(_,i)=>group*5+i+1).filter(n=>n<=count).map(n=>{
    const complete=(isNew?newUnitChars(n):oldUnitChars(n)).every(ch=>state.progress.learned.includes(ch));
    return pickButton('learn-unit',String(n),(complete?'⭐ ':'')+n+'단원',n===unit);
  }).join('');
  const learned=state.progress.learned.includes(r.char);
  return panel('📖 한자 배우기',`<p class="lead">원하는 단원을 골라 하루에 다섯 글자씩 배워요.</p>
    <div class="small-label">어떤 한자를 배울까요?</div>${sections}
    <div class="small-label">단원 범위</div><div class="group-grid">${groups}</div>
    <div class="small-label">모험할 단원</div><div class="unit-grid">${units}</div>`)+
    panel('✨ '+htmlEscape(r.grade)+' · '+unit+'단원 · '+(u.learnIndex+1)+'/5',`
      <div class="large-hanja">${htmlEscape(r.char)}</div><div class="reading">${htmlEscape(fullLabel(r))}</div>
      ${ALT[r.char]?`<p class="note">다른 뜻·음: ${htmlEscape(ALT[r.char])}</p>`:''}
      ${mastered(r.char)?notice('🏆 이미 마스터한 한자예요!','good'):learned?notice('🌟 배운 한자예요. 퀴즈로 확인해 볼까요?'):''}
      <button class="button primary full big" data-action="learn-mark" ${learned?'disabled':''}>${learned?'✓ 이미 배웠어요!':'🌟 이 한자 배웠어요! +2점'}</button>
      <div class="actions equal"><button class="secondary" data-action="learn-prev">⬅ 이전 글자</button><button class="primary" data-action="learn-next">다음 글자 ➡</button></div>
      <p class="note">획순 쓰기 연습은 다음 PWA 버전에서 추가됩니다.</p>`);
}
function uniqueValues(values){return [...new Set(values)];}
function question(ch){
  const target=record(ch),kind=['full','char','meaning'][Math.floor(Math.random()*3)];
  const answer=kind==='full'?fullLabel(target):kind==='char'?target.char:target.meaning;
  const values=uniqueValues(records.map(r=>kind==='full'?fullLabel(r):kind==='char'?r.char:r.meaning).filter(x=>x!==answer));
  return {char:ch,kind,answer,choices:shuffle([...shuffle(values).slice(0,3),answer]),
    prompt:kind==='char'?`'${fullLabel(target)}'에 해당하는 한자는?`:kind==='full'?`${target.char}의 뜻과 음을 골라보세요.`:`${target.char}의 뜻은 무엇일까요?`};
}
function startQuiz(scope,review=false){
  const chosen=review?dueCharacters():quizPool(scope);
  if(chosen.length===0)return;
  const chars=shuffle(chosen).slice(0,10);
  state.ui.quiz={scope,review,questions:chars.map(question),idx:0,selected:null,answered:false,correctCount:0};
}
function quizScreen(){
  const q=state.ui.quiz,count=q.questions.length;
  if(q.idx>=count){
    const score=q.correctCount;
    return panel('🎉 모험 결과',`<p class="lead" style="text-align:center">${count}문제 중 ${score}문제 정답!</p>
      <div class="score">${Math.round(score/count*100)}%</div>
      ${notice('공부한 기록이 자동 저장되었어요!','good')}
      <button class="button primary big full" data-action="quiz-finish">🌈 다른 문제 풀기</button>`);
  }
  const cur=q.questions[q.idx];
  const options=cur.choices.map((option,i)=>pickButton('quiz-select',String(i),`${i+1}. ${htmlEscape(option)}`,q.selected===i,q.answered,cur.kind==='char'?'data-hanja="1"':'' )).join('');
  const correct=q.selected!==null&&cur.choices[q.selected]===cur.answer;
  return panel(q.review?'🧠 오늘의 복습 퀴즈':'🎯 한자 퀴즈',`
    <div class="card-header"><span class="small-label" style="margin:0">문제 ${q.idx+1} / ${count}</span><strong>정답 ${q.correctCount}개</strong></div>
    ${progressBar(q.idx,count)}
    ${cur.kind==='char'?'':`<div class="quiz-hanja">${htmlEscape(cur.char)}</div>`}
    <div class="quiz-prompt">${htmlEscape(cur.prompt)}</div>
    <div class="choice-grid quiz-choice-grid">${options}</div>
    <div class="quiz-confirm-area">${q.answered?`<div class="quiz-result ${correct?'good':'bad'}">${correct?'🎉 정답이에요! +10점':'💡 아쉬워요. 정답: '+htmlEscape(cur.answer)}</div>
     <button class="button primary full big" data-action="quiz-next">${q.idx===count-1?'🏆 결과 보기':'다음 문제 →'}</button>`:
     `<button class="button primary full big" data-action="quiz-confirm" ${q.selected===null?'disabled':''}>정답 확인</button>`}</div>
    <button class="button full" style="margin-top:11px" data-action="quiz-abort">현재 퀴즈 종료</button>`);
}
function renderQuiz(){
  if(state.ui.quiz&&!state.ui.quiz.review)return quizScreen();
  const scopes=QUIZ_SCOPE_LIST.map(x=>pickButton('quiz-scope',x.id,
    x.id==='learned'?`📚 내가 배운 한자 · ${quizPool('learned').length}자`:x.title,
    state.ui.quizScope===x.id)).join('');
  return panel('🎯 한자 퀴즈',`<p class="lead">한자·뜻·훈음 문제가 섞여 나와요. 한 번에 최대 10문제!</p>
    <div class="scopes">${scopes}</div>${notice('문제를 맞히면 +10점, 복습 날짜도 자동으로 정해져요!')}
    <button class="button primary big full" data-action="quiz-start" ${quizPool(state.ui.quizScope).length===0?'disabled':''}>🚀 퀴즈 출발!</button>
    ${quizPool(state.ui.quizScope).length===0?`<p class="note">아직 배운 한자가 없어요. 배우기에서 먼저 학습해 주세요.</p>`:''}`);
}
function renderReview(){
  if(state.ui.quiz&&state.ui.quiz.review)return quizScreen();
  const due=dueCharacters();
  return panel('🧠 기억력 훈련소',`<p class="lead">틀린 한자는 오늘, 맞힌 한자는 1·3·7일 뒤 다시 만나요.</p>
    <div class="stats-grid">${stat('🔔',due.length+'자','오늘 복습할 한자')}${stat('🏆',records.filter(r=>mastered(r.char)).length+'자','완전히 익힌 한자')}</div>
    ${due.length?`<div class="small-label">오늘의 복습 친구</div><div class="review-chars">${due.slice(0,35).map(ch=>'<span>'+htmlEscape(ch)+'</span>').join('')}</div>
       <button class="button primary big full" data-action="review-start">🧠 복습 퀴즈 시작!</button>`:notice('🎉 오늘은 복습할 한자가 없어요. 새로운 한자를 배워 보세요.','good')}
    <p class="note">이 PWA는 기기의 날짜가 아니라 한국 표준시(Asia/Seoul)를 기준으로 복습 날짜를 계산합니다.</p>`);
}
function renderCards(){
  const scopes=SCOPE_LIST.map(sc=>pickButton('cards-scope',sc.id,sc.title,state.scope===sc.id)).join('');
  const total=state.deck.length,r=record(state.deck[state.idx]);
  return panel('🧩 한자 카드 맞추기',`<p class="lead">카드를 터치해 뜻과 음을 확인하세요. 한 번 섞은 카드는 중복 없이 나타나요!</p>
    <div class="scopes">${scopes}</div>`)+
    panel('⭐ 오늘의 한자 카드',`
      <div class="card-header"><strong>${state.idx+1} / ${total}</strong><span class="mini">${htmlEscape(r.grade)} · ${Number(state.round)||1}번째 모험</span></div>
      ${progressBar(state.idx+(state.revealed?1:0),total)}
      <p class="instruction">${state.revealed?'✨ 정답을 확인했어요. 다음 카드를 만나 보세요!':'👆 한자 카드를 눌러 뜻과 음을 확인해 보세요.'}</p>
      <button class="flashcard" type="button" data-action="cards-flip" aria-label="한자 카드 뒤집기">
      <span class="char">${htmlEscape(r.char)}</span>${state.revealed?`<span class="answer">${htmlEscape(fullLabel(r))}</span>`:''}
      <span class="tap-hint">${state.revealed?'다시 누르면 한자만 보여요':'터치해서 정답 보기'}</span></button>
      <div class="actions"><button class="secondary" data-action="cards-reshuffle">🔀 다시 섞기</button><button class="primary" data-action="cards-next" ${!state.revealed?'disabled':''}>${state.idx===total-1?'🎉 모두 봤어요! 새 카드 섞기':'다음 한자 →'}</button></div>
      <p class="note">카드 확인은 퀴즈 점수나 복습 일정에 영향을 주지 않아요. 진행 상황은 기기에 자동 저장됩니다.</p>`);
}
function renderRecords(){
  const learned=state.progress.learned,history=state.progress.cards,studied=Object.entries(history).filter(([ch,r])=>recordByChar.has(ch)&&r.attempts>0);
  const rows=studied.slice().sort((a,b)=>a[0].localeCompare(b[0],'ko')).slice(0,150).map(([ch,r])=>{
    const card=record(ch);return `<div class="record-item"><span class="c">${htmlEscape(ch)}</span><span class="m"><strong>${htmlEscape(fullLabel(card))}</strong><span>풀이 ${r.attempts} · 정답 ${r.correct}</span><span>${mastered(ch)?'🏆 마스터':'다음 복습 '+htmlEscape(r.due||'-')}</span></span></div>`;
  }).join('');
  return panel('🏆 나의 학습 기록',`<p class="lead">공부한 만큼 한자 모험의 기록이 쌓이고 자동으로 저장돼요.</p>
    <div class="stats-grid">${stat('📖',learned.length+'/150','학습 표시한 한자')}${stat('🧠',studied.length+'자','문제 풀이한 한자')}${stat('🏅',records.filter(r=>mastered(r.char)).length+'자','마스터한 한자')}${stat('⭐',state.progress.xp+'점','학습 경험치')}</div>
    ${notice('📅 공부한 날짜 '+state.progress.active_days.length+'일 · 연속 공부 '+studyStreak()+'일')}
    <div class="small-label">복습 기록 ${studied.length}자</div>
    ${rows?`<div class="record-list">${rows}</div>`:`<div class="empty">아직 퀴즈 기록이 없어요.<br>퀴즈를 풀면 여기에 기록이 쌓여요!</div>`}`)+
    panel('⚙️ 학부모용 관리',`<button class="toggle" data-action="records-tools">💾 백업·복원 ${$('parent-tools').dataset.open==='true'?'접기 ▴':'펼치기 ▾'}</button>
      ${state.ui.resetStep?notice('⚠ 학습·드래곤 진행 상황이 모두 초기화됩니다. 되돌릴 수 없습니다.','warn'):''}
      <div class="actions equal">${state.ui.resetStep?'<button class="secondary" data-action="records-reset-cancel">취소</button><button class="secondary" data-action="records-reset-confirm">기록 초기화 확인</button>':'<button class="secondary" data-action="records-reset-open">🔒 전체 기록 초기화 메뉴 열기</button>'}</div>`);
}
function render(){
  if(!state)return;
  $('main-nav').querySelectorAll('button').forEach(b=>{
    const on=b.dataset.page===state.ui.page;
    b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');
  });
  const renderer={home:renderHome,learn:renderLearning,quiz:renderQuiz,review:renderReview,writing:renderWriting,dragons:renderDragons,cards:renderCards,records:renderRecords};
  $('page-content').innerHTML=renderer[state.ui.page]();
  $('parent-tools').hidden=state.ui.page!=='records'||$('parent-tools').dataset.open!=='true';
  if(state.ui.page==='writing'&&typeof mountWritingBoard==='function')mountWritingBoard();
  $('offline-status').textContent=navigator.onLine?'기록은 이 기기에 자동 저장돼요':'📴 오프라인에서도 학습 가능';
}
function navigate(page){
  if(!PAGES.includes(page))return;
  return change(()=>{state.ui.page=page;state.ui.resetStep=false;}, {top:true});
}
// Event delegation keeps all controls usable after re-rendering a page.
$('main-nav').addEventListener('click',e=>{const btn=e.target.closest('button[data-page]');if(btn)navigate(btn.dataset.page);});
$('page-content').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-page],button[data-action]');if(!btn||btn.disabled||busy)return;
  if(btn.dataset.page){navigate(btn.dataset.page);return;}
  const action=btn.dataset.action,val=btn.dataset.value;
  if(action.startsWith('write-tool-')){onWritingToolClick(action);return;}
  if(action==='battle-use'){performBattleAttack();return;}
  if(action==='battle-replay'){replayBattleAttack();return;}
  if(action==='records-tools'){$('parent-tools').dataset.open=$('parent-tools').hidden?'true':'false';render();return;}
  change(()=>{
    const u=state.ui;
    switch(action){
      case 'go-lesson':u.learnSection='new';u.learnUnitNew=Number(val);u.learnGroupNew=Math.floor((u.learnUnitNew-1)/5);u.learnIndex=0;u.page='learn';break;
      case 'learn-section':u.learnSection=val;u.learnIndex=0;break;
      case 'learn-group':{let g=Number(val);if(u.learnSection==='new'){u.learnGroupNew=g;u.learnUnitNew=g*5+1;}else{u.learnGroupOld=g;u.learnUnitOld=g*5+1;}u.learnIndex=0;break;}
      case 'learn-unit':if(u.learnSection==='new')u.learnUnitNew=Number(val);else u.learnUnitOld=Number(val);u.learnIndex=0;break;
      case 'learn-prev':u.learnIndex=(u.learnIndex+4)%5;break;
      case 'learn-next':u.learnIndex=(u.learnIndex+1)%5;break;
      case 'learn-mark':markLearned(lessonChars()[u.learnIndex]);break;
      case 'quiz-scope':u.quizScope=val;break;
      case 'quiz-start':startQuiz(u.quizScope,false);break;
      case 'review-start':startQuiz('review',true);break;
      case 'quiz-select':if(u.quiz&&!u.quiz.answered)u.quiz.selected=Number(val);break;
      case 'quiz-confirm':if(u.quiz&&!u.quiz.answered&&u.quiz.selected!==null){let q=u.quiz,cur=q.questions[q.idx],correct=cur.choices[q.selected]===cur.answer;registerAnswer(cur.char,correct);q.answered=true;if(correct)q.correctCount++;}break;
      case 'quiz-next':if(u.quiz&&u.quiz.answered){u.quiz.idx++;u.quiz.selected=null;u.quiz.answered=false;}break;
      case 'quiz-finish':case 'quiz-abort':u.quiz=null;break;
      case 'cards-scope':if(state.scope!==val)Object.assign(state,newDeck(val));break;
      case 'cards-flip':state.revealed=!state.revealed;if(state.revealed&&!state.seen.includes(state.deck[state.idx]))state.seen.push(state.deck[state.idx]);break;
      case 'cards-next':if(state.revealed){if(state.idx===state.deck.length-1)Object.assign(state,newDeck(state.scope,(state.round||1)+1));else{state.idx++;state.revealed=false;}}break;
      case 'cards-reshuffle':Object.assign(state,newDeck(state.scope,(state.round||1)+1));break;
      case 'records-reset-open':u.resetStep=true;break;
      case 'records-reset-cancel':u.resetStep=false;break;
      case 'records-reset-confirm':if(u.resetStep){state.progress=freshProgress();state.seen=[];Object.assign(state,newDeck(state.scope,1));u.quiz=null;u.resetStep=false;}break;
      default:
        if(action.startsWith('write-'))handleWritingAction(action,val);
        else if(action.startsWith('dragon-')||action.startsWith('battle-'))handleDragonAction(action,val);
        else throw new Error('알 수 없는 동작: '+action);
    
    }
  },{top:action==='go-lesson'});
});
function makeBackup(){return {kind:'hanja-pwa-backup',format:3,exportedAt:new Date().toISOString(),state};}
$('export-json').addEventListener('click',()=>{
  if(!state)return;
  const data=JSON.stringify(makeBackup(),null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`hanja_pwa_backup_${todayKST()}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
$('import-json').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>3000000)throw new Error('백업 파일이 너무 큽니다. 3MB 이하만 지원합니다.');
    const payload=JSON.parse(await file.text());let next;
    if(payload?.kind==='hanja-pwa-backup'&&[1,2,3].includes(payload.format)&&stateDeckOK(payload.state)){
      next=upgrade(payload.state);
    }else if(payload&&typeof payload==='object'&&payload.progress&&typeof payload.progress==='object'&&
             ('learned' in payload.progress||'cards' in payload.progress)){
      // Streamlit backup: preserve the PWA flashcard deck/seen state and import study records.
      next=JSON.parse(JSON.stringify(state));next.progress=normalizeProgress(payload.progress);
      next.ui.quiz=null;
    }else throw new Error('지원하는 PWA 또는 Streamlit 학습 기록 JSON이 아닙니다.');
    if(!confirm('현재 기기 학습 기록이 선택한 백업으로 바뀝니다. 진행할까요?'))return;
    await change(()=>{state=next;state.ui.resetStep=false;});
    alert('학습 기록을 복원했습니다.');
  }catch(err){console.error('backup import',err);alert('복원 실패: '+err.message);}finally{e.target.value='';}
});
window.addEventListener('online',()=>{if(state)render();});window.addEventListener('offline',()=>{if(state)render();});
async function boot(){try{
  const res=await fetch('./data/hanja.json');if(!res.ok)throw new Error('한자 데이터 로딩 실패');
  records=await res.json();const count=(grade)=>records.filter(r=>r.grade===grade).length;
  if(records.length!==150||new Set(records.map(r=>r.char)).size!==150||count('8급')!==50||count('7급Ⅱ')!==50||count('7급')!==50)throw new Error('150자 원본 데이터가 올바르지 않습니다.');
  recordByChar=new Map(records.map(r=>[r.char,r]));
  const saved=await loadSaved();state=upgrade(saved);state.savedAt=new Date().toISOString();await persist();
  $('save-status').textContent='✓ 자동 저장 준비됨';render();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('SW registration failed',err));
}catch(err){console.error('boot',err);$('save-status').textContent='⚠ 시작 오류';$('page-content').innerHTML=panel('앱 시작 실패',`<p>${htmlEscape(err.message)}</p><p>연결 상태를 확인하고 앱을 다시 실행해 주세요.</p>`);}}
boot();
