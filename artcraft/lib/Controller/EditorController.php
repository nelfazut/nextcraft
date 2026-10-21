<?php

namespace OCA\ArtCraft\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\Files\IRootFolder;
use OCA\ArtCraft\Service\LockService;

class EditorController extends Controller {
    private ?string $userId;
    private IRootFolder $rootFolder;
    private LockService $lockService;

    public function __construct(
        string $appName,
        IRequest $request,
        IUserSession $userSession,
        IRootFolder $rootFolder,
        LockService $lockService
    ) {
        parent::__construct($appName, $request);
        $user = $userSession->getUser();
        $this->userId = $user ? $user->getUID() : null;
        $this->rootFolder = $rootFolder;
        $this->lockService = $lockService;
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(?int $fileId = null, string $dir = '/'): TemplateResponse {
        if ($this->userId === null) {
            return new TemplateResponse('core', '403', [], 'guest');
        }

        try {
            $urlGenerator = \OC::$server->get(\OCP\IURLGenerator::class);
            $appType = 'photocraft';
            $appTitle = 'PhotoCraft';
            $appLogo = $urlGenerator->imagePath($this->appName, 'photocraft.svg');

            if ($fileId === null || $fileId <= 0) {
                // Mode Studio Autonome (ouverture sans fichier préchargé)
                $l = \OC::$server->getL10N($this->appName);
                $fileName = $l->t('PhotoCraft Project') . '.craft';
                $canWrite = true;
                $isReadOnly = false;
                $userFolderRelativePath = $dir ?: '/';
                $fileSize = 0;
                $effectiveFileId = 0;
                $lockInfo = ['lockedBy' => $this->userId, 'readOnly' => false];
            } else {
                $userFolder = $this->rootFolder->getUserFolder($this->userId);
                $files = $userFolder->getById($fileId);

                if (empty($files)) {
                    return new TemplateResponse($this->appName, 'error', ['message' => 'Fichier introuvable'], 'blank');
                }

                /** @var \OCP\Files\File $file */
                $file = $files[0];
                $fileName = $file->getName();
                $canWrite = ($file->getPermissions() & \OCP\Constants::PERMISSION_UPDATE) !== 0;
                $userFolderRelativePath = $userFolder->getRelativePath($file->getPath());
                $fileSize = $file->getSize();
                $effectiveFileId = $fileId;

                // Gestion du verrou exclusif
                $lockInfo = $this->lockService->acquireLock($fileId, $this->userId, $this->userId);
                $isReadOnly = !$canWrite || ($lockInfo['readOnly'] ?? false);
            }

            \OCP\Util::addStyle($this->appName, 'editor');
            \OCP\Util::addScript($this->appName, 'editor/ui');
            \OCP\Util::addScript($this->appName, 'editor/state');
            \OCP\Util::addScript($this->appName, 'editor/autosave');
            \OCP\Util::addScript($this->appName, 'editor/modals');
            \OCP\Util::addScript($this->appName, 'editor/bridge');
            \OCP\Util::addScript($this->appName, 'editor');

            $params = [
                'fileId' => $effectiveFileId,
                'fileName' => $fileName,
                'filePath' => $userFolderRelativePath,
                'fileSize' => $fileSize,
                'dir' => $dir,
                'userId' => $this->userId,
                'isReadOnly' => $isReadOnly,
                'lockedBy' => $lockInfo['lockedBy'] ?? $this->userId,
                'canWrite' => $canWrite,
                'appType' => $appType,
                'appTitle' => $appTitle,
                'appLogo' => $appLogo,
                'version' => '1.1.0',
                'cssUrl' => $urlGenerator->linkTo($this->appName, 'css/editor.css'),
                'jsUrl' => $urlGenerator->linkTo($this->appName, 'js/editor.js'),
                'studioUrl' => $urlGenerator->linkTo($this->appName, 'web/index.html'),
                'cspNonce' => \OC::$server->get(\OC\Security\CSP\ContentSecurityPolicyNonceManager::class)->getNonce()
            ];

            $response = new TemplateResponse($this->appName, 'editor', $params, 'user');

            $csp = new ContentSecurityPolicy();
            $csp->addAllowedScriptDomain("'self'");
            $csp->addAllowedScriptDomain("'unsafe-inline'");
            $csp->addAllowedScriptDomain("'unsafe-eval'");
            $csp->addAllowedScriptDomain("'wasm-unsafe-eval'");
            if (method_exists($csp, 'addAllowedWorkerSrcDomain')) {
                $csp->addAllowedWorkerSrcDomain("'self'");
                $csp->addAllowedWorkerSrcDomain("blob:");
            }
            $csp->addAllowedImageDomain("'self'");
            $csp->addAllowedImageDomain("data:");
            $csp->addAllowedImageDomain("blob:");
            $csp->addAllowedMediaDomain("blob:");
            $csp->addAllowedConnectDomain("'self'");
            $csp->addAllowedFrameDomain("'self'");
            $response->setContentSecurityPolicy($csp);

            return $response;
        } catch (\Exception $e) {
            return new TemplateResponse($this->appName, 'error', ['message' => $e->getMessage()], 'user');
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     * @PublicPage
     */
    public function studio(): DataResponse {
        $appPath = dirname(__DIR__, 2);
        $htmlPath = $appPath . '/web/index.html';
        if (!file_exists($htmlPath)) {
            return new DataResponse('PhotoCraft Studio non disponible', 404);
        }

        $content = file_get_contents($htmlPath);
        $baseUrl = \OC::$WEBROOT . '/apps/' . $this->appName . '/web/';
        $content = str_replace('./photocraft-web-', $baseUrl . 'photocraft-web-', $content);

        $response = new DataResponse($content, 200, ['Content-Type' => 'text/html; charset=utf-8']);
        $csp = new ContentSecurityPolicy();
        $csp->addAllowedScriptDomain("'self'");
        $csp->addAllowedScriptDomain("'unsafe-eval'");
        $csp->addAllowedScriptDomain("'unsafe-inline'");
        $csp->addAllowedScriptDomain("'wasm-unsafe-eval'");
        if (method_exists($csp, 'addAllowedWorkerSrcDomain')) {
            $csp->addAllowedWorkerSrcDomain("'self'");
            $csp->addAllowedWorkerSrcDomain("blob:");
        }
        $csp->addAllowedImageDomain("'self'");
        $csp->addAllowedImageDomain("data:");
        $csp->addAllowedImageDomain("blob:");
        $csp->addAllowedMediaDomain("blob:");
        $csp->addAllowedConnectDomain("'self'");
        $csp->addAllowedFrameDomain("'self'");
        $response->setContentSecurityPolicy($csp);
        return $response;
    }
}
