import path from 'path';

export class AnimateJsflGenerator {
  public static pathToURI(filePath: string): string {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    if (process.platform === 'win32') {
      // Windows: C:/path/to/file -> file:///C|/path/to/file
      const driveMatch = normalized.match(/^([a-zA-Z]):\/(.*)$/);
      if (driveMatch) {
        return `file:///${driveMatch[1]}|/${driveMatch[2]}`;
      }
    }
    return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }

  public static uriToPath(uri: string): string {
    if (!uri.startsWith('file://')) return uri;
    let clean = uri.replace(/^file:\/\/\/?/, '');
    if (process.platform === 'win32') {
      // file:///C|/path/to/file -> C:/path/to/file
      const driveMatch = clean.match(/^([a-zA-Z])\|?\/(.*)$/);
      if (driveMatch) {
        return `${driveMatch[1]}:/${driveMatch[2]}`;
      }
    }
    return `/${clean}`;
  }

  public static escapeString(val: string): string {
    return JSON.stringify(val);
  }

  /**
   * Generates a complete standalone JSFL runner script that executes a command
   * and writes the structured result to a response file.
   */
  public static buildRunnerScript(options: {
    command: string;
    args: Record<string, any>;
    requestId: string;
    responseFilePath: string;
    documentPath?: string;
  }): string {
    const responseUri = this.pathToURI(options.responseFilePath);
    const commandName = options.command;
    const argsJson = JSON.stringify(options.args);
    const requestId = options.requestId;
    const docUri = options.documentPath ? this.pathToURI(options.documentPath) : '';

    const commandBody = this.getCommandBody(commandName);

    return `(function() {
  // Ensure JSON exists in JSFL context
  if (typeof JSON === 'undefined') {
    JSON = {
      stringify: function(obj) {
        if (obj === null) return 'null';
        if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
        if (typeof obj === 'string') {
          return '"' + obj
            .replace(/\\\\/g, '\\\\\\\\')
            .replace(/"/g, '\\\\"')
            .replace(/\\r/g, '\\\\r')
            .replace(/\\n/g, '\\\\n')
            .replace(/\\t/g, '\\\\t') + '"';
        }
        if (obj instanceof Array) {
          var arr = [];
          for (var i = 0; i < obj.length; i++) arr.push(JSON.stringify(obj[i]));
          return '[' + arr.join(',') + ']';
        }
        if (typeof obj === 'object') {
          var pairs = [];
          for (var k in obj) {
            if (obj.hasOwnProperty(k)) pairs.push('"' + k + '":' + JSON.stringify(obj[k]));
          }
          return '{' + pairs.join(',') + '}';
        }
        return 'null';
      },
      parse: function(str) { return eval('(' + str + ')'); }
    };
  }

  var startTime = new Date().getTime();
  var requestId = ${this.escapeString(requestId)};
  var command = ${this.escapeString(commandName)};
  var responseFile = ${this.escapeString(responseUri)};
  var targetDocUri = ${this.escapeString(docUri)};
  var rawArgs = ${this.escapeString(argsJson)};
  var args = JSON.parse(rawArgs);

  var envelope = {
    requestId: requestId,
    success: false,
    backendIdentity: "adobe_animate",
    animateVersion: (typeof fl !== 'undefined' && fl.version) ? fl.version : "unknown",
    durationMs: 0
  };

  try {
    if (targetDocUri) {
      var foundDoc = null;
      if (fl.documents && fl.documents.length) {
        for (var d = 0; d < fl.documents.length; d++) {
          if (fl.documents[d].pathURI === targetDocUri || fl.documents[d].path === targetDocUri) {
            foundDoc = fl.documents[d];
            break;
          }
        }
      }
      if (!foundDoc) {
        foundDoc = fl.openDocument(targetDocUri);
      }
    }

    // Ensure getDocumentDOM falls back to open documents if window focus was lost
    if (typeof fl !== 'undefined' && fl.getDocumentDOM) {
      var _origGetDocDOM = fl.getDocumentDOM;
      fl.getDocumentDOM = function() {
        var d = null;
        try { d = _origGetDocDOM.call(fl); } catch(e) {}
        if (!d && fl.documents && fl.documents.length > 0) {
          d = fl.documents[0];
        }
        return d;
      };
    }

    var dom = fl.getDocumentDOM();

    // Command execution
    var result = (function() {
      ${commandBody}
    })();

    envelope.success = true;
    envelope.result = result;
    if (dom) {
      envelope.documentPath = dom.path || dom.pathURI || dom.name;
    }
  } catch(err) {
    envelope.success = false;
    envelope.error = {
      code: "ANIMATE_JSFL_ERROR",
      message: (err && err.message) ? err.message : String(err),
      stack: (err && err.stack) ? err.stack : ""
    };
  } finally {
    envelope.durationMs = new Date().getTime() - startTime;
    if (typeof FLfile !== 'undefined' && responseFile) {
      var parentFolder = responseFile.substring(0, responseFile.lastIndexOf('/'));
      if (!FLfile.exists(parentFolder)) {
        FLfile.createFolder(parentFolder);
      }
      FLfile.write(responseFile, JSON.stringify(envelope));
    }
  }
})();
`;
  }

