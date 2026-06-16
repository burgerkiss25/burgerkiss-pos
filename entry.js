// Login-first entry routing for BurgerKiss POS.
(function(){
  'use strict';

  function showEntry(){
    document.body.classList.remove('entry-locked');
    document.body.classList.add('entry-ready');
    const session = window.BK_ACCESS && BK_ACCESS.current ? BK_ACCESS.current() : null;
    const name = document.getElementById('entryStaffName');
    if(name && session) name.textContent = session.name;
  }

  document.addEventListener('bk-access-ready', showEntry);
})();
