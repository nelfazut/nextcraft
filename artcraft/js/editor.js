/**
 * PhotoCraft Editor Controller (Main Orchestrator)
 * Coordonne les modules spécialisés (UI, State, Modals, Autosave, Bridge)
 * pour offrir une intégration fluide et transparente du studio WebAssembly dans Nextcloud.
 */

(function () {
    'use strict';

    // 1. Extraction des paramètres du DOM
    const appContainer = document.getElementById('artcraft-app');
    if (!appContainer) return;

    const fileId = parseInt(appContainer.getAttribute('data-file-id'), 10);
    let fileName = appContainer.getAttribute('data-file-name') || 'Projet.craft';
    const currentDir = appContainer.getAttribute('data-dir') || '/';
    const isReadOnly = appContainer.getAttribute('data-readonly') === 'true';
    const lockedBy = appContainer.getAttribute('data-locked-by') || '';
    const isPublic = appContainer.getAttribute('data-is-public') === 'true';
    const publicToken = appContainer.getAttribute('data-token') || '';

    const BASE_URL = OC.generateUrl ? OC.generateUrl('apps/artcraft') : '/index.php/apps/artcraft';

    const config = {
        fileId,
        fileName,
        currentDir,
        isReadOnly,
        lockedBy,
        isPublic,
        publicToken,
        baseUrl: BASE_URL
    };

    // 2. Enregistrement initial dans le registre des documents suivis
    if (fileId && fileName && window.PhotoCraft && window.PhotoCraft.State) {
        window.PhotoCraft.State.registerTrackedDocument(fileId, fileName, currentDir, true);
    }

    // 3. Événement d'interaction utilisateur pour l'autosave en direct
    window.onPhotoCraftUserInteraction = function () {
        if (isReadOnly || !window.PhotoCraft || !window.PhotoCraft.Autosave) return;
        window.PhotoCraft.Autosave.scheduleAutosave(() => {
            window.PhotoCraft.Autosave.triggerSaveImmediate(true, false);
        });
    };

    // 4. Initialisation des fenêtres modales
    if (window.PhotoCraft && window.PhotoCraft.Modals) {
        // Place Embedded (Insertion Image)
        window.PhotoCraft.Modals.initAssetPickerIntegration((blobOrFile, name, mode) => {
            if (window.PhotoCraft.Bridge) {
                window.PhotoCraft.Bridge.handleImageInsertion(blobOrFile, name, mode);
            }
        });

        // Open Document (Ctrl+O)
        window.PhotoCraft.Modals.initOpenDocumentIntegration((path) => {
            if (window.PhotoCraft.Bridge) {
                window.PhotoCraft.Bridge.openDocumentFromNextcloudPath(path, BASE_URL);
            }
        }, currentDir);

        // File Info & Rename (Ctrl+Alt+Shift+I)
        window.PhotoCraft.Modals.initFileInfoIntegration(
            fileId,
            () => fileName,
            currentDir,
            BASE_URL,
            (newName) => {
                fileName = newName;
                if (window.PhotoCraft.State) {
                    window.PhotoCraft.State.registerTrackedDocument(fileId, newName, currentDir, true);
                }
            }
        );

        // Exit (Ctrl+Q)
        window.PhotoCraft.Modals.initExitIntegration(currentDir, async () => {
            if (window.PhotoCraft.Autosave) {
                window.PhotoCraft.Autosave.triggerSaveImmediate(false, false);
            }
        });
    }

    // 5. Raccourcis clavier globaux sur la fenêtre parente
    window.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;

        // Ctrl+S / Ctrl+Shift+S
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            e.stopPropagation();
            if (window.PhotoCraft && window.PhotoCraft.Autosave) {
                window.PhotoCraft.Autosave.triggerSaveImmediate(false, e.shiftKey);
            }
        }
        // Ctrl+O
        else if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.onPhotoCraftOpenRequested === 'function') {
                window.onPhotoCraftOpenRequested();
            }
        }
        // Ctrl+Q
        else if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.onPhotoCraftExitRequested === 'function') {
                window.onPhotoCraftExitRequested();
            }
        }
    }, true);

    // 6. Initialisation de la communication studio Wasm et de l'écouteur de sauvegarde
    if (window.PhotoCraft && window.PhotoCraft.Bridge) {
        window.PhotoCraft.Bridge.setupSaveListener(config);
        window.PhotoCraft.Bridge.initStudio(config);
    }
})();
