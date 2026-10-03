import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../auth/AuthContext';
import { Logo } from '../layouts/AppLayout';
import { Button, ErrorBox, Field, Input } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError(new Error('Enter your email and password'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const u = await login(form.email.trim(), form.password);
      navigate(location.state?.from || homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-steel-900 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mb-5 text-sm text-slate-500">Staff, technicians and customers use the same login.</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Email">
            <Input type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <ErrorBox error={error} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          Looking for a new machine? <Link to="/selector" className="font-medium text-brand-700">Try the product selector</Link>
        </p>
      </div>
    </div>
  );
}
