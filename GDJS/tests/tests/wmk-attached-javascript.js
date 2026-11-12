// @ts-check
/**
 * Regression checks for WMK attached object scripts.
 * These scripts are run directly on instances without scene events.
 */
describe('WMK attached JavaScript scripts', () => {
  let runtimeGame;
  let runtimeScene;

  beforeEach(() => {
    runtimeGame = gdjs.getPixiRuntimeGame();
    runtimeScene = new gdjs.TestRuntimeScene(runtimeGame);
  });

  const createObject = (source) => {
    const object = new gdjs.TestRuntimeObject(runtimeScene, {
      name: 'spr_robo',
      type: '',
      variables: [],
      behaviors: [],
      effects: [],
    });
    object
      .getVariables()
      .get('__WMK_JAVASCRIPT_SOURCE')
      .setString(source);
    object.onCreated();
    return object;
  };

  it('runs start once and update without any behavior or scene event', () => {
    const object = createObject(`
      let counter = 0;
      function start() {
        object.setX(10);
      }
      function update(dt) {
        counter++;
        object.setX(object.getX() + counter);
      }
    `);

    expect(object.getX()).to.be(10);
    object.stepBehaviorsPreEvents(runtimeScene);
    expect(object.getX()).to.be(11);
    object.stepBehaviorsPreEvents(runtimeScene);
    expect(object.getX()).to.be(13);
  });

  it('keeps script state separate for different instances', () => {
    const source = `
      let count = 0;
      function update(dt) {
        object.setX(++count);
      }
    `;
    const first = createObject(source);
    const second = createObject(source);
    first.stepBehaviorsPreEvents(runtimeScene);
    first.stepBehaviorsPreEvents(runtimeScene);
    second.stepBehaviorsPreEvents(runtimeScene);

    expect(first.getX()).to.be(2);
    expect(second.getX()).to.be(1);
  });

  it('does not prevent ordinary objects from running', () => {
    const object = new gdjs.TestRuntimeObject(runtimeScene, {
      name: 'normal_object',
      type: '',
      variables: [],
      behaviors: [],
      effects: [],
    });
    object.onCreated();
    object.stepBehaviorsPreEvents(runtimeScene);
    expect(object.getX()).to.be(0);
  });
});
