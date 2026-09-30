const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export async function employeeLogin(fullName) {
  const response = await fetch(`${API_BASE_URL}/employee/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ full_name: fullName }),
  })

  if (!response.ok) {
    let errorPayload
    try {
      errorPayload = await response.json()
    } catch (error) {
      throw new Error('Unable to connect to the server.')
    }

    throw new Error(errorPayload?.message || 'Authentication failed')
  }

  return response.json()
}

export async function adminLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    let errorPayload
    try {
      errorPayload = await response.json()
    } catch (error) {
      throw new Error('Unable to connect to the server.')
    }

    throw new Error(errorPayload?.message || 'Authentication failed')
  }

  return response.json()
}