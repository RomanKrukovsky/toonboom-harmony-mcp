import type { MohoCommandPlan } from '../../schemas/mohoCommandPlan.js';

/**
 * MohoLuaEmitter — turns a MohoCommandPlan into ONE deterministic Lua script
 * that builds the rig inside Moho Pro (Scripting > Run Lua Script).
 *
 * Fully supports:
 *   - 360 Turnaround & Switch layers
 *   - Vitruvian bone groups & alternative branches
 *   - Smart Bone actions & joint flexion corrections
 *   - Constraints (angle, scale, position)
 *   - Delaunay Smart Warp meshes
 *   - Smart projected shadows
 *   - Animator contract (shy bones, color coding)
 */

function luaStr(s: string): string {
  return JSON.stringify(s);
}

function luaPointTable(points: unknown): string {
  if (!Array.isArray(points) || points.length === 0) return 'nil';
  return `{${points.map(point => {
    const candidate = point as { x?: unknown; y?: unknown };
    return `{x=${Number(candidate.x)},y=${Number(candidate.y)}}`;
  }).join(',')}}`;
}

function emitOp(op: MohoCommandPlan['operations'][number]): string {
  const p = op.params as Record<string, any>;
  switch (op.type) {
    case 'add_bone':
      return [
        `-- [${op.commandId}] add_bone ${p.name}`,
        `addBone(${luaStr(p.name)}, ${p.x}, ${p.y}, ${p.lengthPx}, ${p.angleDeg})`
      ].join('\n');
    case 'set_bone_parent':
      return `setBoneParent(${luaStr(p.boneId)}, ${luaStr(p.parentBoneId)}) -- [${op.commandId}]`;
    case 'bind_layer_to_bone':
      return `bindLayerToBone(${luaStr(p.layerName)}, ${luaStr(p.boneId)}) -- [${op.commandId}]`;
    case 'bind_layer_flexi':
      return `bindLayerFlexi(${luaStr(p.layerName)}) -- [${op.commandId}]`;
    case 'create_switch_layer':
      return `createSwitchLayer(${luaStr(p.layerName)}) -- [${op.commandId}]`;
    case 'add_switch_choice':
      return `addSwitchChoice(${luaStr(p.layerName)}, ${luaStr(p.choiceName)}) -- [${op.commandId}]`;
    case 'add_switch_image_choice':
      return `addSwitchImageChoice(${luaStr(p.layerName)}, ${luaStr(p.choiceName)}, ${luaStr(p.sourcePath)}) -- [${op.commandId}]`;
    case 'set_switch_key':
      return `setSwitchKey(${luaStr(p.layerName)}, ${p.frame}, ${luaStr(p.choiceName)}) -- [${op.commandId}]`;
    case 'set_camera_key':
      return `setCameraKey(${p.frame}, ${p.xPixels ?? 'nil'}, ${p.yPixels ?? 'nil'}, ${p.zoom ?? 'nil'}, ${p.rotationDeg ?? 'nil'}) -- [${op.commandId}]`;
    case 'set_bone_channel_key':
      return `setBoneChannelKey(${luaStr(p.boneName)}, ${luaStr(p.layerName ?? '')}, ${p.frame}, ${luaStr(p.channel)}, ${p.value}) -- [${op.commandId}]`;
    case 'create_vector_layer':
      return `createVectorLayer(${luaStr(p.layerName)}) -- [${op.commandId}]`;
    case 'import_image_layer':
      return `importImageLayer(${luaStr(p.layerName)}, ${luaStr(p.sourcePath)}) -- [${op.commandId}]`;
    case 'rename_layer':
      return `renameLayer(${luaStr(String(p.from))}, ${luaStr(String(p.to))}) -- [${op.commandId}]`;
    case 'create_smart_bone':
      return `createSmartBone(${luaStr(p.smartBoneId)}, ${luaStr(p.name)}, ${p.minAngle ?? -45}, ${p.maxAngle ?? 270}) -- [${op.commandId}]`;
    case 'wire_smart_bone_channel':
      return `wireSmartBoneChannel(${luaStr(p.smartBoneId)}, ${luaStr(p.targetBoneId)}, ${p.driverMinAngle ?? -45}, ${p.driverMaxAngle ?? 45}, ${p.targetMinAngle ?? -10}, ${p.targetMaxAngle ?? 10}) -- [${op.commandId}]`;
    case 'set_bone_constraints':
      return `setBoneConstraints(${luaStr(p.boneName)}, ${p.minAngle ?? -180}, ${p.maxAngle ?? 180}, ${luaStr(p.controlBone ?? '')}, ${p.scaleControl ?? 1.0}) -- [${op.commandId}]`;
    case 'create_vitruvian_group':
      return `createVitruvianGroup(${luaStr(p.groupName)}, ${luaStr(p.defaultActiveBone)}) -- [${op.commandId}]`;
    case 'add_vitruvian_bone':
      return `addVitruvianBone(${luaStr(p.groupName)}, ${luaStr(p.boneName)}) -- [${op.commandId}]`;
    case 'create_smart_action':
      return `createSmartAction(${luaStr(p.actionName)}, ${luaStr(p.targetBone)}) -- [${op.commandId}]`;
    case 'set_action_channel_key':
      return `setActionChannelKey(${luaStr(p.actionName)}, ${luaStr(p.boneName)}, ${p.frame}, ${p.angleDeg ?? 0}, ${p.scaleX ?? 1.0}, ${p.scaleY ?? 1.0}) -- [${op.commandId}]`;
    case 'create_mesh_layer':
      return `createMeshLayer(${luaStr(p.meshLayerName)}, ${p.pointCount ?? 16}, ${luaPointTable(p.points)}) -- [${op.commandId}]`;
    case 'bind_smart_warp_mesh':
      return `bindSmartWarpMesh(${luaStr(p.targetLayerName)}, ${luaStr(p.meshLayerName)}) -- [${op.commandId}]`;
    case 'set_bone_shy':
      return `setBoneShy(${luaStr(p.boneName)}, ${p.shy ? 'true' : 'false'}) -- [${op.commandId}]`;
    case 'set_bone_color':
      return `setBoneColor(${luaStr(p.boneName)}, ${p.colorIndex ?? 0}) -- [${op.commandId}]`;
    case 'create_projected_shadow':
      return `createProjectedShadow(${luaStr(p.layerName ?? 'shadow')}, ${luaStr(p.rootBone ?? 'Master')}, ${p.scaleY ?? -0.25}) -- [${op.commandId}]`;
    case 'verify_rig':
      return `verifyRig(${p.expect_bones ?? 0}, ${p.expect_switches ?? 0}, ${p.expect_meshes ?? 0}, ${p.expect_warps ?? 0}, ${p.expect_actions ?? 0}) -- [${op.commandId}]`;
    case 'save_document':
      return `saveDocument(${p.documentPath ? luaStr(p.documentPath) : 'nil'}) -- [${op.commandId}]`;
    default: {
      const exhaustive: never = op.type;
      return exhaustive;
    }
  }
}

