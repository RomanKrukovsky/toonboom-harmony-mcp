/**
 * MCP tool definitions and handlers for the MOHO bridge.
 *
 * Every tool:
 *  - Has its inputs validated by a Zod schema (see ./schemas.ts).
 *  - Routes through the MohoSafetyEngine whitelist.
 *  - Sends through the IPC client which applies timeout, queue, and error mapping.
 *  - Returns MCP-formatted content (text or error) with structured error codes.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MohoClient } from "./moho-client.js";
export declare function registerTools(server: McpServer, client: MohoClient): void;
