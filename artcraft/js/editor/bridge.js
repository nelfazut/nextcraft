/**
 * PhotoCraft Editor - Bridge Component
 * Orchestre les échanges entre l'hôte Nextcloud et le studio WebAssembly (iframe).
 */

window.PhotoCraft = window.PhotoCraft || {};

window.PhotoCraft.Bridge = (function () {
    'use strict';

    const t = (text, vars) => (window.PhotoCraft && window.PhotoCraft.t ? window.PhotoCraft.t(text, vars) : text);

    let isSaving = false;

    async function initStudio(config) {
        const {
            fileId,
            fileName,
            currentDir,
            isReadOnly,
            isPublic,
            publicToken,
            lockedBy,
            baseUrl
        } = config;

        window.PhotoCraft.UI.updateSplash(35, t('Initializing PhotoCraft GPU studio...'));
        const iframe = document.getElementById('photocraft-iframe');
        if (!iframe) return;

        let docOpened = false;

        const loadAndOpenDoc = async () => {
            if (docOpened) return;
            try {
                let fetchPromise;
                if (!fileId || fileId === 0) {
                    window.PhotoCraft.UI.updateSplash(55, t('Creating new blank canvas...'));
                    fetchPromise = (async () => {
                        const offscreen = document.createElement('canvas');
                        offscreen.width = 1920;
                        offscreen.height = 1080;
                        const ctx = offscreen.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, 1920, 1080);
                        const blob = await new Promise(r => offscreen.toBlob(r, 'image/png'));
                        const docName = fileName || (t('PhotoCraft Project') + '.craft');
                        return { blob, docName };
                    })();
                } else {
                    window.PhotoCraft.UI.updateSplash(55, t('Loading document from Nextcloud...'));
                    const loadUrl = isPublic
                        ? `${baseUrl}/public/api/${publicToken}/load`
                        : `${baseUrl}/api/file/${fileId}/load`;

                    fetchPromise = fetch(loadUrl).then(async response => {
                        let blob = null;
                        let docName = fileName;
                        if (response.ok) {
                            const arrayBuffer = await response.arrayBuffer();
                            if (arrayBuffer.byteLength > 0) {
                                const bytes = new Uint8Array(arrayBuffer);
                                const isPsd = bytes.length >= 4 && bytes[0] === 0x38 && bytes[1] === 0x42 && bytes[2] === 0x50 && bytes[3] === 0x53;
                                const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
                                const isJpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

                                if (isPsd) {
                                    blob = new Blob([arrayBuffer], { type: 'image/vnd.adobe.photoshop' });
                                    docName = fileName;
                                } else if (isPng) {
                                    blob = new Blob([arrayBuffer], { type: 'image/png' });
                                    docName = fileName.replace(/\.[^/.]+$/, '') + '.png';
                                } else if (isJpg) {
                                    blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
                                    docName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
                                } else {
                                    blob = new Blob([arrayBuffer]);
                                    docName = fileName;
                                }
                            }
                        }

                        // Fallback toile vierge 1920x1080 si le fichier est vide
                        if (!blob) {
                            const offscreen = document.createElement('canvas');
                            offscreen.width = 1920;
                            offscreen.height = 1080;
                            const ctx = offscreen.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, 1920, 1080);
                            blob = await new Promise(r => offscreen.toBlob(r, 'image/png'));
                            docName = fileName || (t('PhotoCraft Project') + '.craft');
                        }

                        return { blob, docName };
                    });
                }

                window.PhotoCraft.UI.updateSplash(75, t('Waiting for PhotoCraft GPU engine...'));
                let retries = 0;
                while (retries < 150) {
                    try {
                        const win = iframe.contentWindow;
                        if (win && typeof win.isPhotoCraftReady === 'function' && win.isPhotoCraftReady()) {
                            break;
                        }
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, 200));
                    retries++;
                }

                const { blob, docName } = await fetchPromise;
                const win = iframe.contentWindow;
                if (win && typeof win.openDocumentFromBlob === 'function') {
                    await win.openDocumentFromBlob(blob, docName);
                    docOpened = true;
                    window.PhotoCraft.UI.updateSplash(100, t('Studio ready!'));
                } else {
                    console.warn('[PhotoCraft] openDocumentFromBlob indisponible sur le studio');
                }
            } catch (e) {
                console.error('[PhotoCraft] Erreur chargement document PhotoCraft:', e);
            } finally {
                setTimeout(window.PhotoCraft.UI.hideSplash, 250);
            }
        };

        iframe.addEventListener('load', loadAndOpenDoc);
        if (iframe.contentDocument && iframe.contentDocument.location && iframe.contentDocument.location.pathname.includes('index.html')) {
            loadAndOpenDoc();
        }

        setTimeout(window.PhotoCraft.UI.hideSplash, 400);

        if (!isReadOnly && !isPublic && fileId) {
            window.PhotoCraft.Autosave.startLockHeartbeat(fileId, baseUrl);
        }

        if (isReadOnly) {
            window.PhotoCraft.UI.showToast(t('Read-only mode: File is currently being edited by %s.', [lockedBy || '...']), 6000);
        }
    }

    async function performSaveAs(targetDir, targetName, blob, baseUrl) {
        if (!blob) return;
        try {
            const url = `${baseUrl}/api/file/save-as?dir=${encodeURIComponent(targetDir)}&name=${encodeURIComponent(targetName)}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'requesttoken': (window.OC && OC.requestToken) || ''
                },
                body: blob
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Erreur serveur HTTP ${response.status}`);
            }

            window.PhotoCraft.State.registerTrackedDocument(result.fileId, result.name, targetDir, false);
            window.PhotoCraft.UI.showToast(t('New file created in Nextcloud: %s', [result.name]), 4500);
        } catch (err) {
            console.error('[PhotoCraft] Erreur lors de l\'enregistrement sous :', err);
            window.PhotoCraft.UI.showToast(t('Error during save as: ') + err.message, 5000);
        } finally {
            isSaving = false;
        }
    }

    function setupSaveListener(config) {
        const { baseUrl, currentDir, isReadOnly, isPublic, publicToken } = config;

        window.onPhotoCraftSave = async function (blob, downloadName, isAutosave = false, isSaveAs = false) {
            if (isReadOnly) return;

            // 1. Demande explicite "Enregistrer sous"
            if (isSaveAs) {
                window.PhotoCraft.Modals.openSaveAsModal(blob, downloadName, currentDir, (tDir, tName, b) => {
                    return performSaveAs(tDir, tName, b, baseUrl);
                });
                return;
            }

            // 2. Exportation d'image (File -> Export -> PNG, JPG, SVG, etc.)
            const ext = downloadName.split('.').pop().toLowerCase();
            const isExportFormat = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext);
            const tracked = window.PhotoCraft.State.findTrackedDocument(downloadName);

            if (isExportFormat && (!tracked || !tracked.fileName.toLowerCase().endsWith('.' + ext))) {
                window.PhotoCraft.UI.showToast(t('Exporting "%s" to Nextcloud...', [downloadName]));
                try {
                    const url = `${baseUrl}/api/file/save-as?dir=${encodeURIComponent(currentDir)}&name=${encodeURIComponent(downloadName)}`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'requesttoken': (window.OC && OC.requestToken) || ''
                        },
                        body: blob
                    });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        window.PhotoCraft.UI.showToast(t('Export saved in Nextcloud: %s', [result.name]), 4000);
                    } else {
                        throw new Error(result.error || `HTTP ${response.status}`);
                    }
                } catch (err) {
                    console.error('[PhotoCraft] Erreur exportation image :', err);
                    window.PhotoCraft.UI.showToast(t('Export error: ') + err.message, 5000);
                }
                return;
            }

            // 3. Sauvegarde sur document suivi ou non suivi
            if (tracked) {
                isSaving = true;
                try {
                    const targetFileId = tracked.fileId;
                    const saveUrl = isPublic && tracked.isInitial
                        ? `${baseUrl}/public/api/${publicToken}/save`
                        : `${baseUrl}/api/file/${targetFileId}/save`;

                    const response = await fetch(saveUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/octet-stream',
                            'requesttoken': (window.OC && OC.requestToken) || ''
                        },
                        body: blob
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        throw new Error(errData.error || `Erreur HTTP ${response.status}`);
                    }

                    if (!isAutosave) {
                        window.PhotoCraft.UI.showToast(t('"%s" saved in Nextcloud', [tracked.fileName]), 2500);
                    }
                } catch (err) {
                    console.error('[PhotoCraft] Erreur lors de la sauvegarde :', err);
                    window.PhotoCraft.UI.showToast(t('Error saving: ') + err.message, 5000);
                } finally {
                    isSaving = false;
                }
            } else {
                if (isAutosave) return;
                console.warn(`[PhotoCraft] Interception : Sauvegarde d'un document non suivi ("${downloadName}").`);
                window.PhotoCraft.Modals.openSaveAsModal(blob, downloadName, currentDir, (tDir, tName, b) => {
                    return performSaveAs(tDir, tName, b, baseUrl);
                });
            }
        };
    }

    async function openDocumentFromNextcloudPath(path, baseUrl) {
        if (!path) return;
        try {
            window.PhotoCraft.UI.showToast(t('Loading document from Nextcloud...'), 2500);
            const infoUrl = `${baseUrl}/api/file/info?path=${encodeURIComponent(path)}`;
            let docFileId = null;
            let docFileName = path.split('/').pop() || 'Document.craft';

            try {
                const infoRes = await fetch(infoUrl, {
                    headers: { 'requesttoken': (window.OC && OC.requestToken) || '' }
                });
                if (infoRes.ok) {
                    const infoData = await infoRes.json();
                    if (infoData.success) {
                        docFileId = infoData.fileId;
                        docFileName = infoData.name;
                    }
                }
            } catch (e) {
                console.warn('[PhotoCraft] API file/info non disponible, fallback direct', e);
            }

            let blob = null;
            if (docFileId) {
                const loadRes = await fetch(`${baseUrl}/api/file/${docFileId}/load`);
                if (loadRes.ok) {
                    blob = await loadRes.blob();
                }
            }
            if (!blob) {
                const webdavUrl = OC.linkToRemote('webdav') + path;
                const res = await fetch(webdavUrl);
                blob = await res.blob();
            }

            const iframe = document.getElementById('photocraft-iframe');
            if (iframe && iframe.contentWindow && typeof iframe.contentWindow.openDocumentFromBlob === 'function') {
                await iframe.contentWindow.openDocumentFromBlob(blob, docFileName);

                if (docFileId) {
                    const docDir = path.substring(0, path.lastIndexOf('/')) || '/';
                    window.PhotoCraft.State.registerTrackedDocument(docFileId, docFileName, docDir, false);
                    window.PhotoCraft.UI.showToast(t('"%s" opened with automatic Nextcloud save!', [docFileName]), 3500);
                } else {
                    window.PhotoCraft.UI.showToast(t('"%s" opened in a new tab', [docFileName]), 3000);
                }
            }
        } catch (err) {
            console.error('[PhotoCraft] Erreur ouverture document Nextcloud:', err);
            window.PhotoCraft.UI.showToast(t('Failed to open document: ') + err.message, 5000);
        }
    }

    function handleImageInsertion(blobOrFile, name, mode) {
        const iframe = document.getElementById('photocraft-iframe');
        if (!iframe || !iframe.contentWindow) return;

        if (mode === 'tab') {
            if (typeof iframe.contentWindow.openDocumentFromBlob === 'function') {
                iframe.contentWindow.openDocumentFromBlob(blobOrFile, name || 'Image.png');
                window.PhotoCraft.UI.showToast(t('Image opened in a new tab'));
            }
        } else {
            if (typeof iframe.contentWindow.insertImageAsLayer === 'function') {
                iframe.contentWindow.insertImageAsLayer(blobOrFile, name || 'Image.png');
                window.PhotoCraft.UI.showToast(t('Image inserted as a layer'));
            }
        }
    }

    return {
        initStudio,
        setupSaveListener,
        performSaveAs,
        openDocumentFromNextcloudPath,
        handleImageInsertion,
        isSaving: () => isSaving
    };
})();
