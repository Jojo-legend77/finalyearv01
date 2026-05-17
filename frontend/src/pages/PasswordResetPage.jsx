import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, HelpCircle } from "lucide-react";
import api from "../api/client";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { cn } from "@/lib/utils";

const apiErrorMessage = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err?.response) {
    return "Cannot reach the server. Start the backend and check your API URL in frontend/.env.";
  }
  return err?.message || "Request failed";
};

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("otp");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [questionKey, setQuestionKey] = useState("");
  const [questionLabel, setQuestionLabel] = useState("");
  const [answer, setAnswer] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const resetFlow = () => {
    setStep(1);
    setOtp("");
    setAnswer("");
    setResetToken("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setStatus("");
  };

  const switchMethod = (next) => {
    setMethod(next);
    resetFlow();
  };

  const submitEmailOtp = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/request-otp", { email: email.trim() });
      setStatus(response.data.message || "Check your email for a verification code.");
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
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

  const submitEmailQuestion = async (event) => {
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

  const stepLabel =
    step === 3 ? "New password" : method === "otp" ? (step === 1 ? "Email" : "Verification code") : step === 1 ? "Email" : "Security question";

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
            <p className="text-sm text-muted-foreground">
              Step {step} — {stepLabel}
            </p>
          </div>

          {step === 1 ? (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/50">
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                  method === "otp" ? "bg-background shadow text-foreground" : "text-muted-foreground",
                )}
                onClick={() => switchMethod("otp")}
              >
                <Mail className="h-4 w-4" />
                Email code
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                  method === "question" ? "bg-background shadow text-foreground" : "text-muted-foreground",
                )}
                onClick={() => switchMethod("question")}
              >
                <HelpCircle className="h-4 w-4" />
                Security question
              </button>
            </div>
          ) : null}

          <AlertBanner variant="error">{error}</AlertBanner>
          <AlertBanner variant="success">{status}</AlertBanner>

          {step === 1 ? (
            <form className="space-y-4" onSubmit={method === "otp" ? submitEmailOtp : submitEmailQuestion}>
              <div className="space-y-2">
                <Label htmlFor="reset-email">School account email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {method === "otp"
                  ? "We will send a 6-digit code to your email (parents and teachers)."
                  : "We will show your saved security question (parents and teachers)."}
              </p>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Please wait..." : method === "otp" ? "Send verification code" : "Continue"}
              </Button>
            </form>
          ) : null}

          {step === 2 && method === "otp" ? (
            <form className="space-y-4" onSubmit={submitOtp}>
              <div className="space-y-2">
                <Label htmlFor="reset-otp">Verification code</Label>
                <Input
                  id="reset-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Verifying..." : "Verify code"}
                </Button>
              </div>
            </form>
          ) : null}

          {step === 2 && method === "question" ? (
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
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save new password"}
              </Button>
            </form>
          ) : null}

          <p className="text-xs text-center text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

