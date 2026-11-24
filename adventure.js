/* 한자 탐험대 PWA v2.1.0 · 모험 지도 (기존 학습·보상 기록과 연동) */
'use strict';
const ADVENTURE_REGIONS = Object.freeze([
 {id:1,name:'새싹의 숲',icon:'🌱',theme:'forest',first:1,last:5,subtitle:'첫 모험과 아기 드래곤의 성장',boss:'mushroom',bossTitle:'숲의 수호자'},
 {id:2,name:'반짝이는 호수',icon:'💧',theme:'lake',first:6,last:10,subtitle:'물결을 건너 바위 수호자에게 도전',boss:'stone_guardian',bossTitle:'호수의 수호자'},
 {id:3,name:'불꽃 산맥',icon:'🌋',theme:'volcano',first:11,last:15,subtitle:'뜨거운 산맥에서 최종 진화를 향해',boss:'ancient_ent',bossTitle:'산맥의 수호자'},
 {id:4,name:'수호자의 성',icon:'🏰',theme:'castle',first:16,last:20,subtitle:'마지막 한자를 배우고 그림자 용왕과 대결',boss:'shadow_dragon',bossTitle:'최종 보스'}
]);
function adventureLearned(unit){
 const seen=new Set(state.progress.learned);
 return newUnitChars(unit).filter(char=>seen.has(char)).length;
}
function adventureWon(unit){return state.progress.game.won_battles.includes(`신규 ${unit}단원`);}
function adventureRegionReady(region){
 return Array.from({length:5},(_,i)=>adventureLearned(region.first+i)===5).every(Boolean);
}
function adventureRegionStatus(region){
 const learned=Array.from({length:5},(_,i)=>adventureLearned(region.first+i)).reduce((a,b)=>a+b,0);
 const wins=Array.from({length:5},(_,i)=>adventureWon(region.first+i)).filter(Boolean).length;
 const bossWon=adventureWon(region.last);
 return {learned,wins,bossWon};
}
function adventureUnitStatus(unit){
 if(adventureWon(unit))return '🏅 배틀 승리';
 const n=adventureLearned(unit);
 return n===5?'⚔️ 배틀 가능':n?'📖 '+n+'/5 학습':'🌱 학습 전';
}
function renderAdventureMap(){
 const chosen=ADVENTURE_REGIONS.find(r=>r.id===state.ui.mapRegion)||ADVENTURE_REGIONS[0];
 const game=state.progress.game;
 const totalLearned=Array.from({length:20},(_,i)=>adventureLearned(i+1)).reduce((a,b)=>a+b,0);
 const totalWins=Array.from({length:20},(_,i)=>adventureWon(i+1)).filter(Boolean).length;
 const bossWins=ADVENTURE_REGIONS.filter(r=>adventureWon(r.last)).length;
 const regions=ADVENTURE_REGIONS.map(r=>{
   const p=adventureRegionStatus(r),isSelected=chosen.id===r.id;
   return `<button type="button" class="adventure-region ${r.theme} ${isSelected?'selected':''}" data-action="map-region" data-value="${r.id}" aria-pressed="${isSelected}">
     <span class="adventure-region-icon" aria-hidden="true">${r.icon}</span>
     <strong>${r.name}</strong><small>${r.first}~${r.last}단원 · ${p.learned}/25자</small>
     ${p.bossWon?'<span class="adventure-seal">🏅 보스 격파</span>':''}
   </button>`;
 }).join('');
 const stops=Array.from({length:5},(_,i)=>chosen.first+i).map(unit=>{
   const count=adventureLearned(unit),won=adventureWon(unit),boss=unit===chosen.last;
   const canBattle=boss?adventureRegionReady(chosen):count===5;
   const allDone=count===5;
   const note=boss&&!canBattle&&!won?'지역의 25자를 모두 배우면 보스 도전 가능':
      !allDone?'한자 '+count+'/5자 · 먼저 배우기에서 학습해요':'한자 5자 학습 완료!';
   const bossImage=boss?`<img class="adventure-boss-mini" src="${monsterArt(chosen.boss)}" alt="${MONSTERS[chosen.boss].name}" loading="lazy">`:'';
   return `<div class="adventure-stop ${boss?'boss':''} ${won?'cleared':''}">
      <div class="adventure-pin" aria-hidden="true">${boss?'👑':won?'★':unit}</div>
      <article class="adventure-stop-card">
        <div class="adventure-stop-header"><strong>${unit}단원 ${boss?'· 지역 보스':''}</strong><span class="adventure-state">${adventureUnitStatus(unit)}</span></div>
        ${boss?`<div class="adventure-boss-info">${bossImage}<div><b>${chosen.bossTitle}</b><small>${MONSTERS[chosen.boss].name}와 결전!</small></div></div>`:''}
        <p class="adventure-note">${note}</p>
        <div class="adventure-stop-actions">
          <button class="adventure-learn" type="button" data-action="map-learn" data-value="${unit}">📖 ${allDone?'다시 배우기':'한자 배우기'}</button>
          <button class="adventure-fight" type="button" data-action="map-battle" data-value="${unit}" ${!canBattle&&!won?'disabled':''}>⚔️ ${won?'재도전':'배틀'}</button>
        </div>
      </article>
   </div>`;
 }).join('');
 const p=adventureRegionStatus(chosen);
 const badge=p.bossWon?'🏅 수호자 격파!':adventureRegionReady(chosen)?'👑 보스 도전 가능':'📚 한자를 배우며 길을 열어요';
 return panel('🗺️ 드래곤 모험 지도',`<p class="lead">한자 5자씩 배우고 배틀에 도전해요. 5단원마다 강력한 수호자가 기다리고 있어요!</p>
    <div class="adventure-summary"><span>📖 학습 ${totalLearned}/100자</span><span>⚔️ 승리 ${totalWins}/20단원</span><span>🏅 지역 메달 ${bossWins}/4개</span></div>
    <div class="adventure-region-grid">${regions}</div>`)+
    panel(`${chosen.icon} ${chosen.name} · ${chosen.first}~${chosen.last}단원`,`
      <div class="adventure-landscape ${chosen.theme}">
        <div class="adventure-landscape-sun" aria-hidden="true"></div>
        <div class="adventure-landscape-hill" aria-hidden="true"></div>
        <span class="adventure-landscape-icon" aria-hidden="true">${chosen.icon}</span>
        <div class="adventure-landscape-caption"><strong>${chosen.name}</strong><span>${chosen.subtitle}</span></div>
      </div>
      <div class="adventure-progress"><span>배운 한자 <b>${p.learned}/25</b></span><span>배틀 승리 <b>${p.wins}/5</b></span></div>
      ${progressBar(p.learned,25)}<p class="adventure-banner">${badge}</p>
      <div class="adventure-trail" aria-label="${chosen.name}의 5개 단원">${stops}</div>
      <p class="note">지도는 기존 학습·배틀 기록과 자동으로 연결됩니다. 이미 끝낸 단원은 다시 배울 수 있고, 배틀 첫 승리 경험치는 한 번만 지급돼요.</p>`);
}
function handleAdventureAction(action,val){
 const ui=state.ui;
 if(action==='map-region'){
   const n=Number(val);if(Number.isInteger(n)&&n>=1&&n<=4)ui.mapRegion=n;
   return;
 }
 const n=Number(val);
 if(!Number.isInteger(n)||n<1||n>20) return;
 if(action==='map-learn'){
   ui.learnSection='new';ui.learnGroupNew=Math.floor((n-1)/5);ui.learnUnitNew=n;ui.learnIndex=0;ui.page='learn';
 }else if(action==='map-battle'){
   const region=ADVENTURE_REGIONS.find(r=>n>=r.first&&n<=r.last);
   const canStart=n===region.last?adventureRegionReady(region):adventureLearned(n)===5;
   if(!canStart&&!adventureWon(n))return;
   ui.dragonMode='unit';ui.dragonUnit=n;
   if(!state.progress.game.starter){ui.page='dragons';return;}
   if(ui.battle)return; // Do not overwrite a previous uncompleted battle.
   handleDragonAction('battle-start');
   if(ui.battle)ui.page='dragons';
 }
}
