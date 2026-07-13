import { Router } from 'express'

export function makeConfigRouter() {
  const router = Router()

  router.get('/', (_req, res) => {
    res.json({
      tiandituKey: process.env.TIANDITU_KEY || '',
      ionToken: process.env.CESIUM_ION_TOKEN || '',
    })
  })

  return router
}
