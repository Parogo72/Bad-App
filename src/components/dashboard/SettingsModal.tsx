import { Language, ThemeMode } from "@/types/dashboard";

type SettingsModalProps = {
  open: boolean;
  txt: Record<string, string>;
  draftLanguage: Language;
  draftTheme: ThemeMode;
  language: Language;
  theme: ThemeMode;
  setDraftLanguage: (value: Language) => void;
  setDraftTheme: (value: ThemeMode) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function SettingsModal({
  open,
  txt,
  draftLanguage,
  draftTheme,
  setDraftLanguage,
  setDraftTheme,
  onCancel,
  onSave,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="settings-modal w-full max-w-md rounded-2xl p-5">
        <h3 className="text-xl font-bold">{txt.settings}</h3>
        <label className="mt-4 block text-sm font-semibold">
          {txt.language}
          <select
            className="settings-select mt-2 w-full rounded-xl px-3 py-2"
            value={draftLanguage}
            onChange={(event) => setDraftLanguage(event.target.value as Language)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {txt.theme}
          <select
            className="settings-select mt-2 w-full rounded-xl px-3 py-2"
            value={draftTheme}
            onChange={(event) => setDraftTheme(event.target.value as ThemeMode)}
          >
            <option value="light">Light</option>
            <option value="dark-ocean">Dark Ocean</option>
            <option value="dark-forest">Dark Forest</option>
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="settings-btn settings-btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="settings-btn settings-btn--save" onClick={onSave}>
            {txt.save}
          </button>
        </div>
      </div>
    </div>
  );
}
