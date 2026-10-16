<?php

namespace OCA\ArtCraft\Listeners;

use OCA\ArtCraft\Service\DirectEditor;
use OCP\DirectEditing\RegisterDirectEditorEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;

class DirectEditorListener implements IEventListener {
    private DirectEditor $editor;

    public function __construct(DirectEditor $editor) {
        $this->editor = $editor;
    }

    public function handle(Event $event): void {
        if (!$event instanceof RegisterDirectEditorEvent) {
            return;
        }
        $event->register($this->editor);
    }
}
