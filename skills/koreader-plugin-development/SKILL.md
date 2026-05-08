---
name: koreader-plugin-development
description: This skill should be used when the user asks to "create a KOReader plugin", "write a koplugin", "build a KOReader patch", "userpatch", "modify KOReader behavior", "add a menu item to KOReader", "develop for KOReader", or mentions ".koplugin", "koreader/patches/", `WidgetContainer`, `UIManager`, or KOReader event handlers. Provides plugin and patch development guidance for the KOReader e-reader application (Lua, LuaJIT).
---

# KOReader Plugin and Patch Development

KOReader is a document viewer for e-ink readers, written in Lua on LuaJIT. It exposes two main extension mechanisms:

- **Plugins** — self-contained `.koplugin/` directories loaded by `pluginloader` from `DEFAULT_PLUGIN_PATH` or `extra_plugin_paths`. Use for new features, menu entries, or background tasks.
- **Patches** — Lua files in `koreader/patches/` applied at startup by the `userpatch` module. Use for runtime monkey-patching of KOReader internals when a plugin is too heavy or the change must run before plugin load.

Choose plugins when the change is a feature you can ship as a folder. Choose patches for surgical fixes to existing modules, behavior overrides, or hotfixes that target a specific KOReader version.

## Mental Model

KOReader's UI is a tree of `WidgetContainer` instances (subclasses of `EventListener`) managed by a top-level `UIManager`. Communication happens via `Event` objects with a `handler` name and `args`. `WidgetContainer:handleEvent` propagates events to children first; if no child returns `true`, the container's own `on<EventName>` method runs.

Plugins are typically classes that `extend(WidgetContainer)` and register themselves to UI host (`ReaderUI` or `FileManager`) via `addToMainMenu`, dispatcher actions, or by listening to events.

Patches manipulate already-loaded modules (`require("readerui")`, etc.) to change methods, add hooks, or replace functions before or after the UI is built.

## Workflow

### To create a plugin

1. Create a directory `MyPlugin.koplugin/` containing at least:
   - `main.lua` — module returning a `WidgetContainer`-derived class
   - `_meta.lua` — table with `name`, `fullname`, `description`, optional `version`
2. Place it under KOReader's `plugins/` directory (or set `extra_plugin_paths`).
3. Implement the plugin class. Required pieces:
   - `extend(WidgetContainer:new{ name = "myplugin" })`
   - `init(self)` to wire dispatcher actions and event handlers
   - `addToMainMenu(self, menu_items)` if the plugin needs a menu entry
4. Surface UI via `UIManager:show(InfoMessage:new{ text = "..." })` or custom widgets.
5. React to events via `onEventName(self, ...)` methods. Return `true` to consume.
6. Restart KOReader (or re-enter file manager) to pick up the plugin.

See `examples/helloworld.lua` for a minimal plugin and `references/plugin-anatomy.md` for full structure rules and lifecycle.

### To create a patch

1. Create `koreader/patches/2-my-fix.lua` (the leading number sets priority; see priorities below).
2. `require` the target module and replace or wrap methods on it.
3. Keep the patch small and version-pin it via a header comment that names the KOReader version it targets — patches break across releases.
4. Restart KOReader. Errors during patch application surface in `crash.log`.

Priority is encoded in the filename prefix passed by `userpatch.applyPatches(priority)`. Common values:

| Prefix | Phase | Use for |
|--------|-------|---------|
| `1-` | early-once (very early) | Startup-only configuration, env tweaks |
| `2-` | early (before UI) | Patch core modules before UI builds |
| `3-` | late (after UI) | Override running widgets, add menu items |

See `references/patches.md` for monkey-patch idioms, version-guards, and pitfalls.

## Common Tasks

### Add a menu item

Implement `addToMainMenu(self, menu_items)` in a plugin and push an entry into the proper sub-table (`menu_items.tools`, `menu_items.plugins`, etc.). The host UI calls this once when the menu is built.

### Listen for an event

Add `onEventName(self, arg1, arg2)` to the plugin class. Returning `true` stops further propagation; returning `nil`/`false` lets sibling widgets see the event. Common reader events include `PosUpdate`, `UpdatePos`, `PageUpdate`, `ReaderReady`, `CloseDocument`. See `references/events-and-widgets.md` for the wider catalog.

### Show something to the user

