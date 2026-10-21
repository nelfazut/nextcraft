<?php
/** @var array $_ */
use OCP\Util;

$l = \OC::$server->getL10N('artcraft');

Util::addStyle('artcraft', 'editor');
Util::addScript('artcraft', 'editor/ui');
Util::addScript('artcraft', 'editor/state');
Util::addScript('artcraft', 'editor/autosave');
Util::addScript('artcraft', 'editor/modals');
Util::addScript('artcraft', 'editor/bridge');
Util::addScript('artcraft', 'editor');
?>
<link rel="stylesheet" href="<?= p($_['cssUrl']) ?>?v=<?= time() ?>">
<div id="artcraft-app"
     data-file-id="0"
     data-token="<?= p($_['token']) ?>"
     data-file-name="<?= p($_['fileName']) ?>"
     data-readonly="<?= $_['isReadOnly'] ? 'true' : 'false' ?>"
     data-is-public="true">

    <!-- Splash Screen de chargement Wasm -->
    <div id="artcraft-splash">
        <div class="splash-content">
            <div class="splash-logo">
                <img src="<?= p($_['appLogo']) ?>" width="64" height="64" alt="PhotoCraft" />
            </div>
            <h2>PhotoCraft</h2>
            <p id="splash-status"><?= p($l->t('Initializing creative studio...')) ?></p>
            <div class="splash-progress-bar">
                <div id="splash-progress" class="splash-progress-fill" style="width: 25%;"></div>
            </div>
            <span id="splash-percent">25%</span>
        </div>
    </div>

    <!-- Barre supérieure de partage public -->
    <header class="artcraft-topbar">
        <div class="topbar-left">
            <div class="brand-badge">
                <span class="brand-title">PhotoCraft</span>
            </div>
            <span class="public-filename"><?= p($_['fileName']) ?></span>
            <div class="status-indicator" id="status-indicator">
                <span class="status-icon" id="status-icon">
                    <svg class="ui-icon status-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span class="status-text" id="status-text"><?= p($l->t('Ready')) ?></span>
            </div>
        </div>

        <div class="topbar-right">
            <?php if ($_['isReadOnly']): ?>
                <div class="readonly-badge">
                    <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                    <?= p($l->t('View only')) ?>
                </div>
            <?php else: ?>
                <div class="readonly-badge" style="background: rgba(34, 197, 94, 0.15); color: #16a34a;">
                    <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    <?= p($l->t('Editing allowed')) ?>
                </div>
            <?php endif; ?>

            <button id="btn-fullscreen" class="topbar-btn" title="<?= p($l->t('Fullscreen')) ?>">
                <svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
        </div>
    </header>

    <!-- Zone Principale : PhotoCraft Studio Wasm plein écran -->
    <main class="artcraft-workspace">
        <div id="photocraft-studio-container" class="studio-container">
            <iframe id="photocraft-iframe"
                    src="<?= p($_['studioUrl']) ?>?v=<?= p($_['version']) ?>"
                    title="<?= p($l->t('PhotoCraft Studio Wasm')) ?>"
                    allow="fullscreen; clipboard-read; clipboard-write"
                    allowfullscreen>
            </iframe>
        </div>
    </main>

    <!-- Notification Toast -->
    <div id="artcraft-toast" class="toast hidden"></div>
</div>
