<?php

namespace OCA\ArtCraft\Listeners;

use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Files\Template\RegisterTemplateCreatorEvent;
use OCP\Files\Template\TemplateFileCreator;
use OCA\ArtCraft\AppInfo\Application;

class RegisterTemplateFileCreatorListener implements IEventListener {
    public function handle(Event $event): void {
        if (!$event instanceof RegisterTemplateCreatorEvent) {
            return;
        }

        $templateManager = $event->getTemplateManager();
        $imgDir = dirname(__DIR__, 2) . '/img';

        // Projet PhotoCraft (.craft)
        $templateManager->registerTemplateFileCreator(function () use ($imgDir): TemplateFileCreator {
            $creator = new TemplateFileCreator(Application::APP_ID, 'Projet PhotoCraft', '.craft');
            $creator->addMimetype('application/x-photocraft');
            $creator->addMimetype('application/x-artcraft');
            $creator->addMimetype('application/x-craft');
            $svgPath = $imgDir . '/photocraft.svg';
            if (file_exists($svgPath)) {
                $creator->setIconSvgInline(file_get_contents($svgPath));
            }
            return $creator;
        });
    }
}
