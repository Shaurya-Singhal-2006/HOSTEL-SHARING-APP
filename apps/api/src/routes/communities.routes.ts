import { Router } from 'express'
import { changeMember, createCommunity, getCommunity, joinCommunity, leaveCommunity, listMembers, myCommunities, regenerateInvite, updateCommunity, updateCommunityProfile } from '../controllers/communities.controller.js'
import { communityCreateLimit, communityJoinIpLimit, communityJoinUserLimit } from '../middleware/community-rate-limit.js'
import { requireAuth, requireCommunity } from '../middleware/auth.js'

export const communitiesRouter = Router()
communitiesRouter.use(requireAuth)
communitiesRouter.get('/mine', myCommunities)
communitiesRouter.post('/', communityCreateLimit, createCommunity)
communitiesRouter.post('/join', communityJoinIpLimit, communityJoinUserLimit, joinCommunity)
communitiesRouter.use('/:id', requireCommunity)
communitiesRouter.get('/:id', getCommunity)
communitiesRouter.patch('/:id', updateCommunity)
communitiesRouter.post('/:id/regenerate-code', regenerateInvite)
communitiesRouter.get('/:id/members', listMembers)
communitiesRouter.patch('/:id/members/:userId', changeMember)
communitiesRouter.patch('/:id/me', updateCommunityProfile)
communitiesRouter.post('/:id/leave', leaveCommunity)
