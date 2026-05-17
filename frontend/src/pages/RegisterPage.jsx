import { Link, Navigate } from "react-router-dom";
import {
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { SCHOOL_CONTACT } from "../config/schoolContact";

export default function RegisterPage() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 lg:px-8 border-b border-border/60 glass-strong sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          {SCHOOL_CONTACT.platformName}
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 p-4 lg:p-10 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Account access</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Request an account from administration</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {SCHOOL_CONTACT.platformName} accounts are created by the school admin team. Self-registration is not
            available online — please contact the office using the details below.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-strong rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">How to get access</h2>
                <p className="text-sm text-muted-foreground">{SCHOOL_CONTACT.schoolName}</p>
              </div>
            </div>

            <ol className="space-y-4">
              {SCHOOL_CONTACT.registrationSteps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <strong className="block text-foreground mb-1">Parents & guardians</strong>
              <span className="text-muted-foreground">
                Please bring your child when visiting the admin office. The team will link your account to the correct
                student records.
              </span>
            </div>

            <Button asChild className="w-full" size="lg">
              <Link to="/login">
                I already have an account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-xl p-5 flex gap-4">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Admin email</p>
                <a href={`mailto:${SCHOOL_CONTACT.adminEmail}`} className="font-medium hover:text-primary transition-colors">
                  {SCHOOL_CONTACT.adminEmail}
                </a>
              </div>
            </div>

            <div className="glass rounded-xl p-5 flex gap-4">
              <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                <a href={`tel:${SCHOOL_CONTACT.adminPhone.replace(/\s/g, "")}`} className="font-medium block hover:text-primary">
                  {SCHOOL_CONTACT.adminPhone}
                </a>
                {SCHOOL_CONTACT.adminPhoneAlt ? (
                  <a
                    href={`tel:${SCHOOL_CONTACT.adminPhoneAlt.replace(/\s/g, "")}`}
                    className="text-sm text-muted-foreground block mt-1 hover:text-primary"
                  >
                    Alt: {SCHOOL_CONTACT.adminPhoneAlt}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="glass rounded-xl p-5 flex gap-4">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Office</p>
                <p className="font-medium">{SCHOOL_CONTACT.officeLocation}</p>
              </div>
            </div>

            <div className="glass rounded-xl p-5 flex gap-4">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Office hours</p>
                <p className="font-medium">{SCHOOL_CONTACT.officeHours}</p>
              </div>
            </div>

            <div className="glass rounded-xl p-5 flex gap-4 border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Security</p>
                <p className="text-sm text-muted-foreground">
                  After your account is created, you can sign in and set a security question under Notifications for
                  password recovery, or use email verification codes if configured by the school.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


