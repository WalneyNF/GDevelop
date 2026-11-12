# WMK JavaScript Studio — protótipo de integração

**Estado:** protótipo de interface; não pronto para uso em jogos. Não houve compilação nem teste manual nesta branch.

## Objetivo

Selecionar um objeto, abrir **Script JS**, clicar **Anexar Script JS**, editar no Monaco e salvar o conteúdo dentro do projeto. A aba Eventos continua intacta.

## Alterações

- `newIDE/app/src/ObjectEditor/ObjectEditorDialog.js`: aba Script JS e persistência inicial no objeto.
- `newIDE/app/src/ObjectEditor/ObjectJavaScriptEditor.js`: editor Monaco usando o componente `CodeEditor` já presente no GDevelop.
- O código é armazenado na variável interna de objeto `__WMK_JAVASCRIPT_SOURCE` para acompanhar a serialização do projeto.

## Limitações importantes

1. A string editada **ainda não é executada** pelo runtime. O suporte a `start/update/onCollision` depende de um mecanismo de execução e geração/exportação.
2. Trata-se de armazenamento temporário através de variável do objeto, não de arquivos físicos `.js`. O editor pode exibir essa variável em sua listagem atual.
3. O armazenamento e a atualização de instâncias precisam ser testados em novos projetos, salvamento/abertura, desfazer/cancelar e exportação.
4. O layout do Monaco e a tipagem Flow precisam ser validados pelo build real do `newIDE`.

## Verificação manual proposta

1. Compilar `newIDE` no workflow existente.
2. Abrir projeto de teste, editar `spr_robo`, clicar `Script JS` e `Anexar Script JS`.
3. Digitar texto, aplicar, salvar, fechar, reabrir e conferir persistência.
4. Cancelar alterações e validar rollback.
5. Verificar que eventos visuais e execução do jogo permanecem inalterados.

## Critérios para versão executável

- Criar scripts associados a objetos **sem** abrir a aba Eventos.
- Executar `start` e `update(dt)` em cada instância, com tratamento de erros e isolamento.
- Sincronizar scripts no preview, hot reload e exportadores (desktop/web/mobile).
- Criar suporte a `onCollision`, painel de logs e depurador.
- Acrescentar testes automatizados e documentação pt-BR.

**Créditos:** Walney Moreira Klein — walneyk@hotmail.com. Preservar licenças e créditos dos autores originais.
