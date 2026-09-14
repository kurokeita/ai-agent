---
name: statusline-setup
description: 'Set up the Claude Code or Gemini/Antigravity CLI statusline as two side-by-side bordered boxes — a repo box (cwd, git branch, working-tree state, last commit) and a session box (model, context % + token totals, 5h/7d quota with ETA). Use when asked to "set up my statusline", "install statusline", "configure statusline", or to add a colored multi-line status line showing rate limits and token usage. Detects OS and installs the appropriate variant (bash + jq on Linux/macOS, PowerShell on Windows).'
---

# Statusline Setup

Install a Claude Code or Gemini/Antigravity statusline that renders two side-by-side bordered boxes:

```text
╭─ repo ──────────────────────────────────────────────────────╮ ╭─ session ─────────────╮
│ ~/dev/ai_agents                                             │ │ Opus 5 (high)         │
│ feat/statusline-boxed-layout                                │ │ ctx 42%  ↑1.2M ↓18.4k │
│ +2 ~5 ?1 ↑3                                                 │ │ 5h 38%  resets 2h 14m │
│ ffd30ce feat(skills): add iso-response plain language skill │ │ 7d 61%  resets 3d 4h  │
╰─────────────────────────────────────────────────────────────╯ ╰───────────────────────╯
```

## Box Contents

### repo box

1. **cwd** — 24-bit ANSI `#5EFFFF` (`38;2;94;255;255`), shown at **full length**; only `$HOME` / `%USERPROFILE%` is replaced with `~`. No component abbreviation.
2. **git branch** — 24-bit ANSI `#C24870` (`38;2;194;72;112`), bare name with no parentheses. Detached HEAD renders `detached@<short-sha>`.
3. **working-tree state** — `+<staged> ~<modified> -<deleted> ?<untracked>` in bright green `#4eba65`, followed by `↑<ahead> ↓<behind>` in dim `#787e8a`. A clean tree renders a dim `clean`. Each counter is omitted when zero.
4. **last commit** — `%h %s` in dim `#787e8a`, truncated to 80 characters with a trailing `…`.

Rows 2-4 appear only inside a git repo.

### session box

1. **model display name + effort** in parens — 24-bit ANSI `#E89440` (`38;2;232;148;64`), effort only when present.
2. **`ctx N%`** — 24-bit ANSI `#009AFB` (`38;2;0;154;251`) — followed on the same row, after two spaces, by **tokens** `↑<in> ↓<out>` in `#937bda` (`38;2;147;123;218`). When no token data exists the row is just `ctx N%`.
3. **`5h N%  resets <eta>`** — colored by remaining quota (see below).
4. **`7d N%  resets <eta>`** — colored independently of the 5h row.

## Box Rendering Rules

- Border glyphs `╭ ╮ ╰ ╯ ─ │` in `#5a5f69` (`38;2;90;95;105`); the box title in `#8c929e` (`38;2;140;146;158`).
- Each box's inner width is the longest of its content rows, or its title + 2, whichever is larger.
- Both boxes are padded to the **same row count** with blank rows, so the two frames start and end on the same terminal lines.
- The two boxes are joined by a single space on every line.
- Rows are emitted newline-separated; the statusline host renders them as multiple lines.
- When both boxes have zero content rows the script prints nothing and exits 0.

### Measuring width with ANSI escapes present

Build **two parallel arrays** per box: one holding the plain text, one holding the same text wrapped in color escapes. Measure padding from the plain array only — measuring the colored string counts the escape bytes and destroys alignment.

### UTF-8 locale guard (bash only)

`${#str}` counts **bytes**, not characters, unless the shell is in a UTF-8 locale. The rows contain `↑`, `↓` and `…`, so under `LC_ALL=C` every such row is padded 2 characters short. Guard at the top of the script with a subprocess-free probe:

```bash
probe='↑'
if (( ${#probe} != 1 )); then
  for loc in C.UTF-8 en_US.UTF-8 en_US.utf8; do
    export LC_ALL="$loc"
    (( ${#probe} == 1 )) && break
  done
fi
```

Assigning `LC_ALL` makes bash call `setlocale` immediately, so `${#probe}` re-evaluates inside the loop; a locale the system lacks leaves the previous value and the loop moves on.

## When to Use This Skill

- "Set up my Claude Code statusline" or "Set up my Antigravity statusline"
- "Install the statusline"
- "Configure my statusline with token counts and quota"
- Any request to add a colored status line showing context %, rate limits, or session tokens.

## OS & Platform Detection

Detect the operating system and targeted platform first, then write and wire the corresponding configuration:

### Claude Code

- **Linux / macOS** → write `~/.claude/statusline-command.sh` (pure bash + `jq`), wire into `~/.claude/settings.json`.
- **Windows** → write `%USERPROFILE%\.claude\statusline-command.ps1`, wire into `%USERPROFILE%\.claude\settings.json`.

### Antigravity / Gemini CLI

- **Linux / macOS** → write `~/.gemini/antigravity-cli/statusline-command.sh` (pure bash + `jq`), wire into `~/.gemini/antigravity-cli/settings.json`.
- **Windows** → write `%USERPROFILE%\.gemini\antigravity-cli\statusline-command.ps1`, wire into `%USERPROFILE%\.gemini\antigravity-cli\settings.json`.

Multi-line rendering is verified on Claude Code. Antigravity's handling of multi-line statusline output is untested.

