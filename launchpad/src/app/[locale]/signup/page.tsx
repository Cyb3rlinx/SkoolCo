import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/forms/auth-shell";
import { SignupForm } from "@/components/forms/signup-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("metaTitle") };
}

export default async function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const t = await getTranslations("auth.signup");
  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p>
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("logIn")}
          </Link>
        </p>
      }
    >
      <SignupForm next={searchParams.next} />
    </AuthShell>
  );
}
