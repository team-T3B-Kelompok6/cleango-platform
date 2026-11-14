import express, { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  requireCustomer,
} from '../../middleware/auth.middleware.js';
import { AppError } from '../../lib/AppError.js';
import { getEnv } from '../../config/env.js';
import {
  normalizePhoto,
  PHOTO_MAX_BYTES,
  PHOTO_TYPES,
} from '../../lib/photo-image.js';
import { analyzeWithGroq } from '../../lib/groq-vision.js';
import {
  parsePhotoAnalysis,
  photoAnalysisResult,
} from '../../lib/photo-analysis.js';

export function createPhotoRouter() {
  const router = Router();
  // shortcut: per-process limits; use shared gateway limits before adding replicas.
  const limits = new Map<number, { count: number; until: number }>();
  let active = 0;
  const parser = express.raw({
    type: PHOTO_TYPES,
    limit: PHOTO_MAX_BYTES,
    inflate: false,
  });
  router.post('/', authenticate, requireCustomer, (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!getEnv().CHATBOT_VISION_ENABLED)
      return next(
        new AppError(
          503,
          'Analisis foto belum diaktifkan. Gunakan chat teks.',
          'VISION_DISABLED',
        ),
      );
    if (Object.keys(req.query).length)
      return next(
        new AppError(
          400,
          'Kirim foto tanpa keterangan tambahan.',
          'VALIDATION_ERROR',
        ),
      );
    const mime = req.get('Content-Type')?.toLowerCase();
    if (
      !mime ||
      !PHOTO_TYPES.includes(mime) ||
      (req.get('Content-Encoding') &&
        req.get('Content-Encoding') !== 'identity')
    )
      return next(
        new AppError(
          415,
          'Gunakan foto JPG, PNG, atau WebP.',
          'UNSUPPORTED_IMAGE_TYPE',
        ),
      );
    const now = Date.now();
    for (const [id, entry] of limits) if (entry.until <= now) limits.delete(id);
    const id = req.user!.id;
    const entry = limits.get(id);
    if (entry && entry.count >= 3) {
      res.setHeader('Retry-After', Math.ceil((entry.until - now) / 1000));
      return next(
        new AppError(
          429,
          'Maksimal tiga analisis foto per menit. Coba lagi nanti.',
          'PHOTO_RATE_LIMIT',
        ),
      );
    }
    if (active >= 2 || limits.size >= 5000)
      return next(
        new AppError(
          503,
          'Analisis foto sedang sibuk. Coba lagi nanti.',
          'VISION_BUSY',
        ),
      );
    limits.set(id, {
      count: (entry?.count ?? 0) + 1,
      until: entry?.until ?? now + 60_000,
    });
    active++;
    let released = false;
    let processing = false;
    let expired = false;
    const controller = new AbortController();
    const clearBody = () => {
      if (Buffer.isBuffer(req.body)) req.body.fill(0);
      req.body = undefined;
    };
    const release = () => {
      if (released) return;
      released = true;
      active--;
      clearTimeout(timer);
      clearBody();
      req.off('aborted', aborted);
      res.off('close', closed);
    };
    const aborted = () => {
      expired = true;
      controller.abort();
    };
    const closed = () => {
      if (!res.writableFinished) {
        expired = true;
        controller.abort();
        if (!processing) req.destroy();
      }
    };
    const timer = setTimeout(() => {
      expired = true;
      controller.abort();
      // Abort timed-out upload after flushing error; parser callback owns slot release.
      if (!processing) res.once('finish', () => req.destroy());
      if (!res.headersSent)
        res.status(504).json({
          message: 'Analisis foto melewati batas waktu. Coba lagi.',
          code: 'VISION_TIMEOUT',
        });
    }, 45_000);
    req.on('aborted', aborted);
    res.on('close', closed);
    parser(req, res, (error?: unknown) => {
      if (error) {
        release();
        if (expired || res.headersSent) return;
        const tooLarge =
          (error as { type?: string }).type === 'entity.too.large';
        return next(
          new AppError(
            tooLarge ? 413 : 400,
            tooLarge
              ? 'Ukuran foto maksimal 5 MB.'
              : 'Foto tidak dapat dibaca. Coba pilih foto lain.',
            tooLarge ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE',
          ),
        );
      }
      if (expired || released) {
        release();
        return;
      }
      processing = true;
      void (async () => {
        let normalized: Buffer | undefined;
        try {
          if (!Buffer.isBuffer(req.body) || !req.body.length)
            throw new AppError(
              400,
              'Kirim satu foto untuk dianalisis.',
              'INVALID_IMAGE',
            );
          normalized = await normalizePhoto(req.body, mime);
          clearBody();
          if (expired) return;
          const analysis = parsePhotoAnalysis(
            await analyzeWithGroq(
              normalized,
              Math.max(1, Math.min(30_000, now + 45_000 - Date.now())),
              controller.signal,
            ),
          );
          normalized.fill(0);
          normalized = undefined;
          if (expired) return;
          if (!expired)
            res.status(200).json({ data: photoAnalysisResult(analysis) });
        } catch (error) {
          if (!expired)
            next(
              error instanceof AppError
                ? error
                : new AppError(
                    503,
                    'Analisis foto sementara tidak tersedia.',
                    'VISION_UNAVAILABLE',
                  ),
            );
        } finally {
          normalized?.fill(0);
          release();
        }
      })();
    });
  });
  return router;
}

export const customerPhotoRouter = createPhotoRouter();
