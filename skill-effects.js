/* Hanja PWA v2.1.4: opt-in cosmetic effects for 15 existing skills.
   Never changes learning, scoring, battle HP, inventory or saved progress. */
(() => {
'use strict';
const KINDS={fire:['불꽃탄','화염꼬리','불꽃회오리','화염방사','대화염'],water:['물방울탄','물대포','물의파동','강물베기','대해의파도'],forest:['새싹탄','덩굴채찍','잎날베기','숲의뿌리','고대숲의힘']};
const COLORS={fire:['#ff751c','#ffe16e'],water:['#189fff','#a5efff'],forest:['#4bc669','#d6f8a5']};
const TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
function particle(ctx,x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,Math.max(0.5,r),0,TAU);ctx.fill();}
function ring(ctx,x,y,r,c,width=3){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,TAU);ctx.stroke();}
function stroke(ctx,pts,c,width=4){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function leaf(ctx,x,y,r,ang,c){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-r,0);ctx.quadraticCurveTo(0,-r*1.5,r,0);ctx.quadraticCurveTo(0,r*1.2,-r,0);ctx.fill();ctx.restore();}
function star(ctx,x,y,r,c){stroke(ctx,[[x-r,y],[x+r,y]],c,2);stroke(ctx,[[x,y-r],[x,y+r]],c,2);}
function locate(stage){
 const rect=stage.getBoundingClientRect();
 const d=stage.querySelector('.attack-dragon .sprite-holder, .attack-dragon img')?.getBoundingClientRect();
 const e=stage.querySelector('.enemy-hit img')?.getBoundingClientRect();
 return {w:rect.width,h:rect.height,x:d?d.left+d.width*.70-rect.left:rect.width*.35,
 y:d?d.top+d.height*.43-rect.top:rect.height*.5,
 tx:e?e.left+e.width*.42-rect.left:rect.width*.79,
 ty:e?e.top+e.height*.50-rect.top:rect.height*.52};
}
function draw(ctx,meta,kind,idx,t,seconds){
 const [primary,light]=COLORS[kind],{x,y,tx,ty}=meta;
 const distance=tx-x,dy=ty-y;
 const travel=clamp((t-.22)/.72);
 const bx=mix(x,tx,travel),by=mix(y,ty,travel)-Math.sin(travel*Math.PI)*16;
 ctx.save();ctx.globalAlpha=clamp(t*5)*clamp((1-t)*7);
 // All techniques have different characteristic geometry, rather than a recolored projectile.
 if(kind==='fire'){
  if(idx===0){ // flame orb
   for(let j=0;j<7;j++){const p=travel-j*.055;if(p>0)particle(ctx,mix(x,tx,p),mix(y,ty,p)+8*Math.sin(seconds*7+j),2+j*.7,j%2?primary:light);}
   ring(ctx,bx,by,11+5*Math.sin(seconds*13),primary,5);particle(ctx,bx,by,6,light);
  }else if(idx===1){ // tail slash
   const s=travel*1.35;const pts=Array.from({length:13},(_,i)=>{const v=i/12;return [mix(x,tx,clamp(s*v)),mix(y,ty,clamp(s*v))+30*Math.sin(v*Math.PI*1.5+seconds*2)];});
   stroke(ctx,pts,'#b73010',14);stroke(ctx,pts,primary,8);stroke(ctx,pts,light,2);
  }else if(idx===2){ // cyclone
   for(let j=0;j<3;j++){let pts=Array.from({length:35},(_,k)=>{let a=k/34*TAU*2.1+j*.5+seconds*9,r=4+k*.65;return [bx+Math.cos(a)*r,by+Math.sin(a)*r*.65];});stroke(ctx,pts,j===0?light:primary,2.5);}
  }else if(idx===3){ // fire beam
   const ex=mix(x,tx,travel),ey=mix(y,ty,travel);
   stroke(ctx,[[x,y],[ex,ey]],'#ff5b20',22);stroke(ctx,[[x,y],[ex,ey]],primary,12);stroke(ctx,[[x,y],[ex,ey]],'#fff6a7',4);
   for(let j=0;j<12;j++){const p=j/12*travel;particle(ctx,mix(x,tx,p),mix(y,ty,p)+(j%2?10:-12),2,light);}
  }else{ // meteor
   for(let j=7;j>=0;j--){const p=clamp(travel-j*.045),xx=mix(x,tx,p),yy=mix(y,ty,p)-Math.sin(p*Math.PI)*52;
    ring(ctx,xx,yy,3+j*2,j%2?primary:light,Math.max(1,5-j*.5));}
   particle(ctx,bx,by-22*Math.sin(travel*Math.PI),15+8*travel,primary);particle(ctx,bx,by-22*Math.sin(travel*Math.PI),7,light);
   if(travel>.85)for(let j=0;j<14;j++){const a=j*TAU/14;stroke(ctx,[[tx,ty],[tx+Math.cos(a)*40*(travel-.8)*5,ty+Math.sin(a)*34*(travel-.8)*5]],light,2);}
  }
 } else if(kind==='water'){
  if(idx===0){ // bubbles
   for(let j=0;j<10;j++){const p=clamp(travel-j*.07);ring(ctx,mix(x,tx,p),mix(y,ty,p)+Math.sin(seconds*4+j)*12,3+(j%4),j%2?primary:light,2);}
  }else if(idx===1){ // water cannon
   const ex=mix(x,tx,travel),ey=mix(y,ty,travel);
   stroke(ctx,[[x,y],[ex,ey]],'#1973d8',27);stroke(ctx,[[x,y],[ex,ey]],primary,18);stroke(ctx,[[x,y],[ex,ey]],light,6);
   for(let j=0;j<8;j++)particle(ctx,ex+(j%2?1:-1)*j*2,ey+(j-4)*6,2.5,light);
  }else if(idx===2){ // water pulse
   for(let j=0;j<4;j++){const v=clamp(travel-j*.14);ring(ctx,mix(x,tx,v),mix(y,ty,v),7+23*v, j%2?primary:light,3);}
  }else if(idx===3){ // water blade
   let pts=Array.from({length:22},(_,j)=>{const a=(-.55+j/21*1.5)*Math.PI;return [bx+35*Math.cos(a),by+29*Math.sin(a)];});
   stroke(ctx,pts,'#007cc2',11);stroke(ctx,pts,light,4);star(ctx,bx+10,by,7,'#fff');
  }else{ // tsunami
   for(let k=0;k<3;k++){let pts=Array.from({length:26},(_,j)=>{const p=j/25*travel;return [mix(x,tx,p),mix(y,ty,p)+27*Math.sin(p*10-seconds*6+k*.8)-k*9];});
    stroke(ctx,pts,k===0?light:primary,6-k);}
   for(let j=0;j<9;j++)ring(ctx,bx+(j-4)*5,by+10*Math.sin(j+seconds*5),2+j%3,light,1.5);
  }
 } else {
  if(idx===0){ // sprout seed
   particle(ctx,bx,by,7,primary);leaf(ctx,bx-3,by-8,7,-.7,light);leaf(ctx,bx+5,by-9,7,.5,primary);
  }else if(idx===1){ // vine whip
   let pts=Array.from({length:28},(_,j)=>{const v=j/27*travel;return [mix(x,tx,v),mix(y,ty,v)+22*Math.sin(v*11-seconds*6)];});
   stroke(ctx,pts,'#386c22',12);stroke(ctx,pts,primary,6);
   for(let j=2;j<13;j+=2){const p=j/13*travel;leaf(ctx,mix(x,tx,p),mix(y,ty,p)+22*Math.sin(p*11-seconds*6),7,j*.6,light);}
  }else if(idx===2){ // triple leaf blade
   for(let j=-1;j<=1;j++){let xx=bx,yy=by+j*16;
    stroke(ctx,[[xx-17,yy+10],[xx+17,yy-10]],light,3);leaf(ctx,xx,yy,13,Math.PI/4,primary);}
  }else if(idx===3){ // roots erupt at the opponent
   for(let j=-2;j<=2;j++){const xx=tx+j*12;const top=mix(meta.h+14,ty+10*j*.3,travel);
    stroke(ctx,[[xx,meta.h+10],[xx+7*Math.sin(seconds*6+j),top+19],[xx+16*Math.sin(j),top]],j%2?primary:'#608a2d',7);
    leaf(ctx,xx+12,top,7,j*.5,light);}
  }else{ // ancient forest protection sigil
   for(let j=0;j<8;j++){const a=j*TAU/8+seconds*1.5;leaf(ctx,tx+Math.cos(a)*33,ty+Math.sin(a)*29,12,a, j%2?primary:light);}
   ring(ctx,tx,ty,35+6*Math.sin(seconds*6),light,4);ring(ctx,tx,ty,22,primary,3);
   for(let j=0;j<4;j++)star(ctx,tx+35*Math.cos(j*TAU/4),ty+35*Math.sin(j*TAU/4),6,light);
  }
 }
 // Consistent small impact sparkle; score and HP remain controlled entirely by dragons.js.
 if(travel>.85){const q=clamp((travel-.85)/.15);for(let j=0;j<7;j++){const a=j*TAU/7+idx*.2;const r=12+34*q;particle(ctx,tx+Math.cos(a)*r,ty+Math.sin(a)*r,2.5, j%2?primary:light);}}
 ctx.restore();
}
function attach(stage,dialog){
 if(stage.dataset.hanjaSkillFx==='1'||!stage.querySelector('.projectile'))return;
 const kind=stage.dataset.element,idx=Number(stage.dataset.tier);
 if(!KINDS[kind]||!Number.isInteger(idx)||idx<0||idx>4)return;
 stage.dataset.hanjaSkillFx='1';
 const canvas=document.createElement('canvas');canvas.className='hanja-skill-fx';
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'3',pointerEvents:'none'});
 canvas.setAttribute('aria-hidden','true');stage.append(canvas);
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 let begin=0;
 function frame(now){
   if(!dialog.open||!stage.isConnected)return;
   if(!begin)begin=now;
   const elapsed=now-begin;const t=elapsed/1600;
   const dpr=Math.min(2,window.devicePixelRatio||1);
   const w=Math.max(1,Math.round(stage.clientWidth*dpr)),h=Math.max(1,Math.round(stage.clientHeight*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w/dpr,h/dpr);
   if(t<=1)draw(ctx,locate(stage),kind,idx,t,elapsed/1000);
   if(elapsed<1800)requestAnimationFrame(frame);else canvas.remove();
 }
 requestAnimationFrame(frame);
}
function setup(){
 const dialog=document.getElementById('attack-dialog');if(!dialog)return;
 const check=()=>{const stage=dialog.querySelector('.attack-stage');if(stage)attach(stage,dialog);};
 new MutationObserver(check).observe(dialog,{childList:true});
 check();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
window.HanjaSkillFX={version:'2.1.9',names:KINDS};
})();
