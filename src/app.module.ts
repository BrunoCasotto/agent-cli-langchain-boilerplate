import { Module } from "@nestjs/common";
import { AgentCommander } from "./gateways/commanders/agent.commander.js";
import { LoggerGateway } from "./gateways/logger.gateway.js";
import { GenerateHumanMessageUseCase } from "./usecases/generateHumanMessage.usecase.js";

@Module({
  providers: [
    GenerateHumanMessageUseCase,
    AgentCommander,
    LoggerGateway
  ],
})
export class AppModule { }
