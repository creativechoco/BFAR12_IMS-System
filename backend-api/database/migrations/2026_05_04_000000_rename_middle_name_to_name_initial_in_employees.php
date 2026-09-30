<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->renameColumn('middle_name', 'name_initial');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->string('name_initial', 10)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->renameColumn('name_initial', 'middle_name');
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->string('middle_name', 100)->nullable()->change();
        });
    }
};
