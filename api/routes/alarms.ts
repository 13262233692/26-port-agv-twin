import { Router, Request, Response } from 'express'
import { getAlarms } from '../services/yardService.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(getAlarms())
})

export default router
