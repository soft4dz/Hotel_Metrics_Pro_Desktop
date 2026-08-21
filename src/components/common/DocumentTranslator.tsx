import { useEffect } from 'react';
import { translateRenderedText } from '@/lib/localization';
import { useUiStore } from '@/stores/ui.store';

const TRANSLATED_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;
const SKIPPED_TAGS = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

type TranslationState = { source: string; applied: string };

const textStates = new WeakMap<Text, TranslationState>();
const attributeStates = new WeakMap<Element, Map<string, TranslationState>>();

function translateTextNode(node: Text, locale: 'fr' | 'ar' | 'en'): void {
  if (node.parentElement && SKIPPED_TAGS.has(node.parentElement.tagName)) return;
  const current = node.nodeValue ?? '';
  const previous = textStates.get(node);
  const source = previous && current === previous.applied ? previous.source : current;
  const applied = translateRenderedText(locale, source);
  textStates.set(node, { source, applied });
  if (current !== applied) node.nodeValue = applied;
}

function translateElementAttributes(element: Element, locale: 'fr' | 'ar' | 'en'): void {
  const states = attributeStates.get(element) ?? new Map<string, TranslationState>();

  for (const attribute of TRANSLATED_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current == null) continue;
    const previous = states.get(attribute);
    const source = previous && current === previous.applied ? previous.source : current;
    const applied = translateRenderedText(locale, source);
    states.set(attribute, { source, applied });
    if (current !== applied) element.setAttribute(attribute, applied);
  }

  attributeStates.set(element, states);
}

function translateTree(root: Node, locale: 'fr' | 'ar' | 'en'): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  if (root instanceof Element) translateElementAttributes(root, locale);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
    else translateElementAttributes(node as Element, locale);
    node = walker.nextNode();
  }
}

export function DocumentTranslator() {
  const locale = useUiStore((state) => state.locale);

  useEffect(() => {
    translateTree(document.body, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target as Text, locale);
        if (mutation.type === 'attributes') translateElementAttributes(mutation.target as Element, locale);
        for (const node of mutation.addedNodes) translateTree(node, locale);
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
