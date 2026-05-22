import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import nodePath from "path";

interface CreateFileInput {
  path: string;
  content: string;
}

export const createFileTool = tool(
  async ({ path, content }: CreateFileInput): Promise<string> => {
    try {
      if (!path || !content) {
        throw new Error("Path and content are required to create a file.");
      }

      const folder = nodePath.dirname(path);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path, content);
      return `File created: ${path}`;
    } catch (error) {
      console.error("Error creating file:", error);
      return `Failed to create file: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "createFileTool",
    description: "Create a new file at the specified path using the provided content.",
    schema: z.object({
      path: z.string().max(300).describe("The full path where the file will be created, including folder and extension."),
      content: z.string().describe("The content to be written in the file."),
    }),
  },
);
