<?php
/** @var array $_ */
?>
<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc;">
    <div style="background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="display: flex; justify-content: center; margin-bottom: 1.25rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <h2 style="margin: 0 0 1rem; font-size: 1.5rem; font-weight: 600;">Erreur PhotoCraft</h2>
        <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
            <?= p($_['message'] ?? 'Une erreur est survenue lors de l\'accès au document.') ?>
        </p>
        <button onclick="window.history.back()" style="background: #2563eb; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer;">
            Retour
        </button>
    </div>
</div>
