import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const { next, registered } = await searchParams;

  return (
    <div className="space-y-4">
      {registered && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 text-center">
          Cuenta creada correctamente. Ya puedes iniciar sesión.
        </div>
      )}
      <LoginForm next={next} />
    </div>
  );
}
