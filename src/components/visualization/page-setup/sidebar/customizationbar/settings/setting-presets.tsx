import { useEffect, useState } from 'react';

import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useShallow } from 'zustand/react/shallow';

export default function SettingPresets() {
  const showSuccessToastMessage = useToastHandlerStore(
    (state) => state.showSuccessToastMessage
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const {
    presets,
    selectedPreset,
    addPreset,
    savePreset,
    loadPreset,
    removePreset,
    renamePreset,
    listPresets,
    setSelectedPreset,
  } = useUserSettingsStore(
    useShallow((state) => ({
      presets: state.presets,
      selectedPreset: state.selectedPreset,
      addPreset: state.addPreset,
      savePreset: state.savePreset,
      loadPreset: state.loadPreset,
      removePreset: state.removePreset,
      renamePreset: state.renamePreset,
      listPresets: state.listPresets,
      setSelectedPreset: state.setSelectedPreset,
    }))
  );

  // ----- Preset UI state & handlers -----
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [renameTo, setRenameTo] = useState<string>('');

  // Keep selectedPreset in sync with available presets - pick first if none selected (UI only, no auto-load)
  useEffect(() => {
    const names = listPresets();
    if (names.length === 0) {
      if (selectedPreset) {
        setSelectedPreset(null);
      }
    } else if (!selectedPreset || !names.includes(selectedPreset)) {
      // Only update the selected preset in the store, don't load it
      setSelectedPreset(names[0]);
    }
  }, [JSON.stringify(presets), selectedPreset, listPresets, setSelectedPreset]);

  const handlePresetSelection = (presetName: string | null) => {
    setSelectedPreset(presetName);

    if (!presetName) {
      showErrorToastMessage('No preset selected to load');
      return;
    }
    const ok = loadPreset(presetName);
    if (ok) {
      showSuccessToastMessage(`Preset "${presetName}" loaded`);
    } else {
      showErrorToastMessage(`Failed to load preset "${presetName}"`);
    }
  };

  const handleSaveAsPreset = () => {
    const name = newPresetName?.trim();
    if (!name) {
      showErrorToastMessage('Enter a preset name to save as');
      return;
    }
    const ok = addPreset(name, false);
    if (ok) {
      showSuccessToastMessage(`Preset "${name}" created`);
      setNewPresetName('');
      setSelectedPreset(name);
      // Note: Preset is not auto-loaded, it will be loaded when visualization opens
    } else {
      showErrorToastMessage(
        `Preset "${name}" already exists. Use Save to overwrite or choose a different name.`
      );
    }
  };

  const handleSavePreset = () => {
    // overwrite current selection or use newPresetName if provided
    const nameToSave =
      (selectedPreset && selectedPreset) || newPresetName.trim();
    if (!nameToSave) {
      showErrorToastMessage('Select a preset or enter a name to save');
      return;
    }
    const ok = savePreset(nameToSave);
    if (ok) {
      showSuccessToastMessage(`Preset "${nameToSave}" saved`);
      setSelectedPreset(nameToSave);
      setNewPresetName('');
    } else {
      showErrorToastMessage(`Failed to save preset "${nameToSave}"`);
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) {
      showErrorToastMessage('No preset selected to delete');
      return;
    }
    if (!confirm(`Delete preset "${selectedPreset}"? This cannot be undone.`)) {
      return;
    }
    const ok = removePreset(selectedPreset);
    if (ok) {
      showSuccessToastMessage(`Preset "${selectedPreset}" deleted`);
      // selectedPreset is cleared in the store by removePreset
    } else {
      showErrorToastMessage(`Failed to delete preset "${selectedPreset}"`);
    }
  };

  const handleRenamePreset = () => {
    if (!selectedPreset) {
      showErrorToastMessage('No preset selected to rename');
      return;
    }
    const newName = renameTo?.trim();
    if (!newName) {
      showErrorToastMessage('Enter a new name to rename the preset');
      return;
    }
    const ok = renamePreset(selectedPreset, newName, false);
    if (ok) {
      showSuccessToastMessage(
        `Preset "${selectedPreset}" renamed to "${newName}"`
      );
      // selectedPreset is updated in the store by renamePreset
      setRenameTo('');
    } else {
      showErrorToastMessage(
        `Failed to rename preset to "${newName}". A preset with that name might already exist.`
      );
    }
  };

  return (
    <div key="preset-controls" className="mb-3">
      <h6 className="mt-1">
        <strong>Presets</strong>
      </h6>

      <div className="preset-controls-row">
        <select
          className="form-control form-control-sm preset-control-input"
          value={selectedPreset || ''}
          onChange={(e) => {
            handlePresetSelection(e.target.value || null);
          }}
        >
          <option value="">— Select preset —</option>
          {Object.keys(presets || {}).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button
          className="btn btn-sm btn-warning"
          onClick={handleSavePreset}
          title="Save current settings into selected preset (or into name field)"
        >
          Update
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={handleDeletePreset}
          title="Delete selected preset"
        >
          Delete
        </button>
      </div>

      <div className="preset-controls-row">
        <input
          className="form-control form-control-sm preset-control-input"
          placeholder={
            selectedPreset
              ? `Rename "${selectedPreset}" to...`
              : 'Select preset to rename'
          }
          value={renameTo}
          onChange={(e) => setRenameTo(e.target.value)}
        />
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleRenamePreset}
          disabled={!selectedPreset}
          title="Rename selected preset"
        >
          Rename
        </button>
      </div>

      <div className="preset-controls-row">
        <input
          className="form-control form-control-sm preset-control-input"
          placeholder="Preset name..."
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
        />
        <button
          className="btn btn-sm btn-success"
          onClick={handleSaveAsPreset}
          title="Save current settings as a new preset"
        >
          Save New Preset
        </button>
      </div>
    </div>
  );
}
