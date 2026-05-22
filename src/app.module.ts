import { Module } from "@nestjs/common";
import { AgentCommander } from "./gateways/commanders/agent.commander.js";
import { LoggerGateway } from "./gateways/logger/logger.gateway.js";

@Module({
  providers: [AgentCommander, LoggerGateway],
})
export class AppModule {}
