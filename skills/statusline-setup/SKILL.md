---
name: statusline-setup
description: 'Set up the Claude Code statusline with cwd, git branch, model, context %, session token totals, and 5h/7d quota usage with ETA. Use when asked to "set up my statusline", "install statusline", "configure Claude Code statusline", or to add a colored status line showing rate limits and token usage. Detects OS and installs the appropriate variant (bash + jq on Linux/macOS, PowerShell on Windows).'
---

# Statusline Setup

Install a Claude Code statusline that renders, left to right, pipe-separated:

1. **cwd** — 24-bit ANSI `#5EFFFF` (`38;2;94;255;255`), with `$HOME` / `%USERPROFILE%` shortened to `~`.
2. **git branch** in parentheses — 24-bit ANSI `#C24870` (`38;2;194;72;112`), only when inside a repo.
3. **model display name + effort** in parens — 24-bit ANSI `#E89440` (`38;2;232;148;64`), effort only when present.
4. **`ctx N%`** — 24-bit ANSI `#009AFB` (`38;2;0;154;251`), the `context_window.used_percentage`.
5. **tokens** as `↑<in> ↓<out>` — 24-bit ANSI `#937bda` (`38;2;147;123;218`), its own pipe-separated segment immediately after `ctx`.
6. **`5h:N%(eta)`** and **`7d:N%(eta)`** — colored independently by remaining quota (see below).

Segments are joined with ANSI `0;37` pipes (` | `).

## When to Use This Skill

- "Set up my Claude Code statusline"
- "Install the statusline"
- "Configure my statusline with token counts and quota"
- Any request to add a colored status line showing context %, rate limits, or session tokens.

## OS Detection

Detect the platform first and install only the matching variant:

- **Linux / macOS** → write `~/.claude/statusline-command.sh` (pure bash + `jq`), wire into `~/.claude/settings.json`.
- **Windows** → write `%USERPROFILE%\.claude\statusline-command.ps1`, wire into `%USERPROFILE%\.claude\settings.json`.

## Token Formatting

- `< 1000` → raw integer (e.g. `↑850 ↓120`)
- `>= 1_000` → one decimal + `k` (e.g. `↑1.2k ↓34.5k`)
- `>= 1_000_000` → one decimal + `M` (e.g. `↑1.2M ↓3.4M`)
- Missing/unparseable transcript → omit the segment entirely (no stray separator, never render `↑0 ↓0`).

## Token Source

Claude Code does **not** include token totals in the statusline JSON. Read `transcript_path` (JSONL, one message per line) and sum across **assistant** messages:

- `input` = `message.usage.input_tokens` + `message.usage.cache_creation_input_tokens` + `message.usage.cache_read_input_tokens`
- `output` = `message.usage.output_tokens`

Skip lines that fail JSON parsing or lack `message.usage`. If `transcript_path` is missing or the file does not exist, omit the tokens segment.

## Quota Colors (by REMAINING quota = 100 - used%)

| Remaining | Color | 24-bit ANSI |
|-----------|-------|-------------|
| `> 60%` | bright green `#4eba65` | `38;2;78;186;101` |
| `31–60%` | amber `#de8e3e` | `38;2;222;142;62` |
| `11–30%` | orange `#ea580c` | `38;2;234;88;12` |
| `<= 10%` | deep red-orange `#b74426` | `38;2;183;68;38` |

The 5h and 7d windows must be colored **independently**.

## ETA Format (from epoch seconds in `resets_at`)

- `> 1 day` → `Xd Yh`
- `> 1 hour` → `Xh Ym`
- else → `Xm`
- past → `now`

## Input Schema (stdin JSON)

Any field may be missing:

```
cwd
transcript_path
model.display_name
effort.level
context_window.used_percentage
rate_limits.five_hour.used_percentage
rate_limits.five_hour.resets_at
rate_limits.seven_day.used_percentage
rate_limits.seven_day.resets_at
```

## Linux / macOS Implementation

Write `~/.claude/statusline-command.sh` (chmod +x). Pure bash + `jq` — no Python. `jq` must be installed (`apt install jq`, `brew install jq`, etc.); if missing, the script prints a one-line hint and exits 0 so the statusline area stays clean.

