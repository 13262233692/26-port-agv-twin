import { Router, Request, Response } from 'express'
import { yardLayout } from '../config/yardLayout.js'
import { generateContainerStates, getYardStats } from '../services/yardService.js'

const router = Router()

router.get('/stats', (_req: Request, res: Response) => {
  const containers = generateContainerStates(yardLayout)
  res.json(getYardStats(containers, yardLayout))
})

router.get('/layout', (_req: Request, res: Response) => {
  res.json(yardLayout)
})

export default router
