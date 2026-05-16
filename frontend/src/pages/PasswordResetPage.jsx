import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import api from "../api/client";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/shared/AlertBanner";

const apiErrorMessage = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err?.response) {
    return "Cannot reach the server. Start the backend and check your API URL in frontend/.env.";
  }
  return err?.message || "Request failed";
};

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [questionKey, setQuestionKey] = useState("");
  const [questionLabel, setQuestionLabel] = useState("");
  const [answer, setAnswer] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const submitEmail = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/question", { email: email.trim() });
      const data = response.data.data || {};
      setQuestionKey(data.questionKey || "");
      setQuestionLabel(data.questionLabel || "");
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/verify", { email: email.trim(), answer });
      const token = response.data.data?.resetToken;
      if (!token) throw new Error("Missing reset token from server.");
      setResetToken(token);
      setStep(3);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/reset", { resetToken, password, confirmPassword });
      setStatus("Password updated. You can sign in now.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          SchoolConnect AI
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-6 lg:p-8 w-full max-w-md space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Forgot password</h2>
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </div>
          <AlertBanner variant="error">{error}</AlertBanner>
          <AlertBanner variant="success">{status}</AlertBanner>

          {step === 1 ? (
            <form className="space-y-4" onSubmit={submitEmail}>
              <div className="space-y-2">
                <Label htmlFor="reset-email">School account email</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Checking..." : "Continue"}
              </Button>
            </form>
          ) : null}

          {step === 2 ? (
            <form className="space-y-4" onSubmit={submitAnswer}>
              <p className="text-sm text-muted-foreground">
                <strong>Question:</strong> {questionLabel || questionKey}
              </p>
              <div className="space-y-2">
                <Label htmlFor="reset-answer">Your answer</Label>
                <Input id="reset-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Verifying..." : "Verify answer"}
                </Button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <form className="space-y-4" onSubmit={submitNewPassword}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={loading}>
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Save new password"}
                </Button>
              </div>
            </form>
          ) : null}

          <p className="text-xs text-center text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

