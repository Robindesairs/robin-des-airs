-- Envoi d'un iMessage. Appelé par imessage-radar-poller.js :
--   osascript imessage-send.applescript "+33612345678" "mon message"
-- Les arguments évitent tout problème d'échappement.
on run argv
	if (count of argv) < 2 then error "usage: handle message"
	set targetHandle to item 1 of argv
	set targetMessage to item 2 of argv
	tell application "Messages"
		try
			set targetService to 1st service whose service type = iMessage
			send targetMessage to buddy targetHandle of targetService
		on error
			-- Repli : laisser Messages choisir le service (iMessage/SMS) pour ce contact.
			send targetMessage to buddy targetHandle
		end try
	end tell
end run
