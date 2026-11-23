declare global {
  namespace Express {
    interface Request {
      requestId?: string
      currentUser?: {
        id: string
        communityId: string
        name: string
        email: string
        avatarUrl: string | null
        joinedHostel: boolean
        floor: number | null
        room: string | null
        phone: string | null
        trustScore: number
        onboardingTourCompleted: boolean
      }
      activeCommunity?: { id: string; name: string; type: string; level1Label: string; level2Label: string; level1Options: string[]; joinMode: string }
      communityMember?: { id: string; role: 'admin' | 'member'; status: 'active' | 'pending' | 'removed'; level1Value: string | null; level2Value: string | null; trustScore: number }
    }
  }
}

export {}
