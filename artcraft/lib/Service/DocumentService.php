<?php

namespace OCA\ArtCraft\Service;

use OCP\Files\IRootFolder;
use OCP\Files\File;
use OCP\Files\Folder;

class DocumentService {
    private IRootFolder $rootFolder;

    public function __construct(IRootFolder $rootFolder) {
        $this->rootFolder = $rootFolder;
    }

    public function getFileById(?string $userId, int $fileId): ?File {
        if ($userId === null) {
            return null;
        }
        $userFolder = $this->rootFolder->getUserFolder($userId);
        $files = $userFolder->getById($fileId);
        if (empty($files) || !($files[0] instanceof File)) {
            return null;
        }
        return $files[0];
    }

    /**
     * Crée un nouveau document de projet (.craft) vierge
     */
    public function create(string $userId, string $dir = '/', string $name = 'Nouveau Projet.craft'): array {
        $userFolder = $this->rootFolder->getUserFolder($userId);
        $targetFolder = $userFolder->get($dir);
        if (!($targetFolder instanceof Folder)) {
            $targetFolder = $userFolder;
        }

        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (empty($ext)) {
            $ext = 'craft';
            $name .= '.craft';
        }

        // Génère un nom unique si le fichier existe déjà
        $baseName = pathinfo($name, PATHINFO_FILENAME);
        $counter = 1;
        $finalName = $name;
        while ($targetFolder->nodeExists($finalName)) {
            $finalName = "{$baseName} ({$counter}).{$ext}";
            $counter++;
        }

        // Toile blanche par défaut 1920x1080 (PNG/CRAFT binary payload)
        $binaryPayload = '';
        if (extension_loaded('gd')) {
            $im = imagecreatetruecolor(1920, 1080);
            $white = imagecolorallocate($im, 255, 255, 255);
            imagefilledrectangle($im, 0, 0, 1920, 1080, $white);
            ob_start();
            imagepng($im);
            $binaryPayload = ob_get_clean();
        }

        $file = $targetFolder->newFile($finalName, $binaryPayload);

        return [
            'success' => true,
            'fileId' => $file->getId(),
            'name' => $file->getName(),
            'path' => $userFolder->getRelativePath($file->getPath())
        ];
    }

    /**
     * Récupère le contenu et les métadonnées d'un document
     */
    public function load(?string $userId, int $fileId): array {
        $file = $this->getFileById($userId, $fileId);
        if (!$file) {
            throw new \RuntimeException('Fichier introuvable', 404);
        }

        return [
            'file' => $file,
            'content' => $file->getContent(),
            'name' => $file->getName(),
            'mimetype' => 'application/x-artcraft'
        ];
    }

    /**
     * Valide et enregistre le contenu d'un document existant
     */
    public function save(File $file, string $body): array {
        if (empty($body)) {
            throw new \InvalidArgumentException('Contenu vide', 400);
        }

        // putContent dans Nextcloud déclenche automatiquement le versioning
        $file->putContent($body);

        return [
            'success' => true,
            'fileId' => $file->getId(),
            'size' => $file->getSize(),
            'mtime' => $file->getMTime()
        ];
    }

    /**
     * Enregistre une copie du document sous un nouveau nom / dossier
     */
    public function saveAs(string $userId, string $dir, string $name, string $body): array {
        if (empty($body)) {
            throw new \InvalidArgumentException('Contenu vide', 400);
        }

        $userFolder = $this->rootFolder->getUserFolder($userId);
        $targetFolder = $userFolder->get($dir);
        if (!($targetFolder instanceof Folder)) {
            $targetFolder = $userFolder;
        }

        $name = trim($name);
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (empty($ext)) {
            $ext = 'craft';
            $name .= '.craft';
        }

        $baseName = pathinfo($name, PATHINFO_FILENAME);
        $counter = 1;
        $finalName = $name;
        while ($targetFolder->nodeExists($finalName)) {
            $finalName = "{$baseName} ({$counter}).{$ext}";
            $counter++;
        }

        $file = $targetFolder->newFile($finalName, $body);

        return [
            'success' => true,
            'fileId' => $file->getId(),
            'name' => $file->getName(),
            'path' => $userFolder->getRelativePath($file->getPath())
        ];
    }

    /**
     * Renomme un fichier
     */
    public function rename(?string $userId, int $fileId, string $newName): array {
        $file = $this->getFileById($userId, $fileId);
        if (!$file) {
            throw new \RuntimeException('Fichier introuvable', 404);
        }

        $newName = trim($newName);
        if (empty($newName)) {
            throw new \InvalidArgumentException('Nom de fichier invalide', 400);
        }

        // Préservation de l'extension si omise
        $ext = pathinfo($file->getName(), PATHINFO_EXTENSION);
        if (!str_ends_with($newName, '.' . $ext)) {
            $newName .= '.' . $ext;
        }

        $parent = $file->getParent();
        $targetPath = $parent->getPath() . '/' . $newName;
        $file->move($targetPath);

        return [
            'success' => true,
            'newName' => $file->getName()
        ];
    }

    /**
     * Récupère les métadonnées d'un fichier par son chemin
     */
    public function fileInfo(string $userId, string $path): array {
        $cleanPath = ltrim(trim($path), '/');
        if (empty($cleanPath)) {
            throw new \InvalidArgumentException('Chemin manquant', 400);
        }

        $userFolder = $this->rootFolder->getUserFolder($userId);
        $node = $userFolder->get($cleanPath);
        if (!($node instanceof File)) {
            throw new \RuntimeException('Fichier introuvable', 404);
        }

        return [
            'success' => true,
            'fileId' => $node->getId(),
            'name' => $node->getName(),
            'path' => '/' . $cleanPath,
            'size' => $node->getSize(),
            'mimetype' => $node->getMimetype()
        ];
    }
}
