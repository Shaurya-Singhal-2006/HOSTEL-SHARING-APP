declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string
        communityId: string
        name: string
        email: string
        avatarUrl: string | null
        joinedHostel: boolean
        block: string | null
        floor: number | null
        room: string | null
        phone: string | null
        trustScore: number
      }
    }
  }
}

export {}
