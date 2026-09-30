import { useEffect, useRef } from 'react'
import './add-employee-form.css'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/**
 * Admin-side employee capture form. Mirrors the implementation & visuals of
 * `@/assets/employee/id-generator.jsx` but scoped under `.add-employee-form`
 * so it can be embedded inside the admin dashboard without style clashes.
 *
 * Props:
 *  - data            : controlled form state
 *  - onChange(field) : returns an onChange handler that updates `field`
 *  - errors          : { [field]: 'Required' | '' }
 *  - onPhotoChange   : (file, dataUrl) => void
 *  - onRemovePhoto   : () => void
 *  - onStartCrop     : file => void (photo crop)
 *  - onStartSignatureCrop : file => void (signature crop)
 */
function AddEmployeeForm({
  data,
  onChange,
  errors = {},
  onPhotoChange,
  onRemovePhoto,
  onSignatureChange,
  onRemoveSignature,
  onStartCrop,
  onStartSignatureCrop,
  resetSignal = 0,
}) {
  const fileRef = useRef(null)
  const signatureRef = useRef(null)

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (onStartCrop) {
      onStartCrop(file)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => onPhotoChange?.(file, ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onRemovePhoto?.()
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSignature = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (onStartSignatureCrop) {
      onStartSignatureCrop(file)
    } else {
      console.warn('Signature crop handler not provided; falling back to raw upload')
      const reader = new FileReader()
      reader.onload = (ev) => onSignatureChange?.(file, ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveSignature = (e) => {
    e.stopPropagation()
    onRemoveSignature?.()
    if (signatureRef.current) signatureRef.current.value = ''
  }

  useEffect(() => {
    if (fileRef.current) fileRef.current.value = ''
    if (signatureRef.current) signatureRef.current.value = ''
  }, [resetSignal])

  const cls = (field) => (errors[field] ? 'has-error' : '')

  return (
    <div className="add-employee-form">
      {/* ── Photo Upload ── */}
      <div className="photo-upload-section">
        <div
          className={`photo-upload-area ${errors.photo ? 'has-error' : ''}`}
          onClick={() => !data.photoPreview && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {data.photoPreview ? (
            <div className="photo-preview-box">
              <img src={data.photoPreview} alt="Preview" />
              <button
                type="button"
                className="remove-photo-btn"
                onClick={handleRemove}
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="photo-placeholder">
              <span className="upload-glyph">⬆</span>
              <span>Upload 2×2 Photo</span>
              <span className="photo-hint">JPG, PNG up to 5MB</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhoto}
        />
      </div>

      

      {/* ── Personal Information ── */}
      <div className="form-section">
        <div className="section-header">Personal Information</div>
        <div className="form-grid">
          <label>
            <span>First Name*</span>
            <input
              type="text"
              placeholder="Maria"
              value={data.first_name}
              onChange={onChange('first_name')}
              className={cls('first_name')}
            />
          </label>
          <label>
            <span>Middle Initial</span>
            <input
              type="text"
              placeholder="M"
              maxLength={1}
              value={data.name_initial}
              onChange={onChange('name_initial')}
              className={cls('name_initial')}
            />
          </label>
          <label>
            <span>Last Name*</span>
            <input
              type="text"
              placeholder="Dela Cruz"
              value={data.last_name}
              onChange={onChange('last_name')}
              className={cls('last_name')}
            />
          </label>
          <label>
            <span>ID Number*</span>
            <input
              type="text"
              placeholder="BFAR12 COS-0001"
              value={data.id_number}
              onChange={onChange('id_number')}
              className={cls('id_number')}
            />
          </label>
          <label>
            <span>Position / Title*</span>
            <input
              type="text"
              placeholder="Aquaculture Technician"
              value={data.position}
              onChange={onChange('position')}
              className={cls('position')}
            />
          </label>
          <label>
            <span>Department*</span>
            <input
              type="text"
              placeholder="Fisheries Post-Harvest"
              value={data.department}
              onChange={onChange('department')}
              className={cls('department')}
            />
          </label>
          <label>
            <span>Blood Type*</span>
            <select
              value={data.blood_type}
              onChange={onChange('blood_type')}
              className={cls('blood_type')}
            >
              <option value="">Select blood type</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ── Contact Information ── */}
      <div className="form-section">
        <div className="section-header">Contact Information</div>
        <div className="form-grid">
          <label className="full">
            <span>Home Address*</span>
            <textarea
              placeholder="House no, Street, Barangay, Municipality"
              value={data.home_address}
              onChange={onChange('home_address')}
              className={cls('home_address')}
            />
          </label>
          <label>
            <span>Contact Number*</span>
            <input
              type="tel"
              placeholder="09XX XXX XXXX"
              value={data.contact_number}
              onChange={onChange('contact_number')}
              className={cls('contact_number')}
            />
          </label>
          <label>
            <span>Date of Birth*</span>
            <input
              type="date"
              value={data.date_of_birth}
              onChange={onChange('date_of_birth')}
              className={cls('date_of_birth')}
            />
          </label>
        </div>
      </div>

      {/* ── Government IDs ── */}
      <div className="form-section">
        <div className="section-header">Government IDs</div>
        <div className="form-grid">
          <label>
            <span>SSS Number*</span>
            <input
              type="text"
              placeholder="12-3456789-0"
              value={data.sss_number}
              onChange={onChange('sss_number')}
              className={cls('sss_number')}
            />
          </label>
          <label>
            <span>Pag-IBIG Number*</span>
            <input
              type="text"
              placeholder="1234-5678-9012"
              value={data.pagibig_number}
              onChange={onChange('pagibig_number')}
              className={cls('pagibig_number')}
            />
          </label>
          <label>
            <span>TIN Number*</span>
            <input
              type="text"
              placeholder="123-456-789-000"
              value={data.tin_number}
              onChange={onChange('tin_number')}
              className={cls('tin_number')}
            />
          </label>
          <label>
            <span>PhilHealth No.*</span>
            <input
              type="text"
              placeholder="12-345678901-2"
              value={data.philhealth_number}
              onChange={onChange('philhealth_number')}
              className={cls('philhealth_number')}
            />
          </label>
        </div>
      </div>

      {/* ── Emergency Contact ── */}
      <div className="form-section emergency">
        <div className="section-header emergency-header">Emergency Contact</div>
        <div className="form-grid">
          <label>
            <span>Contact Name*</span>
            <input
              type="text"
              placeholder="Juan Dela Cruz"
              value={data.emergency_name}
              onChange={onChange('emergency_name')}
              className={cls('emergency_name')}
            />
          </label>
          <label>
            <span>Contact Number*</span>
            <input
              type="tel"
              placeholder="09XX XXX XXXX"
              value={data.emergency_contact}
              onChange={onChange('emergency_contact')}
              className={cls('emergency_contact')}
            />
          </label>
          <label>
            <span>Relationship*</span>
            <input
              type="text"
              placeholder="Spouse, Parent, Sibling…"
              value={data.emergency_relationship}
              onChange={onChange('emergency_relationship')}
              className={cls('emergency_relationship')}
            />
          </label>
          <label className="full">
            <span>Address</span>
            <input
              type="text"
              placeholder="Emergency contact address"
              value={data.emergency_address}
              onChange={onChange('emergency_address')}
              className={cls('emergency_address')}
            />
          </label>
        </div>
      </div>

      {/* ── Signature Upload ── */}
      <div className="form-section">
        <div className="section-header">Signature</div>
        <div className="signature-upload">
          <div
            className={`signature-upload-area ${errors.signature ? 'has-error' : ''}`}
            onClick={() => !data.signaturePreview && signatureRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            {data.signaturePreview ? (
              <div className="signature-preview-box">
                <img src={data.signaturePreview} alt="Signature preview" />
                <button
                  type="button"
                  className="remove-photo-btn"
                  onClick={handleRemoveSignature}
                  aria-label="Remove signature"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="photo-placeholder">
                <span className="upload-glyph">✍</span>
                <span>Upload signature</span>
                <span className="photo-hint">PNG/JPG, light background</span>
              </div>
            )}
          </div>
          <input
            ref={signatureRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleSignature}
          />
        </div>
      </div>
    </div>
  )
}

export const REQUIRED_FIELDS = [
  'id_number',
  'first_name',
  'name_initial',
  'last_name',
  'position',
  'department',
  'home_address',
  'contact_number',
  'date_of_birth',
  'sss_number',
  'pagibig_number',
  'tin_number',
  'philhealth_number',
  'emergency_name',
  'emergency_contact',
  'emergency_relationship',
  'emergency_address',
  'signature',
]

export const EMPTY_EMPLOYEE = {
  id_number: '',
  first_name: '',
  name_initial: '',
  last_name: '',
  position: '',
  department: '',
  blood_type: '',
  home_address: '',
  contact_number: '',
  date_of_birth: '',
  sss_number: '',
  pagibig_number: '',
  tin_number: '',
  philhealth_number: '',
  emergency_name: '',
  emergency_contact: '',
  emergency_relationship: '',
  emergency_address: '',
  status: 'active',
  photo: null,
  photoPreview: null,
  signature: null,
  signaturePreview: null,
}

export default AddEmployeeForm
