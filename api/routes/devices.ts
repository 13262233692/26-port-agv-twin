import { Router, Request, Response } from 'express'
import { modbusService } from '../services/modbusService.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  res.json(modbusService.getAllStates())
})

export default router
