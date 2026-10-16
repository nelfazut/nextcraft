/**
 * Hook Nextcloud Files pour PhotoCraft
 * - Ouvre directement l'éditeur dès la création d'un document (+ Nouveau -> Projet PhotoCraft)
 * - Ouvre l'éditeur au clic sur un fichier PSD / image dans l'explorateur ou les recommandations
 * - Supporte le routage Vue Router et les actions de fichiers natives Nextcloud
 */

(function (OCA, OC) {
    'use strict';

    const APP_NAME = 'artcraft';

    function isPhotoCraftFile(fileName) {
        if (!fileName || typeof fileName !== 'string') return false;
        const name = fileName.toLowerCase();
        return name.endsWith('.psd') ||
               name.endsWith('.craft') ||
               name.endsWith('.photo') ||
               name.endsWith('.art');
    }

    function isPhotoCraftMime(mime) {
        if (!mime || typeof mime !== 'string') return false;
        const m = mime.toLowerCase();
        return m.includes('photocraft') ||
               m.includes('artcraft') ||
               m.includes('image/vnd.adobe.photoshop') ||
               m.includes('image/x-photoshop') ||
               m.includes('photoshop');
    }

    function openPhotoCraftEditor(fileId, dir) {
        if (!fileId) return;
        const baseUrl = (window.OC && OC.generateUrl)
            ? OC.generateUrl(`apps/${APP_NAME}/editor`)
            : `/index.php/apps/${APP_NAME}/editor`;
        const currentDir = dir || (new URLSearchParams(window.location.search).get('dir')) || '/';
        const url = `${baseUrl}?fileId=${encodeURIComponent(fileId)}&dir=${encodeURIComponent(currentDir)}`;
        window.location.href = url;
    }

    // =========================================================================
    // 1. Interception de la création de fichiers pour ouverture immédiate
    // =========================================================================
    function handleCreatedFile(data) {
        if (!data) return;
        const fileId = data.fileid || data.id || data.fileId;
        const fileName = data.basename || data.filename || data.name || '';
        const mime = data.mime || data.mimetype || '';

        if (fileId && (isPhotoCraftFile(fileName) || isPhotoCraftMime(mime))) {
            const currentDir = new URLSearchParams(window.location.search).get('dir') || '/';
            openPhotoCraftEditor(fileId, currentDir);
        }
    }

    // Hook XMLHttpRequest (utilisé par @nextcloud/axios)
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._artcraft_url = typeof url === 'string' ? url : (url ? url.toString() : '');
        this._artcraft_method = method;
        return origOpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', function () {
            try {
                const url = this._artcraft_url || '';
                if (url.includes('/templates/create') || url.includes('/directEditing/create')) {
                    if (this.status >= 200 && this.status < 300) {
                        const json = JSON.parse(this.responseText);
                        const fileData = json?.ocs?.data || json?.data || json;
                        handleCreatedFile(fileData);
                    }
                }
            } catch (e) {}
        });
        return origSend.apply(this, args);
    };

    // Hook window.fetch
    if (typeof window.fetch === 'function') {
        const origFetch = window.fetch;
        window.fetch = async function (...args) {
            const response = await origFetch.apply(this, args);
            try {
                const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
                if (url.includes('/templates/create') || url.includes('/directEditing/create')) {
                    if (response.ok) {
                        const clone = response.clone();
                        clone.json().then(json => {
                            const fileData = json?.ocs?.data || json?.data || json;
                            handleCreatedFile(fileData);
                        }).catch(() => {});
                    }
                }
            } catch (e) {}
            return response;
        };
    }

    // =========================================================================
    // 2. Support Vue Router (Nextcloud 30+ Files Vue Router)
    // =========================================================================
    function hookVueRouter() {
        if (window.OCP && OCP.Files && OCP.Files.Router && OCP.Files.Router.router) {
            const router = OCP.Files.Router.router;
            router.afterEach((to) => {
                if (to && to.query && to.query.openfile) {
                    const fileId = to.query.openfile;
                    setTimeout(() => {
                        const row = document.querySelector(`tr[data-cy-files-list-row-fileid="${fileId}"]`);
                        if (row) {
                            const name = row.getAttribute('data-cy-files-list-row-name') || '';
                            if (isPhotoCraftFile(name)) {
                                openPhotoCraftEditor(fileId, to.query.dir || '/');
                            }
                        }
                    }, 100);
                }
            });
        }
    }

    // =========================================================================
    // 3. Clic direct sur une ligne de fichier ou recommandation
    // =========================================================================
    document.addEventListener('click', function (e) {
        // Clic sur une ligne de tableau de fichiers
        const row = e.target.closest('tr.files-list__row, tr[data-cy-files-list-row]');
        if (row) {
            const fileName = row.getAttribute('data-cy-files-list-row-name') || '';
            if (isPhotoCraftFile(fileName)) {
                const fileId = row.getAttribute('data-cy-files-list-row-fileid');
                if (fileId) {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentDir = new URLSearchParams(window.location.search).get('dir') || '/';
                    openPhotoCraftEditor(fileId, currentDir);
                    return;
                }
            }
        }

        // Clic sur une carte de recommandation
        const rec = e.target.closest('a.recommendation');
        if (rec) {
            const text = rec.textContent || '';
            if (isPhotoCraftFile(text)) {
                const match = document.querySelector('tr.files-list__row[data-cy-files-list-row-name*=".psd"], tr.files-list__row[data-cy-files-list-row-name*=".craft"]');
                const fileId = match ? match.getAttribute('data-cy-files-list-row-fileid') : null;
                if (fileId) {
                    e.preventDefault();
                    e.stopPropagation();
                    openPhotoCraftEditor(fileId, '/');
                    return;
                }
            }
        }
    }, true);

    function isSupportedImage(fileName) {
        if (!fileName || typeof fileName !== 'string') return false;
        const name = fileName.toLowerCase();
        return /\.(png|jpe?g|webp|gif|svg|bmp|tiff?|ico|heic|avif)$/i.test(name);
    }

    function isPhotoCraftOpenable(fileName) {
        return isPhotoCraftFile(fileName) || isSupportedImage(fileName);
    }

    // =========================================================================
    // 4. Support Actions de fichiers (Nextcloud 30+ Vue & Nextcloud Legacy)
    // =========================================================================
    function registerVueAction() {
        const scope = window._nc_files_scope?.v4_0;
        if (!scope || !scope.fileActions || !scope.registry) return false;
        if (scope.fileActions.has('open_in_photocraft')) return true;

        const action = {
            id: 'open_in_photocraft',
            displayName: () => 'Ouvrir dans PhotoCraft',
            iconSvgInline: () => `<svg xmlns="http://www.w3.org/2000/svg" id="mdi-image-edit-outline" viewBox="0 0 24 24"><path d="M22.7,14.3L21.7,15.3L19.7,13.3L20.7,12.3C20.8,12.2 20.9,12.1 21.1,12.1C21.2,12.1 21.4,12.2 21.5,12.3L22.8,13.6C22.9,13.8 22.9,14.1 22.7,14.3M13,19.9V22H15.1L21.2,15.9L19.2,13.9L13,19.9M21,5C21,3.9 20.1,3 19,3H5C3.9,3 3,3.9 3,5V19C3,20.1 3.9,21 5,21H11V19H5V5H19V10.3L21,8.3V5M11.2,13.5L9.2,16L6.5,12.5L3,17H12.1L15.6,13.5L11.2,13.5Z"/></svg>`,
            enabled: ({ nodes }) => {
                const node = nodes && nodes[0];
                if (!node) return false;
                const name = (node.basename || node.name || '').toLowerCase();
                return isPhotoCraftOpenable(name);
            },
            exec: ({ nodes }) => {
                const node = nodes && nodes[0];
                if (!node) return;
                const fileId = node.fileid || node.id || node.attributes?.fileid;
                const dir = (new URLSearchParams(window.location.search).get('dir')) || '/';
                openPhotoCraftEditor(fileId, dir);
            },
            order: 5
        };

        scope.fileActions.set(action.id, action);
        if (typeof scope.registry.dispatchEvent === 'function') {
            scope.registry.dispatchEvent(new CustomEvent('register:action', { detail: action }));
        }
        return true;
    }

    function watchVueFilesScope() {
        if (registerVueAction()) return;

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (registerVueAction() || attempts > 120) {
                clearInterval(interval);
            }
        }, 50);

        let currentScope = window._nc_files_scope;
        if (!currentScope) {
            try {
                Object.defineProperty(window, '_nc_files_scope', {
                    configurable: true,
                    enumerable: true,
                    get() {
                        return currentScope;
                    },
                    set(val) {
                        currentScope = val;
                        setTimeout(registerVueAction, 0);
                        setTimeout(registerVueAction, 100);
                    }
                });
            } catch (e) {}
        }

        document.addEventListener('click', (e) => {
            if (e.target.closest('.action-item__menutoggle, [id^="trigger-menu-"]')) {
                registerVueAction();
            }
        }, true);

        document.addEventListener('contextmenu', () => {
            registerVueAction();
        }, true);
    }

    function initPhotoCraftIntegration() {
        hookVueRouter();
        watchVueFilesScope();

        if (!OCA || !OCA.Files || !OCA.Files.fileActions) return;
        const fileActions = OCA.Files.fileActions;

        // Fichiers PhotoCraft natifs (ouvrir par défaut au clic direct)
        ['craft', 'psd', 'art', 'photo'].forEach(ext => {
            fileActions.registerAction({
                name: 'open_photocraft_' + ext,
                displayName: 'Ouvrir dans PhotoCraft',
                extension: ext,
                permissions: (window.OC && OC.PERMISSION_READ) || 1,
                iconClass: 'icon-picture-dark',
                actionHandler: function (fileName, context) {
                    const fileInfo = context.fileInfoModel || context.$file;
                    const fileId = fileInfo.get('id') || fileInfo.data('id');
                    const dir = context.fileList ? context.fileList.getCurrentDirectory() : '/';
                    openPhotoCraftEditor(fileId, dir);
                }
            });
            fileActions.setDefault(ext, 'open_photocraft_' + ext);
        });

        // Fichiers images standards (option "Ouvrir dans PhotoCraft" dans le menu d'actions, sans écraser le visualiseur par défaut)
        ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'avif'].forEach(ext => {
            fileActions.registerAction({
                name: 'open_photocraft_' + ext,
                displayName: 'Ouvrir dans PhotoCraft',
                mime: 'image/' + ext,
                extension: ext,
                permissions: (window.OC && OC.PERMISSION_READ) || 1,
                iconClass: 'icon-picture-dark',
                actionHandler: function (fileName, context) {
                    const fileInfo = context.fileInfoModel || context.$file;
                    const fileId = fileInfo ? (fileInfo.get('id') || fileInfo.data('id') || fileInfo.id) : null;
                    const dir = context.fileList ? context.fileList.getCurrentDirectory() : '/';
                    openPhotoCraftEditor(fileId, dir);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPhotoCraftIntegration);
    } else {
        initPhotoCraftIntegration();
    }

})(window.OCA, window.OC);
