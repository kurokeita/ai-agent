# Plugin Anatomy

## Directory layout

A plugin is a directory whose name matches `.+%.koplugin`. KOReader scans `DEFAULT_PLUGIN_PATH` (the bundled `plugins/` directory) plus any path listed in the `extra_plugin_paths` setting. The user setting `plugins_disabled` is a table of plugin names to skip.

```
MyPlugin.koplugin/
├── _meta.lua        # plugin metadata (required for menu integration)
├── main.lua         # returns the plugin class
├── README.md        # optional, surfaced in the plugin manager UI
├── i18n/            # optional Crowdin-style translations
└── *.lua            # additional sub-modules
```

## `_meta.lua`

Returns a plain table that pluginloader reads before instantiating `main.lua`. Minimum fields:

```lua
return {
    name = "myplugin",            -- internal id, must match WidgetContainer name
    fullname = _("My Plugin"),    -- shown in plugin manager
    description = _([[One-paragraph description.]]),
}
```

Optional fields recognized by the loader: `version`, `author`. The translation function `_` comes from `gettext` and is available in `_meta.lua` evaluation scope.

## `main.lua` skeleton

```lua
local WidgetContainer = require("ui.widget.container.widgetcontainer")
local InfoMessage = require("ui.widget.infomessage")
local UIManager = require("ui.uimanager")
local _ = require("gettext")

local MyPlugin = WidgetContainer:extend{
    name = "myplugin",
    is_doc_only = false,   -- true: only load inside ReaderUI
}

function MyPlugin:init()
    self.ui.menu:registerToMainMenu(self)
end

function MyPlugin:addToMainMenu(menu_items)
    menu_items.myplugin = {
        text = _("My plugin"),
        sorting_hint = "tools",
        callback = function()
            UIManager:show(InfoMessage:new{ text = _("Hello from MyPlugin") })
        end,
    }
end

return MyPlugin
```

Key conventions:

- `name` must be unique and match the directory stem.
- `is_doc_only = true` restricts the plugin to ReaderUI; omit for both hosts.
- `init` runs after the host UI built `self.ui`. Treat it as the plugin's constructor — register menus, dispatcher actions, and event listeners here.
- Returning the class (not an instance) lets pluginloader instantiate per host.

## Lifecycle and host wiring

`pluginloader` instantiates plugins for the active UI host (`FileManager` or `ReaderUI`). Each instance is appended as a child of that host's `WidgetContainer`, so it receives every event the host receives via standard propagation.

To register hooks beyond the menu:

- Dispatcher actions (gestures, profiles): `Dispatcher:registerAction("my_action", { category = "none", event = "MyAction", title = _("My action"), general = true })` then handle `onMyAction`.
- Background work: extend `ui.plugin.background_task_plugin`.
- Toggle behavior: extend `ui.plugin.switch_plugin`.

## Event handlers in plugins

Implement `onFoo(self, ...)` to handle event `Foo`. The host UI broadcasts events down the tree; plugins receive them after host modules. Returning `true` stops propagation. Avoid swallowing events the reader needs (`PageUpdate`, `PosUpdate`) unless that is the goal.

## Persistence

- App-wide settings: `local LuaSettings = require("luasettings"); local s = LuaSettings:open(DataStorage:getSettingsDir() .. "/myplugin.lua")`.
- Per-document state: `self.ui.doc_settings:saveSetting("myplugin_state", value)`. Saved with the document's metadata.
- Always handle the case where the file does not yet exist; LuaSettings degrades to an empty table.

## Internationalization

Wrap user-visible strings: `local _ = require("gettext"); _("Save")`. For plurals, `gettext.ngettext("%1 page", "%1 pages", n)`. Translations live under KOReader's main `l10n/` tree; for in-tree plugins, use the project's translation pipeline. For out-of-tree plugins, you may ship strings English-only or vendor your own gettext catalog.

## Loading errors

Errors during plugin load disable the plugin silently for the user but log to `crash.log`. Defensive techniques:

- Wrap optional dependencies (e.g. plugins that integrate with another plugin) in `pcall(require, "...")`.
- Keep `_meta.lua` side-effect free — it loads in a plain `dofile` context.
- Avoid top-level `require` of modules that only exist in newer KOReader versions; gate with `pcall` and fall back gracefully.
