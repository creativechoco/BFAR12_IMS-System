<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeAuthController extends Controller
{
    /**
     * Handle employee login by checking the registration masterlist.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string'],
        ]);

        $fullName = Str::squish($validated['full_name']);
        $normalized = $this->normalizeName($fullName);

        $record = DB::table('registration_users')
            ->select('id', 'full_name')
            ->whereRaw('LOWER(TRIM(REGEXP_REPLACE(full_name, "[^A-Za-z0-9 ]", ""))) = ?', [$normalized])
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'Full name not found in the masterlist.',
            ], 401);
        }

        $employee = $this->findEmployeeByName($normalized);

        return response()->json([
            'success' => true,
            'token' => bin2hex(random_bytes(16)),
            'user' => [
                'id' => $record->id,
                'full_name' => $record->full_name,
            ],
            'employee' => $employee,
        ]);
    }

    private function normalizeName(string $name): string
    {
        // Match MySQL: REGEXP_REPLACE(full_name, "[^A-Za-z0-9 ]", "")
        $clean = preg_replace('/[^A-Za-z0-9 ]+/u', '', $name);
        return trim(strtolower($clean));
    }

    private function findEmployeeByName(string $normalizedName): ?array
    {
        $employees = DB::table('employees')->get();

        $match = $employees->first(function ($emp) use ($normalizedName) {
            $variants = $this->nameVariants($emp->first_name, $emp->name_initial, $emp->last_name);
            return collect($variants)
                ->map(fn ($v) => $this->normalizeName($v))
                ->contains($normalizedName);
        });

        if (! $match) {
            return null;
        }

        return [
            'id' => $match->id,
            'id_number' => $match->id_number,
            'first_name' => $match->first_name,
            'name_initial' => $match->name_initial,
            'last_name' => $match->last_name,
            'position' => $match->position,
            'department' => $match->department,
            'home_address' => $match->home_address,
            'contact_number' => $match->contact_number,
            'date_of_birth' => $match->date_of_birth,
            'blood_type' => $match->blood_type,
            'sss_number' => $match->sss_number,
            'pagibig_number' => $match->pagibig_number,
            'tin_number' => $match->tin_number,
            'philhealth_number' => $match->philhealth_number,
            'emergency_name' => $match->emergency_name,
            'emergency_contact' => $match->emergency_contact,
            'emergency_relationship' => $match->emergency_relationship,
            'emergency_address' => $match->emergency_address,
            'photo_url' => $this->proxyMediaUrl($match->photo_url),
            'signature_url' => $this->proxyMediaUrl($match->signature_url),
        ];
    }

    private function nameVariants(?string $first, ?string $initial, ?string $last): array
    {
        $first = trim((string) $first);
        $initial = trim((string) $initial);
        $last = trim((string) $last);

        return array_filter([
            "$last $first $initial",
            "$last $first",
            "$first $initial $last",
            "$first $last",
        ], fn ($v) => trim($v) !== '');
    }

    private function proxyMediaUrl(?string $url): ?string
    {
        if (! $url) return null;

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return Str::replaceFirst('/storage/', '/media/', $url);
        }

        $clean = ltrim($url, '/');
        if (str_starts_with($clean, 'storage/')) {
            return url('/media/' . Str::replaceFirst('storage/', '', $clean));
        }

        return url('/' . $clean);
    }
}
