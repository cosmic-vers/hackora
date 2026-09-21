import { useState } from "react";
import { UserCircle2, KeyRound } from "lucide-react";
import Layout from "../components/Layout";
import Field from "../components/Field";
import client, { apiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ROLE_LABEL = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  CLUB: "Club",
  DEPARTMENT: "Department",
  ADMIN: "Administrator",
};

export default function Profile() {
  const { user, updateUser, updateToken } = useAuth();
  const toast = useToast();

  const [details, setDetails] = useState({
    name: user?.name || "",
    department: user?.department || "",
    phone: user?.phone || "",
  });
  const [detailErrors, setDetailErrors] = useState({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  const saveDetails = async (e) => {
    e.preventDefault();
    setDetailErrors({});
    setSavingDetails(true);
    try {
      const { data } = await client.patch("/auth/profile", details);
      updateUser(data.user);
      toast.success("Profile updated.");
    } catch (err) {
      const { message, fields } = apiError(err, "Could not save your profile.");
      setDetailErrors(fields);
      toast.error(message);
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setSavingPassword(true);
    try {
      const { data } = await client.patch("/auth/password", passwords);
      if (data.token) updateToken(data.token);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password changed.");
    } catch (err) {
      const { message, fields } = apiError(err, "Could not change your password.");
      setPasswordErrors(fields);
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Layout title="Your profile" subtitle="Keep your contact details current so admin can reach you.">
      <div className="split-even" style={{ alignItems: "start", maxWidth: 880 }}>
        <div className="card card-pad">
          <div className="section-title">
            <UserCircle2 size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Details
          </div>

          <p className="meta-line" style={{ marginBottom: 16 }}>
            {user?.email} · {ROLE_LABEL[user?.role] || user?.role}
          </p>

          <form onSubmit={saveDetails} noValidate>
            <Field label="Full name" error={detailErrors.name}>
              {(props) => (
                <input
                  {...props}
                  value={details.name}
                  onChange={(e) => setDetails({ ...details, name: e.target.value })}
                  required
                />
              )}
            </Field>

            <Field label="Department or club" error={detailErrors.department}>
              {(props) => (
                <input
                  {...props}
                  value={details.department}
                  onChange={(e) => setDetails({ ...details, department: e.target.value })}
                  placeholder="Computer Science"
                />
              )}
            </Field>

            <Field label="Phone" error={detailErrors.phone}>
              {(props) => (
                <input
                  {...props}
                  value={details.phone}
                  onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                  placeholder="9876543210"
                />
              )}
            </Field>

            <button className="btn btn-accent btn-block" disabled={savingDetails} type="submit">
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <KeyRound size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Password
          </div>

          <form onSubmit={savePassword} noValidate>
            <Field label="Current password" error={passwordErrors.currentPassword}>
              {(props) => (
                <input
                  {...props}
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              )}
            </Field>

            <Field
              label="New password"
              error={passwordErrors.newPassword}
              hint="At least 8 characters, with a letter and a number."
            >
              {(props) => (
                <input
                  {...props}
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
              )}
            </Field>

            <button className="btn btn-outline btn-block" disabled={savingPassword} type="submit">
              {savingPassword ? "Changing…" : "Change password"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
