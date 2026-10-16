<?php

namespace OCA\ArtCraft\Service;

use OCP\ICacheFactory;
use OCP\ICache;

class LockService {
    private const LOCK_TTL = 60; // 60 secondes sans heartbeat = expiration automatique
    private ICache $cache;

    public function __construct(ICacheFactory $cacheFactory) {
        $this->cache = $cacheFactory->createDistributed('artcraft_locks');
    }

    /**
     * Tente d'acquérir le verrou exclusif sur un fichier
     */
    public function acquireLock(int $fileId, string $userId, string $userName): array {
        $key = 'file_' . $fileId;
        $now = time();
        $existing = $this->cache->get($key);

        if ($existing !== null) {
            $lockData = json_decode($existing, true);
            if (is_array($lockData) && isset($lockData['userId'])) {
                // Si le verrou appartient au même utilisateur ou est expiré
                if ($lockData['userId'] === $userId || ($now > ($lockData['expiresAt'] ?? 0))) {
                    $this->setLock($key, $fileId, $userId, $userName);
                    return [
                        'locked' => true,
                        'lockedBy' => $userName,
                        'isOwner' => true,
                        'readOnly' => false
                    ];
                }

                // Verrouillé par un tiers
                return [
                    'locked' => true,
                    'lockedBy' => $lockData['userName'] ?? $lockData['userId'],
                    'isOwner' => false,
                    'readOnly' => true
                ];
            }
        }

        $this->setLock($key, $fileId, $userId, $userName);
        return [
            'locked' => true,
            'lockedBy' => $userName,
            'isOwner' => true,
            'readOnly' => false
        ];
    }

    /**
     * Rafraîchit le verrou si l'utilisateur en est le propriétaire
     */
    public function refreshLock(int $fileId, string $userId): bool {
        $key = 'file_' . $fileId;
        $existing = $this->cache->get($key);

        if ($existing !== null) {
            $lockData = json_decode($existing, true);
            if (is_array($lockData) && ($lockData['userId'] ?? '') === $userId) {
                $lockData['expiresAt'] = time() + self::LOCK_TTL;
                $this->cache->set($key, json_encode($lockData), self::LOCK_TTL);
                return true;
            }
        }
        return false;
    }

    /**
     * Libère le verrou
     */
    public function releaseLock(int $fileId, string $userId): bool {
        $key = 'file_' . $fileId;
        $existing = $this->cache->get($key);

        if ($existing !== null) {
            $lockData = json_decode($existing, true);
            if (is_array($lockData) && ($lockData['userId'] ?? '') === $userId) {
                $this->cache->remove($key);
                return true;
            }
        }
        return false;
    }

    private function setLock(string $key, int $fileId, string $userId, string $userName): void {
        $lockData = [
            'fileId' => $fileId,
            'userId' => $userId,
            'userName' => $userName,
            'lockedAt' => time(),
            'expiresAt' => time() + self::LOCK_TTL
        ];
        $this->cache->set($key, json_encode($lockData), self::LOCK_TTL);
    }
}
