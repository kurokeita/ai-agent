# Patches (`koreader/patches/`)

User patches are arbitrary Lua files in `koreader/patches/` that the `userpatch` module applies during startup. Use them when:

- A plugin would be overkill for a one-line behavior change.
- The change must run before plugins or before the UI builds.
- Distributing a hotfix to users who can drop a single file into a directory.

## Priority ordering

`userpatch.applyPatches(priority)` is called multiple times during boot. Each call processes files whose name starts with the matching numeric prefix, sorted lexicographically.

| Filename prefix | Phase | Run point | Typical use |
|-----------------|-------|-----------|-------------|
| `1-` | early-once | Very early, before most modules load | Set globals, env vars, monkey-patch core utilities |
| `2-` | early | After core modules load, before UI | Override module methods that the UI then uses |
| `3-` | late | After UI is built | Replace running widgets, mutate menus |

A patch named `2-fix-readerfooter.lua` runs in the early phase; `3-add-menu.lua` runs late.

## Patch skeleton

```lua
-- 2-stay-on-cover.lua
-- Targets KOReader v2025.05+; remove if behavior is fixed upstream.

local ReaderRolling = require("apps.reader.modules.readerrolling")
local original_onReadSettings = ReaderRolling.onReadSettings

function ReaderRolling:onReadSettings(config)
    local res = original_onReadSettings(self, config)
    if config:nilOrTrue("stay_on_cover") then
        self:gotoPos(0)
    end
    return res
end
```

Always:

1. Capture the original function before replacement.
2. Call the original from inside your override unless the goal is total replacement.
3. Pass `self` and all args through unchanged.

## Patch idioms

### Add a method

```lua
local M = require("apps.reader.modules.readerbookmark")
function M:exportAll()
    -- ...
end
```

### Wrap an existing method

```lua
local M = require("ui.widget.infomessage")
local orig = M.init
function M:init()
    orig(self)
    self.text = "[patched] " .. (self.text or "")
end
```

### Replace a method

```lua
local M = require("apps.reader.modules.readerfooter")
function M:onTapFooter() return false end
```

### Add a menu entry from a patch

A patch can mutate the menu builder used by the UI — the safer option is to attach to an existing module's `addToMainMenu`:

```lua
local M = require("apps.reader.modules.readermenu")
local orig = M.setUpdateItemTable
function M:setUpdateItemTable()
    orig(self)
    self.menu_items.tools.sub_item_table[#self.menu_items.tools.sub_item_table + 1] = {
        text = "Patched entry",
        callback = function() end,
    }
end
```

For complex menu work, prefer a plugin.

## Version guarding

KOReader internals shift between releases. A patch that worked on v2025.04 may crash on v2025.07.

```lua
local Version = require("version")
local current = Version:getCurrentRevision()
if current < "v2025.05" then return end  -- skip if older
```

Always include a target-version comment header so users (and you, six months later) can audit at a glance.

## Removal

To disable a patch, delete it or rename it so the prefix no longer matches a known phase (e.g. `_off-2-foo.lua`). Patches do not auto-clean their effects on next boot — KOReader simply does not reapply them.

Patches that allocate scheduled tasks or register listeners must clean up on `CloseDocument` / `Exit` if the user might disable them mid-session. Easier path: design patches to be idempotent and applied only at startup.

## Failure mode

A patch that errors during application aborts only that patch; remaining patches and the rest of boot continue. The traceback lands in `crash.log` with the patch filename. Always test with debug logging on (`./kodev run --debug`) before shipping.

## When NOT to use a patch

- Adding substantial new UI → write a plugin.
- Anything users should be able to toggle → write a plugin.
- Patching something that has an official extension hook → use the hook (events, dispatcher, `addToMainMenu`).
