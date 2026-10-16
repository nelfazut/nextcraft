<?php

namespace OCA\ArtCraft\Service;

use OCP\Files\File;

class ExportService {
    /**
     * Exporte un rendu (PNG, JPG, etc.) dans le même dossier que le fichier source
     */
    public function export(File $file, string $format, string $dataBase64): array {
        $format = strtolower($format ?: 'png');

        if (empty($dataBase64)) {
            throw new \InvalidArgumentException('Données d\'exportation manquantes', 400);
        }

        // Nettoyage du préfixe data:image/xxx;base64,
        if (str_contains($dataBase64, ',')) {
            $dataBase64 = explode(',', $dataBase64)[1];
        }

        $binaryData = base64_decode($dataBase64);
        if ($binaryData === false) {
            throw new \InvalidArgumentException('Décodage Base64 échoué', 400);
        }

        $parent = $file->getParent();
        $baseName = pathinfo($file->getName(), PATHINFO_FILENAME);
        $exportName = "{$baseName}.{$format}";

        $counter = 1;
        while ($parent->nodeExists($exportName)) {
            $exportName = "{$baseName}_{$counter}.{$format}";
            $counter++;
        }

        $exportedFile = $parent->newFile($exportName, $binaryData);

        return [
            'success' => true,
            'exportedName' => $exportedFile->getName(),
            'exportedFileId' => $exportedFile->getId()
        ];
    }
}
