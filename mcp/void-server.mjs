#!/usr/bin/env node
// Project-local MCP server for the Void platform. Void ships no MCP server of
// its own, so this wraps the installed `void` CLI and its bundled Markdown docs.
// Deploys, rollbacks, deletes and secret writes are deliberately not exposed:
// run those through the CLI where the command is visible.
import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const voidBin = path.join(root, 'node_modules', '.bin', 'void');
const docsDir = path.join(root, 'node_modules', 'void', 'docs');

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;

function runVoid(args) {
  return new Promise((resolve) => {
    execFile(
      voidBin,
      args,
      {
        cwd: root,
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        // CI=1 keeps the CLI from opening interactive prompts on stdin.
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
      },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr ? `\n${stderr}` : ''}`.replace(ANSI, '').trim();
        resolve({ ok: !error, text: output || (error ? error.message : '(no output)') });
      },
    );
  });
}

async function listDocs(dir = docsDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listDocs(full);
      return entry.name.endsWith('.md') ? [path.relative(docsDir, full)] : [];
    }),
  );
  return files.flat().sort();
}

async function searchDocs(query) {
  const needle = query.toLowerCase();
  const results = [];
  for (const file of await listDocs()) {
    const lines = (await readFile(path.join(docsDir, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(needle)) results.push(`${file}:${i + 1}: ${line.trim()}`);
    });
    if (results.length >= 100) break;
  }
  return results.length ? results.slice(0, 100).join('\n') : `No matches for "${query}".`;
}

async function readDoc(relPath) {
  const full = path.resolve(docsDir, relPath);
  if (!full.startsWith(docsDir + path.sep)) throw new Error('Path must be inside the Void docs.');
  return readFile(full, 'utf8');
}

// Remote queries hit the deployed D1 database, so only allow statements that
// cannot write. Local queries run against the dev database and are unrestricted.
const READ_ONLY_SQL = /^\s*(select|with|pragma|explain)\b/i;

const tools = [
  {
    name: 'void_docs_list',
    description: 'List the Markdown docs bundled with the installed Void version.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: async () => (await listDocs()).join('\n'),
  },
  {
    name: 'void_docs_search',
    description: 'Case-insensitive substring search across the bundled Void docs. Returns file:line matches.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Text to search for' } },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
    run: ({ query }) => searchDocs(query),
  },
  {
    name: 'void_docs_read',
    description: 'Read one bundled Void doc, e.g. "guide/database.md" or "reference/cli.md".',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Path relative to node_modules/void/docs' } },
      required: ['path'],
    },
    annotations: { readOnlyHint: true },
    run: ({ path: relPath }) => readDoc(relPath),
  },
  {
    name: 'void_info',
    description: 'Inspect persistent resource names (D1, KV, R2, queues) Void infers for this project, without deploying.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    cli: () => ['info', '--json'],
  },
  {
    name: 'void_auth_status',
    description: 'Show the selected deploy destination (Void platform or Cloudflare) and the signed-in identity.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    cli: () => ['auth', 'status'],
  },
  {
    name: 'void_project_status',
    description: 'Show deployments for the linked project, or for a named project.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Project name (defaults to the linked project)' } },
    },
    annotations: { readOnlyHint: true },
    cli: ({ name }) => ['project', 'status', ...(name ? [name] : [])],
  },
  {
    name: 'void_project_logs',
    description: 'Show runtime logs from the deployed project.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['error', 'warn', 'info', 'log', 'debug', 'all'] },
        range: { type: 'string', description: 'Time range, e.g. "30m" or "6h" (default 1h)' },
        filter: { type: 'string', description: 'Substring search over log messages' },
        deployment: { type: 'string', description: 'Limit to one deployment id' },
      },
    },
    annotations: { readOnlyHint: true },
    cli: ({ level, range, filter, deployment }) => [
      'project',
      'logs',
      ...(level ? ['--level', level] : []),
      ...(range ? ['--range', range] : []),
      ...(filter ? ['--filter', filter] : []),
      ...(deployment ? ['--deployment', deployment] : []),
    ],
  },
  {
    name: 'void_db_status',
    description: 'Show local and remote migration status for the project database.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    cli: () => ['db', 'status'],
  },
  {
    name: 'void_db_query',
    description:
      'Run SQL against the local dev database, or a read-only query (SELECT/WITH/PRAGMA/EXPLAIN) against the deployed D1 database with remote=true.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string' },
        remote: { type: 'boolean', description: 'Query the deployed database instead of local (read-only)' },
      },
      required: ['sql'],
    },
    annotations: { destructiveHint: true },
    cli: ({ sql, remote }) => {
      if (remote && !READ_ONLY_SQL.test(sql)) {
        throw new Error('Remote queries are read-only here. Use `npx void db execute --remote` for writes.');
      }
      return ['db', 'execute', ...(remote ? ['--remote'] : []), sql];
    },
  },
];

const server = new Server({ name: 'void', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }] };
  const args = request.params.arguments ?? {};
  try {
    if (tool.run) return { content: [{ type: 'text', text: await tool.run(args) }] };
    const { ok, text } = await runVoid(tool.cli(args));
    return { isError: !ok, content: [{ type: 'text', text }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error.message }] };
  }
});

await server.connect(new StdioServerTransport());
