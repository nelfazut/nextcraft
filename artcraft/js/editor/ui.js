/**
 * PhotoCraft Editor - UI Component
 * Gère le splash screen de chargement GPU, la barre de progression et les toasts de notification.
 */

window.PhotoCraft = window.PhotoCraft || {};

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

    function setStatus(state, message) {
        console.log(`[PhotoCraft Status] [${state}] ${message}`);
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
        setStatus,
        updateSplash,
        hideSplash
    };
})();