## Shell Compatibility

macOS ships bash 3.2, so the bash variant must avoid: `local -n` namerefs, `mapfile`/`readarray`, associative arrays, and negative array indices. Pass arrays into helpers as positional parameters instead.

The PowerShell variant targets Windows PowerShell 5.1, so avoid PowerShell 7 syntax: null-coalescing `??`, ternary `? :`, and chain operators `&&`/`||`.

## Token Formatting

- `< 1000` → raw integer (e.g. `↑850 ↓120`)
- `>= 1_000` → one decimal + `k` (e.g. `↑1.2k ↓34.5k`)
- `>= 1_000_000` → one decimal + `M` (e.g. `↑1.2M ↓3.4M`)
- Missing/unparseable transcript → omit the tokens from the `ctx` row entirely, never render `↑0 ↓0`.

## Token Source

Tokens are calculated dynamically:

1. **Transcript Parsing (Claude Code / general)**: Sum across assistant messages in the JSONL `transcript_path` file:
   - `input` = `message.usage.input_tokens` + `message.usage.cache_creation_input_tokens` + `message.usage.cache_read_input_tokens`
   - `output` = `message.usage.output_tokens`
2. **Payload Fallback (Antigravity / Gemini CLI)**: If transcript parsing yields `0` tokens (or the transcript doesn't store step token metrics), fallback to:
   - `input` = `context_window.total_input_tokens`
   - `output` = `context_window.total_output_tokens`

## Git State

Read **all** git state from a single `git -C "$cwd" status -b --porcelain` call, never from `PWD`. That one call yields branch name, upstream ahead/behind, and the staged/modified/untracked counts:

- The `##` header line carries `branch...upstream [ahead N, behind M]`, or the literal `HEAD (no branch)` when detached — fall back to `git -C "$cwd" rev-parse --short HEAD` for that case.
- `??` entries are untracked.
- For every other entry, column 1 is the index and column 2 the working tree. A `D` in either column counts as deleted; any other non-space counts as staged (column 1) or modified (column 2). One file can count in several buckets.
- Deletions get their own `-N` counter so a staged removal does not read as `+N`, which looks like an addition.

The last-commit row needs one further call: `git -C "$cwd" log -1 --format='%h %s'`.

## Quota Colors (by REMAINING quota = 100 - used%)

| Remaining | Color | 24-bit ANSI |
|-----------|-------|-------------|
| `> 60%` | bright green `#4eba65` | `38;2;78;186;101` |
| `31–60%` | amber `#de8e3e` | `38;2;222;142;62` |
| `11–30%` | orange `#ea580c` | `38;2;234;88;12` |
| `<= 10%` | deep red-orange `#b74426` | `38;2;183;68;38` |

The 5h and 7d windows must be colored **independently**.

## ETA Format (from epoch seconds or reset duration in seconds)

- `> 1 day` → `Xd Yh`
- `> 1 hour` → `Xh Ym`
- else → `Xm`
- past → `now`

## Input Schema (stdin JSON)

The input schema depends on the platform:

### Claude Code Schema

```json
{
  "cwd": "/path/to/cwd",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": { "display_name": "Opus 4.7" },
  "effort": { "level": "medium" },
  "context_window": { "used_percentage": 42 },
  "rate_limits": {
    "five_hour": { "used_percentage": 80, "resets_at": 1719213265 },
    "seven_day": { "used_percentage": 50, "resets_at": 1719213265 }
  }
}
```

### Antigravity Schema

```json
{
  "cwd": "/path/to/cwd",
  "transcript_path": "/path/to/transcript.jsonl",
  "model": { "display_name": "Gemini 3.5 Flash" },
  "context_window": {
    "used_percentage": 6.7,
    "total_input_tokens": 70419,
    "total_output_tokens": 16667
  },
  "quota": {
    "gemini-5h": { "remaining_fraction": 0.87, "reset_in_seconds": 2515 },
    "gemini-weekly": { "remaining_fraction": 0.97, "reset_in_seconds": 589315 }
  }
}
```

## Linux / macOS Implementation

Write `statusline-command.sh` (chmod +x) to the targeted platform directory. Pure bash + `jq` — no Python. `jq` must be installed; if missing, the script prints a one-line hint and exits 0.

JSON parsing rules:

- Read the full stdin payload **once** with `cat`, parse all fields with a single `jq` call.
- Use `fromjson?` to process JSONL files line-by-line resiliently to ignore malformed/plain-text entries.

`statusline-command.sh`:

```bash
#!/usr/bin/env bash
# Statusline — pure bash + jq. Supports Claude Code & Antigravity payload formats.

set -u

if ! command -v jq >/dev/null 2>&1; then
  printf '%s' "statusline: jq not installed"
  exit 0
fi

# ${#str} counts bytes outside a UTF-8 locale, which mis-pads every row holding
# an arrow or ellipsis. Assigning LC_ALL re-runs setlocale, so the probe below
# re-evaluates; an unavailable locale leaves the previous value untouched.
probe='↑'
if (( ${#probe} != 1 )); then
  for loc in C.UTF-8 en_US.UTF-8 en_US.utf8; do
    export LC_ALL="$loc"
    (( ${#probe} == 1 )) && break
  done
fi

C_CWD=$'\033[38;2;94;255;255m'
C_BRANCH=$'\033[38;2;194;72;112m'
C_BOX=$'\033[38;2;90;95;105m'
C_TITLE=$'\033[38;2;140;146;158m'
C_MODEL=$'\033[38;2;232;148;64m'
C_CTX=$'\033[38;2;0;154;251m'
C_TOK=$'\033[38;2;147;123;218m'
C_DIM=$'\033[38;2;120;126;138m'
RESET=$'\033[0m'

GREEN=$'\033[38;2;78;186;101m'
AMBER=$'\033[38;2;222;142;62m'
ORANGE=$'\033[38;2;234;88;12m'
REDORG=$'\033[38;2;183;68;38m'

quota_color() {
  local used="$1"
  local rem=$(( 100 - used ))
  if   (( rem > 60 )); then printf '%s' "$GREEN"
  elif (( rem > 30 )); then printf '%s' "$AMBER"
  elif (( rem > 10 )); then printf '%s' "$ORANGE"
  else                       printf '%s' "$REDORG"
  fi
}

fmt_eta() {
  local resets="$1"
  [[ -z "$resets" || "$resets" == "null" ]] && { printf ''; return; }
  local now delta days hours mins
  # Claude Code sends an absolute epoch; Antigravity sends a duration.
  if (( resets < 10000000 )); then
    delta=$resets
  else
    now=$(date +%s)
    delta=$(( resets - now ))
  fi
  if   (( delta <= 0 )); then printf 'now'
  elif (( delta >= 86400 )); then
    days=$(( delta / 86400 )); hours=$(( (delta % 86400) / 3600 ))
    printf '%dd %dh' "$days" "$hours"
  elif (( delta >= 3600 )); then
    hours=$(( delta / 3600 )); mins=$(( (delta % 3600) / 60 ))
    printf '%dh %dm' "$hours" "$mins"
  else
    mins=$(( delta / 60 ))
    printf '%dm' "$mins"
  fi
}

fmt_tokens() {
  local n="$1"
  if   (( n < 1000 )); then printf '%d' "$n"
  elif (( n < 1000000 )); then awk -v n="$n" 'BEGIN{printf "%.1fk", n/1000}'
  else                       awk -v n="$n" 'BEGIN{printf "%.1fM", n/1000000}'
  fi
}

truncate_to() {
  local s="$1" max="$2"
  if (( ${#s} > max )); then printf '%s…' "${s:0:$(( max - 1 ))}"
  else printf '%s' "$s"
  fi
}

shorten_home() {
  local p="$1"
  [[ -z "$p" ]] && return
  if [[ "$p" == "$HOME" ]]; then p='~'
  elif [[ "$p" == "$HOME"/* ]]; then p="~${p#$HOME}"
  fi
  printf '%s' "$p"
}

repeat_char() {
  local ch="$1" n="$2" out=""
  while (( n-- > 0 )); do out+="$ch"; done
  printf '%s' "$out"
}

# --- read & parse stdin payload in a single jq call ---
payload=$(cat)
if [[ -z "${payload// }" ]]; then payload='{}'; fi

read_fields() {
  jq -r '
    [
      .cwd // "",
      .transcript_path // "",
      .model.display_name // "",
      .effort.level // "",
      (.context_window.used_percentage // "" | tostring),
      (
        .rate_limits.five_hour.used_percentage //
        (if .quota."gemini-5h" != null then ((1.0 - .quota."gemini-5h".remaining_fraction) * 100)
         elif .quota."3p-5h" != null then ((1.0 - .quota."3p-5h".remaining_fraction) * 100)
         else "" end)
        | tostring
      ),
      (
        .rate_limits.five_hour.resets_at //
        .quota."gemini-5h".reset_in_seconds //
        .quota."3p-5h".reset_in_seconds //
        ""
        | tostring
      ),
      (
        .rate_limits.seven_day.used_percentage //
        (if .quota."gemini-weekly" != null then ((1.0 - .quota."gemini-weekly".remaining_fraction) * 100)
         elif .quota."3p-weekly" != null then ((1.0 - .quota."3p-weekly".remaining_fraction) * 100)
         else "" end)
        | tostring
      ),
      (
        .rate_limits.seven_day.resets_at //
        .quota."gemini-weekly".reset_in_seconds //
        .quota."3p-weekly".reset_in_seconds //
        ""
        | tostring
      ),
      (.context_window.total_input_tokens // "" | tostring),
      (.context_window.total_output_tokens // "" | tostring)
    ] | join("")
  ' 2>/dev/null <<<"$payload"
}

IFS=$'\x1f' read -r cwd transcript model effort ctx five_used five_reset seven_used seven_reset payload_in payload_out < <(read_fields)

repo_plain=(); repo_color=()

if [[ -n "$cwd" ]]; then
  p=$(shorten_home "$cwd")
  repo_plain+=("$p"); repo_color+=("${C_CWD}${p}${RESET}")
fi

# One `status -b --porcelain` call yields branch, dirty counts and ahead/behind.
# Must use git -C "$cwd", never PWD.
branch=""; staged=0; modified=0; deleted=0; untracked=0; ahead=0; behind=0
if [[ -n "$cwd" ]]; then
  while IFS= read -r line; do
    if [[ "$line" == '## '* ]]; then
      head=${line#'## '}
      if [[ "$head" == 'HEAD (no branch)' ]]; then
        branch=$(git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
        [[ -n "$branch" ]] && branch="detached@${branch}"
      else
        branch=${head%%...*}
        if [[ "$head" == *'[ahead '* ]]; then t=${head#*'[ahead '}; ahead=${t%%[,\]]*}; fi
        if [[ "$head" == *'behind '* ]]; then t=${head#*'behind '}; behind=${t%%[,\]]*}; fi
      fi
    elif [[ "$line" == '??'* ]]; then
      (( ++untracked ))
    else
      case "${line:0:1}" in
        ' ') ;;
        'D') (( ++deleted )) ;;
        *)   (( ++staged )) ;;
      esac
      case "${line:1:1}" in
        ' ') ;;
        'D') (( ++deleted )) ;;
        *)   (( ++modified )) ;;
      esac
    fi
  done < <(git -C "$cwd" status -b --porcelain 2>/dev/null)
fi

if [[ -n "$branch" ]]; then
  repo_plain+=("$branch"); repo_color+=("${C_BRANCH}${branch}${RESET}")

  if (( staged || modified || deleted || untracked )); then
    dirty=""
    (( staged ))    && dirty+="+${staged} "
    (( modified ))  && dirty+="~${modified} "
    (( deleted ))   && dirty+="-${deleted} "
    (( untracked )) && dirty+="?${untracked} "
    dirty=${dirty% }
    dirty_c="${GREEN}${dirty}${RESET}"
  else
    dirty="clean"; dirty_c="${C_DIM}clean${RESET}"
  fi
  sync=""
  (( ahead ))  && sync+=" ↑${ahead}"
  (( behind )) && sync+=" ↓${behind}"
  repo_plain+=("${dirty}${sync}")
  repo_color+=("${dirty_c}${C_DIM}${sync}${RESET}")

  last=$(git -C "$cwd" log -1 --format='%h %s' 2>/dev/null)
  if [[ -n "$last" ]]; then
    last=$(truncate_to "$last" 80)
    repo_plain+=("$last"); repo_color+=("${C_DIM}${last}${RESET}")
  fi
fi

sess_plain=(); sess_color=()

if [[ -n "$model" ]]; then
  m="$model"
  [[ -n "$effort" ]] && m="${model} (${effort})"
  sess_plain+=("$m"); sess_color+=("${C_MODEL}${m}${RESET}")
fi

ti=0
to=0

# --- tokens: sum transcripts, fallback to context_window if needed ---
if [[ -n "$transcript" ]]; then
  # Resolve path mismatch (if it has .gemini/antigravity/ but it actually is at .gemini/antigravity-cli/)
  if [[ ! -f "$transcript" && "$transcript" == *"/antigravity/"* ]]; then
    corrected_transcript="${transcript//\/antigravity\//\/antigravity-cli\/}"
    if [[ -f "$corrected_transcript" ]]; then
      transcript="$corrected_transcript"
    fi
  fi
fi

if [[ -n "$transcript" && -f "$transcript" ]]; then
  tok=$(jq -Rrn '
    reduce (inputs | fromjson?) as $m ({i:0,o:0};
      ($m.message.usage // null) as $u
      | if $u == null then .
        else
          .i += (($u.input_tokens // 0) + ($u.cache_creation_input_tokens // 0) + ($u.cache_read_input_tokens // 0))
          | .o += ($u.output_tokens // 0)
        end
    )
    | "\(.i)\t\(.o)"
  ' "$transcript" 2>/dev/null) || tok=""
  if [[ -n "$tok" ]]; then
    IFS=$'\t' read -r ti to <<<"$tok"
  fi
fi

# Fallback to payload context_window tokens if transcript sum is 0
if (( ti == 0 && to == 0 )); then
  if [[ -n "$payload_in" && -n "$payload_out" ]]; then
    ti=$payload_in
    to=$payload_out
  fi
fi

tokens=""
if (( ti > 0 || to > 0 )); then
  tokens="↑$(fmt_tokens "$ti") ↓$(fmt_tokens "$to")"
fi

if [[ -n "$ctx" ]]; then
  ctx_int=$(awk -v n="$ctx" 'BEGIN{printf "%d", (n+0.5)}')
  c="ctx ${ctx_int}%"
  c_col="${C_CTX}${c}${RESET}"
  if [[ -n "$tokens" ]]; then
    c+="  ${tokens}"; c_col+="  ${C_TOK}${tokens}${RESET}"
  fi
  sess_plain+=("$c"); sess_color+=("$c_col")
elif [[ -n "$tokens" ]]; then
  sess_plain+=("$tokens"); sess_color+=("${C_TOK}${tokens}${RESET}")
fi

if [[ -n "$five_used" ]]; then
  fu=$(awk -v n="$five_used" 'BEGIN{printf "%d", (n+0.5)}')
  eta=$(fmt_eta "$five_reset")
  s="5h ${fu}%"; [[ -n "$eta" ]] && s+="  resets ${eta}"
  sess_plain+=("$s"); sess_color+=("$(quota_color "$fu")${s}${RESET}")
fi
if [[ -n "$seven_used" ]]; then
  su=$(awk -v n="$seven_used" 'BEGIN{printf "%d", (n+0.5)}')
  eta=$(fmt_eta "$seven_reset")
  s="7d ${su}%"; [[ -n "$eta" ]] && s+="  resets ${eta}"
  sess_plain+=("$s"); sess_color+=("$(quota_color "$su")${s}${RESET}")
fi

rows=${#repo_plain[@]}
(( ${#sess_plain[@]} > rows )) && rows=${#sess_plain[@]}
if (( rows == 0 )); then printf ''; exit 0; fi
for (( i = ${#repo_plain[@]}; i < rows; i++ )); do repo_plain+=(""); repo_color+=(""); done
for (( i = ${#sess_plain[@]}; i < rows; i++ )); do sess_plain+=(""); sess_color+=(""); done

# Width comes from the plain rows; the parallel colored rows carry ANSI escapes
# that would otherwise be counted as visible characters. Arrays are passed
# positionally because bash 3.2 (macOS) has no `local -n` nameref.
box_width() {
  local title="$1"; shift
  local w=$(( ${#title} + 2 )) s
  for s in "$@"; do (( ${#s} > w )) && w=${#s}; done
  printf '%d' "$w"
}
rw=$(box_width "repo" "${repo_plain[@]}")
sw=$(box_width "session" "${sess_plain[@]}")

box_top() {
  local title="$1" w="$2"
  printf '%s╭─ %s%s%s %s╮%s' "$C_BOX" "$C_TITLE" "$title" "$C_BOX" \
    "$(repeat_char '─' $(( w - ${#title} - 1 )))" "$RESET"
}
box_bottom() {
  printf '%s╰%s╯%s' "$C_BOX" "$(repeat_char '─' $(( $1 + 2 )))" "$RESET"
}
box_row() {
  local colored="$1" w="$2" plain="$3"
  printf '%s│%s %s%s %s│%s' "$C_BOX" "$RESET" "$colored" \
    "$(repeat_char ' ' $(( w - ${#plain} )))" "$C_BOX" "$RESET"
}

out="$(box_top repo "$rw") $(box_top session "$sw")"
for (( i = 0; i < rows; i++ )); do
  out+=$'\n'
  out+="$(box_row "${repo_color[$i]}" "$rw" "${repo_plain[$i]}")"
  out+=" $(box_row "${sess_color[$i]}" "$sw" "${sess_plain[$i]}")"
done
out+=$'\n'"$(box_bottom "$rw") $(box_bottom "$sw")"

printf '%s' "$out"
```

## Windows Implementation

Write `statusline-command.ps1` to the targeted platform directory. Use `ConvertFrom-Json` (no Python dep). Read the JSONL transcript with `Get-Content -ReadCount 0` and `ConvertFrom-Json` per line inside try/catch. Use `[char]27` for ANSI escapes, and set UTF-8 output encoding so the box-drawing glyphs survive.

`statusline-command.ps1`:

```powershell
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ESC = [char]27

$C_CWD    = "$ESC[38;2;94;255;255m"
$C_BRANCH = "$ESC[38;2;194;72;112m"
$C_BOX    = "$ESC[38;2;90;95;105m"
$C_TITLE  = "$ESC[38;2;140;146;158m"
$C_MODEL  = "$ESC[38;2;232;148;64m"
$C_CTX    = "$ESC[38;2;0;154;251m"
$C_TOK    = "$ESC[38;2;147;123;218m"
$C_DIM    = "$ESC[38;2;120;126;138m"
$RESET    = "$ESC[0m"

$GREEN  = "$ESC[38;2;78;186;101m"
$AMBER  = "$ESC[38;2;222;142;62m"
$ORANGE = "$ESC[38;2;234;88;12m"
$REDORG = "$ESC[38;2;183;68;38m"

$TL = [char]0x256D; $TR = [char]0x256E; $BL = [char]0x2570; $BR = [char]0x256F
$HZ = [char]0x2500; $VT = [char]0x2502
$UP = [char]0x2191; $DN = [char]0x2193; $ELLIPSIS = [char]0x2026

function QuotaColor([double]$used) {
  $remaining = 100 - $used
  if ($remaining -gt 60) { return $GREEN }
  if ($remaining -gt 30) { return $AMBER }
  if ($remaining -gt 10) { return $ORANGE }
  return $REDORG
}

function FmtEta($resetsAt) {
  if ($null -eq $resetsAt -or $resetsAt -eq "") { return "" }
  $val = [int64]$resetsAt
  # Claude Code sends an absolute epoch; Antigravity sends a duration.
  if ($val -lt 10000000) {
    $delta = $val
  } else {
    $delta = $val - [int64](Get-Date -UFormat %s)
  }
  if ($delta -le 0) { return "now" }
  $days = [math]::Floor($delta / 86400); $delta = $delta % 86400
  $hours = [math]::Floor($delta / 3600); $delta = $delta % 3600
  $mins = [math]::Floor($delta / 60)
  if ($days -gt 0)  { return "${days}d ${hours}h" }
  if ($hours -gt 0) { return "${hours}h ${mins}m" }
  return "${mins}m"
}

function FmtTokens([int64]$n) {
  if ($n -lt 1000) { return "$n" }
  if ($n -lt 1000000) { return ("{0:N1}k" -f ($n / 1000.0)) }
  return ("{0:N1}M" -f ($n / 1000000.0))
}

function TruncateTo($s, [int]$max) {
  if ($s.Length -gt $max) { return $s.Substring(0, $max - 1) + $ELLIPSIS }
  return $s
}

function ShortenHome($p) {
  if (-not $p) { return "" }
  $userHome = $env:USERPROFILE
  if ($p -eq $userHome) { return "~" }
  if ($p.StartsWith("$userHome\")) { return "~" + $p.Substring($userHome.Length) }
  return $p
}

function SumTokens($path) {
  if (-not $path) { return $null }
  # Resolve path mismatch (if it has .gemini/antigravity/ but it actually is at .gemini/antigravity-cli/)
  if (-not (Test-Path -LiteralPath $path) -and $path.Contains("/.gemini/antigravity/")) {
    $corrected = $path.Replace(".gemini/antigravity/", ".gemini/antigravity-cli/").Replace(".gemini\antigravity\", ".gemini\antigravity-cli\")
    if (Test-Path -LiteralPath $corrected) {
      $path = $corrected
    }
  }
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  $sumIn = 0; $sumOut = 0; $found = $false
  $lines = Get-Content -LiteralPath $path -ReadCount 0 -ErrorAction SilentlyContinue
  if ($null -eq $lines) { return $null }
  foreach ($line in $lines) {
    if (-not $line) { continue }
    try { $obj = $line | ConvertFrom-Json -ErrorAction Stop } catch { continue }
    $msg = $obj.message
    if (-not $msg) { continue }
    $usage = $msg.usage
    if (-not $usage) { continue }
    $found = $true
    if ($usage.input_tokens)              { $sumIn  += [int64]$usage.input_tokens }
    if ($usage.cache_creation_input_tokens) { $sumIn  += [int64]$usage.cache_creation_input_tokens }
    if ($usage.cache_read_input_tokens)    { $sumIn  += [int64]$usage.cache_read_input_tokens }
    if ($usage.output_tokens)             { $sumOut += [int64]$usage.output_tokens }
  }
  if (-not $found) { return $null }
  return ,@($sumIn, $sumOut)
}

$raw = [Console]::In.ReadToEnd()
try { $data = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { @{} } } catch { $data = @{} }

$repoPlain = @(); $repoColor = @()
$sessPlain = @(); $sessColor = @()

$cwd = $data.cwd
if ($cwd) {
  $p = ShortenHome $cwd
  $repoPlain += $p; $repoColor += "$C_CWD$p$RESET"
}

# One `status -b --porcelain` call yields branch, dirty counts and ahead/behind.
# Must use git -C "$cwd", never PWD.
$branch = ""; $staged = 0; $modified = 0; $deleted = 0; $untracked = 0; $ahead = 0; $behind = 0
if ($cwd) {
  $statusLines = & git -C "$cwd" status -b --porcelain 2>$null
  if ($LASTEXITCODE -eq 0 -and $statusLines) {
    foreach ($line in @($statusLines)) {
      if ($line.StartsWith("## ")) {
        $head = $line.Substring(3)
        if ($head -eq "HEAD (no branch)") {
          $sha = & git -C "$cwd" rev-parse --short HEAD 2>$null
          if ($sha) { $branch = "detached@" + $sha.Trim() }
        } else {
          $branch = ($head -split '\.\.\.')[0]
          if ($head -match '\[ahead (\d+)') { $ahead  = [int]$Matches[1] }
          if ($head -match 'behind (\d+)')  { $behind = [int]$Matches[1] }
        }
      } elseif ($line.StartsWith("??")) {
        $untracked++
      } else {
        $idx = $line.Substring(0, 1)
        if ($idx -eq "D") { $deleted++ } elseif ($idx -ne " ") { $staged++ }
        $wt = $line.Substring(1, 1)
        if ($wt -eq "D") { $deleted++ } elseif ($wt -ne " ") { $modified++ }
      }
    }
  }
}

if ($branch) {
  $repoPlain += $branch; $repoColor += "$C_BRANCH$branch$RESET"

  if ($staged -gt 0 -or $modified -gt 0 -or $deleted -gt 0 -or $untracked -gt 0) {
    $parts = @()
    if ($staged -gt 0)    { $parts += "+$staged" }
    if ($modified -gt 0)  { $parts += "~$modified" }
    if ($deleted -gt 0)   { $parts += "-$deleted" }
    if ($untracked -gt 0) { $parts += "?$untracked" }
    $dirty = [string]::Join(" ", $parts)
    $dirtyColored = "$GREEN$dirty$RESET"
  } else {
    $dirty = "clean"; $dirtyColored = "$C_DIM" + "clean$RESET"
  }
  $sync = ""
  if ($ahead -gt 0)  { $sync += " $UP$ahead" }
  if ($behind -gt 0) { $sync += " $DN$behind" }
  $repoPlain += "$dirty$sync"
  $repoColor += "$dirtyColored$C_DIM$sync$RESET"

  $last = & git -C "$cwd" log -1 --format='%h %s' 2>$null
  if ($last) {
    $last = TruncateTo $last.Trim() 80
    $repoPlain += $last; $repoColor += "$C_DIM$last$RESET"
  }
}

$model = $data.model.display_name
$effort = $data.effort.level
if ($model) {
  if ($effort) { $m = "$model ($effort)" } else { $m = "$model" }
  $sessPlain += $m; $sessColor += "$C_MODEL$m$RESET"
}

$tokenSums = SumTokens $data.transcript_path
$ti = 0
$to = 0
if ($null -ne $tokenSums) {
  $ti = $tokenSums[0]
  $to = $tokenSums[1]
}

# Fallback to payload context_window tokens if transcript sum is 0
if ($ti -eq 0 -and $to -eq 0) {
  if ($null -ne $data.context_window.total_input_tokens -and $null -ne $data.context_window.total_output_tokens) {
    $ti = [int64]$data.context_window.total_input_tokens
    $to = [int64]$data.context_window.total_output_tokens
  }
}

$tokens = ""
if ($ti -gt 0 -or $to -gt 0) {
  $tokens = "$UP" + (FmtTokens $ti) + " $DN" + (FmtTokens $to)
}

$ctx = $data.context_window.used_percentage
if ($null -ne $ctx) {
  $c = "ctx " + [int][math]::Round([double]$ctx) + "%"
  $cColored = "$C_CTX$c$RESET"
  if ($tokens) {
    $c += "  $tokens"
    $cColored += "  $C_TOK$tokens$RESET"
  }
  $sessPlain += $c; $sessColor += $cColored
} elseif ($tokens) {
  $sessPlain += $tokens; $sessColor += "$C_TOK$tokens$RESET"
}

$five_used = $null
$five_reset = $null
$seven_used = $null
$seven_reset = $null

if ($null -ne $data.rate_limits.five_hour.used_percentage) {
  $five_used = $data.rate_limits.five_hour.used_percentage
  $five_reset = $data.rate_limits.five_hour.resets_at
} elseif ($null -ne $data.quota) {
  $q5 = if ($null -ne $data.quota."gemini-5h") { $data.quota."gemini-5h" } else { $data.quota."3p-5h" }
  if ($null -ne $q5) {
    $five_used = (1.0 - $q5.remaining_fraction) * 100
    $five_reset = $q5.reset_in_seconds
  }
}

if ($null -ne $data.rate_limits.seven_day.used_percentage) {
  $seven_used = $data.rate_limits.seven_day.used_percentage
  $seven_reset = $data.rate_limits.seven_day.resets_at
} elseif ($null -ne $data.quota) {
  $qw = if ($null -ne $data.quota."gemini-weekly") { $data.quota."gemini-weekly" } else { $data.quota."3p-weekly" }
  if ($null -ne $qw) {
    $seven_used = (1.0 - $qw.remaining_fraction) * 100
    $seven_reset = $qw.reset_in_seconds
  }
}

if ($null -ne $five_used) {
  $s = "5h " + [int][math]::Round($five_used) + "%"
  $eta = FmtEta $five_reset
  if ($eta) { $s += "  resets $eta" }
  $sessPlain += $s; $sessColor += "$(QuotaColor $five_used)$s$RESET"
}
if ($null -ne $seven_used) {
  $s = "7d " + [int][math]::Round($seven_used) + "%"
  $eta = FmtEta $seven_reset
  if ($eta) { $s += "  resets $eta" }
  $sessPlain += $s; $sessColor += "$(QuotaColor $seven_used)$s$RESET"
}

$rows = [math]::Max($repoPlain.Count, $sessPlain.Count)
if ($rows -eq 0) { exit 0 }
while ($repoPlain.Count -lt $rows) { $repoPlain += ""; $repoColor += "" }
while ($sessPlain.Count -lt $rows) { $sessPlain += ""; $sessColor += "" }

# Width comes from the plain rows; the parallel colored rows carry ANSI escapes
# that would otherwise be counted as visible characters.
function BoxWidth($title, $plainRows) {
  $w = $title.Length + 2
  foreach ($s in $plainRows) { if ($s.Length -gt $w) { $w = $s.Length } }
  return $w
}
$rw = BoxWidth "repo" $repoPlain
$sw = BoxWidth "session" $sessPlain

function BoxTop($title, [int]$w) {
  $dashes = [string]$HZ * ($w - $title.Length - 1)
  return "$C_BOX$TL$HZ $C_TITLE$title$C_BOX $dashes$TR$RESET"
}
function BoxBottom([int]$w) {
  return "$C_BOX$BL" + ([string]$HZ * ($w + 2)) + "$BR$RESET"
}
function BoxRow($colored, [int]$w, $plain) {
  $pad = " " * ($w - $plain.Length)
  return "$C_BOX$VT$RESET $colored$pad $C_BOX$VT$RESET"
}

$lines = @()
$lines += (BoxTop "repo" $rw) + " " + (BoxTop "session" $sw)
for ($i = 0; $i -lt $rows; $i++) {
  $lines += (BoxRow $repoColor[$i] $rw $repoPlain[$i]) + " " + (BoxRow $sessColor[$i] $sw $sessPlain[$i])
}
$lines += (BoxBottom $rw) + " " + (BoxBottom $sw)

[Console]::Out.Write([string]::Join("`n", $lines))
```

## Settings Wiring

### Claude Code

Wire into `~/.claude/settings.json` (or `%USERPROFILE%\.claude\settings.json` on Windows):

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
```

(Or the `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.claude\statusline-command.ps1"` variant on Windows).

### Antigravity CLI

Wire into `~/.gemini/antigravity-cli/settings.json` (or `%USERPROFILE%\.gemini\antigravity-cli\settings.json` on Windows):

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.gemini/antigravity-cli/statusline-command.sh",
    "enabled": true
  }
}
```

(Or the `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.gemini\antigravity-cli\statusline-command.ps1"` variant on Windows).

