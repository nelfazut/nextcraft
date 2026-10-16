#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=== Compilation du moteur ArtCraft en WebAssembly ==="

if ! command -v wasm-pack &> /dev/null; then
    echo "[!] wasm-pack n'est pas détecté dans l'environnement courant."
    echo "[*] Pour l'installer : cargo install wasm-pack"
    echo "[*] Ou installez Rustup : curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo "[*] Le bundle JavaScript/Wasm pré-généré dans artcraft/js/wasm sera utilisé en production."
    exit 0
fi

echo "-> Compilation release avec wasm-pack..."
wasm-pack build --target web --release --out-dir ../artcraft/js/wasm --out-name artcraft

if command -v wasm-opt &> /dev/null; then
    echo "-> Optimisation avec wasm-opt (-O3)..."
    wasm-opt -O3 ../artcraft/js/wasm/artcraft_bg.wasm -o ../artcraft/js/wasm/artcraft_bg.wasm
fi

echo "[✓] Compilation WebAssembly terminée avec succès !"
