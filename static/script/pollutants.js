/* ══════════════════════════════════════════════════════════════
   POLLUTANT PAGES — motion layer (Project Vayu)

   Every pollutant gets an atmosphere that behaves the way the
   pollutant actually behaves:
     PM2.5 → fine haze suspended in still air
     PM10  → coarse grit blown along by gusts
     NO₂   → exhaust plumes + traffic light-streaks
     SO₂   → billowing smokestack columns
     CO    → almost nothing visible; only a detector's pulse
     O₃    → UV shimmer + drifting ozone triads
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var KEY = (body.dataset.pollutant || 'pm25').toLowerCase();

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* accent colour of the active theme, as "r,g,b" */
  function accentRGB() {
    var c = getComputedStyle(body).getPropertyValue('--accent').trim();
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      var n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var p = c.match(/\d+/g);
    return p ? [+p[0], +p[1], +p[2]] : [200, 210, 230];
  }

  /* ─────────────────────────────────────────────────────────
     1. ATMOSPHERE SYSTEMS
     ───────────────────────────────────────────────────────── */

  /* PM2.5 — fine particulate hanging in dead air */
  function haze(W, H, rgb) {
    var p = [], blobs = [], i,
        n = clamp(Math.round(W * H / 5200), 140, 380);
    for (i = 0; i < n; i++) {
      p.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.6, 3.2), a: rand(0.035, 0.2),
        vx: rand(-0.09, 0.16), vy: rand(-0.14, -0.02),
        ph: Math.random() * 6.28, sp: rand(0.4, 1.3),
        soft: Math.random() < 0.3
      });
    }
    for (i = 0; i < 5; i++) {
      blobs.push({ x: rand(0, W), y: rand(0, H), r: rand(220, 460), vx: rand(-0.12, 0.12), vy: rand(-0.05, 0.05) });
    }
    return {
      update: function (t) {
        p.forEach(function (o) {
          o.x += o.vx + Math.sin(t * 0.0006 * o.sp + o.ph) * 0.22;
          o.y += o.vy;
          if (o.y < -8) { o.y = H + 8; o.x = Math.random() * W; }
          if (o.x < -8) o.x = W + 8; else if (o.x > W + 8) o.x = -8;
        });
        blobs.forEach(function (b) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < -b.r) b.x = W + b.r; else if (b.x > W + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = H + b.r; else if (b.y > H + b.r) b.y = -b.r;
        });
      },
      draw: function (c) {
        /* milky veil — the air itself is dirty, not just the specks */
        c.fillStyle = 'rgba(' + rgb + ',0.014)';
        c.fillRect(0, 0, W, H);
        blobs.forEach(function (b) {
          var g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, 'rgba(' + rgb + ',0.055)');
          g.addColorStop(1, 'rgba(' + rgb + ',0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.283); c.fill();
        });
        p.forEach(function (o) {
          if (o.soft) {
            var g2 = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 4);
            g2.addColorStop(0, 'rgba(' + rgb + ',' + (o.a * 0.7).toFixed(3) + ')');
            g2.addColorStop(1, 'rgba(' + rgb + ',0)');
            c.fillStyle = g2;
            c.beginPath(); c.arc(o.x, o.y, o.r * 4, 0, 6.283); c.fill();
          } else {
            c.fillStyle = 'rgba(' + rgb + ',' + o.a + ')';
            c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.283); c.fill();
          }
        });
      }
    };
  }

  /* PM10 — coarse dust driven by gusts */
  function dust(W, H, rgb) {
    var p = [], gust = 0, gustAt = 2000,
        n = clamp(Math.round(W * H / 16000), 45, 120);
    for (var i = 0; i < n; i++) {
      p.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(1.2, 4.4), a: rand(0.08, 0.4),
        v: rand(0.35, 1.5), rot: Math.random() * 6.28, vr: rand(-0.03, 0.03),
        ph: Math.random() * 6.28
      });
    }
    return {
      update: function (t) {
        if (t > gustAt) { gust = rand(1.6, 3.4); gustAt = t + rand(3500, 9000); }
        gust *= 0.985;
        var wind = 1 + gust;
        p.forEach(function (o) {
          o.x += o.v * wind;
          o.y += Math.sin(t * 0.0009 + o.ph) * 0.35 - 0.06 * wind;
          o.rot += o.vr * wind;
          if (o.x > W + 12) { o.x = -12; o.y = Math.random() * H; }
          if (o.y < -12) o.y = H + 12; else if (o.y > H + 12) o.y = -12;
        });
      },
      draw: function (c) {
        p.forEach(function (o) {
          c.save();
          c.translate(o.x, o.y); c.rotate(o.rot);
          c.fillStyle = 'rgba(' + rgb + ',' + o.a + ')';
          c.beginPath();
          c.moveTo(-o.r, -o.r * 0.6);
          c.lineTo(o.r * 0.9, -o.r);
          c.lineTo(o.r, o.r * 0.7);
          c.lineTo(-o.r * 0.7, o.r);
          c.closePath(); c.fill();
          c.restore();
        });
      }
    };
  }

  /* NO₂ — exhaust plumes rising off the road + light streaks */
  function exhaust(W, H, rgb) {
    var puffs = [], streaks = [], nextStreak = 1200;
    function puff() {
      return {
        x: rand(0, W), y: H + rand(0, 40),
        r: rand(6, 16), grow: rand(0.10, 0.26),
        vy: rand(-0.55, -0.16), vx: rand(-0.22, 0.3),
        life: 0, max: rand(4200, 9000)
      };
    }
    for (var i = 0; i < 34; i++) { var o = puff(); o.life = Math.random() * o.max; o.y = rand(0, H); puffs.push(o); }
    return {
      update: function (t, dt) {
        puffs.forEach(function (o, i) {
          o.life += dt; o.x += o.vx; o.y += o.vy; o.r += o.grow;
          if (o.life > o.max || o.y < -80) puffs[i] = puff();
        });
        if (t > nextStreak) {
          streaks.push({
            x: -220, y: rand(H * 0.55, H * 0.95),
            len: rand(120, 320), v: rand(3.4, 7.5), a: rand(0.10, 0.26),
            dir: Math.random() < 0.5 ? 1 : -1
          });
          nextStreak = t + rand(1400, 4200);
        }
        streaks.forEach(function (s, i) {
          s.x += s.v * s.dir * (s.dir > 0 ? 1 : 1);
          if (s.dir < 0 && s.x < -s.len - 260) streaks.splice(i, 1);
          if (s.dir > 0 && s.x > W + s.len + 260) streaks.splice(i, 1);
        });
        streaks.forEach(function (s) { if (s.dir < 0 && s.x === -220) s.x = W + 220; });
      },
      draw: function (c) {
        puffs.forEach(function (o) {
          var f = 1 - o.life / o.max,
              a = Math.sin(Math.PI * (o.life / o.max)) * 0.16 * f + 0.02,
              g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
          g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + rgb + ',0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.283); c.fill();
        });
        streaks.forEach(function (s) {
          var x0 = s.x, x1 = s.x + s.len * s.dir,
              g = c.createLinearGradient(x0, 0, x1, 0);
          g.addColorStop(0, 'rgba(255,190,140,0)');
          g.addColorStop(0.55, 'rgba(255,190,140,' + s.a + ')');
          g.addColorStop(1, 'rgba(255,120,90,0)');
          c.strokeStyle = g; c.lineWidth = rand(1.1, 1.9); c.lineCap = 'round';
          c.beginPath(); c.moveTo(x0, s.y); c.lineTo(x1, s.y); c.stroke();
        });
      }
    };
  }

  /* SO₂ — sulfurous smokestack columns billowing upward */
  function smoke(W, H, rgb) {
    var cols = [0.1, 0.34, 0.63, 0.88].map(function (f) {
      return { x: W * f, amp: rand(18, 46), freq: rand(0.0006, 0.0014), ph: Math.random() * 6.28 };
    });
    var p = [];
    function make(col) {
      return {
        col: col, y: H + rand(0, 60), off: 0,
        r: rand(8, 20), grow: rand(0.16, 0.4),
        vy: rand(-0.6, -0.22), life: 0, max: rand(6000, 12000),
        ph: Math.random() * 6.28
      };
    }
    cols.forEach(function (col) {
      for (var i = 0; i < 14; i++) { var o = make(col); o.life = Math.random() * o.max; o.y = rand(0, H); p.push(o); }
    });
    return {
      update: function (t, dt) {
        p.forEach(function (o, i) {
          o.life += dt; o.y += o.vy; o.r += o.grow;
          o.off = Math.sin(t * o.col.freq + o.ph) * o.col.amp * (1 - o.y / H + 0.35);
          if (o.life > o.max || o.y < -100) p[i] = make(o.col);
        });
      },
      draw: function (c) {
        p.forEach(function (o) {
          var f = o.life / o.max,
              a = Math.sin(Math.PI * f) * 0.13 + 0.015,
              x = o.col.x + o.off,
              g = c.createRadialGradient(x, o.y, 0, x, o.y, o.r);
          g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(0.6, 'rgba(' + rgb + ',' + (a * 0.35).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + rgb + ',0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(x, o.y, o.r, 0, 6.283); c.fill();
        });
      }
    };
  }

  /* CO — colourless, odourless. You only see the detector pulse. */
  function invisible(W, H, rgb) {
    var rings = [], nextRing = 600, ghosts = [];
    for (var i = 0; i < 46; i++) {
      ghosts.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.8, 2.2), ph: Math.random() * 6.28, sp: rand(0.3, 0.9),
        vx: rand(-0.12, 0.12), vy: rand(-0.1, 0.06)
      });
    }
    return {
      update: function (t, dt) {
        if (t > nextRing) {
          rings.push({ x: rand(W * 0.2, W * 0.8), y: rand(H * 0.35, H * 0.75), r: 0, max: rand(240, 520) });
          nextRing = t + rand(2600, 4800);
        }
        rings.forEach(function (r, i) {
          r.r += 0.85;
          if (r.r > r.max) rings.splice(i, 1);
        });
        ghosts.forEach(function (g) {
          g.x += g.vx; g.y += g.vy;
          if (g.x < 0) g.x = W; else if (g.x > W) g.x = 0;
          if (g.y < 0) g.y = H; else if (g.y > H) g.y = 0;
        });
      },
      draw: function (c, t) {
        rings.forEach(function (r) {
          var f = 1 - r.r / r.max;
          c.strokeStyle = 'rgba(' + rgb + ',' + (f * 0.13).toFixed(3) + ')';
          c.lineWidth = 1.1;
          c.beginPath(); c.arc(r.x, r.y, r.r, 0, 6.283); c.stroke();
          c.strokeStyle = 'rgba(' + rgb + ',' + (f * 0.05).toFixed(3) + ')';
          c.beginPath(); c.arc(r.x, r.y, r.r * 0.62, 0, 6.283); c.stroke();
        });
        ghosts.forEach(function (g) {
          var a = (Math.sin(t * 0.0008 * g.sp + g.ph) * 0.5 + 0.5) * 0.11;
          c.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
          c.beginPath(); c.arc(g.x, g.y, g.r, 0, 6.283); c.fill();
        });
      }
    };
  }

  /* O₃ — photochemical shimmer + drifting ozone triads */
  function ozone(W, H, rgb) {
    var waves = [], triads = [], i;
    for (i = 0; i < 5; i++) {
      waves.push({ y: H * (0.2 + i * 0.16), amp: rand(14, 40), len: rand(220, 460), sp: rand(0.0003, 0.0008), a: rand(0.05, 0.12) });
    }
    for (i = 0; i < 26; i++) {
      triads.push({ x: Math.random() * W, y: Math.random() * H, s: rand(3.5, 8), rot: Math.random() * 6.28, vr: rand(-0.008, 0.008), vy: rand(-0.35, -0.08), vx: rand(-0.15, 0.15), a: rand(0.15, 0.45) });
    }
    return {
      update: function (t) {
        waves.forEach(function (w) { w.y -= 0.08; if (w.y < -60) w.y = H + 60; });
        triads.forEach(function (o) {
          o.x += o.vx; o.y += o.vy; o.rot += o.vr;
          if (o.y < -20) { o.y = H + 20; o.x = Math.random() * W; }
          if (o.x < -20) o.x = W + 20; else if (o.x > W + 20) o.x = -20;
        });
      },
      draw: function (c, t) {
        /* sun glow — ozone is made by sunlight */
        var sg = c.createRadialGradient(W * 0.82, H * 0.06, 0, W * 0.82, H * 0.06, W * 0.42),
            pulse = 0.05 + Math.sin(t * 0.0006) * 0.02;
        sg.addColorStop(0, 'rgba(255,246,200,' + pulse.toFixed(3) + ')');
        sg.addColorStop(1, 'rgba(255,246,200,0)');
        c.fillStyle = sg; c.fillRect(0, 0, W, H);

        waves.forEach(function (w) {
          c.strokeStyle = 'rgba(' + rgb + ',' + w.a + ')';
          c.lineWidth = 1.2;
          c.beginPath();
          for (var x = 0; x <= W; x += 12) {
            var y = w.y + Math.sin((x / w.len) * 6.283 + t * w.sp * 6) * w.amp;
            x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
          }
          c.stroke();
        });

        triads.forEach(function (o) {
          c.save(); c.translate(o.x, o.y); c.rotate(o.rot);
          c.fillStyle = 'rgba(' + rgb + ',' + o.a + ')';
          c.strokeStyle = 'rgba(' + rgb + ',' + (o.a * 0.5) + ')';
          c.lineWidth = 1;
          var pts = [[-o.s, o.s * 0.6], [0, -o.s * 0.9], [o.s, o.s * 0.6]];
          c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
          c.lineTo(pts[1][0], pts[1][1]); c.lineTo(pts[2][0], pts[2][1]);
          c.stroke();
          pts.forEach(function (pt) {
            c.beginPath(); c.arc(pt[0], pt[1], o.s * 0.34, 0, 6.283); c.fill();
          });
          c.restore();
        });
      }
    };
  }

  var SYSTEMS = { pm25: haze, pm10: dust, no2: exhaust, so2: smoke, co: invisible, o3: ozone };

  /* ─────────────────────────────────────────────────────────
     2. CANVAS RUNNER
     ───────────────────────────────────────────────────────── */

  function startAtmosphere() {
    var cv = document.getElementById('atmos-canvas');
    if (!cv || REDUCED) return;
    var ctx = cv.getContext('2d'),
        rgb = accentRGB().join(','),
        dpr = Math.min(window.devicePixelRatio || 1, 1.5),
        W = 0, H = 0, sys = null, last = 0, t0 = 0;

    function build() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sys = (SYSTEMS[KEY] || haze)(W, H, rgb);
    }
    build();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 220);
    });

    function frame(ts) {
      if (!t0) { t0 = ts; last = ts; }
      var t = ts - t0, dt = Math.min(ts - last, 64);
      last = ts;
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H);
        sys.update(t, dt);
        sys.draw(ctx, t);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ─────────────────────────────────────────────────────────
     3. SCROLL REVEALS
     ───────────────────────────────────────────────────────── */

  function setupReveals() {
    var sel = '.what-block, .section-heading, .source-card, .effect-group, ' +
              '.protection-list, .styled-list, .who-stat, .who-note, ' +
              '.season-block, .extra-block, .who-heading, .poll-footer-grid';
    var nodes = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!nodes.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('in'); });
      return;
    }

    nodes.forEach(function (n) { n.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var group = e.target.parentElement,
            sibs = group ? Array.prototype.slice.call(group.children).filter(function (c) {
              return c.classList.contains('reveal');
            }) : [],
            idx = Math.max(0, sibs.indexOf(e.target));
        e.target.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    nodes.forEach(function (n) { io.observe(n); });

    /* failsafe: nothing that is on screen stays invisible */
    setTimeout(function () {
      nodes.forEach(function (n) {
        if (n.classList.contains('in')) return;
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) n.classList.add('in');
      });
    }, 2500);
  }

  /* ─────────────────────────────────────────────────────────
     4. COUNT-UP NUMBERS
     ───────────────────────────────────────────────────────── */

  function countUp(el, target, decimals, dur) {
    var start = null;
    dur = dur || 1200;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1),
          e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setupCounters() {
    var stats = document.querySelectorAll('.who-stat-value');
    if (!stats.length) return;
    Array.prototype.forEach.call(stats, function (el) {
      var raw = el.textContent.trim(),
          num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return;
      var dec = (raw.split('.')[1] || '').length;
      if (REDUCED || !('IntersectionObserver' in window)) return;
      el.textContent = (0).toFixed(dec);
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) {
          if (!e.isIntersecting) return;
          countUp(el, num, dec, 1100);
          io.unobserve(el);
        });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ─────────────────────────────────────────────────────────
     5. CARD SPOTLIGHT + HERO PARALLAX
     ───────────────────────────────────────────────────────── */

  function setupPointerFX() {
    if (REDUCED) return;

    document.addEventListener('pointermove', function (ev) {
      var card = ev.target.closest ? ev.target.closest('.source-card') : null;
      if (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
        card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
      }
    }, { passive: true });

    var motif = document.querySelector('.hero-motif'),
        hero = document.querySelector('.pollutant-header');
    if (motif && hero) {
      hero.addEventListener('pointermove', function (ev) {
        var r = hero.getBoundingClientRect(),
            dx = (ev.clientX - r.left - r.width / 2) / r.width,
            dy = (ev.clientY - r.top - r.height / 2) / r.height;
        motif.style.transform = 'translate(' + (dx * 16).toFixed(2) + 'px,' + (dy * 12).toFixed(2) + 'px)';
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { motif.style.transform = ''; });
      motif.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    }
  }

  /* ─────────────────────────────────────────────────────────
     6. READING PROGRESS
     ───────────────────────────────────────────────────────── */

  function setupProgress() {
    var bar = document.querySelector('.read-progress');
    if (!bar) return;
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight,
          p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = clamp(p, 0, 100) + '%';
    }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }

  /* ─────────────────────────────────────────────────────────
     7. TITLE LETTER ENTRANCE
     ───────────────────────────────────────────────────────── */

  function setupTitle() {
    var el = document.querySelector('.pollutant-title');
    if (!el || REDUCED) return;
    var text = el.textContent.trim(), out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i] === ' ' ? '&nbsp;' : text[i];
      out += '<span class="ch" style="animation-delay:' + (i * 55 + 80) + 'ms">' + ch + '</span>';
    }
    el.innerHTML = out;
  }

  /* ─────────────────────────────────────────────────────────
     8. LIVE READING (same feed the dashboard uses)
     ───────────────────────────────────────────────────────── */

  function setupLive() {
    var chip = document.querySelector('.live-chip');
    if (!chip) return;
    var region = chip.dataset.region || 'North_Delhi';

    fetch('/api/pollutant-now?region=' + encodeURIComponent(region) + '&key=' + encodeURIComponent(KEY))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d) return;
        if (!d.ok) {
          if (d.reason === 'not measured in this feed') {
            chip.classList.add('on', 'muted');
            chip.querySelector('.live-val').textContent = '';
            chip.querySelector('.live-flag').lastChild.textContent = ' NOT IN FEED';
            chip.querySelector('.live-region').textContent =
              'This pollutant is not carried by the current satellite feed';
          }
          return;
        }
        var val = chip.querySelector('.live-val'),
            unit = chip.querySelector('.live-unit'),
            level = chip.querySelector('.live-level'),
            reg = chip.querySelector('.live-region');
        unit.textContent = d.unit;
        level.textContent = d.level;
        level.style.color = d.color;
        level.style.background = 'color-mix(in srgb, ' + d.color + ' 20%, transparent)';
        reg.textContent = d.region.replace(/_/g, ' ') + ' · ' + d.updated;
        chip.classList.add('on');
        REDUCED ? (val.textContent = d.value.toFixed(1)) : countUp(val, d.value, 1, 1000);
      })
      .catch(function () { /* page stands on its own without live data */ });
  }

  /* ─────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────── */

  function init() {
    setupTitle();
    startAtmosphere();
    setupReveals();
    setupCounters();
    setupPointerFX();
    setupProgress();
    setupLive();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
