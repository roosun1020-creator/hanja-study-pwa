/* 한자 탐험대 PWA v2.0.3 - battle score, elemental effects, mobile-safe impact animations */
'use strict';
const DRAGONS={
 fire:{name:'화루',kind:'불',hanja:['火','炎','焱'],forms:['꼬마 불꽃룡','붉은 날개룡','화염 수호룡']},
 water:{name:'수루',kind:'물',hanja:['水','江','海'],forms:['물방울룡','강물날개룡','대해 수호룡']},
 forest:{name:'그루',kind:'숲',hanja:['木','林','森'],forms:['새싹룡','숲날개룡','고대 숲 수호룡']}
};
const SKILLS={
 fire:[['불꽃탄',0,1],['화염꼬리',5,2],['불꽃회오리',10,2],['화염방사',15,3],['대화염',20,3]],
 water:[['물방울탄',0,1],['물대포',5,2],['물의파동',10,2],['강물베기',15,3],['대해의파도',20,3]],
 forest:[['새싹탄',0,1],['덩굴채찍',5,2],['잎날베기',10,2],['숲의뿌리',15,3],['고대숲의힘',20,3]]
};
const DRAGON_PERKS={fire:'🔥 3연속 정답이면 불꽃 폭발 +10점',water:'💧 오답 다음에 다시 맞히면 집중 +10점',forest:'🌿 세 번째 정답부터 숲의 성장 +10점'};
const MONSTERS={
 slime:{name:'보라 말랑이',grade:'일반'},sprout_imp:{name:'새싹 도깨비',grade:'일반'},
 mushroom:{name:'버섯 요정',grade:'일반'},stone_guardian:{name:'바위 골렘',grade:'중간 보스'},
 crystal_bat:{name:'수정 박쥐',grade:'일반'},storm_fox:{name:'번개 여우',grade:'일반'},
 ancient_ent:{name:'고대 나무 정령',grade:'중간 보스'},flame_wisp:{name:'불꽃 도깨비',grade:'일반'},
 shadow_dragon:{name:'그림자 용왕',grade:'최종 보스'}
};
const dragonArt=(dragon,stage)=>`./assets/dragons/${dragon}_${stage}.webp`;
const monsterArt=id=>`./assets/monsters/${id}.webp`;
const effectArt=(dragon,idx)=>`./assets/effects/${dragon}_${idx+1}.webp`;
let attackTimer=null, attackMotion=null, attackSerial=0;
function completedUnits(){const learned=new Set(state.progress.learned);return Array.from({length:20},(_,i)=>newUnitChars(i+1)).filter(chars=>chars.every(c=>learned.has(c))).length;}
function stageAt(units,wins){return units>=15&&wins>=3?3:units>=5&&wins>=1?2:1;}
function gameInfo(){const game=state.progress.game,units=completedUnits();let wins=game.won_battles.length;
  if(game.starter&&DRAGONS[game.starter]){
    const others=Object.keys(DRAGONS).filter(x=>x!==game.starter);
    game.owned=[game.starter,...(units>=10?[others[0]]:[]),...(units>=20?[others[1]]:[])];
    if(!game.owned.includes(game.active))game.active=game.starter;
  }
  return {game,units,wins,stage:stageAt(units,wins)};
}
function monsterForScope(scope,units){
  let unit=scope.startsWith('신규 ')?Number(scope.match(/\d+/)?.[0]||1):scope==='학습 완료 한자'?Math.max(1,Math.min(units,20)):1;
  if(unit===20)return 'shadow_dragon';if(unit===15)return 'ancient_ent';if(unit===10)return 'stone_guardian';
  if(unit<=3)return 'slime';if(unit<=6)return 'sprout_imp';if(unit<=9)return 'mushroom';if(unit<=12)return 'crystal_bat';if(unit<=14)return 'storm_fox';
  if(unit<=17)return 'flame_wisp';return unit===18?'storm_fox':'flame_wisp';
}
function battlePool(scope){
  if(scope==='8급 복습')return pool('eight');
  if(scope==='학습 완료 한자')return state.progress.learned.filter(ch=>recordByChar.has(ch));
  const m=scope.match(/^신규 (\d+)단원$/);if(m){const n=Number(m[1]);if(n>=1&&n<=20)return newUnitChars(n);}
  return [];
}
function battleQuestion(ch){const target=record(ch);const kind=Math.random()<.5?'full':'meaning',answer=kind==='full'?fullLabel(target):target.meaning;
  const wrong=[...new Set(records.map(r=>kind==='full'?fullLabel(r):r.meaning).filter(x=>x!==answer))];
  return {char:ch,kind,answer,choices:shuffle([...shuffle(wrong).slice(0,3),answer]),
    prompt:kind==='full'?'이 한자의 뜻과 음을 고르세요.':'이 한자의 뜻은 무엇일까요?'};
}
function normalizeBattle(b){
  if(!b||typeof b!=='object'||!Array.isArray(b.questions)||b.questions.length!==5)return null;
  if(!Number.isInteger(b.idx)||b.idx<0||b.idx>5||!Number.isInteger(b.correct)||b.correct<0||b.correct>5||typeof b.scope!=='string')return null;
  if(!b.questions.every(q=>q&&recordByChar.has(q.char)&&typeof q.answer==='string'&&typeof q.prompt==='string'&&Array.isArray(q.choices)&&q.choices.length===4&&q.choices.includes(q.answer)))return null;
  return {scope:b.scope,questions:b.questions,idx:b.idx,correct:b.correct,selected:Number.isInteger(b.selected)&&b.selected>=0&&b.selected<=3?b.selected:null,
   answered:!!b.answered,rewarded:!!b.rewarded,winReward:!!b.winReward,moveIndex:Number.isInteger(b.moveIndex)?Math.max(0,Math.min(4,b.moveIndex)):0,enemy:MONSTERS[b.enemy]?b.enemy:'slime',lastCorrect:!!b.lastCorrect,
   combo:Number.isInteger(b.combo)?Math.max(0,Math.min(5,b.combo)):0,
   maxCombo:Number.isInteger(b.maxCombo)?Math.max(0,Math.min(5,b.maxCombo)):0,
   score:Number.isFinite(b.score)?Math.max(0,Math.min(9999,Math.floor(b.score))):0,
   lastPoints:Number.isFinite(b.lastPoints)?Math.max(0,Math.min(100,Math.floor(b.lastPoints))):0,
   lastSpecial:typeof b.lastSpecial==='string'?b.lastSpecial.slice(0,50):''};
}
function unlockedSkills(key,units,stage){return SKILLS[key].map((s,i)=>({index:i,name:s[0],available:units>=s[1]&&stage>=s[2],units:s[1],stage:s[2]}));}
// A skill's tier changes battle SCORE and visuals, not HP, accuracy, or the first-win XP rule.
// Elemental bonuses are deterministic: no random unfair hits and no penalty for an incorrect answer.
function skillScore(key,index,nextCombo,correctBefore,previousWrong){
  const level=Math.max(0,Math.min(4,index));
  const tierBonus=level*4;
  const comboBonus=Math.min(12,Math.max(0,nextCombo-1)*4);
  let special=0,description='';
  if(key==='fire'&&nextCombo>=3){special=10;description='🔥 불꽃 폭발!';}
  else if(key==='water'&&previousWrong){special=10;description='💧 다시 도전 집중!';}
  else if(key==='forest'&&correctBefore>=2){special=10;description='🌿 숲의 성장!';}
  return {points:25+tierBonus+comboBonus+special,tierBonus,comboBonus,special,description};
}
function battleStarLabel(correct){return correct===5?'⭐⭐⭐':correct>=4?'⭐⭐':'⭐';}
function dragonOptions(game,stage){
  return `<div class="dragon-picker">${Object.entries(DRAGONS).map(([key,d])=>{
    const owned=game.owned.includes(key),active=game.active===key;
    return `<button data-action="dragon-select" data-value="${key}" ${owned&&active?'disabled':''} ${!owned?'disabled':''} class="${active?'active':''}" aria-label="${d.name}${owned?' 선택':' 잠김'}">
      <img src="${dragonArt(key,owned?stage:1)}" alt="${d.name}" class="${owned?'':'locked'}" loading="lazy"><strong>${d.name}</strong><small>${owned?(active?'선택 중 ✓':'선택하기'):'🔒 아직 해금 전'}</small></button>`;
  }).join('')}</div>`;
}
function renderDragons(){
  const {game,units,wins,stage}=gameInfo(),battle=state.ui.battle;
  if(!game.starter){
    return panel('🐉 드래곤 가디언즈',`<p class="lead">한자의 힘으로 성장하는 드래곤 중 첫 친구를 골라 주세요! 다른 드래곤은 10·20단원에 얻을 수 있어요.</p>
      <div class="dragon-picker">${Object.entries(DRAGONS).map(([key,d])=>`<button data-action="dragon-starter" data-value="${key}"><img src="${dragonArt(key,1)}" alt="${d.name}"><strong>${d.name}</strong><small>${d.hanja[0]} · ${d.kind} 드래곤</small></button>`).join('')}</div>`);
  }
  const current=game.active,d=DRAGONS[current],skills=unlockedSkills(current,units,stage);
  if(!battle){
    const options=state.ui.dragonMode==='unit'?`<div class="unit-grid battle-scope-options">${Array.from({length:20},(_,i)=>pickButton('dragon-unit',String(i+1),`${i+1}단원`,state.ui.dragonUnit===i+1)).join('')}</div>`:
      `<div class="pills battle-scope-options">${pickButton('dragon-scope','8급 복습','🏅 8급 복습',state.ui.dragonScope==='8급 복습')}${pickButton('dragon-scope','학습 완료 한자','📖 학습 완료',state.ui.dragonScope==='학습 완료 한자')}</div>`;
    const scope=state.ui.dragonMode==='unit'?`신규 ${state.ui.dragonUnit}단원`:state.ui.dragonScope;
    const canStart=battlePool(scope).length>=5;
    return panel('🐉 드래곤 가디언즈',`<p class="lead">함께 모험할 드래곤을 선택해 주세요.</p>${dragonOptions(game,stage)}
      <div class="dragon-hero-info"><img src="${dragonArt(current,stage)}" alt="${d.name}"><div><strong>${d.name} · ${d.forms[stage-1]}</strong><div class="dragon-hanja">${d.hanja[stage-1]}</div><small>드래곤 레벨 ${1+Math.floor(game.xp/60)} · ${d.kind} 속성</small></div></div>
      <div class="stats-grid">${stat('📖',units+'/20','학습 완료 단원')}${stat('🏆',wins+'회','서로 다른 배틀 승리')}${stat('⚡',skills.filter(s=>s.available).length+'/5','배운 기술')}${stat('💎',game.xp+' XP','드래곤 경험치')}</div>
      ${notice(stage===3?'✨ 최종 진화 완료!':stage===2?'2단계 성장 드래곤! 최종 진화는 15단원과 3회 승리 후 가능해요.':'첫 진화는 신규 단원 5개 완료 + 서로 다른 배틀 1회 승리예요.')}
      <h3>✨ 기술 도감</h3><div class="skills-grid">${skills.map(s=>`<button title="${s.available?`전투 점수 +${s.index*4} 보너스`:s.units+`단원 · `+s.stage+`단계 필요`}" ${s.available?'':'disabled'}><img src="${effectArt(current,s.index)}" alt="${s.name}"><span>${s.available?'':'🔒 '}${s.name}</span></button>`).join('')}</div>
      <p class="dragon-perk-tip">${DRAGON_PERKS[current]} · 기술이 강해지면 전투 점수가 더 올라요!</p>
      <h3>⚔️ 배틀 범위를 선택하세요</h3><div class="pills">${pickButton('dragon-mode','basic','🛡️ 기본 모험',state.ui.dragonMode==='basic')}${pickButton('dragon-mode','unit','📚 단원별 모험',state.ui.dragonMode==='unit')}</div>
      <div class="small-label">도전할 한자 범위</div>${options}
      <button class="button primary full big battle-start-button" data-action="battle-start" ${canStart?'':'disabled'}>⚔️ 드래곤 배틀 시작!</button>
      ${!canStart?`<p class="note">학습 완료 한자는 다섯 글자 이상 배운 뒤 선택할 수 있습니다.</p>`:''}<p class="note">다섯 문제 중 네 문제 이상 정답이면 승리. 각 배틀 범위 첫 승리 시 드래곤 경험치 +30XP!</p>`);
  }
  if(battle.idx>=5){
    const won=battle.correct>=4;
    return panel('🏅 드래곤 배틀 결과',`<div class="dragon-hero-info"><img src="${dragonArt(current,stage)}" alt="${d.name}"><div><h2>${won?'🎉 승리!':'🌱 다시 도전해요!'}</h2><p>${battle.questions.length}문제 중 ${battle.correct}문제 정답</p><div class="battle-final-score">${battleStarLabel(battle.correct)} · 전투 점수 ${battle.score||0}점</div><p class="battle-combo-note">최대 연속 정답 ${battle.maxCombo||0}개 · 정답 수가 승리를 결정해요.</p>${battle.winReward?'첫 승리 경험치 +30XP!':won?'이미 첫 승리 보상을 받았어요.':'틀린 한자를 복습하면 더 강해져요.'}</div></div>
     <button class="button primary full big" data-action="battle-exit">다른 배틀 선택하기</button>`);
  }
  const q=battle.questions[battle.idx],enemy=MONSTERS[battle.enemy]||MONSTERS.slime,hp=Math.max(0,100-25*battle.correct);
  const chosenSkill=skills[battle.moveIndex]||skills[0];
  return panel(`⚔️ ${htmlEscape(battle.scope)} · 한자 배틀`,`
    <div class="card-header"><strong>문제 ${battle.idx+1}/5</strong><span class="mini">맞힌 문제 ${battle.correct}개</span></div>${progressBar(battle.idx,5)}
    <div class="battle-score-strip"><span>✨ 전투점수 <b>${battle.score||0}</b></span><span>🔥 연속 정답 <b>${battle.combo||0}</b></span></div>
    <div class="battle-actors">
      <div class="battle-actor"><img src="${dragonArt(current,stage)}" alt="드래곤 ${d.name}"><div class="actor-name">${d.name}</div><div class="actor-health">Lv.${1+Math.floor(game.xp/60)}</div></div>
      <div class="battle-actor"><img src="${monsterArt(battle.enemy)}" alt="몬스터 ${enemy.name}"><div class="actor-name">${enemy.name}</div><div class="actor-health">HP ${hp}/100</div><div class="healthbar"><i style="width:${hp}%"></i></div></div>
    </div>
    ${battle.answered?'':`<div class="small-label">⚡ 기술 선택</div><div class="skills-grid">${skills.filter(s=>s.available).map(s=>`<button data-action="battle-skill" data-value="${s.index}" class="${battle.moveIndex===s.index?'active':''}" title="${s.name}: 정답 시 전투점수 +${s.index*4} 보너스" aria-pressed="${battle.moveIndex===s.index}"><img src="${effectArt(current,s.index)}" alt="${s.name}"><span>${s.name}</span><small>+${s.index*4}점</small></button>`).join('')}</div>`}
    <div class="battle-question">${htmlEscape(q.char)}</div><p class="battle-prompt">${htmlEscape(q.prompt)}</p>
    ${battle.answered?`<div class="quiz-result ${battle.lastCorrect?'good':'bad'}">${battle.lastCorrect?'✨ 공격 성공! '+htmlEscape(enemy.name)+'에게 25 피해 · 전투점수 +'+(battle.lastPoints||25)+'점!':'아쉬워요. 정답은 '+htmlEscape(q.answer)+'입니다.'}</div>
      <div class="battle-controls"><button class="button secondary full" data-action="battle-replay">🎬 공격 장면 다시 보기</button><button class="button primary full big" data-action="battle-next">${battle.idx===4?'배틀 결과 보기':'다음 문제 →'}</button></div>`:
      `<div class="choice-grid quiz-choice-grid">${q.choices.map((v,i)=>pickButton('battle-choice',String(i),`${i+1}. ${htmlEscape(v)}`,battle.selected===i)).join('')}</div>
       <div class="battle-controls"><button class="button primary full big" data-action="battle-use" ${battle.selected===null?'disabled':''}>✨ ${chosenSkill.name} 사용하기!</button></div>`}
    <button class="button full" style="margin-top:16px" data-action="battle-exit">현재 배틀 종료</button>`);
}
function handleDragonAction(action,val){
  const u=state.ui,game=state.progress.game,units=completedUnits(),wins=game.won_battles.length,stage=stageAt(units,wins);
  if(action==='dragon-starter'&&DRAGONS[val]&&!game.starter){game.starter=val;game.active=val;game.owned=[val];}
  else if(action==='dragon-select'&&DRAGONS[val]&&game.owned.includes(val)&&!u.battle){game.active=val;}
  else if(action==='dragon-mode'&&['basic','unit'].includes(val))u.dragonMode=val;
  else if(action==='dragon-unit'){const n=Number(val);if(n>=1&&n<=20)u.dragonUnit=n;}
  else if(action==='dragon-scope'&&['8급 복습','학습 완료 한자'].includes(val))u.dragonScope=val;
  else if(action==='battle-start'&&!u.battle){
    const scope=u.dragonMode==='unit'?`신규 ${u.dragonUnit}단원`:u.dragonScope;
    const p=battlePool(scope);if(p.length<5)return;
    u.battle={scope,questions:shuffle(p).slice(0,5).map(battleQuestion),idx:0,correct:0,selected:null,answered:false,moveIndex:0,enemy:monsterForScope(scope,units),lastCorrect:false,rewarded:false,winReward:false,score:0,combo:0,maxCombo:0,lastPoints:0,lastSpecial:''};
  }
  else if(action==='battle-skill'&&u.battle&&!u.battle.answered){
    const n=Number(val),s=unlockedSkills(game.active,units,stage).find(s=>s.index===n&&s.available);if(s)u.battle.moveIndex=n;
  }
  else if(action==='battle-choice'&&u.battle&&!u.battle.answered){const n=Number(val);if(n>=0&&n<4)u.battle.selected=n;}
  else if(action==='battle-next'&&u.battle&&u.battle.answered){
    u.battle.idx++;u.battle.selected=null;u.battle.answered=false;u.battle.moveIndex=0;
    if(u.battle.idx>=5&&!u.battle.rewarded){
      if(u.battle.correct>=4&&!game.won_battles.includes(u.battle.scope)){game.won_battles.push(u.battle.scope);game.xp+=30;u.battle.winReward=true;}
      u.battle.rewarded=true;
    }
  }
  else if(action==='battle-exit')u.battle=null;
  else throw Error('Unknown dragon action: '+action);
}
async function performBattleAttack(){
  const b=state?.ui?.battle;if(!b||b.answered||b.selected===null)return;
  const q=b.questions[b.idx],selected=b.selected,correct=q.choices[selected]===q.answer;
  const used=state.progress.game.active,skill=b.moveIndex,enemy=b.enemy;
  await change(()=>{
    const previousWrong=b.idx>0&&!b.lastCorrect;
    const before=b.correct;
    registerAnswer(q.char,correct);b.answered=true;b.lastCorrect=correct;
    if(correct){
      b.combo=(b.combo||0)+1;
      b.maxCombo=Math.max(b.maxCombo||0,b.combo);
      const result=skillScore(used,skill,b.combo,before,previousWrong);
      b.lastPoints=result.points;b.lastSpecial=result.description;
      b.score=(b.score||0)+result.points;
      b.correct++;
    }else{b.combo=0;b.lastPoints=0;b.lastSpecial='';}
  });
  openAttackDialog({correct,used,skill,enemy,remainingHP:Math.max(0,100-25*b.correct),answer:q.answer,
    points:b.lastPoints,special:b.lastSpecial,combo:b.combo});
}
function replayBattleAttack(){
  const b=state?.ui?.battle;if(!b||!b.answered)return;
  const used=state.progress.game.active;
  openAttackDialog({correct:b.lastCorrect,used,skill:b.moveIndex,enemy:b.enemy,remainingHP:Math.max(0,100-25*b.correct),answer:b.questions[b.idx].answer,points:b.lastPoints||25,special:b.lastSpecial||'',combo:b.combo||0});
}
function stopAttackMotion(){
  attackSerial++;
  if(attackTimer){clearTimeout(attackTimer);attackTimer=null;}
  if(attackMotion){try{attackMotion.cancel();}catch{}attackMotion=null;}
}
function playAttackMotion(dialog,correct,element,tier){
  const serial=attackSerial;
  const projectile=dialog.querySelector('.projectile');
  const enemy=dialog.querySelector('.enemy-hit');
  const dragon=dialog.querySelector('.attack-dragon');
  const result=dialog.querySelector('#attack-summary');
  const stage=dialog.querySelector('.attack-stage');
  const impact=dialog.querySelector('.attack-impact');
  const damage=dialog.querySelector('.attack-damage');
  let impacted=false;
  const finish=()=>{
    if(serial!==attackSerial||!dialog.open)return;
    result?.classList.add('visible');
    dialog.querySelector('#attack-close')?.focus({preventScroll:true});
  };
  const hit=()=>{
    if(impacted||serial!==attackSerial||!dialog.open)return;
    impacted=true;
    impact?.classList.add('burst');
    damage?.classList.add('visible');
    if(enemy?.animate)enemy.animate([
      {transform:'translateX(0) scale(1)',filter:'brightness(1)'},
      {transform:'translateX(-9px) scale(.95)',filter:'brightness(1.8)'},
      {transform:'translateX(7px) scale(1.04)',filter:'brightness(1.3)'},
      {transform:'translateX(0) scale(1)',filter:'brightness(1)'}
    ],{duration:430,easing:'ease-out'});
    attackTimer=setTimeout(finish,480);
  };
  if(!correct){attackTimer=setTimeout(finish,320);return;}
  const start=async()=>{
    try{if(projectile?.decode)await Promise.race([projectile.decode().catch(()=>{}),new Promise(r=>setTimeout(r,650))]);}catch{}
    if(serial!==attackSerial||!dialog.open||!projectile||!stage)return;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    if(serial!==attackSerial||!dialog.open)return;
    // Compute the flight path from the actual dragon sprite to the actual opponent
    // so the impact lands correctly on narrow Android screens and larger tablets.
    const stageRect=stage.getBoundingClientRect();
    const dragonImage=dragon?.querySelector('img');
    const enemyImage=enemy?.querySelector('img');
    const origin=dragonImage?.getBoundingClientRect();
    const target=enemyImage?.getBoundingClientRect();
    const spriteWidth=projectile.getBoundingClientRect().width||90;
    const spriteHeight=projectile.getBoundingClientRect().height||80;
    let startX=origin?origin.right-origin.width*.30-stageRect.left-spriteWidth*.5:stageRect.width*.18;
    let startY=origin?origin.top+origin.height*.40-stageRect.top-spriteHeight*.5:stageRect.height*.37;
    let endX=target?target.left+target.width*.40-stageRect.left-spriteWidth*.5:stageRect.width*.74;
    let endY=target?target.top+target.height*.45-stageRect.top-spriteHeight*.5:stageRect.height*.43;
    startX=Math.max(-15,Math.min(stageRect.width-spriteWidth,startX));
    startY=Math.max(24,Math.min(stageRect.height-spriteHeight,startY));
    projectile.style.left=startX+'px';projectile.style.top=startY+'px';
    const dx=endX-startX,dy=endY-startY;
    if(impact){impact.style.left=(endX+spriteWidth*.5)+'px';impact.style.top=(endY+spriteHeight*.5)+'px';}
    if(damage){damage.style.left=(endX+spriteWidth*.5)+'px';damage.style.top=(endY+spriteHeight*.5-28)+'px';}
    const arc=element==='water'?-22:element==='forest'?18:-(5+tier*3);
    const maxScale=.85+tier*.12;
    if(dragon?.animate)dragon.animate([
      {transform:'translateX(0) scale(1)'},{transform:'translateX(9px) scale(1.05)'},{transform:'translateX(0) scale(1)'}
    ],{duration:390,easing:'ease-out'});
    if(typeof projectile.animate==='function'){
      try{
        projectile.style.opacity='1';
        attackMotion=projectile.animate([
          {transform:'translate3d(0,0,0) scale(.55)',opacity:0,offset:0},
          {transform:`translate3d(${dx*.1}px,${arc*.6}px,0) scale(${maxScale*.85})`,opacity:1,offset:.12},
          {transform:`translate3d(${dx*.55}px,${dy*.55+arc}px,0) rotate(${element==='forest'?-20:element==='water'?10:0}deg) scale(${maxScale})`,opacity:1,offset:.55},
          {transform:`translate3d(${dx*.91}px,${dy*.91+arc*.15}px,0) scale(${maxScale*1.3})`,opacity:1,offset:.91},
          {transform:`translate3d(${dx}px,${dy}px,0) scale(${maxScale*1.45})`,opacity:0,offset:1}
        ],{duration:1500,easing:'ease-in-out',fill:'forwards'});
        attackMotion.onfinish=hit;
      }catch(error){console.warn('attack animation fallback',error);}
      if(attackMotion)return;
    }
    // Fallback: CSS custom properties keep both the destination and duration accurate.
    projectile.style.setProperty('--flight-x',dx+'px');
    projectile.style.setProperty('--flight-y',dy+'px');
    projectile.classList.add('css-flight');
    attackTimer=setTimeout(hit,1500);
  };
  start().catch(()=>{if(serial===attackSerial)hit();});
  // Android WebView may skip animation finish after an interruption.
  setTimeout(()=>{if(serial===attackSerial&&dialog.open&&!impacted)hit();},2400);
}
function openAttackDialog({correct,used,skill,enemy,remainingHP,answer,points=25,special='',combo=0}){
  stopAttackMotion();
  const el=$('attack-dialog');if(!el||!DRAGONS[used]||!MONSTERS[enemy])return;
  const {stage}=gameInfo(),d=DRAGONS[used],m=MONSTERS[enemy],move=SKILLS[used][skill][0];
  const tier=Math.max(0,Math.min(4,skill));
  const elementClass=['fire','water','forest'].includes(used)?used:'fire';
  const particleCount=6+tier*2;
  const particles=Array.from({length:particleCount},(_,i)=>`<i class="impact-particle" style="--angle:${Math.round(360*i/particleCount)}deg;--distance:${44+tier*7}px;--delay:${(i%3)*35}ms"></i>`).join('');
  el.innerHTML=`<h2 class="attack-heading">⚔️ 드래곤의 공격!</h2>
    <div class="attack-stage" data-element="${elementClass}" data-tier="${tier}">
      <div class="attack-title">${htmlEscape(d.name)} · ${htmlEscape(move)}!</div>
      <div class="figures"><div class="unit attack-dragon"><img src="${dragonArt(used,stage)}" alt="${d.name}"><span>${d.name}</span></div>
        <div class="unit enemy-hit"><img src="${monsterArt(enemy)}" alt="${m.name}"><span class="enemy-name">${htmlEscape(m.name)}</span><span class="enemy-hp">HP ${remainingHP}/100</span></div></div>
      ${correct?`<img class="projectile" src="${effectArt(used,skill)}" alt="기술 ${htmlEscape(move)}가 몬스터에게 날아갑니다">
        <div class="attack-impact" aria-hidden="true"><div class="impact-ring"></div><div class="impact-ring second"></div>${particles}</div>
        <div class="attack-damage" aria-hidden="true">-25</div>`:''}
    </div>
    <div class="attack-result" id="attack-summary">${correct?`✨ 공격 성공! <b>${htmlEscape(m.name)}</b> HP -25<br><span class="attack-points">전투 점수 +${points}점 ${special?htmlEscape(special):combo>=2?'🔥 '+combo+'연속 정답!':''}</span>`:'📖 아쉬워요! 정답은 '+htmlEscape(answer)+'입니다.'}</div>
    <div class="actions equal"><button class="secondary" id="attack-repeat">▶ 다시 보기</button><button class="primary" id="attack-close">✅ 확인</button></div>`;
  try{if(!el.open)el.showModal();}catch{el.setAttribute('open','');}
  playAttackMotion(el,correct,elementClass,tier);
  $('attack-repeat')?.addEventListener('click',()=>openAttackDialog({correct,used,skill,enemy,remainingHP,answer,points,special,combo}));
  $('attack-close')?.addEventListener('click',()=>{stopAttackMotion();if(typeof el.close==='function')el.close();else el.removeAttribute('open');});
  el.addEventListener('cancel',stopAttackMotion,{once:true});
}
