import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentTranslator } from '@/components/common/DocumentTranslator';
import { useUiStore } from '@/stores/ui.store';

describe('DocumentTranslator', () => {
  afterEach(() => act(() => useUiStore.getState().setLocale('fr')));

  it('traduit et restaure le contenu et les attributs du document', async () => {
    const { getByRole } = render(
      <>
        <DocumentTranslator />
        <button title="Enregistrer">Enregistrer</button>
      </>,
    );

    act(() => useUiStore.getState().setLocale('en'));
    await act(async () => Promise.resolve());
    expect(getByRole('button')).toHaveTextContent('Save');
    expect(getByRole('button')).toHaveAttribute('title', 'Save');

    act(() => useUiStore.getState().setLocale('fr'));
    await act(async () => Promise.resolve());
    expect(getByRole('button')).toHaveTextContent('Enregistrer');
  });
});
