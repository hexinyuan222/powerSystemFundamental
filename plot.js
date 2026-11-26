(function () {
  'use strict';

  const colors = ['#087e70', '#bc5930', '#7462bd'];
  const bright = ['#4ae2c2', '#ff9a70', '#b5a0ff'];
  const center = 160;
  const mono = "ui-monospace, 'Cascadia Mono', Consolas, monospace";
  const round = n => Number(n.toFixed(2));
  const escape = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function point(radius, degrees) {
    const t = degrees * Math.PI / 180;
    return [round(center + radius * Math.cos(t)), round(center - radius * Math.sin(t))];
  }

  function grid(radius, max, unit, compact, dark, miniature) {
    const gridColor = dark ? '#3b5256' : '#d7dfdf';
    const axisColor = dark ? '#647c7d' : '#a4b4b4';
    const textColor = dark ? '#a6b9bb' : '#546969';
    if (miniature) {
      const low = center - radius - 5, high = center + radius + 5;
      return '<g aria-hidden="true" pointer-events="none" fill="none"><g stroke="' + gridColor +
        '" stroke-width="1.8"><circle cx="160" cy="160" r="' + (radius / 2) +
        '"/><circle cx="160" cy="160" r="' + radius + '"/></g><path stroke="' + axisColor +
        '" stroke-width="1.6" d="M' + low + ' 160H' + high + 'M160 ' + low + 'V' + high + '"/></g>';
    }
    const signature = (r, a) => point(r, a).join(' ');
    let spokes = '', ticks = '', labels = '';
    for (let a = 0; a < 360; a += compact ? 30 : 5) {
      if (a % (compact ? 90 : 30) === 0) {
        spokes += 'M160 160L' + signature(radius, a);
      }
      const tickLength = a % 30 === 0 ? 4 : a % 15 === 0 ? 2.8 : 1.7;
      ticks += 'M' + signature(radius + 1, a) + 'L' + signature(radius + 1 + tickLength, a);
      if (a % (compact ? 90 : 30) === 0) {
        const [x, y] = point(radius + (compact ? 14 : 18), a);
        const degrees = a <= 180 ? a : '−' + (360 - a);
        labels += '<text x="' + x + '" y="' + round(y + 3) + '" text-anchor="middle">' + degrees + '°</text>';
      }
    }
    let circles = '';
    for (const fraction of (compact ? [0.5, 1] : [0.25, 0.5, 0.75, 1])) {
      circles += '<circle cx="160" cy="160" r="' + radius * fraction + '"' +
        (fraction === 1 ? ' stroke="' + axisColor + '"' : '') + '/>';
    }
    let scales = '';
    if (!compact) {
      const step = max / 2;
      const size = step < 0.001 ? step.toExponential(1) : String(Number(step.toPrecision(3)));
      scales = '<text x="' + round(center + radius * 0.5) + '" y="174" text-anchor="middle" fill="' +
        textColor + '" font-family="' + mono + '" font-size="8.5">' + size + (unit ? ' ' + escape(unit) : '') + '</text>';
    }
    return '<g aria-hidden="true" pointer-events="none"><g fill="none" stroke="' + gridColor +
      '" stroke-width="0.85"><path d="' + spokes + '"/>' + circles + '</g><g fill="none" stroke="' + axisColor +
      '" stroke-width="0.85"><path d="M' + (center - radius) + ' 160H' + (center + radius) + 'M160 ' +
      (center - radius) + 'V' + (center + radius) + '"/><path d="' + ticks + '"/></g><g fill="' + textColor +
      '" font-family="' + mono + '" font-size="' + (compact ? 13 : 9.5) + '">' + labels + '</g>' + scales + '</g>';
  }

  function vectorGroups(vectors, radius, max, dark) {
    const groups = [];
    vectors.forEach((v, index) => {
      if (!v || !v.z || !Number.isFinite(v.z.re) || !Number.isFinite(v.z.im)) return;
      const x = center + radius * v.z.re / max;
      const y = center - radius * v.z.im / max;
      const phase = colors.indexOf(String(v.color || '').toLowerCase());
      const color = dark && phase >= 0 ? bright[phase] : (v.color || (dark ? bright : colors)[index % 3]);
      const item = {index, x, y, color: escape(color), label: String(v.label ?? '')};
      let group = groups.find(g => Math.hypot(g[0].x - x, g[0].y - y) < 1.5);
      if (!group) {
        group = [];
        groups.push(group);
      }
      group.push(item);
    });
    return groups;
  }

  function arrow(v, dark, draggable, miniature) {
    const u = v.x - center, w = v.y - center;
    const length = Math.hypot(u, w);
    if (length < 2) return '';
    const nx = u / length, ny = w / length;
    const head = Math.min(miniature ? 17 : draggable ? 10 : 8, length * 0.58);
    const shaft = miniature ? Math.min(5.1, length * 0.35) : dark ? 2.7 : 2.5;
    const bx = v.x - nx * head, by = v.y - ny * head;
    const half = head * 0.43;
    return '<g fill="' + v.color + '" stroke="' + v.color + '" pointer-events="none"><path d="M160 160L' +
      round(bx + nx) + ' ' + round(by + ny) + '" fill="none" stroke-linecap="round" stroke-width="' +
      shaft + '"/><path d="M' + round(v.x) + ' ' + round(v.y) + 'L' +
      round(bx - ny * half) + ' ' + round(by + nx * half) + 'L' + round(bx + ny * half) +
      ' ' + round(by - nx * half) + 'Z" stroke-width="0.5" stroke-linejoin="round"/></g>';
  }

  // Choose a nearby position with space around earlier labels and the other tips.
  function markerLabel(group, groups, boxes, compact, dark) {
    const labels = group.filter(v => v.label);
    if (!labels.length) return '';
    const first = group[0], length = Math.hypot(first.x - center, first.y - center);
    const angle = length > 1 ? Math.atan2(first.y - center, first.x - center) : -Math.PI / 4;
    const size = compact ? 16 : 12;
    const delimit = ' = ';
    const width = size * 0.59 * labels.map(v => v.label).join(delimit).length + 2;
    const distance = group.length > 1 ? 12 : 9;
    let best;
    for (const turn of [-0.72, 0.72, -1.35, 1.35, 0, 2.1, -2.1, Math.PI]) {
      const a = angle + turn, dx = Math.cos(a), dy = Math.sin(a);
      const x = Math.max(3, Math.min(317 - width, first.x + distance * dx + (dx - 1) * width / 2));
      const y = Math.max(size + 2, Math.min(315, first.y + distance * dy + size * (dy + 1) * 0.45));
      const box = {left: x - 2, right: x + width + 2, top: y - size, bottom: y + 3};
      let cost = Math.abs(turn + 0.72) * 0.05;
      for (const b of boxes) {
        const overlap = Math.max(0, Math.min(box.right, b.right) - Math.max(box.left, b.left)) *
          Math.max(0, Math.min(box.bottom, b.bottom) - Math.max(box.top, b.top));
        cost += overlap;
      }
      for (const g of groups) {
        const dxTip = Math.max(0, box.left - g[0].x, g[0].x - box.right);
        const dyTip = Math.max(0, box.top - g[0].y, g[0].y - box.bottom);
        cost += Math.max(0, 7 - Math.hypot(dxTip, dyTip)) * 3;
      }
      if (!best || cost < best.cost) best = {x, y, box, cost};
    }
    boxes.push(best.box);
    const ink = dark ? '#c3d3d4' : '#47605f';
    return '<text aria-hidden="true" pointer-events="none" x="' + round(best.x) + '" y="' + round(best.y) +
      '" font-family="' + mono + '" font-size="' + size + '" font-weight="600" fill="' + ink + '" stroke="' +
      (dark ? '#172e32' : '#fcfdfb') + '" stroke-width="3" stroke-linejoin="round" paint-order="stroke">' +
      labels.map(v => '<tspan fill="' + v.color + '">' + escape(v.label) + '</tspan>').join(escape(delimit)) + '</text>';
  }

  function plot(svg, options = {}) {
    if (!svg) return;
    const {vectors = [], unit = '', compact = false, miniature = false, dark = false, draggable = false, showLabels = true} = options;
    const radius = compact ? 129 : 119;
    const largest = vectors.reduce((m, v) => {
      const value = v?.z ? Math.hypot(v.z.re, v.z.im) : 0;
      return Number.isFinite(value) ? Math.max(value, m) : m;
    }, 0);
    const max = Number.isFinite(options.max) && options.max > 0 ? options.max : (largest || 1);
    svg.setAttribute('viewBox', '0 0 320 320');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    Object.assign(svg.dataset, {cx: String(center), cy: String(center), r: String(radius), max: String(max)});
    const groups = vectorGroups(vectors, radius, max, dark);
    const boxes = [];
    let lines = '', tips = '', labels = '', handles = '';
    const base = dark ? '#8da5a5' : '#8ba09f';
    for (const group of groups) {
      const first = group[0];
      lines += arrow(first, dark, draggable, miniature);
      const isZero = Math.hypot(first.x - center, first.y - center) < 2;
      if (group.length > 1 || isZero || draggable) {
        group.forEach((v, i) => {
          const r = miniature ? 3.75 + i * 5 : (draggable ? 5.2 : 2.8) + i * 2.25;
          const ringStroke = miniature ? 3.5 : draggable ? 1.8 : 1.5;
          tips += '<circle aria-hidden="true" pointer-events="none" cx="' + round(v.x) + '" cy="' + round(v.y) +
            '" r="' + round(r) + '" stroke="' + v.color + '" stroke-width="' + ringStroke +
            '" fill="none"/>';
        });
      }
      if (showLabels) labels += markerLabel(group, groups, boxes, compact, dark);
      if (draggable) {
        // Keep a distinct hit area for each vector even when their tips coincide.
        for (let i = group.length - 1; i >= 0; i--) {
          const v = group[i];
          handles += '<circle data-vector="' + v.index + '" cx="' + round(v.x) + '" cy="' + round(v.y) +
            '" r="' + (10 + i * 5) + '" fill="transparent" pointer-events="all" style="cursor:grab"/>';
        }
      }
    }
    svg.innerHTML = grid(radius, max, unit, compact, dark, miniature) + lines +
      '<circle cx="160" cy="160" r="2.25" fill="' + base + '" pointer-events="none"/>' + tips + labels + handles;
  }

  window.Lab = {...window.Lab, colors, plot};
})();