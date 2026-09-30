<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\EmployeeAuthController;
use App\Http\Controllers\Auth\AdminAuthController;
use App\Http\Controllers\EmployeeController;

Route::middleware('api')->group(function () {
    Route::post('/employee/login', [EmployeeAuthController::class, 'login']);
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::patch('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
});
