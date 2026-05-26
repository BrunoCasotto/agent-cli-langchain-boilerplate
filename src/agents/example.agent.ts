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
import { LoggerGateway } from "../gateways/logger.gateway.js";

export class ExampleAgent {
  private _logger: LoggerGateway;
  private _memory: MemorySaver;
  private _model: ChatOllama;
  private _agent: any;
  private _promptTemplate: ChatPromptTemplate = undefined as any;
  private _defaultPrompt = `
    You are a helpful and attentive assistant. If the user asks to create a file, use the appropriate tool.
    
    #Goal:
    Answer questions or perform tasks based on the user's messages, using available tools when necessary.

    ## Chain of thought
    - Whenever you receive a user message, determine whether a tool is needed to answer or execute the task.
    - If a tool is needed, choose the most appropriate one and provide the details required for execution.
    - After tool execution, analyze the result and decide whether another tool is needed or if you can respond directly using the available information.
    - If a tool is not needed, respond directly to the user using the available information.
    `;

  constructor(
    tools: any[],
    model: string = "gemma4:latest",
    instructions: string = this._defaultPrompt,
  ) {
    this._logger = new LoggerGateway();
    this._memory = new MemorySaver();
    this._model = this._instanceAgent(tools, model);
    this._compileTemplate(instructions);
    this._compileWorkflow(tools);

    this._logger.debug(`Agent initialized with model: ${model} and tools: ${tools.map((t) => t.name).join(", ")}`);
  }

  private _instanceAgent(tools: any[], model: string): ChatOllama {
    const modelInstance = new ChatOllama({
      model,
      temperature: 0,
    }).bindTools(tools);

    return modelInstance as ChatOllama;
  }

  private async _callModel(state: typeof MessagesAnnotation.State): Promise<{ messages: any[] }> {
    const formattedPrompt = await this._promptTemplate.formatMessages({
      messages: state.messages,
    });

    const response = await this._model.invoke(formattedPrompt);
    return { messages: [response] };
  }

  private _shouldContinue(state: typeof MessagesAnnotation.State): string {
    const lastMessage = state.messages[state.messages.length - 1] as any;

    if (lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return 'tools';
    }

    return END;
  }

  private _compileWorkflow(tools: any[]): void {
    const toolNode = new ToolNode(tools);
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", this._callModel.bind(this))
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", this._shouldContinue.bind(this))
      .addEdge("tools", "agent");

    this._agent = workflow.compile({ checkpointer: this._memory });
  }

  private _compileTemplate(instructions: string): void {
    this._promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", instructions],
      new MessagesPlaceholder("messages"),
    ]);
  }

  get agent() {
    return this._agent;
  }
}