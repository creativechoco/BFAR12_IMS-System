<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'id_number',
        'first_name',
        'name_initial',
        'last_name',
        'position',
        'department',
        'home_address',
        'contact_number',
        'date_of_birth',
        'blood_type',
        'photo_url',
        'sss_number',
        'pagibig_number',
        'tin_number',
        'philhealth_number',
        'emergency_name',
        'emergency_contact',
        'emergency_relationship',
        'emergency_address',
        'status',
        'signature_url',
        'created_by',
    ];
}
