# WMK JavaScript Studio — Scripts anexados a objetos

**Estado:** implementação experimental em branch de desenvolvimento. Scripts agora são compilados e executados pelo GDJS; **a compilação e o teste em Windows ainda precisam confirmar a integração**.

## Fluxo

1. Abra o editor de um objeto (por exemplo, `spr_robo`).
2. Abra a aba **Script JS**.
3. Clique **Anexar Script JS**.
4. Edite o código no Monaco; o conteúdo é armazenado na variável interna `__WMK_JAVASCRIPT_SOURCE` do objeto.
5. Clique **Aplicar**, salve e visualize o jogo.

**Não é necessário adicionar evento JavaScript à cena.**

## API experimental

```js
let velocidade = 180;

function start() {
  // Executado uma vez por instancia ao entrar na cena.
}

function update(dt) {
  // dt é o tempo decorrido em segundos.
  if (gdjs.evtTools.input.isKeyPressed(runtimeScene, 'Right')) {
    object.setX(object.getX() + velocidade * dt);
  }
}
```

As variáveis `object`, `runtimeScene` e `gdjs` ficam disponíveis no script. Cada instância recebe seu próprio escopo JavaScript.

## Integração

- `newIDE/app/src/ObjectEditor/ObjectEditorDialog.js`: aba Script JS, botão Anexar e persistência.
- `newIDE/app/src/ObjectEditor/ObjectJavaScriptEditor.js`: componente Monaco em painel expansível.
- `GDJS/Runtime/runtimeobject.ts`: instancia o script em `onCreated` e atualiza em `stepBehaviorsPreEvents`, que é chamado para todos os objetos.
- `GDJS/tests/tests/wmk-attached-javascript.js`: testes de `start`, `update`, escopo por instância e objeto sem script.
- `.github/workflows/wmk-js-validation.yml`: validação automatizada de TypeScript, sintaxe JS e IDE.

## Limitações conhecidas e precauções

- O armazenamento ainda usa uma **variável interna do objeto**, não arquivos físicos `.js`. Ela pode ficar visível na lista normal de variáveis.
- `onCollision`, `onDestroy`, anexação de múltiplos scripts, depuração integrada e hot reload de código ainda não foram implementados.
- Código JavaScript é **confiável**, como os eventos JavaScript do GDevelop: ele pode acessar APIs globais, recursos e dados do jogo. Use apenas scripts de fontes confiáveis.
- Erros em `start` ou `update` aparecem no console, e scripts com falhas são desativados para evitar mensagens repetidas.
- **Não foi testada ainda** a exportação web/desktop/mobile, nem cancelamento/desfazer e recuperação após erros.
- O runtime deve ser incluído corretamente nos builds do editor e nos jogos exportados; essa integração depende dos testes do workflow e do Windows.

## Roteiro de aceitação

1. Checks verdes de TypeScript e Flow/ESLint.
2. Build Windows com a branch experimental.
3. Adicionar script ao `spr_robo`, mover o objeto com as setas **sem criar evento na cena**.
4. Salvar e reabrir o projeto para conferir o código.
5. Criar duas instâncias com estado independente.
6. Verificar exportação do jogo.

Créditos WMK: **Walney Moreira Klein — walneyk@hotmail.com**. Créditos e licenças originais devem ser preservados.
