# Debugging KOReader Plugins and Patches

## Quick logger

```lua
local logger = require("logger")
logger.dbg("foo", { a = 1 })  -- prefixed with DEBUG
logger.info("startup ok")
logger.warn("recoverable issue")
logger.err("failure", err)
```

`logger.dbg` only prints when debug logging is enabled. Lua evaluates arguments eagerly, so wrap heavy work:

```lua
local dbg = require("dbg")
if dbg.is_on then
    logger.dbg("expensive view", buildSnapshot())
end
```

## Where logs go

- Desktop emulator: stdout of the `./kodev run` process.
- On device: `koreader/crash.log`. Lines tagged `04/06/17-21:44:53 DEBUG …`.

`crash.log` is the first place to look when a plugin "doesn't load" or a patch "didn't run". Plugin-load errors land here with the plugin path.

## Enable debug mode

- Dev: `./kodev run --debug`
- On device: `Settings -> Developer options -> Enable debug logging`. Optionally `Enable verbose debug logging` for finer detail. Restart KOReader for the change to take effect.

In debug mode the loader logs stack traces from event handlers — this is how you find which plugin or patch raised an exception during event dispatch.

## Emulator workflow

`./kodev` is the dev driver. Useful targets:

- `./kodev run` — start the SDL emulator with the bundled plugins.
- `./kodev run --debug` — same with debug logging.
- `./kodev wbuilder` — minimal UI host for prototyping a single widget without booting reader/file-manager. Append `UIManager:show(MyWidget:new{...})` lines to `tools/wbuilder.lua`.
- `./kodev test` — run the unit suite (`busted`).
- `./kodev clean` / `./kodev fetch-thirdparty` — when builds drift.

For out-of-tree plugin development, point KOReader at your folder via the `extra_plugin_paths` setting (UI: Plugin manager) so you do not have to copy files on each iteration.

## Inspecting state

- `dbg.dump(any_value)` — pretty-prints a Lua table to the log.
- `require("dump")(any_value)` — alternative dumper used elsewhere in the codebase.
- `UIManager._window_stack` — the live widget stack, top of stack is the topmost visible widget.
- `self.ui` from inside a plugin gives access to the host (`ReaderUI` or `FileManager`) and all sibling modules (`self.ui.menu`, `self.ui.document`, `self.ui.dictionary`, etc.).

## Asserts and fail-fast

Plugin `init` errors disable the plugin silently in production; let them propagate during development:

```lua
function MyPlugin:init()
    assert(self.ui, "no host UI")
    -- ...
end
```

Wrap the assert in `if dbg.is_on then` if you need a forgiving build.

## Common diagnostics

| Symptom | First check |
|---------|-------------|
| Plugin not in plugin manager | `crash.log` for load error; verify `_meta.lua` returns a table |
| Menu entry missing | `addToMainMenu` actually called? `self.ui.menu:registerToMainMenu(self)` in `init`? |
| Event handler not firing | Event name typo; `is_doc_only` true while in FileManager; child widget consuming first |
| Patch silently no-op | Wrong module path passed to `require`; another patch already replaced the same method |
| UI not redrawing | Missing `UIManager:setDirty(widget, "ui")` after mutating widget state |

## Reproducing on device vs emulator

Emulator runs the same Lua but uses SDL for framebuffer and lacks real Wi-Fi, real e-ink refresh quirks, and some device-specific paths. Behaviors that depend on the framebuffer driver (waveform modes, partial refresh) only repro on hardware. Path-sensitive logic (case-sensitive filesystems, mount points) usually shows up on Linux but not on macOS.

## Reading the source effectively

When the docs are silent (most plugin internals), grep:

```
git grep "Event:new(\"PageUpdate\""
git grep "registerToMainMenu"
git grep "applyPatches"
```

The KOReader codebase is the authoritative reference; treat upstream code as documentation.
