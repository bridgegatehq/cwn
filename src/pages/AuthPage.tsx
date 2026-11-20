import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, KeyRound, MailCheck, AlertTriangle, Scale, User } from 'lucide-react';
import { useApp, type UserProfile } from '../context/AppContext';
import { LANGUAGES } from '../data/i18n';
import { NIGERIA_STATES } from '../data/nigeriaData';

type AuthMode = 'signin' | 'signup' | 'verify_otp' | 'forgot' | 'reset';

const LEGAL_DISCIPLINES = [
  'Criminal Defense & Fundamental Rights',
  'Civil, Family & Property Protection Law',
  'Human Rights & Personal Liberty Law',
  'Constitutional, Media & Public Interest Litigation',
  'Administrative & Freedom of Information Advocacy',
  'Labour, Employment & Healthcare Rights Law',
  'Humanitarian Civil Documentation & Education Rights',
];

const CORE_STRENGTH_OPTIONS = [
  'Criminal Law — Unlawful detention & remand review',
  'Human Rights — Section 35 personal liberty enforcement',
  'Station bail representation & ACJA Section 34 audits',
  'Civil Law — Tenancy, unlawful eviction & land title defense',
  'Family & Gender Protection — VAPP protection orders',
  'Child Rights Act & school access enforcement',
  'Constitutional Law — Press, speech & peaceful assembly',
  'Administrative Law — FOI Act 2011 drafting & judicial review',
  'Patient rights & hospital emergency treatment enforcement',
  'Labour Law — Unpaid wages & wrongful termination',
];

const COURT_OPTIONS = [
  'Supreme Court & Court of Appeal',
  'Federal High Court',
  'State High Courts',
  'Magistrates & District Courts',
  'National Industrial Court',
  'Family Courts & Gender Desks',
  'Public Complaints Commission & FOI Registries',
];

