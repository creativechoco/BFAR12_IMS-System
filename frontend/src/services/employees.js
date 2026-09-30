const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export async function createEmployee(payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'string' && value.trim() === '') return
    if (key === 'photoPreview' || key === 'signaturePreview') return
    formData.append(key, value)
  })

  const response = await fetch(`${API_BASE_URL}/employees`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  })

  if (!response.ok) {
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorPayload = await response.json()
        const message = errorPayload?.message || 'Unable to save employee'
        throw new Error(message)
      }
      const text = await response.text()
      throw new Error(text || 'Unable to connect to the server.')
    } catch (err) {
      throw new Error(err?.message || 'Unable to connect to the server.')
    }
  }

  return response.json()
}

export async function deleteEmployee(id) {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorPayload = await response.json()
        const message = errorPayload?.message || 'Unable to delete employee'
        throw new Error(message)
      }
      const text = await response.text()
      throw new Error(text || 'Unable to delete employee')
    } catch (err) {
      throw new Error(err?.message || 'Unable to delete employee')
    }
  }

  return true
}

export async function updateEmployee(id, payload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (typeof value === 'string' && value.trim() === '') return
    if (key === 'photoPreview' || key === 'signaturePreview') return
    formData.append(key, value)
  })

  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'POST',
    headers: { 'X-HTTP-Method-Override': 'PUT', Accept: 'application/json' },
    body: formData,
  })

  if (!response.ok) {
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorPayload = await response.json()
        const message = errorPayload?.message || 'Unable to update employee'
        throw new Error(message)
      }
      const text = await response.text()
      throw new Error(text || 'Unable to connect to the server.')
    } catch (err) {
      throw new Error(err?.message || 'Unable to connect to the server.')
    }
  }

  return response.json()
}

export async function getEmployees() {
  const response = await fetch(`${API_BASE_URL}/employees`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    try {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errorPayload = await response.json()
        const message = errorPayload?.message || 'Unable to load employees'
        throw new Error(message)
      }
      const text = await response.text()
      throw new Error(text || 'Unable to load employees')
    } catch (err) {
      throw new Error(err?.message || 'Unable to load employees')
    }
  }

  return response.json()
}
