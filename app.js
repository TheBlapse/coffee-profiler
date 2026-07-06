// =============================================================
//  Flavor Peak Profile — static coffee roaster graph generator
// =============================================================

const ATTRS = [
  { key: 'aroma',      label: 'aroma',      color: '#ffd76b' },
  { key: 'sweetness',  label: 'sweetness',  color: '#ffb3c6' },
  { key: 'aftertaste', label: 'aftertaste', color: '#a8e6cf' },
  { key: 'acidity',    label: 'acidity',    color: '#ffcaa0' },
  { key: 'body',       label: 'body',       color: '#c5b3ff' },
];

const DEFAULTS = {
  aroma:      { ready: 5,  peak: 10, peakEnd: null, decline: 21 },
  sweetness:  { ready: 7,  peak: 14, peakEnd: null, decline: 28 },
  aftertaste: { ready: 6,  peak: 12, peakEnd: null, decline: 24 },
  acidity:    { ready: 3,  peak: 8,  peakEnd: null, decline: 18 },
  body:       { ready: 8,  peak: 16, peakEnd: null, decline: 30 },
};

const THEME_DEFAULTS = {
  background: '#000000',
  text:       '#f5f5f5',
  accent:     '#ffd76b',
  grid:       '#1d1d1d',
  window:     '#ffffff',
  aroma:      '#ffd76b',
  sweetness:  '#ffb3c6',
  aftertaste: '#a8e6cf',
  acidity:    '#ffcaa0',
  body:       '#c5b3ff',
};

const DAY_MIN = 0;
const DAY_MAX = 200;
const FWHM_C = 1 / Math.sqrt(2 * Math.LN2);
const FONT = "'Space Mono', monospace";

// ---------- toast ----------
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ---------- state ----------
const state = {
  coffeeName: '',
  subtitle: '',
  roastDate: '',
  attrs: ATTRS.map(a => ({ ...a, ...DEFAULTS[a.key], enabled: true })),
  theme: { ...THEME_DEFAULTS },
};

// ---------- helpers ----------
// Returns numeric value clamped to [0, 200] with sign fixed, or null for blanks.
function parseDay(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return Math.min(DAY_MAX, Math.max(DAY_MIN, Math.abs(n)));
}

