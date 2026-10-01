# Connecting to the hosted MCP server

This repository holds the CPM engine. The forensic tools that use it are
served as a hosted Model Context Protocol (MCP) server. Nothing needs to
be installed, built or run locally: the server is remote and needs no
API key.

## Endpoint

| Item | Value |
| --- | --- |
| URL | `https://mcp.criticalpathpartners.ca/mcp` |
| Transport | Streamable HTTP |
| Legacy transport | `https://mcp.criticalpathpartners.ca/sse` (SSE) |
| Authentication | none |
| Health check | `https://mcp.criticalpathpartners.ca/health` |
| Try it in a browser | `https://mcp.criticalpathpartners.ca/try` |

## Cline

Add the server to `cline_mcp_settings.json` (Cline > MCP Servers >
Configure):

```json
{
  "mcpServers": {
    "criticalpathpartners": {
      "url": "https://mcp.criticalpathpartners.ca/mcp",
      "type": "streamableHttp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "criticalpathpartners": {
      "url": "https://mcp.criticalpathpartners.ca/mcp"
    }
  }
}
```

## Claude Code

```bash
claude mcp add --transport http criticalpathpartners https://mcp.criticalpathpartners.ca/mcp
```

## Claude Desktop and other SSE-only clients

Point the client at `https://mcp.criticalpathpartners.ca/sse`.

## Verifying the connection

Call `tools/list`. The server registers thirteen tools:

`xer_parser`, `dcma14_health_check`, `critical_path_validator`,
`path_explorer`, `forensic_windows_analysis`, `concurrent_delay_matrix`,
`slip_velocity`, `time_impact_analysis_fragnet`, `collapsed_as_built`,
`monte_carlo_p50_p80`, `qramm_maturity`, `woet_classifier`,
`claim_workbench_evidence_ledger`.

The health endpoint reports `"registered": 13` and `"degraded": false`
when every tool loaded.

## What the tools need

Every analysis tool takes the content of a Primavera P6 XER export. Each
tool's input schema, returned by `tools/list`, states the exact field
names. Nothing else is required.

## Running the engine itself locally

If you want the calculation engine rather than the hosted tools, clone
this repository and require `cpm-engine.js`; it has no runtime
dependencies. See `README.md` under "Quick start".
