<?php

namespace OCA\ArtCraft\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\DataDownloadResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IRequest;
use OCP\Share\IShareManager;
use OCP\Share\IShare;
use OCP\Files\File;

class PublicPageController extends Controller {
    private IShareManager $shareManager;

    public function __construct(
        string $appName,
        IRequest $request,
        IShareManager $shareManager
    ) {
        parent::__construct($appName, $request);
        $this->shareManager = $shareManager;
    }

    private function getShareByToken(string $token): ?IShare {
        try {
            return $this->shareManager->getShareByToken($token);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * @PublicPage
     * @NoCSRFRequired
     */
    public function show(string $token): TemplateResponse {
        $share = $this->getShareByToken($token);
        if (!$share) {
            return new TemplateResponse($this->appName, 'error', ['message' => 'Lien de partage invalide ou expiré'], 'blank');
        }

        $node = $share->getNode();
        if (!($node instanceof File)) {
            return new TemplateResponse($this->appName, 'error', ['message' => 'Le partage n\'est pas un fichier'], 'blank');
        }

        $canWrite = ($share->getPermissions() & \OCP\Constants::PERMISSION_UPDATE) !== 0;

        $params = [
            'token' => $token,
            'fileName' => $node->getName(),
            'fileSize' => $node->getSize(),
            'isReadOnly' => !$canWrite,
            'canWrite' => $canWrite,
            'isPublic' => true,
            'version' => '1.0.0'
        ];

        $response = new TemplateResponse($this->appName, 'public', $params, 'blank');

        $csp = new ContentSecurityPolicy();
        $csp->addAllowedScriptDomain("'self'");
        $csp->addAllowedScriptDomain("'unsafe-eval'");
        $csp->addAllowedScriptDomain("'wasm-unsafe-eval'");
        $csp->addAllowedWorkerDomain("'self'");
        $csp->addAllowedWorkerDomain("blob:");
        $csp->addAllowedImageDomain("'self'");
        $csp->addAllowedImageDomain("data:");
        $csp->addAllowedImageDomain("blob:");
        $csp->addAllowedConnectDomain("'self'");
        $csp->addAllowedFrameDomain("'self'");
        $csp->addAllowedChildSrcDomain("'self'");
        $response->setContentSecurityPolicy($csp);

        return $response;
    }

    /**
     * @PublicPage
     * @NoCSRFRequired
     */
    public function load(string $token) {
        $share = $this->getShareByToken($token);
        if (!$share) {
            return new JSONResponse(['error' => 'Partage introuvable'], 404);
        }

        $node = $share->getNode();
        if (!($node instanceof File)) {
            return new JSONResponse(['error' => 'Type de nœud non supporté'], 400);
        }

        try {
            $content = $node->getContent();
            return new DataDownloadResponse($content, $node->getName(), 'application/x-artcraft');
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @PublicPage
     * @NoCSRFRequired
     */
    public function save(string $token): JSONResponse {
        $share = $this->getShareByToken($token);
        if (!$share) {
            return new JSONResponse(['error' => 'Partage introuvable'], 404);
        }

        if (($share->getPermissions() & \OCP\Constants::PERMISSION_UPDATE) === 0) {
            return new JSONResponse(['error' => 'Édition non autorisée sur ce lien'], 403);
        }

        $node = $share->getNode();
        if (!($node instanceof File)) {
            return new JSONResponse(['error' => 'Type de nœud non supporté'], 400);
        }

        try {
            $body = file_get_contents('php://input');
            if (empty($body)) {
                return new JSONResponse(['error' => 'Corps vide'], 400);
            }

            $node->putContent($body);

            return new JSONResponse([
                'success' => true,
                'size' => $node->getSize(),
                'mtime' => $node->getMTime()
            ]);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }
}
