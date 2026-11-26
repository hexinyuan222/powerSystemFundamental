(function faultPanelModule() {
  "use strict";

  const phase = ["a", "b", "c"];
  const rotate = { re: -0.5, im: Math.sqrt(3) / 2 };
  const rotate2 = { re: -0.5, im: -Math.sqrt(3) / 2 };
  const source = [{ re: 1, im: 0 }, rotate2, rotate];
  const zero = { re: 0, im: 0 };
  const sum = (...xs) => xs.reduce((p, q) => ({ re: p.re + q.re, im: p.im + q.im }), zero);
  const neg = p => ({ re: -p.re, im: -p.im });
  const mul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
  function div(p, q) {
    const d = q.re * q.re + q.im * q.im;
    return { re: (p.re * q.re + p.im * q.im) / d, im: (p.im * q.re - p.re * q.im) / d };
  }
  const mag = p => Math.hypot(p.re, p.im);

  // Input sequence order is positive, negative, zero. The local phase order is cyclic.
  function phaseValues([p, n, z]) {
    return [sum(p, n, z), sum(mul(rotate2, p), mul(rotate, n), z), sum(mul(rotate, p), mul(rotate2, n), z)];
  }

  function solve(type, ref, x1, x2, x0, rf) {
    const z1 = { re: 0, im: x1 }, z2 = { re: 0, im: x2 }, z0 = { re: 0, im: x0 };
    const r = { re: rf, im: 0 }, r3 = { re: 3 * rf, im: 0 };
    const e = source[ref];
    let i1, i2 = zero, i0 = zero;
    if (type === "lg") {
      i1 = div(e, sum(z1, z2, z0, r3));
      i2 = i0 = i1;
    } else if (type === "ll") {
      i1 = div(e, sum(z1, z2, r));
      i2 = neg(i1);
    } else if (type === "llg") {
      const groundBranch = sum(z0, r3);
      const branches = sum(z2, groundBranch);
      i1 = div(e, sum(z1, div(mul(z2, groundBranch), branches)));
      i2 = neg(div(mul(i1, groundBranch), branches));
      i0 = neg(div(mul(i1, z2), branches));
    } else {
      i1 = div(e, sum(z1, r));
    }
    // Return every display quantity to the fixed phase-a reference (E_a = 1∠0°).
    const ip = [mul(i1, source[(3 - ref) % 3]), mul(i2, source[ref]), i0];
    const vp = [sum(source[0], neg(mul(z1, ip[0]))), neg(mul(z2, ip[1])), neg(mul(z0, ip[2]))];
    return { seqI: ip, seqV: vp, i: phaseValues(ip), v: phaseValues(vp) };
  }

  const cases = {
    lg: { name: "Line to ground", pairs: ["A–G", "B–G", "C–G"], network: "Positive, negative and zero sequence in series.", formula: "I₁ = E₁ / (Z₁ + Z₂ + Z₀ + 3Rƒ),   I₂ = I₀ = I₁." },
    ll: { name: "Line to line", pairs: ["B–C", "C–A", "A–B"], network: "Positive and negative networks share a return. Zero sequence is open.", formula: "I₁ = E₁ / (Z₁ + Z₂ + Rƒ),   I₂ = −I₁,   I₀ = 0." },
    llg: { name: "Double line to ground", pairs: ["B–C–G", "C–A–G", "A–B–G"], network: "The current divides between Z₂ and the grounded branch Z₀ + 3Rƒ.", formula: "I₁ = E₁ / [Z₁ + (Z₂ ∥ (Z₀ + 3Rƒ))],   I₂ = −I₁(Z₀ + 3Rƒ) / (Z₂ + Z₀ + 3Rƒ),   I₀ = −I₁Z₂ / (Z₂ + Z₀ + 3Rƒ)." },
    three: { name: "Three phase", pairs: ["A–B–C"], network: "Only positive sequence carries current.", formula: "I₁ = E₁ / (Z₁ + Rƒ),   I₂ = I₀ = 0." }
  };

  const line = (x1, y1, x2, y2, cls = "") => `<path class="fw ${cls}" d="M${x1} ${y1} L${x2} ${y2}"/>`;
  const path = (d, cls = "") => `<path class="fw ${cls}" d="${d}"/>`;
  const dot = (x, y, cls = "") => `<circle class="fdot ${cls}" cx="${x}" cy="${y}" r="3.2"/>`;
  const label = (x, y, content, cls = "", anchor = "middle") => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${content}</text>`;
  const ground = (x, y) => `<g class="fhot">${line(x - 12, y, x + 12, y)}${line(x - 8, y + 5, x + 8, y + 5)}${line(x - 4, y + 10, x + 4, y + 10)}</g>`;
  function component(x, y, name, vertical = false, active = true, kind = "") {
    const half = 17, d = vertical ? [0, half] : [half, 0];
    const symbol = active
      ? `<rect class="fimp ${kind}" x="${x - (vertical ? 6 : half)}" y="${y - (vertical ? half : 6)}" width="${vertical ? 12 : 2 * half}" height="${vertical ? 2 * half : 12}"/>`
      : line(x - d[0], y - d[1], x + d[0], y + d[1], kind);
    return symbol + label(vertical ? x + 14 : x, vertical ? y + 4 : y - 13, name, `fsymbol ${kind}`, vertical ? "start" : "middle");
  }

  function diagram(inner, title) {
    return `<svg class="fcircuit" role="img" aria-label="${title}" viewBox="0 0 480 205"><title>${title}</title>${inner}</svg>`;
  }

  function physical(type, ref, rf) {
    const y = [53, 101, 149];
    const faultX = 322, earthX = 413;
    const faults = type === "three" ? [0, 1, 2] : type === "lg" ? [ref] : [(ref + 1) % 3, (ref + 2) % 3];
    const positions = faults.map(k => y[k]).sort((a, b) => a - b);
    const top = positions[0], bottom = positions[positions.length - 1], mid = (top + bottom) / 2;
    const rfLabel = rf ? "Rƒ" : "Rƒ = 0";
    let s = `<rect class="fsourcebox" x="15" y="28" width="110" height="145" rx="2"/>`
       + label(70, 90, "Three-phase", "fboxlabel") + label(70, 109, "system", "fboxlabel") + label(70, 130, "THÉVENIN", "fcap");
    phase.forEach((name, i) => {
      const active = faults.includes(i);
      s += line(125, y[i], 256, y[i]) + label(141, y[i] - 8, name.toUpperCase(), "fsymbol", "start");
      if (active) {
        s += line(256, y[i], faultX, y[i], "fhot") + dot(faultX, y[i], "fhot");
      } else {
        s += `<circle class="fopen" cx="256" cy="${y[i]}" r="3.6"/>`;
      }
    });
    if (type === "ll") {
      s += line(faultX, top, faultX, mid - 17, "fhot") + component(faultX, mid, rfLabel, true, !!rf, "fhot")
        + line(faultX, mid + 17, faultX, bottom, "fhot");
    } else if (type === "three") {
      faults.forEach(i => {
        s += line(faultX, y[i], 345, y[i], "fhot") + component(362, y[i], rfLabel, false, !!rf, "fhot")
          + line(379, y[i], 407, y[i], "fhot") + dot(407, y[i], "fhot");
      });
      s += line(407, top, 407, bottom, "fhot");
    } else {
      if (type === "llg") s += line(faultX, top, faultX, bottom, "fhot") + dot(faultX, mid, "fhot");
      s += line(faultX, mid, 348, mid, "fhot") + component(365, mid, rfLabel, false, !!rf, "fhot")
        + path(`M382 ${mid} H${earthX} V174`, "fhot") + ground(earthX, 174);
    }
    return diagram(s, `${cases[type].pairs[ref]} fault at the three-phase system terminals`);
  }

  function network(type, rf) {
    const top = 53, bottom = 162, sx = 46;
    const rLabel = n => (n === 3 ? "3Rƒ" : "Rƒ") + (rf === 0 ? " = 0" : "");
    let s = line(sx, top, sx, 88) + `<circle class="femf" cx="${sx}" cy="106" r="18"/>`
      + label(sx, 104, "+", "fpol") + label(sx, 118, "−", "fpol")
      + label(18, 111, "E₁", "fsymbol") + line(sx, 124, sx, bottom);
    function hElement(x, name, start, end, kind = "", active = true) {
      return line(start, top, x - 17, top, kind) + component(x, top, name, false, active, kind) + line(x + 17, top, end, top, kind);
    }
    function vElement(x, name, kind = "", active = true) {
      return line(x, top, x, 89, kind) + component(x, 106, name, true, active, kind) + line(x, 123, x, bottom, kind);
    }
    if (type === "lg") {
      s += hElement(122, "Z₁", sx, 199) + hElement(230, "Z₂", 199, 291) + hElement(320, "Z₀", 291, 400);
      s += vElement(400, rLabel(3), "fhot", !!rf) + line(400, bottom, sx, bottom);
    } else if (type === "ll") {
      s += hElement(125, "Z₁", sx, 219) + hElement(300, rLabel(1), 219, 382, "fhot", !!rf);
      s += vElement(382, "Z₂") + line(382, bottom, sx, bottom);
      s += dot(219, top) + dot(382, top) + label(219, top + 20, "F₁", "fnode") + label(368, top + 20, "F₂", "fnode");
    } else if (type === "llg") {
      s += hElement(125, "Z₁", sx, 237) + hElement(321, rLabel(3), 237, 395, "fhot", !!rf);
      s += vElement(237, "Z₂") + vElement(395, "Z₀") + line(395, bottom, sx, bottom);
      s += dot(237, top) + dot(395, top) + dot(237, bottom) + label(219, top - 12, "F₁, F₂", "fnode") + label(395, top - 12, "F₀", "fnode");
    } else {
      s += hElement(172, "Z₁", sx, 379) + vElement(379, rLabel(1), "fhot", !!rf) + line(379, bottom, sx, bottom);
      s += dot(379, top) + label(379, top - 13, "F₁", "fnode");
    }
    const y = bottom + 24;
    if (type === "ll") s += label(226, y, "I₀ = 0", "fnode");
    if (type === "three") s += label(226, y, "I₂ = I₀ = 0", "fnode");
    return diagram(s, `${cases[type].name}: ${cases[type].network}`);
  }

  const stylesheet = `
    #fault-panel .fcontrols,#fault-panel .fparams {display:flex;flex-wrap:wrap;align-items:end;gap:12px 20px}
    #fault-panel .fcontrols {padding:11px 0 15px;border-bottom:1px solid var(--line)}
    #fault-panel .ffld {display:grid;gap:4px;font-size:.76rem;color:var(--muted);font-weight:550}
    #fault-panel .ffld input,#fault-panel .ffld select {font:inherit;font-size:.84rem;color:var(--ink);height:32px;max-width:100%}
    #fault-panel .ffld input[type=number]{width:81px}
    #fault-panel .fmetric{margin-left:auto;display:flex;gap:10px;align-items:baseline;color:var(--muted);font-size:.79rem}
    #fault-panel .fmetric output {font-family:var(--mono,ui-monospace,Consolas,monospace);color:var(--accent);font-size:1.12rem;font-weight:650}
    #fault-panel .fpair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
    #fault-panel .fpair > * {min-width:0;margin:0;padding:15px 18px 10px 0}
    #fault-panel .fpair > * + * {border-left:1px solid var(--line);padding-right:0;padding-left:18px}
    #fault-panel h3{font-size:1rem;color:var(--ink);margin:0;font-weight:650}
    #fault-panel .fplotheading {display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-block:1px solid var(--line);padding:10px 0}
    #fault-panel .fplotheading select{height:30px;font-size:.8rem}
    #fault-panel .fcircuit {width:100%;height:auto;display:block;max-height:207px;overflow:visible}
    #fault-panel .fcircuit text {font-family:inherit;fill:var(--ink);font-size:14px}
    #fault-panel .fcircuit .fcap {font-size:10px;letter-spacing:.1em;fill:var(--muted)}
    #fault-panel .fcircuit .fboxlabel{font-size:14px;font-weight:600}
    #fault-panel .fcircuit .fsymbol{font-family:var(--mono,ui-monospace,Consolas,monospace);font-weight:600;font-size:15px}
    #fault-panel .fcircuit .fnode {font-size:14px;fill:var(--muted)}
    #fault-panel .fcircuit .fpol {font-size:16px;fill:var(--accent);font-weight:600}
    #fault-panel .fcircuit .fw {fill:none;stroke:#496568;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    #fault-panel .fcircuit .fsourcebox,#fault-panel .fcircuit .femf,#fault-panel .fcircuit .fimp{fill:#eef4f1;stroke:#496568;stroke-width:1.6}
    #fault-panel .fcircuit .fopen {fill:var(--paper);stroke:#496568;stroke-width:1.6}
    #fault-panel .fcircuit .fdot {fill:#496568}
    #fault-panel .fcircuit .fhot.fw,#fault-panel .fcircuit .fhot .fw,#fault-panel .fcircuit .fhot.fimp {stroke:#b55531}
    #fault-panel .fcircuit .fhot.fimp{fill:#fff3e9}
    #fault-panel .fcircuit .fhot.fdot,#fault-panel .fcircuit text.fhot {fill:#a94826}
    #fault-panel .fcaption {font-size:.78rem;color:var(--muted);line-height:1.45;margin:1px 0 6px}
    #fault-panel .fphasors {display:grid;grid-template-columns:minmax(95px,1.2fr) minmax(95px,1fr);align-items:center;gap:10px}
    #fault-panel .fphasors svg {display:block;width:100%;height:auto;max-height:230px}
    #fault-panel .freadout{margin:0;display:grid;gap:0;font-family:var(--mono,ui-monospace,Consolas,monospace);font-size:.78rem}
    #fault-panel .freadout > div{display:flex;justify-content:space-between;gap:5px;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line)}
    #fault-panel .freadout dd{margin:0;white-space:nowrap;color:var(--ink)}
    #fault-panel .freadout dt{font-weight:700}
    #fault-panel .fparams {margin:8px 0 14px}
    #fault-panel .fdetails {margin-top:6px;border-top:1px solid var(--line)}
    #fault-panel .fdetails p {margin:6px 0;color:var(--muted);font-size:.83rem;line-height:1.5}
    #fault-panel .fdetails output{font-family:var(--mono,ui-monospace,Consolas,monospace);color:var(--ink)}
    @media(max-width:800px) {
      #fault-panel .fphasors{grid-template-columns:minmax(0,1fr)}
      #fault-panel .fphasors svg{max-height:195px}
    }
    @media(max-width:640px){
      #fault-panel .fpair{grid-template-columns:minmax(0,1fr)}
      #fault-panel .fpair > *,#fault-panel .fpair > * + *{border-left:0;padding:12px 0 9px}
      #fault-panel .fpair > * + * {border-top:1px solid var(--line)}
      #fault-panel .fphasors{grid-template-columns:minmax(0,1fr) minmax(0,.95fr)}
      #fault-panel .fmetric{margin-left:0}
      #fault-panel .fcontrols{gap:8px 12px}
    }
    @media(max-width:365px){#fault-panel .fphasors{grid-template-columns:1fr}}
  `;
  window.initFaultPanel = function initFaultPanel() {
    const panel = document.querySelector("#fault-panel");
    const options = Object.entries(cases).map(([value, s]) => `<option value="${value}">${s.name}</option>`).join("");
    const field = (name, label, initial) => `<label class="ffld" for="fault-${name}">${label}<input id="fault-${name}" type="number" min="0.01" max="2" step="0.01" value="${initial}"></label>`;
    panel.innerHTML = `<style>${stylesheet}</style>
      <div class="panel-heading"><div><h2>Fault networks</h2><p>Choose a fault to connect its sequence networks and inspect the fault-point phasors.</p></div>
      <div class="panel-actions"><button type="button" id="fault-reset">Reset</button></div></div>
      <div class="fcontrols">
        <label class="ffld" for="fault-type">Fault type<select id="fault-type">${options}</select></label>
        <label class="ffld" for="fault-phases">Faulted conductors<select id="fault-phases"></select></label>
        <label class="ffld" for="fault-r">Fault resistance Rƒ (pu)<input type="number" id="fault-r" value="0" min="0" max="2" step="0.01"></label>
        <div class="fmetric"><span id="fault-metric-label"></span><output id="fault-metric"></output></div>
      </div>
      <div class="fpair">
        <figure><h3>Fault connection</h3><div id="fault-physical"></div><figcaption class="fcaption" id="fault-boundary"></figcaption></figure>
        <figure><h3>Sequence network</h3><div id="fault-network"></div><figcaption class="fcaption" id="fault-nettext"></figcaption></figure>
      </div>
      <div class="fplotheading"><h3>Fault-point phasors</h3><label class="ffld"><select id="fault-domain" aria-label="Phasor coordinates"><option value="phase">Phase quantities · abc</option><option value="seq">Sequence quantities · 1, 2, 0</option></select></label></div>
      <div class="fpair">
        <figure><h3>Voltage <small>(pu)</small></h3><div class="fphasors"><svg id="fault-vplot" role="img" aria-label="Fault-point voltages"></svg><dl class="freadout" id="fault-vlist"></dl></div></figure>
        <figure><h3>Current <small>(pu)</small></h3><div class="fphasors"><svg id="fault-iplot" role="img" aria-label="Fault currents"></svg><dl class="freadout" id="fault-ilist"></dl></div></figure>
      </div>
      <details class="fdetails"><summary>Source parameters &amp; calculation</summary>
        <div class="fparams">${field("x1","Positive X₁ (pu)","0.20")}${field("x2","Negative X₂ (pu)","0.20")}${field("x0","Zero X₀ (pu)","0.15")}</div>
        <p>Balanced pre-fault source Eₐ = 1∠0° pu. Each sequence impedance is Zₖ = jXₖ. Rƒ = 0 gives a bolted fault.</p>
        <p id="fault-reference"></p><p><output id="fault-equation"></output></p>
        <p>Block 3, pp. 11–33, covers the unbalanced fault connections. The default reactances follow the network example on p. 40.</p>
      </details>`;
    const get = name => panel.querySelector("#fault-" + name);
    const values = { r: 0, x1: 0.2, x2: 0.2, x0: 0.15 };
    function conductors() {
      const group = cases[get("type").value].pairs;
      get("phases").innerHTML = group.map((v, i) => `<option value="${i}">${v}</option>`).join("");
      get("phases").disabled = group.length === 1;
    }
    function refresh() {
      const type = get("type").value, ref = Number(get("phases").value), seq = get("domain").value === "seq";
      const { x1, x2, x0, r } = values;
      const state = solve(type, ref, x1, x2, x0, r);
      const p = phase[ref], q = phase[(ref + 1) % 3], t = phase[(ref + 2) % 3];
      const term = (what, name) => `${what}<sub>${name}</sub>`;
      const v = name => term("V", name), i = name => term("I", name);
      const boundaries = {
        lg: `${v(p)} = Rƒ ${i(p)}.  ${i(q)} = ${i(t)} = 0.`,
        ll: `${v(q)} − ${v(t)} = Rƒ ${i(q)}.  ${i(q)} = −${i(t)},  ${i(p)} = 0.`,
        llg: `${v(q)} = ${v(t)} = Rƒ (${i(q)} + ${i(t)}).  ${i(p)} = 0.`,
        three: "Equal fault resistance in each of the three branches."
      };
      get("physical").innerHTML = physical(type, ref, r);
      get("network").innerHTML = network(type, r);
      get("boundary").innerHTML = boundaries[type];
      get("nettext").textContent = cases[type].network;
      get("reference").textContent = `The network equation uses phase ${p.toUpperCase()} as its local reference. The displayed phasors use the fixed phase-A source reference.`;
      get("equation").textContent = cases[type].formula;
      const grounded = type === "lg" || type === "llg";
      get("metric-label").textContent = grounded ? "Ground current |3I₀|" : `Fault current |I${(type === "three" ? "A" : q.toUpperCase())}|`;
      const current = grounded ? 3 * mag(state.seqI[2]) : mag(state.i[type === "three" ? 0 : (ref + 1) % 3]);
      get("metric").textContent = current.toFixed(3) + " pu";
      const suffix = seq ? ["₁", "₂", "₀"] : phase;
      function draw(quantity, vectors, chart, listing) {
        const colors = Lab.colors;
        const list = vectors.map((z, index) => ({ z, label: quantity + suffix[index], color: colors[index] }));
        const largest = Math.max(...vectors.map(mag));
        Lab.plot(get(chart), { vectors: list, max: Math.max(quantity === "V" ? 1.2 : 1, largest * 1.22), unit: "pu", compact: true });
        get(listing).innerHTML = list.map(({ z, label: symbol, color }) => {
          const m = mag(z);
          const angle = m < 1e-8 ? "—" : `${Math.round(Math.atan2(z.im, z.re) * 1800 / Math.PI) / 10}°`;
          return `<div><dt style="color:${color}">${symbol}</dt><dd>${m.toFixed(3)} ∠ ${angle}</dd></div>`;
        }).join("");
      }
      draw("V", seq ? state.seqV : state.v, "vplot", "vlist");
      draw("I", seq ? state.seqI : state.i, "iplot", "ilist");
    }
    conductors();
    get("type").addEventListener("change", () => { conductors(); refresh(); });
    get("phases").addEventListener("change", refresh);
    get("domain").addEventListener("change", refresh);
    for (const name of Object.keys(values)) {
      const input = get(name);
      input.addEventListener("input", () => {
        if (!input.value || !input.validity.valid) return;
        values[name] = Number(input.value);
        refresh();
      });
      input.addEventListener("change", () => {
        if (!input.value || !input.validity.valid) input.value = values[name];
      });
    }
    get("reset").addEventListener("click", () => {
      get("type").value = "lg";
      get("domain").value = "phase";
      for (const name of Object.keys(values)) {
        const input = get(name);
        input.value = input.defaultValue;
        values[name] = Number(input.value);
      }
      conductors();
      refresh();
    });
    refresh();
  };
})();

