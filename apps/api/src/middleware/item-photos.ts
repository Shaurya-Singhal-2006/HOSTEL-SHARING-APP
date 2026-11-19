import type { RequestHandler } from 'express'
import multer from 'multer'
import { HttpError } from '../lib/errors.js'

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 12, fieldSize: 64 * 1024, parts: 16 },
})

export const parseItemPhotos: RequestHandler = (req, res, next) => {
  parser.array('photos', 3)(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'Each photo must be 5 MB or smaller.'))
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new HttpError(400, 'An item can have no more than 3 photos.'))
      }
      return next(new HttpError(400, 'The upload form could not be read.'))
    }
    if (error) return next(error)
    next()
  })
}