  public static getCommandBody(command: string): string {
    switch (command) {
      // ---------------- SYSTEM ----------------
      case 'system_status':
        return `
          var dom = fl.getDocumentDOM();
          var docs = [];
          if (fl.documents) {
            for (var i = 0; i < fl.documents.length; i++) {
              docs.push({
                name: fl.documents[i].name,
                path: fl.documents[i].path || fl.documents[i].pathURI || "",
                width: fl.documents[i].width,
                height: fl.documents[i].height
              });
            }
          }
          return {
            version: fl.version,
            hasActiveDocument: Boolean(dom),
            activeDocumentName: dom ? dom.name : null,
            activeDocumentPath: dom ? (dom.path || dom.pathURI || null) : null,
            openDocumentsCount: docs.length,
            openDocuments: docs
          };
        `;

      case 'get_version':
        return `return { version: fl.version };`;

      case 'ping':
        return `return { pong: true, timestamp: new Date().toISOString(), version: fl.version };`;

      case 'get_active_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) return null;
          var tl = dom.getTimeline();
          return {
            name: dom.name,
            path: dom.path || dom.pathURI || "",
            width: dom.width,
            height: dom.height,
            frameRate: dom.frameRate,
            backgroundColor: dom.backgroundColor,
            currentScene: tl ? tl.name : null,
            currentFrame: tl ? tl.currentFrame : 0,
            frameCount: tl ? tl.frameCount : 0,
            layerCount: tl ? tl.layerCount : 0
          };
        `;

      case 'list_open_documents':
        return `
          var docs = [];
          if (fl.documents) {
            for (var i = 0; i < fl.documents.length; i++) {
              var d = fl.documents[i];
              docs.push({
                name: d.name,
                path: d.path || d.pathURI || "",
                width: d.width,
                height: d.height,
                frameRate: d.frameRate
              });
            }
          }
          return { count: docs.length, documents: docs };
        `;

      // ---------------- DOCUMENT ----------------
      case 'create_document':
        return `
          var docType = args.docType || "timeline";
          var newDoc = fl.createDocument(docType);
          if (!newDoc) throw new Error("Failed to create new document");
          if (args.width) newDoc.width = args.width;
          if (args.height) newDoc.height = args.height;
          if (args.frameRate) newDoc.frameRate = args.frameRate;
          if (args.backgroundColor) newDoc.backgroundColor = args.backgroundColor;
          return {
            name: newDoc.name,
            width: newDoc.width,
            height: newDoc.height,
            frameRate: newDoc.frameRate,
            backgroundColor: newDoc.backgroundColor
          };
        `;

      case 'open_document':
        return `
          var uri = args.uri;
          if (!uri) throw new Error("Document URI or path is required");
          var doc = fl.openDocument(uri);
          if (!doc) throw new Error("Failed to open document at URI: " + uri);
          return {
            name: doc.name,
            path: doc.path || doc.pathURI || uri,
            width: doc.width,
            height: doc.height,
            frameRate: doc.frameRate
          };
        `;

      case 'inspect_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document to inspect");
          var tl = dom.getTimeline();
          var layers = [];
          if (tl && tl.layers) {
            for (var l = 0; l < tl.layers.length; l++) {
              var ly = tl.layers[l];
              layers.push({
                index: l,
                name: ly.name,
                layerType: ly.layerType,
                visible: ly.visible,
                locked: ly.locked,
                frameCount: ly.frameCount
              });
            }
          }
          var libCount = (dom.library && dom.library.items) ? dom.library.items.length : 0;
          return {
            name: dom.name,
            path: dom.path || dom.pathURI || "",
            width: dom.width,
            height: dom.height,
            frameRate: dom.frameRate,
            backgroundColor: dom.backgroundColor,
            currentScene: tl ? tl.name : null,
            currentFrame: tl ? tl.currentFrame : 0,
            frameCount: tl ? tl.frameCount : 0,
            layers: layers,
            libraryItemsCount: libCount
          };
        `;

      case 'save_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document to save");
          var ok = dom.save();
          return { saved: Boolean(ok), name: dom.name, path: dom.path || dom.pathURI || "" };
        `;

      case 'save_as_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document to save");
          var targetUri = args.uri;
          if (!targetUri) throw new Error("Target URI is required for save_as");
          var ok = fl.saveDocument(dom, targetUri);
          return { saved: Boolean(ok), name: dom.name, uri: targetUri };
        `;

      case 'close_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) return { closed: false, message: "No active document" };
          var promptToSave = Boolean(args.promptToSave);
          var name = dom.name;
          fl.closeDocument(dom, promptToSave);
          return { closed: true, name: name };
        `;

      case 'set_document_size':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (args.width) dom.width = args.width;
          if (args.height) dom.height = args.height;
          return { width: dom.width, height: dom.height };
        `;

      case 'set_frame_rate':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (args.frameRate) dom.frameRate = args.frameRate;
          return { frameRate: dom.frameRate };
        `;

      case 'set_document_properties':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (args.width) dom.width = args.width;
          if (args.height) dom.height = args.height;
          if (args.frameRate) dom.frameRate = args.frameRate;
          if (args.backgroundColor) dom.backgroundColor = args.backgroundColor;
          return {
            width: dom.width,
            height: dom.height,
            frameRate: dom.frameRate,
            backgroundColor: dom.backgroundColor
          };
        `;

      // ---------------- TIMELINE ----------------
      case 'inspect_timeline':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (!tl) throw new Error("No active timeline");
          var layers = [];
          for (var i = 0; i < tl.layers.length; i++) {
            var ly = tl.layers[i];
            layers.push({
              index: i,
              name: ly.name,
              layerType: ly.layerType,
              visible: ly.visible,
              locked: ly.locked,
              frameCount: ly.frameCount
            });
          }
          return {
            sceneName: tl.name,
            currentFrame: tl.currentFrame,
            frameCount: tl.frameCount,
            layerCount: tl.layerCount,
            currentLayer: tl.currentLayer,
            layers: layers
          };
        `;

      case 'list_layers':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var res = [];
          for (var i = 0; i < tl.layers.length; i++) {
            var l = tl.layers[i];
            res.push({
              index: i,
              name: l.name,
              layerType: l.layerType,
              visible: l.visible,
              locked: l.locked,
              frameCount: l.frameCount
            });
          }
          return { layers: res };
        `;

      case 'create_layer':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var name = args.name || "Layer";
          var layerType = args.layerType || "normal";
          var bAddAbove = args.addAbove !== undefined ? args.addAbove : true;
          var newIndex = tl.addNewLayer(name, layerType, bAddAbove);
          var created = tl.layers[newIndex];
          return {
            index: newIndex,
            name: created ? created.name : name,
            layerType: created ? created.layerType : layerType
          };
        `;

      case 'delete_layer':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var layerIndex = args.layerIndex;
          if (layerIndex === undefined) layerIndex = tl.currentLayer;
          tl.deleteLayer(layerIndex);
          return { deletedIndex: layerIndex, remainingLayers: tl.layerCount };
        `;

      case 'rename_layer':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var idx = args.layerIndex !== undefined ? args.layerIndex : tl.currentLayer;
          if (!tl.layers[idx]) throw new Error("Layer index " + idx + " not found");
          var oldName = tl.layers[idx].name;
          tl.layers[idx].name = args.name;
          return { layerIndex: idx, oldName: oldName, newName: tl.layers[idx].name };
        `;

      case 'reorder_layer':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          tl.reorderLayer(args.fromIndex, args.toIndex, args.bAddBefore !== false);
          return { fromIndex: args.fromIndex, toIndex: args.toIndex, layerCount: tl.layerCount };
        `;

      case 'select_layer':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          tl.setSelectedLayers(args.layerIndex);
          return { currentLayer: tl.currentLayer, name: tl.layers[tl.currentLayer].name };
        `;

      case 'set_layer_properties':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var idx = args.layerIndex !== undefined ? args.layerIndex : tl.currentLayer;
          var l = tl.layers[idx];
          if (!l) throw new Error("Layer index " + idx + " not found");
          if (args.visible !== undefined) l.visible = args.visible;
          if (args.locked !== undefined) l.locked = args.locked;
          if (args.name !== undefined) l.name = args.name;
          return { index: idx, name: l.name, visible: l.visible, locked: l.locked };
        `;

      case 'get_current_frame':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          return { currentFrame: tl.currentFrame, frameCount: tl.frameCount };
        `;

      case 'set_current_frame':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          tl.currentFrame = args.frame;
          return { currentFrame: tl.currentFrame };
        `;

      case 'insert_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var num = args.numFrames || 1;
          var bAll = Boolean(args.allLayers);
          var frameNum = args.frameNum !== undefined ? args.frameNum : tl.currentFrame;
          tl.insertFrames(num, bAll, frameNum);
          return { inserted: num, frameCount: tl.frameCount };
        `;

      case 'remove_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          tl.removeFrames(args.startFrame, args.endFrame);
          return { frameCount: tl.frameCount };
        `;

      case 'clear_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          tl.clearFrames(args.startFrame, args.endFrame);
          return { cleared: true };
        `;

      case 'insert_keyframe':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          var targetFrame = args.frame !== undefined ? args.frame : tl.currentFrame;
          tl.insertKeyframe(targetFrame);
          return { frame: targetFrame, layerIndex: tl.currentLayer };
        `;

      case 'insert_blank_keyframe':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          var targetFrame = args.frame !== undefined ? args.frame : tl.currentFrame;
          tl.insertBlankKeyframe(targetFrame);
          return { blankKeyframe: targetFrame, layerIndex: tl.currentLayer };
        `;

      case 'clear_keyframe':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          tl.clearKeyframes(args.startFrame, args.endFrame);
          return { cleared: true };
        `;

      case 'copy_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          tl.copyFrames(args.startFrame, args.endFrame);
          return { copied: true };
        `;

      case 'paste_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          tl.pasteFrames(args.startFrame, args.endFrame);
          return { pasted: true };
        `;

      case 'set_frame_label':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var lyr = args.layerIndex !== undefined ? tl.layers[args.layerIndex] : tl.layers[tl.currentLayer];
          if (!lyr) throw new Error("Layer not found");
          var frmIdx = args.frame !== undefined ? args.frame : tl.currentFrame;
          var f = lyr.frames[frmIdx];
          if (!f) throw new Error("Frame not found at index " + frmIdx);
          f.name = args.label;
          if (args.labelType) f.labelType = args.labelType;
          return { frame: frmIdx, label: f.name, labelType: f.labelType };
        `;

      case 'select_frames':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          tl.setSelectedFrames(args.startFrame, args.endFrame, args.bReplaceSelection !== false);
          return { selected: true, startFrame: args.startFrame, endFrame: args.endFrame };
        `;

      // ---------------- LIBRARY ----------------
      case 'list_library_items':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var items = [];
          if (dom.library && dom.library.items) {
            for (var i = 0; i < dom.library.items.length; i++) {
              var it = dom.library.items[i];
              items.push({
                name: it.name,
                itemType: it.itemType
              });
            }
          }
          return { count: items.length, items: items };
        `;

      case 'inspect_library_item':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var idx = dom.library.findItemIndex(args.name);
          if (idx === -1) throw new Error("Library item not found: " + args.name);
          var it = dom.library.items[idx];
          return {
            name: it.name,
            itemType: it.itemType,
            linkageExportForAS: it.linkageExportForAS,
            linkageClassName: it.linkageClassName
          };
        `;

      case 'create_folder':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.library.newFolder(args.name);
          return { folder: args.name };
        `;

      case 'rename_library_item':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var ok = dom.library.selectItem(args.oldName, true, true);
          if (!ok) throw new Error("Item not found: " + args.oldName);
          dom.library.renameItem(args.newName);
          return { oldName: args.oldName, newName: args.newName };
        `;

      case 'move_library_item':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.library.moveToFolder(args.folderPath, args.itemPath, args.replace !== false);
          return { itemPath: args.itemPath, folderPath: args.folderPath };
        `;

      case 'duplicate_library_item':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var ok = dom.library.selectItem(args.name, true, true);
          if (!ok) throw new Error("Item not found: " + args.name);
          dom.library.duplicateItem(args.name);
          return { duplicated: args.name };
        `;

      case 'delete_library_item':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.library.deleteItem(args.name);
          return { deleted: args.name };
        `;

      case 'import_asset':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var uri = args.uri;
          if (!uri) throw new Error("Asset URI is required");
          var toLibrary = args.importToLibrary !== false;
          dom.importFile(uri, toLibrary);
          return { imported: true, uri: uri, importToLibrary: toLibrary };
        `;

      case 'add_library_item_to_stage':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var pos = { x: args.x || 0, y: args.y || 0 };
          dom.library.addItemToDocument(pos, args.name);
          var sel = dom.selection;
          return {
            added: args.name,
            position: pos,
            selectedElementsCount: sel ? sel.length : 0
          };
        `;

      case 'create_symbol':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var type = args.type || "movie clip"; // movie clip | graphic | button
          var name = args.name;
          if (!name) throw new Error("Symbol name is required");
          dom.library.addNewItem(type, name);
          return { name: name, type: type };
        `;

      case 'convert_selection_to_symbol':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (!dom.selection || dom.selection.length === 0) {
            dom.selectAll();
          }
          var type = args.type || "movie clip";
          var name = args.name;
          var reg = args.registrationPoint || "center";
          dom.convertToSymbol(type, name, reg);
          return { name: name, type: type, registrationPoint: reg };
        `;

      case 'edit_symbol':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.library.editItem(args.name);
          return { editingSymbol: args.name };
        `;

      case 'exit_symbol_edit':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.exitEditMode();
          return { exited: true };
        `;

      // ---------------- STAGE & SELECTION ----------------
      case 'inspect_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var sel = dom.selection;
          var elements = [];
          if (sel) {
            for (var i = 0; i < sel.length; i++) {
              var el = sel[i];
              var info = {
                elementType: el.elementType,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                rotation: el.rotation,
                scaleX: el.scaleX,
                scaleY: el.scaleY
              };
              if (el.elementType === 'instance') {
                info.instanceType = el.instanceType;
                info.name = el.name;
                info.symbolType = el.symbolType;
                info.firstFrame = el.firstFrame;
                info.loop = el.loop;
                if (el.libraryItem) info.libraryItemName = el.libraryItem.name;
              }
              elements.push(info);
            }
          }
          return { count: elements.length, elements: elements };
        `;

      case 'select_all':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.selectAll();
          var sel = dom.selection;
          return { selectedCount: sel ? sel.length : 0 };
        `;

      case 'clear_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.selectNone();
          return { cleared: true };
        `;

      case 'transform_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (args.moveX !== undefined || args.moveY !== undefined) {
            dom.moveSelectedBy({ x: args.moveX || 0, y: args.moveY || 0 });
          }
          if (args.scaleX !== undefined || args.scaleY !== undefined) {
            dom.scaleSelection(args.scaleX || 1, args.scaleY || 1);
          }
          if (args.rotation !== undefined) {
            dom.rotateSelection(args.rotation);
          }
          var sel = dom.selection;
          var after = [];
          if (sel) {
            for (var i = 0; i < sel.length; i++) {
              after.push({
                x: sel[i].x,
                y: sel[i].y,
                width: sel[i].width,
                height: sel[i].height,
                rotation: sel[i].rotation,
                scaleX: sel[i].scaleX,
                scaleY: sel[i].scaleY
              });
            }
          }
          return { transformedCount: after.length, elements: after };
        `;

      case 'set_element_properties':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var sel = dom.selection;
          if (!sel || sel.length === 0) throw new Error("No element selected to set properties");
          var el = sel[0];
          if (args.name !== undefined) el.name = args.name;
          if (args.x !== undefined) el.x = args.x;
          if (args.y !== undefined) el.y = args.y;
          if (args.width !== undefined) el.width = args.width;
          if (args.height !== undefined) el.height = args.height;
          if (args.rotation !== undefined) el.rotation = args.rotation;
          if (args.scaleX !== undefined) el.scaleX = args.scaleX;
          if (args.scaleY !== undefined) el.scaleY = args.scaleY;
          if (el.elementType === 'instance') {
            if (args.firstFrame !== undefined) el.firstFrame = args.firstFrame;
            if (args.loop !== undefined) el.loop = args.loop;
          }
          return {
            elementType: el.elementType,
            name: el.name,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            scaleX: el.scaleX,
            scaleY: el.scaleY
          };
        `;

      case 'swap_symbol':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.swapElement(args.name);
          return { swappedTo: args.name };
        `;

      case 'arrange_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var mode = args.mode; // bringToFront | sendToBack | bringForward | sendBackward
          dom.arrange(mode);
          return { mode: mode };
        `;

      case 'group_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.group();
          return { grouped: true };
        `;

      case 'ungroup_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.unGroup();
          return { unGrouped: true };
        `;

      case 'delete_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.deleteSelection();
          return { deleted: true };
        `;

      case 'duplicate_selection':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.duplicateSelection();
          return { duplicated: true };
        `;

      // ---------------- DRAWING ----------------
      case 'create_shape':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var shapeType = args.shapeType || "rectangle"; // rectangle | oval | line
          if (args.strokeColor) dom.setStrokeColor(args.strokeColor);
          if (args.fillColor) dom.setFillColor(args.fillColor);
          if (args.strokeSize !== undefined) dom.setStrokeSize(args.strokeSize);

          var rect = {
            left: args.x || 0,
            top: args.y || 0,
            right: (args.x || 0) + (args.width || 100),
            bottom: (args.y || 0) + (args.height || 100)
          };

          if (shapeType === "rectangle") {
            var roundness = args.roundness || 0;
            dom.addNewRectangle(rect, roundness, false, true);
          } else if (shapeType === "oval") {
            dom.addNewOval(rect, false, true);
          } else if (shapeType === "line") {
            var p1 = { x: args.x || 0, y: args.y || 0 };
            var p2 = { x: args.x2 !== undefined ? args.x2 : (args.x || 0) + 100, y: args.y2 !== undefined ? args.y2 : (args.y || 0) + 100 };
            dom.addNewLine(p1, p2);
          } else {
            throw new Error("Unsupported shape type: " + shapeType);
          }

          return { shapeType: shapeType, bounds: rect };
        `;

      case 'create_text':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var bounds = {
            left: args.x || 0,
            top: args.y || 0,
            right: (args.x || 0) + (args.width || 200),
            bottom: (args.y || 0) + (args.height || 50)
          };
          var textString = args.text || "";
          dom.addNewText(bounds, textString);
          var sel = dom.selection;
          if (sel && sel.length > 0 && sel[0].elementType === 'text') {
            var txt = sel[0];
            if (args.fontSize) txt.setTextAttr("size", args.fontSize);
            if (args.fontFamily) txt.setTextAttr("face", args.fontFamily);
            if (args.fillColor) txt.setTextAttr("fillColor", args.fillColor);
            if (args.alignment) txt.setTextAttr("alignment", args.alignment);
          }
          return { text: textString, bounds: bounds };
        `;

      case 'edit_text':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var sel = dom.selection;
          if (!sel || sel.length === 0 || sel[0].elementType !== 'text') {
            throw new Error("No text element selected to edit");
          }
          var txt = sel[0];
          if (args.text !== undefined) txt.setTextString(args.text);
          if (args.fontSize) txt.setTextAttr("size", args.fontSize);
          if (args.fontFamily) txt.setTextAttr("face", args.fontFamily);
          if (args.fillColor) txt.setTextAttr("fillColor", args.fillColor);
          if (args.alignment) txt.setTextAttr("alignment", args.alignment);
          return { text: txt.getTextString() };
        `;

      // ---------------- TWEENING ----------------
      case 'create_tween':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          var lyr = tl.layers[tl.currentLayer];
          if (!lyr) throw new Error("Active layer not found");
          var start = args.startFrame !== undefined ? args.startFrame : tl.currentFrame;
          var end = args.endFrame !== undefined ? args.endFrame : start;
          var tweenType = args.tweenType || "classic";
          var targetTween = (tweenType === "shape") ? "shape" : "motion";
          for (var fIdx = start; fIdx <= end && fIdx < lyr.frames.length; fIdx++) {
            var frm = lyr.frames[fIdx];
            if (frm && frm.startFrame === fIdx) {
              frm.tweenType = targetTween;
            }
          }
          return { tweenType: targetTween, layerIndex: tl.currentLayer, startFrame: start, endFrame: end };
        `;

      case 'remove_tween':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (args.layerIndex !== undefined) tl.setSelectedLayers(args.layerIndex);
          var lyr = tl.layers[tl.currentLayer];
          if (!lyr) throw new Error("Active layer not found");
          var start = args.startFrame !== undefined ? args.startFrame : tl.currentFrame;
          var end = args.endFrame !== undefined ? args.endFrame : start;
          for (var fIdx = start; fIdx <= end && fIdx < lyr.frames.length; fIdx++) {
            var frm = lyr.frames[fIdx];
            if (frm) {
              frm.tweenType = "none";
            }
          }
          return { removed: true, layerIndex: tl.currentLayer };
        `;

      case 'set_tween_easing':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var lyr = args.layerIndex !== undefined ? tl.layers[args.layerIndex] : tl.layers[tl.currentLayer];
          var frm = lyr.frames[args.frame !== undefined ? args.frame : tl.currentFrame];
          if (!frm) throw new Error("Frame not found");
          frm.tweenEasing = args.easing;
          return { frame: frm.startFrame, tweenEasing: frm.tweenEasing };
        `;

      // ---------------- AUDIO ----------------
      case 'import_audio':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var uri = args.uri;
          if (!uri) throw new Error("Audio URI required");
          dom.importFile(uri, true);
          return { importedAudio: uri };
        `;

      case 'place_audio_on_timeline':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var layerIdx = args.layerIndex !== undefined ? args.layerIndex : tl.currentLayer;
          var lyr = tl.layers[layerIdx];
          if (!lyr) throw new Error("Layer index " + layerIdx + " not found");
          var frameIdx = args.frame !== undefined ? args.frame : tl.currentFrame;
          var frm = lyr.frames[frameIdx];
          if (!frm) throw new Error("Frame not found at index " + frameIdx);
          frm.soundName = args.soundName;
          if (args.soundSync) frm.soundSync = args.soundSync; // stream | event | start | stop
          if (args.soundLoopMode) frm.soundLoopMode = args.soundLoopMode;
          if (args.soundLoop) frm.soundLoop = args.soundLoop;
          return {
            soundName: frm.soundName,
            soundSync: frm.soundSync,
            frame: frameIdx,
            layer: lyr.name
          };
        `;

      case 'remove_audio_from_timeline':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var layerIdx = args.layerIndex !== undefined ? args.layerIndex : tl.currentLayer;
          var lyr = tl.layers[layerIdx];
          var frameIdx = args.frame !== undefined ? args.frame : tl.currentFrame;
          var frm = lyr.frames[frameIdx];
          if (frm) {
            frm.soundName = "";
          }
          return { removed: true, frame: frameIdx };
        `;

      // ---------------- SCENES ----------------
      case 'list_scenes':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var scenes = [];
          if (dom.timelines) {
            for (var s = 0; s < dom.timelines.length; s++) {
              scenes.push({
                index: s,
                name: dom.timelines[s].name,
                frameCount: dom.timelines[s].frameCount
              });
            }
          }
          return { currentTimeline: dom.currentTimeline, scenes: scenes };
        `;

      case 'add_scene':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.addScene();
          var tl = dom.getTimeline();
          if (args.name) tl.name = args.name;
          return { name: tl.name, index: dom.currentTimeline };
        `;

      case 'rename_scene':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var oldName = tl.name;
          tl.name = args.name;
          return { oldName: oldName, newName: tl.name };
        `;

      case 'delete_scene':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.deleteScene();
          return { currentTimeline: dom.currentTimeline };
        `;

      case 'select_scene':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          if (args.sceneIndex !== undefined) {
            dom.editScene(args.sceneIndex);
          } else if (args.sceneName) {
            for (var i = 0; i < dom.timelines.length; i++) {
              if (dom.timelines[i].name === args.sceneName) {
                dom.editScene(i);
                break;
              }
            }
          }
          var tl = dom.getTimeline();
          return { currentTimeline: dom.currentTimeline, sceneName: tl.name };
        `;

      // ---------------- CAMERA ----------------
      case 'camera_status':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          var hasCamera = Boolean(tl && typeof tl.camera !== 'undefined' && tl.camera !== null);
          return {
            supported: hasCamera,
            sceneName: tl ? tl.name : null,
            note: hasCamera ? "Native camera API available" : "Camera API not exposed in this Animate runtime"
          };
        `;

      case 'set_camera_transform':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var tl = dom.getTimeline();
          if (!tl || typeof tl.camera === 'undefined' || !tl.camera) {
            throw new Error("UNSUPPORTED_BY_VERSION: Camera API is not available on this timeline");
          }
          if (args.x !== undefined) tl.camera.x = args.x;
          if (args.y !== undefined) tl.camera.y = args.y;
          if (args.rotation !== undefined) tl.camera.rotation = args.rotation;
          if (args.zoom !== undefined) tl.camera.zoom = args.zoom;
          return { cameraUpdated: true };
        `;

      // ---------------- EXPORT & PUBLISH ----------------
      case 'publish_document':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          dom.publish();
          return { published: true, name: dom.name };
        `;

      case 'export_image':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var uri = args.uri;
          if (!uri) throw new Error("Output URI is required");
          var currentFrameOnly = args.currentFrameOnly !== false;
          dom.exportPNG(uri, currentFrameOnly, false);
          return { exportedUri: uri, currentFrameOnly: currentFrameOnly };
        `;

      case 'export_video':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var uri = args.uri;
          if (!uri) throw new Error("Output video URI is required");
          var bConvertInAME = Boolean(args.convertInAME);
          var bStopAtFrame = Boolean(args.stopAtFrame !== undefined);
          var stopFrame = args.stopAtFrame || 0;
          dom.exportVideo(uri, bConvertInAME, bStopAtFrame, stopFrame);
          return { exportedVideoUri: uri };
        `;

      case 'export_sprite_sheet':
        return `
          var dom = fl.getDocumentDOM();
          if (!dom) throw new Error("No active document");
          var exporter = new SpriteSheetExporter();
          var uri = args.uri;
          if (!uri) throw new Error("Sprite sheet output URI is required");
          if (args.format) exporter.format = args.format;
          if (args.layoutFormat) exporter.layoutFormat = args.layoutFormat;
          if (args.symbolName) {
            var itIdx = dom.library.findItemIndex(args.symbolName);
            if (itIdx !== -1) exporter.addSymbol(dom.library.items[itIdx]);
          }
          var outPath = exporter.export(uri);
          return { exportedSpriteSheet: uri, outPath: outPath };
        `;

      // ---------------- RAW JSFL ----------------
      case 'execute_raw_jsfl':
        return `
          var code = args.code;
          if (!code) throw new Error("No JSFL code provided");
          return eval(code);
        `;

      default:
        return `throw new Error("Unknown JSFL command: " + command);`;
    }
  }
}
