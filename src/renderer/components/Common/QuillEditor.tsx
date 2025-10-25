import React, { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

type QuillEditorProps = {
  readOnly?: boolean;
  initialHtml?: string; // applied on first mount
  valueHtml?: string; // controlled value synced to editor
  onHtmlChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

// Minimal Quill wrapper using HTML as the interchange format
const QuillEditor = forwardRef<Quill | null, QuillEditorProps>(({ readOnly, initialHtml, valueHtml, onHtmlChange, placeholder, minHeight = 240 }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialHtmlRef = useRef(initialHtml);
  const onHtmlChangeRef = useRef(onHtmlChange);
  const localRef = useRef<Quill | null>(null);

  useLayoutEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  });

  useEffect(() => {
    const container = containerRef.current!;
    const editorContainer = container.appendChild(container.ownerDocument.createElement('div'));
    // styling wrapper
    container.style.padding = '8px';
    const quill = new Quill(editorContainer, {
      theme: 'snow',
      readOnly: !!readOnly,
      modules: {
        toolbar: [
          // font and size selectors
          [{ font: [] }, { size: [] }],
          // headings
          [{ header: [1, 2, 3, false] }],
          // inline styles
          ['bold', 'italic', 'underline', 'strike'],
          // lists
          [{ list: 'ordered' }, { list: 'bullet' }],
          // rich content
          ['link', 'blockquote'],
          // clear formatting
          ['clean'],
        ],
      },
    });
    (quill.root as HTMLElement).style.minHeight = `${minHeight}px`;
    (quill.root as HTMLElement).style.padding = '4px 8px';
    if (placeholder) quill.root.setAttribute('data-placeholder', placeholder);

    localRef.current = quill;
    // @ts-expect-error – we assign quill to parent ref
    if (ref && typeof ref === 'object') ref.current = quill;

    // Initialize content
    if (initialHtmlRef.current) {
      try {
        quill.clipboard.dangerouslyPasteHTML(initialHtmlRef.current);
      } catch {
        quill.setText(initialHtmlRef.current || '');
      }
    }

    const handler = () => {
      let html = '';
      // Prefer Quill v2 API if present
      // @ts-ignore
      if (typeof quill.getSemanticHTML === 'function') {
        // @ts-ignore
        html = quill.getSemanticHTML();
      } else {
        html = (quill.root as HTMLElement).innerHTML;
      }
      onHtmlChangeRef.current?.(html);
    };
    quill.on(Quill.events.TEXT_CHANGE, handler);

    return () => {
      localRef.current = null;
      // @ts-expect-error – clean up
      if (ref && typeof ref === 'object') ref.current = null;
      container.innerHTML = '';
    };
  }, []);

  // respond to readOnly changes
  useEffect(() => {
    const q = localRef.current;
    if (q) q.enable(!readOnly);
  }, [readOnly]);

  // sync external value
  useEffect(() => {
    const q = localRef.current;
    if (!q || valueHtml === undefined) return;
    try {
      // @ts-ignore Quill v2
      const current = typeof q.getSemanticHTML === 'function' ? q.getSemanticHTML() : (q.root as HTMLElement).innerHTML;
      if (current !== valueHtml) {
        q.clipboard.dangerouslyPasteHTML(valueHtml);
      }
    } catch {
      q.setText(valueHtml || '');
    }
  }, [valueHtml]);

  return <div ref={containerRef} />;
});

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;
