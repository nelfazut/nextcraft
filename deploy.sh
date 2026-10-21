#!/bin/bash
set -e

# ==============================================================================
# Script de déploiement et de mise à jour automatique de PhotoCraft (ArtCraft)
# dans Nextcloud (support conteneur Docker / Podman et hôte natif)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
APP_ID="artcraft"
DO_PULL=false

# 1. Analyse des paramètres et options
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            echo "Usage: ./deploy.sh [OPTIONS] [TARGET_DIR] [CONTAINER_NAME]"
            echo ""
            echo "Options:"
            echo "  -p, --pull        Exécute un 'git pull' avant le déploiement pour récupérer les dernières mises à jour"
            echo "  -h, --help        Affiche cette aide"
            echo ""
            echo "Arguments optionnels:"
            echo "  TARGET_DIR        Dossier cible (défaut: /mnt/arr/configs/nextcloud/custom_apps/artcraft ou détection locale)"
            echo "  CONTAINER_NAME    Nom du conteneur Docker/Podman (défaut: auto-détection ou nextcloud_app)"
            echo ""
            echo "Exemples:"
            echo "  ./deploy.sh                         # Déploiement / Mise à jour standard"
            echo "  ./deploy.sh --pull                  # Récupère depuis GitHub puis applique la mise à jour"
            echo "  ./deploy.sh /var/www/html/custom_apps/artcraft nextcloud_app"
            exit 0
            ;;
        -p|--pull)
            DO_PULL=true
            shift
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

set -- "${POSITIONAL_ARGS[@]}"

# 2. Mise à jour préalable depuis Git si demandé
if [ "$DO_PULL" = true ]; then
    if [ -d "$SCRIPT_DIR/.git" ]; then
        echo "-> Récupération des dernières mises à jour depuis GitHub (git pull)..."
        git -C "$SCRIPT_DIR" pull --ff-only || {
            echo "[!] Attention : git pull a échoué, poursuite du déploiement avec les fichiers locaux."
        }
    else
        echo "[i] Option --pull ignorée : ce dossier n'est pas un dépôt Git cloné."
    fi
fi

# 3. Normalisation automatique du dossier cible (évite tout conflit de nom)
RAW_TARGET="${1:-/mnt/arr/configs/nextcloud/custom_apps/artcraft}"
RAW_TARGET="${RAW_TARGET%/}"
DIR_BASENAME="$(basename "$RAW_TARGET")"
PARENT_DIR="$(dirname "$RAW_TARGET")"

if [ "$DIR_BASENAME" = "custom_apps" ] || [ "$DIR_BASENAME" = "apps" ]; then
    echo "[i] Le chemin spécifié pointe vers la racine des applications ('$RAW_TARGET')."
    echo "    Déploiement automatique dans le sous-dossier requis : '$RAW_TARGET/$APP_ID'"
    TARGET_DIR="$RAW_TARGET/$APP_ID"
elif [ "$DIR_BASENAME" = "nextcraft" ]; then
    echo "[!] Attention : Le dépôt se nomme 'nextcraft', mais Nextcloud exige impérativement l'identifiant technique '$APP_ID'."
    echo "    Correction automatique du dossier cible : '$PARENT_DIR/$APP_ID'"
    if [ -d "$RAW_TARGET" ]; then
        echo "    Nettoyage du dossier obsolète '$RAW_TARGET' pour éviter tout conflit..."
        rm -rf "$RAW_TARGET"
    fi
    TARGET_DIR="$PARENT_DIR/$APP_ID"
else
    TARGET_DIR="$RAW_TARGET"
fi

# Nettoyage préventif si un dossier 'nextcraft' orphelin subsiste à côté d'artcraft
POSSIBLE_CONFLICT="$(dirname "$TARGET_DIR")/nextcraft"
if [ -d "$POSSIBLE_CONFLICT" ] && [ "$POSSIBLE_CONFLICT" != "$TARGET_DIR" ]; then
    echo "-> Suppression du dossier orphelin '$POSSIBLE_CONFLICT' pour éviter tout conflit d'ID Nextcloud..."
    rm -rf "$POSSIBLE_CONFLICT"
fi

# Détection si c'est une première installation ou une mise à jour d'une version existante
IS_UPDATE=false
if [ -f "$TARGET_DIR/appinfo/info.xml" ]; then
    IS_UPDATE=true
fi

# 4. Détection du conteneur Docker / Podman
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
if [ "$IS_UPDATE" = true ]; then
    echo "    Mise à jour de PhotoCraft dans Nextcloud      "
else
    echo "    Déploiement de PhotoCraft dans Nextcloud      "
fi
echo "=================================================="
echo "-> Dossier cible : $TARGET_DIR"
echo "-> Mode          : $([ "$IS_UPDATE" = true ] && echo "Mise à jour (update)" || echo "Nouvelle installation")"
echo "-> Moteur        : ${ENGINE:-aucun (hôte pur)}"
echo "-> Conteneur     : $CONTAINER_NAME"
echo ""

