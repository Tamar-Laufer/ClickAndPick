import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';

const useUserInfo = () => {
  const { user, updateUserData } = useAuth();
  const { save } = useResource('/users');

  const [isEditing,             setIsEditing]             = useState(false);
  const [isChangingCredentials, setIsChangingCredentials] = useState(false);
  const [loading,               setLoading]               = useState(false);
  const [error,                 setError]                 = useState('');

  const [form,  setForm]  = useState({});
  const [creds, setCreds] = useState({ oldPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });

  const setField     = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setAddrField = (field, val) => setForm(p => ({ ...p, address: { ...p.address, [field]: val } }));
  const setCompField = (field, val) => setForm(p => ({ ...p, company: { ...p.company, [field]: val } }));
  const setCredField = (field, val) => setCreds(p => ({ ...p, [field]: val }));

  const reset = () => { setIsEditing(false); setIsChangingCredentials(false); setError(''); };

  const openEdit = () => {
    setForm({
      name:    user?.name    || '',
      email:   user?.email   || '',
      phone:   user?.phone   || '',
      address: { street: user?.address?.street || '', city: user?.address?.city || '' },
      company: { name: user?.company?.name || '' }
    });
    setError('');
    setIsEditing(true);
  };

  const openCredentials = () => {
    setCreds({ oldPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
    setError('');
    setIsChangingCredentials(true);
  };

  const saveProfile = async () => {
    setLoading(true);
    const updated = await save(user.id, form);
    if (updated) { updateUserData(updated); reset(); }
    else         { setError('Failed to update profile'); }
    setLoading(false);
  };

  const saveCredentials = async () => {
    if (!creds.oldPassword)                                               return setError('Current password is required');
    if (!creds.newUsername && !creds.newPassword)                        return setError('Enter a new username or password');
    if (creds.newPassword && creds.newPassword !== creds.confirmPassword) return setError('New passwords do not match');

    setLoading(true);
    const updated = await save(user.id, {
      oldPassword: creds.oldPassword,
      newUsername: creds.newUsername || undefined,
      newPassword: creds.newPassword || undefined
    }, null, '/credentials');
    if (updated) { updateUserData(updated); reset(); }
    else         { setError('Incorrect current password'); }
    setLoading(false);
  };

  return {
    user, isEditing, isChangingCredentials, loading, error,
    form, setField, setAddrField, setCompField,
    creds, setCredField,
    reset, openEdit, openCredentials, saveProfile, saveCredentials
  };
};

export default useUserInfo;
