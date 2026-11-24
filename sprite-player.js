/* 한자 탐험대 PWA v2.1.1 - 4-frame image sprite player.
 * Existing dragon portraits remain as fallbacks for stages 2/3 and missing files.
 * Animation frames are drawn from horizontal WebP sprite sheets on one canvas.
 * No changes to learning data, battle accuracy, XP, or storage.
 */
(() => {
  'use strict';
  const available = new Set(['fire','water','forest']);
  const MODES = {idle: {fps: 5, loop: true}, attack: {fps: 8, loop: false}, victory: {fps: 5, loop: false}};
  const cache = new Map();
  const actors = new Set();
  const states = new WeakMap();
  const FRAMES = 4;
  const SIZE = 256;
  let raf = 0;

  function source(key, mode) {return `./assets/animations/dragons/${key}_1_${mode}.webp`;}
  function asset(key, mode) {
    const url=source(key,mode);
    if(!cache.has(url)){
      cache.set(url,new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>image.naturalWidth===FRAMES*SIZE&&image.naturalHeight===SIZE?resolve(image):reject(new Error('Invalid sprite sheet dimensions'));
        image.onerror=()=>reject(new Error('Sprite unavailable: '+url));
        image.src=url;
      }));
    }
    return cache.get(url);
  }
  function show(actor,mode){
    if(!actor||!MODES[mode])return;
    const token=++actor.token;
    actor.mode=mode;
    actor.ended=false;
    asset(actor.key,mode).then(image=>{
      if(token!==actor.token||!actor.holder.isConnected)return;
      actor.image=image;
      actor.start=performance.now();
      actor.last=-1;
      actor.fallback.style.opacity='0';
      actor.canvas.style.display='block';
      draw(actor,0);
      schedule();
    }).catch(()=>{
      // If an animation sheet is absent/corrupt, the original character stays visible.
      if(token===actor.token){actor.canvas.style.display='none';actor.fallback.style.opacity='1';}
    });
  }
  function draw(actor,frame){
    if(!actor.image||actor.last===frame)return;
    const ctx=actor.ctx;
    ctx.clearRect(0,0,SIZE,SIZE);
    ctx.drawImage(actor.image,frame*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
    actor.last=frame;
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(tick);}
  function tick(now){
    raf=0;
    if(document.hidden)return;
    for(const actor of Array.from(actors)){
      if(!actor.holder.isConnected){actors.delete(actor);continue;}
      if(!actor.image)continue;
      const config=MODES[actor.mode]||MODES.idle;
      const elapsed=Math.max(0,(now-actor.start)/1000);
      const raw=Math.floor(elapsed*config.fps);
      const index=config.loop?raw%FRAMES:Math.min(FRAMES-1,raw);
      draw(actor,index);
      if(!config.loop&&!actor.ended&&raw>=FRAMES){
        actor.ended=true;
        show(actor,'idle');
      }
    }
    if(actors.size)schedule();
  }
  function mount(root=document){
    if(!root)return;
    const images=Array.from(root.querySelectorAll('img[data-sprite-dragon]'));
    for(const img of images){
      if(img.dataset.spriteMounted==='1')continue;
      img.dataset.spriteMounted='1';
      const key=img.dataset.spriteDragon,stage=Number(img.dataset.spriteStage);
      if(stage!==1||!available.has(key))continue;
      const holder=document.createElement('span');
      holder.className='sprite-holder';
      holder.dataset.spriteType=key;
      img.parentNode.insertBefore(holder,img);
      holder.appendChild(img);
      const canvas=document.createElement('canvas');
      canvas.className='sprite-canvas';canvas.width=SIZE;canvas.height=SIZE;
      canvas.style.display='none';canvas.setAttribute('aria-hidden','true');
      holder.appendChild(canvas);
      const actor={key,holder,canvas,ctx:canvas.getContext('2d',{alpha:true}),fallback:img,token:0,image:null,last:-1,start:0,mode:'idle',ended:false};
      if(!actor.ctx)continue;
      states.set(holder,actor);actors.add(actor);
      show(actor,MODES[img.dataset.spriteState]?img.dataset.spriteState:'idle');
    }
    schedule();
  }
  function play(root,mode){
    if(!root||!MODES[mode])return;
    const holder=root.matches?.('.sprite-holder')?root:root.querySelector?.('.sprite-holder');
    const actor=holder?states.get(holder):null;
    if(actor)show(actor,mode);
  }
  function install(){
    mount(document);
    const page=document.querySelector('#page-content');
    const modal=document.querySelector('#attack-dialog');
    const observer=new MutationObserver(()=>mount(document));
    if(page)observer.observe(page,{childList:true,subtree:true});
    if(modal)observer.observe(modal,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  }
  window.HanjaSprites={mount,play,version:'2.1.1-phase1'};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