JSON parsing rules:

- Read the full stdin payload **once** with `cat`, parse all fields with a single `jq` call.
- For the JSONL transcript, invoke `jq` **once over the whole file** (do not call `jq` per line) — use a streaming filter that reduces over `inputs`.

`~/.claude/statusline-command.sh`:

```bash
#!/usr/bin/env bash
# Claude Code statusline — pure bash + jq.

set -u

if ! command -v jq >/dev/null 2>&1; then
  printf '%s' "statusline: jq not installed"
  exit 0
fi

C_CWD=$'\033[38;2;94;255;255m'
C_BRANCH=$'\033[38;2;194;72;112m'
C_PIPE=$'\033[0;37m'
C_MODEL=$'\033[38;2;232;148;64m'
C_CTX=$'\033[38;2;0;154;251m'
C_TOK=$'\033[38;2;147;123;218m'
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
  now=$(date +%s)
  delta=$(( resets - now ))
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

shorten_home() {
  local p="$1"
  [[ -z "$p" ]] && return
  if [[ "$p" == "$HOME" ]]; then printf '~'
  elif [[ "$p" == "$HOME"/* ]]; then printf '~%s' "${p#$HOME}"
  else printf '%s' "$p"
  fi
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
      (.rate_limits.five_hour.used_percentage // "" | tostring),
      (.rate_limits.five_hour.resets_at // "" | tostring),
      (.rate_limits.seven_day.used_percentage // "" | tostring),
      (.rate_limits.seven_day.resets_at // "" | tostring)
    ] | join("\u001f")
  ' 2>/dev/null <<<"$payload"
}

IFS=$'\x1f' read -r cwd transcript model effort ctx five_used five_reset seven_used seven_reset < <(read_fields)

segments=()

if [[ -n "$cwd" ]]; then
  segments+=("${C_CWD}$(shorten_home "$cwd")${RESET}")
fi

# Branch: must use git -C "$cwd", never PWD.
branch=""
if [[ -n "$cwd" ]]; then
  branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null) || branch=""
fi
if [[ -n "$branch" ]]; then
  segments+=("${C_BRANCH}(${branch})${RESET}")
fi

if [[ -n "$model" ]]; then
  if [[ -n "$effort" ]]; then
    segments+=("${C_MODEL}${model} (${effort})${RESET}")
  else
    segments+=("${C_MODEL}${model}${RESET}")
  fi
fi

if [[ -n "$ctx" ]]; then
  ctx_int=$(awk -v n="$ctx" 'BEGIN{printf "%d", (n+0.5)}')
  segments+=("${C_CTX}ctx ${ctx_int}%${RESET}")
fi

# --- tokens: one jq pass over the whole JSONL transcript ---
if [[ -n "$transcript" && -f "$transcript" ]]; then
  tok=$(jq -rs '
    reduce .[] as $m ({i:0,o:0};
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
    if (( ti > 0 || to > 0 )); then
      segments+=("${C_TOK}↑$(fmt_tokens "$ti") ↓$(fmt_tokens "$to")${RESET}")
    fi
  fi
fi

if [[ -n "$five_used" ]]; then
  fu=$(awk -v n="$five_used" 'BEGIN{printf "%d", (n+0.5)}')
  eta=$(fmt_eta "$five_reset")
  segments+=("$(quota_color "$fu")5h:${fu}%(${eta})${RESET}")
fi
if [[ -n "$seven_used" ]]; then
  su=$(awk -v n="$seven_used" 'BEGIN{printf "%d", (n+0.5)}')
  eta=$(fmt_eta "$seven_reset")
  segments+=("$(quota_color "$su")7d:${su}%(${eta})${RESET}")
fi

sep=" ${C_PIPE}|${RESET} "
out=""
for i in "${!segments[@]}"; do
  if (( i == 0 )); then out="${segments[$i]}"
  else out="${out}${sep}${segments[$i]}"
  fi
done
printf '%s' "$out"
```

