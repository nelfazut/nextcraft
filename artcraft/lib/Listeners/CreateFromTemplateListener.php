<?php

namespace OCA\ArtCraft\Listeners;

use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Files\Template\FileCreatedFromTemplateEvent;

class CreateFromTemplateListener implements IEventListener {
    public function handle(Event $event): void {
        if (!$event instanceof FileCreatedFromTemplateEvent) {
            return;
        }

        $targetFile = $event->getTarget();
        if ($targetFile === null) {
            return;
        }

        $fileName = $targetFile->getName();
        $baseName = pathinfo($fileName, PATHINFO_FILENAME);
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($ext === 'craft' || $ext === 'art' || $ext === 'photo' || $ext === 'psd') {
            if (extension_loaded('gd')) {
                $im = imagecreatetruecolor(1920, 1080);
                $white = imagecolorallocate($im, 255, 255, 255);
                imagefilledrectangle($im, 0, 0, 1920, 1080, $white);
                ob_start();
                imagepng($im);
                $pngData = ob_get_clean();
                $targetFile->putContent($pngData);
            }
        }
    }
}
