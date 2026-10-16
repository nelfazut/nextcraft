/**
 * PhotoCraft Editor - Autosave & Locking Component
 * Gère le heartbeat de verrou exclusif collaboratif et le moteur d'autosave détemporisé.
 */

window.PhotoCraft = window.PhotoCraft || {};

window.PhotoCraft.Autosave = (function () {
    'use strict';

    let autosaveTimer = null;
    let heartbeatTimer = null;

    function startLockHeartbeat(fileId, baseUrl) {
        if (!fileId || heartbeatTimer) return;
        heartbeatTimer = setInterval(async () => {
            try {
                await fetch(`${baseUrl}/api/file/${fileId}/heartbeat`, {
                    method: 'POST',
                    headers: { 'requesttoken': (window.OC && OC.requestToken) || '' }
                });
            } catch (e) {
                console.warn('[PhotoCraft] Heartbeat lock échoué:', e);
            }
        }, 15000);
    }

    function stopLockHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function scheduleAutosave(onSaveCallback, delay = 3500) {
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            if (typeof onSaveCallback === 'function') {
                onSaveCallback();
            }
        }, delay);
    }

    function triggerSaveImmediate(isAutosave = false, isSaveAs = false) {
        const iframe = document.getElementById('photocraft-iframe');
        if (iframe && iframe.contentWindow) {
            if (typeof iframe.contentWindow.triggerSave === 'function') {
                iframe.contentWindow.triggerSave(isAutosave, isSaveAs);
            } else {
                const canvas = iframe.contentDocument ? iframe.contentDocument.getElementById('photocraft_canvas') : null;
                if (canvas) {
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
                }
            }
        }
    }

    return {
        startLockHeartbeat,
        stopLockHeartbeat,
        scheduleAutosave,
        triggerSaveImmediate
    };
})();
