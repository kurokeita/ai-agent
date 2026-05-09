-- koreader/patches/2-example-patch.lua
-- Early-phase patch: wrap InfoMessage:init to prefix every message with "[patched]".
-- Targets KOReader v2025.05+. Remove if upstream changes the InfoMessage API.

local Version = require("version")
if Version:getCurrentRevision() < "v2025.05" then return end

local InfoMessage = require("ui.widget.infomessage")
local original_init = InfoMessage.init

function InfoMessage:init()
    if self.text and not self._patched then
        self.text = "[patched] " .. self.text
        self._patched = true
    end
    return original_init(self)
end
