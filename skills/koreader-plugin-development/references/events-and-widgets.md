# Events and Widgets

## Class hierarchy

```
EventListener           -- ui.widget.eventlistener (handleEvent)
└── Widget              -- ui.widget.widget
    └── WidgetContainer -- ui.widget.container.widgetcontainer
        ├── FrameContainer, CenterContainer, BottomContainer, ...
        ├── InputContainer  (gesture handling)
        ├── ReaderUI / FileManager (top-level hosts)
        └── any plugin extending WidgetContainer
```

All widgets inherit `handleEvent`. `WidgetContainer` overrides it to first propagate to children; if no child returns `true`, the container's own `on<EventName>` runs.

## Sending an event

```lua
widget:handleEvent(Event:new("Timeout"))         -- direct, may be unsafe if widget destroys itself
UIManager:sendEvent(Event:new("PageUpdate", 5))  -- from topmost widget down
UIManager:broadcastEvent(Event:new("CloseDocument")) -- to every widget on the stack
```

`Event:new(name, arg1, arg2, ...)` packs args; the receiver implements `on<Name>(self, arg1, arg2, ...)`.

## The event consumption contract

```lua
function MyPlugin:onPageUpdate(new_pageno)
    if not self.enabled then return end   -- do not consume
    self:doWork(new_pageno)
    return true                            -- stop propagation
end
```

- `return true` — consume; sibling widgets and the container's own handler are skipped.
- `return nil`/`false` — let propagation continue.

Consumption is the most common source of "my plugin runs but the reader stops responding to taps" bugs. Consume only events whose semantics you fully replace.

## Common reader events

| Event | When | Args |
|-------|------|------|
| `ReaderReady` | After document opens and modules initialized | `doc_settings` |
| `CloseDocument` | Before tearing down ReaderUI | — |
| `PosUpdate` | Reader rolling module signals scroll position change | `pos` |
| `UpdatePos` | Typesetting changed; recompute layout | — |
| `PageUpdate` | Page number changed | `new_pageno` |
| `PageChangeAnimation` | Animated page turn | `forward` |
| `BookMetadataChanged` | Metadata edited | `prop_updated` |
| `Suspend` / `Resume` | Device sleep cycle | — |
| `NetworkConnected` / `NetworkDisconnected` | Network state | — |

## Common file-manager events

| Event | When |
|-------|------|
| `PathChanged` | Directory navigated |
| `BookmarkAdded` / `BookmarkRemoved` | Bookmark mutated |
| `SetupShowReader` | About to launch Reader for a file |

For exhaustive coverage, search KOReader source for `Event:new("` — every emit is grep-able.

## UIManager lifecycle for widgets

```lua
UIManager:show(widget)        -- push onto _window_stack, schedule paint
UIManager:setDirty(widget, "ui")  -- request redraw
UIManager:close(widget)       -- pop, schedule repaint of stack below
UIManager:scheduleIn(0.5, fn) -- run after 500ms
UIManager:unschedule(fn)
UIManager:nextTick(fn)        -- defer to next event loop tick
```

Always pair `show` with `close`. Widgets registered with `is_always_active = true` keep receiving events even when not at the top of the stack.

## Useful built-in widgets

| Widget | Purpose |
|--------|---------|
| `InfoMessage` | Modal info text with auto-close |
| `ConfirmBox` | Yes/no prompt with callbacks |
| `ButtonDialog` | Multi-button dialog from a 2D grid |
| `InputDialog` | Text input with buttons |
| `Notification` | Transient toast (no user dismissal) |
| `Menu` | Scrollable list of items |
| `KeyValuePage` | Two-column property display |
| `TrapWidget` | Block input while a long task runs |

All are under `ui.widget.*` and accept a table of properties to `:new{...}`.

## Draw-page code path (for performance work)

1. `ReaderView:recalculate` flags itself dirty.
2. UIManager main loop calls `ReaderView:paintTo`.
3. `ReaderView:paintTo` calls `document:drawPage`.
4. `document:drawPage` checks the cache; if hit, returns the cached buffer.
5. On miss, `document:renderPage` calls `_document:openPage`, `page:draw`, then caches the buffer.

Hooking `ReaderView:paintTo` from a plugin can layer custom overlays per page; do it sparingly and never block.
