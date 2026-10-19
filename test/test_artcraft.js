const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Test 1 : Validation de info.xml ---');
const infoXmlPath = path.join(__dirname, '../artcraft/appinfo/info.xml');
assert(fs.existsSync(infoXmlPath), 'info.xml doit exister');
const infoXml = fs.readFileSync(infoXmlPath, 'utf8');
assert(infoXml.includes('<id>artcraft</id>'), 'info.xml doit contenir l\'ID artcraft');
assert(infoXml.includes('<name>PhotoCraft</name>'), 'info.xml doit contenir le nom PhotoCraft');
assert(infoXml.includes('<version>1.1.0</version>'), 'info.xml doit spécifier la version 1.1.0');
assert(infoXml.includes('<nextcloud min-version="27"'), 'info.xml doit spécifier min-version');
assert(infoXml.includes('<navigations>'), 'info.xml doit déclarer les navigations');
assert(infoXml.includes('<route>artcraft.page.index</route>'), 'info.xml doit pointer vers artcraft.page.index');
console.log('✓ info.xml est valide.');

console.log('--- Test 2 : Validation des routes PHP ---');
const routesPath = path.join(__dirname, '../artcraft/appinfo/routes.php');
assert(fs.existsSync(routesPath), 'routes.php doit exister');
const routes = fs.readFileSync(routesPath, 'utf8');
assert(routes.includes('page#index'), 'Route page#index manquante pour le menu Nextcloud');
assert(routes.includes('editor#index'), 'Route editor#index manquante');
assert(routes.includes('api#save'), 'Route api#save manquante');
assert(routes.includes('api#load'), 'Route api#load manquante');
assert(routes.includes('api#lock'), 'Route api#lock manquante');
assert(routes.includes('api#unlock'), 'Route api#unlock manquante');
assert(routes.includes('api#heartbeat'), 'Route api#heartbeat manquante');
assert(routes.includes('api#export'), 'Route api#export manquante');
assert(routes.includes('api#create'), 'Route api#create manquante');
assert(routes.includes('public_page#show'), 'Route public_page#show manquante');
console.log('✓ Toutes les routes requises sont déclarées.');

console.log('--- Test 3 : Validation des binaires et assets PhotoCraft WebAssembly ---');
const webDir = path.join(__dirname, '../artcraft/web');
assert(fs.existsSync(webDir), 'Le répertoire artcraft/web doit exister');

const indexHtmlPath = path.join(webDir, 'index.html');
assert(fs.existsSync(indexHtmlPath), 'index.html PhotoCraft doit exister');

// Recherche du binaire WASM PhotoCraft
const files = fs.readdirSync(webDir);
const wasmFile = files.find(f => f.endsWith('.wasm'));
assert(wasmFile, 'Un binaire WebAssembly (.wasm) doit être présent dans artcraft/web');

const wasmPath = path.join(webDir, wasmFile);
const wasmHeader = fs.readFileSync(wasmPath).slice(0, 4);
assert.strictEqual(wasmHeader.toString('hex'), '0061736d', 'Le binaire doit avoir le header magique \\0asm');
console.log(`✓ Binaire WebAssembly statique validé (${wasmFile}).`);

console.log('--- Test 4 : Vérification de la suppression intégrale de VectorCraft ---');
function checkNoVectorCraft(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'web') {
                checkNoVectorCraft(fullPath);
            }
        } else if (entry.isFile()) {
            if (/\.(php|js|css|xml|json)$/i.test(entry.name)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                assert(!content.toLowerCase().includes('vectorcraft'), `Référence à VectorCraft trouvée dans : ${fullPath}`);
            }
        }
    }
}

const artcraftDir = path.join(__dirname, '../artcraft');
checkNoVectorCraft(artcraftDir);
console.log('✓ Aucune référence obsolète à VectorCraft dans la codebase.');

