/**
 * PhotoCraft Studio WebAssembly <-> Nextcloud Host Bridge
 * Gère les interactions bidirectionnelles entre l'application Wasm isolée et l'environnement Nextcloud :
 * - Interception transparente des sauvegardes (Direct Save, Save As, Autosave)
 * - Injection synthétique de documents (DataTransfer / Drop event)
 * - Insertion d'images dans des calques
 * - Raccourcis clavier globaux & coordonnées de menus natifs
 */

(function () {
  'use strict';

  // Machine à états de sauvegarde explicite
  const SaveMode = {
    IDLE: 'IDLE',
    DIRECT: 'DIRECT',
    AUTOSAVE: 'AUTOSAVE',
    SAVE_AS: 'SAVE_AS'
  };

  let currentSaveMode = SaveMode.IDLE;
  let isProgrammaticSaving = false;
  let fileMenuOpenedAt = 0;

  // =========================================================================
  // 1. Interception de l'enregistrement PhotoCraft (Save / Save As / Export)
  // =========================================================================
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href) {
      const downloadName = this.download;
      const blobUrl = this.href;
      const isAutosave = (currentSaveMode === SaveMode.AUTOSAVE);
      const isSaveAs = (currentSaveMode === SaveMode.SAVE_AS);

      currentSaveMode = SaveMode.IDLE;
      isProgrammaticSaving = false;

      if (blobUrl.startsWith('blob:') || blobUrl.startsWith('data:')) {
        fetch(blobUrl)
          .then(r => r.blob())
          .then(blob => {
            if (window.parent && typeof window.parent.onPhotoCraftSave === 'function') {
              window.parent.onPhotoCraftSave(blob, downloadName, isAutosave, isSaveAs);
            }
          })
          .catch(err => console.error('[PhotoCraft Bridge] Erreur transmission sauvegarde:', err));
        return; // Bloque le téléchargement disque local pour enregistrer sur Nextcloud
      }
    }
    return origClick.apply(this, arguments);
  };

  window.isPhotoCraftReady = function () {
    const c = document.getElementById('photocraft_canvas');
    const loading = document.getElementById('photocraft_loading');
    return !!c && !loading;
  };

  // =========================================================================
  // 2. Ouverture de document depuis un Blob via événement Drop synthétique
  // =========================================================================
  window.openDocumentFromBlob = async function (blob, fileName) {
    let count = 0;
    while (count < 100 && !window.isPhotoCraftReady()) {
      await new Promise(r => setTimeout(r, 100));
      count++;
    }
    await new Promise(r => setTimeout(r, 200));

    const canvas = document.getElementById('photocraft_canvas');
    if (!canvas) return false;

    const file = new File([blob], fileName || 'Document.craft', {
      type: blob.type || 'application/octet-stream'
    });
    const dt = new DataTransfer();
    dt.items.add(file);
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    });
    canvas.dispatchEvent(dropEvent);
    return true;
  };

  // =========================================================================
  // 3. Déclenchement silencieux de l'enregistrement PhotoCraft interne
  // =========================================================================
  window.triggerSave = async function (isAutosave = false, isSaveAs = false) {
    const canvas = document.getElementById('photocraft_canvas');
    if (!canvas) return false;

    currentSaveMode = isAutosave ? SaveMode.AUTOSAVE : (isSaveAs ? SaveMode.SAVE_AS : SaveMode.DIRECT);
    isProgrammaticSaving = true;

    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: isSaveAs ? 'S' : 's',
      code: 'KeyS',
      keyCode: 83,
      which: 83,
      ctrlKey: true,
      shiftKey: isSaveAs,
      bubbles: true,
      cancelable: true
    }));
    canvas.dispatchEvent(new KeyboardEvent('keyup', {
      key: isSaveAs ? 'S' : 's',
      code: 'KeyS',
      keyCode: 83,
      which: 83,
      ctrlKey: true,
      shiftKey: isSaveAs,
      bubbles: true,
      cancelable: true
    }));

    setTimeout(() => {
      isProgrammaticSaving = false;
    }, 400);

    return true;
  };

  // =========================================================================
  // 4. Insertion d'une image en tant que calque dans le document actif
  // =========================================================================
  window.insertImageAsLayer = async function (blob, fileName) {
    let count = 0;
    while (count < 100 && !window.isPhotoCraftReady()) {
      await new Promise(r => setTimeout(r, 100));
      count++;
    }
    await new Promise(r => setTimeout(r, 200));

    const canvas = document.getElementById('photocraft_canvas');
    if (!canvas) return false;

    function sendKey(type, key, code, keyCode, ctrl = false) {
      canvas.dispatchEvent(new KeyboardEvent(type, {
        key, code, keyCode, which: keyCode,
        ctrlKey: ctrl, metaKey: ctrl,
        bubbles: true, cancelable: true
      }));
    }
    function pressKey(key, code, keyCode, ctrl = false) {
      sendKey('keydown', key, code, keyCode, ctrl);
      sendKey('keyup', key, code, keyCode, ctrl);
    }
    function clickAt(x, y) {
      const rect = canvas.getBoundingClientRect();
      const opts = { clientX: rect.left + x, clientY: rect.top + y, bubbles: true };
      canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
      canvas.dispatchEvent(new MouseEvent('mousedown', opts));
      canvas.dispatchEvent(new PointerEvent('pointerup', opts));
      canvas.dispatchEvent(new MouseEvent('mouseup', opts));
      canvas.dispatchEvent(new MouseEvent('click', opts));
    }

    // 1. Ouvrir le blob dans un onglet temporaire
    const tempName = '__import_layer_' + (fileName || 'image.png');
    const opened = await window.openDocumentFromBlob(blob, tempName);
    if (!opened) return false;

    await new Promise(r => setTimeout(r, 800));

    // 2. Focus sur le document temporaire et sélectionner l'image
    canvas.focus();
    clickAt(300, 300);
    await new Promise(r => setTimeout(r, 150));

    // Ctrl+A : Sélectionner tout
    pressKey('a', 'KeyA', 65, true);
    await new Promise(r => setTimeout(r, 150));

    // Ctrl+C : Copier dans le presse-papier pixels
    pressKey('c', 'KeyC', 67, true);
    await new Promise(r => setTimeout(r, 150));

    // Ctrl+W : Fermer l'onglet temporaire
    pressKey('w', 'KeyW', 87, true);
    await new Promise(r => setTimeout(r, 250));

    // 'n' : Fermer sans enregistrer ("Unsaved changes: (N)o")
    pressKey('n', 'KeyN', 78, false);
    await new Promise(r => setTimeout(r, 250));

    // 3. Re-sélectionner le document projet (Tab 1 à x=120, y=80)
    clickAt(120, 80);
    await new Promise(r => setTimeout(r, 150));
    clickAt(300, 300);
    await new Promise(r => setTimeout(r, 150));

    // Ctrl+V : Coller en tant que nouveau calque
    pressKey('v', 'KeyV', 86, true);
    await new Promise(r => setTimeout(r, 400));

    return true;
  };

  // =========================================================================
  // 5. Interceptions des menus natifs PhotoCraft (File -> Open / Save As / etc.)
  // =========================================================================
  window.addEventListener('pointerdown', (e) => {
    const canvas = document.getElementById('photocraft_canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clic sur l'en-tête de menu "File"
    if (x >= 20 && x <= 65 && y >= 0 && y <= 30) {
      fileMenuOpenedAt = Date.now();
    } else if (Date.now() - fileMenuOpenedAt < 5000) {
      // 1. Open... (x: 20-240, y: 85-125)
      if (x >= 20 && x <= 240 && y >= 85 && y <= 125) {
        e.preventDefault();
        e.stopPropagation();
        fileMenuOpenedAt = 0;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        if (window.parent && typeof window.parent.openOpenDocumentModal === 'function') {
          window.parent.openOpenDocumentModal();
        }
        return;
      }
      // 2. Save (x: 20-240, y: 255-285)
      if (x >= 20 && x <= 240 && y >= 255 && y <= 285) {
        currentSaveMode = SaveMode.DIRECT;
        fileMenuOpenedAt = 0;
      }
      // 3. Save As... (x: 20-240, y: 295-330)
      if (x >= 20 && x <= 240 && y >= 295 && y <= 330) {
        currentSaveMode = SaveMode.SAVE_AS;
        fileMenuOpenedAt = 0;
      }
      // 4. Place Embedded... / Place Linked... (x: 20-240, y: 450-515)
      if (x >= 20 && x <= 240 && y >= 450 && y <= 515) {
        e.preventDefault();
        e.stopPropagation();
        fileMenuOpenedAt = 0;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        if (window.parent && typeof window.parent.openInsertImageModal === 'function') {
          window.parent.openInsertImageModal();
        }
        return;
      }
      // 5. Import > (x: 20-240, y: 610-640)
      if (x >= 20 && x <= 240 && y >= 610 && y <= 640) {
        e.preventDefault();
        e.stopPropagation();
        fileMenuOpenedAt = 0;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        if (window.parent && typeof window.parent.openInsertImageModal === 'function') {
          window.parent.openInsertImageModal();
        }
        return;
      }
      // 6. File Info... (x: 20-240, y: 645-680)
      if (x >= 20 && x <= 240 && y >= 645 && y <= 680) {
        e.preventDefault();
        e.stopPropagation();
        fileMenuOpenedAt = 0;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        if (window.parent && typeof window.parent.openFileInfoModal === 'function') {
          window.parent.openFileInfoModal();
        }
        return;
      }
      // 7. Exit (x: 20-240, y: 745-785)
      if (x >= 20 && x <= 240 && y >= 745 && y <= 785) {
        e.preventDefault();
        e.stopPropagation();
        fileMenuOpenedAt = 0;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        if (window.parent && typeof window.parent.exitToNextcloud === 'function') {
          window.parent.exitToNextcloud();
        }
        return;
      }
    }
  }, true);

  // Détection des interactions utilisateur pour le live autosave (pointerup, keyup)
  window.addEventListener('pointerup', () => {
    if (isProgrammaticSaving) return;
    if (window.parent && typeof window.parent.onPhotoCraftUserInteraction === 'function') {
      window.parent.onPhotoCraftUserInteraction();
    }
  }, true);

  window.addEventListener('keyup', () => {
    if (isProgrammaticSaving) return;
    if (window.parent && typeof window.parent.onPhotoCraftUserInteraction === 'function') {
      window.parent.onPhotoCraftUserInteraction();
    }
  }, true);

  // =========================================================================
  // 6. Capture des raccourcis clavier natifs dans l'iframe
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (isProgrammaticSaving) return;
    const key = e.key ? e.key.toLowerCase() : '';
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl+O : Ouvrir un document dans un nouvel onglet
    if (isCtrl && key === 'o' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      if (window.parent && typeof window.parent.openOpenDocumentModal === 'function') {
        window.parent.openOpenDocumentModal();
      }
      return;
    }

    // Ctrl+Shift+S : Enregistrer sous dans Nextcloud
    if (isCtrl && e.shiftKey && key === 's') {
      e.preventDefault();
      e.stopPropagation();
      currentSaveMode = SaveMode.SAVE_AS;
      window.triggerSave(false, true);
      return;
    }

    // Ctrl+S : Enregistrer dans Nextcloud
    if (isCtrl && !e.shiftKey && !e.altKey && key === 's') {
      e.preventDefault();
      e.stopPropagation();
      currentSaveMode = SaveMode.DIRECT;
      window.triggerSave(false, false);
      return;
    }

    // Ctrl+Shift+P : Importer une image en calque (Place Embedded)
    if (isCtrl && e.shiftKey && key === 'p') {
      e.preventDefault();
      e.stopPropagation();
      if (window.parent && typeof window.parent.openInsertImageModal === 'function') {
        window.parent.openInsertImageModal();
      }
      return;
    }

    // Ctrl+Alt+Shift+I : Propriétés / Renommer le document
    if (isCtrl && e.altKey && e.shiftKey && key === 'i') {
      e.preventDefault();
      e.stopPropagation();
      if (window.parent && typeof window.parent.openFileInfoModal === 'function') {
        window.parent.openFileInfoModal();
      }
      return;
    }

    // Ctrl+Q : Quitter vers Nextcloud
    if (isCtrl && key === 'q') {
      e.preventDefault();
      e.stopPropagation();
      if (window.parent && typeof window.parent.exitToNextcloud === 'function') {
        window.parent.exitToNextcloud();
      }
      return;
    }
  }, true);
})();