export function AuthPage() {
  const { setSession, detectedArea, apiFetch } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get('register') === 'advocate' ? 'signup' : 'signin'
  );
  const [accountType, setAccountType] = useState<'citizen' | 'advocate'>(() =>
    searchParams.get('register') === 'advocate' ? 'advocate' : 'citizen'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stateName, setStateName] = useState(detectedArea.state);
  const [lgaName, setLgaName] = useState(detectedArea.lga);

  // Legal Representative Intake Fields (captured on account creation -> stored in backend)
  const [representativeType, setRepresentativeType] = useState<'lawyer' | 'trained_advocate'>('lawyer');
  const [primaryPracticeArea, setPrimaryPracticeArea] = useState(LEGAL_DISCIPLINES[0]);
  const [coreStrengths, setCoreStrengths] = useState<string[]>([
    CORE_STRENGTH_OPTIONS[0],
    CORE_STRENGTH_OPTIONS[1],
  ]);
  const [barNumber, setBarNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(6);
  const [organisation, setOrganisation] = useState('');
  const [educationQualifications, setEducationQualifications] = useState('LL.B, B.L (Nigerian Law School)');
  const [courtsOfPractice, setCourtsOfPractice] = useState<string[]>([
    'State High Courts',
    'Magistrates & District Courts',
  ]);
  const [feeArrangement, setFeeArrangement] = useState('Pro bono initial intake; clear written terms for litigation');
  const [caseTypesAcceptedInput, setCaseTypesAcceptedInput] = useState(
    'Unlawful detention past 48 hours, station bail applications, fundamental rights enforcement'
  );
  const [turnaroundCommitment, setTurnaroundCommitment] = useState('Within 24 working hours');
  const [availabilityHours, setAvailabilityHours] = useState('Mon–Fri, 09:00–17:00 WAT');
  const [advocateBio, setAdvocateBio] = useState('');
  const [notableRepresentations, setNotableRepresentations] = useState('');
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>(['English', 'Nigerian Pidgin']);
  const [consultationModes, setConsultationModes] = useState<string[]>(['Phone call', 'In-person chamber']);

  const [otpCode, setOtpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [sandboxCodeHint, setSandboxCodeHint] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get('register') === 'advocate') {
      setMode('signup');
      setAccountType('advocate');
    }
  }, [searchParams]);

  const stateEntry = NIGERIA_STATES.find((s) => s.name === stateName) || NIGERIA_STATES[24];

  const toggleItem = (list: string[], setter: (next: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((i) => i !== value) : [...list, value]);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Enter both your email address and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{
        token?: string;
        user?: UserProfile;
        requiresMfa?: boolean;
        message?: string;
      }>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          mfaCode: mfaRequired ? mfaCode.trim() : undefined,
        }),
      });

      if (res.requiresMfa) {
        setMfaRequired(true);
        setInfoMsg(res.message || 'Enter your 6-digit multi-factor code.');
        return;
      }

      if (res.token && res.user) {
        setSession(res.token, res.user);
        navigate(res.user.role === 'advocate' ? '/advocate-portal' : '/home');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setErrorMsg('Enter your full name, a valid email, and a password of at least 8 characters.');
      return;
    }
    if (accountType === 'advocate') {
      if (!organisation.trim()) {
        setErrorMsg('Enter your chambers, legal clinic, or paralegal organisation name.');
        return;
      }
      if (coreStrengths.length === 0) {
        setErrorMsg('Select at least one core legal strength so citizens can match with your profile.');
        return;
      }
    }

    setBusy(true);
    try {
      const advocateProfile =
        accountType === 'advocate'
          ? {
              representativeType,
              primaryPracticeArea,
              coreStrengths,
              specialisations: coreStrengths.map((s) => s.split('—')[0].trim()),
              barNumber: representativeType === 'lawyer' ? barNumber.trim() : null,
              yearsExperience,
              organisation: organisation.trim(),
              educationQualifications: educationQualifications.trim(),
              courtsOfPractice,
              feeArrangement: feeArrangement.trim(),
              caseTypesAccepted: caseTypesAcceptedInput
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              turnaroundCommitment: turnaroundCommitment.trim(),
              availabilityHours: availabilityHours.trim(),
              bio:
                advocateBio.trim() ||
                `${primaryPracticeArea} practitioner serving ${lgaName}, ${stateName}.`,
              notableRepresentations: notableRepresentations.trim(),
              languages: spokenLanguages,
              consultationModes,
            }
          : undefined;

      const res = await apiFetch<{
        message: string;
        email: string;
        sandboxVerificationCode?: string;
      }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          state: stateName,
          lga: lgaName,
          accountType,
          advocateProfile,
        }),
      });
      setInfoMsg(res.message);
      if (res.sandboxVerificationCode) {
        setSandboxCodeHint(res.sandboxVerificationCode);
        setOtpCode(res.sandboxVerificationCode);
      }
      setMode('verify_otp');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      });
      setSession(res.token, res.user);
      navigate(res.user.role === 'advocate' ? '/justice' : '/home');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Enter the email address for your account.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string; sandboxResetCode?: string | null }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        }
      );
      setInfoMsg(res.message);
      if (res.sandboxResetCode) {
        setSandboxCodeHint(res.sandboxResetCode);
        setOtpCode(res.sandboxResetCode);
      }
      setMode('reset');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reset request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
          newPassword,
        }),
      });
      setInfoMsg(res.message);
      setPassword(newPassword);
      setMode('signin');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setBusy(false);
    }
  };

  const fillDemoAccount = (role: 'citizen' | 'advocate' | 'admin') => {
    setMode('signin');
    setErrorMsg(null);
    if (role === 'citizen') {
      setEmail('citizen@civicwatch.sample.ng');
      setPassword('CivicCitizen2026!');
      setMfaRequired(false);
    } else if (role === 'advocate') {
      setEmail('advocate@civicwatch.sample.ng');
      setPassword('CivicAdvocate2026!');
      setMfaCode('246810');
    } else {
      setEmail('admin@civicwatch.sample.ng');
      setPassword('CivicAdmin2026!');
      setMfaCode('246810');
    }
  };

  return (
    <div className="section-stack" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <section className="card stack-24">
        <div className="stack-8">
          <div className="row-wrap">
            <ShieldCheck size={22} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span className="overline">Citizen & Legal Representative Accounts</span>
          </div>
          <h1>
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' &&
              (accountType === 'advocate'
                ? 'Register legal representative profile'
                : 'Create a citizen account')}
            {mode === 'verify_otp' && 'Verify your email code'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Set a new password'}
          </h1>
          <p className="field-hint">
            Citizens never need an account to read public guides or file anonymous reports. Legal representatives can register their exact practice strengths here so their Justice profile is tailored automatically.
          </p>
        </div>

        <div className="tabs-bar" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className="tab-btn"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className="tab-btn"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
          >
            Create account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'forgot' || mode === 'reset'}
            className="tab-btn"
            onClick={() => {
              setMode('forgot');
              setErrorMsg(null);
            }}
          >
            Forgot password
          </button>
        </div>

        {infoMsg && (
          <div className="card-tint stack-8" role="status" aria-live="polite">
            <div className="row-wrap">
              <MailCheck size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
              <strong style={{ fontSize: 'var(--text-14)' }}>{infoMsg}</strong>
            </div>
            {sandboxCodeHint && (
              <p className="mono" style={{ fontSize: 'var(--text-13)' }}>
                Sandbox one-time verification code: <strong>{sandboxCodeHint}</strong>
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div
            className="card"
            role="alert"
            style={{
              background: 'var(--danger-subtle)',
              borderColor: 'var(--danger-border)',
              padding: 'var(--sp-12) var(--sp-16)',
            }}
          >
            <p className="field-error">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{errorMsg}</span>
            </p>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="stack-16" noValidate>
            <div className="field">
              <label htmlFor="signin-email" className="field-label">
                Email address
              </label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="signin-password" className="field-label">
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mfaRequired && (
              <div className="field">
                <label htmlFor="signin-mfa" className="field-label">
                  6-digit multi-factor code (sample accounts: 246810)
                </label>
                <input
                  id="signin-mfa"
                  className="input mono"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              <KeyRound size={18} aria-hidden="true" />
              <span>{busy ? 'Signing in...' : mfaRequired ? 'Verify MFA & sign in' : 'Sign in'}</span>
            </button>
          </form>
        )}

        {/* SIGN UP FORM — CITIZEN OR LEGAL REPRESENTATIVE */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="stack-20" noValidate>
            {/* Account Role Selector */}
            <div className="stack-8">
              <span className="field-label">Account type</span>
              <div className="grid-2" role="radiogroup" aria-label="Choose account type">
                <button
                  type="button"
                  onClick={() => setAccountType('citizen')}
                  aria-pressed={accountType === 'citizen'}
                  className="card-subtle"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: accountType === 'citizen' ? 'var(--primary)' : 'var(--border)',
                    background: accountType === 'citizen' ? 'var(--primary-subtle)' : 'var(--surface)',
                  }}
                >
                  <div className="row-wrap">
                    <User size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <strong>Citizen account</strong>
                  </div>
                  <p className="field-hint" style={{ marginTop: 4 }}>
                    Track reports, sign petitions, and request legal consultations.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('advocate')}
                  aria-pressed={accountType === 'advocate'}
                  className="card-subtle"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: accountType === 'advocate' ? 'var(--primary)' : 'var(--border)',
                    background: accountType === 'advocate' ? 'var(--primary-subtle)' : 'var(--surface)',
                  }}
                >
                  <div className="row-wrap">
                    <Scale size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                    <strong>Legal representative</strong>
                  </div>
                  <p className="field-hint" style={{ marginTop: 4 }}>
                    Lawyers & paralegals: set your core strengths for the Justice directory.
                  </p>
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="signup-name" className="field-label">
                {accountType === 'advocate'
                  ? 'Full professional name (e.g. Barr. Adebayo Musa)'
                  : 'Full name or preferred civic alias'}
              </label>
              <input
                id="signup-name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="signup-email" className="field-label">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="signup-password" className="field-label">
                  Password (min 8 chars)
                </label>
                <input
                  id="signup-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="signup-state" className="field-label">
                  Primary State
                </label>
                <select
                  id="signup-state"
                  className="select"
                  value={stateName}
                  onChange={(e) => {
                    const st = NIGERIA_STATES.find((s) => s.name === e.target.value) || NIGERIA_STATES[0];
                    setStateName(st.name);
                    setLgaName(st.lgas[0]);
                  }}
                >
                  {NIGERIA_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="signup-lga" className="field-label">
                  Local Government Area
                </label>
                <select
                  id="signup-lga"
                  className="select"
                  value={lgaName}
                  onChange={(e) => setLgaName(e.target.value)}
                >
                  {stateEntry.lgas.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* TAILORED LEGAL REPRESENTATIVE INTAKE DOSSIER */}
            {accountType === 'advocate' && (
              <div className="card-subtle stack-20" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="stack-8">
                  <span className="overline">Public Legal Contact Dossier</span>
                  <h2 style={{ fontSize: 'var(--text-18)' }}>
                    Tailor your legal profile & core strengths
                  </h2>
                  <p className="field-hint">
                    Everything you complete below powers your detailed profile card and modal when citizens click your name on the Legal Help screen.
                  </p>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="adv-rep-type" className="field-label">
                      Representative role
                    </label>
                    <select
                      id="adv-rep-type"
                      className="select"
                      value={representativeType}
                      onChange={(e) => setRepresentativeType(e.target.value as 'lawyer' | 'trained_advocate')}
                    >
                      <option value="lawyer">Legal Practitioner (Called to the Nigerian Bar)</option>
                      <option value="trained_advocate">Trained Community Paralegal / FOI Advocate</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="adv-primary-area" className="field-label">
                      Primary legal discipline
                    </label>
                    <select
                      id="adv-primary-area"
                      className="select"
                      value={primaryPracticeArea}
                      onChange={(e) => setPrimaryPracticeArea(e.target.value)}
                    >
                      {LEGAL_DISCIPLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="adv-org" className="field-label">
                      Chambers, firm, or legal clinic
                    </label>
                    <input
                      id="adv-org"
                      className="input"
                      placeholder="e.g. Adebayo Musa & Co. Chambers"
                      value={organisation}
                      onChange={(e) => setOrganisation(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="adv-years" className="field-label">
                      Years of standing / experience
                    </label>
                    <input
                      id="adv-years"
                      type="number"
                      min={1}
                      max={50}
                      className="input"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  {representativeType === 'lawyer' && (
                    <div className="field">
                      <label htmlFor="adv-scn" className="field-label">
                        Supreme Court Roll Number (SCN)
                      </label>
                      <input
                        id="adv-scn"
                        className="input mono"
                        placeholder="SCN094821"
                        value={barNumber}
                        onChange={(e) => setBarNumber(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="adv-edu" className="field-label">
                      Academic & professional qualifications
                    </label>
                    <input
                      id="adv-edu"
                      className="input"
                      placeholder="LL.B (Unilag), B.L"
                      value={educationQualifications}
                      onChange={(e) => setEducationQualifications(e.target.value)}
                    />
                  </div>
                </div>

                {/* Core Strengths Multi-Select */}
                <div className="field">
                  <span className="field-label">
                    Select your core strengths (shown on your profile card)
                  </span>
                  <div className="chip-row" role="group" aria-label="Core legal strengths">
                    {CORE_STRENGTH_OPTIONS.map((strength) => {
                      const active = coreStrengths.includes(strength);
                      return (
                        <button
                          key={strength}
                          type="button"
                          className={`chip ${active ? 'active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleItem(coreStrengths, setCoreStrengths, strength)}
                        >
                          {strength}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Courts of Practice */}
                <div className="field">
                  <span className="field-label">Courts & registries where you appear</span>
                  <div className="chip-row" role="group" aria-label="Courts of practice">
                    {COURT_OPTIONS.map((court) => {
                      const active = courtsOfPractice.includes(court);
                      return (
                        <button
                          key={court}
                          type="button"
                          className={`chip ${active ? 'active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleItem(courtsOfPractice, setCourtsOfPractice, court)}
                        >
                          {court}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="adv-cases-accepted" className="field-label">
                    Specific briefs you accept (comma-separated)
                  </label>
                  <input
                    id="adv-cases-accepted"
                    className="input"
                    value={caseTypesAcceptedInput}
                    onChange={(e) => setCaseTypesAcceptedInput(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="adv-fee" className="field-label">
                      Pro bono / fee arrangement
                    </label>
                    <input
                      id="adv-fee"
                      className="input"
                      value={feeArrangement}
                      onChange={(e) => setFeeArrangement(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="adv-turnaround" className="field-label">
                      Response turnaround commitment
                    </label>
                    <input
                      id="adv-turnaround"
                      className="input"
                      value={turnaroundCommitment}
                      onChange={(e) => setTurnaroundCommitment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="adv-hours-reg" className="field-label">
                    Consultation availability hours
                  </label>
                  <input
                    id="adv-hours-reg"
                    className="input"
                    value={availabilityHours}
                    onChange={(e) => setAvailabilityHours(e.target.value)}
                  />
                </div>

                <div className="field">
                  <span className="field-label">Languages spoken with clients</span>
                  <div className="chip-row">
                    {LANGUAGES.map((l) => {
                      const active = spokenLanguages.includes(l.englishName);
                      return (
                        <button
                          key={l.code}
                          type="button"
                          className={`chip ${active ? 'active' : ''}`}
                          aria-pressed={active}
                          onClick={() => toggleItem(spokenLanguages, setSpokenLanguages, l.englishName)}
                        >
                          {l.nativeName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Consultation channels offered</span>
                  <div className="chip-row">
                    {['Phone call', 'In-person chamber', 'Police station attendance', 'Audio / WhatsApp intake'].map(
                      (ch) => {
                        const active = consultationModes.includes(ch);
                        return (
                          <button
                            key={ch}
                            type="button"
                            className={`chip ${active ? 'active' : ''}`}
                            aria-pressed={active}
                            onClick={() => toggleItem(consultationModes, setConsultationModes, ch)}
                          >
                            {ch}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="adv-bio" className="field-label">
                    Practice summary for citizens
                  </label>
                  <textarea
                    id="adv-bio"
                    className="textarea"
                    placeholder="Explain in plain words how you assist citizens, what documents help you act quickly, and your core legal approach."
                    value={advocateBio}
                    onChange={(e) => setAdvocateBio(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="adv-track-record" className="field-label">
                    Representative experience / notable filings
                  </label>
                  <textarea
                    id="adv-track-record"
                    className="textarea"
                    style={{ minHeight: 90 }}
                    placeholder="e.g. Handled 30+ remand review applications and tenancy recovery defenses across Lagos Magistrate and High Courts."
                    value={notableRepresentations}
                    onChange={(e) => setNotableRepresentations(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              {busy
                ? 'Saving profile...'
                : accountType === 'advocate'
                  ? 'Register legal profile & get verification code'
                  : 'Create citizen account & get verification code'}
            </button>
          </form>
        )}

        {/* ONE-TIME CODE VERIFICATION */}
        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOtp} className="stack-16" noValidate>
            <div className="field">
              <label htmlFor="otp-code" className="field-label">
                6-digit one-time verification code
              </label>
              <input
                id="otp-code"
                className="input mono"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              {busy ? 'Verifying...' : 'Confirm email & open workspace'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="stack-16" noValidate>
            <div className="field">
              <label htmlFor="forgot-email" className="field-label">
                Account email address
              </label>
              <input
                id="forgot-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              Request 6-digit reset code
            </button>
          </form>
        )}

        {/* RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="stack-16" noValidate>
            <div className="field">
              <label htmlFor="reset-code" className="field-label">
                6-digit reset code
              </label>
              <input
                id="reset-code"
                className="input mono"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="reset-new-pw" className="field-label">
                New password (at least 8 characters)
              </label>
              <input
                id="reset-new-pw"
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              Save new password
            </button>
          </form>
        )}
      </section>

      {/* Clearly Labelled Sample Accounts */}
      <section className="card-subtle stack-12" aria-label="Sample accounts for walkthrough">
        <span className="overline">Sample accounts for quick testing</span>
        <p className="field-hint">
          Pre-fill credentials (Advocate & Admin demonstrate MFA with code <span className="mono">246810</span>):
        </p>
        <div className="row-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemoAccount('citizen')}
          >
            Sample Citizen
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemoAccount('advocate')}
          >
            Sample Advocate (MFA)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemoAccount('admin')}
          >
            Sample Admin (MFA)
          </button>
        </div>
      </section>
    </div>
  );
}
