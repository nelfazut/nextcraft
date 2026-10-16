<?php
/** @var array $_ */
use OCP\Util;

Util::addStyle('artcraft', 'editor');
Util::addScript('artcraft', 'editor/ui');
Util::addScript('artcraft', 'editor/state');
Util::addScript('artcraft', 'editor/autosave');
Util::addScript('artcraft', 'editor/modals');
Util::addScript('artcraft', 'editor/bridge');
Util::addScript('artcraft', 'editor');
?>

<div id="artcraft-app"
     data-token="<?= p($_['token']) ?>"
     data-file-name="<?= p($_['fileName']) ?>"
     data-readonly="<?= $_['isReadOnly'] ? 'true' : 'false' ?>"
     data-is-public="true">

    <div id="artcraft-splash">
        <div class="splash-content">
            <div class="splash-logo">
                <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="24" fill="#0284c7"/>
                    <path d="M28 72L50 28L72 72H58L50 54L42 72H28Z" fill="white"/>
                </svg>
            </div>
            <h2>ArtCraft Public Viewer</h2>
            <p id="splash-status">Chargement du document partagé...</p>
            <div class="splash-progress-bar">
                <div id="splash-progress" class="splash-progress-fill" style="width: 40%;"></div>
            </div>
        </div>
    </div>

    <header class="artcraft-topbar">
        <div class="topbar-left">
            <div class="brand-badge">
                <span class="brand-title">ArtCraft</span>
            </div>
            <span class="public-filename"><?= p($_['fileName']) ?></span>
            <div class="status-indicator" id="status-indicator">
                <span class="status-icon" id="status-icon">
                    <svg class="ui-icon status-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span class="status-text" id="status-text">Prêt</span>
            </div>
        </div>

        <div class="topbar-right">
            <?php if ($_['isReadOnly']): ?>
                <div class="readonly-badge">
                    <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    Consultation uniquement
                </div>
            <?php else: ?>
                <div class="readonly-badge" style="background: rgba(34, 197, 94, 0.15); color: #16a34a;">
                    <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    Édition autorisée
                </div>
            <?php endif; ?>

            <button id="btn-fullscreen" class="topbar-btn" title="Plein écran">
                <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
        </div>
    </header>

    <main class="artcraft-workspace">
        <div id="viewport-container" class="viewport-container">
            <div id="canvas-wrapper" class="canvas-wrapper">
                <canvas id="artcraft-canvas" width="1920" height="1080"></canvas>
            </div>
        </div>
    </main>
</div>
