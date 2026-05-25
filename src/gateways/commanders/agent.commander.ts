import { Command, CommandRunner } from "nest-commander";
import * as readline from "readline";
import { LoggerGateway } from "../logger.gateway.js";
import { GenerateHumanMessageUseCase } from "../../usecases/generateHumanMessage.usecase.js";
import { ExampleAgent } from "../../agents/example.agent.js";
import { createFileTool } from "../../tools/example.tool.js";

@Command({
  name: "chat",
  description: "Inicia uma sessão de chat interativo com o agente de IA",
})
export class AgentCommander extends CommandRunner {
  private readonly _agentInstance: ExampleAgent;

  constructor(
    private readonly logger: LoggerGateway,
    private readonly generateHumanMessageUseCase: GenerateHumanMessageUseCase
  ) {
    super();
    this._agentInstance = new ExampleAgent([createFileTool]);
  }

  async run(): Promise<void> {
    let loader: NodeJS.Timeout | null = null;
    this.logger.log("Iniciando chat com o agente... Digite 'exit' ou 'sair' para encerrar.");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const thread_id = "default-thread";
    const config = { configurable: { thread_id } };

    const askQuestion = () => {
      rl.question(this.logger.formatPrompt("Você: "), async (input) => {
        const cleanInput = input.trim();
        if (cleanInput.toLowerCase() === "exit" || cleanInput.toLowerCase() === "sair") {
          rl.close();
          return;
        }

        if (cleanInput === "") {
          askQuestion();
          return;
        }

        try {
          loader = this.logger.loaderAnimation("");
          const response = await this._agentInstance.agent.invoke(
            { messages: [this.generateHumanMessageUseCase.execute(cleanInput)] },
            config
          );

          const messages = response.messages;
          const lastMessage = messages[messages.length - 1];

          if (lastMessage && lastMessage.content) {
            this.logger.logAgent(`Agente: ${lastMessage.content}`);
          } else {
            this.logger.warn("O agente não retornou nenhuma resposta textual.");
          }
        } catch (error: any) {
          this.logger.error(`Erro ao processar mensagem: ${error.message}`);
        } finally {
          if (loader) {
            this.logger.stopLoaderAnimation(loader);
          }
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}
