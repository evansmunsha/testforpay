export interface User {
  id: string
  email: string
  name: string | null
  role: 'DEVELOPER' | 'TESTER' | 'ADMIN'
  emailVerified: boolean
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
  name?: string
  role: 'DEVELOPER' | 'TESTER'
}

export interface AuthResponse {
  success: boolean
  user: User
  message?: string
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
}