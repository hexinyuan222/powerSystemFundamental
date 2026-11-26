/* Four-wire feeder from Lecture Block 2, with independent constant-PQ loads. */
(function () {
  "use strict";

  const names = ["A", "B", "C"];
  const pairs = ["AB", "BC", "CA"];
  const pairTag = ["Vab", "Vbc", "Vca"];
  const R = 0.04;
  const X = 0.08;
  const radians = Math.PI / 180;
  const settings = [
    { key: "e", label: "Source |E|", unit: "pu", min: 0.60, max: 1.30, step: 0.01 },
    { key: "d", label: "Source angle", unit: "°", min: -180, max: 180, step: 1 },
    { key: "p", label: "Active load P", unit: "pu", min: 0, max: 1.80, step: 0.01 },
    { key: "q", label: "Reactive load Q", unit: "pu", min: -0.90, max: 0.90, step: 0.01 }
  ];
  const presets = {
    uneven: [[1, 0, 0.92, 0.36], [1, -120, 0.63, 0.22], [1, 120, 0.38, 0.10]],
    balanced: [[1, 0, 0.60, 0.20], [1, -120, 0.60, 0.20], [1, 120, 0.60, 0.20]],
    sag: [[0.82, -6, 0.60, 0.20], [1, -120, 0.60, 0.20], [1, 120, 0.60, 0.20]]
  };

  function unpack(preset) {
    return presets[preset].map(([e, d, p, q]) => ({e, d, p, q}));
  }

  function rotate(re, im, d) {
    const angle = d * radians;
    return {re: re * Math.cos(angle) - im * Math.sin(angle),
      im: re * Math.sin(angle) + im * Math.cos(angle)};
  }

  // In the source-aligned frame, E·conj(V) = |V|² + Z·conj(S).
  function solvePhase({e, d, p, q}) {
    const source = rotate(e, 0, d);
    const y = (R * q - X * p) / e;
    const disc = e * e - 4 * (y * y + R * p + X * q);
    if (disc < -1e-12) return {source, voltage: null, current: null};
    const x = (e + Math.sqrt(Math.max(disc, 0))) / 2;
    const voltage = rotate(x, y, d);
    const magnitudeSquared = x * x + y * y;
    const current = rotate((p * x + q * y) / magnitudeSquared,
      (p * y - q * x) / magnitudeSquared, d);
    return {source, voltage, current};
  }

  function lineVoltage(a, b) {
    return a && b ? {re: a.re - b.re, im: a.im - b.im} : null;
  }

  function polarText(z) {
    if (!z) return "—";
    const v = Math.hypot(z.re, z.im);
    if (v < 0.0005) return "0.000 ∠ —";
    const degrees = Math.atan2(z.im, z.re) / radians;
    return v.toFixed(3) + " ∠ " + (Math.abs(degrees) < 0.05 ? "0.0" : degrees.toFixed(1)) + "°";
  }

  function circuit(colors, narrow) {
    const pos = narrow
      ? {width:340, left:12, right:328, source:39, radius:10, tap:61, z1:110, z2:138, arrow:185, meter:171, receiving:239, load1:250, load2:306, font:10, halfSine:7}
      : {width:680, left:44, right:638, source:101, radius:15, tap:146, z1:289, z2:337, arrow:391, meter:373, receiving:493, load1:535, load2:603, font:12, halfSine:11};
    const {width, left, right, source, radius, tap, z1, z2, arrow, meter, receiving, load1, load2, font, halfSine} = pos;
    const voltageArrow = narrow ? 211 : 453;
    const rows = [32, 76, 120];
    const branches = rows.map((y, i) => {
      const c = colors[i], suffix = names[i].toLowerCase();
      return `<g stroke="${c}" fill="none" stroke-width="2" stroke-linejoin="round">
        <rect data-ld-band="${i}" x="${left-6}" y="${y-18}" width="${right-left+12}" height="36" rx="3" fill="${c}" fill-opacity="0" stroke="none"/>
        <path d="M${left} ${y}H${source-radius} M${source+radius} ${y}H${z1} M${z2} ${y}H${load1} M${load2} ${y}H${right}"/>
        <circle cx="${source}" cy="${y}" r="${radius}" fill="white"/>
        <path d="M${source-halfSine} ${y}q${halfSine/2} ${-halfSine} ${halfSine} 0 t${halfSine} 0" stroke-width="1.5"/>
        <circle cx="${tap}" cy="${y}" r="2.8" fill="${c}"/>
        <rect x="${z1}" y="${y-5}" width="${z2-z1}" height="10" fill="#f5f8f6"/>
        <path d="M${arrow-8} ${y-3.5}l8 3.5 -8 3.5z" fill="${c}" stroke="none"/>
        <circle cx="${receiving}" cy="${y}" r="2.8" fill="${c}"/>
        <rect x="${load1}" y="${y-11}" width="${load2-load1}" height="22" rx="2" fill="#fff"/>
        <circle cx="${left}" cy="${y}" r="2.3" fill="${c}"/>
        <circle cx="${right}" cy="${y}" r="2.3" fill="${c}"/>
        <g fill="${c}" stroke="none" font-size="${font}" font-family="ui-monospace, monospace">
          <text data-ld-amps="${i}" x="${meter}" y="${y-7}" text-anchor="middle"></text>
          <text x="${tap+3}" y="${y-6}">E${suffix}n</text>
          <text x="${receiving-3}" y="${y-6}" text-anchor="end">V${suffix}n</text>
          <text x="${(load1+load2)/2}" y="${y+4}" text-anchor="middle">P${suffix}+jQ${suffix}</text>
        </g>
      </g>`;
    }).join("");
    return `<svg class="ld-schematic" viewBox="0 0 ${width} 191" role="img" aria-label="Three source branches share a grounded neutral on the left. Each conductor passes through a series impedance and its own constant-power load to the common neutral on the right.">
      <g fill="none" stroke="#6f8381" stroke-width="2"><path d="M${left} 32V162H${right}V32"/>
      <path d="M${left} 162v10m-9 0h18m-14 4h10m-7 4h4" stroke-width="1.7"/></g>
      ${branches}
      <g aria-label="Vab measures phase A potential relative to phase B"><title>Load Vab = Van − Vbn. The dashed arrow marks the voltage measurement.</title>
        <g fill="none" stroke="#596d69" stroke-width="1.2">
          <path d="M${voltageArrow} 70V38" stroke-dasharray="3 2"/>
          <path d="M${voltageArrow-3} 43l3 -5 3 5 M${voltageArrow-3} 70h6"/>
        </g>
        <text x="${voltageArrow+4}" y="59" font-family="ui-monospace, monospace" font-size="${font}" fill="#405b55">Vab</text>
      </g>
      <g fill="#566b69" font-size="${font}" font-family="ui-monospace, monospace">
        <text x="${left+6}" y="157">n</text><text x="${right-10}" y="157">n</text>
        <text x="${width/2}" y="180" text-anchor="middle">Ideal neutral · Zₙ = 0</text>
      </g></svg>`;
  }

  const styles = `
    #load-panel .ld-system {display:grid;grid-template-columns:minmax(0,2.18fr) minmax(260px,.95fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    #load-panel .ld-drawing {min-width:0;padding:17px 20px 10px 0}
    #load-panel .ld-sectionhead {display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
    #load-panel h3 {font-size:15px;font-weight:650;margin:0;color:var(--ink);letter-spacing:-.015em}
    #load-panel .ld-meta,#load-panel .ld-unit {font-size:11px;color:var(--muted);line-height:1.5}
    #load-panel .ld-circuit-labels {display:flex;justify-content:space-between;margin:18px 6% 0;font-size:10px;line-height:1.3;letter-spacing:.09em;text-transform:uppercase;font-weight:650;color:var(--muted)}
    #load-panel .ld-circuit-labels span:nth-child(2) {transform:translateX(-5px)}
    #load-panel .ld-schematic {width:100%;height:auto;display:block;max-height:215px}
    #load-panel .ld-settings {padding:15px 15px 13px 19px;background:var(--wash);border-left:1px solid var(--line)}
    #load-panel .ld-phases {display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:4px;overflow:hidden;gap:0}
    #load-panel .ld-phases button {height:25px;min-height:25px;min-width:29px;line-height:1;padding:0 7px;border:0;border-radius:0;background:var(--paper);border-right:1px solid var(--line);font-size:11px;color:var(--muted);font-weight:700}
    #load-panel .ld-phases button:last-child {border-right:0}
    #load-panel .ld-phases button[aria-pressed="true"] {background:var(--night);color:#fff}
    #load-panel .ld-fields {display:grid;gap:7px;margin-top:13px}
    #load-panel .ld-field {display:grid;grid-template-columns:89px minmax(36px,1fr) 55px 15px;align-items:center;gap:6px;min-height:27px}
    #load-panel .ld-field label {font-size:12px;font-weight:550;color:var(--ink)}
    #load-panel .ld-field input[type=range] {width:100%;min-width:0;max-width:100%;height:24px;padding:0;border:0;accent-color:var(--ld-phase);cursor:pointer}
    #load-panel .ld-field input[type=number] {width:100%;min-width:0;box-sizing:border-box;height:27px;font:12px ui-monospace,monospace;text-align:right;font-variant-numeric:tabular-nums;padding:2px 4px}
    #load-panel .ld-field input[type=number]::-webkit-inner-spin-button {display:none}
    #load-panel .ld-field input[type=number] {appearance:textfield}
    #load-panel .ld-field + .ld-field:nth-child(3) {border-top:1px solid var(--line);padding-top:8px;margin-top:2px}
    #load-panel .ld-warn {margin:8px 0;color:#93451f;font-size:12px}
    #load-panel .ld-warn:empty {display:none}
    #load-panel .ld-plots {display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(180px,.94fr);border-bottom:1px solid var(--line)}
    #load-panel .ld-pane {min-width:0;padding:15px 14px 10px 13px;border-right:1px solid var(--line)}
    #load-panel .ld-pane:first-child {padding-left:0}
    #load-panel .ld-pane:last-child {border-right:0;padding-right:0}
    #load-panel .ld-pane p {font-size:11px;color:var(--muted);margin:2px 0 5px}
    #load-panel .ld-plot {display:block;width:100%;height:clamp(148px,15.7vw,203px)}
    #load-panel .ld-powers {width:100%;margin-top:12px;font-size:12px;border-collapse:collapse}
    #load-panel .ld-powers :is(th,td) {text-align:right;border:0;border-bottom:1px solid var(--line);padding:5px 2px;font-variant-numeric:tabular-nums;line-height:1.5}
    #load-panel .ld-powers th {font-weight:600;color:var(--muted)}
    #load-panel .ld-powers :is(th,td):first-child {text-align:left}
    #load-panel .ld-powers tbody th {color:var(--ink)}
    #load-panel .ld-powers tfoot :is(th,td) {border:0;font-weight:650}
    #load-panel .ld-dot {display:inline-block;width:7px;height:7px;background:var(--ld-dot);border-radius:50%;margin-right:6px;vertical-align:1px}
    #load-panel .ld-details {padding:0;border-bottom:1px solid var(--line);margin:0;background:transparent}
    #load-panel .ld-details summary {padding:11px 0;cursor:pointer;color:var(--ink);font-weight:600;font-size:12px}
    #load-panel .ld-details p {font-size:12px;line-height:1.65;color:var(--muted);margin:0 0 12px}
    #load-panel .ld-scroll {overflow-x:auto}
    #load-panel .ld-readings {border-collapse:collapse;width:100%;font-size:12px;margin:0 0 14px;font-variant-numeric:tabular-nums;white-space:nowrap}
    #load-panel .ld-readings :is(th,td) {text-align:left;border-bottom:1px solid var(--line);padding:5px}
    #load-panel .ld-readings th {font-weight:600}
    #load-panel .ld-case-label {display:flex;align-items:center;gap:7px;font-size:12px;color:var(--muted)}
    #load-panel .ld-plot g[font-size] {font-size:13px}
    #load-panel .ld-plot text:has(tspan) {font-size:15px}
    @media(max-width:980px){#load-panel .ld-plots {grid-template-columns:repeat(4,minmax(0,1fr))}#load-panel .ld-pane {padding-left:9px;padding-right:9px}#load-panel .ld-pane h3 {font-size:13px}}
    @media(max-width:790px){#load-panel .ld-system {grid-template-columns:1fr}#load-panel .ld-drawing {padding-right:0}#load-panel .ld-settings {border-left:0;border-top:1px solid var(--line);padding:12px}#load-panel .ld-fields {grid-template-columns:1fr 1fr;column-gap:16px}#load-panel .ld-field + .ld-field:nth-child(3) {border:0;padding:0;margin:0}#load-panel .ld-plots {grid-template-columns:1fr 1fr}#load-panel .ld-pane {padding:12px}#load-panel .ld-pane:nth-child(even) {border-right:0}#load-panel .ld-pane:nth-child(n+3) {border-top:1px solid var(--line)}#load-panel .ld-pane:nth-child(3) {padding-left:0}#load-panel .ld-plot {height:165px}}
    @media(max-width:540px){#load-panel .ld-fields {grid-template-columns:1fr}#load-panel .ld-drawing {padding-top:13px}#load-panel .ld-schematic {min-height:112px}#load-panel .ld-circuit-labels {margin-top:13px;font-size:9px}#load-panel .ld-case-label {font-size:11px}#load-panel .ld-sectionhead {gap:4px}#load-panel .ld-pane {padding-left:9px;padding-right:7px}#load-panel .ld-plot {height:152px}#load-panel .ld-plot g[font-size] {font-size:16px}#load-panel .ld-plot text:has(tspan) {font-size:18px}}
  `;

  window.initLoadPanel = function () {
    const root = document.getElementById("load-panel");
    const colors = window.Lab.colors;
    const lab = window.Lab;
    let state = unpack("uneven");
    let active = 0;
    const smallDisplay = window.matchMedia("(max-width: 540px)");
    const fields = settings.map(f => `<div class="ld-field">
      <label for="ld-field-${f.key}">${f.label}</label>
      <input type="range" data-range="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" aria-label="${f.label} slider">
      <input id="ld-field-${f.key}" type="number" data-number="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" autocomplete="off">
      <span class="ld-unit">${f.unit}</span></div>`).join("");

    const plotMarkup = (id, title, sub) => `<div class="ld-pane">
      <h3>${title}</h3><p>${sub}</p><svg id="ld-plot-${id}" class="ld-plot" role="img" aria-label="${title} voltage phasors"></svg></div>`;
    root.innerHTML = `<style>${styles}</style>
      <div class="panel-heading"><div><h2>Three-phase feeder</h2>
        <p>Change one phase’s source voltage or load to see the receiving-end voltage move.</p></div>
        <div class="panel-actions"><label class="ld-case-label">Case <select id="ld-case">
        <option value="uneven">Unequal loads</option><option value="balanced">Balanced feeder</option>
        <option value="sag">Phase A voltage sag</option><option value="custom" disabled>Custom</option></select></label>
        <button type="button" id="ld-reset">Reset</button></div></div>
      <div class="ld-system">
        <div class="ld-drawing"><div class="ld-sectionhead"><h3>Four-wire topology</h3>
          <span class="ld-meta">Z per line = 0.04 + j0.08 pu</span></div>
          <div class="ld-circuit-labels"><span>Y source</span><span>Feeder</span><span>Y load</span></div>
          <div id="ld-wire-drawing">${circuit(colors, smallDisplay.matches)}</div></div>
        <div class="ld-settings"><div class="ld-sectionhead"><h3>Phase settings</h3>
          <div class="ld-phases" role="group" aria-label="Phase to adjust">${names.map((name, i) =>
            `<button type="button" data-phase="${i}" aria-label="Edit phase ${name}">${name}</button>`).join("")}</div></div>
          <div class="ld-fields">${fields}</div>
        </div>
      </div>
      <p class="ld-warn" role="status" id="ld-status"></p>
      <div class="ld-plots">
        ${plotMarkup("source", "Source voltage", "Phase to neutral · rim 1.4 pu")}
        ${plotMarkup("load", "Load voltage", "Phase to neutral · rim 1.4 pu")}
        ${plotMarkup("line", "Load line voltage", "AB, BC, CA · rim 2.8 pu")}
        <div class="ld-pane"><h3>Load power</h3><p>P and Q · pu on one phase base</p>
          <table class="ld-powers"><thead><tr><th scope="col">Phase</th><th scope="col">P</th><th scope="col">Q</th></tr></thead>
          <tbody id="ld-power-rows"></tbody><tfoot id="ld-total"></tfoot></table></div>
      </div>
      <details class="ld-details"><summary>Phasor readings</summary><div class="ld-scroll">
        <table class="ld-readings"><thead><tr><th>Phase</th><th>Source E (pu)</th><th>Load V (pu)</th><th>Line I (pu)</th><th>Line pair</th><th>Load V<sub>LL</sub> (pu)</th></tr></thead><tbody id="ld-values"></tbody></table>
        </div><p id="ld-neutral"></p></details>
      <details class="ld-details"><summary>Feeder model and bases</summary>
        <p>The grounded source and load share an ideal neutral. Each phase has a series impedance Z and a constant-power load. The model uses the high-voltage solution of E = V + ZI with S = V I*. Positive Q represents inductive demand. The neutral return current equals Iₐ + Iᵦ + I𝒸, directed towards the source.</p>
        <p>All voltage phasors use the same phase-to-neutral RMS voltage base. Vab = Van − Vbn, Vbc = Vbn − Vcn and Vca = Vcn − Van. All four power rows use the same single-phase power base, so the total is the sum of the three phase powers.</p>
        <p>Lecture Block 2, p. 4 · Three-phase system.</p></details>`;

    const byId = id => root.querySelector("#" + id);
    const cases = byId("ld-case");
    const phaseButtons = Array.from(root.querySelectorAll("[data-phase]"));
    function selectPhase(index) {
      active = index;
      phaseButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === active)));
      root.querySelectorAll("[data-ld-band]").forEach((el, i) => el.setAttribute("fill-opacity", i === active ? "0.055" : "0"));
      root.style.setProperty("--ld-phase", colors[active]);
      settings.forEach(f => {
        const range = root.querySelector('[data-range="' + f.key + '"]');
        const number = root.querySelector('[data-number="' + f.key + '"]');
        range.value = state[active][f.key];
        number.value = state[active][f.key].toFixed(f.step === 1 ? 0 : 2);
        range.setAttribute("aria-label", "Phase " + names[active] + " " + f.label + " slider");
        number.setAttribute("aria-label", "Phase " + names[active] + " " + f.label + " (" + f.unit + ")");
      });
    }

    function render() {
      const phases = state.map(solvePhase);
      const line = phases.map((row, i) => lineVoltage(row.voltage, phases[(i + 1) % 3].voltage));
      root.querySelectorAll("[data-ld-amps]").forEach((el, i) => {
        const current = phases[i].current;
        el.textContent = "I" + names[i].toLowerCase() + " " + (current ? Math.hypot(current.re, current.im).toFixed(2) : "—") + " pu";
      });
      function plot(id, quantities, labels, max) {
        const vectors = quantities.map((z, i) => ({z, color: colors[i], label: labels[i]})).filter(item => item.z);
        lab.plot(byId("ld-plot-" + id), {vectors, max, unit: "pu", compact: true});
      }
      plot("source", phases.map(s => s.source), ["Ea","Eb","Ec"], 1.4);
      plot("load", phases.map(s => s.voltage), ["Va","Vb","Vc"], 1.4);
      plot("line", line, pairTag, 2.8);
      const unavailable = names.filter((name, i) => !phases[i].voltage);
      byId("ld-status").textContent = unavailable.length
        ? "No steady-state voltage for phase " + unavailable.join(", ") + ". Raise the source voltage or reduce its load." : "";
      const received = phases.map(s => {
        if (!s.voltage) return null;
        return {p: s.voltage.re * s.current.re + s.voltage.im * s.current.im,
          q: s.voltage.im * s.current.re - s.voltage.re * s.current.im};
      });
      byId("ld-power-rows").innerHTML = received.map((s,i) => `<tr><th scope="row">
        <span class="ld-dot" style="--ld-dot:${colors[i]}"></span>${names[i]}</th>
        <td>${s ? s.p.toFixed(2) : "—"}</td><td>${s ? (Math.abs(s.q)<0.005 ? "0.00" : s.q.toFixed(2)) : "—"}</td></tr>`).join("");
      function sumPower(key) {
        return unavailable.length ? "—" : received.reduce((sum,s) => sum + s[key], 0).toFixed(2);
      }
      byId("ld-total").innerHTML = `<tr><th scope="row">Σ total</th><td>${sumPower("p")}</td><td>${sumPower("q")}</td></tr>`;
      byId("ld-values").innerHTML = phases.map((s,i) => `<tr><th scope="row">${names[i]}</th>
        <td>${polarText(s.source)}</td><td>${polarText(s.voltage)}</td>
        <td>${polarText(s.current)}</td><td>${pairs[i]}</td><td>${polarText(line[i])}</td></tr>`).join("");
      const neutral = unavailable.length ? null : phases.reduce((total,s) => ({
        re: total.re + s.current.re, im: total.im + s.current.im
      }), {re:0, im:0});
      byId("ld-neutral").textContent = "Neutral return current (load to source)  " + polarText(neutral) + " pu";
    }

    smallDisplay.addEventListener("change", event => {
      byId("ld-wire-drawing").innerHTML = circuit(colors, event.matches);
      selectPhase(active);
      render();
    });
    phaseButtons.forEach((button, index) => button.addEventListener("click", () => selectPhase(index)));
    cases.addEventListener("change", () => {
      state = unpack(cases.value);
      selectPhase(active);
      render();
    });
    byId("ld-reset").addEventListener("click", () => {
      cases.value = "uneven";
      state = unpack("uneven");
      selectPhase(0);
      render();
    });
    settings.forEach(f => {
      const range = root.querySelector('[data-range="' + f.key + '"]');
      const number = root.querySelector('[data-number="' + f.key + '"]');
      const precision = f.step === 1 ? 0 : 2;
      function apply(value) {
        if (value === state[active][f.key]) return;
        state[active][f.key] = value;
        cases.value = "custom";
        render();
      }
      range.addEventListener("input", () => {
        const n = range.valueAsNumber;
        number.value = n.toFixed(precision);
        apply(n);
      });
      number.addEventListener("input", () => {
        const n = number.valueAsNumber;
        if (!Number.isFinite(n) || !number.validity.valid) return;
        range.value = n;
        apply(n);
      });
      number.addEventListener("change", () => {
        const n = number.valueAsNumber;
        const value = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : state[active][f.key];
        const clean = Number(value.toFixed(precision));
        range.value = clean;
        number.value = clean.toFixed(precision);
        apply(clean);
      });
    });
    selectPhase(active);
    render();
  };
})();