## Smoke Test

After installing, pipe a fake payload into the script and confirm:

- **Every rendered line has the same character count** — this is the alignment check, and it fails first when width is measured off a colored string or the locale is not UTF-8.
- Both boxes show the same number of rows, framed top and bottom on the same lines.
- Inside a repo the repo box shows 4 rows: full cwd, branch, working-tree state, last commit.
- Staging a deletion (`git rm`) renders `-N`, not `+N`.
- 5h renders **orange** at 80% used, 7d renders **amber** at 50% used.
- The tokens sum matches the fixture and sits on the `ctx` row.
- Omitting `transcript_path` leaves the `ctx` row as a bare `ctx N%` — no `↑0 ↓0`, no stray spacing.
- Outside a repo the repo box collapses to the cwd row alone and the session box pads with blank rows.

### Linux/macOS smoke test

```bash
mkdir -p /tmp/statusline-smoke
cat >/tmp/statusline-smoke/transcript.jsonl <<'EOF'
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":100,"cache_creation_input_tokens":200,"cache_read_input_tokens":300,"output_tokens":50}}}
not json at all - must be skipped, not fatal
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":10,"cache_creation_input_tokens":20,"cache_read_input_tokens":30,"output_tokens":5}}}
EOF
FUTURE=$(($(date +%s) + 7200))
FUTURE7=$(($(date +%s) + 3*86400))

# Claude Code payload
printf '{"cwd":"%s","transcript_path":"/tmp/statusline-smoke/transcript.jsonl","model":{"display_name":"Opus 4.7"},"effort":{"level":"medium"},"context_window":{"used_percentage":42},"rate_limits":{"five_hour":{"used_percentage":80,"resets_at":%d},"seven_day":{"used_percentage":50,"resets_at":%d}}}' "$PWD" "$FUTURE" "$FUTURE7" | bash ~/.claude/statusline-command.sh; echo

# Antigravity payload - exercises the quota/reset_in_seconds and token fallbacks
printf '{"cwd":"%s","model":{"display_name":"Gemini 3.5 Flash"},"context_window":{"used_percentage":6.7,"total_input_tokens":70419,"total_output_tokens":16667},"quota":{"gemini-5h":{"remaining_fraction":0.87,"reset_in_seconds":2515},"gemini-weekly":{"remaining_fraction":0.97,"reset_in_seconds":589315}}}' "$PWD" | bash ~/.claude/statusline-command.sh; echo
```

