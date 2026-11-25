/* ==========================================================================
       Kaveesha Shehara — Interactive Portfolio & Who Am I Engine
       Includes: Meteor Canvas, Scroll Rail & Split Motion, Who Am I Typewriter,
                 3D Telemetry Sphere, 6-Language Switcher (EN/SI/TA/ES/FR/HI),
                 Hardware Spec Modal, CraftMeet Simulator, Polyglot Snippets
       ========================================================================== */

    (function initFallingMeteors() {
      const canvas = document.getElementById('asteroidBgCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      let width = 0;
      let height = 0;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resizeMeteorCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      resizeMeteorCanvas();
      window.addEventListener('resize', resizeMeteorCanvas);

      const meteorTones = [
        { head: '#FFFFFF', mid: 'rgba(255, 115, 175, 0.55)', tail: 'rgba(255, 42, 133, 0)' },
        { head: '#FFFFFF', mid: 'rgba(0, 240, 255, 0.5)', tail: 'rgba(0, 200, 255, 0)' },
        { head: '#FFF5F9', mid: 'rgba(255, 160, 122, 0.48)', tail: 'rgba(255, 42, 133, 0)' },
      ];

      function createMeteor(randomStart = false) {
        const angle = (Math.PI * 0.22) + (Math.random() - 0.5) * 0.16;
        const speed = 3.2 + Math.random() * 4.5;
        const tailLen = 28 + Math.random() * 42;
        const startX = Math.random() * (width + 240) - 80;
        const startY = randomStart ? Math.random() * height : -20 - Math.random() * 220;
        const tone = meteorTones[Math.floor(Math.random() * meteorTones.length)] || meteorTones[0];

        return {
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          tailLen,
          radius: 1.0 + Math.random() * 1.15,
          tone,
          alpha: 0.25 + Math.random() * 0.45,
          twinklePhase: Math.random() * Math.PI * 2,
        };
      }

      const meteors = Array.from({ length: 14 }, () => createMeteor(true));
      let meteorLastTime = 0;

      function drawMeteors(now = 0) {
        if (now - meteorLastTime < 14) {
          requestAnimationFrame(drawMeteors);
          return;
        }
        meteorLastTime = now;
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < meteors.length; i++) {
          const m = meteors[i];
          if (!m || !m.tone) {
            meteors[i] = createMeteor(false);
            continue;
          }

          m.x += m.vx;
          m.y += m.vy;
          m.twinklePhase += 0.06;

          if (m.y - m.tailLen > height + 30 || m.x - m.tailLen > width + 60) {
            meteors[i] = createMeteor(false);
            continue;
          }

          const mag = Math.hypot(m.vx, m.vy) || 1;
          const tailX = m.x - (m.vx / mag) * m.tailLen;
          const tailY = m.y - (m.vy / mag) * m.tailLen;
          const pulse = 0.75 + 0.25 * Math.sin(m.twinklePhase);

          ctx.save();
          ctx.globalAlpha = m.alpha * pulse;

          const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
          grad.addColorStop(0, m.tone.head);
          grad.addColorStop(0.25, m.tone.mid);
          grad.addColorStop(1, m.tone.tail);

          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(0.9, m.radius * 1.15);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          ctx.fillStyle = m.tone.head;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        requestAnimationFrame(drawMeteors);
      }

      requestAnimationFrame(drawMeteors);
    })();

    const scrollLaserBar = document.getElementById('scrollLaserBar');
    const railProgressFill = document.getElementById('railProgressFill');
    const railVelocityTag = document.getElementById('railVelocityTag');
    const heroSection = document.getElementById('heroSection');
    let scrollRafId = null;
    window.heroShatterRatio = 0;
    const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    let cachedShards = [];
    let cachedTypeLines = [];
    let cachedVh = window.innerHeight || 800;
    let cachedDocHeight = 1;
    let cachedHeroHeight = 700;
    let activeTabView = 'portfolio';
    let topTypeTimer = null;
    let topTypedCount = 0;

    function rebuildShardCache() {
      cachedVh = Math.max(1, window.innerHeight);
      cachedDocHeight = Math.max(1, document.documentElement.scrollHeight - cachedVh);
      cachedHeroHeight = heroSection ? Math.max(360, heroSection.offsetHeight) : cachedVh;
      const scrollY = window.scrollY || 0;

      cachedShards = Array.from(document.querySelectorAll('.shard-module')).map((el) => {
        const isHero = !!(heroSection && heroSection.contains(el));
        const rect = el.getBoundingClientRect();
        return {
          el,
          kind: el.getAttribute('data-shard') || 'up',
          isHero,
          docTop: rect.top + scrollY,
          lastState: ''
        };
      });

      cachedTypeLines = Array.from(document.querySelectorAll('.who-type-line')).map((el, idx) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          idx,
          docTop: rect.top + scrollY,
          lastBucket: -1,
          wasTyping: false
        };
      });
    }

    function applyLineProgress(item, p) {
      const clamped = Math.max(0, Math.min(1, p));
      const bucket = Math.round(clamped * 16);
      if (bucket === item.lastBucket) return;
      item.lastBucket = bucket;

      const q = bucket / 16;
      const rem = 1 - q;
      const clipAmt = (rem * 100).toFixed(1);

      item.el.style.clipPath = `inset(0 ${clipAmt}% 0 0)`;
      item.el.style.transform = 'translate3d(0, 0, 0)';
      item.el.style.opacity = q > 0.01 ? `${Math.min(1, 0.6 + q * 0.4).toFixed(2)}` : '0';

      const isTypingNow = q > 0.01 && q < 0.995;
      if (isTypingNow !== item.wasTyping) {
        item.wasTyping = isTypingNow;
        item.el.classList.toggle('who-type-cursor', isTypingNow);
      }
    }

    function startTopToBottomTypewriter() {
      if (topTypeTimer) {
        clearInterval(topTypeTimer);
        topTypeTimer = null;
      }
      topTypedCount = 0;

      for (let i = 0; i < cachedTypeLines.length; i++) {
        const item = cachedTypeLines[i];
        item.lastBucket = -1;
        item.wasTyping = false;
        applyLineProgress(item, 0);
      }

      const initialBatch = Math.min(8, cachedTypeLines.length);
      let step = 0;

      topTypeTimer = setInterval(() => {
        if (activeTabView !== 'whoami') {
          clearInterval(topTypeTimer);
          topTypeTimer = null;
          return;
        }

        step++;
        const progressPerLine = step / 5;

        for (let i = 0; i < initialBatch; i++) {
          const lineP = progressPerLine - i * 0.35;
          if (lineP > 0) {
            applyLineProgress(cachedTypeLines[i], Math.min(1, lineP));
          }
        }

        topTypedCount = Math.min(initialBatch, Math.floor(progressPerLine / 0.35) + 1);

        if (progressPerLine - (initialBatch - 1) * 0.35 >= 1) {
          clearInterval(topTypeTimer);
          topTypeTimer = null;
          updateContinuousScrollEffects();
        }
      }, 24);
    }

    function updateContinuousScrollEffects() {
      scrollRafId = null;
      const currentY = window.scrollY || 0;
      const scrollPct = Math.max(0, Math.min(1, currentY / cachedDocHeight));

      if (scrollLaserBar) {
        scrollLaserBar.style.width = `${(scrollPct * 100).toFixed(1)}%`;
      }
      if (railProgressFill) {
        railProgressFill.style.height = `${(scrollPct * 100).toFixed(1)}%`;
      }
      if (railVelocityTag) {
        railVelocityTag.textContent = `${String(Math.round(scrollPct * 100)).padStart(3, '0')}%`;
      }

      if (activeTabView === 'whoami' && cachedTypeLines.length > 0) {
        const revealStart = cachedVh * 0.96;
        const lineSpan = Math.max(1, cachedVh * 0.08);
        for (let i = 0; i < cachedTypeLines.length; i++) {
          const item = cachedTypeLines[i];
          if (i < topTypedCount) {
            applyLineProgress(item, 1);
            continue;
          }
          const viewTop = item.docTop - currentY;
          const rawP = (revealStart - viewTop) / lineSpan;
          applyLineProgress(item, rawP);
        }
        return;
      }

      const shatter = Math.max(0, Math.min(1, currentY / (cachedHeroHeight * 0.78)));
      window.heroShatterRatio = shatter;
      const easeHero = shatter * shatter;

      const enterStart = cachedVh * 0.96;
      const enterSpan = Math.max(1, cachedVh * 0.42);
      const motionScale = isTouchDevice ? 0.45 : 1;

      for (let i = 0; i < cachedShards.length; i++) {
        const item = cachedShards[i];
        const el = item.el;
        const kind = item.kind;

        if (item.isHero) {
          if (easeHero < 0.002 && item.lastState === 'hero0') continue;
          item.lastState = easeHero < 0.002 ? 'hero0' : 'heroActive';

          if (kind === 'top') {
            el.style.transform = `translate3d(0, ${(-easeHero * 44 * motionScale).toFixed(1)}px, 0)`;
            el.style.opacity = `${(1 - easeHero * 0.85).toFixed(2)}`;
          } else if (kind === 'title') {
            el.style.transform = `translate3d(0, ${(-easeHero * 68 * motionScale).toFixed(1)}px, 0) scale(${(1 + easeHero * 0.06 * motionScale).toFixed(3)})`;
            el.style.opacity = `${(1 - easeHero * 0.9).toFixed(2)}`;
          } else if (kind === 'left') {
            el.style.transform = `translate3d(${(-easeHero * 105).toFixed(1)}px, calc(-50% + ${(easeHero * 30).toFixed(1)}px), 0) rotate(${(-easeHero * 5).toFixed(1)}deg)`;
            el.style.opacity = `${(1 - easeHero * 0.9).toFixed(2)}`;
          } else if (kind === 'right') {
            el.style.transform = `translate3d(${(easeHero * 105).toFixed(1)}px, calc(-50% + ${(easeHero * 30).toFixed(1)}px), 0) rotate(${(easeHero * 5).toFixed(1)}deg)`;
            el.style.opacity = `${(1 - easeHero * 0.9).toFixed(2)}`;
          } else if (kind === 'orb') {
            el.style.transform = `translate3d(0, ${(easeHero * 36 * motionScale).toFixed(1)}px, 0) scale(${(1 + easeHero * 0.12 * motionScale).toFixed(3)})`;
            el.style.opacity = `${(1 - easeHero * 0.7).toFixed(2)}`;
          } else if (kind === 'bottom') {
            el.style.transform = `translate3d(0, ${(easeHero * 56 * motionScale).toFixed(1)}px, 0)`;
            el.style.opacity = `${(1 - easeHero * 0.88).toFixed(2)}`;
          }
          continue;
        }

        const viewTop = item.docTop - currentY;
        const rawProgress = (enterStart - viewTop) / enterSpan;
        const progress = Math.max(0, Math.min(1, rawProgress));
        const rem = Math.pow(1 - progress, 2) * motionScale;

        if (rem < 0.005) {
          if (item.lastState !== 'settled') {
            el.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
            el.style.opacity = '1';
            item.lastState = 'settled';
          }
        } else {
          item.lastState = 'moving';
          let tx = 0;
          let ty = rem * 36;
          let rot = 0;
          let sc = 1 - rem * 0.035;

          if (kind === 'left') {
            tx = -rem * 52;
            ty = rem * 22;
            rot = -rem * 2.2;
          } else if (kind === 'right') {
            tx = rem * 52;
            ty = rem * 22;
            rot = rem * 2.2;
          } else if (kind === 'scale') {
            tx = 0;
            ty = rem * 30;
            sc = 1 - rem * 0.05;
          }

          el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
          el.style.opacity = `${(0.25 + progress * 0.75).toFixed(2)}`;
        }
      }
    }

    // Custom pointer & trail particles
    const waterCursorEl = document.getElementById('customWaterCursor');
    let lastDropTime = 0;
    let prevCursorPos = { x: null, y: null };
    let cursorRafId = null;
    let pendingCursorPos = { x: 0, y: 0 };

    function flushCursorTransform() {
      cursorRafId = null;
      if (waterCursorEl) {
        const sx = pendingCursorPos.x.toFixed(1);
        const sy = pendingCursorPos.y.toFixed(1);
        waterCursorEl.style.opacity = '1';
        waterCursorEl.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
        waterCursorEl.style.setProperty('--cx', `${sx}px`);
        waterCursorEl.style.setProperty('--cy', `${sy}px`);
      }
    }

    function spawnWaterDroplets(x, y, count = 2, burst = false) {
      const particleTones = [
        { bg: '#00F0FF', glow: 'rgba(0, 240, 255, 0.85)' },
        { bg: '#FF2A85', glow: 'rgba(255, 42, 133, 0.85)' },
        { bg: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.9)' },
        { bg: '#FF5CA8', glow: 'rgba(255, 92, 168, 0.8)' },
      ];

      const frag = document.createDocumentFragment();
      const created = [];

      for (let d = 0; d < count; d++) {
        const tone = particleTones[(d + Math.floor(Math.random() * particleTones.length)) % particleTones.length];
        const size = burst ? (4 + Math.random() * 4.5) : (2.5 + Math.random() * 3.5);
        const driftAngle = burst
          ? (Math.PI * 2 * d) / Math.max(1, count) + (Math.random() - 0.5) * 0.45
          : Math.random() * Math.PI * 2;
        const driftDist = burst ? (14 + Math.random() * 20) : (6 + Math.random() * 12);
        const wx = Math.cos(driftAngle) * driftDist;
        const wy = Math.sin(driftAngle) * driftDist - (burst ? 2 : 6);

        const drop = document.createElement('span');
        drop.className = 'water-trail-drop';
        drop.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background-color:${tone.bg};box-shadow:0 0 8px ${tone.glow};--wx:${wx.toFixed(1)}px;--wy:${wy.toFixed(1)}px;`;
        frag.appendChild(drop);
        created.push(drop);
      }

      document.body.appendChild(frag);
      setTimeout(() => {
        for (let i = 0; i < created.length; i++) {
          created[i].remove();
        }
      }, 540);
    }

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      pendingCursorPos.x = e.clientX;
      pendingCursorPos.y = e.clientY;
      if (!cursorRafId) {
        cursorRafId = requestAnimationFrame(flushCursorTransform);
      }

      const now = performance.now();
      const movedDist = prevCursorPos.x === null ? 99 : Math.hypot(e.clientX - prevCursorPos.x, e.clientY - prevCursorPos.y);

      if (now - lastDropTime > 45 && movedDist > 8) {
        prevCursorPos.x = e.clientX;
        prevCursorPos.y = e.clientY;
        lastDropTime = now;
        spawnWaterDroplets(e.clientX, e.clientY, 1, false);
      }
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      if (waterCursorEl) waterCursorEl.style.opacity = '0';
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      if (waterCursorEl && e.pointerType !== 'touch') {
        waterCursorEl.style.opacity = '1';
        waterCursorEl.style.setProperty('--cx', `${e.clientX.toFixed(1)}px`);
        waterCursorEl.style.setProperty('--cy', `${e.clientY.toFixed(1)}px`);
        waterCursorEl.classList.add('is-pressed');
      }
      spawnWaterDroplets(e.clientX, e.clientY, 6, true);

      const sparkCount = 7;
      const palette = ['#00F0FF', '#FF2A85', '#FFFFFF', '#FF5CA8'];

      for (let s = 0; s < sparkCount; s++) {
        const angle = (Math.PI * 2 * s) / sparkCount + (Math.random() - 0.5) * 0.45;
        const dist = 16 + Math.random() * 26;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const size = 3 + Math.random() * 3;
        const color = palette[s % palette.length];

        const dot = document.createElement('span');
        dot.className = 'click-spark-dot';
        dot.style.left = `${e.clientX}px`;
        dot.style.top = `${e.clientY}px`;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 8px ${color}`;
        dot.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        dot.style.setProperty('--dy', `${dy.toFixed(1)}px`);

        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 540);
      }
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (!scrollRafId) {
        scrollRafId = requestAnimationFrame(updateContinuousScrollEffects);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      rebuildShardCache();
      if (!scrollRafId) {
        scrollRafId = requestAnimationFrame(updateContinuousScrollEffects);
      }
    }, { passive: true });

    window.addEventListener('load', () => {
      rebuildShardCache();
      updateContinuousScrollEffects();
    });

    rebuildShardCache();
    updateContinuousScrollEffects();

    (function initOrbitalSphere() {
      const canvas = document.getElementById('orbitalCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      let width = 0;
      let height = 0;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resizeOrbitalCanvas() {
        const rect = canvas.getBoundingClientRect();
        width = Math.max(260, rect.width);
        height = Math.max(260, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      resizeOrbitalCanvas();
      window.addEventListener('resize', resizeOrbitalCanvas);

      const particles = [];
      const coreCount = 1350;
      const haloCount = 260;

      for (let i = 0; i < coreCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const shellBias = Math.random() < 0.78 ? 0.92 + Math.random() * 0.1 : 0.35 + Math.random() * 0.55;

        const x = shellBias * Math.sin(phi) * Math.cos(theta);
        const y = shellBias * Math.cos(phi);
        const z = shellBias * Math.sin(phi) * Math.sin(theta);

        const paletteRoll = Math.random();
        let color = '0, 240, 255';
        if (paletteRoll > 0.93) {
          color = '255, 42, 133';
        } else if (paletteRoll > 0.76) {
          color = '255, 245, 250';
        } else if (paletteRoll > 0.42) {
          color = '0, 200, 255';
        }

        particles.push({
          x,
          y,
          z,
          size: 0.75 + Math.random() * 1.35,
          color,
          isHalo: false,
        });
      }

      for (let i = 0; i < haloCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 1.03 + Math.pow(Math.random(), 1.6) * 0.24;

        particles.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.cos(phi),
          z: r * Math.sin(phi) * Math.sin(theta),
          size: 0.6 + Math.random() * 1.1,
          color: Math.random() > 0.35 ? '0, 240, 255' : '255, 42, 133',
          isHalo: true,
        });
      }

      let rotY = 0;
      let rotX = 0.22;
      let velY = 0.0032;
      let velX = 0.0003;
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      const satellites = [
        {
          label: 'CRAFTMEET',
          targetId: 'projects',
          orbitRx: 1.04,
          orbitRy: 0.62,
          tilt: -0.32,
          angle: 2.35,
          speed: 0.0065,
          accent: '#00F0FF',
          screenX: 0,
          screenY: 0,
        },
        {
          label: 'SRI LANKA UNIPATH',
          targetId: 'affUnipath',
          orbitRx: 1.12,
          orbitRy: 0.72,
          tilt: -0.26,
          angle: 5.55,
          speed: 0.0048,
          accent: '#FF2A85',
          screenX: 0,
          screenY: 0,
        },
      ];

      let hoveredSat = null;
      let pointerPos = { x: -9999, y: -9999, active: false };

      function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      }

      canvas.addEventListener('pointerdown', (e) => {
        const pos = getPointerPos(e);
        for (const sat of satellites) {
          const dist = Math.hypot(pos.x - sat.screenX, pos.y - sat.screenY);
          if (dist < 28) {
            const targetEl = document.getElementById(sat.targetId);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              targetEl.style.borderColor = sat.accent;
              setTimeout(() => { targetEl.style.borderColor = ''; }, 1800);
            }
            return;
          }
        }
        isDragging = true;
        lastX = pos.x;
        lastY = pos.y;
      });

      canvas.addEventListener('pointerleave', () => {
        pointerPos.active = false;
      });

      window.addEventListener('pointermove', (e) => {
        const pos = getPointerPos(e);
        const rect = canvas.getBoundingClientRect();
        const insideCanvas =
          pos.x >= 0 && pos.y >= 0 && pos.x <= rect.width && pos.y <= rect.height;
        pointerPos = { x: pos.x, y: pos.y, active: insideCanvas };
        if (isDragging) {
          const dx = pos.x - lastX;
          const dy = pos.y - lastY;
          rotY += dx * 0.0065;
          rotX += dy * 0.0065;
          velY = dx * 0.0004;
          velX = dy * 0.0004;
          lastX = pos.x;
          lastY = pos.y;
        } else {
          hoveredSat = null;
          for (const sat of satellites) {
            if (Math.hypot(pos.x - sat.screenX, pos.y - sat.screenY) < 26) {
              hoveredSat = sat;
              break;
            }
          }
          canvas.style.cursor = hoveredSat ? 'pointer' : 'grab';
        }
      });

      window.addEventListener('pointerup', () => {
        isDragging = false;
        if (waterCursorEl) waterCursorEl.classList.remove('is-pressed');
      });

      function animateOrb() {
        ctx.clearRect(0, 0, width, height);

        const cx = width * 0.5;
        const cy = height * 0.5;
        const sphereRadius = Math.min(width, height) * 0.31;

        if (!isDragging) {
          rotY += velY;
          rotX += velX;
          velY += (0.0032 - velY) * 0.03;
          velX += (0.0003 - velX) * 0.03;
        }

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        const coreGrad = ctx.createRadialGradient(
          cx - sphereRadius * 0.15,
          cy - sphereRadius * 0.15,
          sphereRadius * 0.08,
          cx,
          cy,
          sphereRadius * 1.18
        );
        coreGrad.addColorStop(0, 'rgba(0, 220, 255, 0.25)');
        coreGrad.addColorStop(0.55, 'rgba(255, 42, 133, 0.14)');
        coreGrad.addColorStop(0.85, 'rgba(255, 110, 64, 0.09)');
        coreGrad.addColorStop(1, 'rgba(7, 5, 15, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius * 1.18, 0, Math.PI * 2);
        ctx.fill();

        const liftRadius = sphereRadius * 0.62;
        const shatterSpread = 1 + (window.heroShatterRatio || 0) * 1.45;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          const x1 = (p.x * cosY - p.z * sinY) * shatterSpread;
          const z1 = (p.z * cosY + p.x * sinY) * shatterSpread;
          const y2 = (p.y * cosX - z1 * sinX) * shatterSpread;
          const z2 = (z1 * cosX + p.y * sinX);
          const basePx = cx + x1 * sphereRadius;
          const basePy = cy + y2 * sphereRadius;

          let liftFactor = 0;
          if (pointerPos.active) {
            const dCursor = Math.hypot(basePx - pointerPos.x, basePy - pointerPos.y);
            if (dCursor < liftRadius) {
              const t = 1 - dCursor / liftRadius;
              liftFactor = t * t;
            }
          }

          const radialLen = Math.hypot(x1, y2, z2) || 1;
          const nx = x1 / radialLen;
          const ny = y2 / radialLen;
          const nz = z2 / radialLen;

          const radialBoost = 1 + liftFactor * 0.24;
          const lx = x1 * radialBoost + nx * liftFactor * 0.08;
          const ly = y2 * radialBoost + ny * liftFactor * 0.08;
          const lz = Math.min(1.45, z2 * radialBoost + nz * liftFactor * 0.14 + liftFactor * 0.18);

          const perspective = 2.6 / (2.6 - lz);
          const px = cx + lx * sphereRadius * perspective;
          const py = cy + ly * sphereRadius * perspective;

          const depthAlpha = lz > 0
            ? 0.35 + Math.min(0.65, lz * 0.65)
            : Math.max(0.06, 0.24 + lz * 0.18);

          const alpha = Math.min(1, (p.isHalo ? depthAlpha * 0.55 : depthAlpha) + liftFactor * 0.35);
          const r = (p.size * (0.75 + (lz + 1) * 0.35)) * (1 + liftFactor * 0.55);

          ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }

        satellites.forEach((sat) => {
          sat.angle += sat.speed;

          const cosTilt = Math.cos(sat.tilt);
          const sinTilt = Math.sin(sat.tilt);

          const trailSteps = 42;
          const trailSpan = 1.65;
          for (let s = 0; s < trailSteps; s++) {
            const t0 = sat.angle - (s / trailSteps) * trailSpan;
            const t1 = sat.angle - ((s + 1) / trailSteps) * trailSpan;

            const lx0 = Math.cos(t0) * sphereRadius * sat.orbitRx;
            const ly0 = Math.sin(t0) * sphereRadius * sat.orbitRy;
            const x0 = cx + (lx0 * cosTilt - ly0 * sinTilt);
            const y0 = cy + (lx0 * sinTilt + ly0 * cosTilt);

            const lx1 = Math.cos(t1) * sphereRadius * sat.orbitRx;
            const ly1 = Math.sin(t1) * sphereRadius * sat.orbitRy;
            const x1 = cx + (lx1 * cosTilt - ly1 * sinTilt);
            const y1 = cy + (lx1 * sinTilt + ly1 * cosTilt);

            const fade = Math.pow(1 - s / trailSteps, 1.7);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(fade * 0.72).toFixed(3)})`;
            ctx.lineWidth = 1.8 * fade + 0.4;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          }

          const lx = Math.cos(sat.angle) * sphereRadius * sat.orbitRx;
          const ly = Math.sin(sat.angle) * sphereRadius * sat.orbitRy;
          const sx = cx + (lx * cosTilt - ly * sinTilt);
          const sy = cy + (lx * sinTilt + ly * cosTilt);
          sat.screenX = sx;
          sat.screenY = sy;

          const isHovered = hoveredSat === sat;

          ctx.strokeStyle = sat.accent;
          ctx.lineWidth = isHovered ? 2 : 1.2;
          ctx.beginPath();
          ctx.arc(sx, sy, isHovered ? 13 : 9.5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(sx, sy, isHovered ? 5.5 : 4.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.save();
          ctx.translate(sx - 14, sy + 6);
          ctx.rotate(0.24);
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isHovered ? sat.accent : 'rgba(255, 255, 255, 0.9)';
          ctx.textAlign = 'right';
          ctx.fillText(sat.label, 0, 0);
          ctx.restore();
        });

        requestAnimationFrame(animateOrb);
      }

      requestAnimationFrame(animateOrb);
    })();

    const TRANSLATIONS = {
      en: {
        tab_whoami: "Who Am I?",
        whoami_badge: "IDENTITY DOSSIER // TAB 02",
        back_to_portfolio: "← BACK TO PORTFOLIO",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // IDENTITY",
            heading: "Who Am I?",
            subheading: "Getting to Know Kaveesha Shehara",
            paragraphs: [
              "Hello! I'm Kaveesha Shehara, a technology enthusiast, creative thinker, and aspiring Full Stack Web Developer from Sri Lanka.",
              "I'm someone who has always been curious about technology, computers, the internet, and how digital experiences are created. I enjoy discovering how things work, exploring new ideas, experimenting with different technologies, and turning my imagination into something real.",
              "I don't see technology as just a collection of computers, software, and programming languages. I see it as a world of endless possibilities where creativity and technical knowledge come together to build something meaningful."
            ]
          },
          {
            id: "my-story",
            tag: "02 // ORIGIN",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "My interest in technology started with computers and gaming. What initially began as curiosity gradually became something much bigger. I became interested in understanding how websites are built, how applications work, how developers create interactive experiences, and how technology connects people around the world.",
              "Instead of limiting myself to simply using technology, I wanted to understand how to create it.",
              "That curiosity led me towards web development. I started learning HTML, CSS, and JavaScript, exploring website design, programming logic, databases, and different development tools.",
              "As I continued learning, I realized that building something from an idea and watching it become a working product is one of the most exciting parts of development."
            ]
          },
          {
            id: "my-passion",
            tag: "03 // ENGINEERING",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "Web development is one of the areas I enjoy exploring the most. I love creating modern website interfaces, experimenting with designs, implementing interactive features, and finding ways to make digital platforms more useful.",
              "I'm particularly interested in Full Stack Development because it allows me to understand both sides of an application: what users see and interact with, and what happens behind the scenes.",
              "I enjoy working with technologies such as:\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "I believe practical experience is one of the best ways to improve. That's why I enjoy building personal projects and learning through real development challenges."
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // HARDWARE & AI",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "There is more to me than just programming.",
              "I'm also passionate about gaming, computer hardware, graphics technology, and PC performance. I enjoy learning about processors, graphics cards, computer components, and the technologies that power modern games.",
              "Artificial Intelligence is another area that fascinates me. I'm interested in how AI can change the future of software development and how it can be integrated into websites and applications.",
              "I also enjoy exploring new software, experimenting with different tools, and discovering technologies that can help me improve my skills."
            ]
          },
          {
            id: "creative-side",
            tag: "05 // IMAGINATION",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "I enjoy thinking differently and approaching problems with creativity. Sometimes an idea starts as something very small, but I like exploring how far I can take it.",
              "Whether it's designing a website, developing a new feature, experimenting with an interface, or solving a technical problem, I enjoy the process of creating and improving things.",
              "For me, the most satisfying feeling is seeing an idea that once existed only in my imagination become something real that other people can use."
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // PHILOSOPHY",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "I believe that learning never really ends, especially in the world of technology.",
              "There is always something new to discover, a skill to improve, a problem to solve, or an idea worth exploring.",
              "I don't believe that being a developer means knowing everything. It means having the curiosity to learn, the patience to solve problems, and the determination to keep improving.",
              "I value creativity, consistency, practical experience, and the willingness to step outside my comfort zone."
            ]
          },
          {
            id: "my-vision",
            tag: "07 // HORIZON",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "I have big ambitions for my future.",
              "I want to become a highly skilled Full Stack Developer, work with modern technologies, build powerful applications, and contribute to meaningful projects.",
              "I also want to explore Artificial Intelligence, advanced software engineering, cloud technologies, and the future of digital innovation.",
              "My goal isn't simply to write code or create websites. I want to build things that people remember, products that solve real problems, and projects that reflect my creativity and abilities.",
              "I'm still learning, experimenting, and developing my skills. I know there is a long journey ahead, and I'm excited about every opportunity to grow."
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // SNAPSHOT",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // CLOSING SIGNAL",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "I'm Kaveesha Shehara — a person with curiosity, creativity, and big dreams.",
              "I'm not here to pretend that I know everything. I'm here to learn, create, experiment, make mistakes, improve, and build something meaningful.",
              "This is my journey, and this is only the beginning.",
              "Thanks for taking the time to get to know me."
            ]
          }
        ],
        nav_orbit: "Orbit",
        nav_about: "Profile",
        nav_projects: "CraftMeet",
        nav_matrix: "Tech Matrix",
        nav_workstation: "Workstation",
        nav_contact: "Transmit",
        hero_edition_left: "SYS.ARCHITECT // FULLSTACK",
        hero_edition_right: "2026 EDITION",
        hud_viewport_label: "ORBITAL VIEWPORT",
        hud_dir_title: "DIRECTIONS:",
        hud_dir_1: "1. DRAG ORB TO ROTATE 3D TELEMETRY FIELD.",
        hud_dir_2: "2. CLICK ORBITING SATELLITES TO INSPECT ECOSYSTEMS.",
        hero_quote: "\"Engineering high-velocity digital universes, real-time gaming ecosystems, and zero-latency fullstack software across every programming language.\"",
        hero_transmission: "INTERCEPTED TRANSMISSION",
        scroll_continue: "Scroll to Continue",
        hero_status: "SYSTEM ONLINE // AVAILABLE FOR GLOBAL DEPLOYMENT",
        photo_badge: "PRIMARY PORTRAIT SLOT",
        upload_prompt: "[ DEVELOPER PORTRAIT ]",
        upload_hint: "Primary Developer Portrait",
        hero_kicker: "FULLSTACK WEB DEVELOPER • POLYGLOT ENGINEER",
        hero_bio: "Engineering high-velocity digital systems from first principles. Proficient across every modern programming language and fullstack architecture—building real-time platforms, scalable cloud infrastructure, and ultra-responsive interfaces built for zero latency.",
        stat_1_label: "LANGUAGE STACK",
        stat_1_val: "ALL LANGUAGES",
        stat_2_label: "FLAGSHIP PLATFORM",
        stat_3_label: "ECOSYSTEM",
        cta_projects: "EXPLORE CRAFTMEET →",
        cta_setup: "INSPECT WORKSTATION",
        proj_kicker: "01 // MISSION-CRITICAL DEPLOYMENT",
        proj_title: "FEATURED ARCHITECTURE",
        cm_badge: "GAMING COMMUNITY PLATFORM",
        cm_desc: "CraftMeet is a modern gaming community platform developed to bring gamers together in one interactive digital space. It provides real-time communication, gaming communities, user profiles, private messaging, tournaments, giveaways, scrims, and competitive leaderboards.",
        cm_stack_label: "CORE STACK & INFRASTRUCTURE",
        cm_upload: "[ CRAFTMEET SHOWCASE ]",
        cm_upload_sub: "CraftMeet UI Preview",
        cm_features_title: "SYSTEM SUBMODULES // 14 CORE CAPABILITIES",
        aff_1_desc: "Collaborative digital engineering, high-performance web architecture, and modern fullstack platform development in Sri Lanka.",
        aff_2_desc: "Next-generation digital solutions, scalable software infrastructure, and unified web platforms engineered for speed and reliability.",
        matrix_kicker: "02 // POLYGLOT CAPABILITY",
        matrix_title: "UNIVERSAL CODE MATRIX",
        matrix_sub: "Full-spectrum command across frontend interfaces, distributed backend engines, real-time databases, systems programming, and cloud deployment.",
        rig_kicker: "03 // COMMAND CENTER TELEMETRY",
        rig_title: "WORKSTATION & HARDWARE",
        rig_hint: "[ CLICK ANY HARDWARE MODULE TO INSPECT SPECS ]",
        rig_photo_label: "FULL DESK & DUAL-MONITOR SETUP",
        rig_upload: "[ WORKSTATION SETUP ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // DIRECT UPLINK",
        footer_title: "INITIATE COLLABORATION",
        footer_sub: "Need a fullstack architect capable of building real-time platforms, custom web applications, or scalable systems in any programming language? Send a direct signal.",
        footer_btn: "TRANSMIT MESSAGE →",
        modal_highlights_label: "KEY TECHNICAL ADVANTAGES",
        modal_role_label: "ROLE IN KAVEESHA'S WORKFLOW",
        inspect_btn: "INSPECT SPECS +",
        features: [
          "Real-Time Chat System",
          "Private Direct Messaging",
          "User Profiles & Customization",
          "XP & Leveling System",
          "Global Leaderboards",
          "Gaming Channels & Communities",
          "Tournaments & Scrims",
          "Giveaways Engine",
          "AI-Powered Chatbot",
          "Google Authentication",
          "Online Users Counter",
          "Typing Indicators",
          "Daily XP Rewards",
          "Anti-Spam Protection"
        ],
        hardware: [
          {
            id: "gpu",
            category: "GRAPHICS & AI ACCELERATION",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Ada Lovelace Architecture • 12GB GDDR6X • DLSS 3",
            score: 97,
            summary: "High-efficiency flagship GPU engineered on NVIDIA's Ada Lovelace architecture, delivering massive parallel compute power for 3D rendering, hardware-accelerated UI pipelines, and local AI model inference.",
            specs: [
              "7,680 CUDA Cores with 3rd-Gen Ray Tracing & 4th-Gen Tensor Cores",
              "12GB ultra-fast GDDR6X memory on a 192-bit high-bandwidth interface",
              "DLSS 3 Frame Generation & AV1 dual hardware encoders for crisp streaming"
            ],
            workflow: "Powers smooth multi-monitor 60fps+ rendering, WebGL/3D visualization testing, video encoding, and local AI experimentation without thermal throttling."
          },
          {
            id: "cpu",
            category: "CENTRAL PROCESSING UNIT",
            name: "AMD Ryzen 7 5700X",
            short: "8-Core / 16-Thread • Up to 4.6GHz Boost • Zen 3",
            score: 94,
            summary: "Precision 8-core, 16-thread Zen 3 desktop processor built for high single-thread responsiveness and sustained multi-core throughput during heavy software builds.",
            specs: [
              "8 Physical Cores & 16 Simultaneous Threads up to 4.6 GHz Max Boost",
              "36MB Combined L2+L3 GameCache for ultra-low memory latency",
              "65W high-efficiency thermal envelope for silent, continuous peak loads"
            ],
            workflow: "Accelerates fullstack code compilation, parallel Docker containers, local Node/Python microservices, and instant hot-module reloading."
          },
          {
            id: "ram",
            category: "HIGH-SPEED SYSTEM MEMORY",
            name: "32GB High-Speed DDR4 RAM",
            short: "Dual-Channel Architecture • Heavy Multitasking",
            score: 93,
            summary: "32GB dual-channel memory array providing ample headroom to keep multiple IDEs, local database instances, virtual machines, and dozens of browser tabs active simultaneously with zero swap lag.",
            specs: [
              "32GB Dual-Channel bandwidth for uninterrupted parallel execution",
              "Zero-bottleneck environment for VS Code, Firebase emulators, and dev tools",
              "High stability under continuous 24/7 development & testing workloads"
            ],
            workflow: "Eliminates memory bottlenecks when running real-time CraftMeet test environments alongside design tools and local servers."
          },
          {
            id: "monitors",
            category: "VISUAL COMMAND DISPLAYS",
            name: "Dual Samsung Monitor Setup",
            short: "Extended Dual-Screen Productivity Array",
            score: 95,
            summary: "Synchronized dual Samsung display setup engineered for wide-field situational awareness—separating live code architecture from real-time browser telemetry and database logs.",
            specs: [
              "Primary Display: Dedicated full-screen IDE, architecture diagrams & terminal",
              "Secondary Display: Live responsive preview, Firebase console & network monitor",
              "Sharp contrast and eye-comfort tuning for marathon coding sessions"
            ],
            workflow: "Doubles active screen workspace so frontend changes, real-time database events, and debugging consoles remain visible simultaneously."
          },
          {
            id: "mic",
            category: "BROADCAST AUDIO INPUT",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "Broadcast-Grade Cardioid Dynamic XLR Capsule",
            score: 94,
            summary: "Professional broadcast dynamic microphone featuring a precision cardioid pickup pattern that captures deep, studio-grade vocal clarity while rejecting ambient room and keyboard noise.",
            specs: [
              "Dynamic cardioid capsule tuned for rich, warm, broadcast-ready voice",
              "Superior off-axis noise rejection eliminates mechanical keyboard clicks",
              "Rugged all-metal studio construction with integrated shock & pop protection"
            ],
            workflow: "Delivers crystal-clear voice communication for international client briefings, team engineering calls, gaming community streams, and voice-AI testing."
          }
        ]
      },

      si: {
        tab_whoami: "මම කවුද?",
        whoami_badge: "පෞද්ගලික විස්තරය // TAB 02",
        back_to_portfolio: "← PORTFOLIO වෙත යන්න",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // හැඳින්වීම",
            heading: "Who Am I?",
            subheading: "Kaveesha Shehara ගැන තවත් දැනගනිමු",
            paragraphs: [
              "ආයුබෝවන්! මම කවීෂ ශෙහාර — ශ්‍රී ලංකාවේ සිටින තාක්ෂණයට ලැදි, නිර්මාණශීලීව සිතන සහ Full Stack Web Developer කෙනෙකු වීමට උත්සාහ කරන තරුණයෙක්.",
              "මම හැමදාමත් තාක්ෂණය, පරිගණක, අන්තර්ජාලය සහ ඩිජිටල් අත්දැකීම් නිර්මාණය වන ආකාරය ගැන කුතුහලයෙන් සිටින කෙනෙක්. දේවල් ක්‍රියාත්මක වන හැටි සොයා බැලීමට, අලුත් අදහස් ගවේෂණය කිරීමට, විවිධ තාක්ෂණයන් අත්හදා බැලීමට සහ මගේ පරිකල්පනය සැබෑ දෙයක් බවට පත් කිරීමට මම කැමතියි.",
              "මම තාක්ෂණය දකින්නේ පරිගණක, මෘදුකාංග සහ ක්‍රමලේඛන භාෂා එකතුවක් ලෙස පමණක් නොවෙයි. නිර්මාණශීලීත්වය සහ තාක්ෂණික දැනුම එක්වී අර්ථවත් යමක් ගොඩනගන නිමක් නැති හැකියාවන්ගෙන් පිරි ලෝකයක් ලෙසයි."
            ]
          },
          {
            id: "my-story",
            tag: "02 // මගේ කතාව",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "තාක්ෂණය කෙරෙහි මගේ උනන්දුව ආරම්භ වුණේ පරිගණක සහ Gaming වලින්. මුලදී තිබුණු කුතුහලය ක්‍රමයෙන් ඊට වඩා විශාල දෙයක් බවට පත් වුණා. වෙබ් අඩවි ගොඩනැගෙන හැටි, ඇප්ලිකේෂන් ක්‍රියා කරන හැටි, Developers ලා අන්තර්ක්‍රියාකාරී අත්දැකීම් නිර්මාණය කරන හැටි සහ තාක්ෂණය ලොව පුරා මිනිසුන් සම්බන්ධ කරන හැටි තේරුම් ගැනීමට මට ආසා හිතුණා.",
              "තාක්ෂණය භාවිතා කිරීමට පමණක් සීමා නොවී, එය නිර්මාණය කරන හැටි ඉගෙන ගැනීමට මට අවශ්‍ය වුණා.",
              "ඒ කුතුහලය මාව Web Development වෙත රැගෙන ගියා. මම HTML, CSS සහ JavaScript ඉගෙන ගන්න පටන් ගත්තා — වෙබ් නිර්මාණය, Programming Logic, Databases සහ විවිධ Development Tools ගවේෂණය කරමින්.",
              "ඉගෙනීම ඉදිරියට යද්දී, අදහසකින් පටන්ගෙන එය ක්‍රියාකාරී නිෂ්පාදනයක් බවට පත්වන හැටි දැකීම Development වල තිබෙන වඩාත්ම ආකර්ෂණීය අත්දැකීමක් බව මට වැටහුණා."
            ]
          },
          {
            id: "my-passion",
            tag: "03 // DEVELOPMENT උනන්දුව",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "Web Development කියන්නේ මම වඩාත්ම කැමැත්තෙන් ගවේෂණය කරන ක්ෂේත්‍රයක්. නවීන වෙබ් අඩවි Interfaces නිර්මාණය කිරීමට, Designs අත්හදා බැලීමට, Interactive Features එකතු කිරීමට සහ ඩිජිටල් වේදිකා වඩාත් ප්‍රයෝජනවත් කිරීමට මම හරිම කැමතියි.",
              "Full Stack Development ගැන මට විශේෂ උනන්දුවක් තියෙනවා — මොකද එමගින් ඇප්ලිකේෂන් එකක පැති දෙකම තේරුම් ගන්න පුළුවන්: පරිශීලකයින්ට පෙනෙන සහ ඔවුන් සමඟ ගනුදෙනු කරන කොටසත්, පසුපසින් සිදුවන ක්‍රියාවලියත්.",
              "මම කැමැත්තෙන් වැඩ කරන තාක්ෂණයන්:\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "දියුණු වීමට ඇති හොඳම ක්‍රමයක් තමයි ප්‍රායෝගික අත්දැකීම. ඒ නිසයි මම පෞද්ගලික ව්‍යාපෘති ගොඩනගමින් සැබෑ Development අභියෝග හරහා ඉගෙන ගන්න කැමති."
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // HARDWARE & AI",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "මගේ හැකියාවන් Coding වලට පමණක් සීමා වෙන්නේ නැහැ.",
              "මම Gaming, Computer Hardware, Graphics Technology සහ PC Performance ගැනත් දැඩි උනන්දුවක් දක්වනවා. Processors, Graphics Cards, Computer Components සහ නවීන Games බලගන්වන තාක්ෂණයන් ගැන ඉගෙන ගන්න මම කැමතියි.",
              "Artificial Intelligence කියන්නෙත් මාව ගොඩක් ආකර්ෂණය කරන ක්ෂේත්‍රයක්. AI මගින් මෘදුකාංග සංවර්ධනයේ අනාගතය වෙනස් වන හැටි සහ එය වෙබ් අඩවි හා ඇප්ලිකේෂන් වලට ඒකාබද්ධ කරන හැටි ගැන මම උනන්දුයි.",
              "අලුත් මෘදුකාංග ගවේෂණය කිරීමට, විවිධ Tools අත්හදා බැලීමට සහ මගේ කුසලතා දියුණු කරගත හැකි තාක්ෂණයන් සොයා ගැනීමටත් මම කැමතියි."
            ]
          },
          {
            id: "creative-side",
            tag: "05 // නිර්මාණශීලීත්වය",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "වෙනස් විදිහකට සිතීමට සහ ගැටලු වලට නිර්මාණශීලීව මුහුණ දීමට මම කැමතියි. සමහර විට අදහසක් පටන් ගන්නේ ඉතා කුඩා දෙයක් ලෙසයි, නමුත් එය කොතරම් දුරකට ගෙන යා හැකිදැයි සොයා බැලීමට මම කැමතියි.",
              "වෙබ් අඩවියක් නිර්මාණය කිරීම වේවා, අලුත් Feature එකක් සංවර්ධනය කිරීම වේවා, Interface එකක් අත්හදා බැලීම හෝ තාක්ෂණික ගැටලුවක් විසඳීම වේවා — දේවල් නිර්මාණය කරන සහ වැඩිදියුණු කරන ක්‍රියාවලියට මම කැමතියි.",
              "මගේ සිතේ පරිකල්පනයක් ලෙස පමණක් තිබූ අදහසක් අන් අයට භාවිතා කළ හැකි සැබෑ දෙයක් බවට පත්වන හැටි දැකීම මට ලැබෙන ලොකුම සතුටයි."
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // මගේ විශ්වාසය",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "ඉගෙනීම කිසිදාක අවසන් නොවන බව මම විශ්වාස කරනවා — විශේෂයෙන් තාක්ෂණික ලෝකයේ.",
              "හැමදාම සොයා ගැනීමට අලුත් දෙයක්, දියුණු කරගැනීමට කුසලතාවයක්, විසඳීමට ගැටලුවක් හෝ ගවේෂණය කිරීමට වටින අදහසක් තියෙනවා.",
              "Developer කෙනෙක් වීම යනු සියල්ල දැන සිටීම කියා මම විශ්වාස කරන්නේ නැහැ. එයින් අදහස් වන්නේ ඉගෙන ගැනීමේ කුතුහලය, ගැටලු විසඳීමේ ඉවසීම සහ දිගටම දියුණු වීමේ අධිෂ්ඨානයයි.",
              "මම නිර්මාණශීලීත්වය, අඛණ්ඩතාව, ප්‍රායෝගික අත්දැකීම් සහ Comfort Zone එකෙන් පිටතට යාමේ කැමැත්ත අගය කරනවා."
            ]
          },
          {
            id: "my-vision",
            tag: "07 // අනාගත දැක්ම",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "මගේ අනාගතය වෙනුවෙන් මට විශාල බලාපොරොත්තු තියෙනවා.",
              "ඉහළ කුසලතා ඇති Full Stack Developer කෙනෙක් වීමට, නවීන තාක්ෂණයන් සමඟ වැඩ කිරීමට, බලවත් ඇප්ලිකේෂන් ගොඩනැගීමට සහ අර්ථවත් ව්‍යාපෘති වලට දායක වීමට මට අවශ්‍යයි.",
              "Artificial Intelligence, උසස් Software Engineering, Cloud Technologies සහ ඩිජිටල් නවෝත්පාදනයේ අනාගතය ගවේෂණය කිරීමටත් මම කැමතියි.",
              "මගේ ඉලක්කය හුදෙක් Code ලිවීම හෝ වෙබ් අඩවි සෑදීම පමණක් නොවෙයි. මිනිසුන්ට මතක සිටින නිර්මාණ, සැබෑ ගැටලු විසඳන නිෂ්පාදන සහ මගේ නිර්මාණශීලීත්වය හා හැකියාවන් පිළිබිඹු කරන ව්‍යාපෘති ගොඩනැගීමයි.",
              "මම තවමත් ඉගෙන ගනිමින්, අත්හදා බලමින් සහ මගේ කුසලතා වර්ධනය කරමින් සිටිනවා. ඉදිරියේ දිගු ගමනක් තිබෙන බව මම දන්නවා — වර්ධනය වීමට ලැබෙන සෑම අවස්ථාවක් ගැනම මම උද්යෝගයෙන් සිටිනවා."
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // කෙටි හැඳින්වීමක්",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // අවසන් සටහන",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "මම කවීෂ ශෙහාර — කුතුහලය, නිර්මාණශීලීත්වය සහ විශාල සිහින ඇති පුද්ගලයෙක්.",
              "මම මෙහි සිටින්නේ සියල්ල දන්නවා යැයි මවා පෑමට නොවෙයි. මම මෙහි සිටින්නේ ඉගෙන ගැනීමට, නිර්මාණය කිරීමට, අත්හදා බැලීමට, වැරදි හදාගෙන දියුණු වීමට සහ අර්ථවත් දෙයක් ගොඩනැගීමටයි.",
              "මේ මගේ ගමනයි — මෙය ආරම්භය පමණයි.",
              "මා ගැන දැනගැනීමට ඔබ ගත් කාලයට බොහොම ස්තූතියි."
            ]
          }
        ],
        nav_orbit: "කක්ෂය",
        nav_about: "පැතිකඩ",
        nav_projects: "CraftMeet",
        nav_matrix: "තාක්ෂණ ජාලය",
        nav_workstation: "පරිගණක පද්ධතිය",
        nav_contact: "සම්බන්ධ වන්න",
        hero_edition_left: "පද්ධති නිර්මාපක // FULLSTACK",
        hero_edition_right: "2026 සංස්කරණය",
        hud_viewport_label: "කක්ෂීය දර්ශනය",
        hud_dir_title: "උපදෙස්:",
        hud_dir_1: "1. 3D ගෝලය කරකැවීමට මවුසයෙන් අදින්න.",
        hud_dir_2: "2. චන්ද්‍රිකා මත ක්ලික් කර ව්‍යාපෘති බලන්න.",
        hero_quote: "\"ඕනෑම ක්‍රමලේඛන භාෂාවකින් අධිවේගී ඩිජිටල් පද්ධති සහ Real-time Gaming වේදිකා නිර්මාණය කිරීම.\"",
        hero_transmission: "පණිවිඩ සම්ප්‍රේෂණය",
        scroll_continue: "පහළට යන්න",
        hero_status: "පද්ධතිය සක්‍රීයයි // ගෝලීය ව්‍යාපෘති සඳහා සූදානම්",
        photo_badge: "ප්‍රධාන ඡායාරූප ස්ථානය",
        upload_prompt: "[ DEVELOPER PORTRAIT ]",
        upload_hint: "ප්‍රධාන ඡායාරූපය",
        hero_kicker: "FULLSTACK WEB DEVELOPER • සියලුම ක්‍රමලේඛන භාෂා ප්‍රවීණයා",
        hero_bio: "නවීනතම තාක්ෂණයෙන් අධිවේගී ඩිජිටල් පද්ධති නිර්මාණය කරන Fullstack Web Developer කෙනෙකි. ඕනෑම Programming Language එකකින් Real-time වෙබ් අඩවි, Cloud පද්ධති සහ Lag නොවන සුපිරි User Interfaces නිර්මාණය කිරීමේ පූර්ණ හැකියාව ඇත.",
        stat_1_label: "ක්‍රමලේඛන භාෂා",
        stat_1_val: "සියලුම භාෂා",
        stat_2_label: "ප්‍රධාන ව්‍යාපෘතිය",
        stat_3_label: "සහයෝගීතා",
        cta_projects: "CRAFTMEET බලන්න →",
        cta_setup: "පරිගණක SETUP එක බලන්න",
        proj_kicker: "01 // ප්‍රධාන මෘදුකාංග නිර්මාණය",
        proj_title: "විශේෂිත ව්‍යාපෘති",
        cm_badge: "GAMING COMMUNITY වේදිකාව",
        cm_desc: "CraftMeet යනු ක්‍රීඩකයින් (Gamers) එකම අන්තර්ක්‍රියාකාරී ඩිජිටල් අවකාශයකට එක් කිරීමට නිර්මාණය කළ නවීන Gaming Community වේදිකාවකි. මෙහි Real-time Chat, Tournaments, Giveaways, Scrims සහ Leaderboards ඇතුළත් වේ.",
        cm_stack_label: "භාවිතා කළ තාක්ෂණයන්",
        cm_upload: "[ CRAFTMEET SHOWCASE ]",
        cm_upload_sub: "CraftMeet UI දර්ශනය",
        cm_features_title: "ප්‍රධාන විශේෂාංග 14",
        aff_1_desc: "ශ්‍රී ලංකාව තුළ නවීන වෙබ් තාක්ෂණය සහ උසස් තත්ත්වයේ Fullstack මෘදුකාංග නිර්මාණ සහයෝගීතාවය.",
        aff_2_desc: "වේගවත් සහ විශ්වාසනීය ඩිජිටල් විසඳුම් සහ නවීන වෙබ් පද්ධති ගොඩනැගීමේ ජාලය.",
        matrix_kicker: "02 // ක්‍රමලේඛන ශක්තිය",
        matrix_title: "විශ්ව කේත ජාලය (CODE MATRIX)",
        matrix_sub: "Frontend, Backend, Databases සහ Cloud තාක්ෂණයන් ඇතුළු ඕනෑම පරිගණක භාෂාවකින් පද්ධති ගොඩනැගීමේ හැකියාව.",
        rig_kicker: "03 // මගේ පරිගණක පද්ධතිය",
        rig_title: "WORKSTATION & HARDWARE",
        rig_hint: "[ විශේෂාංග බැලීමට ඕනෑම කොටසක් මත CLICK කරන්න ]",
        rig_photo_label: "SETUP ඡායාරූපය",
        rig_upload: "[ WORKSTATION SETUP ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // සෘජු සම්බන්ධතාවය",
        footer_title: "ව්‍යාපෘතියක් ආරම්භ කරන්න",
        footer_sub: "ඕනෑම Programming Language එකකින් නවීන වෙබ් අඩවියක් හෝ Real-time පද්ධතියක් නිර්මාණය කර ගැනීමට පණිවිඩයක් එවන්න.",
        footer_btn: "පණිවිඩය යවන්න →",
        modal_highlights_label: "විශේෂ තාක්ෂණික ලක්ෂණ",
        modal_role_label: "මගේ වැඩ කටයුතු වලට ලැබෙන දායකත්වය",
        inspect_btn: "විස්තර බලන්න +",
        features: [
          "Real-Time Chat පද්ධතිය",
          "පෞද්ගලික පණිවිඩ (Direct Messaging)",
          "User Profiles සහ Customization",
          "XP සහ Leveling පද්ධතිය",
          "ගෝලීය Leaderboards",
          "Gaming Channels සහ Communities",
          "Tournaments සහ Scrims",
          "Giveaways පද්ධතිය",
          "AI-Powered Chatbot",
          "Google Authentication",
          "Online Users ගණනය කිරීම",
          "Typing Indicators",
          "දෛනික XP ත්‍යාග (Daily Rewards)",
          "Anti-Spam ආරක්ෂාව"
        ],
        hardware: [
          {
            id: "gpu",
            category: "GRAPHICS & AI වේගවත්කාරකය",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Ada Lovelace • 12GB GDDR6X • DLSS 3",
            score: 97,
            summary: "NVIDIA Ada Lovelace තාක්ෂණයෙන් බලගැන්වුණු අධිවේගී Graphics Card එකකි. 3D Rendering, AI ගණනය කිරීම් සහ අධි-විභේදන (High-FPS) දර්ශන සඳහා සුවිශේෂී වේ.",
            specs: ["7,680 CUDA Cores සහ 4th-Gen Tensor AI Cores", "12GB අධිවේගී GDDR6X Memory", "DLSS 3 Frame Generation සහ AV1 Dual Encoders"],
            workflow: "වේගවත් 3D/WebGL පරීක්ෂණ, Video Rendering සහ AI ආකෘති Lag නොවී ක්‍රියාත්මක කිරීමට උපකාරී වේ."
          },
          {
            id: "cpu",
            category: "ප්‍රධාන සකසනය (PROCESSOR)",
            name: "AMD Ryzen 7 5700X",
            short: "8-Core / 16-Thread • 4.6GHz Boost • Zen 3",
            score: 94,
            summary: "Cores 8ක් සහ Threads 16ක් සහිත Zen 3 ප්‍රොසෙසරයකි. විශාල Codebase Compile කිරීමට සහ එකවර වැඩ රාශියක් කිරීමට ඉතා වේගවත් වේ.",
            specs: ["8 Cores / 16 Threads සහ 4.6 GHz දක්වා Boost වේගය", "36MB විශාල Cache මතකය", "65W අඩු විදුලි පරිභෝජනය සහ අඩු රත්වීම"],
            workflow: "Fullstack Code Compile කිරීම, Docker Containers සහ Local Servers ක්ෂණිකව ක්‍රියාත්මක කිරීමට බලය ලබා දෙයි."
          },
          {
            id: "ram",
            category: "ප්‍රධාන මතකය (MEMORY)",
            name: "32GB High-Speed DDR4 RAM",
            short: "Dual-Channel • අධිවේගී බහුකාර්ය මතකය",
            score: 93,
            summary: "32GB Dual-Channel RAM මතකය නිසා Code Editors, Local Databases, Virtual Machines සහ Browser Tabs විශාල ප්‍රමාණයක් එකවර කිසිදු Lag වීමකින් තොරව භාවිතා කළ හැක.",
            specs: ["32GB Dual-Channel අධිවේගී දත්ත හුවමාරුව", "VS Code, Firebase Emulators සහ Dev Tools එකවර ධාවනය කිරීමේ හැකියාව", "පැය ගණනාවක් එකදිගට වැඩ කිරීමේදී ඉහළ ස්ථාවරත්වය"],
            workflow: "CraftMeet වැනි Real-time පද්ධති පරීක්ෂා කිරීමේදී පරිගණකයේ වේගය කිසිවිටෙක අඩු නොවී පවත්වා ගනී."
          },
          {
            id: "monitors",
            category: "දර්ශන තිර පද්ධතිය",
            name: "Dual Samsung Monitor Setup",
            short: "ද්විත්ව Samsung තිර පද්ධතිය",
            score: 95,
            summary: "වැඩ කිරීමේ කාර්යක්ෂමතාව දෙගුණ කරන Samsung මොනිටර දෙකක පද්ධතියකි. එක් තිරයක Code ලියන අතරතුර අනෙක් තිරයේ Live Output සහ Database පරීක්ෂා කළ හැක.",
            specs: ["ප්‍රධාන තිරය: Full-screen IDE, Code Architecture සහ Terminal", "දෙවන තිරය: Live Browser Preview, Firebase Console සහ Telemetry", "දිගු වේලාවක් කේතනය කිරීමේදී ඇස් වලට පහසු තිර තාක්ෂණය"],
            workflow: "Frontend වෙනස්කම් සහ Real-time Database දත්ත එකම මොහොතේ තිර දෙකකින් නිරීක්ෂණය කිරීමට ඉඩ සලසයි."
          },
          {
            id: "mic",
            category: "වෘත්තීය ශ්‍රව්‍ය පද්ධතිය",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "Broadcast-Grade Cardioid Dynamic XLR",
            score: 94,
            summary: "වෘත්තීය මට්ටමේ Dynamic XLR මයික්‍රොෆෝනයකි. අවට ඇති අනවශ්‍ය ශබ්ද (Keyboard ශබ්ද ආදිය) ඉවත් කර ඉතා පැහැදිලි, ගැඹුරු කටහඬක් ලබා දෙයි.",
            specs: ["Cardioid Dynamic Capsule මගින් පැහැදිලි Broadcast කටහඬක් ලබා දීම", "අවට ශබ්ද සහ Keyboard ශබ්ද අවම කිරීමේ හැකියාව", "ශක්තිමත් සම්පූර්ණ ලෝහමය නිමාව (All-Metal Construction)"],
            workflow: "ජාත්‍යන්තර සේවාදායකයින් සමඟ රැස්වීම්, Team Calls, Streaming සහ Voice-AI පරීක්ෂණ සඳහා සුපිරි ශබ්ද තත්ත්වයක් ලබා දෙයි."
          }
        ]
      },

      ta: {
        tab_whoami: "நான் யார்?",
        whoami_badge: "அடையாள ஆவணம் // TAB 02",
        back_to_portfolio: "← PORTFOLIO செல்லவும்",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // அடையாளம்",
            heading: "Who Am I?",
            subheading: "Kaveesha Shehara பற்றி தெரிந்துகொள்வோம்",
            paragraphs: [
              "வணக்கம்! நான் கவீஷ ஷெஹாரா — இலங்கையைச் சேர்ந்த தொழில்நுட்ப ஆர்வலர், படைப்பாற்றல் சிந்தனையாளர் மற்றும் வளர்ந்து வரும் Full Stack Web Developer.",
              "தொழில்நுட்பம், கணினிகள், இணையம் மற்றும் டிஜிட்டல் அனுபவங்கள் உருவாகும் விதம் குறித்து எப்போதும் ஆர்வத்துடன் இருப்பவன் நான். விஷயங்கள் எப்படி இயங்குகின்றன என்பதை அறிந்துகொள்வதிலும், புதிய யோசனைகளை ஆராய்வதிலும், பல்வேறு தொழில்நுட்பங்களை பரிசோதிப்பதிலும், கற்பனையை நிஜமாக்குவதிலும் எனக்கு ஆர்வம் அதிகம்.",
              "தொழில்நுட்பத்தை வெறும் கணினிகள், மென்பொருட்கள் மற்றும் நிரலாக்க மொழிகளின் தொகுப்பாக நான் பார்க்கவில்லை. படைப்பாற்றலும் தொழில்நுட்ப அறிவும் இணைந்து அர்த்தமுள்ள ஒன்றை உருவாக்கும் முடிவில்லா வாய்ப்புகளின் உலகமாகவே பார்க்கிறேன்."
            ]
          },
          {
            id: "my-story",
            tag: "02 // என் கதை",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "தொழில்நுட்பத்தின் மீதான என் ஆர்வம் கணினிகள் மற்றும் Gaming மூலம் தொடங்கியது. ஆரம்பத்தில் இருந்த ஆர்வம் படிப்படியாக மிகப் பெரிய ஒன்றாக மாறியது. இணையதளங்கள் எவ்வாறு கட்டமைக்கப்படுகின்றன, செயலிகள் எவ்வாறு செயல்படுகின்றன, டெவலப்பர்கள் ஊடாடும் அனுபவங்களை எவ்வாறு உருவாக்குகிறார்கள் மற்றும் உலக மக்களை தொழில்நுட்பம் எவ்வாறு இணைக்கிறது என்பதை அறிய விரும்பினேன்.",
              "தொழில்நுட்பத்தை பயன்படுத்துவதோடு மட்டும் நின்றுவிடாமல், அதை எவ்வாறு உருவாக்குவது என்பதை புரிந்துகொள்ள விரும்பினேன்.",
              "அந்த ஆர்வமே என்னை Web Development பக்கம் கொண்டு சென்றது. HTML, CSS மற்றும் JavaScript கற்றுக்கொள்ளத் தொடங்கினேன்; இணைய வடிவமைப்பு, நிரலாக்க தர்க்கம், தரவுத்தளங்கள் மற்றும் பல்வேறு மேம்பாட்டு கருவிகளை ஆராய்ந்தேன்.",
              "தொடர்ந்து கற்றுக்கொள்ளும்போது, ஒரு யோசனையை செயல்படும் தயாரிப்பாக மாற்றுவது மேம்பாட்டின் மிகவும் உற்சாகமான பகுதி என்பதை உணர்ந்தேன்."
            ]
          },
          {
            id: "my-passion",
            tag: "03 // மேம்பாட்டு ஆர்வம்",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "நான் மிகவும் விரும்பி ஆராயும் துறைகளில் Web Development முதன்மையானது. நவீன இணைய இடைமுகங்களை உருவாக்குவது, வடிவமைப்புகளை பரிசோதிப்பது, ஊடாடும் அம்சங்களை சேர்ப்பது மற்றும் டிஜிட்டல் தளங்களை பயனுள்ளதாக்குவது எனக்கு மிகவும் பிடிக்கும்.",
              "பயனர்கள் காணும் பகுதியையும் பின்னணியில் நடக்கும் செயல்பாட்டையும் புரிந்துகொள்ள உதவுவதால் Full Stack Development எனக்கு மிகவும் பிடித்தமானதாக உள்ளது.",
              "நான் விரும்பி பயன்படுத்தும் தொழில்நுட்பங்கள்:\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "முன்னேறுவதற்கான சிறந்த வழிகளில் ஒன்று நடைமுறை அனுபவம். அதனால்தான் சொந்த திட்டங்களை உருவாக்கி நிஜ சவால்கள் மூலம் கற்றுக்கொள்ள விரும்புகிறேன்."
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // வன்பொருள் & AI",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "நிரலாக்கத்தையும் தாண்டி என்னிடம் பல ஆர்வங்கள் உள்ளன.",
              "Gaming, கணினி வன்பொருள், கிராபிக்ஸ் தொழில்நுட்பம் மற்றும் PC செயல்திறன் ஆகியவற்றிலும் எனக்கு மிகுந்த ஆர்வம் உண்டு. செயலிகள், கிராபிக்ஸ் கார்டுகள், கணினி பாகங்கள் மற்றும் நவீன கேம்களை இயக்கும் தொழில்நுட்பங்களை அறிந்துகொள்ள விரும்புகிறேன்.",
              "Artificial Intelligence என்னை மிகவும் ஈர்க்கும் மற்றொரு துறையாகும். மென்பொருள் மேம்பாட்டின் எதிர்காலத்தை AI எவ்வாறு மாற்றும் மற்றும் இணையதளங்கள், செயலிகளில் அதை எவ்வாறு இணைப்பது என்பதில் ஆர்வமாக உள்ளேன்.",
              "புதிய மென்பொருட்களை ஆராய்வது, புதிய கருவிகளை பரிசோதிப்பது மற்றும் என் திறன்களை வளர்க்கும் தொழில்நுட்பங்களை கண்டறிவதும் எனக்கு பிடிக்கும்."
            ]
          },
          {
            id: "creative-side",
            tag: "05 // படைப்பாற்றல்",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "வித்தியாசமாக சிந்திப்பதும் பிரச்சினைகளை படைப்பாற்றலுடன் அணுகுவதும் எனக்கு பிடிக்கும். சில நேரங்களில் ஒரு யோசனை மிகச் சிறியதாகத் தொடங்கும், ஆனால் அதை எவ்வளவு தூரம் கொண்டு செல்ல முடியும் என்பதை ஆராய விரும்புகிறேன்.",
              "இணையதளம் வடிவமைப்பது, புதிய அம்சத்தை உருவாக்குவது, இடைமுகத்தை பரிசோதிப்பது அல்லது தொழில்நுட்ப சிக்கலைத் தீர்ப்பது எதுவாக இருந்தாலும், உருவாக்கி மேம்படுத்தும் செயல்முறையை ரசிக்கிறேன்.",
              "என் கற்பனையில் மட்டும் இருந்த ஒரு யோசனை, மற்றவர்கள் பயன்படுத்தும் நிஜமாக மாறுவதைக் காண்பதே எனக்கு மிகப்பெரிய திருப்தி."
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // என் நம்பிக்கை",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "கற்றல் ஒருபோதும் முடிவதில்லை என்று நான் நம்புகிறேன் — குறிப்பாக தொழில்நுட்ப உலகில்.",
              "கண்டுபிடிக்க புதிய விஷயங்கள், மேம்படுத்த திறன்கள், தீர்க்க சிக்கல்கள் மற்றும் ஆராய வேண்டிய யோசனைகள் எப்போதும் உள்ளன.",
              "ஒரு டெவலப்பர் என்றால் அனைத்தும் தெரிந்திருக்க வேண்டும் என்று நான் நம்பவில்லை. கற்கும் ஆர்வம், சிக்கல்களைத் தீர்க்கும் பொறுமை மற்றும் தொடர்ந்து மேம்படும் உறுதியே முக்கியம்.",
              "படைப்பாற்றல், தொடர்ச்சி, நடைமுறை அனுபவம் மற்றும் வசதியான எல்லையைத் தாண்டி முயற்சிக்கும் மனப்பான்மையை நான் மதிக்கிறேன்."
            ]
          },
          {
            id: "my-vision",
            tag: "07 // எதிர்கால நோக்கம்",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "என் எதிர்காலத்திற்காக எனக்குப் பெரிய லட்சியங்கள் உள்ளன.",
              "மிகத் திறமையான Full Stack Developer ஆகி, நவீன தொழில்நுட்பங்களுடன் பணியாற்றி, சக்திவாய்ந்த செயலிகளை உருவாக்கி அர்த்தமுள்ள திட்டங்களில் பங்களிக்க விரும்புகிறேன்.",
              "Artificial Intelligence, மேம்பட்ட மென்பொருள் பொறியியல், Cloud தொழில்நுட்பங்கள் மற்றும் டிஜிட்டல் புதுமையின் எதிர்காலத்தையும் ஆராய விரும்புகிறேன்.",
              "வெறும் குறியீடு எழுதுவதோ இணையதளம் உருவாக்குவதோ மட்டும் என் இலக்கல்ல. மக்கள் நினைவில் கொள்ளும் படைப்புகள், நிஜ சிக்கல்களைத் தீர்க்கும் தயாரிப்புகள் மற்றும் என் படைப்பாற்றலையும் திறனையும் பிரதிபலிக்கும் திட்டங்களை உருவாக்க விரும்புகிறேன்.",
              "நான் இன்னும் கற்றுக்கொண்டு, பரிசோதித்து, திறன்களை வளர்த்து வருகிறேன். நீண்ட பயணம் முன்னால் உள்ளது; வளரக் கிடைக்கும் ஒவ்வொரு வாய்ப்பையும் உற்சாகத்துடன் வரவேற்கிறேன்."
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // சுருக்கமான விவரம்",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // இறுதி வார்த்தைகள்",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "நான் கவீஷ ஷெஹாரா — ஆர்வம், படைப்பாற்றல் மற்றும் பெரிய கனவுகளைக் கொண்ட ஒரு மனிதன்.",
              "எனக்கு எல்லாம் தெரியும் என்று காட்டிக்கொள்ள நான் இங்கு இல்லை. கற்கவும், உருவாக்கவும், பரிசோதிக்கவும், தவறுகளிலிருந்து திருத்திக்கொண்டு மேம்படவும், அர்த்தமுள்ள ஒன்றை கட்டமைக்கவுமே இங்கு இருக்கிறேன்.",
              "இது என் பயணம் — இது வெறும் தொடக்கம்தான்.",
              "என்னைப் பற்றி அறிந்துகொள்ள நேரத்தை செலவிட்டதற்கு நன்றி."
            ]
          }
        ],
        nav_orbit: "சுற்றுப்பாதை",
        nav_about: "சுயவிவரம்",
        nav_projects: "CraftMeet",
        nav_matrix: "தொழில்நுட்பம்",
        nav_workstation: "கணினி அமைப்பு",
        nav_contact: "தொடர்பு",
        hero_edition_left: "கணினி வடிவமைப்பாளர் // FULLSTACK",
        hero_edition_right: "2026 பதிப்பு",
        hud_viewport_label: "சுற்றுப்பாதை பார்வை",
        hud_dir_title: "வழிகாட்டுதல்கள்:",
        hud_dir_1: "1. 3D கோளத்தை சுழற்ற இழுக்கவும்.",
        hud_dir_2: "2. செயற்கைக்கோள்களை கிளிக் செய்து பார்க்கவும்.",
        hero_quote: "\"அனைத்து நிரலாக்க மொழிகளிலும் அதிவேக டிஜிட்டல் அமைப்புகள் மற்றும் Real-time கேமிங் தளங்களை உருவாக்குதல்.\"",
        hero_transmission: "இடைமறிக்கப்பட்ட செய்தி",
        scroll_continue: "கீழே செல்லவும்",
        hero_status: "கணினி செயலில் உள்ளது // உலகளாவிய திட்டங்களுக்கு தயார்",
        photo_badge: "முதன்மை புகைப்பட இடம்",
        upload_prompt: "[ DEVELOPER PORTRAIT ]",
        upload_hint: "முதன்மை புகைப்படம்",
        hero_kicker: "FULLSTACK WEB DEVELOPER • அனைத்து நிரலாக்க மொழி நிபுணர்",
        hero_bio: "அதிவேக டிஜிட்டல் அமைப்புகளை உருவாக்கும் Fullstack Web Developer. அனைத்து நவீன நிரலாக்க மொழிகளிலும் நிபுணத்துவம் பெற்றவர்—Real-time தளங்கள், Cloud கட்டமைப்புகள் மற்றும் பூஜ்ஜிய தாமதம் கொண்ட இணையதளங்களை உருவாக்குகிறார்.",
        stat_1_label: "நிரலாக்க மொழிகள்",
        stat_1_val: "அனைத்து மொழிகள்",
        stat_2_label: "முதன்மை தளம்",
        stat_3_label: "கூட்டாண்மை",
        cta_projects: "CRAFTMEET பார்க்கவும் →",
        cta_setup: "WORKSTATION பார்க்கவும்",
        proj_kicker: "01 // முதன்மை மென்பொருள் திட்டம்",
        proj_title: "சிறப்பு கட்டமைப்பு",
        cm_badge: "GAMING COMMUNITY தளம்",
        cm_desc: "CraftMeet என்பது விளையாட்டாளர்களை (Gamers) ஒரே டிஜிட்டல் இடத்தில் ஒன்றிணைக்க உருவாக்கப்பட்ட நவீன Gaming Community தளமாகும். இதில் Real-time Chat, Tournaments, Giveaways, Scrims மற்றும் Leaderboards உள்ளன.",
        cm_stack_label: "பயன்படுத்தப்பட்ட தொழில்நுட்பங்கள்",
        cm_upload: "[ CRAFTMEET SHOWCASE ]",
        cm_upload_sub: "CraftMeet UI முன்னோட்டம்",
        cm_features_title: "14 முக்கிய சிறப்பம்சங்கள்",
        aff_1_desc: "இலங்கையில் நவீன இணைய தொழில்நுட்பம் மற்றும் உயர்தர Fullstack மென்பொருள் மேம்பாட்டு கூட்டாண்மை.",
        aff_2_desc: "வேகமான மற்றும் நம்பகமான டிஜிட்டல் தீர்வுகளை உருவாக்கும் நவீன மென்பொருள் தளம்.",
        matrix_kicker: "02 // நிரலாக்க திறன்",
        matrix_title: "உலகளாவிய குறியீடு அணி",
        matrix_sub: "Frontend, Backend, Databases மற்றும் Cloud உட்பட எந்தவொரு நிரலாக்க மொழியிலும் முழுமையான மென்பொருள் உருவாக்கம்.",
        rig_kicker: "03 // கணினி வன்பொருள் விவரம்",
        rig_title: "WORKSTATION & HARDWARE",
        rig_hint: "[ விவரங்களை அறிய எந்த வன்பொருளையும் கிளிக் செய்யவும் ]",
        rig_photo_label: "SETUP புகைப்படம்",
        rig_upload: "[ WORKSTATION SETUP ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // நேரடி தொடர்பு",
        footer_title: "இணைந்து பணியாற்றுவோம்",
        footer_sub: "எந்தவொரு நிரலாக்க மொழியிலும் நவீன இணையதளம் அல்லது Real-time அமைப்பை உருவாக்க செய்தி அனுப்புங்கள்.",
        footer_btn: "செய்தி அனுப்பு →",
        modal_highlights_label: "முக்கிய தொழில்நுட்ப சிறப்புகள்",
        modal_role_label: "பணிப்பாய்வில் இதன் பங்கு",
        inspect_btn: "விவரம் பார்க்க +",
        features: [
          "Real-Time Chat அமைப்பு",
          "தனிப்பட்ட நேரடி செய்திகள் (DM)",
          "பயனர் சுயவிவரங்கள் & தனிப்பயனாக்கம்",
          "XP & Leveling அமைப்பு",
          "உலகளாவிய Leaderboards",
          "Gaming Channels & சமூகங்கள்",
          "Tournaments & Scrims",
          "Giveaways அமைப்பு",
          "AI-Powered Chatbot",
          "Google அங்கீகாரம்",
          "ஆன்லைன் பயனர் எண்ணிக்கை",
          "Typing Indicators",
          "தினசரி XP வெகுமதிகள்",
          "Anti-Spam பாதுகாப்பு"
        ],
        hardware: [
          {
            id: "gpu",
            category: "GRAPHICS & AI முடுக்கி",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Ada Lovelace • 12GB GDDR6X • DLSS 3",
            score: 97,
            summary: "NVIDIA Ada Lovelace கட்டமைப்பில் உருவாக்கப்பட்ட சக்திவாய்ந்த GPU. 3D Rendering, AI கணக்கீடுகள் மற்றும் அதிவேக கிராபிக்ஸ் செயலாக்கத்திற்கு சிறந்தது.",
            specs: ["7,680 CUDA Cores & 4th-Gen Tensor Cores", "12GB அதிவேக GDDR6X நினைவகம்", "DLSS 3 மற்றும் AV1 Dual Encoders"],
            workflow: "3D/WebGL சோதனைகள், வீடியோ எடிட்டிங் மற்றும் AI மாடல்களை தடையின்றி இயக்க உதவுகிறது."
          },
          {
            id: "cpu",
            category: "மத்திய செயலகம் (CPU)",
            name: "AMD Ryzen 7 5700X",
            short: "8-Core / 16-Thread • 4.6GHz Boost • Zen 3",
            score: 94,
            summary: "8 கோர்கள் மற்றும் 16 த்ரெட்கள் கொண்ட அதிவேக Zen 3 செயலி. பெரிய குறியீடுகளை Compile செய்யவும் பல்பணிக்கும் சிறந்தது.",
            specs: ["8 Cores / 16 Threads மற்றும் 4.6 GHz வேகம்", "36MB Cache நினைவகம்", "65W குறைந்த வெப்ப வெளியீடு"],
            workflow: "Fullstack குறியீடு தொகுப்பு, Docker மற்றும் Local Servers ஆகியவற்றை விரைவாக இயக்குகிறது."
          },
          {
            id: "ram",
            category: "கணினி நினைவகம் (RAM)",
            name: "32GB High-Speed DDR4 RAM",
            short: "Dual-Channel • அதிவேக பல்பணி நினைவகம்",
            score: 93,
            summary: "32GB நினைவகம் பல IDE-கள், Local Databases மற்றும் Browser தாவல்களை ஒரே நேரத்தில் தாமதமின்றி இயக்க உதவுகிறது.",
            specs: ["32GB Dual-Channel அலைவரிசை", "VS Code மற்றும் Firebase Emulators தடையின்றி இயங்கும்", "தொடர்ச்சியான பணிகளுக்கு அதிக நிலைத்தன்மை"],
            workflow: "Real-time சோதனை சூழல்களை இயக்கும்போது கணினியின் வேகத்தை சீராக வைத்திருக்கிறது."
          },
          {
            id: "monitors",
            category: "காட்சித் திரைகள்",
            name: "Dual Samsung Monitor Setup",
            short: "இரட்டை Samsung திரை அமைப்பு",
            score: 95,
            summary: "ஒரு திரையில் குறியீடு எழுதவும், மற்றொரு திரையில் நேரடி வெளியீடு மற்றும் தரவுத்தளத்தை பார்க்கவும் உதவும் இரட்டை திரை அமைப்பு.",
            specs: ["முதன்மை திரை: IDE மற்றும் Terminal", "இரண்டாம் திரை: Live Preview மற்றும் Firebase Console", "நீண்ட நேரப் பணிக்கு ஏற்ற தெளிவான காட்சி"],
            workflow: "குறியீடு மாற்றங்களையும் நேரடி தரவுத்தள நிகழ்வுகளையும் ஒரே நேரத்தில் கண்காணிக்க உதவுகிறது."
          },
          {
            id: "mic",
            category: "ஒலிப்பதிவு கருவி",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "Broadcast-Grade Cardioid Dynamic XLR",
            score: 94,
            summary: "சுற்றுப்புற இரைச்சலைத் தவிர்த்து தெளிவான, ஸ்டுடியோ தரத்திலான குரலைப் பதிவு செய்யும் தொழில்முறை Dynamic XLR மைக்ரோஃபோன்.",
            specs: ["Cardioid Dynamic Capsule மூலம் தெளிவான குரல் பதிவு", "கீபோர்டு மற்றும் வெளிப்புற சத்தங்களைக் குறைக்கும் திறன்", "உறுதியான முழு உலோக வடிவமைப்பு"],
            workflow: "சர்வதேச அழைப்புகள், குழு கூட்டங்கள், Streaming மற்றும் Voice-AI சோதனைகளுக்கு தெளிவான ஒலியை வழங்குகிறது."
          }
        ]
      },

      es: {
        tab_whoami: "¿Quién Soy?",
        whoami_badge: "EXPEDIENTE DE IDENTIDAD // TAB 02",
        back_to_portfolio: "← VOLVER AL PORTFOLIO",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // IDENTIDAD",
            heading: "Who Am I?",
            subheading: "Conociendo a Kaveesha Shehara",
            paragraphs: [
              "¡Hola! Soy Kaveesha Shehara, un entusiasta de la tecnología, pensador creativo y aspirante a Full Stack Web Developer de Sri Lanka.",
              "Siempre he sentido curiosidad por la tecnología, las computadoras, internet y cómo se crean las experiencias digitales. Disfruto descubrir cómo funcionan las cosas, explorar nuevas ideas, experimentar con distintas tecnologías y convertir mi imaginación en algo real.",
              "No veo la tecnología solo como una colección de computadoras, software y lenguajes de programación. La veo como un mundo de posibilidades infinitas donde la creatividad y el conocimiento técnico se unen para construir algo significativo."
            ]
          },
          {
            id: "my-story",
            tag: "02 // HISTORIA",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "Mi interés por la tecnología comenzó con las computadoras y los videojuegos. Lo que empezó como curiosidad se convirtió poco a poco en algo mucho más grande. Quería entender cómo se construyen los sitios web, cómo funcionan las aplicaciones, cómo los desarrolladores crean experiencias interactivas y cómo la tecnología conecta a las personas en todo el mundo.",
              "En lugar de limitarme a usar la tecnología, quise aprender a crearla.",
              "Esa curiosidad me llevó hacia el desarrollo web. Comencé aprendiendo HTML, CSS y JavaScript, explorando diseño web, lógica de programación, bases de datos y diversas herramientas de desarrollo.",
              "A medida que seguía aprendiendo, me di cuenta de que tomar una idea y verla convertirse en un producto funcional es una de las partes más emocionantes del desarrollo."
            ]
          },
          {
            id: "my-passion",
            tag: "03 // DESARROLLO",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "El desarrollo web es una de las áreas que más disfruto explorar. Me encanta crear interfaces web modernas, experimentar con diseños, implementar funciones interactivas y hacer que las plataformas digitales sean más útiles.",
              "Me atrae especialmente el desarrollo Full Stack porque me permite comprender ambos lados de una aplicación: lo que los usuarios ven e interactúan, y lo que ocurre detrás de escena.",
              "Disfruto trabajar con tecnologías como:\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "Creo que la experiencia práctica es una de las mejores formas de mejorar. Por eso me gusta crear proyectos personales y aprender mediante desafíos reales de desarrollo."
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // HARDWARE E IA",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "Hay más en mí que solo programación.",
              "También me apasionan los videojuegos, el hardware de PC, la tecnología gráfica y el rendimiento del sistema. Disfruto aprender sobre procesadores, tarjetas gráficas, componentes y las tecnologías que impulsan los juegos modernos.",
              "La inteligencia artificial es otra área que me fascina. Me interesa cómo la IA puede transformar el futuro del desarrollo de software y cómo integrarla en sitios web y aplicaciones.",
              "También disfruto explorar nuevo software, probar distintas herramientas y descubrir tecnologías que me ayuden a perfeccionar mis habilidades."
            ]
          },
          {
            id: "creative-side",
            tag: "05 // CREATIVIDAD",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "Disfruto pensar de forma diferente y abordar los problemas con creatividad. A veces una idea nace muy pequeña, pero me gusta explorar hasta dónde puedo llevarla.",
              "Ya sea diseñando una web, desarrollando una nueva función, probando una interfaz o resolviendo un problema técnico, disfruto el proceso de crear y mejorar.",
              "Para mí, la sensación más gratificante es ver una idea que antes solo existía en mi imaginación convertida en algo real que otras personas pueden usar."
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // FILOSOFÍA",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "Creo que el aprendizaje nunca termina realmente, especialmente en el mundo de la tecnología.",
              "Siempre hay algo nuevo por descubrir, una habilidad por mejorar, un problema por resolver o una idea que vale la pena explorar.",
              "No creo que ser desarrollador signifique saberlo todo. Significa tener la curiosidad para aprender, la paciencia para resolver problemas y la determinación para seguir mejorando.",
              "Valoro la creatividad, la constancia, la experiencia práctica y la disposición para salir de mi zona de confort."
            ]
          },
          {
            id: "my-vision",
            tag: "07 // VISIÓN",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "Tengo grandes ambiciones para mi futuro.",
              "Quiero convertirme en un Full Stack Developer altamente capacitado, trabajar con tecnologías modernas, construir aplicaciones potentes y aportar a proyectos significativos.",
              "También quiero explorar la inteligencia artificial, la ingeniería de software avanzada, las tecnologías en la nube y el futuro de la innovación digital.",
              "Mi meta no es simplemente escribir código o crear sitios web. Quiero construir cosas que la gente recuerde, productos que resuelvan problemas reales y proyectos que reflejen mi creatividad y capacidades.",
              "Sigo aprendiendo, experimentando y desarrollando mis habilidades. Sé que hay un largo camino por delante y me entusiasma cada oportunidad para crecer."
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // PERFIL RÁPIDO",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // ÚLTIMA SEÑAL",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "Soy Kaveesha Shehara: alguien con curiosidad, creatividad y grandes sueños.",
              "No estoy aquí para fingir que lo sé todo. Estoy aquí para aprender, crear, experimentar, cometer errores, mejorar y construir algo significativo.",
              "Este es mi viaje y esto es solo el comienzo.",
              "Gracias por tomarte el tiempo de conocerme."
            ]
          }
        ],
        nav_orbit: "Órbita",
        nav_about: "Perfil",
        nav_projects: "CraftMeet",
        nav_matrix: "Matriz Tech",
        nav_workstation: "Estación",
        nav_contact: "Transmitir",
        hero_edition_left: "ARQ.SISTEMAS // FULLSTACK",
        hero_edition_right: "EDICIÓN 2026",
        hud_viewport_label: "VISOR ORBITAL",
        hud_dir_title: "INSTRUCCIONES:",
        hud_dir_1: "1. ARRASTRA EL ORBE PARA ROTAR EL CAMPO 3D.",
        hud_dir_2: "2. HAZ CLIC EN LOS SATÉLITES PARA EXPLORAR.",
        hero_quote: "\"Ingeniería de universos digitales de alta velocidad, ecosistemas gaming en tiempo real y software fullstack sin latencia.\"",
        hero_transmission: "TRANSMISIÓN INTERCEPTADA",
        scroll_continue: "Desplazar para Continuar",
        hero_status: "SISTEMA EN LÍNEA // DISPONIBLE PARA DESPLIEGUE GLOBAL",
        photo_badge: "RANURA DE RETRATO PRINCIPAL",
        upload_prompt: "[ RETRATO PRINCIPAL ]",
        upload_hint: "Retrato del desarrollador",
        hero_kicker: "DESARROLLADOR WEB FULLSTACK • INGENIERO POLÍGLOTA",
        hero_bio: "Ingeniería de sistemas digitales de alta velocidad desde primeros principios. Dominio de todos los lenguajes de programación modernos y arquitectura fullstack: plataformas en tiempo real, nube escalable e interfaces sin latencia.",
        stat_1_label: "LENGUAJES",
        stat_1_val: "TODOS LOS LENGUAJES",
        stat_2_label: "PLATAFORMA INSIGNIA",
        stat_3_label: "ECOSISTEMA",
        cta_projects: "EXPLORAR CRAFTMEET →",
        cta_setup: "INSPECCIONAR ESTACIÓN",
        proj_kicker: "01 // DESPLIEGUE DE MISIÓN CRÍTICA",
        proj_title: "ARQUITECTURA DESTACADA",
        cm_badge: "PLATAFORMA COMUNITARIA GAMING",
        cm_desc: "CraftMeet es una plataforma moderna de comunidad gaming desarrollada para unir jugadores en un espacio digital interactivo. Ofrece comunicación en tiempo real, comunidades, perfiles, mensajería privada, torneos, sorteos, scrims y tablas de clasificación.",
        cm_stack_label: "INFRAESTRUCTURA Y TECNOLOGÍAS",
        cm_upload: "[ VISTA PREVIA CRAFTMEET ]",
        cm_upload_sub: "Interfaz de CraftMeet",
        cm_features_title: "SUBMÓDULOS // 14 CAPACIDADES PRINCIPALES",
        aff_1_desc: "Ingeniería digital colaborativa, arquitectura web de alto rendimiento y desarrollo fullstack en Sri Lanka.",
        aff_2_desc: "Soluciones digitales de próxima generación e infraestructura de software escalable diseñada para máxima velocidad.",
        matrix_kicker: "02 // CAPACIDAD POLÍGLOTA",
        matrix_title: "MATRIZ DE CÓDIGO UNIVERSAL",
        matrix_sub: "Dominio integral en frontend, motores backend distribuidos, bases de datos en tiempo real, sistemas y despliegue en la nube.",
        rig_kicker: "03 // TELEMETRÍA DEL CENTRO DE MANDO",
        rig_title: "ESTACIÓN DE TRABAJO Y HARDWARE",
        rig_hint: "[ HAZ CLIC EN CUALQUIER COMPONENTE PARA VER DETALLES ]",
        rig_photo_label: "FOTO DEL SETUP",
        rig_upload: "[ ESTACIÓN DE TRABAJO ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // ENLACE DIRECTO",
        footer_title: "INICIAR COLABORACIÓN",
        footer_sub: "¿Necesitas un arquitecto fullstack capaz de construir plataformas en tiempo real o sistemas escalables en cualquier lenguaje? Envía una señal.",
        footer_btn: "TRANSMITIR MENSAJE →",
        modal_highlights_label: "VENTAJAS TÉCNICAS CLAVE",
        modal_role_label: "ROL EN EL FLUJO DE TRABAJO",
        inspect_btn: "VER ESPECIFICACIONES +",
        features: [
          "Sistema de Chat en Tiempo Real",
          "Mensajería Directa Privada",
          "Perfiles y Personalización",
          "Sistema de XP y Niveles",
          "Clasificaciones Globales",
          "Canales y Comunidades Gaming",
          "Torneos y Scrims",
          "Sistema de Sorteos (Giveaways)",
          "Chatbot Impulsado por IA",
          "Autenticación con Google",
          "Contador de Usuarios en Línea",
          "Indicadores de Escritura",
          "Recompensas Diarias de XP",
          "Protección Anti-Spam"
        ],
        hardware: [
          {
            id: "gpu",
            category: "ACELERACIÓN GRÁFICA E IA",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Arquitectura Ada Lovelace • 12GB GDDR6X • DLSS 3",
            score: 97,
            summary: "GPU insignia de alta eficiencia basada en Ada Lovelace, que ofrece potencia masiva de cómputo paralelo para renderizado 3D e inferencia de IA.",
            specs: ["7,680 núcleos CUDA y Tensor Cores de 4.ª gen.", "12GB de memoria ultrarrápida GDDR6X", "Generación de fotogramas DLSS 3 y codificadores duales AV1"],
            workflow: "Impulsa renderizado fluido a 60fps+, pruebas WebGL/3D, codificación de video y modelos de IA locales."
          },
          {
            id: "cpu",
            category: "UNIDAD CENTRAL DE PROCESAMIENTO",
            name: "AMD Ryzen 7 5700X",
            short: "8 Núcleos / 16 Hilos • Hasta 4.6GHz • Zen 3",
            score: 94,
            summary: "Procesador Zen 3 de 8 núcleos y 16 hilos diseñado para compilaciones pesadas y multitarea sostenida de alto rendimiento.",
            specs: ["8 núcleos físicos y 16 hilos hasta 4.6 GHz", "36MB de caché combinada L2+L3", "Envolvente térmica eficiente de 65W"],
            workflow: "Acelera la compilación fullstack, contenedores Docker y microservicios locales."
          },
          {
            id: "ram",
            category: "MEMORIA DE ALTA VELOCIDAD",
            name: "32GB High-Speed DDR4 RAM",
            short: "Arquitectura Dual-Channel • Multitarea Extrema",
            score: 93,
            summary: "Matriz de memoria de doble canal de 32GB para ejecutar múltiples IDEs, bases de datos locales y máquinas virtuales sin latencia.",
            specs: ["Ancho de banda Dual-Channel de 32GB", "Entorno sin cuellos de botella para VS Code y emuladores", "Estabilidad total bajo cargas continuas"],
            workflow: "Elimina limitaciones de memoria al ejecutar entornos de prueba en tiempo real de CraftMeet."
          },
          {
            id: "monitors",
            category: "PANTALLAS DE MANDO VISUAL",
            name: "Dual Samsung Monitor Setup",
            short: "Configuración Extendida de Doble Pantalla",
            score: 95,
            summary: "Sistema sincronizado de doble monitor Samsung para separar el código fuente de la telemetría en tiempo real y registros de base de datos.",
            specs: ["Pantalla principal: IDE completo y terminal", "Pantalla secundaria: Vista previa en vivo y consola Firebase", "Calibración de confort visual para sesiones prolongadas"],
            workflow: "Duplica el espacio de trabajo activo para supervisar cambios de interfaz y datos en simultáneo."
          },
          {
            id: "mic",
            category: "ENTRADA DE AUDIO PROFESIONAL",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "Cápsula Dinámica Cardioide XLR de Estudio",
            score: 94,
            summary: "Micrófono dinámico profesional con patrón cardioide que captura claridad vocal de estudio rechazando el ruido ambiental y del teclado.",
            specs: ["Cápsula dinámica cardioide de calidad broadcast", "Rechazo superior de ruido fuera de eje", "Construcción metálica robusta de grado estudio"],
            workflow: "Brinda comunicación cristalina para reuniones con clientes globales, streams y pruebas de IA de voz."
          }
        ]
      },

      fr: {
        tab_whoami: "Qui Suis-Je ?",
        whoami_badge: "DOSSIER IDENTITÉ // TAB 02",
        back_to_portfolio: "← RETOUR AU PORTFOLIO",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // IDENTITÉ",
            heading: "Who Am I?",
            subheading: "Apprendre à connaître Kaveesha Shehara",
            paragraphs: [
              "Bonjour ! Je suis Kaveesha Shehara, passionné de technologie, esprit créatif et futur Full Stack Web Developer originaire du Sri Lanka.",
              "J'ai toujours été curieux de la technologie, des ordinateurs, d'internet et de la façon dont les expériences numériques sont créées. J'aime découvrir comment les choses fonctionnent, explorer de nouvelles idées, expérimenter avec différentes technologies et transformer mon imagination en réalité.",
              "Je ne vois pas la technologie uniquement comme un ensemble d'ordinateurs, de logiciels et de langages de programmation. J'y vois un monde de possibilités infinies où créativité et savoir technique s'unissent pour bâtir quelque chose de fort."
            ]
          },
          {
            id: "my-story",
            tag: "02 // MON PARCOURS",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "Mon intérêt pour la technologie a commencé avec les ordinateurs et le jeu vidéo. Ce qui était au départ de la curiosité est devenu bien plus grand. J'ai voulu comprendre comment les sites web sont conçus, comment fonctionnent les applications, comment les développeurs créent des expériences interactives et comment la technologie relie les gens dans le monde.",
              "Plutôt que de me contenter d'utiliser la technologie, j'ai voulu apprendre à la créer.",
              "Cette curiosité m'a conduit vers le développement web. J'ai commencé par apprendre HTML, CSS et JavaScript, en explorant le design web, la logique de programmation, les bases de données et divers outils de développement.",
              "En poursuivant mon apprentissage, j'ai réalisé que partir d'une idée pour en faire un produit concret est l'un des aspects les plus passionnants du développement."
            ]
          },
          {
            id: "my-passion",
            tag: "03 // PASSION DÉVELOPPEMENT",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "Le développement web est l'un des domaines que j'aime le plus explorer. J'adore créer des interfaces web modernes, tester des designs, ajouter des fonctionnalités interactives et rendre les plateformes numériques plus utiles.",
              "Le développement Full Stack m'attire particulièrement car il permet de maîtriser les deux facettes d'une application : ce que voient et utilisent les visiteurs, et ce qui se passe en coulisses.",
              "J'aime travailler avec des technologies telles que :\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "Je suis convaincu que la pratique est l'un des meilleurs moyens de progresser. C'est pourquoi j'aime créer des projets personnels et apprendre face à de vrais défis techniques."
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // MATÉRIEL & IA",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "Il y a bien plus chez moi que la seule programmation.",
              "Je suis également passionné par le gaming, le matériel informatique, les technologies graphiques et les performances PC. J'aime m'informer sur les processeurs, cartes graphiques, composants et technologies qui animent les jeux modernes.",
              "L'intelligence artificielle est un autre domaine qui me fascine. Je m'intéresse à la façon dont l'IA transforme l'avenir du développement logiciel et comment l'intégrer aux sites web et applications.",
              "J'aime aussi découvrir de nouveaux logiciels, tester différents outils et explorer des technologies pour faire évoluer mes compétences."
            ]
          },
          {
            id: "creative-side",
            tag: "05 // CRÉATIVITÉ",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "J'aime penser autrement et aborder les problèmes avec créativité. Parfois une idée naît toute petite, mais j'aime voir jusqu'où je peux la pousser.",
              "Qu'il s'agisse de concevoir un site web, de créer une nouvelle fonctionnalité, d'expérimenter une interface ou de résoudre un défi technique, j'apprécie de créer et d'améliorer.",
              "Pour moi, la plus grande satisfaction est de voir une idée née dans mon imagination devenir un outil réel utile à d'autres."
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // CONVICTIONS",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "Je crois que l'apprentissage ne s'arrête jamais vraiment, surtout dans l'univers de la tech.",
              "Il y a toujours quelque chose de nouveau à découvrir, une compétence à affiner, un problème à résoudre ou une idée à explorer.",
              "Être développeur ne signifie pas tout savoir. Cela demande la curiosité d'apprendre, la patience de résoudre les problèmes et la volonté de progresser continuellement.",
              "J'attache de l'importance à la créativité, à la régularité, à l'expérience pratique et à l'envie de sortir de ma zone de confort."
            ]
          },
          {
            id: "my-vision",
            tag: "07 // VISION FUTURE",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "J'ai de grandes ambitions pour l'avenir.",
              "Je veux devenir un Full Stack Developer très compétent, travailler avec des technologies modernes, bâtir des applications performantes et contribuer à des projets porteurs de sens.",
              "Je souhaite également explorer l'intelligence artificielle, l'ingénierie logicielle avancée, le cloud et l'avenir de l'innovation numérique.",
              "Mon but n'est pas simplement d'écrire du code ou de livrer des sites. Je veux créer des œuvres marquantes, des solutions utiles à de vrais enjeux et des projets à l'image de ma créativité.",
              "Je continue d'apprendre, d'expérimenter et de développer mon savoir-faire. Je sais que le chemin est long et j'accueille chaque occasion de grandir avec enthousiasme."
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // EN BREF",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // DERNIER MOT",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "Je suis Kaveesha Shehara — une personne animée par la curiosité, la créativité et de grands rêves.",
              "Je ne suis pas là pour prétendre tout savoir. Je suis là pour apprendre, créer, expérimenter, faire des erreurs, m'améliorer et construire quelque chose qui compte.",
              "C'est mon parcours, et ce n'est que le début.",
              "Merci d'avoir pris le temps de mieux me connaître."
            ]
          }
        ],
        nav_orbit: "Orbite",
        nav_about: "Profil",
        nav_projects: "CraftMeet",
        nav_matrix: "Matrice Tech",
        nav_workstation: "Station",
        nav_contact: "Transmettre",
        hero_edition_left: "ARCH.SYSTÈMES // FULLSTACK",
        hero_edition_right: "ÉDITION 2026",
        hud_viewport_label: "VUE ORBITALE",
        hud_dir_title: "INSTRUCTIONS :",
        hud_dir_1: "1. FAITES GLISSER L'ORBE POUR PIVOTER LE CHAMP 3D.",
        hud_dir_2: "2. CLIQUEZ SUR LES SATELLITES POUR INSPECTER.",
        hero_quote: "\"Conception d'univers numériques haute vélocité, d'écosystèmes gaming temps réel et d'architectures fullstack sans latence.\"",
        hero_transmission: "TRANSMISSION INTERCEPTÉE",
        scroll_continue: "Défiler pour Continuer",
        hero_status: "SYSTÈME EN LIGNE // PRÊT POUR DÉPLOIEMENT GLOBAL",
        photo_badge: "EMPLACEMENT PORTRAIT PRINCIPAL",
        upload_prompt: "[ PORTRAIT PRINCIPAL ]",
        upload_hint: "Portrait du développeur",
        hero_kicker: "DÉVELOPPEUR WEB FULLSTACK • INGÉNIEUR POLYGLOTTE",
        hero_bio: "Conception de systèmes numériques haute vélocité. Maîtrise de tous les langages de programmation modernes et architectures fullstack : plateformes temps réel, infrastructure cloud évolutive et interfaces sans latence.",
        stat_1_label: "LANGAGES",
        stat_1_val: "TOUS LANGAGES",
        stat_2_label: "PLATEFORME PHARE",
        stat_3_label: "ÉCOSYSTÈME",
        cta_projects: "EXPLORER CRAFTMEET →",
        cta_setup: "INSPECTER LA STATION",
        proj_kicker: "01 // DÉPLOIEMENT CRITIQUE",
        proj_title: "ARCHITECTURE PHARE",
        cm_badge: "PLATEFORME COMMUNAUTAIRE GAMING",
        cm_desc: "CraftMeet est une plateforme communautaire gaming moderne conçue pour réunir les joueurs dans un espace numérique interactif : communication en temps réel, communautés, profils, messagerie privée, tournois, concours, scrims et classements.",
        cm_stack_label: "STACK TECHNIQUE & INFRASTRUCTURE",
        cm_upload: "[ APERÇU CRAFTMEET ]",
        cm_upload_sub: "Interface CraftMeet",
        cm_features_title: "SOUS-MODULES // 14 FONCTIONNALITÉS CLÉS",
        aff_1_desc: "Ingénierie numérique collaborative, architecture web haute performance et développement fullstack au Sri Lanka.",
        aff_2_desc: "Solutions numériques nouvelle génération et infrastructures logicielles évolutives conçues pour la vitesse.",
        matrix_kicker: "02 // CAPACITÉ POLYGLOTTE",
        matrix_title: "MATRICE DE CODE UNIVERSELLE",
        matrix_sub: "Maîtrise complète du frontend, des moteurs backend distribués, des bases de données temps réel, des systèmes et du cloud.",
        rig_kicker: "03 // TÉLÉMÉTRIE DU POSTE DE COMMANDE",
        rig_title: "STATION DE TRAVAIL & MATÉRIEL",
        rig_hint: "[ CLIQUEZ SUR UN COMPOSANT POUR INSPECTER SES SPÉCIFICATIONS ]",
        rig_photo_label: "PHOTO DU SETUP",
        rig_upload: "[ STATION DE TRAVAIL ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // LIAISON DIRECTE",
        footer_title: "INITIALISER UNE COLLABORATION",
        footer_sub: "Besoin d'un architecte fullstack capable de concevoir des plateformes temps réel ou des systèmes évolutifs dans n'importe quel langage ? Envoyez un signal.",
        footer_btn: "TRANSMETTRE LE MESSAGE →",
        modal_highlights_label: "AVANTAGES TECHNIQUES CLÉS",
        modal_role_label: "RÔLE DANS LE FLUX DE TRAVAIL",
        inspect_btn: "VOIR LES SPÉCS +",
        features: [
          "Système de Chat en Temps Réel",
          "Messagerie Directe Privée",
          "Profils Utilisateurs & Personnalisation",
          "Système d'XP et de Niveaux",
          "Classements Mondiaux",
          "Canaux & Communautés Gaming",
          "Tournois et Scrims",
          "Système de Giveaways",
          "Chatbot Propulsé par IA",
          "Authentification Google",
          "Compteur d'Utilisateurs en Ligne",
          "Indicateurs de Frappe",
          "Récompenses XP Quotidiennes",
          "Protection Anti-Spam"
        ],
        hardware: [
          {
            id: "gpu",
            category: "ACCÉLÉRATION GRAPHIQUE & IA",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Architecture Ada Lovelace • 12Go GDDR6X • DLSS 3",
            score: 97,
            summary: "GPU haute efficacité basé sur l'architecture Ada Lovelace, offrant une puissance de calcul parallèle massive pour le rendu 3D et l'IA.",
            specs: ["7 680 cœurs CUDA et cœurs Tensor 4e gén.", "12 Go de mémoire GDDR6X ultra-rapide", "DLSS 3 Frame Generation et double encodeur AV1"],
            workflow: "Propulse le rendu fluide 60fps+, les tests WebGL/3D, l'encodage vidéo et les modèles d'IA locaux."
          },
          {
            id: "cpu",
            category: "PROCESSEUR CENTRAL",
            name: "AMD Ryzen 7 5700X",
            short: "8 Cœurs / 16 Threads • Boost 4.6GHz • Zen 3",
            score: 94,
            summary: "Processeur Zen 3 à 8 cœurs et 16 threads conçu pour les compilations lourdes et le multitâche intensif.",
            specs: ["8 cœurs physiques et 16 threads jusqu'à 4,6 GHz", "36 Mo de cache combiné L2+L3", "Enveloppe thermique efficace de 65W"],
            workflow: "Accélère la compilation fullstack, les conteneurs Docker et les microservices locaux."
          },
          {
            id: "ram",
            category: "MÉMOIRE HAUTE VITESSE",
            name: "32GB High-Speed DDR4 RAM",
            short: "Architecture Dual-Channel • Multitâche Intensif",
            score: 93,
            summary: "32 Go de mémoire double canal permettant d'exécuter simultanément plusieurs IDE, bases de données locales et machines virtuelles sans latence.",
            specs: ["Bande passante Dual-Channel de 32 Go", "Environnement fluide pour VS Code et émulateurs", "Stabilité maximale sous charges continues"],
            workflow: "Élimine tout goulot d'étranglement lors de l'exécution d'environnements de test temps réel CraftMeet."
          },
          {
            id: "monitors",
            category: "AFFICHAGE DE COMMANDE",
            name: "Dual Samsung Monitor Setup",
            short: "Configuration Double Écran Étendue",
            score: 95,
            summary: "Double écran Samsung synchronisé permettant de séparer l'architecture du code de la télémétrie en temps réel.",
            specs: ["Écran principal : IDE plein écran et terminal", "Écran secondaire : Aperçu en direct et console Firebase", "Confort visuel optimisé pour le code intensif"],
            workflow: "Double l'espace de travail actif pour surveiller simultanément l'interface et les événements temps réel."
          },
          {
            id: "mic",
            category: "ENTRÉE AUDIO BROADCAST",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "Capsule Dynamique Cardioïde XLR Studio",
            score: 94,
            summary: "Microphone dynamique professionnel à directivité cardioïde capturant une clarté vocale studio tout en éliminant les bruits ambiants.",
            specs: ["Capsule dynamique cardioïde qualité broadcast", "Réjection supérieure des bruits hors axe et clavier", "Construction métallique robuste de qualité studio"],
            workflow: "Assure une communication vocale cristalline pour les réunions clients, streams et tests d'IA vocale."
          }
        ]
      },

      hi: {
        tab_whoami: "मैं कौन हूँ?",
        whoami_badge: "परिचय विवरण // TAB 02",
        back_to_portfolio: "← PORTFOLIO पर जाएं",
        whoami_sections: [
          {
            id: "who-am-i",
            tag: "01 // परिचय",
            heading: "Who Am I?",
            subheading: "Kaveesha Shehara को जानें",
            paragraphs: [
              "नमस्ते! मैं कवीशा शेहारा हूँ — श्रीलंका से एक तकनीक प्रेमी, रचनात्मक विचारक और उभरता हुआ Full Stack Web Developer।",
              "मुझे हमेशा से तकनीक, कंप्यूटर, इंटरनेट और डिजिटल अनुभव कैसे बनते हैं, इसे जानने की जिज्ञासा रही है। चीजों के काम करने का तरीका खोजना, नए आइडिया तलाशना, अलग-अलग तकनीकों के साथ प्रयोग करना और अपनी कल्पना को हकीकत में बदलना मुझे अच्छा लगता है।",
              "मैं तकनीक को केवल कंप्यूटर, सॉफ्टवेयर और प्रोग्रामिंग भाषाओं का संग्रह नहीं मानता। मैं इसे अनंत संभावनाओं की ऐसी दुनिया मानता हूँ जहाँ रचनात्मकता और तकनीकी ज्ञान मिलकर कुछ सार्थक बनाते हैं।"
            ]
          },
          {
            id: "my-story",
            tag: "02 // मेरी कहानी",
            heading: "My Story",
            subheading: "",
            paragraphs: [
              "तकनीक में मेरी रुचि कंप्यूटर और गेमिंग से शुरू हुई थी। जो शुरुआत में केवल जिज्ञासा थी, वह धीरे-धीरे बहुत बड़ी हो गई। मुझे यह समझने में दिलचस्पी हुई कि वेबसाइटें कैसे बनती हैं, एप्लिकेशन कैसे काम करते हैं, डेवलपर्स इंटरैक्टिव अनुभव कैसे बनाते हैं और तकनीक दुनिया भर के लोगों को कैसे जोड़ती है।",
              "तकनीक का केवल इस्तेमाल करने के बजाय, मैं उसे बनाना सीखना चाहता था।",
              "उसी जिज्ञासा ने मुझे वेब डेवलपमेंट की ओर बढ़ाया। मैंने HTML, CSS और JavaScript सीखना शुरू किया — वेब डिज़ाइन, प्रोग्रामिंग लॉजिक, डेटाबेस और विभिन्न डेवलपमेंट टूल्स को समझते हुए।",
              "जैसे-जैसे मैं सीखता गया, मुझे एहसास हुआ कि किसी आइडिया को एक काम करने वाले प्रोडक्ट में बदलते देखना डेवलपमेंट का सबसे रोमांचक हिस्सा है।"
            ]
          },
          {
            id: "my-passion",
            tag: "03 // डेवलपमेंट का जुनून",
            heading: "My Passion for Development",
            subheading: "",
            paragraphs: [
              "वेब डेवलपमेंट उन क्षेत्रों में से एक है जिसे मैं सबसे अधिक पसंद करता हूँ। आधुनिक वेबसाइट इंटरफेस बनाना, डिज़ाइन के साथ प्रयोग करना, इंटरैक्टिव फीचर्स जोड़ना और डिजिटल प्लेटफॉर्म को अधिक उपयोगी बनाना मुझे बेहद पसंद है।",
              "मुझे Full Stack Development में खास रुचि है क्योंकि इससे एप्लिकेशन के दोनों पहलुओं को समझा जा सकता है: जो उपयोगकर्ता देखते व इस्तेमाल करते हैं, और जो पर्दे के पीछे चलता है।",
              "जिन तकनीकों के साथ काम करना मुझे अच्छा लगता है:\n- HTML5 and CSS3\n- JavaScript\n- Firebase Authentication\n- Firebase Realtime Database\n- GitHub and Vercel",
              "मेरा मानना है कि बेहतर बनने का सबसे अच्छा तरीका व्यावहारिक अनुभव है। इसलिए मैं खुद के प्रोजेक्ट बनाकर और असली चुनौतियों से सीखना पसंद करता हूँ।"
            ]
          },
          {
            id: "beyond-coding",
            tag: "04 // हार्डवेयर और AI",
            heading: "Beyond Coding",
            subheading: "",
            paragraphs: [
              "कोडिंग के अलावा भी मेरे भीतर बहुत कुछ है।",
              "मुझे गेमिंग, कंप्यूटर हार्डवेयर, ग्राफिक्स तकनीक और PC परफॉर्मेंस का भी शौक है। प्रोसेसर, ग्राफिक्स कार्ड, कंप्यूटर कंपोनेंट्स और आधुनिक गेम्स को चलाने वाली तकनीकों के बारे में जानना मुझे अच्छा लगता है।",
              "Artificial Intelligence एक और क्षेत्र है जो मुझे बेहद आकर्षित करता है। मैं यह जानने में रुचि रखता हूँ कि AI सॉफ्टवेयर डेवलपमेंट का भविष्य कैसे बदल सकता है और इसे वेबसाइटों व ऐप्स में कैसे जोड़ा जा सकता है।",
              "नए सॉफ्टवेयर खोजना, अलग-अलग टूल्स आज़माना और कौशल बढ़ाने वाली नई तकनीकें सीखना भी मुझे पसंद है।"
            ]
          },
          {
            id: "creative-side",
            tag: "05 // रचनात्मकता",
            heading: "My Creative Side",
            subheading: "",
            paragraphs: [
              "मुझे अलग तरह से सोचना और समस्याओं को रचनात्मकता के साथ हल करना अच्छा लगता है। कई बार कोई आइडिया बहुत छोटा शुरू होता है, लेकिन मैं उसे कहाँ तक ले जा सकता हूँ, यह देखना पसंद करता हूँ।",
              "चाहे वेबसाइट डिज़ाइन करना हो, नया फीचर बनाना हो, इंटरफेस पर प्रयोग करना हो या तकनीकी समस्या हल करनी हो — मुझे बनाने और सुधारने की प्रक्रिया पसंद है।",
              "मेरे लिए सबसे बड़ी संतुष्टि यह देखना है कि जो विचार कभी केवल मेरी कल्पना में था, वह दूसरों के काम आने वाली हकीकत बन जाए।"
            ]
          },
          {
            id: "what-i-believe",
            tag: "06 // मेरा विश्वास",
            heading: "What I Believe In",
            subheading: "",
            paragraphs: [
              "मेरा मानना है कि सीखना कभी खत्म नहीं होता — खासकर तकनीक की दुनिया में।",
              "खोजने के लिए हमेशा कुछ नया होता है, सुधारने के लिए कोई कौशल, हल करने के लिए समस्या या परखने लायक विचार।",
              "मैं यह नहीं मानता कि डेवलपर होने का मतलब सब कुछ जानना है। इसका अर्थ है सीखने की जिज्ञासा, समस्या सुलझाने का धैर्य और लगातार बेहतर बनने का संकल्प।",
              "मैं रचनात्मकता, निरंतरता, व्यावहारिक अनुभव और कम्फर्ट ज़ोन से बाहर निकलने की इच्छा को महत्व देता हूँ।"
            ]
          },
          {
            id: "my-vision",
            tag: "07 // भविष्य की दृष्टि",
            heading: "My Vision for the Future",
            subheading: "",
            paragraphs: [
              "मेरे भविष्य के लिए मेरे बड़े सपने हैं।",
              "मैं एक बेहतरीन Full Stack Developer बनना चाहता हूँ, आधुनिक तकनीकों के साथ काम करना चाहता हूँ, दमदार एप्लिकेशन बनाना चाहता हूँ और सार्थक प्रोजेक्ट्स में योगदान देना चाहता हूँ।",
              "मैं Artificial Intelligence, उन्नत सॉफ्टवेयर इंजीनियरिंग, क्लाउड तकनीकों और डिजिटल नवाचार के भविष्य को भी गहराई से समझना चाहता हूँ।",
              "मेरा लक्ष्य केवल कोड लिखना या वेबसाइट बनाना नहीं है। मैं ऐसी चीजें बनाना चाहता हूँ जो लोगों को याद रहें, असली समस्याओं को हल करें और मेरी रचनात्मकता व क्षमता को दर्शाएँ।",
              "मैं अभी भी सीख रहा हूँ, प्रयोग कर रहा हूँ और अपने कौशल निखार रहा हूँ। मैं जानता हूँ आगे लंबा सफर है और आगे बढ़ने के हर अवसर को लेकर उत्साहित हूँ।"
            ]
          },
          {
            id: "little-about-me",
            tag: "08 // संक्षिप्त परिचय",
            heading: "A Little About Me",
            subheading: "",
            paragraphs: [
              "- Name: Kaveesha Shehara\n- Based in: Sri Lanka\n- Interested in: Technology, Web Development, Gaming, AI, and Computer Hardware\n- Passionate about: Creating digital experiences and exploring new technologies\n- Current focus: Full Stack Web Development\n- Mindset: Always Learning. Always Building. Always Improving."
            ]
          },
          {
            id: "one-last-thing",
            tag: "09 // अंतिम बात",
            heading: "One Last Thing",
            subheading: "",
            paragraphs: [
              "मैं कवीशा शेहारा हूँ — जिज्ञासा, रचनात्मकता और बड़े सपनों वाला इंसान।",
              "मैं यहाँ यह दिखावा करने नहीं आया कि मुझे सब कुछ आता है। मैं यहाँ सीखने, बनाने, प्रयोग करने, गलतियों से सुधरने और कुछ सार्थक रचने के लिए हूँ।",
              "यह मेरी यात्रा है, और यह तो बस शुरुआत है।",
              "मुझे जानने के लिए समय निकालने के लिए धन्यवाद।"
            ]
          }
        ],
        nav_orbit: "कक्षा",
        nav_about: "प्रोफ़ाइल",
        nav_projects: "CraftMeet",
        nav_matrix: "टेक मैट्रिक्स",
        nav_workstation: "वर्कस्टेशन",
        nav_contact: "संपर्क",
        hero_edition_left: "सिस्टम आर्किटेक्ट // FULLSTACK",
        hero_edition_right: "2026 संस्करण",
        hud_viewport_label: "ऑर्बिटल व्यूपोर्ट",
        hud_dir_title: "निर्देश:",
        hud_dir_1: "1. 3D गोले को घुमाने के लिए खींचें।",
        hud_dir_2: "2. इकोसिस्टम देखने के लिए उपग्रहों पर क्लिक करें।",
        hero_quote: "\"हर प्रोग्रामिंग भाषा में तेज़ गति वाले डिजिटल ब्रह्मांड, रियल-टाइम गेमिंग इकोसिस्टम और जीरो-लेटेंसी फुलस्टैक सॉफ्टवेयर का निर्माण।\"",
        hero_transmission: "इंटरसेप्टेड ट्रांसमिशन",
        scroll_continue: "जारी रखने के लिए स्क्रॉल करें",
        hero_status: "सिस्टम ऑनलाइन // वैश्विक प्रोजेक्ट्स के लिए उपलब्ध",
        photo_badge: "मुख्य फोटो स्थान",
        upload_prompt: "[ मुख्य फोटो ]",
        upload_hint: "डेवलपर पोर्ट्रेट",
        hero_kicker: "FULLSTACK WEB DEVELOPER • सभी प्रोग्रामिंग भाषाओं के विशेषज्ञ",
        hero_bio: "अत्याधुनिक तकनीक के साथ तेज़ गति वाले डिजिटल सिस्टम बनाने वाले Fullstack Web Developer। सभी आधुनिक प्रोग्रामिंग भाषाओं में निपुण—Real-time प्लेटफॉर्म, स्केलेबल क्लाउड इंफ्रास्ट्रक्चर और बिना लैग वाले इंटरफेस का निर्माण।",
        stat_1_label: "प्रोग्रामिंग भाषाएँ",
        stat_1_val: "सभी भाषाएँ",
        stat_2_label: "प्रमुख प्लेटफॉर्म",
        stat_3_label: "सहयोग",
        cta_projects: "CRAFTMEET देखें →",
        cta_setup: "वर्कस्टेशन देखें",
        proj_kicker: "01 // प्रमुख सॉफ्टवेयर निर्माण",
        proj_title: "विशेष आर्किटेक्चर",
        cm_badge: "गेमिंग कम्युनिटी प्लेटफॉर्म",
        cm_desc: "CraftMeet एक आधुनिक गेमिंग कम्युनिटी प्लेटफॉर्म है जिसे गेमर्स को एक इंटरैक्टिव डिजिटल स्पेस में एक साथ लाने के लिए विकसित किया गया है। इसमें रियल-टाइम चैट, कम्युनिटी, यूजर प्रोफाइल, प्राइवेट मैसेजिंग, टूर्नामेंट, गिवअवे, स्क्रिम और लीडरबोर्ड शामिल हैं।",
        cm_stack_label: "मुख्य तकनीक और इंफ्रास्ट्रक्चर",
        cm_upload: "[ CRAFTMEET प्रीव्यू ]",
        cm_upload_sub: "CraftMeet इंटरफ़ेस",
        cm_features_title: "14 मुख्य विशेषताएं",
        aff_1_desc: "श्रीलंका में सहयोगात्मक डिजिटल इंजीनियरिंग और उच्च-प्रदर्शन वेब आर्किटेक्चर विकास।",
        aff_2_desc: "गति और विश्वसनीयता के लिए निर्मित अगली पीढ़ी के डिजिटल समाधान और स्केलेबल वेब प्लेटफॉर्म।",
        matrix_kicker: "02 // बहुभाषी कोडिंग क्षमता",
        matrix_title: "यूनिवर्सल कोड मैट्रिक्स",
        matrix_sub: "फ्रंटएंड, बैकएंड इंजन, रियल-टाइम डेटाबेस, सिस्टम प्रोग्रामिंग और क्लाउड पर पूर्ण नियंत्रण।",
        rig_kicker: "03 // कमांड सेंटर टेलीमेट्री",
        rig_title: "वर्कस्टेशन और हार्डवेयर",
        rig_hint: "[ विवरण देखने के लिए किसी भी हार्डवेयर पर क्लिक करें ]",
        rig_photo_label: "सेटअप फोटो",
        rig_upload: "[ वर्कस्टेशन सेटअप ]",
        rig_upload_sub: "RTX 4070 Ti + Dual Samsung + BOYA BY-DM500 Setup",
        footer_kicker: "04 // सीधा संपर्क",
        footer_title: "सहयोग शुरू करें",
        footer_sub: "किसी भी प्रोग्रामिंग भाषा में रियल-टाइम प्लेटफॉर्म या आधुनिक वेब एप्लिकेशन बनाने के लिए संदेश भेजें।",
        footer_btn: "संदेश भेजें →",
        modal_highlights_label: "मुख्य तकनीकी विशेषताएं",
        modal_role_label: "वर्कफ़्लो में भूमिका",
        inspect_btn: "विवरण देखें +",
        features: [
          "रियल-टाइम चैट सिस्टम",
          "प्राइवेट डायरेक्ट मैसेजिंग",
          "यूजर प्रोफाइल और कस्टमाइजेशन",
          "XP और लेवलिंग सिस्टम",
          "ग्लोबल लीडरबोर्ड",
          "गेमिंग चैनल और कम्युनिटी",
          "टूर्नामेंट और स्क्रिम",
          "गिवअवे इंजन",
          "AI-पावर्ड चैटबॉट",
          "Google ऑथेंटिकेशन",
          "ऑनलाइन यूजर काउंटर",
          "टाइपिंग इंडिकेटर्स",
          "दैनिक XP पुरस्कार",
          "एंटी-स्पैम सुरक्षा"
        ],
        hardware: [
          {
            id: "gpu",
            category: "ग्राफिक्स और AI एक्सेलेरेशन",
            name: "NVIDIA GeForce RTX 4070 Ti",
            short: "Ada Lovelace • 12GB GDDR6X • DLSS 3",
            score: 97,
            summary: "NVIDIA के Ada Lovelace आर्किटेक्चर पर निर्मित शक्तिशाली GPU, जो 3D रेंडरिंग और स्थानीय AI मॉडल के लिए अत्यधिक कंप्यूटिंग शक्ति प्रदान करता है।",
            specs: ["7,680 CUDA कोर और 4th-Gen Tensor कोर", "12GB अल्ट्रा-फास्ट GDDR6X मेमोरी", "DLSS 3 फ्रेम जेनरेशन और डुअल AV1 एनकोडर"],
            workflow: "स्मूथ 60fps+ रेंडरिंग, WebGL/3D परीक्षण और वीडियो एन्कोडिंग को बिना रुकावट शक्ति प्रदान करता है।"
          },
          {
            id: "cpu",
            category: "सेंट्रल प्रोसेसिंग यूनिट",
            name: "AMD Ryzen 7 5700X",
            short: "8-Core / 16-Thread • 4.6GHz Boost • Zen 3",
            score: 94,
            summary: "8-कोर, 16-थ्रेड Zen 3 प्रोसेसर जो भारी सॉफ्टवेयर कंपाइलेशन और मल्टीटास्किंग के लिए डिज़ाइन किया गया है।",
            specs: ["8 फिजिकल कोर और 16 थ्रेड (4.6 GHz तक)", "36MB संयुक्त L2+L3 कैश", "65W कुशल थर्मल डिज़ाइन"],
            workflow: "फुलस्टैक कोड कंपाइलेशन, डॉकर कंटेनर्स और लोकल माइक्रोसर्विसेज को तेज़ करता है।"
          },
          {
            id: "ram",
            category: "हाई-स्पीड सिस्टम मेमोरी",
            name: "32GB High-Speed DDR4 RAM",
            short: "डुअल-चैनल आर्किटेक्चर • हैवी मल्टीटास्किंग",
            score: 93,
            summary: "32GB डुअल-चैनल मेमोरी जो एक साथ कई IDE, लोकल डेटाबेस और दर्जनों ब्राउज़र टैब को बिना लैग के चलाती है।",
            specs: ["32GB डुअल-चैनल बैंडविड्थ", "VS Code और Firebase एमुलेटर के लिए तेज़ प्रदर्शन", "निरंतर वर्कलोड के तहत उच्च स्थिरता"],
            workflow: "रियल-टाइम CraftMeet परीक्षण वातावरण चलाते समय मेमोरी की कमी को समाप्त करता है।"
          },
          {
            id: "monitors",
            category: "विजुअल कमांड डिस्प्ले",
            name: "Dual Samsung Monitor Setup",
            short: "विस्तारित डुअल-स्क्रीन प्रोडक्टिविटी सेटअप",
            score: 95,
            summary: "सिंक्रोनाइज़्ड डुअल सैमसंग डिस्प्ले सेटअप जो लाइव कोड आर्किटेक्चर को रियल-टाइम ब्राउज़र टेलीमेट्री से अलग रखता है।",
            specs: ["प्राइमरी डिस्प्ले: फुल-स्क्रीन IDE और टर्मिनल", "सेकेंडरी डिस्प्ले: लाइव प्रीव्यू और Firebase कंसोल", "लंबे कोडिंग सत्रों के लिए आरामदायक दृश्यता"],
            workflow: "सक्रिय स्क्रीन स्पेस को दोगुना करता है ताकि फ्रंटएंड बदलाव और डेटाबेस लॉग एक साथ दिख सकें।"
          },
          {
            id: "mic",
            category: "ब्रॉडकास्ट ऑडियो इनपुट",
            name: "BOYA BY-DM500 Dynamic XLR Podcast Microphone",
            short: "ब्रॉडकास्ट-ग्रेड कार्डियोइड डायनेमिक XLR",
            score: 94,
            summary: "पेशेवर ब्रॉडकास्ट डायनेमिक माइक्रोफोन जो कमरे और कीबोर्ड के शोर को रोकते हुए स्टूडियो-स्तरीय स्पष्ट आवाज़ कैप्चर करता है।",
            specs: ["ब्रॉडकास्ट आवाज़ के लिए कार्डियोइड डायनेमिक कैप्सूल", "बाहरी शोर और कीबोर्ड क्लिक को कम करने की क्षमता", "मजबूत ऑल-मेटल स्टूडियो निर्माण"],
            workflow: "अंतर्राष्ट्रीय क्लाइंट मीटिंग्स, टीम कॉल्स, स्ट्रीमिंग और वॉयस-AI परीक्षणों के लिए स्पष्ट ऑडियो प्रदान करता है।"
          }
        ]
      }
    };

    let currentLang = 'en';

    function renderWhoAmITab(lang) {
      const container = document.getElementById('whoAmIContent');
      if (!container) return;
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
      const sections = dict.whoami_sections || TRANSLATIONS.en.whoami_sections;

      container.innerHTML = sections.map((sec, sIdx) => {
        const accentClass = sIdx % 2 === 0 ? 'text-electricBright' : 'text-racingBright';
        const paragraphsHtml = sec.paragraphs.map((pText) => {
          const isBulletBlock = pText.includes('\n- ') || pText.startsWith('- ');
          const rawLines = pText.split('\n');

          return rawLines.map((lineText) => {
            const escapedLine = lineText
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            return `
              <div class="who-type-line ${isBulletBlock ? 'font-mono text-xs sm:text-sm text-white/95 bg-obsidian/70 border border-white/10 rounded-lg px-3.5 py-2' : 'text-sm sm:text-base text-white/90 leading-relaxed'}">
                ${escapedLine || '&nbsp;'}
              </div>
            `;
          }).join('');
        }).join('');

        return `
          <article id="${sec.id}" class="hud-frame rounded-2xl p-6 sm:p-8 bg-obsidian/55">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span class="font-mono text-xs tracking-[0.22em] ${accentClass} uppercase who-type-line">${sec.tag}</span>
              <span class="font-mono text-[10px] text-white/45 uppercase">MOD_0${sIdx + 1}</span>
            </div>
            <h2 class="font-display font-bold text-2xl sm:text-4xl text-white tracking-tight mb-1 who-type-line">${sec.heading}</h2>
            ${sec.subheading ? `<p class="font-mono text-xs sm:text-sm ${accentClass} mb-5 who-type-line">${sec.subheading}</p>` : '<div class="mb-4"></div>'}
            <div class="space-y-2.5">
              ${paragraphsHtml}
            </div>
          </article>
        `;
      }).join('');

      rebuildShardCache();
      startTopToBottomTypewriter();
    }

    function switchTabView(viewName, sectionId = null) {
      activeTabView = viewName === 'whoami' ? 'whoami' : 'portfolio';
      const whoView = document.getElementById('whoAmIView');
      const mainView = document.getElementById('top');

      document.querySelectorAll('.view-tab-btn').forEach((btn) => {
        const isTarget = btn.getAttribute('data-tab-view') === activeTabView;
        if (btn.getAttribute('data-tab-view') === 'whoami') {
          btn.className = isTarget
            ? 'view-tab-btn px-2.5 py-1 rounded bg-racing text-white font-semibold shrink-0 transition-colors'
            : 'view-tab-btn px-2.5 py-1 rounded border border-racingBright/60 text-white hover:bg-racing/25 font-semibold shrink-0 transition-colors';
        } else {
          btn.className = isTarget
            ? 'view-tab-btn px-2.5 py-1 rounded bg-electric text-white font-semibold shrink-0 transition-colors'
            : 'view-tab-btn px-2.5 py-1 rounded border border-white/25 text-white/80 hover:text-white font-semibold shrink-0 transition-colors';
        }
      });

      if (activeTabView === 'whoami') {
        if (mainView) mainView.classList.add('hidden');
        if (whoView) whoView.classList.remove('hidden');
        renderWhoAmITab(currentLang);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (whoView) whoView.classList.add('hidden');
        if (mainView) mainView.classList.remove('hidden');
        rebuildShardCache();
        if (sectionId) {
          const targetEl = document.getElementById(sectionId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        updateContinuousScrollEffects();
      }
    }

    document.querySelectorAll('[data-tab-view]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTabView(btn.getAttribute('data-tab-view'));
      });
    });

    document.querySelectorAll('a[data-nav-section]').forEach((link) => {
      link.addEventListener('click', (e) => {
        if (activeTabView === 'whoami') {
          e.preventDefault();
          switchTabView('portfolio', link.getAttribute('data-nav-section'));
        }
      });
    });

    function renderDynamicModules(lang) {
      const data = TRANSLATIONS[lang] || TRANSLATIONS.en;

      const featuresGrid = document.getElementById('craftmeetFeaturesGrid');
      featuresGrid.innerHTML = data.features.map((feat, idx) => {
        const dir = idx % 3 === 0 ? 'left' : (idx % 3 === 1 ? 'up' : 'right');
        return `
          <div data-shard="${dir}" class="shard-module flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-obsidian border border-white/15 hover:border-electricBright transition-colors">
            <span class="font-mono text-[10px] text-racingBright font-bold">${String(idx + 1).padStart(2, '0')}</span>
            <span class="text-xs sm:text-[13px] text-white font-medium">${feat}</span>
          </div>
        `;
      }).join('');

      const hwGrid = document.getElementById('hardwareGrid');
      hwGrid.innerHTML = data.hardware.map((item, idx) => {
        const dir = idx % 3 === 0 ? 'left' : (idx % 3 === 1 ? 'scale' : 'right');
        return `
          <button
            type="button"
            data-shard="${dir}"
            onclick="openHardwareModal(${idx})"
            class="shard-module hud-frame rounded-xl p-6 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-electricBright"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="font-mono text-[10px] tracking-widest text-electricBright uppercase">${item.category}</span>
                <span class="w-2 h-2 rounded-full bg-racingBright group-hover:scale-125 transition-transform"></span>
              </div>
              <h3 class="font-display font-bold text-xl text-white group-hover:text-electricBright transition-colors mb-2">
                ${item.name}
              </h3>
              <p class="font-mono text-xs text-white/65 mb-4">${item.short}</p>
            </div>

            <div class="pt-3 border-t border-white/15 flex items-center justify-between font-mono text-xs">
              <span class="text-white/80 group-hover:text-white transition-colors">${data.inspect_btn}</span>
              <span class="text-racingBright group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </button>
        `;
      }).join('');

      rebuildShardCache();
      updateContinuousScrollEffects();
    }

    function setLanguage(lang) {
      if (!TRANSLATIONS[lang]) return;
      currentLang = lang;
      try {
        const raw = localStorage.getItem('ks_portfolio_prefs_v3');
        if (raw) {
          const prefs = JSON.parse(raw);
          prefs.lang = lang;
          localStorage.setItem('ks_portfolio_prefs_v3', JSON.stringify(prefs));
        }
      } catch (_) {}
      const dict = TRANSLATIONS[lang];

      document.querySelectorAll('.lang-btn').forEach((btn) => {
        const isActive = btn.dataset.lang === lang;
        btn.className = isActive
          ? 'lang-btn px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all bg-electric text-white'
          : 'lang-btn px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all text-white/75 hover:text-white';
      });

      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.textContent = dict[key];
        }
      });

      renderDynamicModules(lang);
      renderWhoAmITab(lang);
    }

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    const modal = document.getElementById('hardwareModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    function openHardwareModal(index) {
      const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
      const item = dict.hardware[index];
      if (!item) return;

      document.getElementById('modalCategory').textContent = item.category;
      document.getElementById('modalTitle').textContent = item.name;
      document.getElementById('modalSummary').textContent = item.summary;
      document.getElementById('modalWorkflow').textContent = item.workflow;

      const score = item.score || 95;
      document.getElementById('modalBenchmarkScore').textContent = `${score} / 100`;
      const benchBar = document.getElementById('modalBenchmarkBar');
      benchBar.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          benchBar.style.width = `${score}%`;
        });
      });

      const specsList = document.getElementById('modalSpecsList');
      specsList.innerHTML = item.specs
        .map((spec) => `
          <li class="flex items-start gap-2.5">
            <span class="text-racingBright font-bold mt-0.5">&#9656;</span>
            <span>${spec}</span>
          </li>
        `)
        .join('');

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeHardwareModal() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    closeModalBtn.addEventListener('click', closeHardwareModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeHardwareModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeHardwareModal();
      }
    });

    const SIM_STATES = {
      chat: `
        <div class="flex items-center justify-between text-electricBright mb-2">
          <span>CHANNEL // #craftmeet-global-squads</span>
          <span class="text-racingBright">● REALTIME SYNC ACTIVE</span>
        </div>
        <div class="space-y-1.5 text-white/85">
          <div><span class="text-electricBright">[Kaveesha]:</span> Realtime Firebase sync active — ping &lt; 18ms.</div>
          <div><span class="text-racingBright">[Squad_Alpha]:</span> Scrim lobby ready for 5v5 bracket!</div>
          <div class="text-white/55 italic">● Player_09 is typing...</div>
        </div>
      `,
      xp: `
        <div class="flex items-center justify-between text-electricBright mb-2">
          <span>RANK ENGINE // SEASON TELEMETRY</span>
          <span class="text-white">+250 DAILY XP</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-white">
          <div class="p-2.5 rounded bg-obsidian border border-white/10">#01 VANGUARD — 48,900 XP</div>
          <div class="p-2.5 rounded bg-obsidian border border-electricBright/50">#02 KAVEESHA — 46,450 XP</div>
          <div class="p-2.5 rounded bg-obsidian border border-white/10">#03 NIGHTFALL — 43,120 XP</div>
        </div>
      `,
      scrims: `
        <div class="flex items-center justify-between text-racingBright mb-2">
          <span>TOURNAMENTS, SCRIMS & AI BOT</span>
          <span class="text-electricBright">ANTI-SPAM: ARMED</span>
        </div>
        <div class="text-white/85 space-y-1">
          <div>• Automated bracket seeding & live giveaway draw verification enabled.</div>
          <div>• AI Chatbot assisting players with match rules, squad invites & XP rewards.</div>
        </div>
      `
    };

    const simOutput = document.getElementById('craftmeetSimOutput');
    document.querySelectorAll('.sim-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sim-tab').forEach((b) => {
          b.className = 'sim-tab px-3 py-1.5 rounded border border-white/20 text-white/75 hover:text-white';
        });
        btn.className = 'sim-tab px-3 py-1.5 rounded bg-electric text-white font-semibold';
        if (simOutput && SIM_STATES[btn.dataset.sim]) {
          simOutput.innerHTML = SIM_STATES[btn.dataset.sim];
        }
      });
    });
    if (simOutput) simOutput.innerHTML = SIM_STATES.chat;

    const POLYGLOT_SNIPPETS = {
      js: `// Fullstack Realtime Event Dispatcher (JavaScript / Node.js)
export async function dispatchCraftMeetEvent(dbRef, payload) {
  return dbRef.push({ ...payload, status: 'VERIFIED', timestamp: Date.now() });
}`,
      python: `# High-Throughput Telemetry & AI Service (Python)
def compute_player_rating(xp: int, wins: int, streak: int) -> float:
    return round((xp * 0.04) + (wins * 15.0) + (streak * 3.5), 2)`,
      cpp: `// Low-Latency Engine Core (C++)
#include <cstdint>
constexpr uint64_t pack_telemetry(uint32_t node_id, uint32_t latency_us) {
    return (static_cast<uint64_t>(node_id) << 32) | latency_us;
}`,
      rust: `// Memory-Safe Systems Worker (Rust)
pub fn verify_packet(checksum: u32, expected: u32) -> bool {
    checksum == expected
}`,
      go: `// Concurrent Gateway Handler (Go)
func RouteSignal(channel string, latencyMs int) string {
    return fmt.Sprintf("ROUTE[%s]:%dms", channel, latencyMs)
}`
    };

    const polyBox = document.getElementById('polyglotCodeBox');
    document.querySelectorAll('.poly-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.poly-tab').forEach((b) => {
          b.className = 'poly-tab px-2.5 py-1 rounded border border-white/20 text-white/75 hover:text-white';
        });
        btn.className = 'poly-tab px-2.5 py-1 rounded bg-electric text-white font-semibold';
        if (polyBox && POLYGLOT_SNIPPETS[btn.dataset.code]) {
          polyBox.textContent = POLYGLOT_SNIPPETS[btn.dataset.code];
        }
      });
    });
    if (polyBox) polyBox.textContent = POLYGLOT_SNIPPETS.js;

    setLanguage('en');

    const OWNER_EMAIL = "kaveeshasehara7@gmail.com";
    const contactForm = document.getElementById("contactForm");
    const transmitFeedback = document.getElementById("transmitFeedback");
    const transmitBtn = document.getElementById("transmitBtn");

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("senderName").value.trim();
      const email = document.getElementById("senderEmail").value.trim();
      const message = document.getElementById("senderMsg").value.trim();
      if (!name || !email || !message) return;

      transmitBtn.disabled = true;
      transmitBtn.textContent = "TRANSMITTING TO INBOX...";

      try {
        const res = await fetch(`https://formsubmit.co/ajax/${OWNER_EMAIL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            name: name,
            email: email,
            _replyto: email,
            _subject: `New Portfolio Inquiry from ${name}`,
            message: message
          })
        });

        if (res.ok) {
          transmitFeedback.innerHTML = `[TRANSMITTED] Your message was sent directly to <span class="underline">${OWNER_EMAIL}</span>.`;
          transmitFeedback.classList.remove("hidden");
          contactForm.reset();
        } else {
          throw new Error("Direct email relay fallback");
        }
      } catch (err) {
        const subject = encodeURIComponent(`Portfolio Inquiry from ${name}`);
        const body = encodeURIComponent(`Name: ${name}\nClient Email: ${email}\n\nMessage:\n${message}`);
        transmitFeedback.innerHTML = `[SIGNAL LOGGED] Opening backup email uplink to <span class="underline">${OWNER_EMAIL}</span>...`;
        transmitFeedback.classList.remove("hidden");
        window.location.href = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
      } finally {
        transmitBtn.disabled = false;
        transmitBtn.textContent = "TRANSMIT MESSAGE →";
      }
    });


    /* ==========================================================================
       PERSONALIZATION ONBOARDING & THEME ENGINE (v3)
       Language → 2 questions only → full visual transform
       Technology / Software / IT keeps exact original UI
       Hero photo slider with fade + zoom every 3s
       ========================================================================== */
    (function initPersonalizationEngine() {
      const STORAGE_KEY = 'ks_portfolio_prefs_v3';
      const overlay = document.getElementById('onboardingOverlay');
      const themeBgLayer = document.getElementById('themeBgLayer');
      const resetBtn = document.getElementById('resetPersonalizationBtn');
      const heroSlider = document.getElementById('heroPhotoSlider');
      if (!overlay) return;

      const TECH_CATEGORIES = new Set(['software', 'tech', 'it', 'programming', 'webdev']);

      const PURPOSE_OPTIONS = [
        { id: 'business', icon: '🏢', labelKey: 'purpose_business' },
        { id: 'bakery', icon: '🧁', labelKey: 'purpose_bakery' },
        { id: 'pcshop', icon: '🖥️', labelKey: 'purpose_pcshop' },
        { id: 'software', icon: '💻', labelKey: 'purpose_software' },
        { id: 'store', icon: '🛒', labelKey: 'purpose_store' },
        { id: 'portfolio', icon: '✨', labelKey: 'purpose_portfolio' },
        { id: 'restaurant', icon: '🍽️', labelKey: 'purpose_restaurant' },
        { id: 'other', icon: '🎯', labelKey: 'purpose_other' },
      ];

      const STYLE_OPTIONS = [
        { id: 'colorful', labelKey: 'style_colorful', img: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&q=80' },
        { id: 'minimal', labelKey: 'style_minimal', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
        { id: 'modern', labelKey: 'style_modern', img: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=80' },
        { id: 'luxury', labelKey: 'style_luxury', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80' },
        { id: 'futuristic', labelKey: 'style_futuristic', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80' },
        { id: 'natural', labelKey: 'style_natural', img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80' },
      ];

      // High-quality category photography for hero slider + ambient layer
      const CATEGORY_PHOTOS = {
        bakery: [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1600&q=80',
          'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=1600&q=80',
          'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80',
          'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1600&q=80',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=80',
        ],
        pcshop: [
          'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1600&q=80',
          'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1600&q=80',
          'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=1600&q=80',
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&q=80',
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&q=80',
        ],
        business: [
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80',
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=80',
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&q=80',
        ],
        restaurant: [
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80',
          'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80',
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80',
        ],
        portfolio: [
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=80',
          'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1600&q=80',
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&q=80',
        ],
        store: [
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80',
          'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&q=80',
          'https://images.unsplash.com/photo-1607083206869-4c79742c5a46?w=1600&q=80',
        ],
        other: [
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80',
          'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80',
        ],
      };

      function resolveThemeClass(purpose, style) {
        if (!purpose || TECH_CATEGORIES.has(purpose)) return null;
        if (purpose === 'bakery') return 'theme-bakery';
        if (purpose === 'pcshop') return 'theme-pcshop';
        if (purpose === 'business') return 'theme-business';
        if (purpose === 'restaurant') return 'theme-restaurant';
        if (purpose === 'portfolio') return 'theme-portfolio';
        if (purpose === 'store') return 'theme-store';
        // other — style-driven
        if (style === 'colorful' || style === 'natural') return 'theme-bakery';
        if (style === 'futuristic') return 'theme-pcshop';
        if (style === 'luxury') return 'theme-restaurant';
        if (style === 'minimal' || style === 'modern') return 'theme-portfolio';
        return 'theme-business';
      }

      const ONB_I18N = {
        en: {
          lang_title: "Choose Your Language",
          lang_desc: "Select your preferred language to personalize the experience.",
          q1_title: "What type of website experience do you like?",
          q1_desc: "Choose the experience that matches your vision.",
          q2_title: "What visual style do you prefer?",
          q2_desc: "Pick the look that feels right for you.",
          welcome_title: "Let's Create Something Amazing!",
          welcome_desc: "Tell me a little about your vision. I'll craft the perfect design experience for you.",
          continue: "Continue",
          back: "Back",
          skip: "Skip",
          finish: "Create Experience",
          reset_pref: "Reset Theme",
          purpose_business: "Business",
          purpose_bakery: "Bakery / Cake Shop",
          purpose_pcshop: "PC Shop / Gaming",
          purpose_software: "Software / IT / Technology",
          purpose_store: "Online Store",
          purpose_portfolio: "Personal Portfolio",
          purpose_restaurant: "Restaurant / Hotel",
          purpose_other: "Other",
          style_colorful: "Colorful & Creative",
          style_minimal: "Minimal & Clean",
          style_modern: "Modern & Professional",
          style_luxury: "Luxury & Elegant",
          style_futuristic: "Futuristic & Neon",
          style_natural: "Nature & Relaxing",
        },
        si: {
          lang_title: "ඔබේ භාෂාව තෝරන්න",
          lang_desc: "අත්දැකීම පුද්ගලීකරණය කිරීමට ඔබේ මනාප භාෂාව තෝරන්න.",
          q1_title: "ඔබ කැමති වෙබ් අත්දැකීම කුමක්ද?",
          q1_desc: "ඔබේ දර්ශනයට ගැලපෙන අත්දැකීම තෝරන්න.",
          q2_title: "ඔබ කැමති දෘශ්‍ය ශෛලිය කුමක්ද?",
          q2_desc: "ඔබට ගැලපෙන පෙනුම තෝරන්න.",
          welcome_title: "අපි අපූරු දෙයක් නිර්මාණය කරමු!",
          welcome_desc: "ඔබේ දර්ශනය ගැන මට කියන්න. මම ඔබට ගැලපෙන නිර්මාණ අත්දැකීම සාදන්නම්.",
          continue: "ඉදිරියට", back: "ආපසු", skip: "මඟහරින්න", finish: "අත්දැකීම නිර්මාණය කරන්න", reset_pref: "තේමාව යළි සකසන්න",
          purpose_business: "ව්‍යාපාරික", purpose_bakery: "බේකරි / කේක්", purpose_pcshop: "පරිගණක / ගේමිං",
          purpose_software: "මෘදුකාංග / IT / තාක්ෂණය", purpose_store: "ඔන්ලයින් වෙළඳසැල",
          purpose_portfolio: "පුද්ගලික පෝට්ෆෝලියෝ", purpose_restaurant: "අවන්හල / හෝටලය", purpose_other: "වෙනත්",
          style_colorful: "වර්ණවත් හා නිර්මාණශීලී", style_minimal: "සරල හා පිරිසිදු",
          style_modern: "නවීන හා වෘත්තීය", style_luxury: "සුඛෝපභෝගී හා අලංකාර",
          style_futuristic: "අනාගත හා නියොන්", style_natural: "ස්වභාවික හා සන්සුන්",
        },
        ta: {
          lang_title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
          lang_desc: "அனுபவத்தை தனிப்பயனாக்க உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்.",
          q1_title: "நீங்கள் விரும்பும் வலை அனுபவம் என்ன?",
          q1_desc: "உங்கள் பார்வைக்கு ஏற்ற அனுபவத்தைத் தேர்ந்தெடுக்கவும்.",
          q2_title: "நீங்கள் விரும்பும் காட்சி பாணி என்ன?",
          q2_desc: "உங்களுக்குப் பொருந்தும் தோற்றத்தைத் தேர்ந்தெடுக்கவும்.",
          welcome_title: "அற்புதமான ஒன்றை உருவாக்குவோம்!",
          welcome_desc: "உங்கள் பார்வையைப் பற்றி சொல்லுங்கள். உங்களுக்கு ஏற்ற வடிவமைப்பை உருவாக்குவேன்.",
          continue: "தொடரவும்", back: "பின்செல்", skip: "தவிர்", finish: "அனுபவத்தை உருவாக்கு", reset_pref: "தீம் மீட்டமை",
          purpose_business: "வணிகம்", purpose_bakery: "பேக்கரி / கேக்", purpose_pcshop: "கணினி / கேமிங்",
          purpose_software: "மென்பொருள் / IT / தொழில்நுட்பம்", purpose_store: "ஆன்லைன் கடை",
          purpose_portfolio: "தனிப்பட்ட போர்ட்ஃபோலியோ", purpose_restaurant: "உணவகம் / ஹோட்டல்", purpose_other: "மற்றவை",
          style_colorful: "வண்ணமயமான & படைப்பு", style_minimal: "குறைந்தபட்ச & சுத்தமான",
          style_modern: "நவீன & தொழில்முறை", style_luxury: "ஆடம்பர & நேர்த்தியான",
          style_futuristic: "எதிர்கால & நியான்", style_natural: "இயற்கை & ஓய்வு",
        },
        es: {
          lang_title: "Elige tu idioma",
          lang_desc: "Selecciona tu idioma preferido para personalizar la experiencia.",
          q1_title: "¿Qué tipo de experiencia web te gusta?",
          q1_desc: "Elige la experiencia que coincida con tu visión.",
          q2_title: "¿Qué estilo visual prefieres?",
          q2_desc: "Elige el aspecto que se sienta bien para ti.",
          welcome_title: "¡Creemos algo increíble!",
          welcome_desc: "Cuéntame un poco sobre tu visión. Crearé la experiencia de diseño perfecta para ti.",
          continue: "Continuar", back: "Atrás", skip: "Omitir", finish: "Crear experiencia", reset_pref: "Restablecer tema",
          purpose_business: "Negocios", purpose_bakery: "Panadería / Pastelería", purpose_pcshop: "PC / Gaming",
          purpose_software: "Software / IT / Tecnología", purpose_store: "Tienda en línea",
          purpose_portfolio: "Portafolio personal", purpose_restaurant: "Restaurante / Hotel", purpose_other: "Otro",
          style_colorful: "Colorido y creativo", style_minimal: "Minimalista y limpio",
          style_modern: "Moderno y profesional", style_luxury: "Lujo y elegante",
          style_futuristic: "Futurista y neón", style_natural: "Naturaleza y relajante",
        },
        fr: {
          lang_title: "Choisissez votre langue",
          lang_desc: "Sélectionnez votre langue préférée pour personnaliser l'expérience.",
          q1_title: "Quel type d'expérience web aimez-vous ?",
          q1_desc: "Choisissez l'expérience qui correspond à votre vision.",
          q2_title: "Quel style visuel préférez-vous ?",
          q2_desc: "Choisissez l'apparence qui vous convient.",
          welcome_title: "Créons quelque chose d'incroyable !",
          welcome_desc: "Parlez-moi un peu de votre vision. Je créerai l'expérience de design parfaite pour vous.",
          continue: "Continuer", back: "Retour", skip: "Passer", finish: "Créer l'expérience", reset_pref: "Réinitialiser le thème",
          purpose_business: "Entreprise", purpose_bakery: "Boulangerie / Pâtisserie", purpose_pcshop: "PC / Gaming",
          purpose_software: "Logiciel / IT / Technologie", purpose_store: "Boutique en ligne",
          purpose_portfolio: "Portfolio personnel", purpose_restaurant: "Restaurant / Hôtel", purpose_other: "Autre",
          style_colorful: "Coloré et créatif", style_minimal: "Minimal et épuré",
          style_modern: "Moderne et professionnel", style_luxury: "Luxe et élégant",
          style_futuristic: "Futuriste et néon", style_natural: "Nature et relaxant",
        },
        hi: {
          lang_title: "अपनी भाषा चुनें",
          lang_desc: "अनुभव को व्यक्तिगत बनाने के लिए अपनी पसंदीदा भाषा चुनें।",
          q1_title: "आप किस प्रकार का वेब अनुभव पसंद करते हैं?",
          q1_desc: "अपने विजन से मेल खाने वाला अनुभव चुनें।",
          q2_title: "आप कौन सी विज़ुअल स्टाइल पसंद करते हैं?",
          q2_desc: "वह लुक चुनें जो आपको सही लगे।",
          welcome_title: "आइए कुछ अद्भुत बनाएं!",
          welcome_desc: "अपने विजन के बारे में थोड़ा बताएं। मैं आपके लिए सही डिज़ाइन अनुभव बनाऊंगा।",
          continue: "जारी रखें", back: "वापस", skip: "छोड़ें", finish: "अनुभव बनाएं", reset_pref: "थीम रीसेट करें",
          purpose_business: "बिज़नेस", purpose_bakery: "बेकरी / केक शॉप", purpose_pcshop: "पीसी / गेमिंग",
          purpose_software: "सॉफ्टवेयर / IT / टेक्नोलॉजी", purpose_store: "ऑनलाइन स्टोर",
          purpose_portfolio: "पर्सनल पोर्टफोलियो", purpose_restaurant: "रेस्तरां / होटल", purpose_other: "अन्य",
          style_colorful: "रंगीन और रचनात्मक", style_minimal: "मिनिमल और साफ़",
          style_modern: "आधुनिक और पेशेवर", style_luxury: "लक्ज़री और एलिगेंट",
          style_futuristic: "फ्यूचरिस्टिक और नियॉन", style_natural: "नेचर और रिलैक्सिंग",
        },
      };

      let state = {
        step: 0,
        lang: 'en',
        purpose: null,
        style: null,
        completed: false,
      };

      let heroTimer = null;
      let heroIndex = 0;
      let heroPhotos = [];

      function loadPrefs() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            // migrate from v2 if present
            const v2 = localStorage.getItem('ks_portfolio_prefs_v3');
            if (v2) {
              const p = JSON.parse(v2);
              return { lang: p.lang, purpose: p.purpose, style: p.style, completed: p.completed };
            }
            return null;
          }
          return JSON.parse(raw);
        } catch (_) { return null; }
      }

      function savePrefs() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            lang: state.lang,
            purpose: state.purpose,
            style: state.style,
            completed: state.completed,
            ts: Date.now(),
          }));
        } catch (_) {}
      }

      function t(key) {
        const dict = ONB_I18N[state.lang] || ONB_I18N.en;
        return dict[key] || ONB_I18N.en[key] || key;
      }

      function applyOnboardingI18n() {
        document.querySelectorAll('[data-onb]').forEach((el) => {
          const key = el.getAttribute('data-onb');
          if (key) el.textContent = t(key);
        });
      }

      function updateProgress() {
        document.querySelectorAll('.onboarding-progress-dot').forEach((dot) => {
          const s = Number(dot.getAttribute('data-step'));
          dot.classList.remove('is-current', 'is-done');
          if (s < state.step) dot.classList.add('is-done');
          else if (s === state.step) dot.classList.add('is-current');
        });
      }

      function showStep(n) {
        state.step = n;
        document.querySelectorAll('.onboarding-step').forEach((el) => {
          el.classList.toggle('is-visible', Number(el.getAttribute('data-step')) === n);
        });
        updateProgress();
        if (n === 1) {
          const titleEl = document.querySelector('#onboardingStepPurpose .onboarding-title');
          const descEl = document.querySelector('#onboardingStepPurpose .onboarding-desc');
          if (titleEl && !titleEl.dataset.welcomed) {
            titleEl.textContent = t('welcome_title');
            if (descEl) descEl.textContent = t('welcome_desc') + ' ' + t('q1_desc');
            titleEl.dataset.welcomed = '1';
          } else if (titleEl) {
            titleEl.textContent = t('q1_title');
            if (descEl) descEl.textContent = t('q1_desc');
          }
          renderPurposeOptions();
        }
        if (n === 2) renderStyleOptions();
      }

      function renderPurposeOptions() {
        const container = document.getElementById('onboardingPurposeOptions');
        if (!container) return;
        container.innerHTML = PURPOSE_OPTIONS.map((opt) => `
          <button type="button" class="onboarding-option ${state.purpose === opt.id ? 'is-selected' : ''}" data-purpose="${opt.id}">
            <span class="onboarding-option-icon">${opt.icon}</span>
            <span>${t(opt.labelKey)}</span>
          </button>
        `).join('');
        container.querySelectorAll('[data-purpose]').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.purpose = btn.getAttribute('data-purpose');
            container.querySelectorAll('.onboarding-option').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            const cont = document.getElementById('onboardingContinuePurpose');
            if (cont) cont.disabled = false;
          });
        });
      }

      function renderStyleOptions() {
        const container = document.getElementById('onboardingStyleOptions');
        if (!container) return;
        container.innerHTML = STYLE_OPTIONS.map((opt) => `
          <button type="button" class="onboarding-visual-card ${state.style === opt.id ? 'is-selected' : ''}" data-style="${opt.id}">
            <img src="${opt.img}" alt="" loading="lazy" onerror="this.style.background='#222'" />
            <span class="onboarding-visual-label">${t(opt.labelKey)}</span>
          </button>
        `).join('');
        container.querySelectorAll('[data-style]').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.style = btn.getAttribute('data-style');
            container.querySelectorAll('.onboarding-visual-card').forEach((b) => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            const cont = document.getElementById('onboardingFinishBtn');
            if (cont) cont.disabled = false;
          });
        });
      }

      function clearThemeClasses() {
        document.body.classList.remove(
          'theme-bakery', 'theme-pcshop', 'theme-business',
          'theme-restaurant', 'theme-portfolio', 'theme-store'
        );
      }

      function stopHeroSlider() {
        if (heroTimer) {
          clearInterval(heroTimer);
          heroTimer = null;
        }
        if (heroSlider) {
          heroSlider.classList.remove('is-enabled');
          heroSlider.querySelectorAll('.hero-photo-slide').forEach((s) => {
            s.classList.remove('is-active', 'is-kenburns');
            s.style.backgroundImage = '';
          });
        }
      }

      function startHeroSlider(purpose) {
        stopHeroSlider();
        if (!heroSlider || !purpose || TECH_CATEGORIES.has(purpose)) return;

        heroPhotos = CATEGORY_PHOTOS[purpose] || CATEGORY_PHOTOS.other || [];
        if (!heroPhotos.length) return;

        const slides = heroSlider.querySelectorAll('.hero-photo-slide');
        slides.forEach((slide, i) => {
          if (i < heroPhotos.length) {
            slide.style.backgroundImage = `url('${heroPhotos[i]}')`;
            // preload
            const img = new Image();
            img.src = heroPhotos[i];
          }
        });

        heroIndex = 0;
        slides[0]?.classList.add('is-active', 'is-kenburns');
        heroSlider.classList.add('is-enabled');

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced || heroPhotos.length < 2) return;

        heroTimer = setInterval(() => {
          const slidesNow = heroSlider.querySelectorAll('.hero-photo-slide');
          slidesNow[heroIndex]?.classList.remove('is-active', 'is-kenburns');
          heroIndex = (heroIndex + 1) % Math.min(heroPhotos.length, slidesNow.length);
          slidesNow[heroIndex]?.classList.add('is-active', 'is-kenburns');
          // preload next
          const next = (heroIndex + 1) % heroPhotos.length;
          const pre = new Image();
          pre.src = heroPhotos[next];
        }, 3000);
      }

      function applyTheme() {
        clearThemeClasses();
        stopHeroSlider();

        const themeClass = resolveThemeClass(state.purpose, state.style);

        if (themeBgLayer) {
          themeBgLayer.classList.remove('is-active');
          themeBgLayer.style.backgroundImage = '';
        }

        if (!themeClass) {
          // Original technology experience
          if (resetBtn) resetBtn.classList.remove('is-visible');
          return;
        }

        document.body.classList.add('theme-transitioning');
        document.body.classList.add(themeClass);

        // Ambient bg layer (subtle extra photo)
        const photos = CATEGORY_PHOTOS[state.purpose] || CATEGORY_PHOTOS.other;
        if (themeBgLayer && photos && photos.length) {
          const url = photos[0];
          themeBgLayer.style.backgroundImage = `url('${url}')`;
          requestAnimationFrame(() => themeBgLayer.classList.add('is-active'));
        }

        // Hero slider
        startHeroSlider(state.purpose);

        if (resetBtn) {
          resetBtn.classList.add('is-visible');
          resetBtn.textContent = t('reset_pref');
        }

        setTimeout(() => document.body.classList.remove('theme-transitioning'), 800);
      }

      function finishOnboarding(skip = false) {
        if (skip) {
          state.purpose = null;
          state.style = null;
        }
        state.completed = true;
        savePrefs();
        if (typeof setLanguage === 'function') {
          setLanguage(state.lang);
        }
        applyTheme();
        closeOverlay();
      }

      function openOverlay() {
        overlay.classList.add('is-active');
        document.body.style.overflow = 'hidden';
      }

      function closeOverlay() {
        overlay.classList.remove('is-active');
        document.body.style.overflow = '';
      }

      function resetPersonalization() {
        state = { step: 0, lang: state.lang || 'en', purpose: null, style: null, completed: false };
        clearThemeClasses();
        stopHeroSlider();
        if (themeBgLayer) {
          themeBgLayer.classList.remove('is-active');
          themeBgLayer.style.backgroundImage = '';
        }
        if (resetBtn) resetBtn.classList.remove('is-visible');
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('ks_portfolio_prefs_v3');
        } catch (_) {}
        showStep(0);
        applyOnboardingI18n();
        openOverlay();
      }

      // Event wiring
      document.querySelectorAll('#onboardingLangGrid .onboarding-lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#onboardingLangGrid .onboarding-lang-btn').forEach((b) => b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          state.lang = btn.getAttribute('data-lang') || 'en';
          applyOnboardingI18n();
        });
      });

      document.getElementById('onboardingContinueLang')?.addEventListener('click', () => {
        applyOnboardingI18n();
        showStep(1);
      });

      document.getElementById('onboardingContinuePurpose')?.addEventListener('click', () => {
        if (!state.purpose) return;
        showStep(2);
      });

      document.getElementById('onboardingFinishBtn')?.addEventListener('click', () => {
        if (!state.style) return;
        finishOnboarding(false);
      });

      document.getElementById('onboardingCloseBtn')?.addEventListener('click', () => finishOnboarding(true));
      document.getElementById('onboardingSkipBtn')?.addEventListener('click', () => finishOnboarding(true));
      document.querySelectorAll('[data-onb-skip]').forEach((btn) => {
        btn.addEventListener('click', () => finishOnboarding(true));
      });
      document.querySelectorAll('[data-onb-back]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (state.step > 0) showStep(state.step - 1);
        });
      });

      if (resetBtn) {
        resetBtn.addEventListener('click', resetPersonalization);
      }

      // Boot
      const saved = loadPrefs();
      if (saved && saved.completed) {
        state.lang = saved.lang || 'en';
        state.purpose = saved.purpose;
        state.style = saved.style;
        state.completed = true;
        if (typeof setLanguage === 'function') setLanguage(state.lang);
        applyTheme();
      } else {
        state.lang = 'en';
        applyOnboardingI18n();
        showStep(0);
        setTimeout(() => openOverlay(), 300);
      }
    })();
