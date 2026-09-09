import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile, execSync } from 'child_process';
import { animateConfig } from '../../config.js';
import { AnimateError } from '../../security.js';
import { AnimateDetector } from './detector.js';
import { AnimateJsflGenerator } from './jsflGenerator.js';
import {
  ANIMATE_BACKEND_IDENTITY,
  ANIMATE_PROTOCOL_VERSION,
  type AnimateBridgeRequest,
  type AnimateBridgeResponse,
  type AnimateEventPayload
} from './protocol.js';

export interface ExecuteOptions {
  timeoutMs?: number;
  documentPath?: string;
  dryRun?: boolean;
}

export class AnimateBridge {
  private static instance: AnimateBridge | null = null;
  private queue: Promise<any> = Promise.resolve();
  private eventListeners: Array<(event: AnimateEventPayload) => void> = [];
  private mockState: Record<string, any> = {
    documents: [],
    activeDocument: null,
    layers: [{ index: 0, name: 'Layer 1', layerType: 'normal', visible: true, locked: false, frameCount: 1 }],
    currentFrame: 0,
    currentLayer: 0,
    library: [],
    selection: []
  };

  public static getInstance(): AnimateBridge {
    if (!AnimateBridge.instance) {
      AnimateBridge.instance = new AnimateBridge();
    }
    return AnimateBridge.instance;
  }

  public resetMockState(): void {
    this.mockState = {
      documents: [],
      activeDocument: null,
      layers: [{ index: 0, name: 'Layer 1', layerType: 'normal', visible: true, locked: false, frameCount: 1 }],
      currentFrame: 0,
      currentLayer: 0,
      library: [],
      selection: []
    };
  }

