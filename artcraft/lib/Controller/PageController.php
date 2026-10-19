<?php

declare(strict_types=1);

namespace OCA\ArtCraft\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

class PageController extends Controller {
    private EditorController $editorController;

    public function __construct(
        string $appName,
        IRequest $request,
        EditorController $editorController
    ) {
        parent::__construct($appName, $request);
        $this->editorController = $editorController;
    }

    /**
     * Point d'entrée principal pour l'application dans la barre de navigation Nextcloud.
     * Ouvre PhotoCraft en mode studio autonome avec un projet vierge.
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        return $this->editorController->index(null, '/');
    }
}