export interface MohoLuaEmitterOptions {
  exitAfterRun?: boolean;
}

export function emitMohoLua(
  plan: MohoCommandPlan,
  characterName: string,
  options: MohoLuaEmitterOptions = {}
): string {
  const lines: string[] = [];
  lines.push('-- Generated by MohoRigPlanCompiler v1 (toonboom-harmony-mcp)');
  lines.push(`-- Plan: ${plan.planId} | Character: ${characterName}`);
  lines.push(`-- Source digest: ${plan.sourceManifestSha256}`);
  lines.push('-- Run inside Moho Pro: Scripts > Run Lua Script. Idempotent: safe to re-run.');
  lines.push('');
  lines.push('function MohoScript(moho)');
  lines.push('local opsDone, opsFailed = 0, 0');
  lines.push('');
  lines.push('-- ---------- helpers (idempotent primitives) ----------');
  lines.push(`local function doc() return moho.document end`);
  lines.push(`local function findLayerInGroup(group, name)`);
  lines.push(`  for i = 0, group:CountLayers() - 1 do`);
  lines.push(`    local child = group:Layer(i)`);
  lines.push(`    if child:Name() == name then return child end`);
  lines.push(`    if child:IsGroupType() then`);
  lines.push(`      local found = findLayerInGroup(moho:LayerAsGroup(child), name)`);
  lines.push(`      if found ~= nil then return found end`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`  return nil`);
  lines.push(`end`);
  lines.push(`local function findLayer(name)`);
  lines.push(`  for i = 0, doc():CountLayers() - 1 do`);
  lines.push(`    local l = doc():Layer(i)`);
  lines.push(`    if l:Name() == name then return l end`);
  lines.push(`    if l:IsGroupType() then`);
  lines.push(`      local found = findLayerInGroup(moho:LayerAsGroup(l), name)`);
  lines.push(`      if found ~= nil then return found end`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`  return nil`);
  lines.push(`end`);
  lines.push(`local function skeletonLayer()`);
  lines.push(`  local l = findLayer(${luaStr(characterName + '_Skeleton')})`);
  lines.push(`  if l == nil then`);
  lines.push(`    l = moho:CreateNewLayer(MOHO.LT_BONE, false)`);
  lines.push(`    l:SetName(${luaStr(characterName + '_Skeleton')})`);
  lines.push(`  end`);
  lines.push(`  local boneLayer = moho:LayerAsBone(l)`);
  lines.push(`  return l, boneLayer and boneLayer:Skeleton() or nil`);
  lines.push(`end`);
  lines.push(`local function boneByName(skel, name)`);
  lines.push(`  for i = 0, skel:CountBones() - 1 do`);
  lines.push(`    local b = skel:Bone(i)`);
  lines.push(`    if b.fName == name then return b, i end`);
  lines.push(`  end`);
  lines.push(`  return nil, nil`);
  lines.push(`end`);
  lines.push(`local function ok(label) opsDone = opsDone + 1 print("[OK] " .. label) end`);
  lines.push(`local function fail(label, err) opsFailed = opsFailed + 1 print("[FAIL] " .. label .. ": " .. tostring(err)) end`);
  lines.push('');
  lines.push(`local function addBone(name, x, y, len, angle)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  if boneByName(skel, name) then ok("add_bone " .. name .. " (exists)") return end`);
  lines.push(`  local pixelsToWorld = 6.0 / doc():Height()`);
  lines.push(`  local b = skel:AddBone(0)`);
  lines.push(`  b.fName = name`);
  lines.push(`  b.fLength = len * pixelsToWorld`);
  lines.push(`  b.fAnimPos:SetValue(0, LM.Vector2:new_local(x * pixelsToWorld, y * pixelsToWorld))`);
  lines.push(`  b.fAnimAngle:SetValue(0, math.rad(angle))`);
  lines.push(`  ok("add_bone " .. name)`);
  lines.push(`end`);
  lines.push(`local function setBoneParent(child, parentName)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, child)`);
  lines.push(`  local p, pi = boneByName(skel, parentName)`);
  lines.push(`  if b == nil or p == nil then fail("set_bone_parent " .. child, "bone missing") return end`);
  lines.push(`  b.fParent = pi`);
  lines.push(`  ok("set_bone_parent " .. child .. " -> " .. parentName)`);
  lines.push(`end`);
  lines.push(`local function setBoneChannelKey(boneName, layerName, frame, channel, value)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, boneName)`);
  lines.push(`  if b == nil then fail("set_bone_channel_key " .. boneName, "bone missing") return end`);
  lines.push(`  if channel == "rotation" then`);
  lines.push(`    b.fAnimAngle:SetValue(frame, math.rad(value))`);
  lines.push(`  elseif channel == "translation" then`);
  lines.push(`    local position = LM.Vector2:new_local()`);
  lines.push(`    position:Set(b.fAnimPos:GetValue(frame))`);
  lines.push(`    position.y = value * (6.0 / doc():Height())`);
  lines.push(`    b.fAnimPos:SetValue(frame, position)`);
  lines.push(`  elseif channel == "scale" then`);
  lines.push(`    b.fAnimScale:SetValue(frame, value)`);
  lines.push(`  elseif channel == "opacity" then`);
  lines.push(`    local targetLayer = findLayer(layerName)`);
  lines.push(`    if targetLayer == nil then fail("set_bone_channel_key " .. boneName, "opacity layer missing") return end`);
  lines.push(`    targetLayer.fAlpha:SetValue(frame, value)`);
  lines.push(`  else`);
  lines.push(`    fail("set_bone_channel_key " .. boneName, "unsupported channel " .. channel)`);
  lines.push(`    return`);
  lines.push(`  end`);
  lines.push(`  doc():SetDirty()`);
  lines.push(`  ok("set_bone_channel_key " .. boneName .. "/" .. channel .. " frame=" .. frame)`);
  lines.push(`end`);
  lines.push(`local function setBoneShy(name, isShy)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, name)`);
  lines.push(`  if b then b.fShy = isShy ok("set_bone_shy " .. name) else fail("set_bone_shy", "not found") end`);
  lines.push(`end`);
  lines.push(`local function setBoneColor(name, colorIdx)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, name)`);
  lines.push(`  if b then b.fColor = colorIdx ok("set_bone_color " .. name) else fail("set_bone_color", "not found") end`);
  lines.push(`end`);
  lines.push(`local function createVectorLayer(name)`);
  lines.push(`  if findLayer(name) then ok("create_vector_layer " .. name .. " (exists)") return end`);
  lines.push(`  local layer = moho:CreateNewLayer(MOHO.LT_VECTOR, false)`);
  lines.push(`  layer:SetName(name)`);
  lines.push(`  ok("create_vector_layer " .. name)`);
  lines.push(`end`);
  lines.push(`local function importImageLayer(name, sourcePath)`);
  lines.push(`  local layer = findLayer(name)`);
  lines.push(`  if layer == nil then`);
  lines.push(`    layer = moho:CreateNewLayer(MOHO.LT_IMAGE, false)`);
  lines.push(`    layer:SetName(name)`);
  lines.push(`  end`);
  lines.push(`  local imageLayer = moho:LayerAsImage(layer)`);
  lines.push(`  if imageLayer == nil then fail("import_image_layer " .. name, "existing layer is not an image layer") return end`);
  lines.push(`  imageLayer:SetSourceImage(sourcePath)`);
  lines.push(`  imageLayer:SetQualityLevel(2)`);
  lines.push(`  if imageLayer:SourceImage() == nil or imageLayer:SourceImage() == "" then fail("import_image_layer " .. name, "source image was not set") return end`);
  lines.push(`  ok("import_image_layer " .. name)`);
  lines.push(`end`);
  lines.push(`local function bindLayerToBone(layerName, boneName)`);
  lines.push(`  local l = findLayer(layerName)`);
  lines.push(`  if l == nil then fail("bind_layer " .. layerName, "layer missing") return end`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b, bi = boneByName(skel, boneName)`);
  lines.push(`  if b == nil then fail("bind_layer " .. layerName, "bone missing") return end`);
  lines.push(`  if l:Parent() ~= layer then moho:PlaceLayerInGroup(l, layer, true, false) end`);
  lines.push(`  l:SetLayerParentBone(bi)`);
  lines.push(`  ok("bind_layer " .. layerName .. " -> " .. boneName)`);
  lines.push(`end`);
  lines.push(`local function bindLayerFlexi(layerName)`);
  lines.push(`  local target = findLayer(layerName)`);
  lines.push(`  if target == nil then fail("bind_layer_flexi " .. layerName, "layer missing") return end`);
  lines.push(`  local skeleton = skeletonLayer()`);
  lines.push(`  if target:Parent() ~= skeleton then moho:PlaceLayerInGroup(target, skeleton, true, false) end`);
  lines.push(`  target:SetLayerParentBone(-1)`);
  lines.push(`  ok("bind_layer_flexi " .. layerName)`);
  lines.push(`end`);
  lines.push(`local function createSwitchLayer(name)`);
  lines.push(`  if findLayer(name) then ok("create_switch_layer " .. name .. " (exists)") return end`);
  lines.push(`  local layer = moho:CreateNewLayer(MOHO.LT_SWITCH, false)`);
  lines.push(`  layer:SetName(name)`);
  lines.push(`  ok("create_switch_layer " .. name)`);
  lines.push(`end`);
  lines.push(`local function addSwitchChoice(switchName, choiceName)`);
  lines.push(`  local sw = findLayer(switchName)`);
  lines.push(`  local s = sw and moho:LayerAsSwitch(sw)`);
  lines.push(`  if s == nil then fail("add_switch_choice " .. choiceName, "switch missing") return end`);
  lines.push(`  for i = 0, s:CountLayers() - 1 do`);
  lines.push(`    if s:Layer(i):Name() == choiceName then ok("add_switch_choice " .. choiceName .. " (exists)") return end`);
  lines.push(`  end`);
  lines.push(`  local child = moho:CreateNewLayer(MOHO.LT_VECTOR, false)`);
  lines.push(`  child:SetName(choiceName)`);
  lines.push(`  moho:PlaceLayerInGroup(child, sw, true, false)`);
  lines.push(`  ok("add_switch_choice " .. choiceName)`);
  lines.push(`end`);
  lines.push(`local function addSwitchImageChoice(switchName, choiceName, sourcePath)`);
  lines.push(`  local sw = findLayer(switchName)`);
  lines.push(`  local switchLayer = sw and moho:LayerAsSwitch(sw)`);
  lines.push(`  if switchLayer == nil then fail("add_switch_image_choice " .. choiceName, "switch missing") return end`);
  lines.push(`  local child = nil`);
  lines.push(`  for i = 0, switchLayer:CountLayers() - 1 do`);
  lines.push(`    if switchLayer:Layer(i):Name() == choiceName then child = switchLayer:Layer(i) break end`);
  lines.push(`  end`);
  lines.push(`  if child == nil then`);
  lines.push(`    child = moho:CreateNewLayer(MOHO.LT_IMAGE, false)`);
  lines.push(`    child:SetName(choiceName)`);
  lines.push(`    moho:PlaceLayerInGroup(child, sw, true, false)`);
  lines.push(`  end`);
  lines.push(`  local imageLayer = moho:LayerAsImage(child)`);
  lines.push(`  if imageLayer == nil then fail("add_switch_image_choice " .. choiceName, "choice is not an image layer") return end`);
  lines.push(`  imageLayer:SetSourceImage(sourcePath)`);
  lines.push(`  imageLayer:SetQualityLevel(2)`);
  lines.push(`  ok("add_switch_image_choice " .. choiceName)`);
  lines.push(`end`);
  lines.push(`local function setSwitchKey(switchName, frame, choiceName)`);
  lines.push(`  local sw = findLayer(switchName)`);
  lines.push(`  local s = sw and moho:LayerAsSwitch(sw)`);
  lines.push(`  if s == nil then fail("set_switch_key " .. switchName, "switch missing") return end`);
  lines.push(`  s:SetValue(frame, choiceName)`);
  lines.push(`  ok("set_switch_key " .. switchName .. " frame=" .. frame)`);
  lines.push(`end`);
  lines.push(`local function setCameraKey(frame, xPixels, yPixels, zoom, rotationDeg)`);
  lines.push(`  if xPixels ~= nil or yPixels ~= nil then`);
  lines.push(`    local position = LM.Vector3:new_local()`);
  lines.push(`    position:Set(doc().fCameraTrack:GetValue(frame))`);
  lines.push(`    local pixelsToWorld = 6.0 / doc():Height()`);
  lines.push(`    if xPixels ~= nil then position.x = xPixels * pixelsToWorld end`);
  lines.push(`    if yPixels ~= nil then position.y = yPixels * pixelsToWorld end`);
  lines.push(`    doc().fCameraTrack:SetValue(frame, position)`);
  lines.push(`  end`);
  lines.push(`  if zoom ~= nil then doc().fCameraZoom:SetValue(frame, zoom) end`);
  lines.push(`  if rotationDeg ~= nil then doc().fCameraRoll:SetValue(frame, math.rad(rotationDeg)) end`);
  lines.push(`  doc():DepthSort()`);
  lines.push(`  ok("set_camera_key frame=" .. frame)`);
  lines.push(`end`);
  lines.push(`local function createSmartBone(id, name, minAng, maxAng)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  if boneByName(skel, name) then ok("create_smart_bone " .. name .. " (exists)") return end`);
  lines.push(`  addBone(name, 200, 200, 30, 0)`);
  lines.push(`  local b = boneByName(skel, name)`);
  lines.push(`  if b then b.fMinConstraint = math.rad(minAng) b.fMaxConstraint = math.rad(maxAng) b.fConstraints = true end`);
  lines.push(`  ok("create_smart_bone " .. name)`);
  lines.push(`end`);
  lines.push(`local function wireSmartBoneChannel(smartId, targetBone, driverMinAngle, driverMaxAngle, targetMinAngle, targetMaxAngle)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local driver = boneByName(skel, smartId)`);
  lines.push(`  local target = boneByName(skel, targetBone)`);
  lines.push(`  if driver == nil then fail("wire " .. smartId, "driver bone missing") return end`);
  lines.push(`  if target == nil then fail("wire " .. smartId, "target bone missing") return end`);
  lines.push(`  doc():SetCurrentDocAction(smartId)`);
  lines.push(`  layer:ActivateAction(smartId)`);
  lines.push(`  driver.fAnimAngle:SetValue(0, math.rad(driverMinAngle))`);
  lines.push(`  driver.fAnimAngle:SetValue(100, math.rad(driverMaxAngle))`);
  lines.push(`  target.fAnimAngle:SetValue(0, math.rad(targetMinAngle))`);
  lines.push(`  target.fAnimAngle:SetValue(100, math.rad(targetMaxAngle))`);
  lines.push(`  layer:ActivateAction("")`);
  lines.push(`  doc():SetCurrentDocAction("")`);
  lines.push(`  if not layer:HasAction(smartId) then fail("wire " .. smartId, "action was not created") return end`);
  lines.push(`  ok("wire " .. smartId .. "->" .. targetBone)`);
  lines.push(`end`);
  lines.push(`local function setBoneConstraints(boneName, minAng, maxAng, ctlBone, scaleCtl)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, boneName)`);
  lines.push(`  if b then b.fMinConstraint = math.rad(minAng) b.fMaxConstraint = math.rad(maxAng) b.fConstraints = true ok("set_constraints " .. boneName) else fail("set_constraints", "not found") end`);
  lines.push(`end`);
  lines.push(`local function boneGroupByName(skel, groupName)`);
  lines.push(`  for i = 0, skel:CountGroups() - 1 do`);
  lines.push(`    local group = skel:Group(i)`);
  lines.push(`    if group:Name() == groupName then return group end`);
  lines.push(`  end`);
  lines.push(`  return nil`);
  lines.push(`end`);
  lines.push(`local function createVitruvianGroup(groupName, activeBone)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local group = boneGroupByName(skel, groupName)`);
  lines.push(`  if group == nil then`);
  lines.push(`    group = skel:AddGroup(0)`);
  lines.push(`    group:SetName(groupName)`);
  lines.push(`  end`);
  lines.push(`  local bone, boneId = boneByName(skel, activeBone)`);
  lines.push(`  if bone == nil then fail("create_vitruvian_group " .. groupName, "active bone missing") return end`);
  lines.push(`  if not group:ContainsBoneID(boneId) then group:AddBone(boneId) end`);
  lines.push(`  group.fActiveBone:SetValue(0, boneId)`);
  lines.push(`  ok("create_vitruvian_group " .. groupName)`);
  lines.push(`end`);
  lines.push(`local function addVitruvianBone(groupName, boneName)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local group = boneGroupByName(skel, groupName)`);
  lines.push(`  local bone, boneId = boneByName(skel, boneName)`);
  lines.push(`  if group == nil then fail("add_vitruvian_bone " .. boneName, "group missing") return end`);
  lines.push(`  if bone == nil then fail("add_vitruvian_bone " .. boneName, "bone missing") return end`);
  lines.push(`  if not group:ContainsBoneID(boneId) then group:AddBone(boneId) end`);
  lines.push(`  ok("add_vitruvian_bone " .. boneName)`);
  lines.push(`end`);
  lines.push(`local function createSmartAction(actionName, targetBone)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  doc():SetCurrentDocAction(actionName)`);
  lines.push(`  layer:ActivateAction(actionName)`);
  lines.push(`  layer:ActivateAction("")`);
  lines.push(`  doc():SetCurrentDocAction("")`);
  lines.push(`  ok("create_smart_action " .. actionName)`);
  lines.push(`end`);
  lines.push(`local function setActionChannelKey(actionName, boneName, frame, angleDeg, sx, sy)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local b = boneByName(skel, boneName)`);
  lines.push(`  if b == nil then fail("set_action_key " .. actionName, "bone missing") return end`);
  lines.push(`  doc():SetCurrentDocAction(actionName)`);
  lines.push(`  layer:ActivateAction(actionName)`);
  lines.push(`  b.fAnimAngle:SetValue(frame, math.rad(angleDeg))`);
  lines.push(`  b.fAnimScale:SetValue(frame, sx)`);
  lines.push(`  layer:ActivateAction("")`);
  lines.push(`  doc():SetCurrentDocAction("")`);
  lines.push(`  ok("set_action_key " .. actionName .. "/" .. boneName)`);
  lines.push(`end`);
  lines.push(`local function createMeshLayer(meshName, ptCount, providedPoints)`);
  lines.push(`  local layer = findLayer(meshName)`);
  lines.push(`  if layer == nil then`);
  lines.push(`    layer = moho:CreateNewLayer(MOHO.LT_VECTOR, false)`);
  lines.push(`    layer:SetName(meshName)`);
  lines.push(`  end`);
  lines.push(`  local warp = moho:LayerAsVector(layer)`);
  lines.push(`  local mesh = warp and warp:Mesh()`);
  lines.push(`  if mesh == nil then fail("create_mesh_layer " .. meshName, "vector mesh unavailable") return end`);
  lines.push(`  if mesh:CountPoints() == 0 then`);
  lines.push(`    local count = providedPoints ~= nil and #providedPoints or math.max(4, ptCount)`);
  lines.push(`    local point = LM.Vector2:new_local()`);
  lines.push(`    local firstPointId = mesh:CountPoints()`);
  lines.push(`    for i = 0, count - 1 do`);
  lines.push(`      local angle = (math.pi * 2 * i) / count`);
  lines.push(`      point.x = providedPoints ~= nil and providedPoints[i + 1].x or 0.75 * math.cos(angle)`);
  lines.push(`      point.y = providedPoints ~= nil and providedPoints[i + 1].y or 0.95 * math.sin(angle)`);
  lines.push(`      if i == 0 then mesh:AddLonePoint(point, 0) else mesh:AppendPoint(point, 0) end`);
  lines.push(`    end`);
  lines.push(`    point.x = providedPoints ~= nil and providedPoints[1].x or 0.75`);
  lines.push(`    point.y = providedPoints ~= nil and providedPoints[1].y or 0`);
  lines.push(`    mesh:AppendPoint(point, 0)`);
  lines.push(`    mesh:WeldPoints(firstPointId, firstPointId + count, 0)`);
  lines.push(`    mesh:SelectConnected()`);
  lines.push(`  end`);
  lines.push(`  warp:SetContinuousTriangulation(true)`);
  lines.push(`  if mesh:CountPoints() < 4 then fail("create_mesh_layer " .. meshName, "insufficient geometry") return end`);
  lines.push(`  ok("create_mesh_layer " .. meshName)`);
  lines.push(`end`);
  lines.push(`local function bindSmartWarpMesh(tgtLayer, meshName)`);
  lines.push(`  if tgtLayer == meshName then fail("bind_smart_warp " .. tgtLayer, "target and mesh must be distinct") return end`);
  lines.push(`  local target = findLayer(tgtLayer)`);
  lines.push(`  local meshLayer = findLayer(meshName)`);
  lines.push(`  local warp = meshLayer and moho:LayerAsVector(meshLayer)`);
  lines.push(`  if target == nil then fail("bind_smart_warp " .. tgtLayer, "target layer missing") return end`);
  lines.push(`  if warp == nil or warp:Mesh():CountPoints() < 4 then fail("bind_smart_warp " .. tgtLayer, "warp mesh missing") return end`);
  lines.push(`  target:SetWarpLayer(meshLayer)`);
  lines.push(`  warp:MarkAsWarpLayer(true, target)`);
  lines.push(`  warp:SetNeedsWarpLayerUpdate()`);
  lines.push(`  warp:UpdateWarpLayer()`);
  lines.push(`  if target:GetWarpLayer() ~= meshLayer or not warp:IsWarpLayer() then fail("bind_smart_warp " .. tgtLayer, "binding verification failed") return end`);
  lines.push(`  ok("bind_smart_warp " .. tgtLayer)`);
  lines.push(`end`);
  lines.push(`local function createProjectedShadow(layerName, rootBone, scaleY)`);
  lines.push(`  local shadowLayer = findLayer(layerName)`);
  lines.push(`  if shadowLayer == nil then`);
  lines.push(`    shadowLayer = moho:CreateNewLayer(MOHO.LT_VECTOR, false)`);
  lines.push(`    shadowLayer:SetName(layerName)`);
  lines.push(`  end`);
  lines.push(`  local shadowVector = moho:LayerAsVector(shadowLayer)`);
  lines.push(`  local shadowMesh = shadowVector and shadowVector:Mesh()`);
  lines.push(`  if shadowMesh == nil then fail("create_projected_shadow " .. layerName, "vector mesh unavailable") return end`);
  lines.push(`  if shadowMesh:CountPoints() == 0 then`);
  lines.push(`    local point = LM.Vector2:new_local()`);
  lines.push(`    local count = 16`);
  lines.push(`    local firstPointId = shadowMesh:CountPoints()`);
  lines.push(`    for i = 0, count - 1 do`);
  lines.push(`      local angle = (math.pi * 2 * i) / count`);
  lines.push(`      point.x = 0.8 * math.cos(angle)`);
  lines.push(`      point.y = 0.18 * math.sin(angle)`);
  lines.push(`      if i == 0 then shadowMesh:AddLonePoint(point, 0) else shadowMesh:AppendPoint(point, 0) end`);
  lines.push(`    end`);
  lines.push(`    point.x = 0.8`);
  lines.push(`    point.y = 0`);
  lines.push(`    shadowMesh:AppendPoint(point, 0)`);
  lines.push(`    shadowMesh:WeldPoints(firstPointId, firstPointId + count, 0)`);
  lines.push(`    shadowMesh:SelectConnected()`);
  lines.push(`    moho:SetSelLayer(shadowLayer)`);
  lines.push(`    if not moho:CreateShape(true) then fail("create_projected_shadow " .. layerName, "shape creation failed") return end`);
  lines.push(`  end`);
  lines.push(`  shadowLayer.fAlpha:SetValue(0, 0.35)`);
  lines.push(`  local scale = LM.Vector3:new_local()`);
  lines.push(`  scale:Set(shadowLayer.fScale:GetValue(0))`);
  lines.push(`  scale.y = scaleY`);
  lines.push(`  shadowLayer.fScale:SetValue(0, scale)`);
  lines.push(`  local skeleton, skel = skeletonLayer()`);
  lines.push(`  local root, rootId = boneByName(skel, rootBone)`);
  lines.push(`  if root == nil then fail("create_projected_shadow " .. layerName, "root bone missing") return end`);
  lines.push(`  if shadowLayer:Parent() ~= skeleton then moho:PlaceLayerInGroup(shadowLayer, skeleton, true, false) end`);
  lines.push(`  shadowLayer:SetLayerParentBone(rootId)`);
  lines.push(`  if shadowMesh:CountPoints() < 4 or shadowMesh:CountShapes() < 1 then fail("create_projected_shadow " .. layerName, "shadow geometry missing") return end`);
  lines.push(`  ok("create_projected_shadow " .. layerName)`);
  lines.push(`end`);
  lines.push(`local function countSwitchesInGroup(group)`);
  lines.push(`  local count = 0`);
  lines.push(`  for i = 0, group:CountLayers() - 1 do`);
  lines.push(`    local child = group:Layer(i)`);
  lines.push(`    if child:LayerType() == MOHO.LT_SWITCH then count = count + 1 end`);
  lines.push(`    if child:IsGroupType() then count = count + countSwitchesInGroup(moho:LayerAsGroup(child)) end`);
  lines.push(`  end`);
  lines.push(`  return count`);
  lines.push(`end`);
  lines.push(`local function countSwitchLayers()`);
  lines.push(`  local count = 0`);
  lines.push(`  for i = 0, doc():CountLayers() - 1 do`);
  lines.push(`    local layer = doc():Layer(i)`);
  lines.push(`    if layer:LayerType() == MOHO.LT_SWITCH then count = count + 1 end`);
  lines.push(`    if layer:IsGroupType() then count = count + countSwitchesInGroup(moho:LayerAsGroup(layer)) end`);
  lines.push(`  end`);
  lines.push(`  return count`);
  lines.push(`end`);
  lines.push(`local function countRigGeometryInGroup(group)`);
  lines.push(`  local meshes, warps = 0, 0`);
  lines.push(`  for i = 0, group:CountLayers() - 1 do`);
  lines.push(`    local child = group:Layer(i)`);
  lines.push(`    if child:LayerType() == MOHO.LT_VECTOR then`);
  lines.push(`      local vector = moho:LayerAsVector(child)`);
  lines.push(`      if vector ~= nil and vector:Mesh():CountPoints() > 0 then meshes = meshes + 1 end`);
  lines.push(`      if vector ~= nil and vector:IsWarpLayer() then warps = warps + 1 end`);
  lines.push(`    end`);
  lines.push(`    if child:IsGroupType() then`);
  lines.push(`      local childMeshes, childWarps = countRigGeometryInGroup(moho:LayerAsGroup(child))`);
  lines.push(`      meshes = meshes + childMeshes`);
  lines.push(`      warps = warps + childWarps`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`  return meshes, warps`);
  lines.push(`end`);
  lines.push(`local function countRigGeometry()`);
  lines.push(`  local meshes, warps = 0, 0`);
  lines.push(`  for i = 0, doc():CountLayers() - 1 do`);
  lines.push(`    local layer = doc():Layer(i)`);
  lines.push(`    if layer:LayerType() == MOHO.LT_VECTOR then`);
  lines.push(`      local vector = moho:LayerAsVector(layer)`);
  lines.push(`      if vector ~= nil and vector:Mesh():CountPoints() > 0 then meshes = meshes + 1 end`);
  lines.push(`      if vector ~= nil and vector:IsWarpLayer() then warps = warps + 1 end`);
  lines.push(`    end`);
  lines.push(`    if layer:IsGroupType() then`);
  lines.push(`      local childMeshes, childWarps = countRigGeometryInGroup(moho:LayerAsGroup(layer))`);
  lines.push(`      meshes = meshes + childMeshes`);
  lines.push(`      warps = warps + childWarps`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`  return meshes, warps`);
  lines.push(`end`);
  lines.push(`local function verifyRig(expectBones, expectSwitches, expectMeshes, expectWarps, expectActions)`);
  lines.push(`  local layer, skel = skeletonLayer()`);
  lines.push(`  local boneCount = skel:CountBones()`);
  lines.push(`  local switchCount = countSwitchLayers()`);
  lines.push(`  local meshCount, warpCount = countRigGeometry()`);
  lines.push(`  local actionCount = layer:CountActions()`);
  lines.push(`  print(string.format("[AUDIT] bones=%d switches=%d meshes=%d warps=%d actions=%d", boneCount, switchCount, meshCount, warpCount, actionCount))`);
  lines.push(`  if boneCount < expectBones then fail("verify_rig", "bone count below expectation") return end`);
  lines.push(`  if switchCount < expectSwitches then fail("verify_rig", "switch count below expectation") return end`);
  lines.push(`  if meshCount < expectMeshes then fail("verify_rig", "mesh count below expectation") return end`);
  lines.push(`  if warpCount < expectWarps then fail("verify_rig", "warp count below expectation") return end`);
  lines.push(`  if actionCount < expectActions then fail("verify_rig", "action count below expectation") return end`);
  lines.push(`  ok("verify_rig")`);
  lines.push(`end`);
  lines.push(`local function saveDocument(documentPath)`);
  lines.push(`  if documentPath ~= nil and documentPath ~= "" then`);
  lines.push(`    moho:FileSaveAs(documentPath)`);
  lines.push(`  else`);
  lines.push(`    moho:FileSave()`);
  lines.push(`  end`);
  lines.push(`  ok("save_document")`);
  lines.push(`end`);
  lines.push('');
  lines.push('-- ---------- plan operations ----------');
  for (const op of plan.operations) {
    lines.push(emitOp(op));
  }
  lines.push('');
  lines.push('-- ---------- summary ----------');
  lines.push(`print(string.format("[SUMMARY] done=%d failed=%d plan=%s", opsDone, opsFailed, ${luaStr(plan.planId)}))`);
  if (options.exitAfterRun) {
    lines.push(`if opsFailed > 0 then print("[FATAL] Moho rig build had failures: " .. opsFailed) os.exit(1) end`);
    lines.push('os.exit(0)');
  } else {
    lines.push(`if opsFailed > 0 then error("Moho rig build had failures: " .. opsFailed) end`);
  }
  lines.push('end');
  lines.push('');
  return lines.join('\n') + '\n';
}
