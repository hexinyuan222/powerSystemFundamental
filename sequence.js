(() => {
  'use strict';
  const rad = Math.PI / 180;
  const letters = ['A','B','C'];

  const bright = ['#4ae2c2','#ff9a70','#b5a0ff'];
  const configs = [
    {name:'Unbalanced supply', values:[[1.04,12],[0.72,-104],[1.1,128]]},
    {name:'Balanced ABC', values:[[1,0],[1,-120],[1,120]]},
    {name:'Phase A sag', values:[[0.4,0],[1,-120],[1,120]]},
    {name:'Reverse phase order', values:[[1,0],[1,120],[1,-120]]},
    {name:'Pure zero sequence', values:[[1,0],[1,0],[1,0]]}
  ];
  const seqNames = ['Positive','Negative','Zero'];
  const seqSymbols = ['V₁','V₂','V₀'];
  const phaseValue = ([m, deg]) => ({re:m*Math.cos(deg*rad), im:m*Math.sin(deg*rad)});
  const rotate = (z, deg) => ({re:z.re*Math.cos(deg*rad)-z.im*Math.sin(deg*rad),
    im:z.re*Math.sin(deg*rad)+z.im*Math.cos(deg*rad)});
  const magnitude = z => Math.hypot(z.re,z.im);
  const angle = z => Math.atan2(z.im,z.re) / rad;
  const clamp = (v,lo,hi) => Math.min(Math.max(v,lo),hi);
  const fixed = (v,precision) => (Math.abs(v)<0.5*10**(-precision)?0:v).toFixed(precision).replace('-', '−');
  const degrees = z => magnitude(z)<1e-9?'—':fixed(angle(z),1)+'°';
  const polarSet = (ref,rotations) => rotations.map(n=>rotate(ref,n));
  function decompose(values) {
    const phase = values.map(phaseValue);
    const sequences = [[0,120,-120],[0,-120,120],[0,0,0]].map(
      rotations=>phase.map((v,i)=>rotate(v,rotations[i])).reduce((sum,v)=>({re:sum.re+v.re/3,im:sum.im+v.im/3}),{re:0,im:0})
    );
    return { phase, sequences, components:[polarSet(sequences[0],[0,-120,120]),
      polarSet(sequences[1],[0,120,-120]),polarSet(sequences[2],[0,0,0])] };
  }
  function ringLimit(m) {
    if(m<1e-9) return 1;
    const base=10**Math.floor(Math.log10(m));
    return ([1,1.25,1.5,2,2.5,3,4,5,6,8,10].find(f=>f*base>=m-1e-12)||10)*base;
  }
  function phaseField(i,k) {
    const mag=k===0;
    const min=mag?0:-180, max=mag?1.5:180, step=mag?0.01:1;
    const label='Phase '+letters[i]+(mag?' magnitude':' angle');
    const attrs='data-phase="'+i+'" data-kind="'+k+'" min="'+min+'" max="'+max+'" step="'+step+'"';
    return '<div class="edit-field"><input type="range" '+attrs+' aria-label="'+label+' slider"><input type="number" '+attrs+' aria-label="'+label+(mag?' in per unit':' in degrees')+'"></div>';
  }
  window.initSequencePanel = function () {
    const root=document.querySelector('#sequence-panel');
    const colors=window.Lab.colors;
    const query=s=>root.querySelector(s);
    const buttonIcon='<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/></svg>';
    root.innerHTML = `
      <div class="panel-heading"><div><h2>Voltage decomposition</h2><p>Drag a phase tip to see how one voltage changes all three sequence components.</p></div>
      <div class="panel-actions"><label>Preset <select id="seq-preset">${configs.map((v,i)=>'<option value="'+i+'">'+v.name+'</option>').join('')}<option value="custom" hidden>Custom</option></select></label>
      <button class="inline-btn" type="button" id="seq-reset" title="Restore the unbalanced supply example">${buttonIcon}Reset</button></div></div>
      <div class="seq-workbench">
        <div class="phase-display"><div class="plane-head"><svg class="plane-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-6-2 4-4"/></svg><h3>Phase voltage plane</h3><span class="plane-unit">RMS · pu</span></div>
          <svg id="phase-plane" class="big-plot" role="img" aria-label="Draggable phase voltage phasors. Numerical controls are available in Phase inputs."></svg>
          <div class="phase-readings">${letters.map((v,i)=>'<div class="phase-reading"><span class="phase-key" style="--pcolor:'+bright[i]+'"><i class="dot"></i>Phase '+v+'</span><output id="phaseread-'+i+'"></output></div>').join('')}</div>
        </div>
        <div class="seq-side">
          <div class="sec-bar"><h3>Sequence components</h3><label>Scale <select id="seq-scale"><option value="auto">Individual</option><option value="common">Shared</option></select></label></div>
          <div class="seq-charts">${seqNames.map((n,i)=>'<div class="seq-chart"><h4>'+n+' <span class="v-sub">'+seqSymbols[i]+'</span></h4><svg role="img" aria-label="'+n+' sequence, phases A, B and C" id="seq-plot-'+i+'"></svg><output class="seq-amount" id="seq-mag-'+i+'"></output><div class="seq-angle" id="seq-angle-'+i+'"></div><div class="mini-rim" id="seq-rim-'+i+'"></div></div>').join('')}</div>
          <div class="seq-meta"><span>Values referenced to phase A</span><span>VUF <output id="seq-vuf"></output></span></div>
          <div class="input-bar"><h3>Phase inputs</h3><span>Line to neutral</span></div>
          <table class="edit-table"><thead><tr><th scope="col">Phase</th><th scope="col">Magnitude (pu)</th><th scope="col">Angle (°)</th></tr></thead><tbody>${letters.map((n,i)=>'<tr style="--pcolor:'+colors[i]+'"><td><span class="phase-key"><i class="dot"></i>Phase '+n+'</span></td><td>'+phaseField(i,0)+'</td><td>'+phaseField(i,1)+'</td></tr>').join('')}</tbody></table>
        </div>
      </div>
      <details><summary>Transform equations &amp; plot scales</summary><div class="eq-layout"><div><h4>ABC phase convention</h4><p>Let α = e<sup>j120°</sup>. The A-phase components follow from the three line-to-neutral RMS voltages.</p>
      <div class="equation">V₁ = (V<sub>a</sub> + αV<sub>b</sub> + α²V<sub>c</sub>) / 3<br>V₂ = (V<sub>a</sub> + α²V<sub>b</sub> + αV<sub>c</sub>) / 3<br>V₀ = (V<sub>a</sub> + V<sub>b</sub> + V<sub>c</sub>) / 3</div></div>
      <div><h4>Reading the plots</h4><p>Positive sequence follows A–B–C. Negative sequence follows A–C–B. All three zero-sequence phasors coincide. Adding the three component vectors of one colour reconstructs that phase voltage.</p>
      <p id="ring-readout"></p><p>The voltage unbalance factor (VUF) is 100 × |V₂| / |V₁|. A zero phasor has no defined angle.</p></div></div></details>`;
    const plane=query('#phase-plane'), select=query('#seq-preset'), scale=query('#seq-scale');
    const inputs=Array.from(root.querySelectorAll('.edit-field input'));
    let values, dragged=null;
    function render(skip=null) {
      const {phase,sequences,components}=decompose(values);
      window.Lab.plot(plane,{dark:true,draggable:true,unit:'pu',max:1.5,vectors:phase.map((z,i)=>({z,color:colors[i],label:letters[i]}))});
      const shared=ringLimit(Math.max(...sequences.map(magnitude)));
      const rings=[];
      sequences.forEach((z,i)=>{
        const max=scale.value==='common'?shared:ringLimit(magnitude(z)); rings.push(max);
        window.Lab.plot(query('#seq-plot-'+i),{compact:true,miniature:true,max,showLabels:false,vectors:components[i].map((v,j)=>({z:v,color:colors[j],label:letters[j]}))});
        query('#seq-mag-'+i).innerHTML=fixed(magnitude(z),3)+' <small>pu</small>';
        query('#seq-angle-'+i).textContent='∠ '+degrees(z);
        query('#seq-rim-'+i).textContent='Rim '+Number(max.toPrecision(3))+' pu';
        const chart=query('#seq-plot-'+i);
        chart.setAttribute('aria-label',seqNames[i]+' sequence, phase A '+fixed(magnitude(z),3)+' pu, angle '+degrees(z)+', outer ring '+max+' pu');
        chart.parentElement.title=seqNames[i]+' sequence · outer ring '+Number(max.toPrecision(3))+' pu';
      });
      query('#ring-readout').textContent='Phase voltage plane outer ring: 1.5 pu. Sequence outer rings (positive, negative, zero): '+rings.map(v=>Number(v.toPrecision(3))).join(', ')+' pu. Shared scale uses one outer-ring value for all three plots.';
      phase.forEach((z,i)=>query('#phaseread-'+i).textContent=fixed(magnitude(z),2)+' ∠ '+degrees(z).replace('.0°','°'));
      query('#seq-vuf').textContent=magnitude(sequences[0])<1e-9?'—':fixed(100*magnitude(sequences[1])/magnitude(sequences[0]),1)+'%';
      inputs.forEach(el=>{
        const value=values[Number(el.dataset.phase)][Number(el.dataset.kind)];
        if(el!==skip) el.value=el.type==='number'&&el.dataset.kind==='0'?value.toFixed(2):String(value);
        if(el.type==='range') el.style.setProperty('--fill',(100*(value-Number(el.min))/(Number(el.max)-Number(el.min)))+'%');
      });
    }
    function preset(i) { values=configs[i].values.map(v=>[...v]); select.value=String(i); render(); }
    function update(i,k,val,skip) { values[i][k]=val; select.value='custom'; render(skip); }
    select.addEventListener('change',()=>{if(select.value!=='custom')preset(Number(select.value));});
    scale.addEventListener('change',()=>render());
    query('#seq-reset').addEventListener('click',()=>preset(0));
    inputs.forEach(el=>{
      el.addEventListener('input',()=>{
        const v=el.valueAsNumber;
        if(!Number.isFinite(v)||v<Number(el.min)||v>Number(el.max)) return;
        update(Number(el.dataset.phase),Number(el.dataset.kind),v,el.type==='number'?el:null);
      });
      if(el.type==='number') el.addEventListener('change',()=>{
        const v=el.valueAsNumber;
        if(Number.isFinite(v)) update(Number(el.dataset.phase),Number(el.dataset.kind),clamp(v,Number(el.min),Number(el.max)));
        else render();
      });
      if(el.type==='number') el.addEventListener('blur',()=>render());
    });
    plane.addEventListener('pointerdown',e=>{
      const handle=e.target.closest('[data-vector]');
      if(!handle||dragged||e.button!==0) return;
      e.preventDefault();
      dragged={index:Number(handle.dataset.vector),pointer:e.pointerId};
      plane.setPointerCapture(e.pointerId);
      plane.classList.add('dragging');
    });
    plane.addEventListener('pointermove',e=>{
      if(!dragged||dragged.pointer!==e.pointerId) return;
      const matrix=plane.getScreenCTM();
      if(!matrix) return;
      const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
      const re=(p.x-Number(plane.dataset.cx))/Number(plane.dataset.r)*Number(plane.dataset.max);
      const im=(Number(plane.dataset.cy)-p.y)/Number(plane.dataset.r)*Number(plane.dataset.max);
      values[dragged.index]=[Math.round(clamp(Math.hypot(re,im),0,1.5)*100)/100,Math.round(Math.atan2(im,re)/rad)];
      select.value='custom'; render();
    });
    function end(e) {
      if(!dragged||dragged.pointer!==e.pointerId)return;
      dragged=null; plane.classList.remove('dragging');
      if(plane.hasPointerCapture(e.pointerId))plane.releasePointerCapture(e.pointerId);
    }
    ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>plane.addEventListener(evt,end));
    preset(0);
  };
})();
