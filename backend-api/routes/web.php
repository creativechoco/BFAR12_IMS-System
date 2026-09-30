<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Proxy storage files with CORS headers so frontend exports (html-to-image) can read photos
Route::match(['GET', 'OPTIONS'], '/media/{path}', function (string $path) {
    // Normalize path
    $relative = ltrim($path, '/');

    // If preflight, return early
    if (request()->isMethod('OPTIONS')) {
        return response('OK', 204)
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    }

    if (!Storage::disk('public')->exists($relative)) {
        return response('Not Found', 404)
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    }

    $mime = Storage::disk('public')->mimeType($relative) ?? 'application/octet-stream';
    $contents = Storage::disk('public')->get($relative);

    return response($contents, 200)
        ->header('Content-Type', $mime)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
})
    ->where('path', '.*')
    // Avoid session/cookie lookups so this endpoint stays stateless and never hits the sessions table
    ->withoutMiddleware([
        'web',
        \Illuminate\Cookie\Middleware\EncryptCookies::class,
        \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
    ]);
