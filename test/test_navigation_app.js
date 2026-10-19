const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🚀 Démarrage du test de l\'application PhotoCraft dans le menu Nextcloud...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=swiftshader']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    try {
        // 1. Connexion à Nextcloud
        console.log('1. Connexion en tant qu\'administrateur...');
        await page.goto('http://localhost:8888/index.php/login');
        await page.waitForSelector('#user');
        await page.fill('#user', 'admin');
        await page.fill('#password', 'admin');
        await page.keyboard.press('Enter');
        await page.waitForNavigation();
        await page.waitForTimeout(2000);
        console.log('✓ Connecté avec succès.');

        // 2. Ouverture du menu waffle des applications
        console.log('2. Recherche de PhotoCraft dans le menu des applications...');
        await page.click('.app-menu__waffle, .app-menu__current-app');
        await page.waitForTimeout(600);

        const appLink = page.locator('a[href*="/apps/artcraft/"]').first();
        assert(await appLink.isVisible(), 'Lien PhotoCraft non visible dans le menu des applications');
        console.log('✓ PhotoCraft est bien présent dans la barre de navigation Nextcloud !');

        // 3. Clic sur PhotoCraft dans la barre de navigation
        console.log('3. Clic sur l\'icône PhotoCraft dans le menu...');
        await appLink.click();
        await page.waitForLoadState('domcontentloaded');

        // 4. Vérification du chargement de l'éditeur en mode autonome (blank workspace)
        console.log('4. Vérification de l\'éditeur autonome (sans fichier)...');
        await page.waitForSelector('#artcraft-app', { timeout: 15000 });
        const artcraftApp = page.locator('#artcraft-app');

        const fileIdAttr = await artcraftApp.getAttribute('data-file-id');
        console.log(`   data-file-id = "${fileIdAttr}"`);
        assert.strictEqual(fileIdAttr, '0', 'En mode autonome, fileId doit valoir 0');

        const fileNameAttr = await artcraftApp.getAttribute('data-file-name');
        console.log(`   data-file-name = "${fileNameAttr}"`);
        assert(fileNameAttr && fileNameAttr.endsWith('.craft'), 'Nom du projet par défaut invalide');

        // Attente de l'iframe PhotoCraft
        await page.waitForSelector('#photocraft-iframe', { timeout: 15000 });
        console.log('✓ Iframe PhotoCraft studio présente.');

        await page.waitForTimeout(3000);

        console.log('\n=============================================');
        console.log('🎉 TEST MENU & APPLICATION AUTONOME RÉUSSI !');
        console.log('=============================================\n');
    } catch (err) {
        console.error('❌ Échec du test :', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
