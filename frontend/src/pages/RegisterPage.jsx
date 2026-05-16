import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/shared/AlertBanner";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "parent" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const createdUser = await register(form);
      navigate(`/${createdUser.role}`);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Get started</p>
            <h1 className="text-4xl font-bold tracking-tight mt-2">Create account</h1>
            <p className="text-muted-foreground mt-2">Request access for the school platform with your role.</p>
          </div>
          <div className="glass rounded-xl p-4 border-amber-500/30 bg-amber-500/5">
            <strong className="text-sm block">Parent registration notice</strong>
            <span className="text-xs text-muted-foreground">
              Please visit the admin office with your child for registration. Contact: +251904834991.
            </span>
          </div>
          <div className="glass rounded-xl p-4">
            <strong className="text-sm block">Professional onboarding</strong>
            <span className="text-xs text-muted-foreground">Parents, teachers, and admins use the same secure workflow.</span>
          </div>
        </section>

        <form className="glass-strong rounded-2xl p-6 lg:p-8 flex flex-col gap-4 self-center w-full max-w-md mx-auto" onSubmit={onSubmit}>
          <div>
            <h2 className="text-xl font-semibold">Register</h2>
            <p className="text-sm text-muted-foreground">Use the correct role before submitting.</p>
          </div>
          <AlertBanner variant="error">{error}</AlertBanner>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" value={form.fullName} onChange={onChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" value={form.password} onChange={onChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select id="role" name="role" value={form.role} onChange={onChange} className="flex h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm">
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create account"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

