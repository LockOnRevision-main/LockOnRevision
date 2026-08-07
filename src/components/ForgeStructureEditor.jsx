import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createEmptyForgeNode } from "../services/forgeService.js";

function moveItem(items, index, direction) {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function NodeEditor({ label, title, onTitleChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, children }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="mt-2 shrink-0 text-text-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{t(`forge_structure.${label.toLowerCase().replace(/\s+/g, '_')}`) || label}</p>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-bold outline-none focus:border-primary"
          />
          {children}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="rounded border border-border p-1 disabled:opacity-30">
            <ChevronUp size={14} />
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="rounded border border-border p-1 disabled:opacity-30">
            <ChevronDown size={14} />
          </button>
          <button type="button" onClick={onDelete} className="rounded border border-error/20 p-1 text-error">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgeStructureEditor({ tree, onChange }) {
  const { t } = useTranslation();
  if (!tree) return null;

  function updateSubject(field, value) {
    onChange({ ...tree, [field]: value });
  }

  function updateUnits(nextUnits) {
    onChange({ ...tree, units: nextUnits });
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('forge_structure.subject')}</p>
        <input
          value={tree.title}
          onChange={(event) => updateSubject("title", event.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-lg font-black outline-none focus:border-primary"
        />
        <textarea
          value={tree.description || ""}
          onChange={(event) => updateSubject("description", event.target.value)}
          className="mt-2 min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder={t('forge_structure.subject_desc_placeholder')}
        />
      </div>

      {tree.units?.map((unit, unitIndex) => (
        <div key={unit.id} className="grid gap-3 border-l-2 border-primary/20 pl-4">
          <NodeEditor
            label={t('forge_structure.unit')}
            title={unit.title}
            onTitleChange={(value) => {
              const units = [...tree.units];
              units[unitIndex] = { ...unit, title: value };
              updateUnits(units);
            }}
            onDelete={() => updateUnits(tree.units.filter((item) => item.id !== unit.id))}
            onMoveUp={() => updateUnits(moveItem(tree.units, unitIndex, -1))}
            onMoveDown={() => updateUnits(moveItem(tree.units, unitIndex, 1))}
            canMoveUp={unitIndex > 0}
            canMoveDown={unitIndex < tree.units.length - 1}
          >
            <textarea
              value={unit.summary || ""}
              onChange={(event) => {
                const units = [...tree.units];
                units[unitIndex] = { ...unit, summary: event.target.value };
                updateUnits(units);
              }}
              className="mt-2 min-h-16 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder={t('forge_structure.unit_summary_placeholder')}
            />
          </NodeEditor>

          {unit.subUnits?.map((subUnit, subIndex) => (
            <div key={subUnit.id} className="grid gap-3 border-l-2 border-warning/20 pl-4">
              <NodeEditor
                label={t('forge_structure.sub_unit')}
                title={subUnit.title}
                onTitleChange={(value) => {
                  const units = [...tree.units];
                  const subUnits = [...unit.subUnits];
                  subUnits[subIndex] = { ...subUnit, title: value };
                  units[unitIndex] = { ...unit, subUnits };
                  updateUnits(units);
                }}
                onDelete={() => {
                  const units = [...tree.units];
                  units[unitIndex] = {
                    ...unit,
                    subUnits: unit.subUnits.filter((item) => item.id !== subUnit.id),
                  };
                  updateUnits(units);
                }}
                onMoveUp={() => {
                  const units = [...tree.units];
                  units[unitIndex] = { ...unit, subUnits: moveItem(unit.subUnits, subIndex, -1) };
                  updateUnits(units);
                }}
                onMoveDown={() => {
                  const units = [...tree.units];
                  units[unitIndex] = { ...unit, subUnits: moveItem(unit.subUnits, subIndex, 1) };
                  updateUnits(units);
                }}
                canMoveUp={subIndex > 0}
                canMoveDown={subIndex < unit.subUnits.length - 1}
              />

              {subUnit.lessons?.map((lesson, lessonIndex) => (
                <div key={lesson.id} className="border-l-2 border-border/50 pl-4">
                  <NodeEditor
                    label={t('forge_structure.lesson')}
                    title={lesson.title}
                    onTitleChange={(value) => {
                      const units = [...tree.units];
                      const subUnits = [...unit.subUnits];
                      const lessons = [...subUnit.lessons];
                      lessons[lessonIndex] = { ...lesson, title: value };
                      subUnits[subIndex] = { ...subUnit, lessons };
                      units[unitIndex] = { ...unit, subUnits };
                      updateUnits(units);
                    }}
                    onDelete={() => {
                      const units = [...tree.units];
                      const subUnits = [...unit.subUnits];
                      subUnits[subIndex] = {
                        ...subUnit,
                        lessons: subUnit.lessons.filter((item) => item.id !== lesson.id),
                      };
                      units[unitIndex] = { ...unit, subUnits };
                      updateUnits(units);
                    }}
                    onMoveUp={() => {
                      const units = [...tree.units];
                      const subUnits = [...unit.subUnits];
                      subUnits[subIndex] = { ...subUnit, lessons: moveItem(subUnit.lessons, lessonIndex, -1) };
                      units[unitIndex] = { ...unit, subUnits };
                      updateUnits(units);
                    }}
                    onMoveDown={() => {
                      const units = [...tree.units];
                      const subUnits = [...unit.subUnits];
                      subUnits[subIndex] = { ...subUnit, lessons: moveItem(subUnit.lessons, lessonIndex, 1) };
                      units[unitIndex] = { ...unit, subUnits };
                      updateUnits(units);
                    }}
                    canMoveUp={lessonIndex > 0}
                    canMoveDown={lessonIndex < subUnit.lessons.length - 1}
                  >
                    <textarea
                      value={lesson.summary || ""}
                      onChange={(event) => {
                        const units = [...tree.units];
                        const subUnits = [...unit.subUnits];
                        const lessons = [...subUnit.lessons];
                        lessons[lessonIndex] = { ...lesson, summary: event.target.value };
                        subUnits[subIndex] = { ...subUnit, lessons };
                        units[unitIndex] = { ...unit, subUnits };
                        updateUnits(units);
                      }}
                      className="mt-2 min-h-16 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder={t('forge_structure.lesson_summary_placeholder')}
                    />
                  </NodeEditor>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const units = [...tree.units];
                  const subUnits = [...unit.subUnits];
                  subUnits[subIndex] = {
                    ...subUnit,
                    lessons: [...subUnit.lessons, createEmptyForgeNode("lesson")],
                  };
                  units[unitIndex] = { ...unit, subUnits };
                  updateUnits(units);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-bold text-text-secondary"
              >
                <Plus size={14} />
                {t('forge_structure.add_lesson')}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              const units = [...tree.units];
              units[unitIndex] = {
                ...unit,
                subUnits: [...unit.subUnits, createEmptyForgeNode("subunit")],
              };
              updateUnits(units);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-bold text-text-secondary"
          >
            <Plus size={14} />
            {t('forge_structure.add_sub_unit')}
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => updateUnits([...(tree.units || []), createEmptyForgeNode("unit")])}
        className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm font-black text-primary"
      >
        <Plus size={16} />
        {t('forge_structure.add_unit')}
      </button>
    </div>
  );
}
