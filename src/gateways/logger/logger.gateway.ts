import { ConsoleLogger, Injectable } from "@nestjs/common";
import * as clc from "cli-color";

@Injectable()
export class LoggerGateway extends ConsoleLogger {
  log(message: any, context?: string) {
    console.log(clc.green(`[INFO] ${message}`));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(clc.red(`[ERROR] ${message}`));
    if (trace) {
      console.error(clc.red.bold(trace));
    }
  }

  warn(message: any, context?: string) {
    console.warn(clc.yellow(`[WARN] ${message}`));
  }

  debug(message: any, context?: string) {
    console.debug(clc.magenta(`[DEBUG] ${message}`));
  }

  verbose(message: any, context?: string) {
    console.log(clc.cyan(`[VERBOSE] ${message}`));
  }

  formatPrompt(promptText: string): string {
    return clc.blue.bold(promptText);
  }

  logAgent(message: string): void {
    console.log(clc.cyanBright(message));
  }
}