// Live: enforce the 0–200 cap in the input itself and warn the user.
function enforceDayInput(inp) {
  const raw = inp.value;
  if (raw === '') return;
  const n = Number(raw);
  if (isNaN(n)) return;
  const negative = n < 0;
  const tooHigh = Math.abs(n) > DAY_MAX;
  if (negative || tooHigh) {
    const fixed = Math.min(DAY_MAX, Math.max(DAY_MIN, Math.abs(n)));
    inp.value = String(fixed);
    const what = inp.dataset.field.replace('peakEnd', 'peak end');
    const cap = tooHigh ? `capped to ${DAY_MAX} d` : 'set positive';
    showToast(`⚠  ${what}: ${raw} → ${fixed}  (${cap})`);
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------- build attribute rows ----------
const attrList = document.getElementById('attrList');
ATTRS.forEach(a => {
  const d = DEFAULTS[a.key];
  const row = document.createElement('div');
  row.className = 'attr';
  row.style.setProperty('--c', a.color);
  row.innerHTML = `
    <div class="attr-head">
      <span class="attr-name"><span class="dot"></span>${a.label}</span>
      <button class="mute-btn" data-key="${a.key}" title="show / hide" type="button">on</button>
    </div>
    <div class="quad">
      <div class="field-group">
        <label>ready (d)</label>
        <input type="number" min="0" max="200" step="1" data-key="${a.key}" data-field="ready" value="${d.ready}" />
      </div>
      <div class="field-group">
        <label>peak start</label>
        <input type="number" min="0" max="200" step="1" data-key="${a.key}" data-field="peak" value="${d.peak}" />
      </div>
      <div class="field-group">
        <label>peak end <span class="opt">opt</span></label>
        <input type="number" min="0" max="200" step="1" data-key="${a.key}" data-field="peakEnd" value="${d.peakEnd ?? ''}" placeholder="—" />
      </div>
      <div class="field-group">
        <label>decline (d)</label>
        <input type="number" min="0" max="200" step="1" data-key="${a.key}" data-field="decline" value="${d.decline}" />
      </div>
    </div>`;
  attrList.appendChild(row);
});

// ---------- build color picker grid ----------
const COLOR_FIELDS = [
  { key: 'background', label: 'background' },
  { key: 'text',       label: 'text' },
  { key: 'accent',     label: 'accent (brand mark)' },
  { key: 'grid',       label: 'grid lines' },
  { key: 'window',     label: 'peak window band' },
  ...ATTRS.map(a => ({ key: a.key, label: a.label })),
];
const colorGrid = document.getElementById('colorGrid');
COLOR_FIELDS.forEach(f => {
  const cell = document.createElement('label');
  cell.className = 'color-cell';
  cell.innerHTML = `
    <span>${f.label}</span>
    <input type="color" data-theme="${f.key}" value="${THEME_DEFAULTS[f.key]}" />`;
  colorGrid.appendChild(cell);
});

// ---------- default roast date = today ----------
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().split('T')[0];
}
const roastDateInput = document.getElementById('roastDate');
roastDateInput.value = todayISO();
state.roastDate = roastDateInput.value;

// ---------- read form into state ----------
function readForm() {
  state.coffeeName = document.getElementById('coffeeName').value;
  state.subtitle   = document.getElementById('subtitle').value;
  state.roastDate  = roastDateInput.value;
  document.querySelectorAll('#attrList input[type=number]').forEach(inp => {
    const a = state.attrs.find(x => x.key === inp.dataset.key);
    const field = inp.dataset.field;
    const v = parseDay(inp.value);
    if (field === 'peakEnd') {
      a.peakEnd = v;           // may be null = single-day peak
    } else {
      a[field] = v === null ? 0 : v;
    }
  });
}

// ---------- wire up ----------
document.querySelectorAll('#attrList input[type=number]').forEach(inp => {
  inp.addEventListener('input', () => {
    enforceDayInput(inp);
    render();
  });
  // also enforce on blur in case of paste / spinner
  inp.addEventListener('blur', () => {
    enforceDayInput(inp);
    render();
  });
});
['coffeeName', 'subtitle'].forEach(id =>
  document.getElementById(id).addEventListener('input', render)
);
roastDateInput.addEventListener('input', render);
roastDateInput.addEventListener('change', render);

document.querySelectorAll('.mute-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const a = state.attrs.find(x => x.key === btn.dataset.key);
    a.enabled = !a.enabled;
    btn.textContent = a.enabled ? 'on' : 'off';
    btn.closest('.attr').classList.toggle('muted', !a.enabled);
    render();
  });
});

document.querySelectorAll('input[type="color"][data-theme]').forEach(inp => {
  inp.addEventListener('input', () => {
    state.theme[inp.dataset.theme] = inp.value;
    if (inp.dataset.theme === 'accent')
      document.documentElement.style.setProperty('--accent', inp.value);
    render();
  });
});

document.getElementById('resetColors').addEventListener('click', () => {
  state.theme = { ...THEME_DEFAULTS };
  document.querySelectorAll('input[type="color"][data-theme]').forEach(inp => {
    inp.value = THEME_DEFAULTS[inp.dataset.theme];
  });
  document.documentElement.style.setProperty('--accent', THEME_DEFAULTS.accent);
  render();
});

const advToggle = document.getElementById('advToggle');
const advPanel = document.getElementById('advPanel');
advToggle.addEventListener('click', () => {
  const open = advToggle.classList.toggle('open');
  advPanel.hidden = !open;
  advToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  document.querySelectorAll('#attrList input[type=number]').forEach(inp => {
    const def = DEFAULTS[inp.dataset.key][inp.dataset.field];
    inp.value = def ?? '';
  });
  state.attrs.forEach(a => {
    a.enabled = true;
    const btn = document.querySelector(`.mute-btn[data-key="${a.key}"]`);
    btn.textContent = 'on';
    btn.closest('.attr').classList.remove('muted');
  });
  render();
});

