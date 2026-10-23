-- Explicit deny documents the private receipt boundary and remains restrictive
-- if a future migration adds another policy. Privileged writer checks auth first.
create policy clients_never_access_command_receipts
on private.competition_commands as restrictive for all to public
using (false) with check (false);
