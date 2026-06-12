import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Step1Form from './Step1Form';
import Step2Form from './Step2Form';
import './Register.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '', password: '', verifyPassword: '',
    email: '', phone: '', street: '', suite: '',
    city: '', zipcode: '', lat: '', lng: '',
    companyName: '', catchPhrase: '', bs: ''
  });
  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => { if (isAuthenticated) navigate('/home'); }, [isAuthenticated, navigate]);

  return (
    <div className="register-container">

      <div className="register-brand">
        <div className="register-brand__logo"><span>Nexus</span>Hub</div>
        <h2 className="register-brand__heading">
          Join the hub.<br /><em>Start today.</em>
        </h2>
        <p className="register-brand__desc">
          Create your account in two quick steps and get instant access to your personal workspace.
        </p>
        <div className="register-brand__steps">
          <div className="register-brand__step">
            <div className={`register-brand__step-num ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="register-brand__step-text">
              <strong style={{ color: step >= 1 ? 'var(--text)' : 'var(--text-muted)' }}>Account credentials</strong><br />
              Choose your username and password
            </div>
          </div>
          <div className="register-brand__step">
            <div className={`register-brand__step-num ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className="register-brand__step-text">
              <strong style={{ color: step >= 2 ? 'var(--text)' : 'var(--text-muted)' }}>Personal details</strong><br />
              Add your name, email, and company
            </div>
          </div>
        </div>
      </div>

      <div className="register-form-side">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">
              {step === 1 ? 'Create your account' : 'Personal details'}
            </h1>
            <div className="step-indicator">Step {step} of 2</div>
          </div>

          {step === 1 && <Step1Form formData={formData} updateField={updateField} onNext={() => setStep(2)} />}
          {step === 2 && <Step2Form formData={formData} updateField={updateField} onBack={() => setStep(1)} />}

          <div className="login-link-container">
            <span className="login-link-text">Already have an account? </span>
            <Link to="/login" className="login-link">Login</Link>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Register;
