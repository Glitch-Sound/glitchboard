import { useEffect, useRef, useState } from "react";

type Kind = "project" | "event" | "story" | "task";
export type AddValues = {
  name: string;
  color?: string;
  due?: string;
  projectId?: string;
};
type Props = {
  kind: Kind;
  layout?: "popover" | "embedded";
  projectId?: string;
  projects?: { id: string; name: string }[];
  usedColors?: string[];
  onSubmit(values: AddValues): boolean | Promise<boolean>;
};
const names = {
  project: "Project",
  event: "Event",
  story: "Story",
  task: "Task",
};

/** REQ-022: 見出しの追加ボタンから入力しEnterで保存、Escで破棄する。 */
const projectColors = [
  "#4c8dff",
  "#a979df",
  "#4ebd91",
  "#efaa4d",
  "#db6d9b",
  "#c4b84c",
  "#47b8c3",
];

export function nextProjectColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors.map((color) => color.toLowerCase()));
  const initial = projectColors.find((color) => !used.has(color));
  if (initial) return initial;
  for (let index = 0; index < 360; index++) {
    const hue = ((index * 137.508) % 360) / 60;
    const chroma = 0.53;
    const second = chroma * (1 - Math.abs((hue % 2) - 1));
    const [r, g, b] =
      hue < 1
        ? [chroma, second, 0]
        : hue < 2
          ? [second, chroma, 0]
          : hue < 3
            ? [0, chroma, second]
            : hue < 4
              ? [0, second, chroma]
              : hue < 5
                ? [second, 0, chroma]
                : [chroma, 0, second];
    const color = `#${[r, g, b]
      .map((part) =>
        Math.round((part + 0.34) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    if (!used.has(color)) return color;
  }
  for (let index = 0; index < 0x1000000; index++) {
    const color = `#${((index * 2654435761 + 0x4c8dff) & 0xffffff).toString(16).padStart(6, "0")}`;
    if (!used.has(color)) return color;
  }
  return "#4c8dff";
}

export function InlineAdd({
  kind,
  layout = "popover",
  projectId,
  projects = [],
  usedColors = [],
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => nextProjectColor(usedColors));
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId ?? projects[0]?.id ?? "",
  );
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) nameInput.current?.focus();
  }, [open]);
  const cancel = () => {
    setOpen(false);
    setName("");
    setDue("");
  };
  return (
    <span
      className={`inline-add ${layout === "embedded" ? "inline-add-embedded" : ""}`}
    >
      {(!open || layout === "embedded") && (
        <button
          className="inline-add-trigger"
          type="button"
          onClick={() => {
            if (open) {
              cancel();
              return;
            }
            if (kind === "project") setColor(nextProjectColor(usedColors));
            setOpen(true);
          }}
          aria-label={`${names[kind]}を追加`}
          aria-expanded={open}
        >
          +
        </button>
      )}
      {open && (
        <form
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving || !name.trim() || (kind === "event" && !due)) return;
            setSaving(true);
            try {
              const saved = await onSubmit({
                name: name.trim(),
                color: kind === "project" ? color : undefined,
                due: kind === "event" ? due : undefined,
                projectId: kind === "event" ? selectedProjectId : undefined,
              });
              if (saved) cancel();
            } finally {
              setSaving(false);
            }
          }}
        >
          <input
            ref={nameInput}
            aria-label="名前"
            placeholder={kind === "event" ? "Event名" : undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {kind === "project" && (
            <input
              type="color"
              aria-label="色"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          )}
          {kind === "event" && (
            <>
              <select
                aria-label="Project"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="期限"
                value={due}
                onChange={(event) => setDue(event.target.value)}
              />
            </>
          )}
          <button type="submit" disabled={saving}>
            追加
          </button>
        </form>
      )}
    </span>
  );
}
