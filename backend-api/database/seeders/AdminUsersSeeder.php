<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //
        DB::table('admin_users')->insert([
        'name' => 'Main Admin',
        'email' => 'mainadmin@gmail.com',
        'password' => Hash::make('123456789'),
        'role' => 'main admin',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    }
}
