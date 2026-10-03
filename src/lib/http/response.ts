import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';

export function jsonResponse<T>(data: T, meta?: any, status = 200) {
  const body: any = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input tidak valid',
          details: error.errors.map((e) => ({
            path: e.path,
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  console.error('Unhandled API Error:', error);
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: message || 'Terjadi kesalahan pada server',
      },
    },
    { status: 500 }
  );
}
