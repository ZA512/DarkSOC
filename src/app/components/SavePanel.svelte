<script lang="ts">
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';
  import { downloadSaveFile, importSaveEnvelope } from '../../persistence/exportImport';
  import { getImportErrorMessageKey } from '../../persistence/saveTypes';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let hasLocalSave = false;
  export let statusKey: string | undefined;
  export let errorKey: string | undefined;
  export let onContinue: () => Promise<void> | void;
  export let onStartNewGame: () => Promise<void> | void;
  export let onImportState: (state: GameState, statusKey: string) => Promise<void> | void;
  export let onResetLocalSave: () => Promise<void> | void;
  export let onStatusChange: (statusKey?: string) => void;
  export let onErrorChange: (errorKey?: string) => void;

  let fileInput: HTMLInputElement | undefined;

  async function handleExport(): Promise<void> {
    try {
      await downloadSaveFile(state);
      onErrorChange(undefined);
      onStatusChange('save.status.exported');
    } catch {
      onStatusChange(undefined);
      onErrorChange('save.error.invalidPayload');
    }
  }

  function openImportDialog(): void {
    fileInput?.click();
  }

  async function handleImportChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const raw = await file.text();
    const result = await importSaveEnvelope(raw);

    if (!result.ok) {
      onStatusChange(undefined);
      onErrorChange(getImportErrorMessageKey(result.reason));
      input.value = '';
      return;
    }

    if (result.modified) {
      const confirmed = window.confirm(
        `${t('save.modifiedDetected.title', locale)}\n\n${t('save.modifiedDetected.body', locale)}`,
      );

      if (!confirmed) {
        input.value = '';
        return;
      }

      await onImportState(
        {
          ...result.state,
          modified: true,
        },
        'save.status.modifiedMode',
      );
      onErrorChange(undefined);
      input.value = '';
      return;
    }

    const confirmed = window.confirm(t('save.import.replaceWarning', locale));

    if (!confirmed) {
      input.value = '';
      return;
    }

    await onImportState(result.state, 'save.status.imported');
    onErrorChange(undefined);
    input.value = '';
  }

  async function handleNewGame(): Promise<void> {
    const confirmed = window.confirm(t('save.newGame.warning', locale));

    if (!confirmed) {
      return;
    }

    await onStartNewGame();
  }

  async function handleContinue(): Promise<void> {
    await onContinue();
  }

  async function handleReset(): Promise<void> {
    await onResetLocalSave();
  }
</script>

<section class="save-panel" aria-labelledby="save-title">
  <div class="save-panel__header">
    <h2 id="save-title">{t('save.title', locale)}</h2>

    {#if state.modified === true}
      <span class="save-panel__badge">{t('save.status.modifiedMode', locale)}</span>
    {/if}
  </div>

  <div class="save-panel__actions">
    {#if hasLocalSave}
      <button type="button" class="save-panel__button" onclick={handleContinue}>
        {t('save.continue', locale)}
      </button>
    {/if}

    <button type="button" class="save-panel__button" onclick={handleNewGame}>
      {t('save.newGame', locale)}
    </button>

    <button type="button" class="save-panel__button" onclick={handleExport}>
      {t('save.export', locale)}
    </button>

    <button type="button" class="save-panel__button" onclick={openImportDialog}>
      {t('save.import', locale)}
    </button>

    <button type="button" class="save-panel__button save-panel__button--danger" onclick={handleReset}>
      {t('save.reset', locale)}
    </button>
  </div>

  <input
    bind:this={fileInput}
    class="save-panel__input"
    type="file"
    accept=".json,application/json"
    onchange={handleImportChange}
  />

  {#if statusKey}
    <p class="save-panel__status">{t(statusKey, locale)}</p>
  {/if}

  {#if errorKey}
    <p class="save-panel__error">{t(errorKey, locale)}</p>
  {/if}
</section>