import { z } from 'zod';

export const ANIMATE_PROTOCOL_VERSION = '1.0' as const;
export const ANIMATE_BACKEND_IDENTITY = 'adobe_animate' as const;

export type AnimateEventType =
  | 'documentOpened'
  | 'documentClosed'
  | 'documentSaved'
  | 'documentChanged'
  | 'timelineChanged'
  | 'frameChanged'
  | 'layerChanged'
  | 'selectionChanged';

export interface AnimateEventPayload {
  eventType: AnimateEventType;
  timestamp: string;
  documentPath?: string;
  documentName?: string;
  sceneName?: string;
  frame?: number;
  layerIndex?: number;
  layerName?: string;
  selectionCount?: number;
  details?: Record<string, any>;
}

export interface AnimateBridgeRequest<T = any> {
  requestId: string;
  command: string;
  arguments: T;
  timestamp: string;
  protocolVersion: typeof ANIMATE_PROTOCOL_VERSION;
  timeoutMs: number;
  documentPath?: string;
}

export interface AnimateBridgeError {
  code: string;
  message: string;
  stack?: string;
  details?: any;
}

export interface AnimateBridgeResponse<T = any> {
  requestId: string;
  success: boolean;
  result?: T;
  error?: AnimateBridgeError;
  warnings?: string[];
  animateVersion?: string;
  documentPath?: string;
  durationMs: number;
  backendIdentity: typeof ANIMATE_BACKEND_IDENTITY;
}

export const animateBridgeRequestSchema = z.object({
  requestId: z.string().min(1),
  command: z.string().min(1),
  arguments: z.record(z.any()).default({}),
  timestamp: z.string(),
  protocolVersion: z.literal(ANIMATE_PROTOCOL_VERSION),
  timeoutMs: z.number().int().positive(),
  documentPath: z.string().optional()
});

export const animateBridgeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  details: z.any().optional()
});

export const animateBridgeResponseSchema = z.object({
  requestId: z.string().min(1),
  success: z.boolean(),
  result: z.any().optional(),
  error: animateBridgeErrorSchema.optional(),
  warnings: z.array(z.string()).optional(),
  animateVersion: z.string().optional(),
  documentPath: z.string().optional(),
  durationMs: z.number().nonnegative(),
  backendIdentity: z.literal(ANIMATE_BACKEND_IDENTITY)
});
