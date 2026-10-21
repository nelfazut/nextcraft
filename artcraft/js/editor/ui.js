/**
 * PhotoCraft Editor - UI Component
 * Gère le splash screen de chargement GPU, la barre de progression et les toasts de notification.
 */

window.PhotoCraft = window.PhotoCraft || {};

window.PhotoCraft.t = function (text, vars) {
    let translated = text;
    if (typeof window.t === 'function') {
        translated = window.t('artcraft', text, vars);
    } else if (window.OC && window.OC.L10N && typeof window.OC.L10N.translate === 'function') {
        translated = window.OC.L10N.translate('artcraft', text, vars);
    }
    if (vars) {
        if (Array.isArray(vars)) {
            let i = 0;
            translated = translated.replace(/%s/g, () => vars[i++] ?? '');
        } else if (typeof vars === 'object') {
            translated = translated.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
        }
    }
    return translated;
};

window.PhotoCraft.UI = (function () {
    'use strict';

    const splash = document.getElementById('artcraft-splash');
    const splashProgress = document.getElementById('splash-progress');
    const splashPercent = document.getElementById('splash-percent');
    const splashStatus = document.getElementById('splash-status');
    const toast = document.getElementById('artcraft-toast');

    function showToast(message, duration = 3000) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), duration);
    }

    function updateSplash(percent, text) {
        if (splashProgress) splashProgress.style.width = percent + '%';
        if (splashPercent) splashPercent.textContent = percent + '%';
        if (splashStatus && text) splashStatus.textContent = text;
    }

    function hideSplash() {
        if (!splash) return;
        splash.classList.add('fade-out');
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 250);
    }

    return {
        showToast,
        updateSplash,
        hideSplash
    };
})();
