import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './TeamAccess.css';

const TeamAccess = ({ url }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${url}/api/auth/admin/accounts`);
      setAccounts(response.data.accounts || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load team accounts.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await axios.post(`${url}/api/auth/admin/accounts`, form);
      setAccounts((current) => [...current, response.data.account].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(`${form.role === 'staff' ? 'Staff' : 'Admin'} account created.`);
      setForm({ name: '', email: '', password: '', role: form.role });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="team-access-page">
      <header className="team-access-heading">
        <div><span className="team-access-eyebrow">PEOPLE &amp; PERMISSIONS</span><h1>Team &amp; access</h1><p>Create named staff and administrator accounts for your restaurant.</p></div>
        <div className="team-access-count"><strong>{accounts.length}</strong><span>team accounts</span></div>
      </header>

      {error && <div className="team-access-error" role="alert">{error}</div>}

      <div className="team-access-layout">
        <section className="team-access-card team-access-create" aria-labelledby="team-create-title">
          <div className="team-access-card-heading"><span className="team-access-card-icon">＋</span><div><h2 id="team-create-title">Add a team member</h2><p>Login details are saved securely to your database.</p></div></div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="team-role">Access level</label>
            <select id="team-role" name="role" value={form.role} onChange={handleChange}>
              <option value="staff">Staff member</option><option value="admin">Administrator</option>
            </select>
            <label htmlFor="team-name">Full name</label>
            <input id="team-name" name="name" value={form.name} onChange={handleChange} autoComplete="name" maxLength="100" required placeholder="e.g. Alex Morgan" />
            <label htmlFor="team-email">Email address</label>
            <input id="team-email" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required placeholder="name@restaurant.com" />
            <label htmlFor="team-password">Temporary password</label>
            <input id="team-password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" minLength="8" required placeholder="At least 8 characters" />
            <button className="team-access-submit" type="submit" disabled={saving}>{saving ? 'Creating account…' : `Create ${form.role === 'staff' ? 'staff' : 'admin'} account`}</button>
            <p className="team-access-note">Passwords are hashed before storage. Share the temporary password with the team member securely.</p>
          </form>
        </section>

        <section className="team-access-card team-access-roster" aria-labelledby="team-roster-title">
          <div className="team-access-roster-heading"><div><h2 id="team-roster-title">Team accounts</h2><p>Accounts with access to the admin workspace or POS.</p></div><button type="button" onClick={loadAccounts} disabled={loading} aria-label="Refresh accounts">↻</button></div>
          {loading ? <p className="team-access-empty">Loading team accounts…</p> : accounts.length === 0 ? <p className="team-access-empty">No admin or staff accounts have been added yet.</p> : (
            <div className="team-access-table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Staff ID</th></tr></thead><tbody>
              {accounts.map((account) => <tr key={account.id || account._id}><td><strong>{account.name}</strong><small>{account.email}</small></td><td><span className={`team-access-role ${account.role}`}>{account.role === 'admin' ? 'Admin' : 'Staff'}</span></td><td>{account.staffId || <span className="team-access-muted">—</span>}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </main>
  );
};

export default TeamAccess;
