<?php

namespace OCA\ArtCraft\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\DataDownloadResponse;
use OCP\IRequest;
use OCP\IUserSession;
use OCA\ArtCraft\Service\DocumentService;
use OCA\ArtCraft\Service\LockService;
use OCA\ArtCraft\Service\ExportService;

class ApiController extends Controller {
    private ?string $userId;
    private DocumentService $documentService;
    private LockService $lockService;
    private ExportService $exportService;

    public function __construct(
        string $appName,
        IRequest $request,
        IUserSession $userSession,
        DocumentService $documentService,
        LockService $lockService,
        ExportService $exportService
    ) {
        parent::__construct($appName, $request);
        $user = $userSession->getUser();
        $this->userId = $user ? $user->getUID() : null;
        $this->documentService = $documentService;
        $this->lockService = $lockService;
        $this->exportService = $exportService;
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function create(string $dir = '/', string $name = 'Nouveau Projet.craft'): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        try {
            $result = $this->documentService->create($this->userId, $dir, $name);
            return new JSONResponse($result);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function load(int $fileId) {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        try {
            $data = $this->documentService->load($this->userId, $fileId);
            $response = new DataDownloadResponse($data['content'], $data['name'], $data['mimetype']);
            $response->addHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return $response;
        } catch (\RuntimeException $e) {
            return new JSONResponse(['error' => $e->getMessage()], $e->getCode() ?: 404);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function save(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        $file = $this->documentService->getFileById($this->userId, $fileId);
        if (!$file) {
            return new JSONResponse(['error' => 'Fichier introuvable'], 404);
        }

        // Vérification des droits d'écriture
        if (($file->getPermissions() & \OCP\Constants::PERMISSION_UPDATE) === 0) {
            return new JSONResponse(['error' => 'Droits insuffisants (lecture seule)'], 403);
        }

        // Vérification du verrou exclusif
        $lockInfo = $this->lockService->acquireLock($fileId, $this->userId, $this->userId);
        if ($lockInfo['readOnly']) {
            return new JSONResponse([
                'error' => 'Le fichier est verrouillé par un autre utilisateur (' . $lockInfo['lockedBy'] . ')'
            ], 423);
        }

        try {
            $body = file_get_contents('php://input');
            $result = $this->documentService->save($file, $body);
            $this->lockService->refreshLock($fileId, $this->userId);
            return new JSONResponse($result);
        } catch (\InvalidArgumentException $e) {
            return new JSONResponse(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function saveAs(string $dir = '/', string $name = 'Projet.craft'): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        try {
            $dir = $this->request->getParam('dir', $dir) ?: '/';
            $name = $this->request->getParam('name', $name) ?: 'Projet.craft';
            $body = file_get_contents('php://input');

            $result = $this->documentService->saveAs($this->userId, $dir, $name, $body);
            return new JSONResponse($result);
        } catch (\InvalidArgumentException $e) {
            return new JSONResponse(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function rename(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        $newName = $this->request->getParam('newName', '');
        try {
            $result = $this->documentService->rename($this->userId, $fileId, $newName);
            return new JSONResponse($result);
        } catch (\InvalidArgumentException $e) {
            return new JSONResponse(['error' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JSONResponse(['error' => $e->getMessage()], $e->getCode() ?: 404);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function lock(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }
        $info = $this->lockService->acquireLock($fileId, $this->userId, $this->userId);
        return new JSONResponse($info);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function unlock(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }
        $success = $this->lockService->releaseLock($fileId, $this->userId);
        return new JSONResponse(['success' => $success]);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function heartbeat(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }
        $success = $this->lockService->refreshLock($fileId, $this->userId);
        return new JSONResponse(['success' => $success]);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function export(int $fileId): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        $file = $this->documentService->getFileById($this->userId, $fileId);
        if (!$file) {
            return new JSONResponse(['error' => 'Fichier introuvable'], 404);
        }

        $format = $this->request->getParam('format', 'png');
        $dataBase64 = $this->request->getParam('data', '');

        try {
            $result = $this->exportService->export($file, $format, $dataBase64);
            return new JSONResponse($result);
        } catch (\InvalidArgumentException $e) {
            return new JSONResponse(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function fileInfo(): JSONResponse {
        if ($this->userId === null) {
            return new JSONResponse(['error' => 'Non authentifié'], 401);
        }

        $path = $this->request->getParam('path', '');
        try {
            $result = $this->documentService->fileInfo($this->userId, $path);
            return new JSONResponse($result);
        } catch (\InvalidArgumentException $e) {
            return new JSONResponse(['error' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JSONResponse(['error' => $e->getMessage()], $e->getCode() ?: 404);
        } catch (\Exception $e) {
            return new JSONResponse(['error' => $e->getMessage()], 500);
        }
    }
}
