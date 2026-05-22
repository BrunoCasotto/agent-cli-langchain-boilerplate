import {
  StateGraph,
  MessagesAnnotation,
  START,
  END
} from "@langchain/langgraph";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { createFileTool } from "../tools/example.tool.js";

const tools = [createFileTool];
const toolNode = new ToolNode(tools);

const model = new ChatOllama({
  model: process.env.OLLAMA_MODEL || "deepseek-r1:8b",
  temperature: 0,
}).bindTools(tools);

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Você é um assistente útil e prestativo. Se o usuário pedir para criar um arquivo, use a ferramenta createFileTool para fazer isso."
  ],
  new MessagesPlaceholder("messages"),
]);

async function callModel(state: typeof MessagesAnnotation.State) {
  const formattedPrompt = await promptTemplate.formatMessages({
    messages: state.messages,
  });

  const response = await model.invoke(formattedPrompt);
  return { messages: [response] };
}

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as any;

  if (lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }
  return END;
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const memory = new MemorySaver();
export const agent = workflow.compile({ checkpointer: memory });
