<?php

return [
    'routes' => [
        // Navigation principale Nextcloud & vue studio autonome
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],

        // Vue principale de l'éditeur (Plein écran type OnlyOffice)
        ['name' => 'editor#index', 'url' => '/editor', 'verb' => 'GET'],
        ['name' => 'editor#studio', 'url' => '/studio', 'verb' => 'GET'],

        // API interne pour le client authentifié
        ['name' => 'api#create', 'url' => '/api/file/create', 'verb' => 'POST'],
        ['name' => 'api#load', 'url' => '/api/file/{fileId}/load', 'verb' => 'GET'],
        ['name' => 'api#save', 'url' => '/api/file/{fileId}/save', 'verb' => 'PUT'],
        ['name' => 'api#saveAs', 'url' => '/api/file/save-as', 'verb' => 'POST'],
        ['name' => 'api#rename', 'url' => '/api/file/{fileId}/rename', 'verb' => 'POST'],
        ['name' => 'api#lock', 'url' => '/api/file/{fileId}/lock', 'verb' => 'POST'],
        ['name' => 'api#unlock', 'url' => '/api/file/{fileId}/unlock', 'verb' => 'POST'],
        ['name' => 'api#heartbeat', 'url' => '/api/file/{fileId}/heartbeat', 'verb' => 'POST'],
        ['name' => 'api#export', 'url' => '/api/file/{fileId}/export', 'verb' => 'POST'],
        ['name' => 'api#fileInfo', 'url' => '/api/file/info', 'verb' => 'GET'],

        // Partage public par lien
        ['name' => 'public_page#show', 'url' => '/public/editor/{token}', 'verb' => 'GET'],
        ['name' => 'public_page#load', 'url' => '/public/api/{token}/load', 'verb' => 'GET'],
        ['name' => 'public_page#save', 'url' => '/public/api/{token}/save', 'verb' => 'PUT'],
    ]
];
