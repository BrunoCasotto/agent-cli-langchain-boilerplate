import { Injectable } from "@nestjs/common";
import { HumanMessage } from "@langchain/core/messages";

@Injectable()
export class GenerateHumanMessageUseCase {
  execute(content: string) {
    return new HumanMessage(content);
  }
}