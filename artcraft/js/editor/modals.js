/**
 * PhotoCraft Editor - Modals Component
 * Gère l'ensemble des boîtes de dialogue modales intégrées :
 * - Insertion d'images (Place Embedded / Asset Picker)
 * - Ouverture de document (File -> Open / Ctrl+O)
 * - Propriétés & Renommage (File -> File Info)
 * - Quitter l'éditeur (File -> Exit / Ctrl+Q)
 * - Enregistrement sous natif (Nextcloud FilePicker + Prompt)
 */

window.PhotoCraft = window.PhotoCraft || {};

window.PhotoCraft.Modals = (function () {
    'use strict';

    const t = (text, vars) => (window.PhotoCraft && window.PhotoCraft.t ? window.PhotoCraft.t(text, vars) : text);

    let currentImportMode = 'layer';

    // =========================================================================
    // 1. Modal Place Embedded (Insertion Image)
    // =========================================================================
    function initAssetPickerIntegration(onImageChosen) {
        const modal = document.getElementById('asset-picker-modal');
        const btnClose = document.getElementById('btn-close-modal');
        const localInput = document.getElementById('local-file-input');
        const btnPickNas = document.getElementById('btn-pick-from-nas');

        window.onPhotoCraftPlaceEmbeddedRequested = function () {
            if (modal) modal.classList.remove('hidden');
        };

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => modal.classList.add('hidden'));
        }

        const modeLabels = document.querySelectorAll('.mode-option');
        modeLabels.forEach(label => {
            label.addEventListener('click', () => {
                modeLabels.forEach(l => l.classList.remove('active'));
                label.classList.add('active');
                const radio = label.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    currentImportMode = radio.value;
                }
            });
        });

        function handleImage(blobOrFile, name) {
            if (typeof onImageChosen === 'function') {
                onImageChosen(blobOrFile, name, currentImportMode);
            }
            if (modal) modal.classList.add('hidden');
        }

        if (localInput) {
            localInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleImage(file, file.name);
                    localInput.value = '';
                }
            });
        }

        if (btnPickNas) {
            btnPickNas.addEventListener('click', () => {
                if (window.OC && OC.dialogs && OC.dialogs.filepicker) {
                    OC.dialogs.filepicker(
                        t('Select an image in Nextcloud'),
                        async (path) => {
                            try {
                                window.PhotoCraft.UI.showToast(t('Loading image from Nextcloud...'), 2000);
                                const webdavUrl = OC.linkToRemote('webdav') + path;
                                const res = await fetch(webdavUrl);
                                const blob = await res.blob();
                                const imgName = path.split('/').pop() || 'Image.png';
                                handleImage(blob, imgName);
                            } catch (err) {
                                window.PhotoCraft.UI.showToast(t('Failed to load image: ') + err.message);
                            }
                        },
                        false,
                        ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/vnd.adobe.photoshop', 'application/x-photoshop'],
                        true
                    );
                }
            });
        }
    }

    // =========================================================================
    // 2. Modal Open Document (File -> Open / Ctrl+O)
    // =========================================================================
    function initOpenDocumentIntegration(onDocumentChosen, currentDir) {
        const modal = document.getElementById('open-document-modal');
        const btnClose = document.getElementById('btn-close-open-modal');
        const btnNas = document.getElementById('btn-open-from-nas');
        const localInput = document.getElementById('local-open-file-input');

        window.onPhotoCraftOpenRequested = function () {
            if (modal) modal.classList.remove('hidden');
        };

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => modal.classList.add('hidden'));
        }

        if (btnNas) {
            btnNas.addEventListener('click', () => {
                if (modal) modal.classList.add('hidden');
                if (window.OC && OC.dialogs && OC.dialogs.filepicker) {
                    OC.dialogs.filepicker(
                        t('Open a Nextcloud document in PhotoCraft'),
                        (path) => {
                            if (typeof onDocumentChosen === 'function') {
                                onDocumentChosen(path);
                            }
                        },
                        false,
                        ['image/vnd.adobe.photoshop', 'application/x-photoshop', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/x-artcraft', 'application/octet-stream'],
                        true,
                        false,
                        currentDir || '/'
                    );
                }
            });
        }

        if (localInput) {
            localInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const iframe = document.getElementById('photocraft-iframe');
                    if (iframe && iframe.contentWindow && typeof iframe.contentWindow.openDocumentFromBlob === 'function') {
                        iframe.contentWindow.openDocumentFromBlob(file, file.name);
                        window.PhotoCraft.UI.showToast(t('Local file "%s" opened', [file.name]));
                    }
                    localInput.value = '';
                    if (modal) modal.classList.add('hidden');
                }
            });
        }
    }

    // =========================================================================
    // 3. Modal File Info / Renommer (File -> File Info)
    // =========================================================================
    function initFileInfoIntegration(fileId, getFileName, currentDir, baseUrl, onRenamed) {
        const modal = document.getElementById('file-info-modal');
        const btnClose = document.getElementById('btn-close-file-info-modal');
        const btnCancel = document.getElementById('btn-cancel-file-info');
        const btnConfirm = document.getElementById('btn-confirm-file-rename');
        const input = document.getElementById('file-info-rename-input');

        window.onPhotoCraftFileInfoRequested = function () {
            if (modal) {
                if (input) input.value = typeof getFileName === 'function' ? getFileName() : getFileName;
                modal.classList.remove('hidden');
                setTimeout(() => {
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 100);
            }
        };

        const close = () => {
            if (modal) modal.classList.add('hidden');
        };

        if (btnClose) btnClose.addEventListener('click', close);
        if (btnCancel) btnCancel.addEventListener('click', close);

        if (btnConfirm && input) {
            const doRename = async () => {
                const currentName = typeof getFileName === 'function' ? getFileName() : getFileName;
                const newName = input.value.trim();
                if (!newName || newName === currentName) {
                    close();
                    return;
                }
                if (!fileId || fileId === 0) {
                    if (typeof onRenamed === 'function') {
                        onRenamed(newName);
                    }
                    window.PhotoCraft.UI.showToast(t('Document renamed to "%s"', [newName]), 3000);
                    close();
                    return;
                }
                try {
                    window.PhotoCraft.UI.showToast(t('Renaming document...'), 2000);
                    const res = await fetch(`${baseUrl}/api/file/${fileId}/rename`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'requesttoken': (window.OC && OC.requestToken) || ''
                        },
                        body: JSON.stringify({ newName })
                    });
                    const json = await res.json();
                    if (res.ok && json.success) {
                        window.PhotoCraft.UI.showToast(t('Document renamed to "%s"', [json.newName]), 3000);
                        if (typeof onRenamed === 'function') {
                            onRenamed(json.newName);
                        }
                        close();
                    } else {
                        throw new Error(json.error || `HTTP ${res.status}`);
                    }
                } catch (e) {
                    window.PhotoCraft.UI.showToast(t('Failed to rename: ') + e.message, 4000);
                }
            };

            btnConfirm.addEventListener('click', doRename);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doRename();
                } else if (e.key === 'Escape') {
                    close();
                }
            });
        }
    }

    // =========================================================================
    // 4. Modal Exit (File -> Exit / Ctrl+Q)
    // =========================================================================
    function initExitIntegration(currentDir, onSaveBeforeExit) {
        const modal = document.getElementById('exit-confirm-modal');
        const btnClose = document.getElementById('btn-close-exit-modal');
        const btnExitNoSave = document.getElementById('btn-exit-without-save');
        const btnExitSave = document.getElementById('btn-exit-save-and-close');

        const exitBackToFiles = () => {
            const targetDir = currentDir || '/';
            const filesUrl = (window.OC && OC.generateUrl)
                ? OC.generateUrl(`apps/files/?dir=${encodeURIComponent(targetDir)}`)
                : `/index.php/apps/files/?dir=${encodeURIComponent(targetDir)}`;
            window.location.href = filesUrl;
        };

        window.onPhotoCraftExitRequested = function () {
            if (modal) {
                modal.classList.remove('hidden');
            } else {
                exitBackToFiles();
            }
        };

        const close = () => {
            if (modal) modal.classList.add('hidden');
        };

        if (btnClose) btnClose.addEventListener('click', close);

        if (btnExitNoSave) {
            btnExitNoSave.addEventListener('click', () => {
                close();
                exitBackToFiles();
            });
        }

        if (btnExitSave) {
            btnExitSave.addEventListener('click', async () => {
                window.PhotoCraft.UI.showToast(t('Saving...'), 2000);
                if (typeof onSaveBeforeExit === 'function') {
                    await onSaveBeforeExit();
                }
                setTimeout(() => {
                    close();
                    exitBackToFiles();
                }, 800);
            });
        }
    }

    // =========================================================================
    // 5. Enregistrement sous natif (FilePicker + Prompt)
    // =========================================================================
    function openSaveAsModal(blob, tabName, currentDir, onPerformSaveAs) {
        const defaultName = window.PhotoCraft.State.getDefaultSaveAsName(tabName);

        if (window.OC && OC.dialogs && typeof OC.dialogs.filepicker === 'function') {
            const startDir = currentDir || '/';
            OC.dialogs.filepicker(
                t('Save as in Nextcloud - Choose destination folder'),
                (chosenDir) => {
                    const targetDir = chosenDir || startDir;
                    setTimeout(() => {
                        if (typeof OC.dialogs.prompt === 'function') {
                            OC.dialogs.prompt(
                                t('Enter the new file name for folder "%s":', [targetDir]),
                                t('Save as in Nextcloud'),
                                async (confirmed, enteredName) => {
                                    if (!confirmed || !enteredName || !enteredName.trim()) {
                                        window.PhotoCraft.UI.showToast(t('Save as cancelled'));
                                        return;
                                    }
                                    let finalName = enteredName.trim();
                                    if (/\.(png|jpe?g|webp|gif|svg|bmp|psd)$/i.test(finalName)) {
                                        finalName = finalName.replace(/\.[^/.]+$/, '.craft');
                                    } else if (!/\.craft$/i.test(finalName)) {
                                        finalName += '.craft';
                                    }
                                    if (typeof onPerformSaveAs === 'function') {
                                        await onPerformSaveAs(targetDir, finalName, blob);
                                    }
                                },
                                null,
                                t('File name (.craft)'),
                                false
                            );

                            // Pré-remplir la valeur par défaut et supporter la touche Entrée
                            let fillAttempts = 0;
                            const fillInterval = setInterval(() => {
                                fillAttempts++;
                                const dialogs = document.querySelectorAll('.modal-container');
                                const topDialog = dialogs[dialogs.length - 1];
                                if (topDialog) {
                                    const input = topDialog.querySelector('.input-field__input');
                                    if (input) {
                                        input.value = defaultName;
                                        input.dispatchEvent(new Event('input', { bubbles: true }));
                                        input.select();

                                        input.addEventListener('keydown', (e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const confirmBtn = topDialog.querySelector('button.button-vue--vue-primary, button[aria-label="Oui"]');
                                                if (confirmBtn) confirmBtn.click();
                                            }
                                        });
                                        clearInterval(fillInterval);
                                        return;
                                    }
                                }
                                if (fillAttempts >= 30) {
                                    clearInterval(fillInterval);
                                }
                            }, 50);
                        } else if (typeof onPerformSaveAs === 'function') {
                            onPerformSaveAs(targetDir, defaultName, blob);
                        }
                    }, 200);
                },
                false,
                ['httpd/unix-directory'],
                false,
                (window.OC && OC.dialogs && OC.dialogs.FILEPICKER_TYPE_CHOOSE) || undefined,
                startDir,
                { allowDirectoryChooser: true }
            );
        } else {
            const chosenName = prompt(t('File name (.craft)') + ' :', defaultName);
            if (chosenName && chosenName.trim() && typeof onPerformSaveAs === 'function') {
                onPerformSaveAs(currentDir, chosenName.trim(), blob);
            }
        }
    }

    return {
        initAssetPickerIntegration,
        initOpenDocumentIntegration,
        initFileInfoIntegration,
        initExitIntegration,
        openSaveAsModal
    };
})();
