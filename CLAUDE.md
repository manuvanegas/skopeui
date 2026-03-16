@AGENTS.md

## Claude-Specific Instructions

### Architecture decisions
Use `ultrathink` before proposing any architecture change — reason through tradeoffs, migration risks, reversibility, and alignment with the roadmap in AGENTS.md before recommending a path.

### Multi-step tasks
Use `TodoWrite` to plan and track every multi-step task. Write the full plan before starting any work. Mark items complete as you go.

### Context window
When context usage exceeds 60%, write a handoff to `.agent/handoffs/handoff.md` and notify the user to resume in a new conversation.
