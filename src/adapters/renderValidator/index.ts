import fs from 'fs';
import path from 'path';

export interface RenderValidationResult {
  fileExists: boolean;
  fileSizeBytes: number;
  extension: string;
  isLikelyValidVideo: boolean | 'unknown';
  isLikelyValidImage: boolean | 'unknown';
  renderedBy: 'harmony_cli' | 'simulation' | 'unknown';
  createdAt: string;
  reason?: string;
}

export class RenderOutputValidator {
  validate(filePath: string, expectedRenderer?: 'harmony_cli' | 'simulation' | 'unknown'): RenderValidationResult {
    if (!fs.existsSync(filePath)) {
      return {
        fileExists: false,
        fileSizeBytes: 0,
        extension: path.extname(filePath).toLowerCase(),
        isLikelyValidVideo: false,
        isLikelyValidImage: false,
        renderedBy: expectedRenderer || 'unknown',
        createdAt: '',
        reason: 'File does not exist on disk.'
      };
    }

    const stats = fs.statSync(filePath);
    const size = stats.size;
    const ext = path.extname(filePath).toLowerCase();
    const createdAt = stats.birthtime.toISOString();

    if (size === 0) {
      return {
        fileExists: true,
        fileSizeBytes: 0,
        extension: ext,
        isLikelyValidVideo: false,
        isLikelyValidImage: false,
        renderedBy: expectedRenderer || 'unknown',
        createdAt,
        reason: 'File size is 0 bytes.'
      };
    }

    // Read the first 64 bytes to check signature
    let buffer: Buffer;
    try {
      const fd = fs.openSync(filePath, 'r');
      buffer = Buffer.alloc(64);
      fs.readSync(fd, buffer, 0, 64, 0);
      fs.closeSync(fd);
    } catch (e: any) {
      return {
        fileExists: true,
        fileSizeBytes: size,
        extension: ext,
        isLikelyValidVideo: 'unknown',
        isLikelyValidImage: 'unknown',
        renderedBy: expectedRenderer || 'unknown',
        createdAt,
        reason: `Could not read file header: ${e.message}`
      };
    }

    // Check if the file content is actually a simulation placeholder text
    const textHeader = buffer.toString('utf8').trim();
    if (
      textHeader.startsWith('SIMULATED_VIDEO_STREAM') || 
      textHeader.startsWith('This is not a real rendered video') ||
      textHeader.startsWith('SIMULATED')
    ) {
      return {
        fileExists: true,
        fileSizeBytes: size,
        extension: ext,
        isLikelyValidVideo: false,
        isLikelyValidImage: false,
        renderedBy: 'simulation',
        createdAt,
        reason: 'File contains simulation placeholder text instead of real binary data.'
      };
    }

    // Detect image signatures
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    
    // Detect video signatures
    // MP4 usually has "ftyp" at offset 4 (bytes 4-7: 66 74 79 70)
    const isMp4 = buffer.toString('ascii', 4, 8) === 'ftyp';
    const isMov = buffer.toString('ascii', 4, 8) === 'moov' || buffer.toString('ascii', 4, 8) === 'wide' || buffer.toString('ascii', 8, 12) === 'qt  ';

    let isLikelyValidVideo: boolean | 'unknown' = 'unknown';
    let isLikelyValidImage: boolean | 'unknown' = 'unknown';

    if (ext === '.mp4' || ext === '.mov' || ext === '.avi') {
      isLikelyValidVideo = isMp4 || isMov;
      isLikelyValidImage = false;
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      isLikelyValidImage = isPng || isJpeg;
      isLikelyValidVideo = false;
    }

    let detectedRenderer: 'harmony_cli' | 'simulation' | 'unknown' = expectedRenderer || 'unknown';
    if (textHeader.startsWith('SIMULATED')) {
      detectedRenderer = 'simulation';
    }

    return {
      fileExists: true,
      fileSizeBytes: size,
      extension: ext,
      isLikelyValidVideo,
      isLikelyValidImage,
      renderedBy: detectedRenderer,
      createdAt
    };
  }
}
