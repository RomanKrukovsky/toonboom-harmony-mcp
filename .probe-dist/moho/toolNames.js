/**
 * toolNames.ts — карта имён Moho-тулов: старое -> новое.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. В едином сервере Harmony-тулы называются
 * `harmony.scene.open_project` (точки, snake_case), а Moho-тулы приехали из
 * своего репозитория как `document_getInfo` (подчёркивание, camelCase). Две
 * конвенции в одном сервере читаются как две несвязанные системы, и по имени
 * `document_getInfo` не видно, что это вообще Moho.
 *
 * КРИТИЧЕСКИЙ ИНВАРИАНТ. Имя MCP-тула НЕ РАВНО имени Lua-метода в плагине:
 *
 *   имя тула   moho.document.get_info     <- владеет этот проект
 *   Lua-метод  document.getInfo           <- владеет плагин Moho
 *
 * Строки Lua-методов уходят в `safeSend(...)` и должны остаться нетронутыми:
 * плагин знает только их. Переименование тулов — операция ИСКЛЮЧИТЕЛЬНО на
 * границе MCP. Если кто-то «за компанию» перепишет и Lua-методы, живой Moho
 * молча перестанет отвечать, а тесты на моках этого не заметят.
 */
/** Старое имя тула (как в исходном moho-mcp) -> новое имя в едином сервере. */
export const MOHO_TOOL_NAMES = Object.freeze({
    // Документ
    document_getInfo: 'moho.document.get_info',
    document_getLayers: 'moho.document.get_layers',
    document_setFrame: 'moho.document.set_frame',
    document_screenshot: 'moho.document.screenshot',
    document_createLayer: 'moho.document.create_layer',
    document_save: 'moho.document.save',
    document_diagnose: 'moho.document.diagnose',
    document_render: 'moho.document.render',
    document_screenshot_window: 'moho.document.screenshot_window',
    // Слои
    layer_getProperties: 'moho.layer.get_properties',
    layer_getChildren: 'moho.layer.get_children',
    layer_getBones: 'moho.layer.get_bones',
    layer_setTransform: 'moho.layer.set_transform',
    layer_setVisibility: 'moho.layer.set_visibility',
    layer_setOpacity: 'moho.layer.set_opacity',
    layer_setName: 'moho.layer.set_name',
    layer_selectLayer: 'moho.layer.select',
    layer_reorder: 'moho.layer.reorder',
    layer_setBlendMode: 'moho.layer.set_blend_mode',
    layer_setMask: 'moho.layer.set_mask',
    layer_createGroup: 'moho.layer.create_group',
    layer_createSwitch: 'moho.layer.create_switch',
    layer_delete: 'moho.layer.delete',
    // Кости
    bone_getProperties: 'moho.bone.get_properties',
    bone_setTransform: 'moho.bone.set_transform',
    bone_selectBone: 'moho.bone.select',
    bone_createBone: 'moho.bone.create',
    bone_setConstraints: 'moho.bone.set_constraints',
    bone_setTarget: 'moho.bone.set_target',
    bone_setParent: 'moho.bone.set_parent',
    // Анимация
    animation_getKeyframes: 'moho.animation.get_keyframes',
    animation_getFrameState: 'moho.animation.get_frame_state',
    animation_setKeyframe: 'moho.animation.set_keyframe',
    animation_setMultiKeyframe: 'moho.animation.set_multi_keyframe',
    animation_deleteKeyframe: 'moho.animation.delete_keyframe',
    animation_setInterpolation: 'moho.animation.set_interpolation',
    animation_getPointAnim: 'moho.animation.get_point_anim',
    // Меш
    mesh_getPoints: 'moho.mesh.get_points',
    mesh_getShapes: 'moho.mesh.get_shapes',
    mesh_createPoint: 'moho.mesh.create_point',
    mesh_createBezier: 'moho.mesh.create_bezier',
    mesh_weld: 'moho.mesh.weld',
    mesh_setFill: 'moho.mesh.set_fill',
    mesh_setStroke: 'moho.mesh.set_stroke',
    mesh_setGradient: 'moho.mesh.set_gradient',
    mesh_setCurvature: 'moho.mesh.set_curvature',
    // Пакетная отправка
    batch_execute: 'moho.batch.execute',
    // Воркфлоу
    workflow_applyLipSync: 'moho.workflow.apply_lipsync',
    workflow_createSmartBone: 'moho.workflow.create_smart_bone',
    workflow_duplicateLayerTree: 'moho.workflow.duplicate_layer_tree',
    workflow_batchRender: 'moho.workflow.batch_render',
    workflow_projectDiagnostics: 'moho.workflow.project_diagnostics',
    workflow_createCharacterRig: 'moho.workflow.create_character_rig',
    // Ввод (по умолчанию выключен)
    input_mouseClick: 'moho.input.mouse_click',
    input_mouseDrag: 'moho.input.mouse_drag',
    input_sendKeys: 'moho.input.send_keys',
    // Система
    system_getCapabilities: 'moho.system.get_capabilities',
    system_diagnose: 'moho.system.diagnose',
    system_sloSnapshot: 'moho.system.slo_snapshot',
});
/**
 * Легаси-алиасы старого репозитория, НЕ поддерживаемые в едином сервере.
 *
 * `tools.ts` регистрирует их при MOHO_MCP_ENABLE_LEGACY_ALIASES=true — это была
 * обратная совместимость с ещё более старыми именами внутри отдельного
 * репозитория Moho. В едином сервере это была бы ТРЕТЬЯ конвенция имён поверх
 * `harmony.*` и `moho.*`, причём для тулов, которые уже переименованы один раз.
 *
 * Список нужен, чтобы отличить «забытый тул» (настоящая ошибка карты) от
 * «осознанно не поддерживаем» и дать по каждому случаю разный ответ.
 */
