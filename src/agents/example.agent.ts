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
import { LoggerGateway } from "../gateways/logger/logger.gateway.js";

export class ExampleAgent {
  private _logger: LoggerGateway;
  private _memory: MemorySaver;
  private _model: ChatOllama;
  private _agent: any;
  private _promptTemplate: ChatPromptTemplate = undefined as any;
  private _defaultPrompt = `
    Você é um assistente útil e prestativo. Se o usuário pedir para criar um arquivo.
    
    #Objetivo:
    Responder perguntas ou executar tarefas com base nas mensagens do usuário, utilizando as ferramentas disponíveis quando necessário.

    ## Cadeira de pensamento
    - Sempre que receber uma mensagem do usuário, analise se é necessário usar uma ferramenta para responder ou executar a tarefa.
    - Se for necessário usar uma ferramenta, escolha a ferramenta mais adequada e forneça as informações necessárias para sua execução.
    - Após a execução da ferramenta, analise o resultado e decida se é necessário usar outra ferramenta ou se pode responder ao usuário com base nas informações disponíveis.
    - Se não for necessário usar uma ferramenta, responda diretamente ao usuário com base nas informações disponíveis.
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

    this._logger.debug(`Agente inicializado com modelo: ${model} e ferramentas: ${tools.map((t) => t.name).join(", ")}`);
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