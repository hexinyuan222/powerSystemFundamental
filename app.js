(() => {
  'use strict';
  const tabs=Array.from(document.querySelectorAll('[role=tab]'));
  const initialized=new Set();
  const init={sequence:window.initSequencePanel, load:window.initLoadPanel, fault:window.initFaultPanel};
  function activate(id, focus=false) {
    if(!Object.hasOwn(init,id)) id='sequence';
    tabs.forEach(tab=>{
      const active=tab.dataset.target===id;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
      if(active&&focus)tab.focus();
    });
    if(!initialized.has(id)) {
      init[id]();
      initialized.add(id);
    }
  }
  function go(id) {
    activate(id,true);
    if(location.hash.slice(1)!==id) history.replaceState(null,'','#'+id);
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>go(tab.dataset.target));
    tab.addEventListener('keydown',e=>{
      const target={ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[e.key];
      if(target===undefined)return;
      e.preventDefault();go(tabs[target].dataset.target);
    });
  });
  window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
  activate(location.hash.slice(1));
})();
