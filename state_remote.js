// Firebase-backed remote state and order-number helpers.
(function(root){
  'use strict';

  let authPromise = null;

  function remoteEnabled(){
    return !!(root.BK_SYNC_ENABLED !== false && root.FIREBASE_CONFIG && root.firebase && root.firebase.database);
  }

  function app(){
    return (root.firebase.apps && root.firebase.apps.length)
      ? root.firebase.app()
      : root.firebase.initializeApp(root.FIREBASE_CONFIG);
  }

  function ensureAuth(){
    if(!remoteEnabled() || !root.firebase.auth) return Promise.resolve(true);
    if(authPromise) return authPromise;
    try{
      const auth = root.firebase.auth(app());
      authPromise = auth.currentUser ? Promise.resolve(true) : auth.signInAnonymously().then(function(){ return true; });
      return authPromise.catch(function(error){ authPromise = null; throw error; });
    }catch(error){
      return Promise.reject(error);
    }
  }

  function stateRef(){
    try{
      const db = root.firebase.database(app());
      const base = (root.BK_SYNC_PATH || '/pos/live').replace(/\/+$/,'');
      const slot = (root.BK_SYNC_FORCE_SLOT && typeof root.BK_SYNC_FORCE_SLOT === 'string') ? root.BK_SYNC_FORCE_SLOT : 'SN1';
      return db.ref(`${base}/${slot}/state`);
    }catch(error){
      return null;
    }
  }

  function orderCounterRef(){
    try{
      return root.firebase.database(app()).ref((root.BK_ORDER_COUNTER_PATH || '/pos/counters/orderNumber').replace(/\/+$/,''));
    }catch(error){
      return null;
    }
  }

  function loadState(){
    if(!remoteEnabled()) return Promise.resolve(null);
    return ensureAuth().then(function(){
      const ref = stateRef();
      if(!ref) return null;
      return ref.get();
    }).then(function(snap){
      return snap ? snap.val() : null;
    });
  }

  function saveState(payload){
    if(!remoteEnabled()) return Promise.resolve(true);
    return ensureAuth().then(function(){
      const ref = stateRef();
      if(!ref) throw new Error('Remote state reference unavailable.');
      return ref.set(payload);
    }).then(function(){ return true; });
  }

  function reserveOrderSequence(floor){
    if(!remoteEnabled()) return Promise.reject(new Error('Remote order number service is disabled.'));
    return ensureAuth().then(function(){
      const ref = orderCounterRef();
      if(!ref) throw new Error('Order number service is unavailable.');
      return ref.transaction(function(current){
        return Math.max(Number(current) || 0, Number(floor) || 0) + 1;
      }, undefined, false);
    }).then(function(result){
      if(!result || !result.committed) throw new Error('Order number reservation was not committed.');
      const seq = Number(result.snapshot.val()) || 0;
      if(seq <= 0) throw new Error('Invalid order number received.');
      return seq;
    });
  }

  root.BK_STATE_REMOTE = {
    remoteEnabled,
    ensureAuth,
    stateRef,
    orderCounterRef,
    loadState,
    saveState,
    reserveOrderSequence
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_STATE_REMOTE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
