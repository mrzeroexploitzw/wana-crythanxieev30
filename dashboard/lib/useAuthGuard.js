import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser } from './api'

// Redirects to /login if there's no logged-in user. Returns the user once
// known, or null while still checking.
export function useAuthGuard() {
  const router = useRouter()
  const [user, setUserState] = useState(undefined)

  useEffect(() => {
    const u = getUser()
    if (!u) {
      router.replace('/login')
    } else {
      setUserState(u)
    }
  }, [router])

  return user
}