# 5. Vérification de la présence des sources de l'extension
if [ ! -d "$SCRIPT_DIR/artcraft" ]; then
    echo "[!] Erreur : Dossier 'artcraft' introuvable dans $SCRIPT_DIR"
    exit 1
fi

# 6. Synchronisation propre des fichiers (suppression des fichiers obsolètes)
echo "-> Synchronisation des fichiers de l'application..."
mkdir -p "$TARGET_DIR"

if command -v rsync &>/dev/null; then
    # Synchronisation incrémentale propre supprimant tout fichier supprimé dans la nouvelle version
    rsync -av --delete --exclude='.git*' "$SCRIPT_DIR/artcraft/" "$TARGET_DIR/"
else
    # Fallback si rsync n'est pas installé sur l'hôte
    find "$TARGET_DIR" -mindepth 1 -delete 2>/dev/null || rm -rf "$TARGET_DIR"/*
    cp -r "$SCRIPT_DIR/artcraft/"* "$TARGET_DIR/"
fi

if [ -w "$TARGET_DIR" ]; then
    echo "-> Ajustement des droits sur l'hôte (755 répertoires, 644 fichiers)..."
    find "$TARGET_DIR" -type d -exec chmod 755 {} + 2>/dev/null || true
    find "$TARGET_DIR" -type f -exec chmod 644 {} + 2>/dev/null || true
fi

echo "[✓] Fichiers synchronisés avec succès dans $TARGET_DIR"
echo ""

# 7. Cycle de vie dans le conteneur Nextcloud (Mise à jour, Rechargement, Caches & OpCache)
if [ -n "$ENGINE" ] && $ENGINE ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    echo "-> Nettoyage préventif des résidus 'nextcraft' dans le conteneur..."
    $ENGINE exec "$CONTAINER_NAME" rm -rf /var/www/html/custom_apps/nextcraft /var/www/html/apps/nextcraft 2>/dev/null || true
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:disable nextcraft 2>/dev/null || true

    echo "-> Ajustement des droits www-data dans le conteneur..."
    $ENGINE exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/custom_apps/$APP_ID 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" chown -R www-data:www-data /var/www/html/apps/$APP_ID 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" find /var/www/html/custom_apps/$APP_ID -type d -exec chmod 755 {} + 2>/dev/null || true
    $ENGINE exec "$CONTAINER_NAME" find /var/www/html/custom_apps/$APP_ID -type f -exec chmod 644 {} + 2>/dev/null || true

    if [ "$IS_UPDATE" = true ]; then
        echo "-> Rechargement de l'extension pour prise en compte des nouveaux listeners et routes..."
        $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:disable $APP_ID 2>/dev/null || true
        $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:enable $APP_ID || true
    else
        echo "-> Activation de l'extension ($APP_ID)..."
        $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:enable $APP_ID || true
    fi

    echo "-> Exécution des éventuelles migrations de schéma Nextcloud..."
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ upgrade 2>/dev/null || true

    echo "-> Invalidation et renouvellement de l'empreinte de cache frontend (data-fingerprint)..."
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ maintenance:data-fingerprint || true

    echo "-> Réparation et optimisation des caches d'assets..."
    $ENGINE exec -u www-data "$CONTAINER_NAME" php occ maintenance:repair --include-expensive || true

    echo "-> Réinitialisation à chaud du cache Zend OpCache PHP..."
    $ENGINE exec "$CONTAINER_NAME" apache2ctl graceful 2>/dev/null || \
    $ENGINE exec "$CONTAINER_NAME" kill -USR2 1 2>/dev/null || true

    if $ENGINE exec -u www-data "$CONTAINER_NAME" php occ app:list 2>/dev/null | grep -q "$APP_ID"; then
        APP_VERSION=$(grep -oPm1 "(?<=<version>)[^<]+" "$TARGET_DIR/appinfo/info.xml" 2>/dev/null || echo "1.1.0")
        echo ""
        echo "[✓] PhotoCraft ($APP_ID v$APP_VERSION) est activé et opérationnel dans Nextcloud !"
    else
        echo "[!] Attention : Vérifiez l'état de l'application via : $ENGINE exec -u www-data $CONTAINER_NAME php occ app:list"
    fi
else
    echo "[*] Conteneur '$CONTAINER_NAME' non actif ou Docker exécuté sur une autre machine."
    echo "[*] Pour activer ou recharger manuellement l'application :"
    echo "    docker exec -u www-data $CONTAINER_NAME php occ app:disable $APP_ID && docker exec -u www-data $CONTAINER_NAME php occ app:enable $APP_ID"
    echo "    docker exec -u www-data $CONTAINER_NAME php occ maintenance:data-fingerprint"
fi

echo ""
echo "=================================================="
if [ "$IS_UPDATE" = true ]; then
    echo "    Mise à jour terminée avec succès !            "
else
    echo "    Déploiement terminé avec succès !             "
fi
echo "=================================================="
