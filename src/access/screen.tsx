import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CompetitionWorkspace } from "../competition/screen";

export function AccessScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const workspaceGuard = useRef(() => true);
  const [workspaceKey, setWorkspaceKey] = useState(0);
  const sessionLost = useCallback(() => {
    setAuthenticated(false);
    setError("Sua sessão terminou. Entre novamente para continuar a edição.");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await send("GET");
      if (response.ok) {
        setAuthenticated(true);
        setUnavailable(false);
      } else if (response.status === 401 || response.status === 403) {
        setAuthenticated(false);
        setUnavailable(false);
        if (response.status === 403)
          setError("Esta conta não tem acesso administrativo.");
      } else throw new Error();
    } catch {
      setUnavailable(true);
      setError("Não foi possível verificar o acesso. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (authenticated) headingRef.current?.focus();
  }, [authenticated]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await send("POST", { email: email.trim(), password });
      if (response.ok) {
        setAuthenticated(true);
        setPassword("");
      } else {
        setError(
          response.status === 403
            ? "Esta conta não tem acesso administrativo."
            : response.status === 401
              ? "E-mail ou senha inválidos. Confira e tente novamente."
              : response.status === 429
                ? "Muitas tentativas. Aguarde um minuto e tente novamente."
                : "Não foi possível entrar. Tente novamente.",
        );
        setPassword("");
        passwordRef.current?.focus();
      }
    } catch {
      setError(
        "Não foi possível entrar. Verifique a conexão e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    if (!workspaceGuard.current()) return;
    setSaving(true);
    setError("");
    try {
      const response = await send("DELETE", {});
      if (!response.ok) throw new Error();
      setAuthenticated(false);
      setWorkspaceKey((n) => n + 1);
      setPassword("");
    } catch {
      setError("Não foi possível confirmar a saída. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <a className="access-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="access-header">
        <span>Base do Basquete</span>
        <span className="access-preview">Ambiente de avaliação</span>
      </header>
      <main id="conteudo" className="access-main">
        {loading ? (
          <p role="status">Verificando acesso…</p>
        ) : unavailable ? (
          <section className="access-card">
            <h1>Verificar acesso</h1>
            <p role="alert">{error}</p>
            <button onClick={() => void load()}>Tentar novamente</button>
          </section>
        ) : authenticated ? (
          <section className="access-home">
            <div className="access-title">
              <h1 ref={headingRef} tabIndex={-1}>
                Área administrativa
              </h1>
              <button disabled={saving} onClick={() => void logout()}>
                Sair
              </button>
            </div>
            {error && (
              <p className="access-error" role="alert">
                {error}
              </p>
            )}
            <p>Você está conectado.</p>
          </section>
        ) : (
          <section className="access-card">
            <h1>Acesso administrativo</h1>
            <p>Entre com sua conta para continuar.</p>
            <form onSubmit={(event) => void login(event)} aria-busy={saving}>
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                ref={passwordRef}
                type="password"
                required
                autoComplete="current-password"
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={error ? "access-error" : undefined}
              />
              {error && (
                <p id="access-error" className="access-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={saving}>
                {saving ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </section>
        )}
        <div hidden={!authenticated}>
          <CompetitionWorkspace
            key={workspaceKey}
            enabled={authenticated}
            guard={workspaceGuard}
            onSessionLost={sessionLost}
          />
        </div>
      </main>
    </>
  );
}

function send(method: string, body?: object) {
  return fetch("/api/session", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}
