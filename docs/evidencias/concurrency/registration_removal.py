"""Focal removal races in a NEW disposable local cluster; no remote credentials.

Run with Python -B. Reuses only libpq/lock observation helpers from the earlier
proof, whose five unrelated cases are not repeated. No production guard bypass.
"""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import uuid
from datetime import datetime, timezone

import native_postgres as n


def ident(number):
    return "f9500000-0000-4000-8000-" + str(number).zfill(12)


def rpc(name, command):
    assert name in ("save_game", "remove_registration")
    return "select public." + name + "('" + json.dumps(command).replace("'", "''") + "'::jsonb) as data"


def removal(target, command):
    return {"commandId": ident(command), "registrationId": ident(target), "disputeId": ident(92), "expectedVersion": 1}


def game(target, number):
    return {"commandId": ident(600 + number), "expectedVersion": 0, "game": {
        "id": ident(80 + number), "disputeId": ident(92), "homeRegistrationId": ident(target),
        "awayRegistrationId": ident(11), "date": None, "time": None, "venue": None, "number": None}}


def main():
    if not __debug__:
        raise RuntimeError("Assertions must remain enabled")
    # Only this module's fresh cluster uses the alternate port. Never stop another.
    n.PORT = 55440
    database = "bdb_disposable_removal"
    assert n.ART.resolve().is_relative_to(n.ROOT.resolve())
    assert Path(n.binary("postgres")).is_file(), "Prepare the previously verified binaries first"
    assert not n.listening(), "Preserve the existing listener"
    version = subprocess.check_output([n.binary("postgres"), "--version"], text=True, creationflags=n.HIDDEN).strip()
    assert version == "postgres (PostgreSQL) 17.11", version
    run_dir = n.ART / ("removal-native-run-" + uuid.uuid4().hex[:8])
    assert run_dir.resolve().is_relative_to(n.ART.resolve()) and not run_dir.exists()
    run_dir.mkdir()
    data, startup = run_dir / "data", run_dir / "startup.log"
    report = {"startedAt": datetime.now(timezone.utc).isoformat(), "version": version, "platform": sys.platform,
              "dataDirectory": str(data), "port": n.PORT, "cases": [], "success": False}
    clients, control = [], None
    barrier_key = 918273646

    def client(lib, name, db=database):
        value = n.Client(lib, name, db)
        clients.append(value)
        return value

    def hold(entity, number):
        assert entity in ("games", "registrations")
        control.query("delete from private.removal_native_barriers")
        control.query(f"insert into private.removal_native_barriers values('{entity}','{ident(number)}',{barrier_key})")
        control.query(f"select pg_advisory_lock({barrier_key}::bigint)")

    def release():
        control.query(f"select pg_advisory_unlock({barrier_key}::bigint)")

    try:
        with startup.open("w", encoding="utf-8") as log:
            subprocess.run([n.binary("initdb"), "-D", str(data), "-U", n.OWNER, "--auth=trust", "--encoding=UTF8", "--no-locale"], stdout=log, stderr=log, check=True, timeout=45, creationflags=n.HIDDEN)
            subprocess.run([n.binary("pg_ctl"), "-D", str(data), "-l", str(run_dir / "postgres.log"), "-o", f"-h {n.HOST} -p {n.PORT} -c max_connections=12 -c shared_buffers=32MB", "-w", "-t", "15", "start"], stdout=log, stderr=log, check=True, timeout=20, creationflags=n.HIDDEN)
        lib = n.Libpq()
        bootstrap = client(lib, "bdb-removal-bootstrap", "postgres")
        bootstrap.query(f"create database {database}")
        control = client(lib, "bdb-removal-control")
        observed = control.value("select jsonb_build_object('database',current_database(),'directory',current_setting('data_directory'),'version',current_setting('server_version')) as data")
        assert observed["database"] == database and observed["version"] == "17.11"
        assert Path(observed["directory"]).resolve() == data.resolve()
        platform = (n.ROOT / "tests/fixtures/database-platform.ts").read_text(encoding="utf-8").split("`", 1)[1].rsplit("`", 1)[0]
        assert "${" not in platform
        control.query("begin;" + platform + "commit;")
        migrations = sorted((n.ROOT / "supabase/migrations").glob("*.sql"))
        assert len(migrations) == 45 and migrations[-1].name.endswith("_registration_removal.sql")
        for path in migrations:
            control.query("begin;" + path.read_text(encoding="utf-8") + "commit;")
        report["migrationCount"] = len(migrations)
        seed = (n.ROOT / "supabase/tests/registration_removal.sql").read_text(encoding="utf-8").split("-- REMOVAL PROOF")[0]
        control.query(seed + "commit;")
        control.query(f"set request.jwt.claim.sub='{ident(98)}'")
        for target in (18, 19, 20):
            control.query(f"select public.save_registration(pg_temp.rm_create({target}))")
        control.query("""
          create table private.removal_native_barriers(entity text,id uuid,key bigint,primary key(entity,id));
          create function private.removal_native_pause() returns trigger language plpgsql set search_path='' as $$
          declare target uuid;k bigint;begin
            if tg_op='DELETE' then target:=old.id;else target:=new.id;end if;
            select key into k from private.removal_native_barriers where entity=tg_table_name and id=target;
            if found then perform pg_advisory_xact_lock(k);end if;
            if tg_op='DELETE' then return old;else return new;end if;
          end$$;
          create trigger removal_native_game before insert on public.games for each row execute function private.removal_native_pause();
          create trigger removal_native_registration before delete on public.registrations for each row execute function private.removal_native_pause();
        """)
        a, b = client(lib, "bdb-removal-a"), client(lib, "bdb-removal-b")
        for c in (a, b):
            c.query(f"set request.jwt.claim.sub='{ident(98)}';set role authenticated;set statement_timeout='12s'")
        assert len({control.pid, a.pid, b.pid}) == 3
        report["pids"] = {"controller": control.pid, "a": a.pid, "b": b.pid}
        root_key = control.value(f"select to_jsonb(hashtextextended('competition:{ident(90)}',0)) as data")

        # The real game writer holds the root before its INSERT barrier.
        hold("games", 81)
        a.send(rpc("save_game", game(18, 1)))
        held = n.wait_blocked(control, a, control, barrier_key)
        b.send(rpc("remove_registration", removal(18, 518)))
        blocked = n.wait_blocked(control, b, a, root_key)
        release()
        assert json.loads(a.finish()[0]["data"])["version"] == 1
        assert n.expect_state(lambda: b.finish(), "PT409") == "PT409"
        checks = control.value(f"select jsonb_build_object('registration',exists(select 1 from public.registrations where id='{ident(18)}'),'receipt',exists(select 1 from private.registration_removals where registration_id='{ident(18)}')) as data")
        assert checks == {"registration": True, "receipt": False}
        report["cases"].append({"case": "dependency-before-removal", "held": held, "blocked": blocked, "state": "PT409", "checks": checks})

        # The real removal holds root + row before its DELETE barrier.
        hold("registrations", 19)
        a.send(rpc("remove_registration", removal(19, 519)))
        held = n.wait_blocked(control, a, control, barrier_key)
        b.send(rpc("save_game", game(19, 2)))
        blocked = n.wait_blocked(control, b, a, root_key)
        release()
        assert json.loads(a.finish()[0]["data"])["state"] == "removed"
        assert n.expect_state(lambda: b.finish(), "PT400") == "PT400"
        checks = control.value(f"select jsonb_build_object('registration',exists(select 1 from public.registrations where id='{ident(19)}'),'game',exists(select 1 from public.games where id='{ident(82)}'),'gameReceipt',exists(select 1 from private.game_commands where command_id='{ident(602)}')) as data")
        assert checks == {"registration": False, "game": False, "gameReceipt": False}
        report["cases"].append({"case": "removal-before-dependency", "held": held, "blocked": blocked, "state": "PT400", "checks": checks})

        hold("registrations", 20)
        command = removal(20, 520)
        a.send(rpc("remove_registration", command))
        held = n.wait_blocked(control, a, control, barrier_key)
        b.send(rpc("remove_registration", command))
        command_key = control.value(f"select to_jsonb(hashtextextended('registration-removal-command:{ident(520)}',0)) as data")
        blocked = n.wait_blocked(control, b, a, command_key)
        release()
        ack_a, ack_b = json.loads(a.finish()[0]["data"]), json.loads(b.finish()[0]["data"])
        assert ack_a == ack_b == {"state": "removed", "id": ident(20), "disputeId": ident(92), "deletedVersion": 1}
        count = control.value(f"select to_jsonb(count(*)) as data from private.registration_removals where registration_id='{ident(20)}'")
        assert count == 1
        report["cases"].append({"case": "same-removal-command", "held": held, "blocked": blocked, "equalAcks": True, "receipts": count})
        final = control.value("select jsonb_build_object('removals',(select count(*) from private.registration_removals),'games',(select count(*) from public.games),'gameReceipts',(select count(*) from private.game_commands)) as data")
        assert final == {"removals": 2, "games": 2, "gameReceipts": 1}
        report["final"], report["success"] = final, True
    except Exception as error:
        report["error"] = str(error)
        raise
    finally:
        if control and control.ptr:
            try:
                if control.pq.PQtransactionStatus(control.ptr) in (2, 3):
                    control.query("rollback")
                control.query("select pg_advisory_unlock_all()")
                for c in clients:
                    if c is not control and c.ptr:
                        control.query(f"select pg_cancel_backend({c.pid})")
            except Exception:
                pass
        for c in clients:
            c.close()
        if (data / "postmaster.pid").exists():
            with startup.open("a", encoding="utf-8") as log:
                stopped = subprocess.run([n.binary("pg_ctl"), "-D", str(data), "-m", "fast", "-w", "-t", "15", "stop"], stdout=log, stderr=log, timeout=20, creationflags=n.HIDDEN)
                report["stopExitCode"] = stopped.returncode
        report["portClosed"] = not n.listening()
        report["endedAt"] = datetime.now(timezone.utc).isoformat()
        report["success"] = report["success"] and report["portClosed"] and report.get("stopExitCode", 0) == 0
        (n.ART / "removal-native-concurrency.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report), flush=True)
        assert report["portClosed"], "Own test port still listening; inspect before continuing"


if __name__ == "__main__":
    main()
