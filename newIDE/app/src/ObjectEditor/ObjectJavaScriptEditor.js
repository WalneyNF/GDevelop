// @flow
import * as React from 'react';
import { CodeEditor } from '../CodeEditor';

type Props = {|
  objectName: string,
  value: string,
  onChange: string => void,
|};

/**
 * WMK JavaScript authoring panel.
 * Content is saved as an object variable; runtime integration is a separate task.
 */
export default function ObjectJavaScriptEditor({
  objectName,
  value,
  onChange,
}: Props): React.Node {
  const [cursor, setCursor] = React.useState({
    scrollTop: 0,
    cursorLine: 1,
    cursorColumn: 1,
  });
  const [size, setSize] = React.useState({ width: 900, height: 520 });
  const containerRef = React.useRef<?HTMLDivElement>(null);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setSize({
        width: Math.max(400, Math.floor(bounds.width) - 8),
        height: Math.max(320, Math.floor(bounds.height) - 8),
      });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 420 }}>
      <div style={{ padding: '8px 12px', fontSize: 13 }}>
        <strong>WMK JavaScript — {objectName}.js</strong>
        <div style={{ marginTop: 4 }}>
          Editor Monaco. Script armazenado no objeto; execução automática ainda não implementada.
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 340, width: '100%' }}>
        <CodeEditor
          value={value}
          onChange={onChange}
          initialScrollTop={cursor.scrollTop}
          initialCursorColumn={cursor.cursorColumn}
          initialCursorLine={cursor.cursorLine}
          saveEditorState={setCursor}
          width={size.width}
          height={size.height}
          onFocus={() => {}}
          onBlur={() => {}}
        />
      </div>
    </div>
  );
}
