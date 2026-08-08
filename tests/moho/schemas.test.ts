import { methodSchemas } from "../../src/moho/schemas.js";
import {
  safetyEngine,
  INTERPOLATION_MODES,
  LAYER_TYPES
} from "../../src/moho/security/mohoSafetyEngine.js";

describe("schemas", () => {
  it("every schema has a matching whitelisted method", () => {
    for (const method of Object.keys(methodSchemas)) {
      expect(safetyEngine.isMethodAllowed(method)).toBe(true);
    }
  });

  it("supports the full set of supported interpolation modes", () => {
    expect(INTERPOLATION_MODES).toContain("bezier");
    expect(INTERPOLATION_MODES).toContain("noisy");
    expect(INTERPOLATION_MODES).toContain("cycle");
  });

  it("supports the full set of layer types", () => {
    expect(LAYER_TYPES).toContain("vector");
    expect(LAYER_TYPES).toContain("bone");
    expect(LAYER_TYPES).toContain("group");
    expect(LAYER_TYPES).toContain("switch");
  });

  it("mesh.createPoint schema accepts minimal payload", () => {
    const r = methodSchemas["mesh.createPoint"].safeParse({ layerId: 1, x: 0, y: 0 });
    expect(r.success).toBe(true);
  });

  it("mesh.createPoint schema accepts bezier handles", () => {
    const r = methodSchemas["mesh.createPoint"].safeParse({
      layerId: 1,
      x: 0,
      y: 0,
      bezierInX: -1,
      bezierInY: 0,
      bezierOutX: 1,
      bezierOutY: 0,
    });
    expect(r.success).toBe(true);
  });

  it("mesh.createBezier schema requires 2+ points", () => {
    expect(
      methodSchemas["mesh.createBezier"].safeParse({ layerId: 1, points: [{ x: 0, y: 0 }] }).success,
    ).toBe(false);
    expect(
      methodSchemas["mesh.createBezier"].safeParse({
        layerId: 1,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }).success,
    ).toBe(true);
  });

  it("batch.execute caps at maxBatchSize", () => {
    const ops = Array.from({ length: 100 }, (_, i) => ({ method: "document.getInfo", params: { i } }));
    expect(methodSchemas["batch.execute"].safeParse({ operations: ops }).success).toBe(false);
  });

  it("workflow.applyLipSync rejects unknown phoneme", () => {
    expect(
      methodSchemas["workflow.applyLipSync"].safeParse({
        layerId: 1,
        phonemes: [{ frame: 0, phoneme: "ZZZ" }],
      }).success,
    ).toBe(false);
  });

  it("bone.setConstraints requires a valid layer + bone id", () => {
    expect(
      methodSchemas["bone.setConstraints"].safeParse({ layerId: -1, boneId: 0 }).success,
    ).toBe(false);
    expect(methodSchemas["bone.setConstraints"].safeParse({ layerId: 0, boneId: 0 }).success).toBe(true);
  });

  it("layer.delete requires previewHash", () => {
    expect(methodSchemas["layer.delete"].safeParse({ layerId: 1 }).success).toBe(false);
    expect(
      methodSchemas["layer.delete"].safeParse({ layerId: 1, previewHash: "abc123" }).success,
    ).toBe(true);
  });

  it("animation.setMultiKeyframe caps at 200 keyframes", () => {
    const keyframes = Array.from({ length: 300 }, (_, i) => ({ frame: i, value: 1 }));
    expect(
      methodSchemas["animation.setMultiKeyframe"].safeParse({ layerId: 1, channel: "x", keyframes })
        .success,
    ).toBe(false);
  });
});

describe("safety engine", () => {
  it("isDestructive flags the right methods", () => {
    expect(safetyEngine.isDestructive("animation.deleteKeyframe")).toBe(true);
    expect(safetyEngine.isDestructive("mesh.weld")).toBe(true);
    expect(safetyEngine.isDestructive("document.save")).toBe(true);
    expect(safetyEngine.isDestructive("workflow.batchRender")).toBe(true);
    expect(safetyEngine.isDestructive("document.getInfo")).toBe(false);
  });

  it("validatePreviewConfirmation rejects unknown hash", () => {
    expect(() =>
      safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", {}, "deadbeef"),
    ).toThrow();
  });

  it("plan round-trip: create then validate within TTL", () => {
    const plan = safetyEngine.createExecutionPlan("corr_test", "rev_1", [
      { method: "animation.deleteKeyframe", params: { layerId: 1, channel: "x", frame: 1 }, description: "rm" },
    ]);
    expect(safetyEngine.isDestructive(plan.steps[0].method)).toBe(true);
    expect(() =>
      safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", {}, plan.previewHash),
    ).not.toThrow();
  });

  it("plan hash is 32 hex chars", () => {
    const plan = safetyEngine.createExecutionPlan("corr_x", "rev_y", [
      { method: "document.getInfo", params: {}, description: "ok" },
    ]);
    expect(plan.previewHash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("validatePathSandbox rejects when no allowed dirs", () => {
    expect(() => safetyEngine.validatePathSandbox("/tmp/foo", [])).toThrow();
  });
});