console.log('--- Test 5 : Vérification des templates et formats par défaut (.craft) ---');
const templateListener = fs.readFileSync(path.join(artcraftDir, 'lib/Listeners/RegisterTemplateFileCreatorListener.php'), 'utf8');
assert(templateListener.includes("TemplateFileCreator(Application::APP_ID, 'Projet PhotoCraft', '.craft')"), 'Le créateur de fichier doit proposer PhotoCraft .craft');
assert(!templateListener.includes("'.psd'"), 'Le créateur de fichier ne doit plus créer naturellement de .psd');
assert(!templateListener.includes('.vec'), 'Le créateur de fichier ne doit plus proposer .vec');

const mainJs = fs.readFileSync(path.join(artcraftDir, 'js/main.js'), 'utf8');
assert(!mainJs.includes('open_vectorcraft'), 'main.js ne doit plus contenir d\'actions vectorcraft');
assert(mainJs.includes('open_photocraft_'), 'main.js doit enregistrer l\'action PhotoCraft');
console.log('✓ Formats de fichiers et actions Nextcloud validés (.craft par défaut).');

console.log('--- Test 6 : Vérification de l\'action "Ouvrir dans PhotoCraft" pour les images ---');
assert(mainJs.includes('open_in_photocraft'), 'main.js doit enregistrer l\'action Vue open_in_photocraft');
assert(mainJs.includes('isSupportedImage'), 'main.js doit détecter les formats d\'image');
const directEditor = fs.readFileSync(path.join(artcraftDir, 'lib/Service/DirectEditor.php'), 'utf8');
assert(directEditor.includes('image/png'), 'DirectEditor doit lister image/png dans getMimetypesOptional');
assert(directEditor.includes('image/svg+xml'), 'DirectEditor doit lister image/svg+xml dans getMimetypesOptional');
console.log('✓ Action image et configuration DirectEditor validées.');

console.log('--- Test 7 : Validation de l\'application à part entière (Menu Nextcloud & mode autonome) ---');
const pageControllerPath = path.join(artcraftDir, 'lib/Controller/PageController.php');
assert(fs.existsSync(pageControllerPath), 'PageController.php doit exister');
const pageController = fs.readFileSync(pageControllerPath, 'utf8');
assert(pageController.includes('class PageController'), 'PageController doit déclarer la classe PageController');
assert(pageController.includes('function index('), 'PageController doit implémenter index()');

const navListenerPath = path.join(artcraftDir, 'lib/Listeners/LoadNavigationEntriesListener.php');
assert(fs.existsSync(navListenerPath), 'LoadNavigationEntriesListener.php doit exister');
const navListener = fs.readFileSync(navListenerPath, 'utf8');
assert(navListener.includes('LoadAdditionalEntriesEvent'), 'Le listener doit écouter LoadAdditionalEntriesEvent');
assert(navListener.includes('artcraft.page.index'), 'Le listener doit pointer vers artcraft.page.index');

const appPhp = fs.readFileSync(path.join(artcraftDir, 'lib/AppInfo/Application.php'), 'utf8');
assert(appPhp.includes('LoadAdditionalEntriesEvent'), 'Application.php doit enregistrer le listener de navigation');
assert(appPhp.includes('LoadNavigationEntriesListener'), 'Application.php doit référencer LoadNavigationEntriesListener');

const editorController = fs.readFileSync(path.join(artcraftDir, 'lib/Controller/EditorController.php'), 'utf8');
assert(editorController.includes('?int $fileId = null'), 'EditorController doit accepter un fileId optionnel pour le mode autonome');
assert(editorController.includes('$effectiveFileId = 0'), 'EditorController doit initialiser un projet vierge avec fileId=0');

const bridgeJs = fs.readFileSync(path.join(artcraftDir, 'js/editor/bridge.js'), 'utf8');
assert(bridgeJs.includes('!fileId || fileId === 0'), 'bridge.js doit supporter directement le mode autonome');
console.log('✓ Intégration application autonome dans le menu Nextcloud validée.');

console.log('\n=============================================');
console.log('🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
console.log('=============================================\n');
