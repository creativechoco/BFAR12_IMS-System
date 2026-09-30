import { useMemo, useState } from 'react'
import { Search, Plus, Users, Download, Edit2, Trash2 } from './icons'

/**
 * Employee listing table. Data is currently provided by the parent
 * Dashboard (frontend-only mock). Backend integration pending.
 */
function EmployeeList({
  employees = [],
  loading = false,
  onEdit,
  onDelete,
  onNew,
  onExportZip,
  exportingZip = false,
}) {
  const [search, setSearch] = useState('')
  const [confirmingEmp, setConfirmingEmp] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = employees.map((emp) => ({
      ...emp,
      _fullName: [emp.first_name, emp.name_initial ? `${emp.name_initial}.` : '', emp.last_name]
        .filter(Boolean)
        .join(' ')
        .trim(),
    }))

    const filteredList = !q
      ? list
      : list.filter((emp) => {
          const haystack = [
            emp.first_name,
            emp.name_initial,
            emp.last_name,
            emp.id_number,
            emp.position,
            emp.department,
            emp.contact_number,
            emp.employment_status,
            emp.type,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(q)
        })

    return [...filteredList].sort((a, b) => (a._fullName || '').localeCompare(b._fullName || ''))
  }, [employees, search])

  const openConfirm = (emp) => {
    setConfirmingEmp(emp)
    setConfirmError('')
  }

  const closeConfirm = () => {
    if (confirming) return
    setConfirmingEmp(null)
    setConfirmError('')
  }

  const confirmDelete = async () => {
    if (!confirmingEmp) return
    setConfirming(true)
    setConfirmError('')
    try {
      await onDelete?.(confirmingEmp.id)
      setConfirmingEmp(null)
    } catch (err) {
      setConfirmError(err?.message || 'Unable to delete employee')
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = (emp) => {
    openConfirm(emp)
  }

  return (
    <div className="emp-page">
      <div className="emp-hero">
        <div className="hero-copy">
          <p className="eyebrow">Identity Management</p>
          <h2 className="hero-title">Manage Employees ID's</h2>
          <p className="hero-sub">Create, update, and organize identification records in one place.</p>
        </div>
        <div className="hero-actions">
          <button className="hero-btn hero-btn-outline" onClick={onNew}>
            <Plus size={14} /> New Employee
          </button>
          <button
            className="hero-btn hero-btn-solid"
            onClick={onExportZip}
            disabled={exportingZip || employees.length === 0}
            title={employees.length === 0 ? 'No employees to export' : 'Download all IDs as ZIP'}
          >
            <Download size={14} /> {exportingZip ? 'Exporting…' : 'Export ZIP'}
          </button>
        </div>
      </div>

      <div className="emp-card">
        <div className="table-toolbar">
          <div className="table-controls">
            <div className="search-wide">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search employees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="list-table-wrapper">
          {loading ? (
            <div className="list-loading">
              <div className="loading-spinner" />
              <span>Loading employees…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="list-empty">
              <Users size={40} />
              <p>{employees.length === 0 ? 'No one submitted ID yet' : 'No matches found'}</p>
               
            </div>
          ) : (
            <table className="emp-table modern">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>ID Number</th>
                  <th>Full Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="text-right actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase()
                  const photoSrc = emp.photoPreview || emp.photo_url
                  const fullName = [
                    emp.first_name,
                    emp.name_initial ? `${emp.name_initial}.` : '',
                    emp.last_name,
                  ]
                    .filter(Boolean)
                    .join(' ')
                  const statusLabel = emp.status || '—'
                  const isActive = statusLabel.toLowerCase() === 'active'
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className="emp-avatar">
                          {photoSrc ? (
                            <img src={photoSrc} alt={fullName || 'Employee'} />
                          ) : (
                            <div className="emp-avatar-placeholder">{initials || '—'}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="id-chip">{emp.id_number || '—'}</span>
                      </td>
                      <td>
                        <div className="emp-name">{fullName || 'Unnamed'}</div>
                      </td>
                      <td className="muted">{emp.position || '—'}</td>
                      <td className="muted">{emp.department || '—'}</td>
                      <td className="muted">{emp.contact_number || '—'}</td>
                      <td>
                        <span className={`status-chip ${isActive ? 'is-active' : 'is-inactive'}`}>{statusLabel}</span>
                      </td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button className="tbl-btn edit" onClick={() => onEdit?.(emp)} title="View / Edit">
                            <Edit2 size={14} />
                          </button>
                          <button className="tbl-btn delete" onClick={() => handleDelete(emp)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {confirmingEmp && (
        <div
          className="confirm-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirm-modal"
            style={{
              background: '#fff',
              color: '#111',
              padding: '22px 24px',
              borderRadius: '14px',
              width: '360px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Delete employee</h3>
            <p style={{ margin: '0 0 12px 0', color: '#444', lineHeight: 1.5 }}>
              Are you sure you want to delete{' '}
              <strong>
                {[confirmingEmp.first_name, confirmingEmp.name_initial, confirmingEmp.last_name]
                  .filter(Boolean)
                  .join(' ') || 'this employee'}
              </strong>
              ? This action cannot be undone.
            </p>
            {confirmError && (
              <div
                style={{
                  background: '#ffecec',
                  color: '#b3261e',
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 10,
                  border: '1px solid #f2b8b5',
                }}
              >
                {confirmError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={closeConfirm} disabled={confirming}>
                Cancel
              </button>
              <button
                className="btn-ghost"
                onClick={confirmDelete}
                disabled={confirming}
                style={{ background: '#e54848', color: '#fff', borderColor: '#e54848' }}
              >
                {confirming ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeList
