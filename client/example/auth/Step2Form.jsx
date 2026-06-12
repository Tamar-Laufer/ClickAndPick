import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const Step2Form = ({ formData, updateField, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef();
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email.trim()) return setError('Email address required');
    if (!formData.email.includes('@')) return setError('Invalid email address');
    setLoading(true);
    try {
      const userData = {
        username: formData.username,
        website: formData.password,
        name: formData.name || formData.username,
        email: formData.email,
        phone: formData.phone || '',
        address: {
          street: formData.street || '',
          suite: formData.suite || '',
          city: formData.city || '',
          zipcode: formData.zipcode || '',
          geo: { lat: formData.lat || '', lng: formData.lng || '' }
        },
        company: {
          name: formData.companyName || '',
          catchPhrase: formData.catchPhrase || '',
          bs: formData.bs || ''
        }
      };
      await register(userData);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="step2-form-grid">
        <div className="form-group">
          <label className="form-label">Full Name:</label>
          <input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} className="form-input" placeholder="Enter your full name" disabled={loading} />
        </div>

        <div className="form-group">
          <label className="form-label">Email:</label>
          <input ref={emailRef} type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="form-input" placeholder="Enter email address" disabled={loading} />
        </div>

        <div className="form-group">
          <label className="form-label">Phone:</label>
          <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="form-input" placeholder="Enter phone number" disabled={loading} />
        </div>

        <div className="form-group">
          <label className="form-label">Street:</label>
          <input type="text" value={formData.street} onChange={(e) => updateField('street', e.target.value)} className="form-input" placeholder="Enter street name" disabled={loading} />
        </div>

        <div className="form-group">
          <label className="form-label">City:</label>
          <input type="text" value={formData.city} onChange={(e) => updateField('city', e.target.value)} className="form-input" placeholder="Enter city name" disabled={loading} />
        </div>

        <div className="form-group">
          <label className="form-label">Company Name:</label>
          <input type="text" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} className="form-input" placeholder="Enter company name" disabled={loading} />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="button-group">
        <button type="button" onClick={onBack} disabled={loading} className="back-button">Back</button>
        <button type="submit" disabled={loading} className="complete-button">{loading ? 'Registering...' : 'Complete Registration'}</button>
      </div>
    </form>
  );
};

export default Step2Form;
