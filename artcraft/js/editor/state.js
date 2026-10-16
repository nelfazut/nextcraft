/**
 * PhotoCraft Editor - State & Registry Component
 * Gère le suivi des documents ouverts, la résolution des correspondances et le format par défaut (.craft).
 */

window.PhotoCraft = window.PhotoCraft || {};

window.PhotoCraft.State = (function () {
    'use strict';

    // Registre des documents suivis pour la sauvegarde automatique en direct dans Nextcloud
    const trackedDocuments = new Map();

    function cleanDocName(name) {
        if (!name) return '';
        return name.replace(/\.[^/.]+$/, '').trim().toLowerCase();
    }

    function registerTrackedDocument(docFileId, name, dir, isInitial = false) {
        if (!docFileId || !name) return;
        const entry = {
            fileId: parseInt(docFileId, 10),
            fileName: name,
            dir: dir || '/',
            isInitial
        };
        trackedDocuments.set(name.toLowerCase(), entry);
        trackedDocuments.set(cleanDocName(name), entry);
        console.log(`[PhotoCraft] Document suivi pour sauvegarde auto : "${name}" (ID: ${docFileId})`);
    }

    function findTrackedDocument(downloadName) {
        if (!downloadName) return null;
        const keyLower = downloadName.toLowerCase();
        if (trackedDocuments.has(keyLower)) return trackedDocuments.get(keyLower);

        const cleanKey = cleanDocName(downloadName);
        if (trackedDocuments.has(cleanKey)) return trackedDocuments.get(cleanKey);

        const cleanBase = cleanKey.replace(/\s*\(\d+\)$/, '').trim();
        if (trackedDocuments.has(cleanBase)) return trackedDocuments.get(cleanBase);

        for (const doc of trackedDocuments.values()) {
            if (cleanDocName(doc.fileName) === cleanKey || cleanDocName(doc.fileName) === cleanBase) {
                return doc;
            }
        }
        return null;
    }

    function getDefaultSaveAsName(tabName) {
        let name = (tabName || '').trim();
        if (!name || name === 'Image.png' || name === 'Nouveau_Fichier.png') {
            const defaultBase = (window.PhotoCraft && window.PhotoCraft.t) ? window.PhotoCraft.t('PhotoCraft Project') : 'PhotoCraft Project';
            name = defaultBase + '.craft';
        }
        if (/\.(png|jpe?g|webp|gif|svg|bmp|psd|tiff?)$/i.test(name)) {
            name = name.replace(/\.[^/.]+$/, '.craft');
        } else if (!/\.craft$/i.test(name)) {
            name += '.craft';
        }
        return name;
    }

    return {
        cleanDocName,
        registerTrackedDocument,
        findTrackedDocument,
        getDefaultSaveAsName,
        getAllTracked: () => trackedDocuments
    };
})();
