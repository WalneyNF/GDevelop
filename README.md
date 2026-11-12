# WMK Game Studio — GDevelop com JavaScript, Monaco e componentes

<p align="center">
  <img src="https://raw.githubusercontent.com/4ian/GDevelop/master/newIDE/GDevelop%20banner.png" alt="Banner original do GDevelop" width="750">
</p>

> **Projeto experimental de evolução do GDevelop.** O objetivo é oferecer uma experiência inspirada em **Unity + Godot**, com **programação JavaScript direta**, scripts anexados aos objetos, **Monaco Editor** e a opção de continuar utilizando a programação visual original.
>
> **Situação:** o Modo Código WMK está em desenvolvimento. Os exemplos e as instruções da branch experimental **não representam uma versão estável**. Para GDevelop tradicional, utilize a versão oficial. **Nenhuma função planejada é anunciada como concluída sem validação.**

**Autor das modificações WMK:** Walney Moreira Klein — [walneyk@hotmail.com](mailto:walneyk@hotmail.com).  
**Projeto de origem:** [GDevelop](https://github.com/4ian/GDevelop), criado por **Florian Rival** e desenvolvido com a comunidade. Os direitos, nomes, marcas, licenças e créditos originais são preservados.

[![Repositório WMK](https://img.shields.io/badge/Fork-WalneyNF%2FWMK-Game-Studio-8a9cff?logo=github)](https://github.com/WalneyNF/WMK-Game-Studio)
[![Documentação](https://img.shields.io/badge/Roadmap-HTML-50d6cc)](roadmap.html)
[![Experimental](https://img.shields.io/badge/Modo%20JS-Experimental-ffca72)](https://github.com/WalneyNF/WMK-Game-Studio/pull/1)

## Índice

- [O que é o WMK Game Studio?](#o-que-é-o-wmk-game-studio)
- [Dois modos de programação](#dois-modos-de-programação)
- [O que já foi modificado](#o-que-já-foi-modificado)
- [Como experimentar o protótipo](#como-experimentar-o-protótipo)
- [Guia rápido de código JavaScript](#guia-rápido-de-código-javascript)
- [Roadmap e prioridades](#roadmap-e-prioridades)
- [Compilação do fork](#compilação-do-fork)
- [Arquitetura técnica](#arquitetura-técnica)
- [Testes e contribuições](#testes-e-contribuições)
- [Recursos do GDevelop original](#recursos-do-gdevelop-original)
- [Licenças e atribuições](#licenças-e-atribuições)

## O que é o WMK Game Studio?

O WMK Game Studio é a proposta de uma nova experiência de desenvolvimento construída **sobre o código do GDevelop**. Queremos manter seu motor GDJS, renderização, recursos, comportamentos, editor de cenas e exportadores, mas oferecer um fluxo para quem prefere **programar em JavaScript diretamente**, sem ter de criar eventos visuais.

A inspiração é a combinação de:

- **Unity:** objetos, componentes, Inspetor, propriedades e múltiplos scripts anexados.
- **Godot:** organização de cenas, reutilização, sinais e fluxo direto de scripts por objeto.
- **VS Code/Monaco:** editor profissional com destaque de sintaxe, IntelliSense, navegação e ferramentas de produtividade.
- **Blender:** painéis flexíveis, reposicionáveis, escaláveis e layouts persistentes.
- **GDevelop:** motor de jogos, ferramentas visuais, ecossistema de extensões e exportadores existentes.

O foco de desenvolvimento é a **abertura do código-fonte**, a **documentação em português do Brasil** e a **execução acessível em computadores modestos**, sem obrigar o uso de serviços pagos ou APIs de inteligência artificial.

![Editor do GDevelop original](https://raw.githubusercontent.com/4ian/GDevelop/master/newIDE/GDevelop%20screenshot.png "Captura do editor original do GDevelop")

> A imagem acima representa o **editor original**, não uma captura do futuro ambiente WMK. O visual definitivo do WMK Game Studio será implementado e documentado conforme os marcos do roadmap.

## Dois modos de programação

| Funcionalidade | Modo Visual | Modo Código JS (WMK) |
| --- | --- | --- |
| Criar cenas e objetos | Editor gráfico original | Mesmo editor gráfico |
| Programar regras | Condições e ações visuais | Scripts JavaScript |
| Editar código | Eventos de JS disponíveis no GDevelop | Monaco diretamente no objeto |
| Dependência dos Eventos | Parte do fluxo visual | **Não é necessária** |
| Scripts anexados | Comportamentos existentes | Implementação experimental; múltiplos scripts planejados |
| `start()` e `update(dt)` | Eventos/comportamentos do GDevelop | Implementados experimentalmente no runtime |
| Debugger e IntelliSense completos para scripts de objetos | Recursos existentes do GDevelop | Planejados |
| Exportar jogos | Recursos originais do GDevelop | Compatibilidade WMK ainda em validação |

**Princípio:** os dois modos serão **independentes**. O usuário poderá criar um jogo inteiro usando código, usar apenas eventos visuais ou combinar os dois.

## O que já foi modificado

As modificações abaixo estão na branch experimental **[`wmk-js-object-editor-v1`](https://github.com/WalneyNF/WMK-Game-Studio/tree/wmk-js-object-editor-v1)**, discutidas no [Pull Request #1](https://github.com/WalneyNF/WMK-Game-Studio/pull/1). Elas **não foram incorporadas automaticamente à branch `master`**.

| Item | Situação | Local |
| --- | --- | --- |
| Aba **Script JS** no editor de objetos | Implementada no código; teste de interface pendente | `newIDE/app/src/ObjectEditor/ObjectEditorDialog.js` |
| Botão **Anexar Script JS** | Implementado no código; teste de interface pendente | `ObjectEditorDialog.js` |
| Monaco embutido na aba do objeto | Implementado no código, reutilizando o Monaco nativo | `newIDE/app/src/ObjectEditor/ObjectJavaScriptEditor.js` |
| Armazenamento do script no projeto | Provisório, em variável interna de objeto | `__WMK_JAVASCRIPT_SOURCE` |
| Execução de `start()` por instância | Implementação experimental; integração funcional em validação | `GDJS/Runtime/runtimeobject.ts` |
| Execução de `update(dt)` a cada quadro | Implementação experimental; integração funcional em validação | `GDJS/Runtime/runtimeobject.ts` |
| Testes para instâncias independentes | Testes adicionados; execução funcional deve ser conferida no CI | `GDJS/tests/tests/wmk-attached-javascript.js` |
| CI de tipos, lint e testes | Workflows configurados; consultar resultados de cada commit | `.github/workflows/wmk-js-validation.yml` |
| Compilação Windows experimental | Workflow configurado; artefato depende de build bem-sucedido | `.github/workflows/wmk-js-windows.yml` |
| Roadmap interativo em HTML | Arquivo criado | [`roadmap.html`](roadmap.html) |

**Importante:** ainda não há um gerenciador nativo de arquivos `.js`, sistema de múltiplos componentes/script, debugger integrado ou painel desacoplável final. Esses itens aparecem no roadmap como **planejados**.

### Fluxo desejado

```text
Editor de cenas
  └─ Selecionar spr_robo
      └─ Abrir objeto → Script JS → Anexar Script JS
          └─ Editar JavaScript no Monaco
              └─ Aplicar e salvar → Play
                  └─ start() / update(dt) executados por instância
```

**Nenhum evento JavaScript precisa ser adicionado manualmente à aba Eventos** para esse modo de execução. A integração de ponta a ponta ainda deve ser verificada no aplicativo compilado.

## Como experimentar o protótipo

**Não use a versão experimental como único ambiente para um projeto importante. Faça backup do projeto antes dos testes.**

1. Abra o [Pull Request #1](https://github.com/WalneyNF/WMK-Game-Studio/pull/1) e confira os testes do commit.
2. Acesse [Actions do fork](https://github.com/WalneyNF/WMK-Game-Studio/actions) e selecione **WMK JS Studio - Build Windows Experimental**.
3. **Somente se o build terminar com sucesso**, baixe o artefato `WMK-JavaScript-Studio-Windows-Experimental`.
4. Extraia o pacote ou execute o instalador, conforme os arquivos efetivamente gerados. Preferencialmente mantenha a instalação anterior intacta.
5. Abra uma cópia do projeto **WMK Robo Aventureiro**, selecione `spr_robo` e abra sua aba **Script JS**.
6. Anexe o script, confirme o código no Monaco, clique em **Aplicar**, salve e visualize.
7. Teste o movimento, feche e reabra o projeto e confirme se o código persistiu.

**Se a compilação falhar, não há executável validado disponível.** Não suponha que uma execução antiga do workflow contenha as últimas mudanças.

## Guia rápido de código JavaScript

### Código experimental do objeto `spr_robo`

A interface experimental fornece três referências ao script:

- `object` — instância atual do objeto no jogo.
- `runtimeScene` — cena em execução.
- `gdjs` — API do motor GDevelop.

Exemplo compatível com **a API experimental de funções** adicionada ao runtime:

```javascript
let velocidade = 180;

function start() {
  console.log('Robô iniciado:', object.getName());
}

function update(dt) {
  if (gdjs.evtTools.input.isKeyPressed(runtimeScene, 'Right')) {
    object.setX(object.getX() + velocidade * dt);
  }
  if (gdjs.evtTools.input.isKeyPressed(runtimeScene, 'Left')) {
    object.setX(object.getX() - velocidade * dt);
  }
  if (gdjs.evtTools.input.isKeyPressed(runtimeScene, 'Up')) {
    object.setY(object.getY() - velocidade * dt);
  }
  if (gdjs.evtTools.input.isKeyPressed(runtimeScene, 'Down')) {
    object.setY(object.getY() + velocidade * dt);
  }
}
```

O parâmetro `dt` é medido em **segundos**. A função `start` é inicializada por instância, enquanto `update` é chamada durante a atualização do objeto. **Teste esse fluxo na compilação WMK**, pois ele ainda não integra uma versão estável do GDevelop.

### API futura (ainda não implementada)

A evolução proposta inclui scripts organizados em classes:

```javascript
// Exemplo de projeto de API — ainda NÃO suportado na v0.1:
export default class Robo extends WMK.Component {
  start() {
    this.velocidade = 180;
  }

  update(dt) {
    if (WMK.Input.isPressed('ArrowRight')) {
      this.object.x += this.velocidade * dt;
    }
  }
}
```

Esse padrão de `WMK.Component` exigirá uma camada de componentes, sistema de módulos e compilação de scripts, previstos para versões futuras.

## Roadmap e prioridades

**[Abrir o roadmap completo em HTML](roadmap.html)** — documento interativo com arquitetura, critérios de aceitação, riscos, plano de testes e checklist.

| Versão proposta | Prioridade | Objetivo |
| --- | --- | --- |
| **v0.1** | P0 | Anexar script ao objeto, Monaco e comprovação de `start/update` |
| **v0.2** | P0 | Recursos e arquivos `.js` de primeira classe |
| **v0.3** | P0 | Modo Código em abas com explorador de scripts |
| **v0.4** | P0 | Múltiplos scripts e componentes por objeto |
| **v0.5** | P1 | Workspaces livres, Inspetor aprimorado e layouts salvos |
| **v0.6** | P0/P1 | Debugger, IntelliSense, console e inspeção |
| **v0.7** | P1 | APIs, sinais, colisões, módulos e componentes reutilizáveis |
| **v0.8–0.9** | P1 | Exemplos, exportação validada, documentação e releases |
| **v1.0** | Meta | Primeira versão estável com fluxo JS completo |

### Critérios mínimos para considerar a v0.1 funcional

- [ ] Editar `spr_robo` sem abrir a aba Eventos.
- [ ] Anexar código JS e abrir o Monaco.
- [ ] Executar `start()` e `update(dt)` durante a pré-visualização.
- [ ] Salvar/reabrir preservando integralmente o script.
- [ ] Manter instâncias independentes e sem regressões para objetos tradicionais.
- [ ] Aprovar testes de runtime, Flow, ESLint e compilação Windows.
- [ ] Demonstrar que o jogo exportado executa os scripts.

## Compilação do fork

### Pré-requisitos

- Git e Node.js, compatíveis com as dependências desta versão do repositório.
- Para compilar o desktop no Windows, ambiente e ferramentas exigidos pelo Electron/empacotador.
- Espaço em disco e memória suficientes; a compilação do editor é mais pesada que a execução do jogo.

### Opção A — GitHub Actions (mais simples)

O fork contém workflows para compilação Windows e validação de código:

- [`wmk-build-windows.yml`](.github/workflows/wmk-build-windows.yml) — build Windows original do fork.
- [`wmk-js-windows.yml`](.github/workflows/wmk-js-windows.yml) — build experimental da branch WMK JavaScript.
- [`wmk-js-validation.yml`](.github/workflows/wmk-js-validation.yml) — tipos, lint e testes WMK.

Consulte as [execuções reais do GitHub Actions](https://github.com/WalneyNF/WMK-Game-Studio/actions) e seus logs. **O sucesso do build não substitui um teste manual no aplicativo.**

### Opção B — Desenvolvimento local

```bash
git clone https://github.com/WalneyNF/WMK-Game-Studio.git
cd GDevelop
git switch wmk-js-object-editor-v1
cd newIDE/app
npm install
npm start
```

Para trabalhar no Electron em outra janela de terminal:

```bash
cd newIDE/electron-app
npm install
npm run start
```

O `npm start` da pasta `newIDE/app` deve continuar executando enquanto o Electron é iniciado em modo de desenvolvimento. Para mais instruções, consulte o [manual de desenvolvimento da IDE](newIDE/README.md).

### Verificação técnica

```bash
cd GDJS
npm install
npm run check-types

cd ../newIDE/app
npm run flow
npm run lint
```

Para rodar os testes GDJS é necessário preparar o runtime de desenvolvimento e as dependências de `GDJS/tests`; as instruções de referência estão em [`GDJS/tests/README.md`](GDJS/tests/README.md). **Não presuma que os testes do navegador já passaram apenas porque o TypeScript compilou.**

## Arquitetura técnica

| Pasta | Finalidade |
| --- | --- |
| `Core` | Estruturas e ferramentas centrais do GDevelop |
| `GDJS` | Motor de jogo TypeScript/JavaScript e runtime |
| `GDevelop.js` | Integração do núcleo com JavaScript/WebAssembly |
| `newIDE` | Editor baseado em React e Electron |
| `newIDE/app/src/CodeEditor` | Monaco Editor já existente no GDevelop |
| `newIDE/app/src/ObjectEditor` | Interface de objetos e integração WMK de scripts |
| `GDJS/Runtime/runtimeobject.ts` | Ciclo de vida experimental dos scripts WMK |
| `Extensions` | Extensões, objetos, comportamentos, física e funcionalidades adicionais |
| `docs` | Documentação de desenvolvimento e notas do protótipo |
| `roadmap.html` | Documento mestre do WMK Game Studio |

A infraestrutura visual e de execução original deve permanecer compatível. Mudanças estruturais precisam ser isoladas e testadas, especialmente nas áreas de hot reload, empacotamento e exportação.

## Testes e contribuições

Ao contribuir:

1. Trabalhe em uma branch específica, sem modificar diretamente a versão estável.
2. Descreva as alterações com exemplos verificáveis.
3. Inclua testes de motor e, quando aplicável, da interface.
4. Preserve compatibilidade com projetos GDevelop existentes.
5. Documente a funcionalidade em português do Brasil.
6. Não marque como finalizados recursos não compilados ou não testados.

Veja [as alterações em discussão no PR #1](https://github.com/WalneyNF/WMK-Game-Studio/pull/1) e [o roadmap](roadmap.html).

**Segurança:** scripts JavaScript são **código executável confiável**, não um ambiente isolado de execução de conteúdo desconhecido. Evite importar projetos/scripts de fontes não confiáveis, principalmente no editor desktop.

## Recursos do GDevelop original

O GDevelop é um editor de jogos **livre e de código aberto** com ferramentas para jogos 2D, 3D e multiplayer, exportação para web, desktop e dispositivos móveis e um sistema visual de eventos, condições, ações e comportamentos.

### Começar a usar GDevelop

| Quero... | Recurso |
| --- | --- |
| Baixar o GDevelop oficial | [gdevelop.io](https://gdevelop.io) |
| Aprender a usar o editor | [Documentação do GDevelop](https://wiki.gdevelop.io/gdevelop5/start) |
| Criar uma extensão | [Guia de extensões](https://wiki.gdevelop.io/gdevelop5/extensions/create) |
| Contribuir para o editor original | [README da IDE](https://github.com/4ian/GDevelop/tree/master/newIDE) |
| Criar ou publicar exemplos | [Guia de envio de exemplos](https://wiki.gdevelop.io/gdevelop5/community/guide-for-submitting-an-example/) |
| Criar ou publicar pacotes de recursos | [Asset Store](https://wiki.gdevelop.io/gdevelop5/community/sell-asset-pack-store) |
| Colaborar na tradução | [GDevelop no Crowdin](https://crowdin.com/project/gdevelop) |
| Participar da comunidade | [Fórum](https://forum.gdevelop.io) e [Discord](https://discord.gg/gdevelop) |
| Conhecer jogos criados | [gd.games](https://gd.games) e [vitrine oficial](https://gdevelop.io/games) |
| Consultar a documentação técnica do motor | [docs.gdevelop.io](https://docs.gdevelop.io) |
| Ver o código original | [github.com/4ian/GDevelop](https://github.com/4ian/GDevelop) |

![Jogos feitos com GDevelop](https://raw.githubusercontent.com/4ian/GDevelop/master/newIDE/GDevelop%20games.png "Exemplos do GDevelop original")

O GDevelop original possui seus próprios [roadmap](https://trello.com/b/qf0lM7k8/gdevelop-roadmap), [issues](https://github.com/4ian/GDevelop/issues) e [discussões](https://github.com/4ian/GDevelop/discussions), independentes das prioridades do fork WMK.

## WMK Game Data — banco para os seus jogos

O fork oferece uma **API local experimental** para guardar e consultar dados de jogos em **JSON ou SQLite**, sem precisar escrever SQL no código do jogo.

- **Manual:** [WMK Game Data — JSON e SQLite](wmk-bridge/manual-game-data.html).
- **Minijogo demonstrativo:** [WMK Coin Lab — moedas e ranking](wmk-bridge/demo-game-data.html).
- **Explorador de endpoints:** [WMK API Explorer](wmk-bridge/painel.html).
- **Servidor HTTP:** [wmk-bridge/server.js](wmk-bridge/server.js).
- **Testes automatizados:** [wmk-bridge/tests/game-data.test.js](wmk-bridge/tests/game-data.test.js).

Inicie a ponte local com Node.js 24 e abra `http://127.0.0.1:8767/manual-game-data` ou `http://127.0.0.1:8767/demo-game-data`. O banco é selecionado por jogo por um endpoint administrativo; chaves individuais permitem acesso apenas ao jogo correspondente. **Não divulgue a chave do jogo dentro do HTML público e não exponha o servidor local na internet.** Para sites públicos, utilize um backend com autenticação por jogador.

Esses recursos estão na branch experimental e não substituem a validação manual de segurança e integração.

## Licenças e atribuições

- As bibliotecas `Core`, `GDJS`, a IDE `newIDE` e extensões estão sob a **licença MIT**, respeitadas as licenças específicas e obrigações das dependências. Consulte [LICENSE.md](LICENSE.md) e os arquivos de licença nas respectivas pastas.
- **GDevelop** e seu logotipo são marcas/propriedade de **Florian Rival**, conforme a documentação de licença do projeto original.
- Os jogos exportados com o motor GDevelop podem ser distribuídos comercialmente, conforme os termos da licença MIT aplicável ao motor; a autoria do jogo não exige abertura do código do jogo.
- As modificações identificadas como **WMK Game Studio** são desenvolvimento do fork de **Walney Moreira Klein — walneyk@hotmail.com**, sem retirar os créditos e avisos legais dos autores originais.
- Este fork **não é apresentado como uma distribuição oficial do GDevelop**.

---

<p align="center">
  <strong>WMK Game Studio</strong><br>
  <em>Unity na organização · Godot na flexibilidade · Monaco na programação · GDJS no motor</em><br><br>
  <strong>Walney Moreira Klein — walneyk@hotmail.com</strong><br>
  Com respeito e atribuição ao GDevelop, Florian Rival e seus colaboradores.
</p>
