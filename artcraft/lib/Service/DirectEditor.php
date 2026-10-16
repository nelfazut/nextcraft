<?php

namespace OCA\ArtCraft\Service;

use OCP\DirectEditing\IEditor;
use OCP\DirectEditing\IToken;
use OCP\AppFramework\Http\Response;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\IURLGenerator;

class DirectEditor implements IEditor {
    private string $appName;
    private IURLGenerator $urlGenerator;

    public function __construct(string $appName, IURLGenerator $urlGenerator) {
        $this->appName = $appName;
        $this->urlGenerator = $urlGenerator;
    }

    public function getId(): string {
        return $this->appName;
    }

    public function getName(): string {
        return 'PhotoCraft';
    }

    public function getMimetypes(): array {
        return [
            'application/x-photocraft',
            'application/x-artcraft',
            'application/x-craft',
            'image/vnd.adobe.photoshop',
            'image/x-photoshop'
        ];
    }

    public function getMimetypesOptional(): array {
        return [
            'image/png',
            'image/jpeg',
            'image/webp',
            'image/gif',
            'image/svg+xml',
            'image/bmp',
            'image/tiff',
            'image/x-icon',
            'image/vnd.microsoft.icon',
            'image/heic',
            'image/avif'
        ];
    }

    public function getCreators(): array {
        return [];
    }

    public function isSecure(): bool {
        return true;
    }

    public function open(IToken $token): Response {
        $token->useTokenScope();
        $file = $token->getFile();
        $url = $this->urlGenerator->linkToRoute('artcraft.editor.index', [
            'fileId' => $file->getId()
        ]);
        return new RedirectResponse($url);
    }
}
