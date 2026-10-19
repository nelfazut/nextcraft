<?php

declare(strict_types=1);

namespace OCA\ArtCraft\Listeners;

use OCA\ArtCraft\AppInfo\Application;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\INavigationManager;
use OCP\IURLGenerator;
use OCP\IUserSession;
use OCP\Navigation\Events\LoadAdditionalEntriesEvent;

/**
 * Enregistre PhotoCraft comme application principale dans la barre de navigation Nextcloud.
 *
 * @template-implements IEventListener<LoadAdditionalEntriesEvent>
 */
class LoadNavigationEntriesListener implements IEventListener {
    private INavigationManager $navigationManager;
    private IURLGenerator $urlGenerator;
    private IUserSession $userSession;

    public function __construct(
        INavigationManager $navigationManager,
        IURLGenerator $urlGenerator,
        IUserSession $userSession
    ) {
        $this->navigationManager = $navigationManager;
        $this->urlGenerator = $urlGenerator;
        $this->userSession = $userSession;
    }

    public function handle(Event $event): void {
        if (!$event instanceof LoadAdditionalEntriesEvent) {
            return;
        }

        if (!$this->userSession->isLoggedIn()) {
            return;
        }

        $entry = [
            'id' => Application::APP_ID,
            'app' => Application::APP_ID,
            'name' => 'PhotoCraft',
            'order' => 10,
            'href' => $this->urlGenerator->linkToRoute('artcraft.page.index'),
            'icon' => $this->urlGenerator->imagePath(Application::APP_ID, 'app.svg'),
            'type' => 'link',
        ];

        $this->navigationManager->add($entry);
    }
}
