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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('id_number', 50)->unique();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('position', 150)->nullable();
            $table->string('department', 150)->nullable();
            $table->text('home_address')->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->enum('blood_type', ['A+','A-','B+','B-','AB+','AB-','O+','O-'])->nullable();
            $table->string('photo_url', 500)->nullable();

            // Government IDs
            $table->string('sss_number', 50)->nullable();
            $table->string('pagibig_number', 50)->nullable();
            $table->string('tin_number', 50)->nullable();
            $table->string('philhealth_number', 50)->nullable();

            // Emergency Contact
            $table->string('emergency_name', 255)->nullable();
            $table->string('emergency_contact', 20)->nullable();
            $table->string('emergency_relationship', 100)->nullable();

            // Meta
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
