# CLI BOILERPLATE
Esse projeto tem o objetivo servir como um boilerplate para criação de agentes utilizando cli e chat, algo semelhante ao gemini cli, antigravity cli, cursor entre outros.

# Tecnologias
- O projeto será desenvolvido em NodeJs
- Poderá ser instalado de maneira global permitindo que configure um bin no package.json para expor sua interface no sistema que o instalou via npm
- Utilizara o nestjs commander como framework de criação
- Typescript
- Jest para testes unitários
- cli-color para colorir e personalizar o chat

# O que deve ter no projeto
O projeto deve contar com algumas pastas e arquivos de exemplo seguindo a seguinte arquitetura:

src/ - pasta onde ficam todos os arquivos do projeto
src/gateways -  pasta onde ficam todas as classes que o projeto expoem ou que conversam com APIS, Banco de DADOS, LLM etc...

**Arquivos e implementações**
O projeto por ser um boilerplate precisa apenas de um exemplo de implementação, sendo necessário algumas classes iniciais e configuradas:

- src/gateways/commanders/agent.commander.ts - Uma classe que expoem um @command (nestjs-command) que permite a troca de mensagens em formato de chat
- src/gateways/logger/logger.gateway.ts - Uma classe que permite que de maneira simples utilize o chalk para formatar dados na tela e colorir de maneira padronizada (erros, debug, messages, log, etc...) (ele vai implementar o ConsoleLogger do nestjs common)
- src/app.module.ts - para configurar o modulo principal do projeto
- src/tools/example.tool.ts -> uma tool de exemplo que será utilizada dentro do arquivo que exporta o agente como mostrado abaixo
- src/agents/example.agent.ts -> uma classe que vai exportar um agente completo que será chamado no fluxo do agent.commander.ts durante a conversa. Segue um exemplo de implementação desse agente:
```
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
import { createFileTool } from "./gateways/tools/index.js";
import defaultMessagesPresenter from "./presenters/defaultMessages.presenter.js";
import writeDebugMessageGateway from "./gateways/writeDebugMessage.gateway.js";

// 1. Configuração das ferramentas
const tools = [createFileTool];
const toolNode = new ToolNode(tools);

// 2. Configuração do Modelo (Ollama)
const model = new ChatOllama({
  model: process.env.OLLAMA_MODEL || "deepseek-r1:8b",
  temperature: 0,
}).bindTools(tools);

const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Você é um YouTuber especialista em Shorts (vídeos curtos), focado em canais de tecnologia e produtividade.

    #Objetivo:
    Criar um roteiro de 50 segundos para um Short/Reel, baseado nos termos, frases, ou assuntos recebidos.

    ## **Estrutura do Roteiro:**
    1) **O Gancho (0-5s):** Uma frase impactante que gere curiosidade imediata (ex: "O Google está escondendo arquivos que você não deveria ver").
    2) **O Problema/Contexto (5-15s):** Explicar rapidamente o tópico do video com uma pegada tecnica mas didática.
    3) **O Tutorial Prático / explicação prática (15-40s):** Mostrar comandos ou conteúdos mais específicos.
    4) **O Alerta final / resolução / Final de impacto (40-45s):** .
    5) **CTA (45-50s):** Chamada para ação rápida (curtir e seguir).

    ## Descrição, tags e título:
    - Crie uma descrição de até 500 caracteres, com emojis relacionados ao tema.
    - Gere 5 tags relevantes para o vídeo.
    - Crie um título chamativo, com no máximo 100 caracteres.

    ## Resultado final
    - Gere um roteiro completo em markdown, com título, descrição e tags.
    - Não salve o arquivo nesta etapa; esta etapa deve apenas gerar o conteúdo inicial do roteiro.
    `
  ],
  new MessagesPlaceholder("messages"),
]);

const promptRevisionTemplate = ChatPromptTemplate.fromMessages([
  "system",
  `Você é um especialista em youtube shorts. Analise criticamente o roteiro sugerido e forneça:
    1. CRÍTICA (o que pode melhorar)
    2. PONTOS FORTES (o que ficou bom)
    3. SUGESTÕES DE AJUSTE (como melhorar o roteiro com foco em engajamento)


    Forneça a resposta no seguinte formato:
    ## CRÍTICA
    [pontos a melhorar]

    ## PONTOS FORTES
    [o que ficou bom]

    ## SUGESTÕES DE AJUSTE
    [como melhorar o roteiro]`,
  new MessagesPlaceholder("messages")
]);

const promptAdjustTemplate = ChatPromptTemplate.fromMessages([
  "system",
  `Você é um especialista em YouTube Shorts. Com base no roteiro original e na revisão anterior, gere a versão final do roteiro pronta para gravação.
    - Inclua Gancho, Problema/Contexto, Tutorial Prático, Alerta Final e CTA.
    - Inclua título, descrição e 5 tags relevantes.
    - Salve o roteiro final usando a ferramenta createFileTool.
    - Use o parâmetro "path" com o caminho completo para o arquivo dentro da pasta "roteiros".
    - Use o parâmetro "content" com o texto completo do roteiro final em markdown.

    Exemplo de caminho: "roteiros/roteiro_tcp-ip.md".
    `,
  new MessagesPlaceholder("messages")
]);

// 3. Nó do LLM (Raciocínio)
async function callModel(state: typeof MessagesAnnotation.State) {
  const formattedPrompt = await promptTemplate.formatMessages({
    messages: state.messages,
  });

  const response = await model.invoke(formattedPrompt);
  defaultMessagesPresenter.debug("Model response received, updating state with new message.");

  return { messages: [response] };
}

async function reviseModel(state: typeof MessagesAnnotation.State) {
  const formattedPrompt = await promptRevisionTemplate.formatMessages({
    messages: state.messages,
  });

  const response = await model.invoke(formattedPrompt);
  defaultMessagesPresenter.debug("Model revision response received, updating state with new message.");

  return { messages: [response] };
}

async function adjustModel(state: typeof MessagesAnnotation.State) {
  const formattedPrompt = await promptAdjustTemplate.formatMessages({
    messages: state.messages,
  });

  const response = await model.invoke(formattedPrompt);
  defaultMessagesPresenter.debug("Model adjust response received, updating state with new message.");

  return { messages: [response] };
}

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1] as any;

  if (lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    defaultMessagesPresenter.debug("Tool call detected, transitioning to tools node.");
    return 'tools';
  }

  writeDebugMessageGateway.execute(state.messages);
  defaultMessagesPresenter.debug("No tool call detected, ending workflow.");

  return END;
};

// 4. Construção do Grafo
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("revise", reviseModel)
  .addNode("adjust", adjustModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("agent", "revise")
  .addEdge("revise", "adjust")
  .addConditionalEdges("adjust", shouldContinue)
  .addEdge("tools", "adjust");

// 5. Compilação com Checkpointer (Memória)
const memory = new MemorySaver();
export const agent = workflow.compile({ checkpointer: memory });
```
- main.ts - arquivo de entry point do projeto

## Importante
O exemplo do agente é apenas uma representação de como deve ser a classe agent, utilize apenas a tool existente nesse cenário e modifique para apenas 1 chamada LLM, 1 Tool, 1 shouldContinue. O exmeplo deve ser simples.

Utilize poucos comentários no código, apenas o necessário para não sujar