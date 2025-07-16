import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LandscapeData } from "../landscape-schemes/landscape-data";

interface StartServerData {
  landscapeData: LandscapeData | null
}

export async function startServer({ landscapeData }: StartServerData) {
  const server = new McpServer({
    name: "explorviz",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });



  const transport = new StdioServerTransport();
  await server.connect(transport);
}