// =============================================================
//  Curve model — asymmetric gaussian with optional plateau
//  intensity = 1 across [peak, peakEnd], 0.5 at ready & decline
// =============================================================
function intensity(day, ready, peak, peakEnd, decline) {
  // optional plateau: hold at 1.0 across [peak, peakEnd]
  if (peakEnd !== null && peakEnd > peak && day >= peak && day <= peakEnd) {
    return 1;
  }
  // ascending side — gaussian up to peak (centre of plateau = peak)
  if (day <= peak) {
    const halfWidth = Math.max(0.5, peak - ready);
    const sigma = halfWidth * FWHM_C;
    return Math.exp(-((day - peak) ** 2) / (2 * sigma * sigma));
  }
  // descending side — gaussian from peakEnd (or peak) down to decline
  const tailStart = (peakEnd !== null && peakEnd > peak) ? peakEnd : peak;
  const halfWidth = Math.max(0.5, decline - tailStart);
  const sigma = halfWidth * FWHM_C;
  return Math.exp(-((day - tailStart) ** 2) / (2 * sigma * sigma));
}

function xStep(xMax) {
  let s = 2;
  while (xMax / s > 10) s += 2;
  return s;
}

// =============================================================
//  Drawing
// =============================================================
function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function draw(ctx, W, H, st) {
  const { theme } = st;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, W, H);

  const active = st.attrs.filter(a => a.enabled && a.peak > 0);
  if (active.length === 0) {
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = 0.4;
    ctx.font = `${Math.round(H * 0.03)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('— enable at least one attribute —', W / 2, H / 2);
    ctx.globalAlpha = 1;
    return;
  }

  // ---- layout bands ----
  const padL = W * 0.11, padR = W * 0.05;
  const titleSize = Math.round(H * 0.045);
  const subSize   = Math.round(H * 0.022);
  const lblSize   = Math.round(H * 0.017);
  const legSize   = Math.round(H * 0.02);

  const titleY      = H * 0.085;
  const subtitleY   = titleY + subSize * 1.7;
  const winLabelY   = H * 0.215;
  const plotTopY    = H * 0.245;
  const plotBotY    = H * 0.80;
  const xNumY       = plotBotY + lblSize * 2.0;
  const xCaptionY   = plotBotY + lblSize * 5.0;
  const legY        = H * 0.93;

  const px = padL, py = plotTopY;
  const pw = W - padL - padR;
  const ph = plotBotY - plotTopY;

  const xMaxRaw = Math.max(...active.map(a =>
    Math.max(a.decline, a.ready, a.peak, a.peakEnd || 0)));
  const step = xStep(xMaxRaw);
  const xMax = Math.max(step, Math.ceil((xMaxRaw * 1.08) / step) * step);

  const X = d => px + (d / xMax) * pw;
  const Y = v => py + ph - (v / 1.05) * ph;

  // ---- title + subtitle (+ roast date) ----
  ctx.fillStyle = theme.text;
  ctx.font = `700 ${titleSize}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(st.coffeeName || 'Untitled Coffee', padL, titleY);

  ctx.fillStyle = hexToRgba(theme.text, 0.55);
  ctx.font = `400 ${subSize}px ${FONT}`;
  const sub = [st.subtitle, formatDate(st.roastDate)].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, padL, subtitleY);

  // ---- grid ----
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = hexToRgba(theme.text, 0.45);
  ctx.font = `400 ${lblSize}px ${FONT}`;

  for (let v = 0; v <= 1.0001; v += 0.25) {
    const yy = Y(v);
    ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(v.toFixed(2), px - 10, yy + lblSize * 0.35);
  }
  for (let d = 0; d <= xMax + 0.001; d += step) {
    const xx = X(d);
    ctx.beginPath(); ctx.moveTo(xx, py); ctx.lineTo(xx, py + ph); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(d)), xx, xNumY);
  }

  // ---- peak-window band ----
  const N = 400;
  const totals = [];
  let maxTotal = 0;
  for (let i = 0; i <= N; i++) {
    const day = (i / N) * xMax;
    let t = 0;
    for (const a of active) t += intensity(day, a.ready, a.peak, a.peakEnd, a.decline);
    totals.push({ day, t });
    if (t > maxTotal) maxTotal = t;
  }
  const thresh = maxTotal * 0.85;
  let winStart = null, winEnd = null;
  for (const p of totals) {
    if (p.t >= thresh) {
      if (winStart === null) winStart = p.day;
      winEnd = p.day;
    }
  }

  if (winStart !== null && winEnd > winStart) {
    ctx.fillStyle = hexToRgba(theme.window, 0.07);
    ctx.fillRect(X(winStart), py, X(winEnd) - X(winStart), ph);
    ctx.strokeStyle = hexToRgba(theme.window, 0.22);
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1;
    [winStart, winEnd].forEach(d => {
      ctx.beginPath(); ctx.moveTo(X(d), py); ctx.lineTo(X(d), py + ph); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.fillStyle = hexToRgba(theme.text, 0.6);
    ctx.textAlign = 'center';
    ctx.font = `400 ${lblSize}px ${FONT}`;
    const wlbl = `peak window  ${Math.round(winStart)}–${Math.round(winEnd)} d`;
    ctx.fillText(wlbl, X((winStart + winEnd) / 2), winLabelY);
  }

  // ---- curves ----
  const samples = 240;
  for (const a of active) {
    ctx.strokeStyle = theme[a.key];
    ctx.lineWidth = Math.max(2, H * 0.0035);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const day = (i / samples) * xMax;
      const v = intensity(day, a.ready, a.peak, a.peakEnd, a.decline);
      const xx = X(day), yy = Y(v);
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    // markers at ready / peak / peakEnd (if set) / decline
    const marks = [['ready', 3], ['peak', 5], ['decline', 3]];
    if (a.peakEnd !== null && a.peakEnd > a.peak) marks.splice(2, 0, ['peakEnd', 5]);
    marks.forEach(([fld, r]) => {
      const d = a[fld];
      if (d == null || d < 0 || d > xMax) return;
      const v = intensity(d, a.ready, a.peak, a.peakEnd, a.decline);
      const xx = X(d), yy = Y(v);
      ctx.fillStyle = theme.background;
      ctx.strokeStyle = theme[a.key];
      ctx.lineWidth = Math.max(1.5, H * 0.0025);
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(r, H * 0.004), 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    });

    // peak label — single-day "dN" or plateau range "dN–dM"
    const pd = a.peak;
    if (pd >= 0 && pd <= xMax) {
      const yy = Y(1);
      ctx.fillStyle = theme[a.key];
      ctx.textAlign = 'center';
      ctx.font = `500 ${Math.round(H * 0.016)}px ${FONT}`;
      let lbl = `d${Math.round(pd)}`;
      if (a.peakEnd !== null && a.peakEnd > pd)
        lbl = `d${Math.round(pd)}–d${Math.round(a.peakEnd)}`;
      ctx.fillText(lbl, X((pd + (a.peakEnd || pd)) / 2), yy - H * 0.014);
    }
  }

  // ---- axis captions ----
  ctx.fillStyle = hexToRgba(theme.text, 0.45);
  ctx.textAlign = 'center';
  ctx.font = `400 ${lblSize}px ${FONT}`;
  ctx.fillText('days from roast', px + pw / 2, xCaptionY);
  ctx.save();
  ctx.translate(px - lblSize * 4.5, py + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('intensity', 0, 0);
  ctx.restore();

  // ---- legend ----
  ctx.textAlign = 'center';
  ctx.font = `500 ${legSize}px ${FONT}`;
  const legItemW = pw / active.length;
  active.forEach((a, i) => {
    const cx = px + legItemW * i + legItemW / 2;
    const txtW = ctx.measureText(a.label).width;
    ctx.fillStyle = theme[a.key];
    ctx.beginPath();
    ctx.arc(cx - txtW / 2 - 12, legY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.text;
    ctx.fillText(a.label, cx, legY + legSize * 0.35);
  });
}

// =============================================================
//  Live canvas (DPR-aware)
// =============================================================
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

function render() {
  readForm();
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  if (w === 0 || h === 0) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx, w, h, state);
}

let resizeRAF;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(render);
});
window.addEventListener('load', render);
window.addEventListener('orientationchange', render);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
render();

// =============================================================
//  PNG export — fresh render at high resolution
// =============================================================
document.getElementById('exportBtn').addEventListener('click', () => {
  const SCALE = 3;
  const W = 1600, H = 1000;
  const off = document.createElement('canvas');
  off.width = W * SCALE;
  off.height = H * SCALE;
  const octx = off.getContext('2d');
  octx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const doExport = () => {
    readForm();
    draw(octx, W, H, state);
    const name = (state.coffeeName || 'coffee').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'coffee';
    const a = document.createElement('a');
    a.download = `${name}-flavor-peak.png`;
    a.href = off.toDataURL('image/png');
    a.click();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(doExport);
  else doExport();
});
