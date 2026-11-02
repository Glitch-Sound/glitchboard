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
  projectId?: string;
  projects?: { id: string; name: string }[];
  onSubmit(values: AddValues): void | Promise<void>;
};
const names = {
  project: "Project",
  event: "Event",
  story: "Story",
  task: "Task",
};

/** REQ-022: 見出しの追加ボタンから入力しEnterで保存、Escで破棄する。 */
export function InlineAdd({ kind, projectId, projects = [], onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4c8dff");
  const [due, setDue] = useState("");
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
    <span className="inline-add">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${names[kind]}を追加`}
        >
          +
        </button>
      ) : (
        <form
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || (kind === "event" && !due)) return;
            void onSubmit({
              name: name.trim(),
              color: kind === "project" ? color : undefined,
              due: kind === "event" ? due : undefined,
              projectId: kind === "event" ? selectedProjectId : undefined,
            });
            cancel();
          }}
        >
          <input
            ref={nameInput}
            aria-label="名前"
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
          <button type="submit">追加</button>
        </form>
      )}
    </span>
  );
}
