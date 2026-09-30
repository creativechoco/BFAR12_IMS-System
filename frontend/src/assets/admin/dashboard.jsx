import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import AddEmployeeForm, { EMPTY_EMPLOYEE, REQUIRED_FIELDS } from './add-employee-form'
import { IDCardFront, IDCardBack } from '../components/id-preview'
import EmployeeList from './employee-list'
import { createEmployee, getEmployees, updateEmployee, deleteEmployee } from '../../services/employees'
import { downloadIdPNG, downloadIdPDF, generateIdPdfBlob } from '../../utils/exportId'
import Cropper from 'react-easy-crop'
import {
  UserPlus,
  Users,
  LogOut,
  Sun,
  Moon,
  Download,
  FileImage,
  ChevronLeft,
  ChevronRight,
} from './icons'
import './dashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const [view, setView] = useState('editor') // 'editor' | 'list'
  const [formData, setFormData] = useState(EMPTY_EMPLOYEE)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [exportingZip, setExportingZip] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [employees, setEmployees] = useState([])
  const [resetSignal, setResetSignal] = useState(0)
  const employeesRef = useRef([])
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const bulkFrontRefs = useRef(new Map())
  const bulkBackRefs = useRef(new Map())
  const photoCache = useRef(new Map())
  const cancelExportRef = useRef(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, message: '' })

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

  const adminName = useMemo(
    () => localStorage.getItem('adminName') || 'System Administrator',
    [],
  )

  const normalizePhotoUrl = (url) => url?.replace('/storage/', '/media/') || url || null

  const getEmployeeKey = (emp, idx) => emp?.id ?? emp?.id_number ?? idx

  const makeFileName = (emp) => {
    const name = [emp?.first_name, emp?.name_initial, emp?.last_name].filter(Boolean).join(' ').trim() || 'Employee'
    const idPart = emp?.id_number || 'ID'
    const clean = (val) => val.replace(/\s+/g, '_')
    return `${clean(name)} - ${clean(idPart)}`
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
        data[i + 3] = 0
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

  const startSignatureCropWithFile = (file) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSigCropSrc(ev.target.result)
      setSigCropMeta({ fileType: file.type || 'image/png', fileName: file.name || 'signature.png' })
      setSigCrop({ x: 0, y: 0 })
      setSigZoom(1)
      setSigCroppedAreaPixels(null)
    }
    reader.readAsDataURL(file)
  }

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const prefetchEmployeePhotos = async (list) => {
    const updates = []
    for (let i = 0; i < list.length; i += 1) {
      const emp = list[i]
      if (emp.photoPreview) continue
      const photoUrl = normalizePhotoUrl(emp.photo_url)
      if (!photoUrl) continue
      if (photoCache.current.has(photoUrl)) {
        updates.push({ key: getEmployeeKey(emp, i), dataUrl: photoCache.current.get(photoUrl) })
        continue
      }
      try {
        const res = await fetch(photoUrl, { mode: 'cors' })
        if (!res.ok) continue
        const blob = await res.blob()
        const dataUrl = await blobToDataUrl(blob)
        photoCache.current.set(photoUrl, dataUrl)
        updates.push({ key: getEmployeeKey(emp, i), dataUrl })
      } catch (err) {
        console.warn('[Export ZIP] Failed to preload photo', photoUrl, err)
      }
    }

    if (updates.length) {
      const updateMap = new Map(updates.map((u) => [u.key, u.dataUrl]))
      setEmployees((prev) =>
        prev.map((emp, idx) => {
          const key = getEmployeeKey(emp, idx)
          const dataUrl = updateMap.get(key)
          return dataUrl ? { ...emp, photoPreview: dataUrl } : emp
        }),
      )
    }
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
      setFormData((prev) => ({ ...prev, signature: cleanedFile, signaturePreview: preview }))
      setErrors((prev) => ({ ...prev, signature: '' }))
      setSigCropSrc(null)
      setSigCroppedAreaPixels(null)
    } catch (err) {
      showToast(err?.message || 'Unable to process signature', 'error')
    } finally {
      setSigCropping(false)
    }
  }

  const cancelSignatureCrop = () => {
    setSigCropSrc(null)
    setSigCroppedAreaPixels(null)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    return () => document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    getEmployees()
      .then((list) => {
        const normalized = (list || []).map((emp) => ({
          ...emp,
          photo_url: normalizePhotoUrl(emp.photo_url),
        }))
        setEmployees(normalized)
        employeesRef.current = normalized
        prefetchEmployeePhotos(normalized)
      })
      .catch(() => setEmployees([]))
  }, [])

  useEffect(() => {
    employeesRef.current = employees
  }, [employees])

  useEffect(() => {
    const handler = (e) => {
      if (exportingZip) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [exportingZip])

  // Redirect to landing if no admin session exists
  useEffect(() => {
    if (!localStorage.getItem('adminToken')) navigate('/', { replace: true })
  }, [navigate])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  const handleChange = (field) => (event) => {
    const raw = event.target.value
    const value = typeof raw === 'string' ? raw.toUpperCase() : raw
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handlePhotoChange = (file, dataUrl) => {
    setFormData((prev) => ({ ...prev, photo: file, photoPreview: dataUrl }))
    setErrors((prev) => ({ ...prev, photo: '' }))
  }

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, photo: null, photoPreview: null }))
    setCropSrc(null)
    setCroppedAreaPixels(null)
  }

  const handleSignatureChange = (file, dataUrl) => {
    setFormData((prev) => ({ ...prev, signature: file, signaturePreview: dataUrl }))
    setErrors((prev) => ({ ...prev, signature: '' }))
  }

  const handleRemoveSignature = () => {
    setFormData((prev) => ({ ...prev, signature: null, signaturePreview: null }))
  }

  const handleReset = () => {
    setFormData(EMPTY_EMPLOYEE)
    setErrors({})
    setEditingId(null)
    setResetSignal((n) => n + 1)
    setCropSrc(null)
    setCroppedAreaPixels(null)
    setSigCropSrc(null)
    setSigCroppedAreaPixels(null)
  }

  const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels)

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

  const startCropWithFile = (file) => {
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

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return
    try {
      setCropping(true)
      const { dataUrl, blob } = await getCroppedImage(cropSrc, croppedAreaPixels, cropMeta.fileType)
      const fileName = cropMeta.fileName || 'photo.jpg'
      const croppedFile = new File([blob], fileName, { type: blob.type || cropMeta.fileType })

      setFormData((prev) => ({ ...prev, photo: croppedFile, photoPreview: dataUrl }))
      setCropSrc(null)
      setCroppedAreaPixels(null)
      setErrors((prev) => ({ ...prev, photo: '' }))
    } catch (err) {
      showToast(err?.message || 'Unable to crop image', 'error')
    } finally {
      setCropping(false)
    }
  }

  const cancelCrop = () => {
    setCropSrc(null)
    setCroppedAreaPixels(null)
  }

  const handleSave = async () => {
    const missing = REQUIRED_FIELDS.filter((f) => !formData[f]?.toString().trim())
    if (!formData.photo && !formData.photoPreview) missing.push('photo')
    if (!formData.signature && !formData.signaturePreview) missing.push('signature')

    if (missing.length) {
      const nextErrors = missing.reduce((acc, k) => ({ ...acc, [k]: 'Required' }), {})
      setErrors(nextErrors)
      showToast('Please fill in all required fields.', 'error')
      return
    }

    setSaving(true)
    try {
      const isEdit = Boolean(editingId)
      const saved = isEdit
        ? await updateEmployee(editingId, formData)
        : await createEmployee(formData)

      const normalized = {
        ...EMPTY_EMPLOYEE,
        ...formData,
        id: saved?.id || editingId || Date.now(),
        photo_url: saved?.photo_url || formData.photoPreview || null,
        signature_url: saved?.signature_url || formData.signaturePreview || null,
        photo: null,
        photoPreview: null,
        signature: null,
        signaturePreview: null,
      }

      setEmployees((prev) => {
        if (isEdit) {
          return prev.map((emp) => (emp.id === editingId ? { ...emp, ...normalized } : emp))
        }
        return [normalized, ...prev]
      })

      showToast(isEdit ? 'Employee updated!' : 'Employee saved successfully!')
      setFormData(EMPTY_EMPLOYEE)
      setErrors({})
      setEditingId(null)
      setResetSignal((n) => n + 1)
    } catch (err) {
      showToast(err?.message || 'Unable to save employee', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (emp) => {
    const proxiedPhoto = emp.photo_url?.replace('/storage/', '/media/') || emp.photo_url || null
    const proxiedSignature = emp.signature_url?.replace('/storage/', '/media/') || emp.signature_url || null
    setFormData({
      ...EMPTY_EMPLOYEE,
      ...emp,
      photoPreview: emp.photoPreview || proxiedPhoto,
      signaturePreview: emp.signaturePreview || proxiedSignature,
      photo: null,
      signature: null,
    })
    setEditingId(emp.id)
    setErrors({})
    setView('editor')
  }

  const handleDelete = async (id) => {
    try {
      setDeletingId(id)
      await deleteEmployee(id)
      setEmployees((prev) => prev.filter((emp) => emp.id !== id))
      showToast('Employee removed.')
    } catch (err) {
      showToast(err?.message || 'Unable to delete employee', 'error')
      throw err
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (kind) => {
    try {
      const name = [formData.first_name, formData.last_name].filter(Boolean).join('_') || 'Employee_ID'
      if (kind === 'png') {
        await downloadIdPNG(frontRef.current, backRef.current, name)
        showToast('PNG downloaded!')
      } else {
        await downloadIdPDF(frontRef.current, backRef.current, name)
        showToast('PDF downloaded!')
      }
    } catch (err) {
      showToast(err?.message || 'Export failed.', 'error')
    }
  }

  const handleExportZip = async () => {
    if (!employeesRef.current.length) {
      showToast('No employees to export.', 'error')
      return
    }

    setExportingZip(true)
    setShowExportModal(true)
    setExportProgress({ current: 0, total: employeesRef.current.length, message: 'Starting export…' })
    cancelExportRef.current = false
    const startedAt = performance.now()
    console.log(`[Export ZIP] Starting export for ${employees.length} employees`)
    try {
      await prefetchEmployeePhotos(employeesRef.current)
      await new Promise((resolve) => requestAnimationFrame(() => resolve()))

      const list = employeesRef.current
      const zip = new JSZip()

      for (let i = 0; i < list.length; i += 1) {
        const emp = list[i]
        const key = getEmployeeKey(emp, i)
        const frontEl = bulkFrontRefs.current.get(key)
        const backEl = bulkBackRefs.current.get(key)

        if (!frontEl || !backEl) {
          throw new Error('ID previews are not ready. Please stay on this page and try again.')
        }

        const fileName = makeFileName(emp)
        console.log(`[Export ZIP] Rendering PDF for ${fileName} (${i + 1}/${employees.length})`)
        setExportProgress({ current: i + 1, total: list.length, message: `Rendering ${fileName}…` })
        if (cancelExportRef.current) throw new Error('Export cancelled by user')
        const pdfBlob = await generateIdPdfBlob(frontEl, backEl, fileName)
        zip.file(`${fileName}.pdf`, pdfBlob)
        if (cancelExportRef.current) throw new Error('Export cancelled by user')
      }

      setExportProgress({ current: list.length, total: list.length, message: 'Packaging ZIP…' })
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      const durationMs = Math.round(performance.now() - startedAt)
      console.log(`[Export ZIP] ZIP ready (${(content.size / 1024 / 1024).toFixed(2)} MB) in ${durationMs}ms`)

      const dateTag = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${dateTag}_Employee_IDs.zip`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      console.log('[Export ZIP] Download triggered')
      showToast('ZIP downloaded!')
    } catch (err) {
      console.error('[Export ZIP] Failed', err)
      const msg = err?.message === 'Export cancelled by user' ? 'Export cancelled.' : err?.message
      showToast(msg || 'Unable to export ZIP', 'error')
    } finally {
      setExportingZip(false)
      setShowExportModal(false)
      setExportProgress({ current: 0, total: 0, message: '' })
      cancelExportRef.current = false
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminName')
    navigate('/', { replace: true })
  }

  return (
    <div className={`admin-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/bfar-logo.png" alt="BFAR" className="brand-logo" />
          <span className="brand-text">BFAR 12-IMS</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${view === 'editor' ? 'active' : ''}`}
            onClick={() => setView('editor')}
          >
            <UserPlus size={18} />
            <span>{editingId ? 'Edit Employee' : 'New Employee'}</span>
          </button>
          <button
            className={`nav-item ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            <Users size={18} />
            <span>Employees ID</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setDarkMode((d) => !d)}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">{adminName?.[0] || 'A'}</div>
            <div className="user-info">
              <span className="user-name">{adminName}</span>
              <span className="user-role">Admin</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        {view === 'list' ? (
          <>
            <EmployeeList
              employees={employees}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNew={() => {
                handleReset()
                setView('editor')
              }}
              onExportZip={handleExportZip}
              exportingZip={exportingZip}
            />

            {/* Hidden render for bulk exports */}
            <div
              style={{ position: 'absolute', left: '-99999px', top: 0, opacity: 0, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              {employees.map((emp, idx) => {
                const key = getEmployeeKey(emp, idx)
                return (
                  <div key={key} style={{ marginBottom: '12px' }}>
                    <IDCardFront
                      ref={(el) => {
                        if (el) bulkFrontRefs.current.set(key, el)
                        else bulkFrontRefs.current.delete(key)
                      }}
                      data={emp}
                    />
                    <IDCardBack
                      ref={(el) => {
                        if (el) bulkBackRefs.current.set(key, el)
                        else bulkBackRefs.current.delete(key)
                      }}
                      data={emp}
                    />
                  </div>
                )
              })}
            </div>

            {exportingZip && showExportModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    color: '#111',
                    padding: '20px 22px',
                    borderRadius: '12px',
                    width: '360px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Exporting IDs</h3>
                    <button
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', fontWeight: 700 }}
                      onClick={() => setShowExportModal(false)}
                      title="Hide"
                    >
                      ×
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 10px 0', fontSize: 13, color: '#444' }}>{exportProgress.message}</p>
                  <div style={{ marginBottom: 12, fontSize: 13, color: '#333' }}>
                    {exportProgress.total > 0
                      ? `PDF ${exportProgress.current} of ${exportProgress.total}`
                      : 'Preparing…'}
                  </div>
                  <div style={{ height: 8, background: '#eef1f5', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                    <div
                      style={{
                        height: '100%',
                        width:
                          exportProgress.total > 0
                            ? `${Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100))}%`
                            : '10%',
                        background: 'linear-gradient(135deg, #2b64d6, #4a8cff)',
                        transition: 'width 120ms linear',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => setShowExportModal(false)}
                      style={{ padding: '8px 12px' }}
                    >
                      Hide
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        cancelExportRef.current = true
                        setExportProgress((p) => ({ ...p, message: 'Cancelling…' }))
                      }}
                      style={{ padding: '8px 12px', color: '#c00', borderColor: '#e3b4b4' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {exportingZip && !showExportModal && (
              <button
                className="btn-ghost"
                style={{ position: 'fixed', bottom: 18, right: 18, zIndex: 9998 }}
                onClick={() => setShowExportModal(true)}
              >
                Show export progress
              </button>
            )}
          </>
        ) : (
          <div className="editor-layout">
            {/* Left: Form */}
            <div className="form-panel1">
              <div className="panel-header">
                <h2>
                  <span className="panel-glyph">{editingId ? '✏️' : '＋'}</span>
                  {editingId ? 'Edit Employee' : 'New Employee'}
                </h2>
                {editingId && (
                  <button className="btn-cancel" onClick={handleReset}>
                    Cancel Edit
                  </button>
                )}
              </div>

              <AddEmployeeForm
                data={formData}
                onChange={handleChange}
                errors={errors}
                onPhotoChange={handlePhotoChange}
                onRemovePhoto={handleRemovePhoto}
                onStartCrop={startCropWithFile}
                onSignatureChange={(file, preview) =>
                  setFormData((prev) => ({ ...prev, signature: file, signaturePreview: preview }))
                }
                onRemoveSignature={handleRemoveSignature}
                onStartSignatureCrop={startSignatureCropWithFile}
                resetSignal={resetSignal}
              />

              <div className="form-actions">
                <button type="button" className="ghost" onClick={handleReset}>
                  Reset
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Update employee' : 'Save employee'}
                </button>
              </div>
            </div>

            {/* Right: Preview */}
            <aside className="preview-panel1">
              <div className="panel-header">
                <h2>
                  <span className="panel-glyph">🪪</span>
                  Live ID Preview
                </h2>
                <div className="preview-actions">
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle ${!cardFlipped ? 'active' : ''}`}
                      onClick={() => setCardFlipped(false)}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      className={`toggle ${cardFlipped ? 'active' : ''}`}
                      onClick={() => setCardFlipped(true)}
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>

              <div className="id-card-stage">
                {cardFlipped ? (
                  <IDCardBack data={formData} />
                ) : (
                  <IDCardFront data={formData} />
                )}
              </div>

              <div className="download-buttons">
                <button className="dl-btn dl-png" onClick={() => handleDownload('png')}>
                  <FileImage />
                  Download PNG
                </button>
                <button className="dl-btn dl-pdf" onClick={() => handleDownload('pdf')}>
                  <Download />
                  Download PDF
                </button>
              </div>
            </aside>

            {/* Hidden render for exports (front + back always rendered) */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }} aria-hidden="true">
              <IDCardFront ref={frontRef} data={formData} />
              <IDCardBack ref={backRef} data={formData} />
            </div>
          </div>
        )}
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
            <p className="cropper-hint">Drag to center your signature. Use zoom to fit it within the box.</p>
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

export default AdminDashboard
