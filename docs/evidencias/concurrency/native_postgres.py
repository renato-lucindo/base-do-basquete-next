"""Disposable PostgreSQL 17.11 only; no application/remote credentials or services.

Windows: python docs/evidencias/concurrency/native_postgres.py
Requires the official extracted binaries described in the plan. All clients and
data belong to a new loopback cluster; finally closes clients and stops it.
"""
from __future__ import annotations

import ctypes as ct
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
ART = ROOT / ".preview-artifacts"
BIN = ART / "pg-native-17.11" / "pgsql" / "bin"
PORT = 55439
HOST = "127.0.0.1"
DB = "bdb_disposable_native"
OWNER = "postgres"
BAR = 918273645
PREFIX = "f9400000-0000-4000-8000-"
HIDDEN = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0


def ident(n):
    return PREFIX + str(n).zfill(12)


def listening():
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex((HOST, PORT)) == 0


def binary(name):
    return str(BIN / (name + (".exe" if sys.platform == "win32" else "")))


class SqlFailure(Exception):
    def __init__(self, state, message):
        super().__init__(f"{state}: {message}")
        self.state = state


class Libpq:
    def __init__(self):
        self.directory = os.add_dll_directory(str(BIN)) if sys.platform == "win32" else None
        self.dll = ct.CDLL(str(BIN / "libpq.dll") if sys.platform == "win32" else "libpq.so.5")
        p, i, s = ct.c_void_p, ct.c_int, ct.c_char_p
        signatures = {
            "PQconnectdb": ([s], p), "PQstatus": ([p], i),
            "PQerrorMessage": ([p], s), "PQfinish": ([p], None),
            "PQsetnonblocking": ([p, i], i), "PQsendQuery": ([p, s], i),
            "PQflush": ([p], i), "PQconsumeInput": ([p], i),
            "PQisBusy": ([p], i), "PQgetResult": ([p], p),
            "PQresultStatus": ([p], i), "PQclear": ([p], None),
            "PQresultErrorField": ([p, i], s), "PQntuples": ([p], i),
            "PQnfields": ([p], i), "PQfname": ([p, i], s),
            "PQgetvalue": ([p, i, i], s), "PQgetisnull": ([p, i, i], i),
            "PQbackendPID": ([p], i), "PQtransactionStatus": ([p], i),
        }
        for name, (args, returns) in signatures.items():
            f = getattr(self.dll, name)
            f.argtypes, f.restype = args, returns


def decoded(value):
    return value.decode("utf-8", "replace") if value else ""


class Client:
    def __init__(self, lib, name, database=DB):
        assert database.startswith("bdb_disposable_") or database == "postgres"
        self.pq, self.pending = lib.dll, False
        self.ptr = self.pq.PQconnectdb(
            f"host={HOST} port={PORT} dbname={database} user={OWNER} password='' sslmode=disable connect_timeout=3 application_name={name}".encode()
        )
        if not self.ptr or self.pq.PQstatus(self.ptr) != 0:
            message = decoded(self.pq.PQerrorMessage(self.ptr)) if self.ptr else "no connection"
            self.close()
            raise RuntimeError(message)
        self.pid = self.pq.PQbackendPID(self.ptr)
        assert self.pq.PQsetnonblocking(self.ptr, 1) == 0

    def send(self, sql):
        assert not self.pending, "Never overlap commands on one connection"
        if self.pq.PQsendQuery(self.ptr, sql.encode("utf-8")) != 1:
            raise RuntimeError(decoded(self.pq.PQerrorMessage(self.ptr)))
        self.pending = True
        deadline = time.monotonic() + 5
        while self.pq.PQflush(self.ptr) == 1:
            assert time.monotonic() < deadline, "send deadline"
            time.sleep(0.005)

    def finish(self, timeout=15):
        assert self.pending
        deadline, rows, failure = time.monotonic() + timeout, [], None
        while True:
            assert self.pq.PQconsumeInput(self.ptr) == 1, "connection input failed"
            if self.pq.PQisBusy(self.ptr):
                assert time.monotonic() < deadline, "query deadline"
                time.sleep(0.005)
                continue
            result = self.pq.PQgetResult(self.ptr)
            if not result:
                break
            try:
                status = self.pq.PQresultStatus(result)
                if status not in (1, 2):
                    failure = SqlFailure(decoded(self.pq.PQresultErrorField(result, 67)), decoded(self.pq.PQresultErrorField(result, 77)))
                elif status == 2:
                    names = [decoded(self.pq.PQfname(result, n)) for n in range(self.pq.PQnfields(result))]
                    rows = [{name: None if self.pq.PQgetisnull(result, r, c) else decoded(self.pq.PQgetvalue(result, r, c)) for c, name in enumerate(names)} for r in range(self.pq.PQntuples(result))]
            finally:
                self.pq.PQclear(result)
        self.pending = False
        if failure:
            raise failure
        return rows

    def query(self, sql):
        self.send(sql)
        return self.finish()

    def value(self, sql):
        return json.loads(self.query(sql)[0]["data"])

    def close(self):
        if getattr(self, "ptr", None):
            self.pq.PQfinish(self.ptr)
            self.ptr = None


