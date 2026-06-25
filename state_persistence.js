// Local persistence helpers for POS state and related cached app data.
(function(root){
  'use strict';

  function readJson(storage, key){
    let raw = null;
    try{
      raw = storage.getItem(key);
      return {raw, value: raw ? JSON.parse(raw) : null, exists: !!raw};
    }catch(error){
      return {raw, value: null, exists: !!raw, error};
    }
  }

  function writeJson(storage, key, value){
    try{
      storage.setItem(key, JSON.stringify(value));
      return true;
    }catch(error){
      return false;
    }
  }

  function remove(storage, key){
    try{
      storage.removeItem(key);
      return true;
    }catch(error){
      return false;
    }
  }

  function readState(storage, key){
    return readJson(storage, key);
  }

  function writeState(storage, key, payload){
    return writeJson(storage, key, payload);
  }

  function readHistory(storage, key){
    const result = readJson(storage, key);
    return Array.isArray(result.value) ? result.value : [];
  }

  function clearAppStorage(storage, keys){
    (Array.isArray(keys) ? keys : []).forEach(function(key){
      if(key) remove(storage, key);
    });
  }

  root.BK_STATE_PERSISTENCE = {
    readJson,
    writeJson,
    remove,
    readState,
    writeState,
    readHistory,
    clearAppStorage
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_STATE_PERSISTENCE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
