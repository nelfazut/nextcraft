<?php
/** @var array $_ */
?>
<link rel="stylesheet" href="<?= p($_['cssUrl']) ?>?v=<?= time() ?>">
<div id="artcraft-app"
     data-file-id="<?= (int)$_['fileId'] ?>"
     data-file-name="<?= p($_['fileName']) ?>"
     data-app-type="photocraft"
     data-app-title="PhotoCraft"
     data-dir="<?= p($_['dir']) ?>"
     data-readonly="<?= $_['isReadOnly'] ? 'true' : 'false' ?>"
     data-locked-by="<?= p($_['lockedBy']) ?>"
     data-user-id="<?= p($_['userId']) ?>">

    <!-- Splash Screen de chargement Wasm -->
    <div id="artcraft-splash">
        <div class="splash-content">
            <div class="splash-logo">
                <img src="<?= p($_['appLogo']) ?>" width="64" height="64" alt="PhotoCraft" />
            </div>
            <h2>PhotoCraft</h2>
            <p id="splash-status">Initialisation du studio créatif...</p>
            <div class="splash-progress-bar">
                <div id="splash-progress" class="splash-progress-fill" style="width: 25%;"></div>
            </div>
            <span id="splash-percent">25%</span>
        </div>
    </div>

    <!-- Zone Principale : PhotoCraft Studio Wasm plein écran -->
    <main class="artcraft-workspace">
        <div id="photocraft-studio-container" class="studio-container">
            <iframe id="photocraft-iframe"
                    src="<?= p($_['studioUrl']) ?>?v=<?= p($_['version']) ?>"
                    title="PhotoCraft Studio Wasm"
                    allow="fullscreen; clipboard-read; clipboard-write"
                    allowfullscreen>
            </iframe>
        </div>
    </main>

    <!-- Modal d'insertion d'Images (Place Embedded) -->
    <div id="asset-picker-modal" class="modal-overlay hidden">
        <div class="modal-window">
            <div class="modal-header">
                <h3>Insérer un média</h3>
                <button id="btn-close-modal" class="modal-close-btn" title="Fermer">
                    <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="import-mode-selector">
                    <span class="mode-selector-title">Comportement d'ouverture :</span>
                    <div class="mode-options-grid">
                        <label class="mode-option active" data-mode="layer">
                            <input type="radio" name="import-mode" value="layer" checked class="hidden-radio" />
                            <div class="mode-icon">
                                <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
                            </div>
                            <div class="mode-text">
                                <strong>Nouveau calque</strong>
                                <span>Ajouter à la composition actuelle</span>
                            </div>
                        </label>
                        <label class="mode-option" data-mode="tab">
                            <input type="radio" name="import-mode" value="tab" class="hidden-radio" />
                            <div class="mode-icon">
                                <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/></svg>
                            </div>
                            <div class="mode-text">
                                <strong>Nouvel onglet</strong>
                                <span>Ouvrir en document séparé</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="modal-choice-grid">
                    <label class="choice-card">
                        <input type="file" id="local-file-input" accept="image/*" class="hidden-file-input" />
                        <div class="choice-icon">
                            <svg class="ui-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                        </div>
                        <h4>Depuis mon appareil</h4>
                        <p>Glissez ou parcourez une image locale</p>
                    </label>
                    <button id="btn-pick-from-nas" class="choice-card">
                        <div class="choice-icon">
                            <svg class="ui-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                        </div>
                        <h4>Depuis Nextcloud</h4>
                        <p>Sélectionner une image présente sur vos fichiers</p>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal "Ouvrir un document dans un nouvel onglet" (File -> Open / Ctrl+O) -->
    <div id="open-document-modal" class="modal-overlay hidden">
        <div class="modal-window">
            <div class="modal-header">
                <div class="modal-title-with-icon">
                    <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <h3>Ouvrir un document dans un nouvel onglet</h3>
                </div>
                <button id="btn-close-open-modal" class="modal-close-btn" title="Fermer">
                    <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-choice-grid">
                    <button id="btn-open-from-nas" class="choice-card">
                        <div class="choice-icon">
                            <svg class="ui-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                        </div>
                        <h4>Depuis Nextcloud</h4>
                        <p>Ouvrir un projet .craft, .psd ou une image (sauvegarde automatique en direct)</p>
                    </button>
                    <label class="choice-card">
                        <input type="file" id="local-open-file-input" accept=".craft,.psd,.png,.jpg,.jpeg,.webp,.svg,.bmp" class="hidden-file-input" />
                        <div class="choice-icon">
                            <svg class="ui-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                        </div>
                        <h4>Depuis mon appareil</h4>
                        <p>Ouvrir un fichier local depuis votre ordinateur</p>
                    </label>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal "Propriétés / Renommer le document" (File -> File Info... / Ctrl+Alt+Shift+I) -->
    <div id="file-info-modal" class="modal-overlay hidden">
        <div class="modal-window file-info-window" style="max-width: 440px;">
            <div class="modal-header">
                <div class="modal-title-with-icon">
                    <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <h3>Propriétés du document</h3>
                </div>
                <button id="btn-close-file-info-modal" class="modal-close-btn" title="Fermer">
                    <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="save-as-form">
                    <label for="file-info-rename-input" class="form-label">Nom du document :</label>
                    <input type="text" id="file-info-rename-input" class="modal-input" value="<?= p($_['fileName']) ?>" />

                    <div class="save-as-folder-info" style="margin-top: 12px;">
                        <span class="folder-label">Dossier Nextcloud :</span>
                        <span class="folder-path"><?= p($_['dir'] ?: '/') ?></span>
                    </div>
                    <div class="save-as-folder-info" style="margin-top: 6px;">
                        <span class="folder-label">Identifiant :</span>
                        <span class="folder-path"><?= (int)$_['fileId'] ?></span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="btn-cancel-file-info" class="modal-btn secondary">Fermer</button>
                <button id="btn-confirm-file-rename" class="modal-btn primary">
                    <span>Renommer</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal "Quitter l'éditeur" (File -> Exit / Ctrl+Q) -->
    <div id="exit-confirm-modal" class="modal-overlay hidden">
        <div class="modal-window" style="max-width: 420px;">
            <div class="modal-header">
                <div class="modal-title-with-icon">
                    <svg class="ui-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <h3>Quitter PhotoCraft</h3>
                </div>
                <button id="btn-close-exit-modal" class="modal-close-btn" title="Fermer">
                    <svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <p style="color: #e6e6e6; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
                    Voulez-vous enregistrer vos modifications avant de retourner à vos fichiers Nextcloud ?
                </p>
                <p style="color: #999999; font-size: 11px;">
                    Vos modifications en cours seront synchronisées sur votre NAS.
                </p>
            </div>
            <div class="modal-footer">
                <button id="btn-exit-without-save" class="modal-btn secondary">Quitter sans enregistrer</button>
                <button id="btn-exit-save-and-close" class="modal-btn primary">
                    <span>Enregistrer et quitter</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <div id="artcraft-toast" class="toast hidden"></div>
</div>
