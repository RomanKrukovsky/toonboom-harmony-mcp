import { config } from "../../src/moho/config.js";

describe("config", () => {
  describe("moho section", () => {
    it("has a default ipcDir string", () => {
      expect(typeof config.moho.ipcDir).toBe("string");
      expect(config.moho.ipcDir.length).toBeGreaterThan(0);
    });

    it("has pollInterval of 100ms by default", () => {
      expect(config.moho.pollInterval).toBeGreaterThan(0);
      expect(config.moho.pollInterval).toBeLessThanOrEqual(5000);
    });

    it("has a requestTimeout of 10000ms by default", () => {
      expect(config.moho.requestTimeout).toBeGreaterThanOrEqual(1000);
    });

    it("has maxBatchSize of 50 by default", () => {
      expect(config.moho.maxBatchSize).toBe(50);
    });

    it("has preview TTL and request TTL", () => {
      expect(config.moho.previewTtlMs).toBeGreaterThan(config.moho.requestTtlMs / 2);
    });
  });

  describe("server section", () => {
    it('has name "moho-mcp"', () => {
      expect(config.server.name).toBe("moho-mcp");
    });

    it("has a version", () => {
      expect(config.server.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("has a current protocol version matching semver", () => {
      expect(config.server.protocolVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe("security section", () => {
    it("exists and is frozen", () => {
      expect(config.security).toBeDefined();
      expect(Object.isFrozen(config.security)).toBe(true);
    });

    it("defaults to no outbound traffic", () => {
      expect(config.security.noOutboundTraffic).toBe(true);
    });
  });

  describe("uiAutomation section", () => {
    it("exists with conservative defaults", () => {
      expect(config.uiAutomation).toBeDefined();
      expect(config.uiAutomation.emergencyStopKey).toBe("Ctrl+Alt+Shift+X");
    });
  });

  describe("structure", () => {
    it("is frozen at every level", () => {
      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.moho)).toBe(true);
      expect(Object.isFrozen(config.server)).toBe(true);
    });
  });
});