const UNSUPPORTED_LEGACY_ALIASES = new Set([
    'moho_doc_info',
    'moho_list_layers',
    'moho_layer_props',
    'moho_set_bone_transform',
    'moho_set_layer_transform',
    'moho_set_keyframe',
    'moho_set_frame',
    'moho_batch_execute',
    'moho_diagnose_system',
    'moho_get_capabilities',
]);
/** Является ли имя легаси-алиасом, осознанно не поддерживаемым в едином сервере. */
export function isUnsupportedLegacyAlias(oldName) {
    return UNSUPPORTED_LEGACY_ALIASES.has(oldName);
}
/**
 * Новое имя по старому.
 *
 * Бросает на незнакомом имени: молчаливый пропуск скрыл бы забытый тул — он
 * просто не попал бы в список, и никто бы не заметил.
 *
 * Поиск идёт через `Object.hasOwn`, а НЕ через проверку значения на
 * правдивость. Обычный доступ по ключу видит цепочку прототипов, поэтому
 * `renamed('toString')` возвращал нативную функцию `Object.prototype.toString`
 * вместо броска: `if (!next)` не отсекает истинную функцию. Сейчас таких имён
 * в карте нет, но защита стоит на входе, а не на совпадении с текущими данными.
 */
export function renamed(oldName) {
    if (UNSUPPORTED_LEGACY_ALIASES.has(oldName)) {
        throw new Error(`Легаси-алиас Moho «${oldName}» не поддерживается в едином сервере. ` +
            'Он вводил третью конвенцию имён поверх harmony.* и moho.*. ' +
            'Снимите MOHO_MCP_ENABLE_LEGACY_ALIASES и используйте имена moho.*.');
    }
    if (!Object.hasOwn(MOHO_TOOL_NAMES, oldName)) {
        throw new Error(`Имя Moho-тула отсутствует в карте переименования: ${oldName}`);
    }
    return MOHO_TOOL_NAMES[oldName];
}
/** Все новые имена. Используется тестом на префикс и полноту. */
export function allMohoToolNames() {
    return Object.values(MOHO_TOOL_NAMES);
}
