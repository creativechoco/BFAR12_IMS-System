import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IDCardFront, IDCardBack } from '../components/id-preview'
import { createEmployee, updateEmployee } from '../../services/employees'

import './id-generator.css'
import Cropper from 'react-easy-crop'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const defaultForm = {

  /* Identity */
  id_number: '',
  first_name: '',
  name_initial: '',
  last_name: '',
  position: '',
  department: '',
  blood_type: '',

  /* Contact */
  home_address: '',
  contact_number: '',
  date_of_birth: '',

  /* Government IDs */
  sss_number: '',
  pagibig_number: '',
  tin_number: '',
  philhealth_number: '',

  /* Emergency */
  emergency_name: '',
  emergency_contact: '',
  emergency_relationship: '',
  emergency_address: '',

  /* Photo */
  photo: null,
  photoPreview: null,

  /* Signature */
  signature: null,
  signaturePreview: null,
}

function seedFromLocal() {
  const storedProfile = localStorage.getItem('employeeProfile')
  if (storedProfile) {
    try {
      const profile = JSON.parse(storedProfile)
      return {
        ...defaultForm,
        ...profile,
        photoPreview: profile.photo_url || null,
        signaturePreview: profile.signature_url || null,
      }
    } catch (err) {
      localStorage.removeItem('employeeProfile')
    }
  }

  const stored = localStorage.getItem('employeeName') || ''
  if (!stored) return defaultForm

  /* Expected formats: "LASTNAME, FIRSTNAME(S) M." or "First Last" */
  const parts = stored.split(',').map((s) => s.trim())
  if (parts.length === 2) {
    const [last, rest] = parts
    const tokens = rest.split(/\s+/).filter(Boolean)
    // Last token ending with '.' is the initial; everything before is first name(s)
    let initial = ''
    let firstName = rest
    if (tokens.length >= 2) {
      const lastToken = tokens[tokens.length - 1]
      if (lastToken.endsWith('.')) {
        initial = lastToken.replace('.', '')
        firstName = tokens.slice(0, -1).join(' ')
      }
    }
    return {
      ...defaultForm,
      last_name: last,
      first_name: firstName,
      name_initial: initial,
    }
  }
  const tokens = stored.split(/\s+/).filter(Boolean)
  return {
    ...defaultForm,
    first_name: tokens[0] || '',
    last_name: tokens.slice(1).join(' '),
  }
}

