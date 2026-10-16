#!/bin/bash
set -e

# ==============================================================================
# Script de déploiement automatique de PhotoCraft (ArtCraft) dans Nextcloud
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
APP_ID="artcraft"

# Affichage de l'aide
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: ./deploy.sh [TARGET_DIR] [CONTAINER_NAME]"
    echo ""
    echo "Arguments:"
    echo "  TARGET_DIR      Dossier cible (ex: /mnt/nextcloud/custom_apps/artcraft ou /mnt/nextcloud/custom_apps)"
    echo "  CONTAINER_NAME  Nom du conteneur Docker/Podman (défaut: nextcloud_app ou détection auto)"
    echo ""
    echo "Exemples:"
    echo "  ./deploy.sh"
    echo "  ./deploy.sh /mnt/arr/configs/nextcloud/custom_apps"
    echo "  ./deploy.sh /mnt/arr/configs/nextcloud/custom_apps/artcraft nextcloud_app"
    exit 0
fi

# 1. Normalisation automatique du dossier cible (évite tout conflit de nom)
RAW_TARGET="${1:-/mnt/arr/configs/nextcloud/custom_apps/artcraft}"
RAW_TARGET="${RAW_TARGET%/}"
DIR_BASENAME="$(basename "$RAW_TARGET")"
PARENT_DIR="$(dirname "$RAW_TARGET")"

if [ "$DIR_BASENAME" = "custom_apps" ] || [ "$DIR_BASENAME" = "apps" ]; then
    echo "[i] Le chemin spécifié pointe vers la racine des applications ('$RAW_TARGET')."
    echo "    Déploiement automatique dans le sous-dossier requis : '$RAW_TARGET/$APP_ID'"
    TARGET_DIR="$RAW_TARGET/$APP_ID"
elif [ "$DIR_BASENAME" = "nextcraft" ]; then
    echo "[!] Attention : Le dépôt se nomme 'nextcraft', mais Nextcloud exige impérativement que le dossier porte l'identifiant technique ('$APP_ID')."
    echo "    Correction automatique du dossier cible : '$PARENT_DIR/$APP_ID'"
    # Nettoyage automatique du dossier obsolète nextcraft s'il existe
    if [ -d "$RAW_TARGET" ]; then
        echo "    Nettoyage du dossier obsolète '$RAW_TARGET' pour éviter tout conflit..."
        rm -rf "$RAW_TARGET"
    fi
    TARGET_DIR="$PARENT_DIR/$APP_ID"
else
    TARGET_DIR="$RAW_TARGET"
fi

# Nettoyage de sécurité si un dossier 'nextcraft' orphelin subsiste à côté d'artcraft
POSSIBLE_CONFLICT="$(dirname "$TARGET_DIR")/nextcraft"
if [ -d "$POSSIBLE_CONFLICT" ] && [ "$POSSIBLE_CONFLICT" != "$TARGET_DIR" ]; then
    echo "-> Suppression du dossier orphelin '$POSSIBLE_CONFLICT' pour éviter tout conflit d'ID Nextcloud..."
    rm -rf "$POSSIBLE_CONFLICT"
fi

# 2. Détection du conteneur Docker / Podman
CONTAINER_NAME="$2"
ENGINE=""

if command -v docker &>/dev/null; then
    ENGINE="docker"
elif command -v podman &>/dev/null; then
    ENGINE="podman"
fi

if [ -z "$CONTAINER_NAME" ] && [ -n "$ENGINE" ]; then
    DETECTED_CONTAINER="$($ENGINE ps --format '{{.Names}}' 2>/dev/null | grep -E '^(nextcloud_app|nextcloud|nextcloud-app|nextcloud-demo)$' | head -n 1 || true)"
    if [ -n "$DETECTED_CONTAINER" ]; then
        CONTAINER_NAME="$DETECTED_CONTAINER"
    else
        CONTAINER_NAME="nextcloud_app"
    fi
else
    CONTAINER_NAME="${CONTAINER_NAME:-nextcloud_app}"
fi

echo "=================================================="
echo "    Déploiement de PhotoCraft dans Nextcloud      "
echo "=================================================="
echo "-> Dossier cible : $TARGET_DIR"
echo "-> Moteur        : ${ENGINE:-aucun (hôte pur)}"
echo "-> Conteneur     : $CONTAINER_NAME"
echo ""

# 3. Vérification de la présence du code source de l'extension
if [ ! -d "$SCRIPT_DIR/artcraft" ]; then
    echo "[!] Erreur : Dossier 'artcraft' introuvable dans $SCRIPT_DIR"
    exit 1
fi

# 4. Synchronisation des fichiers
echo "-> Préparation du dossier cible..."
mkdir -p "$TARGET_DIR"

echo "-> Copie des fichiers de l'application PhotoCraft..."
cp -r "$SCRIPT_DIR/artcraft/"* "$TARGET_DIR/"

if [ -w "$TARGET_DIR" ]; then
    echo "-> Ajustement des droits sur l'hôte (chmod 755)..."
    chmod -R 755 "$TARGET_DIR"
fi

echo "[✓] Fichiers installés avec succès dans $TARGET_DIR"
echo ""

# 5. Activation et nettoyage dans le conteneur Nextcloud
if [ -n "$ENGINE" ] && $ENGINE ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo "-> Nettoyage préventif des résidus 'nextcraft' dans le conteneur..."
    $ENGINE exec "$CONTAINER_NAME" rm -rf /var/www/html/custom_apps/nextcraft /var/www/html/apps/nextcraft 2>/dev/null || true
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:disable nextcraft 2>/dev/null || true

    echo "-> Ajustement des droits www-data dans le conteneur..."
    $ENGINE exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/custom_apps/$APP_ID 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/apps/$APP_ID 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" chmod -R 755 /var/www/html/custom_apps/$APP_ID 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" chmod -R 755 /var/www/html/apps/$APP_ID 2>/dev/null || true

    echo "-> Activation de l'extension dans Nextcloud ($APP_ID)..."
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:enable $APP_ID || true

    echo "-> Mise à jour du cache d'assets..."
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ maintenance:repair --include-expensive || true

    if $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:list 2>/dev/null | grep -q "$APP_ID"; then
        echo "[✓] Extension PhotoCraft ($APP_ID) activée et validée avec succès dans Nextcloud !"
    else
        echo "[!] Attention : Vérifiez l'état de l'application via : $ENGINE exec -u www-data $CONTAINER_NAME php occ app:list"
    fi
else
    echo "[*] Conteneur '$CONTAINER_NAME' non actif ou Docker exécuté sur une autre machine."
    echo "[*] Pour activer manuellement l'application :"
    echo "    docker exec -u www-data $CONTAINER_NAME php occ app:enable $APP_ID"
fi

echo ""
echo "=================================================="
echo "    Déploiement terminé avec succès !             "
echo "=================================================="
