import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeeLogin, adminLogin } from '../services/auth'
import '../pages/Landing.css'

const Landing = () => {
  const [activeTab, setActiveTab] = useState('employee')
  const [adminForm, setAdminForm] = useState({ email: '', password: '' })
  const [employeeForm, setEmployeeForm] = useState({ fullName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const navigate = useNavigate()

  const subtitle = useMemo(
    () =>
      activeTab === 'employee'
        ? 'Enter your full name exactly as it appears in the masterlist.'
        : 'Sign in with your admin credentials.',
    [activeTab]
  )

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (activeTab === 'admin') {
      if (!adminForm.email.trim() || !adminForm.password.trim()) {
        setError('Please provide your admin email and password.')
        return
      }
      try {
        setLoading(true)
        const response = await adminLogin(adminForm.email.trim(), adminForm.password)
        if (response.success) {
          localStorage.setItem('adminToken', response.token)
          localStorage.setItem('adminName', response.user?.name || response.user?.email || 'Administrator')
          navigate('/admin/dashboard')
        } else {
          setError(response?.message || 'Authentication failed.')
        }
      } catch (err) {
        setError(err?.message || 'Authentication failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!employeeForm.fullName.trim()) {
      setError('Please provide your full name.')
      return
    }

    try {
      setLoading(true)
      const response = await employeeLogin(employeeForm.fullName.trim())
      if (response.success) {
        localStorage.setItem('employeeToken', response.token)
        localStorage.setItem('employeeName', response.user.full_name)
        if (response.employee) {
          localStorage.setItem('employeeProfile', JSON.stringify(response.employee))
        } else {
          localStorage.removeItem('employeeProfile')
        }
        navigate('/employee/id-generator')
      } else {
        setShowFailModal(true)
      }
    } catch (err) {
      setShowFailModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="bg-overlay" />

      <div className="content">
        <header className="hero">
          <div className="hero-logos">
            <img src="/ph-logo.png" alt="Republic of the Philippines" loading="lazy" decoding="async" />
            <img src="/bfar-logo.png" alt="BFAR XII" loading="lazy" decoding="async" />
            <img src="/gad-logo.jpg" alt="GAD" loading="lazy" decoding="async" />
          </div>
          <p className="hero-suptitle">Department of Agriculture</p>
          <h1 className="hero-title1">Bureau of Fisheries and Aquatic Resources Region XII</h1>
        </header>

        <div className="modal-wrapper">
          <div className="modal">
            <div className="modal-header">
              <div className="brand-logo">
                <img src="/bfar-logo.png" alt="BFAR XII" loading="lazy" decoding="async" />
              </div>
              <h1 className="modal-title">Welcome!</h1>
              <p className="modal-sub">BFAR XII-IMS · Identity Management System</p>
            </div>

            <div className="tab-bar">
              <button
                className={activeTab === 'employee' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => handleTabSwitch('employee')}
              >
                Employee
              </button>
              <button
                className={activeTab === 'admin' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => handleTabSwitch('admin')}
              >
                Admin
              </button>
            </div>

            {activeTab === 'employee' ? (
              <form className="modal-form" onSubmit={handleSubmit}>
                <p className="form-hint">{subtitle}</p>

                <div className="field">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. DELA CRUZ, JUAN P."
                    value={employeeForm.fullName}
                    onChange={(e) => setEmployeeForm({ fullName: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </div>

                {error && <div className="form-error">{error}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Continue'}
                </button>
              </form>
            ) : (
              <form className="modal-form" onSubmit={handleSubmit}>
                <p className="form-hint">{subtitle}</p>

                <div className="field">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                    autoComplete="username"
                  />
                </div>

                <div className="field">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {error && <div className="form-error">{error}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Sign In'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {showFailModal && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true">
          <div className="fail-modal">
            <div className="fail-modal__icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="24" cy="24" r="20" />
                <line x1="24" y1="14" x2="24" y2="26" />
                <circle cx="24" cy="32" r="1.8" />
              </svg>
            </div>
            <div className="fail-modal__content">
              <h2>Login failed</h2>
              <p>We couldn't find that full name in the masterlist. Please double-check the spelling and try again.</p>
            </div>
            <div className="fail-modal__actions">
              <button
                type="button"
                className="fail-modal__button"
                onClick={() => {
                  setShowFailModal(false)
                  setEmployeeForm({ fullName: '' })
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Landing