def command_sql(command):
    return "select public.publish_sheet_game('" + json.dumps(command, ensure_ascii=False).replace("'", "''") + "'::jsonb) as data"


def expect_state(call, state):
    try:
        call()
    except SqlFailure as error:
        assert error.state == state, (error.state, state)
        return state
    raise AssertionError(f"Expected SQLSTATE {state}")


def wait_blocked(control, target, blocker, advisory_key=None):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        row = control.value(f"select jsonb_build_object('pid',pid,'event',wait_event,'type',wait_event_type,'blockers',pg_blocking_pids(pid),'waitingLocks',(select jsonb_agg(jsonb_build_object('kind',locktype,'classid',classid::bigint,'objid',objid::bigint,'objsubid',objsubid,'mode',mode)) from pg_locks where pid={target.pid} and not granted)) as data from pg_stat_activity where pid={target.pid}")
        if row["type"] == "Lock" and blocker.pid in row["blockers"]:
            if advisory_key is not None:
                bits = advisory_key & ((1 << 64) - 1)
                assert any(lock["kind"] == "advisory" and lock["classid"] == bits >> 32 and lock["objid"] == bits & ((1 << 32) - 1) and lock["objsubid"] == 1 for lock in row["waitingLocks"]), "Unexpected advisory lock identity"
                row["expectedKey"] = str(advisory_key)
            return row
        time.sleep(0.01)
    raise AssertionError(f"No observed blocking {target.pid} <- {blocker.pid}")