Assert equal line widths mechanically:

```bash
printf '{"cwd":"%s","transcript_path":"/tmp/statusline-smoke/transcript.jsonl","model":{"display_name":"Opus 4.7"},"context_window":{"used_percentage":42}}' "$PWD" \
  | bash ~/.claude/statusline-command.sh \
  | perl -CSD -pe 's/\e\[[0-9;]*m//g' \
  | perl -CSD -ne 'chomp; print length($_), "\n"' \
  | sort -u
```

That must print exactly one number. Re-run the same pipeline wrapped in `env -i PATH="$PATH" HOME="$HOME" bash -c '...'` to confirm the locale guard holds with no `LANG` set.

### Windows smoke test (PowerShell)

```powershell
$tmp = "$env:TEMP\statusline-smoke"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
@'
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":100,"cache_creation_input_tokens":200,"cache_read_input_tokens":300,"output_tokens":50}}}
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":10,"cache_creation_input_tokens":20,"cache_read_input_tokens":30,"output_tokens":5}}}
'@ | Set-Content -LiteralPath "$tmp\transcript.jsonl" -Encoding UTF8
$future = [int64](Get-Date -UFormat %s) + 7200
$future7 = [int64](Get-Date -UFormat %s) + 3*86400
$payload = @{
  cwd = $PWD.Path
  transcript_path = "$tmp\transcript.jsonl"
  model = @{ display_name = "Opus 4.7" }
  effort = @{ level = "medium" }
  context_window = @{ used_percentage = 42 }
  rate_limits = @{
    five_hour = @{ used_percentage = 80; resets_at = $future }
    seven_day = @{ used_percentage = 50; resets_at = $future7 }
  }
} | ConvertTo-Json -Depth 5 -Compress
$out = $payload | powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\statusline-command.ps1"
$out
($out -split "`n" | ForEach-Object { ($_ -replace "$([char]27)\[[0-9;]*m", "").Length } | Sort-Object -Unique)
```

The last line must print exactly one number.

## Color Preview One-Liner

After install, output a one-liner the user can paste to preview all four quota tiers, one tier per line, in the row format the session box uses.

### Bash form

```bash
printf '\033[38;2;78;186;101m5h 20%%  resets 2h 30m\033[0m\n\033[38;2;222;142;62m5h 55%%  resets 2h 30m\033[0m\n\033[38;2;234;88;12m5h 80%%  resets 1h 15m\033[0m\n\033[38;2;183;68;38m5h 95%%  resets 30m\033[0m\n'
```

### PowerShell form

```powershell
$e=[char]27; Write-Host "$e[38;2;78;186;101m5h 20%  resets 2h 30m$e[0m`n$e[38;2;222;142;62m5h 55%  resets 2h 30m$e[0m`n$e[38;2;234;88;12m5h 80%  resets 1h 15m$e[0m`n$e[38;2;183;68;38m5h 95%  resets 30m$e[0m"
```

## Other Rules

- Do not add features beyond this spec.
- Do not auto-commit any changes.
- Do not add Co-Authored-By trailers.
- Read git state with `git -C "$cwd" status -b --porcelain`, never from `PWD`.
- Never measure padding from a string containing ANSI escapes.
- When merging into existing `settings.json`, preserve all other keys; only set/replace `statusLine`.
