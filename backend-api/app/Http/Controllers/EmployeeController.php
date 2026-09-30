<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index()
    {
        $employees = Employee::orderByDesc('created_at')->get()->map(function ($emp) {
            if ($emp->photo_url) {
                $emp->photo_url = $this->buildPhotoUrl($emp->photo_url);
            }
            if ($emp->signature_url) {
                $emp->signature_url = $this->buildPhotoUrl($emp->signature_url);
            }

            return $emp;
        });

        return response()->json($employees);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_number' => 'required|string|max:50|unique:employees,id_number',
            'first_name' => 'required|string|max:100',
            'name_initial' => 'nullable|string|max:10',
            'last_name' => 'required|string|max:100',
            'position' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'home_address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'blood_type' => 'nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'sss_number' => 'nullable|string|max:50',
            'pagibig_number' => 'nullable|string|max:50',
            'tin_number' => 'nullable|string|max:50',
            'philhealth_number' => 'nullable|string|max:50',
            'emergency_name' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'emergency_relationship' => 'nullable|string|max:100',
            'emergency_address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'photo' => 'nullable|image|max:5120', // 5MB
            'signature' => 'nullable|image|max:2048',
        ]);

        // Handle photo upload if present
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $path = $file->store('employee-photos', 'public');
            $storageUrl = Storage::disk('public')->url($path); // may be relative
            $validated['photo_url'] = $this->buildPhotoUrl($storageUrl);
        }

        // Handle signature upload if present
        if ($request->hasFile('signature')) {
            $file = $request->file('signature');
            $path = $file->store('employee-signatures', 'public');
            $storageUrl = Storage::disk('public')->url($path);
            $validated['signature_url'] = $this->buildPhotoUrl($storageUrl);
        }

        // Optionally track creator if auth middleware is added later
        if ($request->user()) {
            $validated['created_by'] = $request->user()->id;
        }

        $employee = Employee::create($validated);

        return response()->json($employee, Response::HTTP_CREATED);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'id_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('employees', 'id_number')->ignore($employee->id),
            ],
            'name_initial' => 'nullable|string|max:10',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'position' => 'nullable|string|max:150',
            'department' => 'nullable|string|max:150',
            'home_address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'blood_type' => 'nullable|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'sss_number' => 'nullable|string|max:50',
            'pagibig_number' => 'nullable|string|max:50',
            'tin_number' => 'nullable|string|max:50',
            'philhealth_number' => 'nullable|string|max:50',
            'emergency_name' => 'nullable|string|max:255',
            'emergency_contact' => 'nullable|string|max:20',
            'emergency_relationship' => 'nullable|string|max:100',
            'emergency_address' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'photo' => 'nullable|image|max:5120',
            'signature' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $this->deleteExistingPhoto($employee->photo_url);
            $file = $request->file('photo');
            $path = $file->store('employee-photos', 'public');
            $storageUrl = Storage::disk('public')->url($path);
            $validated['photo_url'] = $this->buildPhotoUrl($storageUrl);
        }

        if ($request->hasFile('signature')) {
            $this->deleteExistingPhoto($employee->signature_url);
            $file = $request->file('signature');
            $path = $file->store('employee-signatures', 'public');
            $storageUrl = Storage::disk('public')->url($path);
            $validated['signature_url'] = $this->buildPhotoUrl($storageUrl);
        }

        $employee->update($validated);

        if ($employee->photo_url) {
            $employee->photo_url = $this->buildPhotoUrl($employee->photo_url);
        }

        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        // Clean up media if present
        $this->deleteExistingPhoto($employee->photo_url);
        $this->deleteExistingPhoto($employee->signature_url);

        $employee->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    private function deleteExistingPhoto(?string $photoUrl): void
    {
        if (!$photoUrl) return;

        $path = parse_url($photoUrl, PHP_URL_PATH) ?: '';
        $relative = ltrim(Str::replaceFirst('storage/', '', ltrim($path, '/')), '/');
        if (str_starts_with($relative, 'media/')) {
            $relative = Str::replaceFirst('media/', '', $relative);
        }

        if (!$relative) {
            return;
        }

        $candidates = array_unique([
            ltrim($relative, '/'),
            'public/' . ltrim($relative, '/'),
        ]);

        foreach ($candidates as $rel) {
            if (Storage::disk('public')->exists($rel)) {
                Storage::disk('public')->delete($rel);
            }
            if (Storage::disk('local')->exists($rel)) {
                Storage::disk('local')->delete($rel);
            }
        }

        // Best-effort cleanup of public symlink path (public/storage/...)
        $publicPath = public_path('storage/' . ltrim($relative, '/'));
        if (File::exists($publicPath)) {
            File::delete($publicPath);
        }
    }

    private function buildPhotoUrl(string $pathOrUrl): string
    {
        $base = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');

        // Absolute URL
        if (str_starts_with($pathOrUrl, 'http://') || str_starts_with($pathOrUrl, 'https://')) {
            // If it points to /storage, rewrite to /media for CORS-safe proxy
            if (str_contains($pathOrUrl, '/storage/')) {
                return Str::replaceFirst('/storage/', '/media/', $pathOrUrl);
            }
            return $pathOrUrl;
        }

        // Relative storage path → serve through /media proxy to include CORS headers
        $relative = ltrim($pathOrUrl, '/');
        if (str_starts_with($relative, 'storage/')) {
            $relative = Str::replaceFirst('storage/', '', $relative);
            return $base . '/media/' . $relative;
        }

        return $base . '/' . $relative;
    }
}
