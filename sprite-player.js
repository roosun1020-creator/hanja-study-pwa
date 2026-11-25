/* 한자 탐험대 PWA v2.1.9 — 1·2·3단계 최종 포즈 재생기
 * 드래곤 9종 × (대기 12 / 공격 14 / 승리 12) 프레임. 실제 키포즈 연결, 광학흐름 보간 없음.
 * 기존 학습·전투 판정·저장 로직을 수정하지 않습니다.
 */
(() => {
  'use strict';
  const ELEMENTS = new Set(['fire', 'water', 'forest']);
  const SIZE = 320;
  const MODES = Object.freeze({
    idle:    { frames: 12, fps: 6.0, loop: true,  linger: 0 },
    attack:  { frames: 14, fps: 9.3, loop: false, linger: 450 },
    victory: { frames: 12, fps: 8.0, loop: false, linger: 750 }
  });
  const imagePromises = new Map();
  const actors = new Set();
  const byHolder = new WeakMap();
  let animationId = 0;

  function loadImage(key, stage, mode) {
    const url = `./assets/animations/dragons/${key}_${stage}_${mode}.webp`;
    if (!imagePromises.has(url)) {
      imagePromises.set(url, new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const size = MODES[mode].frames;
          if (img.naturalWidth !== SIZE * size || img.naturalHeight !== SIZE) {
            reject(new Error(`Invalid sprite size ${url}: ${img.naturalWidth}x${img.naturalHeight}`));
          } else resolve(img);
        };
        img.onerror = () => reject(new Error('Sprite image failed to load: ' + url));
        img.src = url;
      }));
    }
    return imagePromises.get(url);
  }

  function draw(actor, frame) {
    if (!actor.sheet) return;
    if (actor.lastFrame === frame) return;
    const ctx = actor.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // Source frames are individually padded: draw 1:1 to avoid a second shrink.
    ctx.drawImage(actor.sheet, frame * SIZE, 0, SIZE, SIZE, 0, 0, SIZE, SIZE);
    actor.lastFrame = frame;
  }
  function schedule() {
    if (!animationId && !document.hidden) animationId = requestAnimationFrame(tick);
  }
  function changeMode(actor, mode) {
    if (!MODES[mode]) return;
    actor.mode = mode;
    actor.ended = false;
    actor.endAt = 0;
    actor.loading = true; // Hold the last visible frame while the next sheet is loading.
    const token = ++actor.token;
    loadImage(actor.key, actor.stage, mode).then(sheet => {
      if (actor.token !== token || !actor.holder.isConnected) return;
      actor.sheet = sheet;
      actor.loading = false;
      actor.startAt = performance.now();
      actor.lastFrame = -1;
      actor.fallback.style.opacity = '0';
      actor.canvas.style.display = 'block';
      draw(actor, 0);
      schedule();
    }).catch(err => {
      if (actor.token !== token) return;
      console.warn(err.message);
      actor.sheet = null;
      actor.loading = false;
      actor.canvas.style.display = 'none';
      actor.fallback.style.opacity = '1';
    });
  }
  function tick(now) {
    animationId = 0;
    if (document.hidden) return;
    for (const actor of Array.from(actors)) {
      if (!actor.holder.isConnected) {
        actors.delete(actor);
        continue;
      }
      if (!actor.sheet || actor.loading) continue;
      const cfg = MODES[actor.mode];
      const elapsed = Math.max(0, now - actor.startAt);
      const raw = Math.floor((elapsed / 1000) * cfg.fps);
      const frame = cfg.loop ? raw % cfg.frames : Math.min(cfg.frames - 1, raw);
      draw(actor, frame);
      if (!cfg.loop && !actor.ended && elapsed >= cfg.frames * 1000 / cfg.fps) {
        actor.ended = true;
        actor.endAt = now + cfg.linger;
      }
      if (actor.ended && now >= actor.endAt) changeMode(actor, 'idle');
    }
    if (actors.size > 0) schedule();
  }
  function mount(root = document) {
    if (!root?.querySelectorAll) return;
    for (const img of root.querySelectorAll('img[data-sprite-dragon]')) {
      if (img.dataset.spriteMounted === '1') continue;
      img.dataset.spriteMounted = '1';
      const key = img.dataset.spriteDragon;
      const stage = Number(img.dataset.spriteStage);
      // Each stage has its own sprite; fallback stays as original portrait.
      if (!ELEMENTS.has(key) || !Number.isInteger(stage) || stage < 1 || stage > 3 || !img.parentNode) continue;
      const holder = document.createElement('span');
      holder.className = 'sprite-holder';
      holder.dataset.spriteType = key;
      img.parentNode.insertBefore(holder, img);
      holder.appendChild(img);
      const canvas = document.createElement('canvas');
      canvas.className = 'sprite-canvas';
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.style.display = 'none';
      canvas.setAttribute('aria-hidden', 'true');
      holder.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) continue;
      const actor = { key, stage, holder, canvas, ctx, fallback: img, token: 0,
        sheet: null, lastFrame: -1, startAt: 0, mode: 'idle',
        ended: false, endAt: 0, loading: false };
      actors.add(actor);
      byHolder.set(holder, actor);
      changeMode(actor, MODES[img.dataset.spriteState] ? img.dataset.spriteState : 'idle');
    }
    schedule();
  }
  function play(root, mode) {
    if (!root || !MODES[mode]) return;
    const holder = root.matches?.('.sprite-holder') ? root : root.querySelector?.('.sprite-holder');
    const actor = holder ? byHolder.get(holder) : null;
    if (actor) changeMode(actor, mode);
  }
  function setup() {
    mount(document);
    const obs = new MutationObserver(() => mount(document));
    for (const id of ['page-content', 'attack-dialog']) {
      const el = document.getElementById(id);
      if (el) obs.observe(el, { childList: true, subtree: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) schedule();
    });
  }
  window.HanjaSprites = { mount, play, version: '2.1.9', modes: MODES };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else setup();
})();
