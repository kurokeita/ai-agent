-- Minimal KOReader plugin: HelloWorld.koplugin/main.lua
-- Add to plugins/HelloWorld.koplugin/ alongside _meta.lua, then restart KOReader.

local InfoMessage = require("ui.widget.infomessage")
local UIManager = require("ui.uimanager")
local WidgetContainer = require("ui.widget.container.widgetcontainer")
local logger = require("logger")
local _ = require("gettext")

local HelloWorld = WidgetContainer:extend{
    name = "helloworld",
    is_doc_only = false,
}

function HelloWorld:init()
    self.ui.menu:registerToMainMenu(self)
end

function HelloWorld:addToMainMenu(menu_items)
    menu_items.helloworld = {
        text = _("Hello World"),
        sorting_hint = "tools",
        callback = function()
            UIManager:show(InfoMessage:new{
                text = _("Hello, plugin world."),
            })
        end,
    }
end

function HelloWorld:onPageUpdate(new_pageno)
    logger.dbg("HelloWorld saw PageUpdate", new_pageno)
    -- Do not return true; let other widgets handle the event too.
end

return HelloWorld
