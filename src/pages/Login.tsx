import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { UiIcon } from "../components/UiIcon";
import { useAuth } from "../data/auth";

export function Login() {
  const { signedIn, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState("");
  if (signedIn) return <Navigate to="/" />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!login(username, password, remember)) {
      setError("Username atau kata sandi belum sesuai.");
      return;
    }
    void navigate({ to: "/" });
  };
  return (
    <main className="login-page">
      <header className="login-header">
        <div className="login-brand">
          <span className="brand-symbol">
            <Icon name="brand" />
          </span>
          <span>
            <strong>
              cleango<span>•</span>
            </strong>
            <small>Layanan Kebersihan Jadi Mudah</small>
          </span>
        </div>
        <div className="login-help-wrap">
          <button
            className="login-help-button"
            onClick={() => setShowHelp((value) => !value)}
            aria-expanded={showHelp}
          >
            Butuh Bantuan?
          </button>
          {showHelp && (
            <div className="login-help-popover">
              Untuk demo ini, masuk dengan username <strong>admin</strong> dan
              kata sandi <strong>admin</strong>.
            </div>
          )}
        </div>
      </header>
      <div className="login-center">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-intro">
            <span className="login-panda" aria-hidden="true">
              🐼
            </span>
            <span className="login-admin-tag">
              <UiIcon name="shield" /> Admin
            </span>
            <span className="login-eyebrow">PORTAL ADMIN OPERASIONAL</span>
            <h1 id="login-title">Masuk ke Akun Admin</h1>
            <p>
              Silakan masukkan kredensial akun Anda untuk mengelola operasional
              Cleango.
            </p>
          </div>
          <p className="login-access">
            Akses khusus Pengelola &amp; Tim Manajemen Cleango
          </p>
          <form onSubmit={submit}>
            <div className="login-field">
              <label htmlFor="login-username">EMAIL ATAU USERNAME</label>
              <span className="login-input-wrap">
                <span aria-hidden="true" className="login-input-icon">
                  <UiIcon name="mail" />
                </span>
                <input
                  id="login-username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  placeholder="admin"
                />
              </span>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">KATA SANDI</label>
              <span className="login-input-wrap password-field">
                <span aria-hidden="true" className="login-input-icon">
                  <UiIcon name="lock" />
                </span>
                <input
                  id="login-password"
                  autoComplete="current-password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  <UiIcon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </span>
            </div>
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />{" "}
              Ingat saya
            </label>
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button primary login-submit">
              Masuk Sekarang <Icon name="arrow" />
            </button>
          </form>
        </section>
        <div className="login-tip">
          <span aria-hidden="true">
            <UiIcon name="zap" />
          </span>
          <p>
            <strong>Tips Bos:</strong> Pastikan koneksi internet stabil saat
            memverifikasi jadwal orderan dan petugas hari ini!
          </p>
        </div>
        <small className="login-copyright">
          © 2026 Cleango Indonesia. Inovasi Cerdas untuk Kebersihan{" "}
          <span>✦</span>
        </small>
      </div>
    </main>
  );
}
