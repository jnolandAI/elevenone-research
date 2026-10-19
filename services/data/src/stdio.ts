// Local MCP over stdio, for development and for running the server inside a
// client such as Claude Desktop. It uses the upstream keys in this process's
// own environment; the hosted service is what spares a client from holding them.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { Upstream } from './core/http.js';
import { buildMcpServer } from './mcp.js';

const config = loadConfig();
const http = new Upstream({ timeoutMs: config.upstreamTimeoutMs, cacheMaxEntries: config.cacheMaxEntries });
// stdout carries the protocol, so logs go to stderr
const server = buildMcpServer({ config, http }, (l) => console.error(JSON.stringify(l)));
await server.connect(new StdioServerTransport());
