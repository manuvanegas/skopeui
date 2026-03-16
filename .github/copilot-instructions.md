# Copilot Agent Instructions

## Context Window Management

When the context window usage exceeds 60%, perform a graceful handoff so work can resume in a new conversation without losing progress.

### Handoff Procedure (on exceeding 60% context)

1. **Save state to handoff file** — write a file at `.agent/handoffs/handoff.md` containing:
   - Current task list with statuses (copy from todo list)
   - Key decisions made and rationale
   - Files modified so far (paths + brief description of changes)
   - Next steps to continue (in order)
   - Any unresolved blockers or open questions
   - Relevant repo/build commands needed to continue

2. **Notify the user** — end your turn with a clear handoff message:
   ```
   Context window is near capacity (>60%). I've saved progress to session memory.
   To continue, start a new conversation and say: "Resume from handoff."
   ```

> Handoff files are stored in `.agent/handoffs/` (workspace-local, not in session memory).

3. **Do not continue work** after issuing the handoff message.

### Resume Procedure (when user says "Resume from handoff")

1. Read `.agent/handoffs/handoff.md` immediately.
2. Reconstruct the todo list from saved state and mark completed items.
3. Briefly summarize what was done and what comes next.
4. Continue from the next pending task without asking for re-explanation.

### General Guidelines

- Monitor context pressure proactively. If approaching 60%, finish the current atomic step, then handoff — do not start a new major task.
- Keep `.agent/handoffs/handoff.md` updated after each significant step so an accidental interruption loses minimal work.
- After a successful resume and task completion, delete `.agent/handoffs/handoff.md` to keep the handoffs directory clean.
