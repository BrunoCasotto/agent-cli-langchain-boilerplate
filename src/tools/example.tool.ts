import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export const createFileTool = tool(
  async ({ path: filePath, content }) => {
    try {
      const resolvedPath = path.resolve(filePath);
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, content, "utf-8");
      return `Arquivo criado com sucesso em: ${resolvedPath}`;
    } catch (error: any) {
      return `Erro ao criar o arquivo: ${error.message}`;
    }
  },
  {
    name: "createFileTool",
    description: "Cria um arquivo no caminho especificado com o conteúdo fornecido.",
    schema: z.object({
      path: z.string().describe("O caminho completo para o arquivo (ex: roteiros/roteiro_tcp-ip.md)"),
      content: z.string().describe("O conteúdo de texto completo do arquivo"),
    }),
  }
);