  public addEventListener(listener: (event: AnimateEventPayload) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener);
    };
  }

  public dispatchEvent(event: AnimateEventPayload): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {}
    }
  }

  /**
   * Execute an Animate command through the bridge.
   * Serializes mutating calls to prevent concurrent race conditions in Animate's single-threaded DOM.
   */
  public async executeCommand<T = any>(
    command: string,
    args: Record<string, any> = {},
    options: ExecuteOptions = {}
  ): Promise<AnimateBridgeResponse<T>> {
    // Chain command to the serialization queue
    const executionPromise = this.queue.then(() => this.runCommandInternal<T>(command, args, options));
    this.queue = executionPromise.catch(() => {});
    return executionPromise;
  }

  public async execute<T = any>(
    command: string,
    args: Record<string, any> = {},
    options: ExecuteOptions = {}
  ): Promise<AnimateBridgeResponse<T>> {
    return this.executeCommand<T>(command, args, options);
  }

  private async runCommandInternal<T = any>(
    command: string,
    args: Record<string, any>,
    options: ExecuteOptions
  ): Promise<AnimateBridgeResponse<T>> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timeoutMs = options.timeoutMs ?? animateConfig.requestTimeoutMs;

    const request: AnimateBridgeRequest = {
      requestId,
      command,
      arguments: args,
      timestamp: new Date().toISOString(),
      protocolVersion: ANIMATE_PROTOCOL_VERSION,
      timeoutMs,
      documentPath: options.documentPath
    };

    const bridgeMode = animateConfig.bridgeMode;

    // 1. Mock execution mode
    if (bridgeMode === 'mock') {
      return this.executeMock<T>(request, startTime);
    }

    // 2. Auto / live / fallback mode
    const system = AnimateDetector.getSystemProfile();

    if (!system.installation.installed) {
      throw new AnimateError(
        'ANIMATE_NOT_INSTALLED',
        'Adobe Animate is not installed or configured. Set ANIMATE_APP_PATH or ANIMATE_BIN.'
      );
    }

    // Ensure bridge directory exists
    const bridgeDir = animateConfig.bridgeDir;
    const requestsDir = path.join(bridgeDir, 'requests');
    const responsesDir = path.join(bridgeDir, 'responses');
    const scriptsDir = path.join(bridgeDir, 'scripts');
    fs.mkdirSync(requestsDir, { recursive: true });
    fs.mkdirSync(responsesDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });

    const runnerScriptPath = path.join(scriptsDir, `runner_${requestId}.jsfl`);
    const responseFilePath = path.join(responsesDir, `resp_${requestId}.json`);

    try {
      // Build typed JSFL script
      const scriptContent = AnimateJsflGenerator.buildRunnerScript({
        command,
        args,
        requestId,
        responseFilePath,
        documentPath: options.documentPath
      });

      fs.writeFileSync(runnerScriptPath, scriptContent, 'utf-8');

      // Dispatch script execution
      await this.dispatchScriptExecution(runnerScriptPath, system, timeoutMs);

      // Wait for response file to be written
      const response = await this.waitForResponseFile<T>(responseFilePath, requestId, timeoutMs, startTime);
      return response;
    } finally {
      // Clean up temporary script and response files safely
      this.safeDelete(runnerScriptPath);
      this.safeDelete(responseFilePath);
    }
  }

  private async dispatchScriptExecution(
    scriptPath: string,
    system: ReturnType<typeof AnimateDetector.getSystemProfile>,
    timeoutMs: number
  ): Promise<void> {
    const platform = process.platform;
    const isRunning = system.running;

    if (platform === 'darwin') {
      const appName = path.basename(system.installation.appPath, '.app') || 'Adobe Animate 2024';
      const escapedScript = scriptPath.replace(/"/g, '\\"');
      const appleScript = `tell application "${appName}" to open POSIX file "${escapedScript}"`;
      try {
        execSync(`osascript -e '${appleScript}'`, { timeout: timeoutMs, stdio: 'ignore' });
        return;
      } catch {
        try {
          execSync(`open -a "${system.installation.appPath}" "${scriptPath}"`, { timeout: timeoutMs, stdio: 'ignore' });
          return;
        } catch (e: any) {
          throw new AnimateError('ANIMATE_BRIDGE_UNAVAILABLE', `Failed to dispatch script to Animate: ${e.message}`);
        }
      }
    } else if (platform === 'win32') {
      const bin = system.installation.binPath;
      if (!bin || !fs.existsSync(bin)) {
        throw new AnimateError('ANIMATE_NOT_INSTALLED', `Animate binary not found: ${bin}`);
      }
      execFile(bin, ['-AlwaysRunJSFL', scriptPath], { timeout: timeoutMs }, () => {});
    } else {
      throw new AnimateError('ANIMATE_UNSUPPORTED_CAPABILITY', `Unsupported operating system for Adobe Animate: ${platform}`);
    }
  }

  private async waitForResponseFile<T>(
    responseFilePath: string,
    requestId: string,
    timeoutMs: number,
    startTime: number
  ): Promise<AnimateBridgeResponse<T>> {
    const pollInterval = 50;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (fs.existsSync(responseFilePath)) {
        try {
          const content = fs.readFileSync(responseFilePath, 'utf-8');
          const trimmed = content.trim();
          if (trimmed.endsWith('}') || trimmed.endsWith(']')) {
            let parsed: any;
            try {
              parsed = JSON.parse(trimmed);
            } catch {
              // Sanitize raw control characters in error stack strings
              const sanitized = trimmed.replace(/[\u0000-\u001F]+/g, m => {
                if (m === '\n') return '\\n';
                if (m === '\r') return '\\r';
                if (m === '\t') return '\\t';
                return '';
              });
              parsed = JSON.parse(sanitized);
            }
            if (parsed && parsed.requestId === requestId) {
              if (!parsed.success && parsed.error) {
                throw new AnimateError(parsed.error.code || 'ANIMATE_JSFL_ERROR', parsed.error.message, parsed.error);
              }
              return parsed as AnimateBridgeResponse<T>;
            }
          }
        } catch (e: any) {
          if (e instanceof AnimateError) throw e;
          // Incomplete write, retry on next poll tick
        }
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new AnimateError(
      'ANIMATE_SCRIPT_TIMEOUT',
      `Command execution timed out after ${timeoutMs}ms waiting for response: ${requestId}`
    );
  }

  private executeMock<T>(request: AnimateBridgeRequest, startTime: number): AnimateBridgeResponse<T> {
    const cmd = request.command;
    const args = request.arguments || {};
    let result: any = null;

    switch (cmd) {
      case 'system_status':
        result = {
          version: '24.0.3 (Mock)',
          hasActiveDocument: Boolean(this.mockState.activeDocument),
          activeDocumentName: this.mockState.activeDocument?.name ?? null,
          activeDocumentPath: this.mockState.activeDocument?.path ?? null,
          openDocumentsCount: this.mockState.documents.length,
          openDocuments: this.mockState.documents
        };
        break;

      case 'get_version':
        result = { version: '24.0.3 (Mock)' };
        break;

      case 'ping':
        result = { pong: true, timestamp: new Date().toISOString(), version: '24.0.3 (Mock)' };
        break;

      case 'get_active_document':
        result = this.mockState.activeDocument
          ? {
              ...this.mockState.activeDocument,
              currentFrame: this.mockState.currentFrame,
              frameCount: this.mockState.layers[0]?.frameCount ?? 1,
              layerCount: this.mockState.layers.length
            }
          : null;
        break;

      case 'list_open_documents':
        result = { count: this.mockState.documents.length, documents: this.mockState.documents };
        break;

      case 'create_document': {
        const doc = {
          name: args.name || 'Untitled-1.fla',
          path: '',
          width: args.width || 1920,
          height: args.height || 1080,
          frameRate: args.frameRate || 24,
          backgroundColor: args.backgroundColor || '#FFFFFF'
        };
        this.mockState.documents.push(doc);
        this.mockState.activeDocument = doc;
        this.mockState.layers = [{ index: 0, name: 'Layer 1', layerType: 'normal', visible: true, locked: false, frameCount: 1 }];
        this.mockState.currentFrame = 0;
        this.mockState.currentLayer = 0;
        result = doc;
        break;
      }

      case 'open_document': {
        const doc = {
          name: path.basename(args.uri || 'doc.fla'),
          path: args.uri || '',
          width: 1920,
          height: 1080,
          frameRate: 24
        };
        this.mockState.documents.push(doc);
        this.mockState.activeDocument = doc;
        result = doc;
        break;
      }

      case 'inspect_document':
        if (!this.mockState.activeDocument) throw new AnimateError('ANIMATE_NO_DOCUMENT', 'No active document');
        result = {
          ...this.mockState.activeDocument,
          currentScene: 'Scene 1',
          currentFrame: this.mockState.currentFrame,
          frameCount: this.mockState.layers[0]?.frameCount ?? 1,
          layers: this.mockState.layers,
          libraryItemsCount: this.mockState.library.length
        };
        break;

      case 'save_document':
        if (!this.mockState.activeDocument) throw new AnimateError('ANIMATE_NO_DOCUMENT', 'No active document');
        result = { saved: true, name: this.mockState.activeDocument.name, path: this.mockState.activeDocument.path };
        break;

      case 'save_as_document':
        if (!this.mockState.activeDocument) throw new AnimateError('ANIMATE_NO_DOCUMENT', 'No active document');
        this.mockState.activeDocument.path = args.uri;
        this.mockState.activeDocument.name = path.basename(args.uri);
        result = { saved: true, name: this.mockState.activeDocument.name, uri: args.uri };
        break;

      case 'close_document':
        this.mockState.documents = this.mockState.documents.filter((d: any) => d !== this.mockState.activeDocument);
        this.mockState.activeDocument = this.mockState.documents[0] || null;
        result = { closed: true };
        break;

      case 'set_document_size':
        if (!this.mockState.activeDocument) throw new AnimateError('ANIMATE_NO_DOCUMENT', 'No active document');
        if (args.width) this.mockState.activeDocument.width = args.width;
        if (args.height) this.mockState.activeDocument.height = args.height;
        result = { width: this.mockState.activeDocument.width, height: this.mockState.activeDocument.height };
        break;

      case 'set_frame_rate':
        if (!this.mockState.activeDocument) throw new AnimateError('ANIMATE_NO_DOCUMENT', 'No active document');
        if (args.frameRate) this.mockState.activeDocument.frameRate = args.frameRate;
        result = { frameRate: this.mockState.activeDocument.frameRate };
        break;

      case 'inspect_timeline':
        result = {
          sceneName: 'Scene 1',
          currentFrame: this.mockState.currentFrame,
          frameCount: this.mockState.layers[0]?.frameCount ?? 1,
          layerCount: this.mockState.layers.length,
          currentLayer: this.mockState.currentLayer,
          layers: this.mockState.layers
        };
        break;

      case 'list_layers':
        result = { layers: this.mockState.layers };
        break;

      case 'create_layer': {
        const newLayer = {
          index: this.mockState.layers.length,
          name: args.name || `Layer ${this.mockState.layers.length + 1}`,
          layerType: args.layerType || 'normal',
          visible: true,
          locked: false,
          frameCount: 1
        };
        this.mockState.layers.push(newLayer);
        this.mockState.currentLayer = newLayer.index;
        result = newLayer;
        break;
      }

      case 'delete_layer': {
        const idx = args.layerIndex !== undefined ? args.layerIndex : this.mockState.currentLayer;
        this.mockState.layers = this.mockState.layers.filter((l: any, i: number) => i !== idx);
        result = { deletedIndex: idx, remainingLayers: this.mockState.layers.length };
        break;
      }

      case 'rename_layer': {
        const idx = args.layerIndex !== undefined ? args.layerIndex : this.mockState.currentLayer;
        const target = this.mockState.layers[idx];
        if (!target) throw new AnimateError('ANIMATE_INVALID_ARGUMENT', `Layer ${idx} not found`);
        const oldName = target.name;
        target.name = args.name;
        result = { layerIndex: idx, oldName, newName: target.name };
        break;
      }

      case 'set_current_frame':
        this.mockState.currentFrame = args.frame;
        result = { currentFrame: this.mockState.currentFrame };
        break;

      case 'insert_keyframe': {
        const f = args.frame !== undefined ? args.frame : this.mockState.currentFrame;
        const curL = this.mockState.layers[this.mockState.currentLayer];
        if (curL && curL.frameCount <= f) curL.frameCount = f + 1;
        result = { frame: f, layerIndex: this.mockState.currentLayer };
        break;
      }

      case 'list_library_items':
        result = { count: this.mockState.library.length, items: this.mockState.library };
        break;

      case 'create_symbol': {
        const item = { name: args.name, itemType: args.type || 'movie clip' };
        this.mockState.library.push(item);
        result = item;
        break;
      }

      case 'inspect_selection':
        result = { count: this.mockState.selection.length, elements: this.mockState.selection };
        break;

      case 'create_shape': {
        const shape = {
          elementType: 'shape',
          shapeType: args.shapeType || 'rectangle',
          x: args.x || 0,
          y: args.y || 0,
          width: args.width || 100,
          height: args.height || 100
        };
        this.mockState.selection = [shape];
        result = { shapeType: shape.shapeType, bounds: shape };
        break;
      }

      case 'create_text': {
        const txt = {
          elementType: 'text',
          text: args.text || '',
          x: args.x || 0,
          y: args.y || 0,
          width: args.width || 200,
          height: args.height || 50
        };
        this.mockState.selection = [txt];
        result = { text: txt.text, bounds: txt };
        break;
      }

      case 'transform_selection':
        result = { transformedCount: this.mockState.selection.length, elements: this.mockState.selection };
        break;

      case 'create_tween':
        result = { tweenType: args.tweenType || 'motion', layerIndex: this.mockState.currentLayer };
        break;

      case 'import_audio':
        result = { importedAudio: args.uri };
        break;

      case 'place_audio_on_timeline':
        result = { soundName: args.soundName, soundSync: args.soundSync || 'stream', frame: args.frame || 0 };
        break;

      case 'camera_status':
        result = { supported: false, sceneName: 'Scene 1', note: 'Camera API not exposed in mock' };
        break;

      case 'publish_document':
        result = { published: true, name: this.mockState.activeDocument?.name || 'mock.fla' };
        break;

      case 'export_image':
        result = { exportedUri: args.uri, currentFrameOnly: true };
        break;

      case 'export_video':
        result = { exportedVideoUri: args.uri };
        break;

      case 'export_sprite_sheet':
        result = { exportedSpriteSheet: args.uri };
        break;

      default:
        result = { status: 'mock_success', command: cmd, args };
    }

    return {
      requestId: request.requestId,
      success: true,
      result: result as T,
      animateVersion: '24.0.3 (Mock)',
      documentPath: this.mockState.activeDocument?.path,
      durationMs: Date.now() - startTime,
      backendIdentity: ANIMATE_BACKEND_IDENTITY
    };
  }

  private safeDelete(targetPath: string): void {
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    } catch {}
  }
}