function EmployeeIdGenerator() {
  const navigate = useNavigate()
  const [form, setForm] = useState(seedFromLocal)
  const [employeeId, setEmployeeId] = useState(() => {
    const profile = localStorage.getItem('employeeProfile')
    if (!profile) return null
    try {
      const parsed = JSON.parse(profile)
      return parsed?.id || null
    } catch (err) {
      return null
    }
  })

  const [activeSide, setActiveSide] = useState('front')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)
  const signatureRef = useRef(null)

  /* Photo cropper state */
  const [cropSrc, setCropSrc] = useState(null)
  const [cropMeta, setCropMeta] = useState({ fileType: 'image/jpeg', fileName: 'photo.jpg' })
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [cropping, setCropping] = useState(false)

  /* Signature cropper state */
  const [sigCropSrc, setSigCropSrc] = useState(null)
  const [sigCropMeta, setSigCropMeta] = useState({ fileType: 'image/png', fileName: 'signature.png' })
  const [sigCrop, setSigCrop] = useState({ x: 0, y: 0 })
  const [sigZoom, setSigZoom] = useState(1)
  const [sigCroppedAreaPixels, setSigCroppedAreaPixels] = useState(null)
  const [sigCropping, setSigCropping] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('employeeToken')
    if (!token) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const displayName = useMemo(() => {
    const full = [form.last_name, form.first_name].filter(Boolean).join(', ')
    return full || localStorage.getItem('employeeName') || 'Employee'
  }, [form.first_name, form.last_name])

  const handleChange = (field) => (event) => {
    const raw = event.target.value
    const value = typeof raw === 'string' ? raw.toUpperCase() : raw
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  const getCroppedImage = async (imageSrc, cropPixels, fileType = 'image/jpeg', size = 192) => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const outW = typeof size === 'number' ? size : size?.width || 192
    const outH = typeof size === 'number' ? size : size?.height || 192
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    const { x, y, width, height } = cropPixels
    ctx.drawImage(image, x, y, width, height, 0, 0, outW, outH)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Unable to crop image'))
          const reader = new FileReader()
          reader.onloadend = () => resolve({ blob, dataUrl: reader.result })
          reader.onerror = reject
          reader.readAsDataURL(blob)
        },
        fileType,
        0.95,
      )
    })
  }

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropSrc(ev.target.result)
      setCropMeta({ fileType: file.type || 'image/jpeg', fileName: file.name || 'photo.jpg' })
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setForm((prev) => ({ ...prev, photo: null, photoPreview: null }))
    if (fileRef.current) fileRef.current.value = ''
    setCropSrc(null)
    setCroppedAreaPixels(null)
  }

  const removeSignatureBackground = async (dataUrl, fileName = 'signature.png') => {
    const image = await createImage(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data } = imageData
    const threshold = 245
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r > threshold && g > threshold && b > threshold) {
        data[i + 3] = 0 // make near-white transparent
      }
    }
    ctx.putImageData(imageData, 0, 0)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Unable to process signature'))
          const safeName = (fileName || 'signature.png').replace(/\.[^.]+$/, '')
          const cleanedFile = new File([blob], `${safeName}-clean.png`, { type: 'image/png' })
          const preview = canvas.toDataURL('image/png')
          resolve({ cleanedFile, preview })
        },
        'image/png',
        1,
      )
    })
  }

  const handleSignature = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSigCropSrc(ev.target.result)
      setSigCropMeta({ fileType: file.type || 'image/png', fileName: file.name || 'signature.png' })
      setSigCrop({ x: 0, y: 0 })
      setSigZoom(1)
      setSigCroppedAreaPixels(null)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const removeSignature = () => {
    setForm((prev) => ({ ...prev, signature: null, signaturePreview: null }))
    if (signatureRef.current) signatureRef.current.value = ''
  }

  const handleReset = () => {
    setForm(defaultForm)
    setErrors({})
    if (fileRef.current) fileRef.current.value = ''
    if (signatureRef.current) signatureRef.current.value = ''
    setCropSrc(null)
    setCroppedAreaPixels(null)
    setSigCropSrc(null)
    setSigCroppedAreaPixels(null)
  }

  const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels)

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return
    try {
      setCropping(true)
      const { dataUrl, blob } = await getCroppedImage(cropSrc, croppedAreaPixels, cropMeta.fileType)
      const fileName = cropMeta.fileName || 'photo.jpg'
      const croppedFile = new File([blob], fileName, { type: blob.type || cropMeta.fileType })

      setForm((prev) => ({ ...prev, photo: croppedFile, photoPreview: dataUrl }))
      setCropSrc(null)
      setCroppedAreaPixels(null)
      if (fileRef.current) fileRef.current.value = ''
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to crop image')
    } finally {
      setCropping(false)
    }
  }

  const cancelCrop = () => {
    setCropSrc(null)
    setCroppedAreaPixels(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onSigCropComplete = (_, areaPixels) => setSigCroppedAreaPixels(areaPixels)

  const applySignatureCrop = async () => {
    if (!sigCropSrc || !sigCroppedAreaPixels) return
    try {
      setSigCropping(true)
      const { dataUrl } = await getCroppedImage(sigCropSrc, sigCroppedAreaPixels, sigCropMeta.fileType, {
        width: 600,
        height: 240,
      })
      const { cleanedFile, preview } = await removeSignatureBackground(dataUrl, sigCropMeta.fileName)
      setForm((prev) => ({ ...prev, signature: cleanedFile, signaturePreview: preview }))
      setErrors((prev) => ({ ...prev, signature: '' }))
      setError('')
      setSigCropSrc(null)
      setSigCroppedAreaPixels(null)
      if (signatureRef.current) signatureRef.current.value = ''
    } catch (err) {
      setError(err?.message || 'Unable to process signature')
    } finally {
      setSigCropping(false)
    }
  }

  const cancelSignatureCrop = () => {
    setSigCropSrc(null)
    setSigCroppedAreaPixels(null)
    if (signatureRef.current) signatureRef.current.value = ''
  }

  const handleSave = () => {
    const requiredFields = [
      'id_number',
      'first_name',
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
    ]

    const missing = requiredFields.filter((field) => !form[field]?.toString().trim())
    if (!form.photo && !form.photoPreview) {
      missing.push('photo')
    }
    if (!form.signature && !form.signaturePreview) {
      missing.push('signature')
    }

    if (missing.length) {
      const nextErrors = missing.reduce((acc, key) => ({ ...acc, [key]: 'Required' }), {})
      setErrors((prev) => ({ ...prev, ...nextErrors }))
      setError('Please fill in all required fields.')
      setSuccess('')
      return
    }

    setError('')
    setSuccess('')
    setSaving(true)

    const saveAction = employeeId ? updateEmployee(employeeId, form) : createEmployee(form)

    saveAction
      .then((employee) => {
        const nextProfile = {
          ...form,
          ...employee,
          photo_url: employee?.photo_url || form.photoPreview || null,
          signature_url: employee?.signature_url || form.signaturePreview || null,
        }

        setSuccess(employeeId ? 'Your ID information has been updated!' : 'Your ID information has been successfully saved!')
        setForm({
          ...defaultForm,
          ...nextProfile,
          photoPreview: nextProfile.photo_url || null,
          signaturePreview: nextProfile.signature_url || null,
          photo: null,
          signature: null,
        })
        setErrors({})
        if (fileRef.current) fileRef.current.value = ''
        if (signatureRef.current) signatureRef.current.value = ''

        // Persist name + profile for future sessions
        if (nextProfile?.last_name && nextProfile?.first_name) {
          localStorage.setItem('employeeName', `${nextProfile.last_name}, ${nextProfile.first_name}`)
        }
        localStorage.setItem('employeeProfile', JSON.stringify({
          id: nextProfile.id || employeeId,
          ...nextProfile,
        }))
        if (employee?.id) setEmployeeId(employee.id)
      })
      .catch((err) => {
        setError(err?.message || 'Unable to save employee')
      })

      .finally(() => setSaving(false))
  }

  return (
    <div className="id-page">
      <div className="id-bg" />
      <header className="id-header">
        <div>
          <h1>Employee ID Form</h1>
          <p>Preview your front and back ID layout while filling out the official details.</p>
        </div>
        <div className="session-chip">
          <span className="label">Signed in as</span>
          <span className="value">{displayName}</span>
        </div>
      </header>

      <main className="id-workspace">
        <section className="form-panel">
          <div className="panel-title">
            <h2>ID Data Capture</h2>
            <p>Please match the official masterlist spelling to avoid reprints.</p>
          </div>

          {/* ── Photo Upload ── */}
          <div className="photo-upload-section">
            <div
              className={`photo-upload-area ${errors.photo ? 'has-error' : ''}`}
              onClick={() => !form.photoPreview && fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              {form.photoPreview ? (
                <div className="photo-preview-box">
                  <img src={form.photoPreview} alt="Preview" />
                  <button
                    type="button"
                    className="remove-photo-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto()
                    }}
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
                  value={form.first_name}
                  onChange={handleChange('first_name')}
                  className={errors.first_name ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Middle Initial</span>
                <input
                  type="text"
                  placeholder="M"
                  maxLength={1}
                  value={form.name_initial}
                  onChange={handleChange('name_initial')}
                />
              </label>
              <label>
                <span>Last Name*</span>
                <input
                  type="text"
                  placeholder="Dela Cruz"
                  value={form.last_name}
                  onChange={handleChange('last_name')}
                  className={errors.last_name ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>ID Number</span>
                <input
                  type="text"
                  placeholder="BFAR12 COS-0001"
                  value={form.id_number}
                  onChange={handleChange('id_number')}
                  className={errors.id_number ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Position / Title</span>
                <input
                  type="text"
                  placeholder="Aquaculture Technician"
                  value={form.position}
                  onChange={handleChange('position')}
                  className={errors.position ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Department</span>
                <input
                  type="text"
                  placeholder="Fisheries Post-Harvest"
                  value={form.department}
                  onChange={handleChange('department')}
                  className={errors.department ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Blood Type</span>
                <select
                  value={form.blood_type}
                  onChange={handleChange('blood_type')}
                  className={errors.blood_type ? 'has-error' : ''}
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
                <span>Home Address</span>
                <textarea
                  placeholder="House no, Street, Barangay, Municipality"
                  value={form.home_address}
                  onChange={handleChange('home_address')}
                  className={errors.home_address ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Contact Number</span>
                <input
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={form.contact_number}
                  onChange={handleChange('contact_number')}
                  className={errors.contact_number ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange('date_of_birth')}
                  className={errors.date_of_birth ? 'has-error' : ''}
                />
              </label>
            </div>
          </div>

          {/* ── Government IDs ── */}
          <div className="form-section">
            <div className="section-header">Government IDs</div>
            <div className="form-grid">
              <label>
                <span>SSS Number</span>
                <input
                  type="text"
                  placeholder="12-3456789-0"
                  value={form.sss_number}
                  onChange={handleChange('sss_number')}
                  className={errors.sss_number ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Pag-IBIG Number</span>
                <input
                  type="text"
                  placeholder="1234-5678-9012"
                  value={form.pagibig_number}
                  onChange={handleChange('pagibig_number')}
                  className={errors.pagibig_number ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>TIN Number</span>
                <input
                  type="text"
                  placeholder="123-456-789-000"
                  value={form.tin_number}
                  onChange={handleChange('tin_number')}
                  className={errors.tin_number ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>PhilHealth No.</span>
                <input
                  type="text"
                  placeholder="12-345678901-2"
                  value={form.philhealth_number}
                  onChange={handleChange('philhealth_number')}
                  className={errors.philhealth_number ? 'has-error' : ''}
                />
              </label>
            </div>
          </div>

          {/* ── Emergency Contact ── */}
          <div className="form-section emergency">
            <div className="section-header emergency-header">Emergency Contact</div>
            <div className="form-grid">
              <label>
                <span>Contact Name</span>
                <input
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={form.emergency_name}
                  onChange={handleChange('emergency_name')}
                  className={errors.emergency_name ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Contact Number</span>
                <input
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={form.emergency_contact}
                  onChange={handleChange('emergency_contact')}
                  className={errors.emergency_contact ? 'has-error' : ''}
                />
              </label>
              <label>
                <span>Relationship</span>
                <input
                  type="text"
                  placeholder="Spouse, Parent, Sibling…"
                  value={form.emergency_relationship}
                  onChange={handleChange('emergency_relationship')}
                  className={errors.emergency_relationship ? 'has-error' : ''}
                />
              </label>
              <label className="full">
                <span>Address</span>
                <input
                  type="text"
                  placeholder="Emergency contact address"
                  value={form.emergency_address}
                  onChange={handleChange('emergency_address')}
                  className={errors.emergency_address ? 'has-error' : ''}
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
                onClick={() => !form.signaturePreview && signatureRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                {form.signaturePreview ? (
                  <div className="signature-preview-box">
                    <img src={form.signaturePreview} alt="Signature preview" />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSignature()
                      }}
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

          <div className="form-actions">
            <button type="button" className="ghost" onClick={() => navigate('/', { replace: true })}>
              Return to landing page
            </button>
            <div className="action-group">
              <button type="button" className="ghost" onClick={handleReset}>
                Reset
              </button>
              <button type="button" className="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit now'}
              </button>
            </div>
          </div>

          {(error || success) && (
            <div className={`form-status ${error ? 'error' : 'success'}`}>
              {error || success}
            </div>
          )}
        </section>

        <section className="preview-panel">
          <div className="preview-header">
            <h2>ID Preview</h2>
            <div className="toggle-group">
              <button
                type="button"
                className={activeSide === 'front' ? 'toggle active' : 'toggle'}
                onClick={() => setActiveSide('front')}
              >
                Front
              </button>
              <button
                type="button"
                className={activeSide === 'back' ? 'toggle active' : 'toggle'}
                onClick={() => setActiveSide('back')}
              >
                Back
              </button>
            </div>
          </div>

          <div className={`id-canvas ${activeSide}`}>
            {activeSide === 'front' ? (
              <IDCardFront data={form} />
            ) : (
              <IDCardBack data={form} />
            )}
          </div>
        </section>
      </main>

      {cropSrc && (
        <div className="cropper-overlay" role="dialog" aria-modal="true">
          <div className="cropper-dialog">
            <h3>Adjust photo (2×2)</h3>
            <p className="cropper-hint">Drag to position your face in the square. Use zoom to fill the frame without cropping too tight.</p>
            <div className="cropper-stage">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                minZoom={1}
                maxZoom={3}
                cropShape="rect"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="cropper-controls">
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="cropper-actions">
              <button type="button" className="ghost" onClick={cancelCrop} disabled={cropping}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={applyCrop} disabled={cropping}>
                {cropping ? 'Cropping…' : 'Save crop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sigCropSrc && (
        <div className="cropper-overlay" role="dialog" aria-modal="true">
          <div className="cropper-dialog">
            <h3>Adjust signature</h3>
            <p className="cropper-hint">Drag to center your signature. Use zoom to fit it comfortably within the box.</p>
            <div className="cropper-stage">
              <Cropper
                image={sigCropSrc}
                crop={sigCrop}
                zoom={sigZoom}
                aspect={2.5}
                minZoom={0.5}
                maxZoom={5}
                cropShape="rect"
                onCropChange={setSigCrop}
                onZoomChange={setSigZoom}
                onCropComplete={onSigCropComplete}
              />
            </div>
            <div className="cropper-controls">
              <label>
                Zoom
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.05"
                  value={sigZoom}
                  onChange={(e) => setSigZoom(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="cropper-actions">
              <button type="button" className="ghost" onClick={cancelSignatureCrop} disabled={sigCropping}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={applySignatureCrop} disabled={sigCropping}>
                {sigCropping ? 'Cropping…' : 'Save crop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeIdGenerator