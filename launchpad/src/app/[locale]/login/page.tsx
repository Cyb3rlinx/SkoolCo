import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/forms/auth-shell";
import { LoginForm } from "@/components/forms/login-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("metaTitle") };
}

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const t = await getTranslations("auth.login");
  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      }
    >
      <LoginForm next={searchParams.next} />
    </AuthShell>
  );
}
