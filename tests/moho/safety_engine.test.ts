/**
 * MohoSafetyEngine — allow-list, previewHash confirmation, path sandbox.
 *
 * Converted from vitest to the project's jest setup: the `vitest` import is gone
 * (jest provides describe/it/expect as globals) and module paths are rooted at
 * `../../src/moho/...` because these tests now live in `tests/moho/` rather than
 * beside the source in its original repository.
 */

import os from "node:os";
import path from "node:path";

import {
  safetyEngine,
  MohoSecurityError,
  MohoValidationError
} from "../../src/moho/security/mohoSafetyEngine.js";

describe("MohoSafetyEngine", () => {
  it("allows whitelisted Lua API methods", () => {
    expect(() => safetyEngine.validateMethodWhitelist("document.getInfo")).not.toThrow();
    expect(() => safetyEngine.validateMethodWhitelist("layer.setTransform")).not.toThrow();
    expect(() => safetyEngine.validateMethodWhitelist("batch.execute")).not.toThrow();
  });

  it("blocks non-whitelisted arbitrary methods", () => {
    expect(() => safetyEngine.validateMethodWhitelist("os.execute")).toThrow(MohoSecurityError);
    expect(() => safetyEngine.validateMethodWhitelist("system.evalCode")).toThrow(MohoSecurityError);
  });

  it("requires cryptographic previewHash for destructive methods", () => {
    expect(() => safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", {})).toThrow(
      MohoValidationError
    );
  });

  it("creates execution plans with 60s TTL and previewHash", () => {
    const plan = safetyEngine.createExecutionPlan("corr_test_1", "rev_100", [
      { method: "document.getInfo", params: {}, description: "Get doc info" },
      {
        method: "animation.deleteKeyframe",
        params: { layerId: 1, channel: "translation", frame: 10 },
        description: "Delete key"
      }
    ]);

    expect(plan.steps).toHaveLength(2);
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.previewHash).toBeDefined();
    expect(plan.expiresAt).toBeGreaterThan(Date.now());

    // Validating with correct previewHash succeeds
    expect(() =>
      safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", {}, plan.previewHash)
    ).not.toThrow();
  });

  it("validates nested batch_execute safety", () => {
    expect(() =>
      safetyEngine.validateBatchSafety(
        [
          { method: "document.getInfo", params: {} },
          { method: "os.execute", params: {} }
        ],
        [os.tmpdir()]
      )
    ).toThrow(MohoSecurityError);
  });

  it("validates path sandboxing correctly", () => {
    const tmpDir = os.tmpdir();
    const validPath = path.join(tmpDir, "test_output.png");
    expect(safetyEngine.validatePathSandbox(validPath, [tmpDir])).toBe(path.resolve(validPath));

    const invalidPath = "/etc/passwd";
    expect(() => safetyEngine.validatePathSandbox(invalidPath, [tmpDir])).toThrow(MohoSecurityError);
  });

  /* ------------------------------------------------------------------------ */
  /* previewHash binding                                                      */
  /* ------------------------------------------------------------------------ */

  /**
   * The test above proves a correct hash is ACCEPTED. On its own that is weak:
   * a `validatePreviewConfirmation` that returned unconditionally after the
   * `!previewHash` check would satisfy it. These cases pin down what the hash
   * actually authorises, so the confirmation gate cannot silently degrade into a
   * presence check for a non-empty string.
   */
  describe("previewHash authorisation", () => {
    function freshDeletePlan() {
      return safetyEngine.createExecutionPlan("corr_bind", "rev_bind", [
        {
          method: "animation.deleteKeyframe",
          params: { layerId: 1, channel: "translation", frame: 10 },
          description: "Delete key at frame 10"
        }
      ]);
    }

    it("rejects a hash that was never issued", () => {
      expect(() =>
        safetyEngine.validatePreviewConfirmation(
          "animation.deleteKeyframe",
          { layerId: 1, channel: "translation", frame: 10 },
          "deadbeefdeadbeefdeadbeefdeadbeef"
        )
      ).toThrow(MohoValidationError);
    });

    it("rejects a hash issued for a different method", () => {
      const plan = safetyEngine.createExecutionPlan("corr_other", "rev_other", [
        { method: "layer.delete", params: { layerId: 7 }, description: "Delete layer 7" }
      ]);

      // The hash is live and genuine, but it approved a layer deletion. It must
      // not confirm a keyframe deletion.
      expect(() =>
        safetyEngine.validatePreviewConfirmation(
          "animation.deleteKeyframe",
          { layerId: 7 },
          plan.previewHash
        )
      ).toThrow(MohoValidationError);
    });

    it("rejects a supplied parameter that contradicts the approved plan", () => {
      const plan = freshDeletePlan();

      // Approved frame 10; asking for 999 with the same hash is the substitution
      // attack the binding exists to stop.
      expect(() =>
        safetyEngine.validatePreviewConfirmation(
          "animation.deleteKeyframe",
          { layerId: 1, channel: "translation", frame: 999 },
          plan.previewHash
        )
      ).toThrow(MohoValidationError);
    });

    it("rejects a parameter key that was not part of the approved plan", () => {
      const plan = freshDeletePlan();

      expect(() =>
        safetyEngine.validatePreviewConfirmation(
          "animation.deleteKeyframe",
          { layerId: 1, channel: "translation", frame: 10, outputPath: "/etc/passwd" },
          plan.previewHash
        )
      ).toThrow(MohoValidationError);
    });

    it("accepts the exact approved parameters", () => {
      const plan = freshDeletePlan();

      expect(() =>
        safetyEngine.validatePreviewConfirmation(
          "animation.deleteKeyframe",
          { layerId: 1, channel: "translation", frame: 10 },
          plan.previewHash
        )
      ).not.toThrow();
    });

    /**
     * Documents a deliberate gap rather than asserting it is safe.
     *
     * `validatePreviewConfirmation` only rejects parameters that CONTRADICT the
     * plan; a caller that omits keys entirely passes. The engine states this
     * explicitly (see the comment above the `conflicts` loop) and leans on the
     * Lua plugin to reject a destructive call with missing required parameters.
     *
     * The test is here so the behaviour is a recorded decision, not folklore: if
     * someone later tightens omission into a rejection, this test fails and
     * forces the tools.ts call sites — which do forward full params — to be
     * re-checked at the same time.
     */
    it("permits omitted keys, per the engine's documented limit", () => {
      const plan = freshDeletePlan();

      expect(() =>
        safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", {}, plan.previewHash)
      ).not.toThrow();
    });

    it("stops a confirmation from being replayed once consumed", () => {
      const plan = freshDeletePlan();
      const params = { layerId: 1, channel: "translation", frame: 10 };

      expect(() =>
        safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", params, plan.previewHash)
      ).not.toThrow();

      expect(safetyEngine.consumePlan(plan.previewHash)).toBe(true);

      expect(() =>
        safetyEngine.validatePreviewConfirmation("animation.deleteKeyframe", params, plan.previewHash)
      ).toThrow(MohoValidationError);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* batch gate                                                               */
  /* ------------------------------------------------------------------------ */

  describe("batch safety", () => {
    it("refuses a destructive operation inside a batch", () => {
      // A batch carries at most one previewHash and cannot confirm per
      // operation, so allowing this would turn batch.execute into a bypass of
      // the whole confirmation mechanism.
      expect(() =>
        safetyEngine.validateBatchSafety(
          [
            { method: "document.getInfo", params: {} },
            { method: "layer.delete", params: { layerId: 3 } }
          ],
          [os.tmpdir()]
        )
      ).toThrow(MohoValidationError);
    });

    it("refuses a nested batch", () => {
      expect(() =>
        safetyEngine.validateBatchSafety(
          [{ method: "batch.execute", params: { operations: [] } }],
          [os.tmpdir()]
        )
      ).toThrow(MohoValidationError);
    });

    it("refuses an empty batch", () => {
      expect(() => safetyEngine.validateBatchSafety([], [os.tmpdir()])).toThrow(MohoValidationError);
    });

    it("sandboxes path-bearing parameters of nested operations", () => {
      expect(() =>
        safetyEngine.validateBatchSafety(
          [{ method: "document.render", params: { outputPath: "/etc/passwd" } }],
          [os.tmpdir()]
        )
      ).toThrow(MohoSecurityError);
    });

    it("accepts a batch of whitelisted read operations", () => {
      expect(() =>
        safetyEngine.validateBatchSafety(
          [
            { method: "document.getInfo", params: {} },
            { method: "document.getLayers", params: {} }
          ],
          [os.tmpdir()]
        )
      ).not.toThrow();
    });
  });

  /* ------------------------------------------------------------------------ */
  /* path sandbox edges                                                       */
  /* ------------------------------------------------------------------------ */

  describe("path sandbox", () => {
    it("rejects traversal that escapes an allowed root", () => {
      const tmpDir = os.tmpdir();
      expect(() =>
        safetyEngine.validatePathSandbox(path.join(tmpDir, "..", "..", "etc", "passwd"), [tmpDir])
      ).toThrow(MohoSecurityError);
    });

    it("rejects a sibling directory sharing the root's name prefix", () => {
      // `/tmp/moho-evil` must not pass a `/tmp/moho` sandbox: a naive
      // `startsWith` without the separator would let it through.
      const root = path.join(os.tmpdir(), "moho");
      expect(() =>
        safetyEngine.validatePathSandbox(`${root}-evil/out.png`, [root])
      ).toThrow(MohoSecurityError);
    });

    it("refuses to resolve anything when no roots are configured", () => {
      expect(() => safetyEngine.validatePathSandbox("/tmp/whatever.png", [])).toThrow(
        MohoSecurityError
      );
    });
  });

  /* ------------------------------------------------------------------------ */
  /* destructive classification                                               */
  /* ------------------------------------------------------------------------ */

  describe("destructive classification", () => {
    it("marks operations that destroy unrecoverable work", () => {
      for (const method of [
        "animation.deleteKeyframe",
        "layer.delete",
        "bone.deleteBone",
        "mesh.weld",
        "document.save",
        "document.close",
        "document.open",
        "workflow.batchRender"
      ]) {
        expect(safetyEngine.isDestructive(method)).toBe(true);
      }
    });

    it("leaves ordinary authoring and read operations ungated", () => {
      for (const method of [
        "document.getInfo",
        "document.getLayers",
        "animation.setKeyframe",
        "animation.setInterpolation",
        "layer.setTransform",
        "layer.reorder"
      ]) {
        expect(safetyEngine.isDestructive(method)).toBe(false);
      }
    });

    it("does not gate a non-destructive method even without a hash", () => {
      expect(() =>
        safetyEngine.validatePreviewConfirmation("animation.setKeyframe", { frame: 1 })
      ).not.toThrow();
    });
  });

  /* ------------------------------------------------------------------------ */
  /* idempotency bookkeeping                                                  */
  /* ------------------------------------------------------------------------ */

  it("reports a repeated idempotency key as already executed", () => {
    const key = `idem_${Date.now()}_${Math.random()}`;
    expect(safetyEngine.markExecuted(key)).toBe(true);
    expect(safetyEngine.markExecuted(key)).toBe(false);
  });
});
