import { LoggerGateway } from "./logger.gateway.js";

describe("LoggerGateway", () => {
  let loggerGateway: LoggerGateway;

  beforeEach(() => {
    loggerGateway = new LoggerGateway();
  });

  it("should be defined", () => {
    expect(loggerGateway).toBeDefined();
  });

  it("should format prompts using cli-color styling", () => {
    const formatted = loggerGateway.formatPrompt("Test Prompt");
    expect(formatted).toContain("Test Prompt");
  });

  it("should output logs correctly", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    loggerGateway.log("test log");
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
