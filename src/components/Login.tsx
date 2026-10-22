import { useState, type FormEvent } from 'react';
import { login, wakeDatabase } from '../lib/api';
import styles from './Login.module.css';

type Props = {
  onSuccess: () => void;
};

export function Login({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
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
      <form className={styles.card} onSubmit={handleSubmit}>
        <img
          className={styles.brandLogo}
          src="/logo-jardin.png"
          alt="El Jardín de Aliss — Floristería"
          width={280}
          height={219}
        />
        <h1>Punct de vânzare</h1>
        <label>
          Parolă
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            aria-label="Parolă"
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
