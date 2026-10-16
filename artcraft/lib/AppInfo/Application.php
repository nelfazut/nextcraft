<?php

namespace OCA\ArtCraft\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Util;
use OCP\Files\Template\RegisterTemplateCreatorEvent;
use OCP\Files\Template\FileCreatedFromTemplateEvent;
use OCP\DirectEditing\RegisterDirectEditorEvent;
use OCA\ArtCraft\Listeners\RegisterTemplateFileCreatorListener;
use OCA\ArtCraft\Listeners\CreateFromTemplateListener;
use OCA\ArtCraft\Listeners\DirectEditorListener;

class Application extends App implements IBootstrap {
    public const APP_ID = 'artcraft';

    public function __construct(array $urlParams = []) {
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void {
        // Enregistrement natif des créateurs de modèles dans le menu "+" de Fichiers (avec icônes SVG)
        $context->registerEventListener(RegisterTemplateCreatorEvent::class, RegisterTemplateFileCreatorListener::class);
        $context->registerEventListener(FileCreatedFromTemplateEvent::class, CreateFromTemplateListener::class);

        // Enregistrement natif Direct Editor
        $context->registerEventListener(RegisterDirectEditorEvent::class, DirectEditorListener::class);
    }

    public function boot(IBootContext $context): void {
        // Script client pour Nextcloud Files
        Util::addScript(self::APP_ID, 'main');
    }
}
