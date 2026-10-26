import { useState, type FormEvent } from 'react';
import { login, wakeDatabase } from '../lib/api';
import styles from './Login.module.css';

type Props = {
  onSuccess: () => void;
};

/** Fixed shop account — must match server APP_USERNAME (default jardin). */
const SHOP_USERNAME = 'jardin';

export function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState(SHOP_USERNAME);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const user = username.trim();
    if (user.toLowerCase() !== SHOP_USERNAME) {
      setError('Utilizator greșit. Verifică numele și încearcă din nou.');
      return;
    }
    setLoading(true);
    try {
      await login(user, password);
      await wakeDatabase();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentificare eșuată');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form
        className={styles.card}
        method="post"
        action="/"
        autoComplete="on"
        onSubmit={handleSubmit}
      >
        <img
          className={styles.brandLogo}
          src="/logo-jardin.png"
          alt="El Jardín de Aliss — Floristería"
          width={280}
          height={219}
        />
        <h1>Punct de vânzare</h1>
        <label htmlFor="login-username">
          Utilizator
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            enterKeyHint="next"
          />
        </label>
        <label htmlFor="login-password">
          Parolă
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            enterKeyHint="go"
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={loading || !password.trim()}>
          {loading ? 'Se încarcă… te rugăm așteaptă' : 'Intră'}
        </button>
      </form>
    </div>
  );
}
