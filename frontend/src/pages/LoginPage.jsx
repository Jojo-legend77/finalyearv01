import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/shared/AlertBanner";
import classroomPhoto from "../pfp.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
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

      <div className="flex-1 grid lg:grid-cols-2 gap-8 p-4 lg:p-8 max-w-6xl mx-auto w-full">
        <section className="hidden lg:flex flex-col justify-center gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Welcome back</p>
            <h1 className="text-4xl font-bold tracking-tight mt-2">For a better future</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage your child&apos;s progress, attendance, and school communication.</p>
          </div>
          <div className="relative rounded-2xl overflow-hidden glass aspect-[4/3]">
            <img src={classroomPhoto} alt="Classroom" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent p-6 flex flex-col justify-end">
              <strong className="text-lg">Learning together</strong>
              <span className="text-sm text-muted-foreground">Track progress, attendance, and behavior in one place.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4">
              <strong className="text-sm block">Secure access</strong>
              <span className="text-xs text-muted-foreground">Role-based login for parents, teachers, admins, and directors.</span>
            </div>
            <div className="glass rounded-xl p-4">
              <strong className="text-sm block">Live updates</strong>
              <span className="text-xs text-muted-foreground">Notifications and messages refresh in the background.</span>
            </div>
          </div>
        </section>

        <form className="glass-strong rounded-2xl p-6 lg:p-8 flex flex-col gap-4 self-center w-full max-w-md mx-auto" onSubmit={handleSubmit}>
          <div>
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Use your school account credentials.</p>
          </div>
          <AlertBanner variant="error">{error}</AlertBanner>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setShowPassword((p) => !p)}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Login"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Don&apos;t have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            <Link to="/password-reset" className="text-primary hover:underline">Reset with security question</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