Wire into `~/.claude/settings.json` (merge into existing JSON, don't clobber other keys):

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash ~/.claude/statusline-command.sh"
  }
}
```

## Windows Implementation

Write `%USERPROFILE%\.claude\statusline-command.ps1`. Use `ConvertFrom-Json` (no Python dep). Read the JSONL transcript with `Get-Content -ReadCount 0` and `ConvertFrom-Json` per line inside try/catch. Use `[char]27` for ANSI escapes (works on PS 5.1 and 7+). Read stdin with `[Console]::In.ReadToEnd()`.

`%USERPROFILE%\.claude\statusline-command.ps1`:

```powershell
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ESC = [char]27

$C_CWD    = "$ESC[38;2;94;255;255m"
$C_BRANCH = "$ESC[38;2;194;72;112m"
$C_PIPE   = "$ESC[0;37m"
$C_MODEL  = "$ESC[38;2;232;148;64m"
$C_CTX    = "$ESC[38;2;0;154;251m"
$C_TOK    = "$ESC[38;2;147;123;218m"
$RESET    = "$ESC[0m"

$GREEN  = "$ESC[38;2;78;186;101m"
$AMBER  = "$ESC[38;2;222;142;62m"
$ORANGE = "$ESC[38;2;234;88;12m"
$REDORG = "$ESC[38;2;183;68;38m"

function QuotaColor([double]$used) {
  $remaining = 100 - $used
  if ($remaining -gt 60) { return $GREEN }
  if ($remaining -gt 30) { return $AMBER }
  if ($remaining -gt 10) { return $ORANGE }
  return $REDORG
}