Quick info: `UIManager:show(InfoMessage:new{ text = _("Done") })`.
Transient toast: `Notification:notify("Saved")`.
Custom UI: subclass `WidgetContainer` (or use `ButtonDialog`, `InputDialog`), then `UIManager:show(self)`. Always pair with `UIManager:close(self)` when dismissing.

### Run code on a schedule

`UIManager:scheduleIn(seconds, function() ... end)` and `UIManager:unschedule(callback)`. For repeating background work, prefer subclassing `BackgroundTaskPlugin` (`ui.plugin.background_task_plugin`).

### Persist plugin state

Use `LuaSettings` (`require("luasettings")`) backed by a file under `DataStorage:getSettingsDir()`. For document-scoped state, write to `self.ui.doc_settings` so it follows the document.

## Debugging

- Enable debug mode (`./kodev run --debug` in dev, or `Settings -> Developer options -> Enable debug logging` on device) to get stack traces for event handlers and `logger.dbg(...)` output.
- `logger.dbg("label", value)` prints to stdout and to `koreader/crash.log`. Lua arguments evaluate eagerly — guard heavy expressions with `if dbg.is_on then ... end`.
- Read `crash.log` first when something fails silently; missing menu entries usually trace back to a load-time error in the plugin.
- Iterate on widget code without booting the reader: `./kodev wbuilder` spins up a minimal UI host. Add `UIManager:show(MyWidget:new{...})` lines to `tools/wbuilder.lua` to preview.

See `references/debugging.md` for emulator setup, asserts, and breakpoint strategies.

## Important Gotchas

- **Module identity:** patches must target the exact module path KOReader uses (`require("apps.reader.readerui")`, not `require("readerui")` from outside the source root). Mismatched paths silently no-op.
- **Event return contract:** forgetting to `return true` causes events to keep propagating, often manifesting as duplicated actions.
- **String translation:** wrap user-visible strings in `_(...)` from `gettext` so they participate in translations.
- **Reader vs. FileManager host:** plugins can run under either. Check `self.ui.name == "ReaderUI"` or use `if self.ui.document then` to branch.
- **Version drift:** KOReader internals change between releases. Both patches and plugins that touch private fields must declare a target version in the header and degrade gracefully if internals shift.
- **No pcall around plugin init:** an error during `init` disables the plugin without obvious user feedback. Keep `init` defensive and short; defer heavy work to lazy methods or first-event.

## File Layout Reference

```
koreader/
├── plugins/
│   └── MyPlugin.koplugin/
│       ├── _meta.lua
│       ├── main.lua
│       └── (assets, sub-modules, README.md)
├── patches/
│   ├── 2-fix-something.lua
│   └── 3-override-menu.lua
└── crash.log
```

## Source-of-Truth Links

These pages back the rules above. Verify against them when behavior diverges.

- Development guide (frontend layout): <https://koreader.rocks/doc/topics/Development_guide.md.html>
- Events guide (propagation, builtin events): <https://koreader.rocks/doc/topics/Events.md.html>
- Hacking guide (debugging, wbuilder): <https://koreader.rocks/doc/topics/Hacking.md.html>
- `pluginloader` module: <https://koreader.rocks/doc/modules/pluginloader.html>
- `userpatch` module: <https://koreader.rocks/doc/modules/userpatch.html>
- HelloWorld example plugin: <https://github.com/koreader/koreader/tree/master/plugins/helloworld.koplugin>

## Additional Resources

### Reference Files

- `references/plugin-anatomy.md` — `_meta.lua`, `main.lua`, lifecycle, `addToMainMenu`, dispatcher integration, plugin disable/enable settings.
- `references/events-and-widgets.md` — `WidgetContainer` propagation rules, common reader/filemanager events, `UIManager` lifecycle.
- `references/patches.md` — patch priorities, monkey-patch idioms, version-guard patterns, removal/cleanup.
- `references/debugging.md` — `logger`, `dbg`, `crash.log`, `wbuilder`, emulator workflow.

### Examples

- `examples/helloworld.lua` — minimal plugin `main.lua` showing menu registration and `InfoMessage`.
- `examples/_meta.lua` — minimal metadata file.
- `examples/2-example-patch.lua` — early-phase patch that wraps an existing method.

When information conflicts, the source-of-truth links above take precedence over this skill — verify against them before changing production code.
