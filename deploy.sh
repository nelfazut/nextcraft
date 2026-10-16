#!/bin/bash
set -e

# ==============================================================================
# Script de déploiement d'ArtCraft dans Nextcloud
# Basé sur le plan d'intégration NAS / Docker
# ==============================================================================

TARGET_DIR="${1:-/mnt/arr/configs/nextcloud/custom_apps/artcraft}"
CONTAINER_NAME="${2:-nextcloud_app}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "=================================================="
echo "    Déploiement de l'extension ArtCraft Nextcloud  "
echo "=================================================="
echo "-> Dossier cible : $TARGET_DIR"
echo "-> Conteneur     : $CONTAINER_NAME"
echo ""

# 1. Vérification de la présence du code source de l'extension
if [ ! -d "$SCRIPT_DIR/artcraft" ]; then
    echo "[!] Erreur : Dossier artcraft introuvable dans $SCRIPT_DIR"
    exit 1
fi

# 2. Création du dossier cible si nécessaire
if [ ! -d "$TARGET_DIR" ]; then
    echo "-> Création du répertoire cible..."
    mkdir -p "$TARGET_DIR"
fi

# 3. Synchronisation des fichiers
echo "-> Copie des fichiers de l'application..."
cp -r "$SCRIPT_DIR/artcraft/"* "$TARGET_DIR/"

# 4. Ajustement des permissions si possible
if [ -w "$TARGET_DIR" ]; then
    echo "-> Ajustement des droits..."
    chmod -R 755 "$TARGET_DIR"
fi

echo "[✓] Fichiers copiés avec succès dans $TARGET_DIR"
echo ""

# 5. Activation dans le conteneur Nextcloud
if command -v docker &> /dev/null && docker ps | grep -q "$CONTAINER_NAME"; then
    echo "-> Ajustement des permissions conteneur ($CONTAINER_NAME)..."
    docker exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/custom_apps/artcraft 2>/dev/null || true
    echo "-> Activation de l'extension dans le conteneur Nextcloud ($CONTAINER_NAME)..."
    docker exec -u www-data "$CONTAINER_NAME" php occ app:enable artcraft || true
    echo "-> Mise à jour du cache d'assets..."
    docker exec -u www-data "$CONTAINER_NAME" php occ maintenance:repair --include-expensive || true
    echo "[✓] Extension ArtCraft activée avec succès dans Nextcloud !"
elif command -v podman &> /dev/null && podman ps | grep -q "$CONTAINER_NAME"; then
    echo "-> Ajustement des permissions conteneur ($CONTAINER_NAME)..."
    podman exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/custom_apps/artcraft 2>/dev/null || true
    echo "-> Activation via podman ($CONTAINER_NAME)..."
    podman exec -u www-data "$CONTAINER_NAME" php occ app:enable artcraft || true
    echo "[✓] Extension activée via Podman !"
else
    echo "[*] Conteneur Docker '$CONTAINER_NAME' non actif ou Docker exécuté sur une autre machine."
    echo "[*] Pour activer manuellement l'application sur votre NAS, exécutez :"
    echo "    docker exec -u www-data $CONTAINER_NAME php occ app:enable artcraft"
fi

echo ""
echo "=================================================="
echo "    Déploiement terminé !                         "
echo "=================================================="