function FmtEta($resetsAt) {
  if ($null -eq $resetsAt) { return "" }
  $delta = [int64]$resetsAt - [int64](Get-Date -UFormat %s)
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

function ShortenHome($p) {
  if (-not $p) { return "" }
  $home = $env:USERPROFILE
  if ($p -eq $home) { return "~" }
  if ($p.StartsWith("$home\")) { return "~" + $p.Substring($home.Length) }
  return $p
}

function GetBranch($cwd) {
  if (-not $cwd) { return $null }
  try {
    $b = & git -C "$cwd" rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $b) { return $b.Trim() }
  } catch {}
  return $null
}

function SumTokens($path) {
  if (-not $path) { return $null }
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

$segments = @()

$cwd = $data.cwd
if ($cwd) { $segments += "$C_CWD$(ShortenHome $cwd)$RESET" }

$branch = GetBranch $cwd
if ($branch) { $segments += "$C_BRANCH($branch)$RESET" }

$model = $data.model.display_name
$effort = $data.effort.level
if ($model) {
  if ($effort) { $segments += "$C_MODEL$model ($effort)$RESET" }
  else         { $segments += "$C_MODEL$model$RESET" }
}

$ctx = $data.context_window.used_percentage
if ($null -ne $ctx) { $segments += "$C_CTX" + "ctx " + [int][math]::Round([double]$ctx) + "%$RESET" }

$tokens = SumTokens $data.transcript_path
if ($null -ne $tokens) {
  $segments += "$C_TOK↑$(FmtTokens $tokens[0]) ↓$(FmtTokens $tokens[1])$RESET"
}

$five = $data.rate_limits.five_hour
$seven = $data.rate_limits.seven_day
if ($null -ne $five.used_percentage) {
  $u = [double]$five.used_percentage
  $segments += "$(QuotaColor $u)5h:$([int][math]::Round($u))%($(FmtEta $five.resets_at))$RESET"
}
if ($null -ne $seven.used_percentage) {
  $u = [double]$seven.used_percentage
  $segments += "$(QuotaColor $u)7d:$([int][math]::Round($u))%($(FmtEta $seven.resets_at))$RESET"
}

$sep = " $C_PIPE|$RESET "
[Console]::Out.Write([string]::Join($sep, $segments))
```

Wire into `%USERPROFILE%\.claude\settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%USERPROFILE%\\.claude\\statusline-command.ps1\""
  }
}
```

## Smoke Test

After installing, generate a fake JSON payload with 5h at 80% used, 7d at 50% used, both with future `resets_at`, plus a `transcript_path` pointing at a small fixture JSONL containing two assistant messages with `usage` blocks. Pipe it into the script and confirm:

- 5h renders **orange**, 7d renders **amber**.
- cwd, model, and context % are present.
- Tokens segment renders `↑<sum> ↓<sum>` matching the fixture, in `#937bda`, as its own pipe-separated segment immediately after `ctx`.
- Omitting `transcript_path` hides the tokens segment cleanly (no stray separator).

### Linux/macOS smoke test

```bash
mkdir -p /tmp/statusline-smoke
cat >/tmp/statusline-smoke/transcript.jsonl <<'EOF'
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":100,"cache_creation_input_tokens":200,"cache_read_input_tokens":300,"output_tokens":50}}}
{"type":"assistant","message":{"role":"assistant","usage":{"input_tokens":10,"cache_creation_input_tokens":20,"cache_read_input_tokens":30,"output_tokens":5}}}
EOF
FUTURE=$(($(date +%s) + 7200))
FUTURE7=$(($(date +%s) + 3*86400))
printf '{"cwd":"%s","transcript_path":"/tmp/statusline-smoke/transcript.jsonl","model":{"display_name":"Opus 4.7"},"effort":{"level":"medium"},"context_window":{"used_percentage":42},"rate_limits":{"five_hour":{"used_percentage":80,"resets_at":%d},"seven_day":{"used_percentage":50,"resets_at":%d}}}' "$HOME" "$FUTURE" "$FUTURE7" | bash ~/.claude/statusline-command.sh; echo
```

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
  cwd = $env:USERPROFILE
  transcript_path = "$tmp\transcript.jsonl"
  model = @{ display_name = "Opus 4.7" }
  effort = @{ level = "medium" }
  context_window = @{ used_percentage = 42 }
  rate_limits = @{
    five_hour = @{ used_percentage = 80; resets_at = $future }
    seven_day = @{ used_percentage = 50; resets_at = $future7 }
  }
} | ConvertTo-Json -Depth 5 -Compress
$payload | powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\statusline-command.ps1"
```

## Color Preview One-Liner

After install, output a one-liner the user can paste to preview all four quota tiers, with both 5h and 7d on each line, separated by ` | `, one tier per line.

### Bash form

```bash
printf '\033[38;2;78;186;101m5h:20%%(2h30m)\033[0m \033[0;37m|\033[0m \033[38;2;78;186;101m7d:25%%(3d12h)\033[0m\n\033[38;2;222;142;62m5h:55%%(2h30m)\033[0m \033[0;37m|\033[0m \033[38;2;222;142;62m7d:45%%(3d12h)\033[0m\n\033[38;2;234;88;12m5h:80%%(1h15m)\033[0m \033[0;37m|\033[0m \033[38;2;234;88;12m7d:75%%(2d3h)\033[0m\n\033[38;2;183;68;38m5h:95%%(0h30m)\033[0m \033[0;37m|\033[0m \033[38;2;183;68;38m7d:92%%(1d2h)\033[0m\n'
```

### PowerShell form

```powershell
$e=[char]27; Write-Host "$e[38;2;78;186;101m5h:20%(2h30m)$e[0m $e[0;37m|$e[0m $e[38;2;78;186;101m7d:25%(3d12h)$e[0m`n$e[38;2;222;142;62m5h:55%(2h30m)$e[0m $e[0;37m|$e[0m $e[38;2;222;142;62m7d:45%(3d12h)$e[0m`n$e[38;2;234;88;12m5h:80%(1h15m)$e[0m $e[0;37m|$e[0m $e[38;2;234;88;12m7d:75%(2d3h)$e[0m`n$e[38;2;183;68;38m5h:95%(0h30m)$e[0m $e[0;37m|$e[0m $e[38;2;183;68;38m7d:92%(1d2h)$e[0m"
```

## Other Rules

- Do not add features beyond this spec.
- Do not auto-commit any changes.
- Do not add Co-Authored-By trailers.
- Read git branch with `git -C "$cwd" rev-parse --abbrev-ref HEAD`, never from `PWD`.
- When merging into existing `settings.json`, preserve all other keys; only set/replace `statusLine`.