def main():
    if not __debug__:
        raise RuntimeError("Assertions must stay enabled for this proof")
    assert (BIN / "postgres.exe").is_file(), "Prepare official native binaries first"
    assert not listening(), "Preserve the existing listener; do not start a cluster"
    version = subprocess.check_output([binary("postgres"), "--version"], creationflags=HIDDEN, text=True).strip()
    assert version == "postgres (PostgreSQL) 17.11", version
    run_dir = ART / ("pg-native-run-" + uuid.uuid4().hex[:8])
    assert run_dir.resolve().is_relative_to(ART.resolve()) and not run_dir.exists()
    run_dir.mkdir()
    data, startup_log = run_dir / "data", run_dir / "startup.log"
    report = {"startedAt": datetime.now(timezone.utc).isoformat(), "version": version, "platform": sys.platform, "python": sys.version.split()[0], "dataDirectory": str(data), "port": PORT, "cases": [], "success": False}
    clients, control = [], None

    def client(lib, name, database=DB):
        c = Client(lib, name, database)
        clients.append(c)
        return c

    def barrier(game):
        control.query("delete from private.native_test_barriers")
        control.query(f"insert into private.native_test_barriers values('{ident(100000 + game)}',{BAR})")
        control.query(f"select pg_advisory_lock({BAR}::bigint)")

    def release():
        control.query(f"select pg_advisory_unlock({BAR}::bigint)")

    try:
        with startup_log.open("w", encoding="utf-8") as log:
            subprocess.run([binary("initdb"), "-D", str(data), "-U", OWNER, "--auth=trust", "--encoding=UTF8", "--no-locale"], stdout=log, stderr=log, check=True, timeout=45, creationflags=HIDDEN)
            subprocess.run([binary("pg_ctl"), "-D", str(data), "-l", str(run_dir / "postgres.log"), "-o", f"-h {HOST} -p {PORT} -c max_connections=12 -c shared_buffers=32MB", "-w", "-t", "15", "start"], stdout=log, stderr=log, check=True, timeout=20, creationflags=HIDDEN)
        lib = Libpq()
        bootstrap = client(lib, "bdb-native-bootstrap", "postgres")
        bootstrap.query(f"create database {DB}")
        control = client(lib, "bdb-native-controller")
        observed = control.value("select jsonb_build_object('version',current_setting('server_version'),'database',current_database(),'directory',current_setting('data_directory')) as data")
        assert observed["version"] == "17.11" and observed["database"] == DB
        assert Path(observed["directory"]).resolve() == data.resolve(), "Wrong cluster"
        platform = (ROOT / "tests/fixtures/database-platform.ts").read_text(encoding="utf-8").split("`", 1)[1].rsplit("`", 1)[0]
        assert "${" not in platform
        control.query("begin;" + platform + "commit;")
        migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"))
        assert len(migrations) == 44
        for migration in migrations:
            control.query("begin;" + migration.read_text(encoding="utf-8") + "commit;")
        report["migrationCount"], report["lastMigration"] = len(migrations), migrations[-1].name
        setup = re.search(r"export const capacitySetup = `(.*?)`;", (ROOT / "tests/fixtures/confirmed-capacity.ts").read_text(encoding="utf-8"), re.S).group(1)
        assert "${" not in setup
        control.query(setup + "reset role;commit;")
        control.query("""create table private.native_test_barriers(game_id uuid primary key,lock_key bigint not null);
create function private.native_test_wait() returns trigger language plpgsql set search_path='' as $$declare k bigint;begin select lock_key into k from private.native_test_barriers where game_id=new.game_id;if found then perform pg_advisory_xact_lock(k);end if;return new;end$$;
revoke all on private.native_test_barriers from public,anon,authenticated,service_role;
revoke all on function private.native_test_wait() from public,anon,authenticated,service_role;
create trigger native_test_pause before insert or update on public.published_games for each row execute function private.native_test_wait();""")
        a, b = client(lib, "bdb-native-writer-A"), client(lib, "bdb-native-writer-B")
        reader = client(lib, "bdb-native-reader")
        for c in (a, b):
            c.query(f"set role authenticated;set request.jwt.claim.sub='{ident(98)}'")
        reader.query("set role anon")
        assert len({c.pid for c in (control, a, b, reader)}) == 4
        report["pids"] = {"controller": control.pid, "A": a.pid, "B": b.pid, "reader": reader.pid}
        root_key = control.value(f"select to_jsonb(hashtextextended('competition:{ident(1)}',0)) as data")

        # Same request: B really waits behind A's command lock; no duplicate receipt.
        cmd = control.value("select pg_temp.cap_command(1) as data")
        barrier(1)
        a.send(command_sql(cmd))
        held = wait_blocked(control, a, control, BAR)
        b.send(command_sql(cmd))
        command_key = control.value(f"select to_jsonb(hashtextextended('publication-command:{cmd['requestId']}',0)) as data")
        blocked = wait_blocked(control, b, a, command_key)
        release()
        ack_a, ack_b = json.loads(a.finish()[0]["data"]), json.loads(b.finish()[0]["data"])
        assert ack_a == ack_b and ack_a["version"] == 1
        counts = control.value("select jsonb_build_object('publications',(select count(*) from public.published_games),'receipts',(select count(*) from private.game_publication_commands),'sheets',(select count(*) from public.game_sheets)) as data")
        assert counts == {"publications": 1, "receipts": 1, "sheets": 1}
        report["cases"].append({"case": "same-command", "held": held, "blocked": blocked, "counts": counts})

        # Distinct stale command must fail both while queued and after retry.
        cmd = control.value("select pg_temp.cap_command(2) as data")
        old = dict(cmd, requestId=ident(299999))
        barrier(2)
        a.send(command_sql(cmd))
        held = wait_blocked(control, a, control, BAR)
        b.send(command_sql(old))
        blocked = wait_blocked(control, b, a, root_key)
        release()
        assert json.loads(a.finish()[0]["data"])["version"] == 1
        expect_state(b.finish, "PT409")
        expect_state(lambda: b.query(command_sql(old)), "PT409")
        assert control.value(f"select to_jsonb(count(*)) as data from private.game_publication_commands where request_id='{old['requestId']}'") == 0
        report["cases"].append({"case": "stale-version", "held": held, "blocked": blocked, "states": ["PT409", "PT409"]})

        # An uncommitted revocation must block fresh authorization, then deny it.
        cmd = control.value("select pg_temp.cap_command(3) as data")
        control.query(f"begin;update public.admin_access set enabled=false where user_id='{ident(98)}'")
        b.send(command_sql(cmd))
        blocked = wait_blocked(control, b, control)
        assert blocked["event"] == "transactionid"
        control.query("commit")
        expect_state(b.finish, "PT403")
        assert control.value(f"select to_jsonb(count(*)) as data from private.game_publication_commands where request_id='{cmd['requestId']}'") == 0
        control.query(f"update public.admin_access set enabled=true where user_id='{ident(98)}'")
        report["cases"].append({"case": "admin-revoked", "blocked": blocked, "state": "PT403"})

        # Public STABLE reads do not wait on the root; old version is refused after commit.
        original = control.value(f"select snapshot as data from public.published_games where game_id='{ident(100001)}'")
        head = reader.value(f"select public.get_public_statistics_head('{ident(3)}') as data")
        cmd = control.value("select pg_temp.cap_command(1) as data")
        cmd.update(requestId=ident(299998), gameVersion=2, basePublicationVersion=1, reason="Revisão para prova nativa de concorrência.")
        cmd["source"]["baseSheetVersion"] = 1
        cmd["source"]["document"]["events"][0]["code"] = "3"
        barrier(1)
        a.send(command_sql(cmd))
        held = wait_blocked(control, a, control, BAR)
        page_sql = f"select public.get_public_statistics_page('{ident(3)}',{head['version']},null) as data"
        during = reader.value(page_sql)
        assert during["version"] == head["version"]
        assert next(g for g in during["games"] if g["snapshot"]["id"] == ident(100001))["snapshot"] == original
        release()
        assert json.loads(a.finish()[0]["data"])["version"] == 2
        expect_state(lambda: reader.query(page_sql), "PT409")
        current = reader.value(f"select public.get_public_statistics_head('{ident(3)}') as data")
        assert current["version"] == head["version"] + 1
        history = control.value(f"select snapshot as data from private.game_publication_versions where game_id='{ident(100001)}' and version=1")
        assert history == original
        report["cases"].append({"case": "read-during-correction", "held": held, "beforeVersion": head["version"], "afterVersion": current["version"], "oldPageState": "PT409", "historyPreserved": True})

        # Two different games serialize the shared projection without losing a row/version.
        cmd_a = control.value("select pg_temp.cap_command(4) as data")
        cmd_b = control.value("select pg_temp.cap_command(5) as data")
        barrier(4)
        a.send(command_sql(cmd_a))
        held = wait_blocked(control, a, control, BAR)
        b.send(command_sql(cmd_b))
        blocked = wait_blocked(control, b, a, root_key)
        release()
        assert json.loads(a.finish()[0]["data"])["version"] == 1
        assert json.loads(b.finish()[0]["data"])["version"] == 1
        final = control.value(f"select jsonb_build_object('head',public.get_public_statistics_head('{ident(3)}'),'publications',(select count(*) from public.published_games),'versions',(select count(*) from private.game_publication_versions),'receipts',(select count(*) from private.game_publication_commands),'changes',(select count(*) from private.statistics_publication_changes),'participants',(select count(*) from public.published_player_games)) as data")
        assert {k: final[k] for k in ("publications", "versions", "receipts", "changes", "participants")} == {"publications": 4, "versions": 5, "receipts": 5, "changes": 5, "participants": 44}
        assert final["head"]["version"] == 5 and final["head"]["gameCount"] == 4
        report["cases"].append({"case": "different-games", "held": held, "blocked": blocked, "final": final})
        report["success"] = True
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
            with startup_log.open("a", encoding="utf-8") as log:
                stopped = subprocess.run([binary("pg_ctl"), "-D", str(data), "-m", "fast", "-w", "-t", "15", "stop"], stdout=log, stderr=log, timeout=20, creationflags=HIDDEN)
                report["stopExitCode"] = stopped.returncode
        report["portClosed"] = not listening()
        report["endedAt"] = datetime.now(timezone.utc).isoformat()
        report["success"] = report["success"] and report["portClosed"] and report.get("stopExitCode",0) == 0
        (ART / "native-concurrency.json").write_text(json.dumps(report, indent=2, ensure_ascii=True), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=True), flush=True)
        assert report["portClosed"], "Own test port still listening; inspect before continuing"


if __name__ == "__main__":
    main()
